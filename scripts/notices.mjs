// Collects the license texts of the third-party code shipped in goodgood.exe:
// the Rust crates linked into it and the vendored components.
// Writes THIRD-PARTY-NOTICES.txt; `--check` only reports whether it is current.
// Needs the crate sources locally (any build or `cargo fetch` downloads them).
// Usage: node scripts/notices.mjs [--check]

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "THIRD-PARTY-NOTICES.txt";
const TARGET = "x86_64-pc-windows-msvc";
const LICENSE_FILE = /^(licen[cs]e|copying|copyright|notice|unlicense)([-_.].*)?$/i;
const NOT_TEXT = /\.(rs|toml|json|js|ts|html|py|sh)$/i;

function fail(message) {
  console.error(`[오류] ${message}`);
  process.exit(1);
}

/** License texts shipped in a package directory, normalized. */
function licenseTexts(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && LICENSE_FILE.test(e.name) && !NOT_TEXT.test(e.name))
    .map((e) => e.name)
    .sort()
    .map((name) =>
      readFileSync(join(dir, name), "utf8")
        .replace(/^﻿/, "")
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t]+$/gm, "")
        .trim(),
    )
    .filter(Boolean);
}

/** Crates linked into goodgood.exe: normal dependencies, without proc macros (compile-time only). */
function crates() {
  let metadata;
  try {
    metadata = JSON.parse(
      execFileSync(
        "cargo",
        ["metadata", "--format-version", "1", "--locked", "--offline", "--filter-platform", TARGET],
        { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] },
      ),
    );
  } catch (e) {
    fail(`cargo metadata 실행에 실패했습니다(로컬에 의존성 소스가 필요하므로 cargo fetch를 먼저 실행합니다): ${e.stderr ?? e.message}`);
  }
  const packages = new Map(metadata.packages.map((p) => [p.id, p]));
  const nodes = new Map(metadata.resolve.nodes.map((n) => [n.id, n]));
  const procMacro = (p) => p.targets.some((t) => t.kind.includes("proc-macro"));
  const app = metadata.packages.find((p) => p.name === "goodgood" && p.source === null);
  const seen = new Set();
  const stack = [app.id];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const dep of nodes.get(id).deps) {
      if (dep.dep_kinds.some((k) => k.kind === null) && !procMacro(packages.get(dep.pkg)))
        stack.push(dep.pkg);
    }
  }
  return [...seen]
    .map((id) => packages.get(id))
    .filter((p) => p.source !== null || !metadata.workspace_members.includes(p.id))
    .map((p) => ({
      name: p.name,
      version: p.version,
      license: p.license ?? (p.license_file ? `${p.license_file} 참조` : "선언되지 않음"),
      url: p.repository ?? `https://crates.io/crates/${p.name}`,
      texts: licenseTexts(dirname(p.manifest_path)),
    }));
}

function vendored() {
  return ["pawnio", "cpu-layouts"].map((component) => {
    const dir = join(root, "crates/goodgood-service/vendor", component);
    const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
    for (const [name, hash] of Object.entries(manifest.sha256)) {
      const actual = createHash("sha256").update(readFileSync(join(dir, name))).digest("hex");
      if (actual !== hash) fail(`${component} module/source hash mismatch: ${name}`);
    }
    return { ...manifest, texts: [manifest.copyright, ...licenseTexts(dir)] };
  });
}

function render(rust, native) {
  const all = [...rust, ...native];
  const byName = (a, b) => a.name.localeCompare(b.name, "en") || a.version.localeCompare(b.version, "en");
  const line = (p) => `  ${p.name} ${p.version}(${p.license})${p.url}`;
  const rule = "=".repeat(80);
  const out = [
    "GoodGood 서드파티 구성 요소 라이선스 고지",
    "",
    "GoodGood 배포판에는 다음 서드파티 구성 요소가 포함됩니다. 각 구성 요소는 해당 라이선스에 따라 사용됩니다.",
    "구성 요소에 포함된 라이선스 전문은 뒤에 수록하며, 같은 전문은 한 번만 수록합니다.",
    "",
    "GoodGood은 Rust 표준 라이브러리를 정적으로 링크하며, 그 라이선스는 MIT OR Apache-2.0입니다.",
    "라이선스 전문은 https://github.com/rust-lang/rust/blob/master/COPYRIGHT에서 확인합니다.",
    "",
    "이 파일은 scripts/notices.mjs가 생성하며, 직접 편집하지 않습니다.",
    "",
    `Rust 구성 요소(${rust.length}개)`,
    ...rust.sort(byName).map(line),
    "",
    `커널 센서 모듈(${native.length}개 구성 요소)`,
    ...native.sort(byName).map(line),
  ];

  // Most texts are the same license with a different copyright line. Each
  // license body appears once, preceded by every copyright line that came
  // with it, so no notice is lost.
  // A notice line ("Copyright (c) 2019 …", "Copyright 2015-2020 …"), not prose
  // such as Apache's wrapped "copyright notice that is included in …".
  const COPYRIGHT = /^\s*(copyright\s*(\(c\)|©|\d{4})|\(c\)\s*\d{4}|©\s*\d{4})/i;
  const groups = new Map();
  for (const p of all) {
    for (const text of p.texts) {
      const lines = text.split("\n");
      const body = lines
        .filter((l) => !COPYRIGHT.test(l))
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      const key = body.replace(/\s+/g, " ");
      const group = groups.get(key) ?? { body, users: new Set(), copyrights: new Set() };
      group.users.add(`${p.name} ${p.version}`);
      for (const l of lines.filter((l) => COPYRIGHT.test(l))) group.copyrights.add(l.trim());
      groups.set(key, group);
    }
  }
  const sorted = [...groups.values()].sort(
    (a, b) => b.users.size - a.users.size || a.body.localeCompare(b.body, "en"),
  );
  for (const { body, users, copyrights } of sorted) {
    out.push("", rule, `적용 대상: ${[...users].sort((a, b) => a.localeCompare(b, "en")).join(", ")}`, rule, "");
    if (copyrights.size) out.push(...[...copyrights].sort((a, b) => a.localeCompare(b, "en")), "");
    out.push(body);
  }

  const missing = all.filter((p) => p.texts.length === 0);
  if (missing.length) {
    out.push(
      "",
      rule,
      "다음 구성 요소에는 라이선스 전문이 포함되어 있지 않으며, 선언된 라이선스에 따라 사용됩니다(라이선스 전문은 https://spdx.org/licenses/에서 확인합니다).",
      rule,
      "",
      ...missing.sort(byName).map(line),
    );
  }
  return `${out.join("\n")}\n`;
}

const text = render(crates(), [...vendored(),{name:"Native installer templates (Tauri-derived)",version:"2.12.3",license:"MIT OR Apache-2.0",url:"https://github.com/tauri-apps/tauri",texts:[readFileSync(join(root,"packaging/windows/LICENSE-TAURI-MIT"),"utf8"),readFileSync(join(root,"packaging/windows/LICENSE-TAURI-APACHE"),"utf8")]}]);
const path = join(root, OUT);
if (process.argv.includes("--check")) {
  if (!existsSync(path) || readFileSync(path, "utf8") !== text) {
    fail(`${OUT} 파일이 현재 의존성과 일치하지 않습니다. node scripts/notices.mjs를 실행해 다시 생성한 뒤 커밋합니다.`);
  }
  console.log(`[통과] ${OUT} 파일이 현재 의존성과 일치합니다.`);
} else {
  writeFileSync(path, text);
  const kb = Math.round(Buffer.byteLength(text) / 1024);
  console.log(`${OUT} 파일을 기록했습니다(${kb} KB).`);
}
