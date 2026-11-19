// Native development owns its child processes and preserves the running build on compilation failure.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, mkdirSync, copyFileSync, watch } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const mode = process.argv[2] ?? "dev";
const once = process.argv.includes("--once");
const launchArgs = process.argv.slice(3).filter((arg) => arg !== "--once" && arg !== "--");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function run(program, args, options = {}) {
  const child = spawn(program, args, { cwd: root, windowsHide: true, stdio: "inherit", ...options });
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}
if (mode === "dev") {
  const executable = resolve("target/debug/goodgood.exe");
  const runs = resolve("target/native-dev/runs");
  mkdirSync(runs, { recursive: true });
  let application = null,
    building = false,
    queued = false,
    closed = false,
    lastHash = "",
    timer;
  const watchers = [];
  const stopping = new WeakSet();
  async function stop() {
    if (!application || application.exitCode !== null) return true;
    stopping.add(application);
    application.stdin.write('{"exit":true}\n');
    for (let n = 0; n < 160 && application.exitCode === null; n++) await sleep(50);
    return application.exitCode !== null;
  }
  async function fingerprint() {
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(executable)) hash.update(chunk);
    return hash.digest("hex");
  }
  async function build() {
    if (building) {
      queued = true;
      return;
    }
    building = true;
    try {
      const code = await run("cargo", ["build", "-p", "goodgood"]);
      if (code !== 0 || closed) {
        if (code !== 0) {
          console.error("컴파일이 통과하지 않아 현재 실행 인스턴스를 유지합니다.");
          if (once) process.exitCode = code;
        }
        return;
      }
      const hash = await fingerprint();
      if (hash === lastHash && application?.exitCode === null) return;
      if (!(await stop())) {
        console.error("현재 인스턴스가 종료되지 않아 해당 인스턴스를 유지하며, 새 버전을 시작하지 않습니다.");
        return;
      }
      const directory = resolve(runs, `run-${Date.now()}`);
      mkdirSync(directory, { recursive: true });
      const image = resolve(directory, "goodgood.exe");
      copyFileSync(executable, image);
      application = spawn(image, [...launchArgs, "--control-stdin"], {
        cwd: root,
        // windowsHide also sets SW_HIDE for GUI windows; GoodGood handles --hidden itself.
        windowsHide: false,
        stdio: ["pipe", "inherit", "inherit"],
      });
      const child = application;
      child.stdin.on("error", () => {});
      child.once("spawn", () => {
        console.log(`GPUI 프로세스를 시작했습니다(PID ${child.pid}). ${once ? "" : "파일 변경을 감시합니다."}`);
      });
      child.once("error", (error) => {
        console.error(`GPUI 시작에 실패했습니다: ${error.message}`);
        if (once) process.exitCode = 1;
      });
      child.once("exit", (code, signal) => {
        if (!closed && !stopping.has(child)) {
          const detail = signal ? `시그널 ${signal}` : `종료 코드 ${code}`;
          const report = code === 0 ? console.log : console.error;
          report(`GPUI 프로세스가 종료되었습니다(${detail}). ${once ? "" : "소스 파일을 수정하면 다시 시작합니다."}`);
        }
        if (once) process.exitCode = code ?? 1;
      });
      lastHash = hash;
    } finally {
      building = false;
      if (queued && !closed) {
        queued = false;
        void build();
      }
    }
  }
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void build(), 250);
  };
  if (!once)
    for (const path of ["src-gpui", "crates", "resources", "locales", "build-support", "vendor"]) {
      watchers.push(
        watch(resolve(path), { recursive: true }, (_event, file) => {
          if (file && !String(file).includes("target")) schedule();
        }),
      );
    }
  if (!once) watchers.push(watch(resolve("Cargo.toml"), schedule));
  process.on("SIGINT", async () => {
    closed = true;
    clearTimeout(timer);
    for (const watcher of watchers) watcher.close();
    if (!(await stop())) console.error("개발 인스턴스가 아직 종료되지 않았습니다. 알림 영역 메뉴에서 종료해야 합니다.");
    process.exit(0);
  });
  console.log("GPUI 개발판을 시작합니다. Rust 소스와 공유 리소스를 수정하면 자동으로 다시 빌드합니다. Ctrl+C로 종료합니다.");
  await build();
} else {
  throw new Error(`Unknown desktop command: ${mode}`);
}
