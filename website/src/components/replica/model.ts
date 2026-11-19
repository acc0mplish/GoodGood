// Mock data for the interactive window. System totals are made up afresh for
// every sample (sampleAt); process rows share those totals out, so the
// columns add up the way they do in the app.

import metadata from "../../../../resources/app.json";
export const appVersion = metadata.version;
export type Group = "app" | "background" | "windows";
export type Glyph =
  | "app"
  | "kernel"
  | "goodgood"
  | "browser"
  | "code"
  | "folder"
  | "terminal"
  | "console"
  | "pwsh"
  | "paint"
  | "note"
  | "gear"
  | "cloud"
  | "calc"
  | "phone"
  | "shield"
  | "search"
  | "node"
  | "service";

export interface Process {
  pid: number;
  ppid: number;
  name: string;
  exe: string;
  group: Group;
  glyph: Glyph;
  mem: number;
  cpu?: number;
  disk?: number;
  net?: number;
  gpu?: number;
  suspended?: boolean;
  path: string;
  user: string;
  integrity: string;
  args?: string;
  threads: number;
  handles: number;
  started: string;
  /** Accumulated CPU time in seconds. */
  cpuTime: number;
}

export interface Sample {
  cpu: number;
  kernel: number;
  mem: number;
  read: number;
  write: number;
  active: number;
  rx: number;
  tx: number;
  gpu: number;
}

// History ranges: the toolbar (Replica.tsx) and the page (Pages.tsx) both use them.
export type HistoryRange = "1h" | "6h" | "1d" | "7d";
export const historyRanges: { value: HistoryRange; label: string; hours: number; tick: number }[] = [
  { value: "1h", label: "1시간", hours: 1, tick: 10 },
  { value: "6h", label: "6시간", hours: 6, tick: 60 },
  { value: "1d", label: "1일", hours: 24, tick: 180 },
  { value: "7d", label: "7일", hours: 168, tick: 1440 },
];

export const totalMemory = 32 * 1024 ** 3;
export const span = 60;
// What a curve receives: the shown span, one interval to scroll and two hidden samples beyond each edge (Curve.tsx).
export const samples = span + 6;
const MB = 1024 * 1024;
const user = "GOODGOOD-DEMO\\demo";
/** The signed-in account's name, as the user groups title it. */
export const userName = "demo";
/** A process's Windows session: the system's services run in session 0, the signed-in user's programs in 1. */
export const sessionOf = (p: Process) => (p.group === "windows" && p.user.startsWith("NT") ? 0 : 1);
const sys = "NT AUTHORITY\\SYSTEM";
const local = "NT AUTHORITY\\LOCAL SERVICE";
const network = "NT AUTHORITY\\NETWORK SERVICE";
const win = "C:\\Windows\\System32\\";

// Deterministic noise in [0, 1): the server and the browser draw the same first frame.
export function noise(seed: number, tick: number) {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(tick, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
// Noise that eases from one value to the next over `period` samples.
function drift(seed: number, tick: number, period: number) {
  const x = tick / period,
    i = Math.floor(x),
    f = x - i,
    s = f * f * (3 - 2 * f);
  return noise(seed, i) * (1 - s) + noise(seed, i + 1) * s;
}
// A load in [0, 1) that changes slowly, with quicker changes on top.
const load = (seed: number, tick: number) =>
  drift(seed, tick, 23) * 0.5 + drift(seed + 1, tick, 7) * 0.32 + drift(seed + 2, tick, 2.5) * 0.13 + noise(seed + 3, tick) * 0.05;
// Now and then (in `chance` of the blocks of `every` samples) a burst of a few
// samples: it rises at once and falls back over its length. 0 outside them.
function burst(seed: number, tick: number, every: number, chance: number) {
  const block = Math.floor(tick / every);
  let peak = 0;
  for (const b of [block - 1, block]) {
    if (noise(seed, b) >= chance) continue;
    const length = 2 + Math.floor(noise(seed + 2, b) * 5);
    const at = tick - (b * every + Math.floor(noise(seed + 1, b) * every));
    if (at < 0 || at > length) continue;
    const shape = at === 0 ? 0.65 : 1 - (at - 1) / length;
    peak = Math.max(peak, shape * (0.5 + noise(seed + 3, b) * 0.5));
  }
  return peak;
}
// A restless load for the processor: quicker swings carry more weight.
const restless = (seed: number, tick: number) =>
  drift(seed, tick, 19) * 0.36 + drift(seed + 1, tick, 6) * 0.3 + drift(seed + 2, tick, 2.2) * 0.2 + noise(seed + 3, tick) * 0.14;
// A busy desktop, made up: never the same minute twice, yet any sample can be
// drawn again from its tick alone. The processor has short bursts of two
// kinds and, now and then, a stretch of sustained work.
function draw(tick: number): Sample {
  const busy = burst(110, tick, 9, 0.5);
  const work = Math.max(0, drift(105, tick, 45) - 0.55) / 0.45;
  const cpu = Math.min(97, 9 + restless(100, tick) * 40 + work * 24 + busy * 40 + burst(115, tick, 17, 0.4) * 26);
  const read = 160 + load(140, tick) ** 2 * 1600 + burst(150, tick, 9, 0.25) * 22000;
  const write = 1500 + load(160, tick) ** 2 * 7000 + burst(170, tick, 11, 0.45) * 46000;
  const rx = 9500 + load(180, tick) * 9000 + burst(190, tick, 10, 0.4) * 9000;
  const tx = 5000 + load(200, tick) * 6500 + burst(210, tick, 10, 0.35) * 3000;
  return {
    cpu,
    kernel: cpu * (0.3 + drift(120, tick, 9) * 0.18),
    mem: 39 + drift(130, tick, 40) * 3.2 + busy * 0.8,
    read: read * 1024,
    write: write * 1024,
    active: Math.min(100, 1.5 + (read + write) / 1500),
    rx: rx * 1024,
    tx: tx * 1024,
    gpu: Math.min(98, 22 + load(220, tick) * 38 + burst(230, tick, 14, 0.5) * 30),
  };
}
// Each tick is read by many cells and charts; the recent ones are kept.
const drawn = new Map<number, Sample>();
export function sampleAt(tick: number) {
  let sample = drawn.get(tick);
  if (!sample) {
    sample = draw(tick);
    drawn.set(tick, sample);
    if (drawn.size > 512) drawn.delete(drawn.keys().next().value as number);
  }
  return sample;
}
const smooth = (seed: number, tick: number) =>
  (noise(seed, tick) + noise(seed, tick - 1) * 0.6 + noise(seed, tick - 2) * 0.3) /
  1.9;

const p = (
  pid: number,
  ppid: number,
  name: string,
  exe: string,
  group: Group,
  glyph: Glyph,
  memMB: number,
  extra: Partial<Process> = {},
): Process => ({
  pid,
  ppid,
  name,
  exe,
  group,
  glyph,
  mem: memMB * MB,
  path:
    group === "windows" ? win + exe : "C:\\Program Files\\" + name + "\\" + exe,
  user: group === "windows" ? sys : user,
  integrity: group === "windows" ? "시스템" : "보통",
  threads: 8 + ((pid * 7) % 40),
  handles: 120 + ((pid * 13) % 900),
  started: "11/3 08:" + String(10 + (pid % 49)).padStart(2, "0") + ":" + String(pid % 60).padStart(2, "0"),
  cpuTime: (pid * 37) % 5400,
  ...extra,
});

const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const code =
  "C:\\Users\\demo\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe";
const cargoBin = "C:\\Users\\demo\\.cargo\\bin\\";
export const processes: Process[] = [
  // Apps
  p(9876, 6120, "Microsoft Edge", "msedge.exe", "app", "browser", 268, { cpu: 1.2, path: edge, threads: 64, handles: 2140 }),
  p(9900, 9876, "Microsoft Edge", "msedge.exe", "app", "browser", 4.2, { path: edge, args: "--type=crashpad-handler" }),
  p(9912, 9876, "Microsoft Edge", "msedge.exe", "app", "browser", 310, { cpu: 1.6, gpu: 6, path: edge, args: "--type=gpu-process" }),
  p(9940, 9876, "Microsoft Edge", "msedge.exe", "app", "browser", 42, { cpu: 0.4, net: 7, path: edge, args: "--type=utility --utility-sub-type=network.mojom.NetworkService" }),
  p(9964, 9876, "Microsoft Edge", "msedge.exe", "app", "browser", 18, { disk: 0.6, path: edge, args: "--type=utility --utility-sub-type=storage.mojom.StorageService" }),
  p(10012, 9876, "Microsoft Edge", "msedge.exe", "app", "browser", 12, { cpu: 0.3, path: edge, args: "--type=utility --utility-sub-type=audio.mojom.AudioService" }),
  p(10140, 9876, "Microsoft Edge", "msedge.exe", "app", "browser", 420, { cpu: 3.2, path: edge, args: "--type=renderer" }),
  p(10188, 9876, "Microsoft Edge", "msedge.exe", "app", "browser", 236, { cpu: 1.4, path: edge, args: "--type=renderer" }),
  p(10232, 9876, "Microsoft Edge", "msedge.exe", "app", "browser", 168, { cpu: 0.6, path: edge, args: "--type=renderer" }),
  p(10276, 9876, "Microsoft Edge", "msedge.exe", "app", "browser", 96, { cpu: 0.2, path: edge, args: "--type=renderer" }),
  p(10320, 9876, "Microsoft Edge", "msedge.exe", "app", "browser", 81, { cpu: 0.1, path: edge, args: "--type=renderer" }),
  p(11240, 6120, "Visual Studio Code", "Code.exe", "app", "code", 210, { cpu: 0.8, path: code, threads: 52, handles: 1260 }),
  p(11268, 11240, "Visual Studio Code", "Code.exe", "app", "code", 122, { cpu: 0.6, gpu: 1.2, path: code, args: "--type=gpu-process" }),
  p(11296, 11240, "Visual Studio Code", "Code.exe", "app", "code", 384, { cpu: 1.1, path: code, args: "--type=renderer" }),
  p(11324, 11240, "Visual Studio Code", "Code.exe", "app", "code", 540, { cpu: 2.4, disk: 1.2, path: code, args: "--type=utility --utility-sub-type=node.mojom.NodeService" }),
  p(11352, 11240, "Visual Studio Code", "Code.exe", "app", "code", 61, { cpu: 0.2, disk: 0.8, path: code, args: "--type=utility (fileWatcher)" }),
  p(11380, 11240, "Visual Studio Code", "Code.exe", "app", "code", 30, { path: code, args: "--type=utility (ptyHost)" }),
  p(6120, 6060, "Windows 탐색기", "explorer.exe", "app", "folder", 167.5, { cpu: 0.4, disk: 0.4, path: "C:\\Windows\\explorer.exe", threads: 118, handles: 4260 }),
  p(12880, 6120, "터미널", "WindowsTerminal.exe", "app", "terminal", 96, { cpu: 0.3, gpu: 0.4, path: "C:\\Program Files\\WindowsApps\\Microsoft.WindowsTerminal\\WindowsTerminal.exe" }),
  p(14868, 6120, "그림판", "mspaint.exe", "app", "paint", 134.2, { cpu: 0.2, path: "C:\\Program Files\\WindowsApps\\Microsoft.Paint\\PaintApp\\mspaint.exe" }),
  p(15204, 6120, "메모장", "Notepad.exe", "app", "note", 48, { cpu: 0.1, path: "C:\\Program Files\\WindowsApps\\Microsoft.WindowsNotepad\\Notepad\\Notepad.exe" }),
  p(16072, 6120, "GoodGood", "goodgood.exe", "app", "goodgood", 17.8, { cpu: 0.4, gpu: 0.6, path: "C:\\Program Files\\GoodGood\\goodgood.exe", threads: 28, handles: 610 }),
  p(17320, 1196, "설정", "SystemSettings.exe", "app", "gear", 31, { suspended: true, path: "C:\\Windows\\ImmersiveControlPanel\\SystemSettings.exe" }),
  // Background processes
  p(13004, 12880, "PowerShell 7", "pwsh.exe", "background", "pwsh", 78, { cpu: 0.1, path: "C:\\Program Files\\PowerShell\\7\\pwsh.exe" }),
  p(13010, 13004, "콘솔 창 호스트", "conhost.exe", "background", "console", 3.1, { path: win + "conhost.exe" }),
  p(13954, 13004, "cargo", "cargo.exe", "background", "app", 32.1, { cpu: 0.6, disk: 1.6, path: cargoBin + "cargo.exe", args: "build --release" }),
  p(14102, 13954, "rustc", "rustc.exe", "background", "app", 1096, { cpu: 9, disk: 3.4, path: cargoBin + "rustc.exe", args: "--crate-name goodgood_core --edition=2024" }),
  p(14130, 13954, "rustc", "rustc.exe", "background", "app", 756.5, { cpu: 6, disk: 2.1, path: cargoBin + "rustc.exe", args: "--crate-name goodgood --edition=2024" }),
  p(13577, 11324, "rust-analyzer", "rust-analyzer.exe", "background", "app", 1016, { cpu: 2.2, disk: 0.9, path: "C:\\Users\\demo\\.vscode\\extensions\\rust-analyzer\\server\\rust-analyzer.exe" }),
  p(13729, 13004, "Node.js JavaScript Runtime", "node.exe", "background", "node", 84.1, { cpu: 0.4, net: 0.4, path: "C:\\Program Files\\nodejs\\node.exe", args: "vite --port 5173" }),
  p(8920, 6120, "OneDrive", "OneDrive.exe", "background", "cloud", 96, { cpu: 0.2, disk: 0.8, net: 2.6, path: "C:\\Users\\demo\\AppData\\Local\\Microsoft\\OneDrive\\OneDrive.exe", args: "/background" }),
  p(18283, 1196, "계산기", "CalculatorApp.exe", "background", "calc", 20.2, { suspended: true, path: "C:\\Program Files\\WindowsApps\\Microsoft.WindowsCalculator\\CalculatorApp.exe" }),
  p(9420, 1196, "휴대폰과 연결", "PhoneExperienceHost.exe", "background", "phone", 64, { cpu: 0.1, net: 0.3, path: "C:\\Program Files\\WindowsApps\\Microsoft.YourPhone\\PhoneExperienceHost.exe" }),
  // Windows processes
  p(4, 0, "System", "System", "windows", "kernel", 0.1, { cpu: 0.6, disk: 2.4, path: "System", threads: 284, handles: 7820 }),
  p(148, 4, "Registry", "Registry", "windows", "kernel", 9.4, { path: "Registry" }),
  p(2864, 4, "메모리 압축", "Memory Compression", "windows", "kernel", 640, { path: "Memory Compression" }),
  p(520, 4, "Windows 세션 관리자", "smss.exe", "windows", "app", 0.4),
  p(812, 760, "클라이언트 서버 런타임 프로세스", "csrss.exe", "windows", "app", 1.9, { cpu: 0.1 }),
  p(916, 896, "클라이언트 서버 런타임 프로세스", "csrss.exe", "windows", "app", 2.6, { cpu: 0.2 }),
  p(904, 760, "Windows 시작 응용 프로그램", "wininit.exe", "windows", "app", 1.3),
  p(1004, 896, "Windows 로그온 응용 프로그램", "winlogon.exe", "windows", "app", 2.4),
  p(1068, 904, "서비스 및 컨트롤러 앱", "services.exe", "windows", "app", 6.8, { cpu: 0.1 }),
  p(1088, 904, "로컬 보안 기관 프로세스", "lsass.exe", "windows", "app", 9.6, { cpu: 0.1 }),
  p(1420, 1004, "바탕 화면 창 관리자", "dwm.exe", "windows", "app", 140.1, { cpu: 2, gpu: 9, user: "Window Manager\\DWM-1" }),
  p(1236, 904, "Usermode Font Driver Host", "fontdrvhost.exe", "windows", "app", 1.6, { user: "Font Driver Host\\UMFD-0" }),
  p(1196, 1068, "서비스 호스트: DCOM 서버 프로세스 시작 관리자", "svchost.exe", "windows", "service", 14.2, { cpu: 0.1, args: "-k DcomLaunch -p" }),
  p(1784, 1068, "서비스 호스트: DNS 클라이언트", "svchost.exe", "windows", "service", 7.6, { net: 0.2, user: network, args: "-k NetworkService -p -s Dnscache" }),
  p(2072, 1068, "서비스 호스트: DHCP 클라이언트", "svchost.exe", "windows", "service", 3.9, { net: 0.1, user: local, args: "-k LocalServiceNetworkRestricted -p -s Dhcp" }),
  p(2336, 1068, "서비스 호스트: Windows 이벤트 로그", "svchost.exe", "windows", "service", 18.5, { cpu: 0.1, disk: 0.6, user: local, args: "-k LocalServiceNetworkRestricted -p -s EventLog" }),
  p(2896, 1068, "서비스 호스트: Windows 오디오", "svchost.exe", "windows", "service", 8.8, { cpu: 0.2, user: local, args: "-k LocalServiceNetworkRestricted -p -s AudioSrv" }),
  p(3192, 1068, "서비스 호스트: Windows 업데이트", "svchost.exe", "windows", "service", 26.6, { cpu: 0.3, disk: 1.4, net: 1.4, args: "-k netsvcs -p -s wuauserv" }),
  p(3376, 1068, "서비스 호스트: SysMain", "svchost.exe", "windows", "service", 22.4, { disk: 1.8, args: "-k LocalSystemNetworkRestricted -p -s SysMain" }),
  p(2988, 1068, "스풀러 하위 시스템 앱", "spoolsv.exe", "windows", "service", 6.9),
  p(3480, 1068, "Antimalware Service Executable", "MsMpEng.exe", "windows", "shield", 212, { cpu: 1.4, disk: 2.6, path: "C:\\ProgramData\\Microsoft\\Windows Defender\\Platform\\MsMpEng.exe" }),
  p(3280, 1068, "Microsoft Windows Search Indexer", "SearchIndexer.exe", "windows", "search", 38.4, { cpu: 0.3, disk: 1.6 }),
  p(7012, 1196, "검색", "SearchHost.exe", "windows", "search", 121, { cpu: 0.1, user, integrity: "낮음" }),
  p(7104, 1196, "시작", "StartMenuExperienceHost.exe", "windows", "app", 61.5, { user, integrity: "낮음" }),
  p(7740, 1196, "Windows 셸 환경 호스트", "ShellExperienceHost.exe", "windows", "app", 44.8, { user, integrity: "낮음" }),
  p(7320, 1196, "런타임 브로커", "RuntimeBroker.exe", "windows", "app", 8.4, { user }),
  p(7564, 1196, "런타임 브로커", "RuntimeBroker.exe", "windows", "app", 5.1, { user }),
  p(5544, 1196, "Windows 작업용 호스트 프로세스", "taskhostw.exe", "windows", "app", 9.2, { user }),
  p(5400, 1068, "Shell Infrastructure Host", "sihost.exe", "windows", "app", 14.6, { cpu: 0.1, user }),
  p(6280, 5400, "CTF 로더", "ctfmon.exe", "windows", "app", 11.7, { cpu: 0.1, user }),
  p(11980, 2896, "Windows 오디오 장치 그래프 격리", "audiodg.exe", "windows", "app", 12.3, { cpu: 0.3, user: local }),
];

export const groupLabel: Record<Group, string> = {
  app: "앱",
  background: "백그라운드 프로세스",
  windows: "Windows 프로세스",
};

// Hiding system processes (the app's visibility.rs): Windows components leave
// the lists unless their program is kept, and so do the programs named to
// hide. Names are exact executable names, compared without case.
export interface VisibilityRules {
  keep: string[];
  hide: string[];
}
export const defaultVisibility: VisibilityRules = {
  keep: ["cmd.exe", "conhost.exe", "explorer.exe", "openconsole.exe", "powershell.exe", "pwsh.exe"],
  hide: [],
};
export function hidesProcess(rules: VisibilityRules, p: Process) {
  const name = p.exe.toLowerCase();
  return !rules.keep.includes(name) && (p.group === "windows" || rules.hide.includes(name));
}
/** The names of a list as typed, or null where one is a path or a pattern. */
export function programNames(value: string): string[] | null {
  const names = new Set<string>();
  for (const name of value.split(/[,;\n\r，；]/).map((s) => s.trim()).filter(Boolean)) {
    // eslint-disable-next-line no-control-regex
    if (name.length > 260 || /[\u0000-\u001f\\/:*?"<>|]/.test(name)) return null;
    names.add(name.toLowerCase());
    if (names.size > 128) return null;
  }
  return [...names].sort();
}

export interface Reading {
  cpu: number;
  mem: number;
  read: number;
  write: number;
  io: number;
  gpu: number;
  net: number;
}

// Share the recorded system totals among the processes that have weight in each.
export function readings(tick: number, list: Process[]) {
  const s = sampleAt(tick);
  const share = (key: "cpu" | "disk" | "net" | "gpu", seed: number) => {
    const weights = list.map((proc) => {
      const base = proc[key] ?? 0;
      if (!base || proc.suspended) return 0;
      return base * (0.35 + 1.3 * smooth(proc.pid * 31 + seed, tick));
    });
    const sum = weights.reduce((a, b) => a + b, 0) || 1;
    return weights.map((w) => w / sum);
  };
  const cpu = share("cpu", 1),
    disk = share("disk", 2),
    net = share("net", 3),
    gpu = share("gpu", 4);
  const out = new Map<number, Reading>();
  list.forEach((proc, i) => {
    const drift = 1 + (smooth(proc.pid * 17 + 9, Math.floor(tick / 4)) - 0.5) * 0.04;
    const readShare = disk[i] * (0.4 + noise(proc.pid, tick) * 0.6);
    out.set(proc.pid, {
      cpu: s.cpu * cpu[i],
      mem: proc.mem * drift,
      read: s.read * readShare,
      write: s.write * disk[i],
      io: (s.read * readShare + s.write * disk[i]) * 1.08 + s.rx * net[i] * 0.02,
      gpu: s.gpu * gpu[i] * 0.9,
      net: (s.rx + s.tx) * net[i],
    });
  });
  return out;
}

const heatRules = {
  percent: (v: number) => v / 40,
  memory: (v: number) => v / (2 * 1024 ** 3),
  rate: (v: number) => Math.log10(v / MB + 1) / 2,
};
const heatMinimum = { percent: 1, memory: 200 * MB, rate: MB };
export function heat(kind: keyof typeof heatRules, value: number) {
  if (!(value >= heatMinimum[kind])) return 0;
  return Math.min(1, Math.max(0, heatRules[kind](value))) * 0.34;
}

// Sizes and rates as the app writes them (theme::memory, theme::bytes).
export function bytes(value: number) {
  if (value < 1024) return Math.round(value) + " B";
  if (value < MB) return Math.round(value / 1024) + " KB";
  if (value < 1024 * MB) return (value / MB).toFixed(1) + " MB";
  const gb = value / (1024 * MB);
  return (gb >= 10 ? gb.toFixed(1) : gb.toFixed(2)) + " GB";
}
export function rate(value: number) {
  if (value < 1) return "0";
  if (value < MB) return Math.max(1, Math.round(value / 1024)) + " KB/s";
  if (value < 1024 * MB) return (value / MB).toFixed(1) + " MB/s";
  return (value / (1024 * MB)).toFixed(2) + " GB/s";
}
// Throughput axis tops: the app's fixed steps (charts/rate.rs), at least 100 KB/s.
export function rateCeiling(peak: number, network = false) {
  const kilo = network ? [100, 500] : [100, 200, 500];
  const rest = network ? [1, 5, 10, 50, 100, 500] : [1, 10, 50, 100, 200, 500];
  for (const [size, steps] of [[1024, kilo], [MB, rest], [1024 * MB, rest]] as [number, number[]][])
    for (const step of steps) if (step * size >= peak) return step * size;
  return peak;
}
export function rateLabel(top: number) {
  if (top >= 1024 * MB) return Math.round(top / (1024 * MB)) + " GB/s";
  if (top >= MB) return Math.round(top / MB) + " MB/s";
  return Math.round(top / 1024) + " KB/s";
}
export function percent(value: number) {
  if (value < 0.05) return "0";
  return value < 10 ? value.toFixed(1) : Math.round(value).toString();
}
export const thousands = (value: number) =>
  Math.round(value).toLocaleString("en-US");

// Logical processors 0–11 belong to six hyper-threaded performance cores, 12–19 are efficiency cores.
export const logical = Array.from({ length: 20 }, (_, i) => ({
  index: i,
  kind: i < 12 ? ("p" as const) : ("e" as const),
}));
export function coreLoad(index: number, tick: number) {
  const s = sampleAt(tick);
  const bias = index < 12 ? 1.18 : 0.74;
  const v = s.cpu * bias * (0.45 + 1.1 * smooth(index * 97 + 5, tick));
  return Math.min(100, v);
}
export function clock(kind: "p" | "e", tick: number) {
  const s = sampleAt(tick);
  const base = kind === "p" ? 3.3 : 2.6;
  return base + (s.cpu / 100) * 0.9 + noise(kind === "p" ? 11 : 12, tick) * 0.12;
}

export interface Service {
  display: string;
  name: string;
  pid?: number;
  start: "auto" | "autoDelayed" | "manual" | "disabled";
  description: string;
}
export const services: Service[] = [
  { display: "Background Intelligent Transfer Service", name: "BITS", start: "manual", description: "유휴 네트워크 대역폭을 사용하여 백그라운드에서 파일을 전송합니다." },
  { display: "DHCP Client", name: "Dhcp", pid: 2072, start: "auto", description: "이 컴퓨터의 IP 주소와 DNS 레코드를 등록하고 업데이트합니다." },
  { display: "DNS Client", name: "Dnscache", pid: 1784, start: "auto", description: "DNS 조회 결과를 캐시하고 이 컴퓨터의 전체 이름을 등록합니다." },
  { display: "Microsoft Defender Antivirus Service", name: "WinDefend", pid: 3480, start: "auto", description: "악성 소프트웨어와 원치 않는 소프트웨어로부터 사용자를 보호합니다." },
  { display: "Print Spooler", name: "Spooler", pid: 2988, start: "auto", description: "인쇄 작업을 대기열에 넣고 프린터와의 상호 작용을 처리합니다." },
  { display: "Remote Registry", name: "RemoteRegistry", start: "disabled", description: "원격 사용자가 이 컴퓨터의 레지스트리 설정을 수정할 수 있게 합니다." },
  { display: "SysMain", name: "SysMain", pid: 3376, start: "auto", description: "일정 기간 동안 시스템 성능을 유지하고 향상합니다." },
  { display: "Task Scheduler", name: "Schedule", pid: 1196, start: "auto", description: "일정에 따라 작업을 자동으로 실행합니다." },
  { display: "Windows Audio", name: "AudioSrv", pid: 2896, start: "auto", description: "Windows 기반 프로그램의 오디오를 관리합니다." },
  { display: "Windows Event Log", name: "EventLog", pid: 2336, start: "auto", description: "이벤트와 이벤트 로그를 관리합니다." },
  { display: "Windows Search", name: "WSearch", pid: 3280, start: "autoDelayed", description: "파일, 전자 메일 및 기타 콘텐츠의 인덱스를 제공합니다." },
  { display: "Windows Update", name: "wuauserv", pid: 3192, start: "manual", description: "Windows 업데이트의 검색, 다운로드, 설치를 사용하도록 설정합니다." },
  { display: "Xbox Live 인증 관리자", name: "XblAuthManager", start: "manual", description: "인증 및 권한 부여 서비스를 제공합니다." },
  { display: "Netlogon", name: "Netlogon", start: "manual", description: "사용자와 서비스 인증을 위한 보안 채널을 유지합니다." },
];
export const startLabel = {
  auto: "자동",
  autoDelayed: "자동(지연된 시작)",
  manual: "수동",
  disabled: "사용 안 함",
};

export interface StartupItem {
  name: string;
  publisher: string;
  enabled: boolean;
  location: string;
  command: string;
  missing?: boolean;
  glyph: Glyph;
}
export const startupItems: StartupItem[] = [
  { name: "GoodGood", publisher: "GoodGood contributors", enabled: true, location: "레지스트리(현재 사용자)", command: '"C:\\Program Files\\GoodGood\\goodgood.exe" --hidden', glyph: "goodgood" },
  { name: "Contoso Updater", publisher: "—", enabled: true, location: "레지스트리(모든 사용자, 32비트)", command: '"C:\\Program Files (x86)\\Contoso\\updater.exe" /silent', missing: true, glyph: "app" },
  { name: "OneDrive", publisher: "Microsoft Corporation", enabled: true, location: "레지스트리(현재 사용자)", command: '"C:\\Users\\demo\\AppData\\Local\\Microsoft\\OneDrive\\OneDrive.exe" /background', glyph: "cloud" },
  { name: "SecurityHealth", publisher: "Microsoft Corporation", enabled: true, location: "레지스트리(모든 사용자)", command: "C:\\WINDOWS\\system32\\SecurityHealthSystray.exe", glyph: "shield" },
  { name: "휴대폰과 연결", publisher: "Microsoft Corporation", enabled: false, location: "앱 패키지(현재 사용자)", command: '"C:\\Program Files\\WindowsApps\\Microsoft.YourPhone\\PhoneExperienceHost.exe"', glyph: "phone" },
  { name: "터미널", publisher: "Microsoft Corporation", enabled: false, location: "앱 패키지(현재 사용자)", command: '"C:\\Program Files\\WindowsApps\\Microsoft.WindowsTerminal\\WindowsTerminal.exe"', glyph: "terminal" },
];

export interface Connection {
  pid: number;
  protocol: "TCP" | "UDP";
  local: string;
  localPort: number;
  remote?: string;
  remotePort?: number;
  state?: "listen" | "established" | "timeWait" | "closeWait";
}
export const stateLabel = {
  listen: "수신 대기",
  established: "연결됨",
  timeWait: "종료 대기",
  closeWait: "닫기 대기",
};
export const connections: Connection[] = [
  { pid: 9940, protocol: "TCP", local: "192.0.2.24", localPort: 52144, remote: "203.0.113.18", remotePort: 443, state: "established" },
  { pid: 9940, protocol: "TCP", local: "192.0.2.24", localPort: 52151, remote: "198.51.100.7", remotePort: 443, state: "established" },
  { pid: 9940, protocol: "TCP", local: "2001:db8::24", localPort: 52610, remote: "2001:db8:85a3::8a2e", remotePort: 443, state: "established" },
  { pid: 9940, protocol: "TCP", local: "127.0.0.1", localPort: 52388, remote: "127.0.0.1", remotePort: 5173, state: "established" },
  { pid: 13729, protocol: "TCP", local: "127.0.0.1", localPort: 5173, remote: "127.0.0.1", remotePort: 52388, state: "established" },
  { pid: 13729, protocol: "TCP", local: "127.0.0.1", localPort: 5173, state: "listen" },
  { pid: 8920, protocol: "TCP", local: "192.0.2.24", localPort: 52210, remote: "203.0.113.40", remotePort: 443, state: "established" },
  { pid: 3192, protocol: "TCP", local: "192.0.2.24", localPort: 52633, remote: "203.0.113.77", remotePort: 443, state: "closeWait" },
  { pid: 9420, protocol: "TCP", local: "192.0.2.24", localPort: 52502, remote: "198.51.100.23", remotePort: 443, state: "timeWait" },
  { pid: 1196, protocol: "TCP", local: "0.0.0.0", localPort: 135, state: "listen" },
  { pid: 4, protocol: "TCP", local: "0.0.0.0", localPort: 445, state: "listen" },
  { pid: 1088, protocol: "TCP", local: "0.0.0.0", localPort: 49664, state: "listen" },
  { pid: 9940, protocol: "UDP", local: "0.0.0.0", localPort: 5353 },
  { pid: 1784, protocol: "UDP", local: "0.0.0.0", localPort: 5355 },
  { pid: 2072, protocol: "UDP", local: "192.0.2.24", localPort: 68 },
];

export const machine = {
  cpu: "Intel Core i5-13500HX",
  gpu: "NVIDIA GeForce RTX 4060 Laptop GPU",
  disk: "Samsung SSD 990 PRO 2TB",
  wifi: "Intel Wi-Fi 6E AX211 160MHz",
};
