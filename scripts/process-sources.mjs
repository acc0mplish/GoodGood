// Alternate read-only process sources under the same token and sampling cadence.
// The executable emits aggregates only; no process names, paths or command lines.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import assert from "node:assert/strict";

const args = process.argv.slice(2);
process.chdir(resolve(import.meta.dirname, ".."));
const label = args[0];
assert(label && /^[a-z0-9-]+$/.test(label), "usage: node scripts/process-sources.mjs <label> [--samples 60] [--interval 1000]");
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const output = resolve("target/process-source-validation", label);
const previous = args.includes("--report-only") ? JSON.parse(readFileSync(resolve(output, "summary.json"), "utf8")) : null;
const samples = Number(option("--samples", previous?.block_samples ?? 60));
const interval = Number(option("--interval", previous?.interval_ms ?? 1000));
assert(Number.isInteger(samples) && samples >= 5 && samples <= 300);
assert(Number.isInteger(interval) && interval >= 250 && interval <= 5000);
const executable = resolve("target/release/examples/process_sources.exe");
mkdirSync(output, { recursive: true });
const rows = [];

async function run(mode, index, count = samples) {
  const values = [];
  const errors = [];
  const child = spawn(executable, [mode, String(count), String(interval)], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  const timeoutMs = (count + 3) * interval + 45000;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
  const lines = createInterface({ input: child.stdout });
  lines.on("line", line => {
    try { values.push(JSON.parse(line)); } catch { errors.push("invalid JSON output"); }
  });
  child.stderr.on("data", bytes => errors.push(bytes.toString("utf8")));
  const code = await new Promise((done, reject) => { child.once("error", reject); child.once("close", done); }).finally(() => clearTimeout(timer));
  lines.close();
  const file = `${String(index).padStart(2, "0")}-${mode}.jsonl`;
  writeFileSync(resolve(output, file), values.map(value => JSON.stringify(value)).join("\n") + "\n");
  if (errors.length) writeFileSync(resolve(output, file + ".stderr.txt"), errors.join("\n"));
  rows.push({ mode, code, timedOut, file, samples: values });
  writeReport();
  const measured = values.filter(value => (value.event === "sample" && !value.warmup) || value.event === "comparison");
  console.log(JSON.stringify({ event: "block", index, mode, code, timedOut, samples: measured.length, max_ms: Math.max(0, ...measured.map(v => v.wall_ms ?? v.values.bracket_ms)) }));
  assert(code === 0 && !timedOut, `block ${index} failed; see ${output}`);
}

function statistics(values) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const p = q => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))];
  return { n: sorted.length, p50: p(.5), p95: p(.95), p99: p(.99), max: p(1), mean: sorted.reduce((a,b)=>a+b,0) / sorted.length };
}

function writeReport() {
  const results = ["full", "basic", "hybrid"].map(mode => {
    const all = rows.filter(row => row.mode === mode).flatMap(row => row.samples).filter(row => row.event === "sample");
    const values = all.filter(row => !row.warmup);
    const stats = key => statistics(values.map(row => row[key]));
    const coverage = Object.fromEntries(["cpu", "private_ws", "working_set", "commit", "io", "handles", "threads"].map(key => [key, statistics(values.map(v => 100 * v.coverage[key] / Math.max(1, v.processes)))]));
    return { mode, wall_ms: stats("wall_ms"), process_cpu_ms: stats("process_cpu_ms"), thread_cpu_ms: stats("thread_cpu_ms"), kernel_ms: stats("thread_kernel_ms"), system_busy_pct: stats("system_busy_pct"), coverage_pct: coverage,
      cold_max_ms: Math.max(0, ...all.filter(row=>row.warmup).map(row=>row.wall_ms)),
      private_bytes: statistics(values.map(v => v.own.private_bytes)), handles: statistics(values.map(v => v.own.handles)),
      processes: stats("processes"), slow_queries: values.filter(v => v.wall_ms > 100).map(v => ({wall_ms:v.wall_ms,native_ms:v.native_ms,thread_cpu_ms:v.thread_cpu_ms,thread_kernel_ms:v.thread_kernel_ms})),
      errors: values.at(-1)?.errors,
    };
  });
  const comparisons = rows.filter(row=>row.mode === "compare").flatMap(row=>row.samples).filter(row=>row.event === "comparison");
  const total = key => comparisons.reduce((sum,row)=>sum + (row.values[key] ?? 0),0);
  const memory = ["private_working_set", "working_set", "commit"].map((metric,index)=>{
    const stable = comparisons.reduce((sum,row)=>sum + row.values.memory_stable[index],0);
    const equal = comparisons.reduce((sum,row)=>sum + row.values.memory_equal[index],0);
    return {metric,stable,equal,equal_pct:stable ? equal / stable * 100 : null};
  });
  const validation = {rounds:comparisons.length,paired:total("paired"),cpu_outside_bracket:total("cpu_outside_bracket"),io_outside_bracket:total("io_outside_bracket"),identity_mismatches:total("identity_mismatches"),
    identity_rounds:comparisons.filter(row=>row.values.stable_identities !== undefined).length,stable_identities:total("stable_identities"),listed_stable_identities:total("listed_stable_identities"),basic_parent_mismatches:total("basic_parent_mismatches"),memory};
  const report = { interval_ms:interval, block_samples:samples, order:rows.map(({mode,file,code,timedOut})=>({mode,file,code,timedOut})), environment: rows[0]?.samples.find(row=>row.event === "environment"), results, validation, comparisons };
  writeFileSync(resolve(output, "summary.json"), JSON.stringify(report, null, 2));
  const escaped = value => String(value).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const f = value => Number.isFinite(value) ? value.toFixed(3) : "—";
  const pct = value => Number.isFinite(value) ? value.toFixed(1) + "%" : "—";
  const table = results.map(row=>`<tr><td>${escaped(row.mode)}</td><td>${row.wall_ms?.n ?? 0}</td><td>${f(row.wall_ms?.p50)}</td><td>${f(row.wall_ms?.p95)}</td><td>${f(row.wall_ms?.p99)}</td><td>${f(row.wall_ms?.max)}</td><td>${f(row.process_cpu_ms?.mean)}</td><td>${pct(row.coverage_pct.cpu?.mean)}</td><td>${pct(row.coverage_pct.private_ws?.mean)}</td></tr>`).join("");
  writeFileSync(resolve(output, "report.html"), `<!doctype html><html lang="ko-KR"><meta charset="utf-8"><title>프로세스 수집 소스 대조</title>
<style>body{font:15px system-ui;max-width:1100px;margin:40px auto;padding:0 24px;color:#202124}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}th,td{border-bottom:1px solid #ddd;text-align:right;padding:10px}th:first-child,td:first-child{text-align:left}pre{white-space:pre-wrap;background:#f5f6f8;padding:18px;border-radius:8px}p{line-height:1.7}</style>
<h1>프로세스 수집 소스 대조</h1><p>표준 권한, 릴리스 빌드; ${interval}밀리초마다 샘플링합니다. 순서는 full → basic → hybrid → hybrid → basic → full이며, 각 구간의 처음 3회 예열은 제외합니다. basic은 ID만 열거하며, 그 소요 시간으로 목록 열거 비용을 비교합니다. hybrid는 CPU 시간, 전용 작업 집합, 작업 집합, 커밋, 일반 I/O, 핸들 수를 읽습니다. 디스크 바이트, 사이클 수, 스레드 수, 일시 중단 상태만 다른 소스가 필요합니다.</p>
<table><thead><tr><th>소스</th><th>샘플</th><th>P50 ms</th><th>P95 ms</th><th>P99 ms</th><th>최대 ms</th><th>자체 CPU ms/주기</th><th>CPU 시간 커버리지</th><th>전용 작업 집합 커버리지</th></tr></thead><tbody>${table}</tbody></table>
<p>수치 검증은 전체 스냅숏으로 앞뒤를 감싸 수행합니다. CPU 검증은 누적 커널 시간과 사용자 시간을 대상으로 합니다. 메모리 동적 값은 구간 안에서 변할 수 있으므로, 범위를 벗어난 횟수와 상대 차이를 따로 기록합니다. 수집 프로그램 자체는 수치 검증에서 제외합니다. 프로세스 CPU 시간은 전체 샘플링 주기로 누적하며 출력과 측정 오버헤드를 포함합니다.</p>
<h2>수치 검증 요약</h2><pre>${escaped(JSON.stringify(validation,null,2))}</pre><h2>환경과 전체 데이터</h2><pre>${escaped(JSON.stringify(report,null,2))}</pre></html>`);
}

if (previous) {
  for (const file of readdirSync(output).sort()) {
    const match = file.match(/^\d+-(full|basic|hybrid|compare)\.jsonl$/);
    if (!match) continue;
    const saved = previous.order.find(row => row.file === file);
    const values = readFileSync(resolve(output, file), "utf8").trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
    rows.push({ mode: match[1], code: saved?.code ?? 0, timedOut: saved?.timedOut ?? false, file, samples: values });
  }
  writeReport();
} else {
  for (const [index, mode] of ["full", "basic", "hybrid", "hybrid", "basic", "full"].entries()) await run(mode,index+1);
  await run("compare",7,Math.min(30,samples));
}
console.log(`Report: ${resolve(output,"report.html")}`);
