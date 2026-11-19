/** @jsxImportSource @/components/replica/i18n */
"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Icon, ProcessIcon, type UiIcon } from "./icons";
import type { Motion } from "./Curve";
import { language, translate } from "./i18n";
import { dateLocale, isLanguage, languages, localized, preferredLanguage, rememberLanguage, type Language } from "@/lib/languages";
import {
  appVersion,
  bytes,
  connections,
  noise,
  percent,
  defaultVisibility,
  processes,
  programNames,
  rate,
  rateLabel,
  startLabel,
  stateLabel,
  type Process,
  type Service,
  type StartupItem,
  type VisibilityRules,
  historyRanges,
  type HistoryRange,
} from "./model";
import { Button, scaleOf, Segments, Select, Switch } from "./widgets";

export type ServiceFilter = "all" | "running" | "stopped";
export type ServiceState = "running" | "stopped" | "startPending" | "stopPending";
const stateText: Record<ServiceState, string> = {
  running: "실행 중",
  stopped: "중지됨",
  startPending: "시작 중",
  stopPending: "중지 중",
};
export type MenuEntry =
  | "-"
  | {
      label: string;
      icon?: UiIcon;
      hint?: string;
      danger?: boolean;
      disabled?: boolean;
      checked?: boolean;
      children?: MenuEntry[];
      /** Quiet text at the end of the item, such as a submenu's checked count. */
      detail?: string;
      /** A check toggled in place, the menu staying open. */
      stay?: boolean;
      run?: () => void;
    };
type OpenMenu = (event: MouseEvent, items: MenuEntry[]) => void;

// Sortable headers of the list pages (34 px cells; the sorted one bold with its chevron).
interface Col<K extends string> {
  key: K;
  label: string;
  end?: boolean;
  className?: string;
}
function useSort<K extends string>(initial: K) {
  const [state, setState] = useState<{ key: K; desc: boolean }>({ key: initial, desc: false });
  const toggle = (key: K) => setState((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: false }));
  return [state, toggle] as const;
}
function Header<K extends string>({
  cols,
  sort,
  onSort,
}: {
  cols: Col<K>[];
  sort: { key: K; desc: boolean };
  onSort: (key: K) => void;
}) {
  return (
    <div className="a-thead" role="row">
      {cols.map((c) => (
        <button
          key={c.key}
          type="button"
          role="columnheader"
          className={"a-th" + (c.end ? " is-end" : "") + (c.className ? " " + c.className : "")}
          aria-sort={sort.key === c.key ? (sort.desc ? "descending" : "ascending") : "none"}
          onClick={() => onSort(c.key)}
        >
          <span className="a-th-label">
            <span>{c.label}</span>
            {sort.key === c.key && <Icon name={sort.desc ? "chevronDown" : "chevronUp"} size={12} />}
          </span>
        </button>
      ))}
    </div>
  );
}
function sorted<T>(rows: T[], value: (row: T) => string | number, desc: boolean) {
  // Text sorts as it reads in the page's language.
  const collator = new Intl.Collator(dateLocale(language()), { numeric: true });
  return [...rows].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    const c = typeof x === "number" && typeof y === "number" ? x - y : collator.compare(translate(String(x)), translate(String(y)));
    return desc ? -c : c;
  });
}

type ServiceCol = "display" | "name" | "pid" | "state" | "start" | "description";
export function Services({
  list,
  states,
  filter,
  query,
  selected,
  onSelect,
  onMenu,
}: {
  list: Service[];
  states: Map<string, ServiceState>;
  filter: ServiceFilter;
  query: string;
  selected: string | null;
  onSelect: (name: string | null) => void;
  onMenu: (event: MouseEvent, service: Service) => void;
}) {
  const [sort, setSort] = useSort<ServiceCol>("display");
  const q = query.trim().toLowerCase();
  const rows = sorted(
    list.filter((s) => {
      const state = states.get(s.name)!;
      if (filter === "running" && state !== "running") return false;
      if (filter === "stopped" && state !== "stopped") return false;
      return (
        !q ||
        s.display.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.description.includes(q) ||
        String(s.pid ?? "") === q
      );
    }),
    (s) =>
      sort.key === "pid"
        ? states.get(s.name) === "running"
          ? (s.pid ?? 0)
          : 0
        : sort.key === "state"
          ? stateText[states.get(s.name)!]
          : sort.key === "start"
            ? startLabel[s.start]
            : sort.key === "name"
              ? s.name
              : sort.key === "description"
                ? s.description
                : s.display,
    sort.desc,
  );
  const running = list.filter((s) => states.get(s.name) === "running").length;
  return (
    <div className="a-page">
      <div className="a-list-card">
        <div className="a-table a-services" role="grid" aria-label="서비스">
          <Header
            sort={sort}
            onSort={setSort}
            cols={[
              { key: "display", label: "서비스" },
              { key: "name", label: "이름", className: "a-c-name" },
              { key: "pid", label: "PID", end: true, className: "a-c-pid" },
              { key: "state", label: "상태" },
              { key: "start", label: "시작 유형" },
              { key: "description", label: "설명", className: "a-col-wide" },
            ]}
          />
          <div className="a-tbody a-scroll" role="rowgroup" tabIndex={0}>
            {rows.length === 0 && <p className="a-empty">일치하는 서비스가 없습니다</p>}
            {rows.map((s) => {
              const state = states.get(s.name)!;
              return (
                <div
                  key={s.name}
                  role="row"
                  aria-selected={selected === s.name}
                  className={"a-tr" + (selected === s.name ? " is-selected" : "")}
                  onClick={() => onSelect(selected === s.name ? null : s.name)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    onSelect(s.name);
                    onMenu(event, s);
                  }}
                >
                  <span role="gridcell" className="a-td" title={s.display}>
                    <span className="a-cell-text">{s.display}</span>
                  </span>
                  <span role="gridcell" className="a-td is-faint a-c-name">
                    <span className="a-cell-text">{s.name}</span>
                  </span>
                  <span role="gridcell" className="a-td is-end is-faint a-c-pid">
                    {state === "running" ? (s.pid ?? "") : ""}
                  </span>
                  <span role="gridcell" className="a-td">
                    <i className={"a-dot" + (state === "running" ? " is-ok" : state.endsWith("Pending") ? " is-busy" : "")} />
                    {stateText[state]}
                  </span>
                  <span
                    role="gridcell"
                    className="a-td"
                    style={s.start === "disabled" ? { color: "var(--a-io)" } : s.start === "manual" ? { color: "var(--a-ink-3)" } : undefined}
                  >
                    {startLabel[s.start]}
                  </span>
                  <span role="gridcell" className="a-td is-faint a-col-wide" title={s.description}>
                    <span className="a-cell-text">{s.description}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <footer className="a-list-foot">
          <span>
            {`실행 중 ${running} / 전체 ${list.length}개 서비스`}
          </span>
        </footer>
      </div>
    </div>
  );
}

type StartupCol = "name" | "publisher" | "enabled" | "location" | "command";
export function Startup({
  items,
  query,
  onToggle,
  onMenu,
}: {
  items: StartupItem[];
  query: string;
  onToggle: (name: string) => void;
  onMenu: OpenMenu;
}) {
  const [sort, setSort] = useSort<StartupCol>("name");
  const [selected, setSelected] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const rows = sorted(
    items.filter(
      (i) => !q || i.name.toLowerCase().includes(q) || i.publisher.toLowerCase().includes(q) || i.command.toLowerCase().includes(q),
    ),
    (i) => (sort.key === "enabled" ? (i.enabled ? 1 : 0) : i[sort.key]),
    sort.desc,
  );
  const enabled = items.filter((i) => i.enabled).length;
  return (
    <div className="a-page">
      <div className="a-list-card">
        <div className="a-table a-startup" role="grid" aria-label="시작 프로그램">
          <Header
            sort={sort}
            onSort={setSort}
            cols={[
              { key: "name", label: "이름" },
              { key: "publisher", label: "게시자", className: "a-c-publisher" },
              { key: "enabled", label: "상태" },
              { key: "location", label: "위치", className: "a-c-location" },
              { key: "command", label: "명령", className: "a-col-wide" },
            ]}
          />
          <div className="a-tbody a-scroll" role="rowgroup" tabIndex={0}>
            {rows.length === 0 && <p className="a-empty">일치하는 시작 프로그램이 없습니다</p>}
            {rows.map((item) => (
              <div
                key={item.name}
                role="row"
                aria-selected={selected === item.name}
                className={"a-tr" + (selected === item.name ? " is-selected" : "")}
                onClick={() => setSelected(selected === item.name ? null : item.name)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setSelected(item.name);
                  onMenu(event, [
                    { label: item.enabled ? "사용 안 함" : "사용", run: () => onToggle(item.name) },
                    "-",
                    { label: "파일 위치 열기", icon: "folder", disabled: item.missing },
                    { label: "명령 복사", icon: "copy", run: () => void navigator.clipboard?.writeText(item.command).catch(() => {}) },
                    "-",
                    { label: "맨 위에 고정", icon: "pin" },
                    { label: "메모 추가", icon: "note" },
                  ]);
                }}
              >
                <span role="gridcell" className="a-td" title={item.name + "\n" + item.command}>
                  <ProcessIcon glyph={item.glyph} />
                  <span className={"a-cell-text" + (item.enabled ? "" : " is-faint")} style={item.enabled ? undefined : { color: "var(--a-ink-2)" }}>
                    {item.name}
                  </span>
                  {item.missing && (
                    <span className="a-tag is-warn" title="이 명령이 가리키는 프로그램이 더 이상 존재하지 않습니다. 이 항목은 사용 안 함으로 설정할 수 있습니다">
                      파일이 존재하지 않습니다
                    </span>
                  )}
                </span>
                <span role="gridcell" className="a-td is-faint a-c-publisher">
                  <span className="a-cell-text">{item.publisher}</span>
                </span>
                <span role="gridcell" className="a-td" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.enabled}
                    data-startup={item.name}
                    aria-label={(item.enabled ? "사용 안 함: " : "사용: ") + item.name}
                    className="a-switch is-small"
                    onClick={() => onToggle(item.name)}
                  >
                    <i />
                  </button>
                  <span style={item.enabled ? undefined : { color: "var(--a-ink-3)" }}>{item.enabled ? "사용 중" : "사용 안 함"}</span>
                </span>
                <span role="gridcell" className="a-td is-faint a-c-location">
                  <span className="a-cell-text">{item.location}</span>
                </span>
                <span role="gridcell" className="a-td is-faint a-mono a-col-wide" title={item.command}>
                  <span className="a-cell-text">{item.command}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <footer className="a-list-foot">
          <span>
            {`사용 ${enabled} / 전체 ${items.length}개`}
          </span>
          <span>사용 안 함으로 설정할 때는 작업 관리자의 시작 프로그램과 같은 스위치를 사용하므로 언제든 되돌릴 수 있습니다. 모든 사용자 항목을 변경하려면 관리자 권한이 필요합니다.</span>
        </footer>
      </div>
    </div>
  );
}

export type ConnectionFilter = "all" | "listen" | "established" | "udp";
type ConnectionCol = "name" | "pid" | "protocol" | "local" | "localPort" | "remote" | "remotePort" | "state";
export function Connections({
  alive,
  filter,
  query,
  hidden,
  onShowAll,
  onOpen,
  onMenu,
}: {
  alive: Process[];
  filter: ConnectionFilter;
  query: string;
  /** While system processes are hidden: whether a process is one of them. */
  hidden?: (proc: Process) => boolean;
  onShowAll: () => void;
  onOpen: (pid: number) => void;
  onMenu: OpenMenu;
}) {
  const [sort, setSort] = useSort<ConnectionCol>("name");
  const [selected, setSelected] = useState<number | null>(null);
  const byPid = new Map(processes.map((p) => [p.pid, p]));
  const living = new Set(alive.map((p) => p.pid));
  const q = query.trim();
  const port = /^\d{1,5}$/.test(q) ? Number(q) : null;
  const visible = connections
    .map((c, index) => ({ ...c, index, proc: byPid.get(c.pid) }))
    .filter((c) => {
      // Hidden with their processes, and the records no process owns (PID 0).
      if (hidden && (c.pid === 0 || (c.proc && hidden(c.proc)))) return false;
      if (filter === "listen" && c.state !== "listen") return false;
      if (filter === "established" && c.state !== "established") return false;
      if (filter === "udp" && c.protocol !== "UDP") return false;
      if (port !== null) return c.localPort === port || c.remotePort === port || String(c.pid).startsWith(q);
      if (!q) return true;
      const needle = q.toLowerCase();
      return (
        (c.proc?.exe.toLowerCase().includes(needle) ?? false) ||
        (c.proc?.name.toLowerCase().includes(needle) ?? false) ||
        c.local.includes(q) ||
        (c.remote?.includes(q) ?? false)
      );
    });
  const rows = sorted(
    visible,
    (c) =>
      sort.key === "name"
        ? (c.proc?.exe ?? "")
        : sort.key === "pid"
          ? c.pid
          : sort.key === "protocol"
            ? c.protocol
            : sort.key === "local"
              ? c.local
              : sort.key === "localPort"
                ? c.localPort
                : sort.key === "remote"
                  ? (c.remote ?? "")
                  : sort.key === "remotePort"
                    ? (c.remotePort ?? 0)
                    : (c.state ?? ""),
    sort.desc,
  );
  const listen = connections.filter((c) => c.state === "listen").length;
  const established = connections.filter((c) => c.state === "established").length;
  const udp = connections.filter((c) => c.protocol === "UDP").length;
  const endpoint = (address: string, p?: number) => (address.includes(":") ? `[${address}]:${p}` : `${address}:${p}`);
  return (
    <div className="a-page">
      <div className="a-list-card">
        <div className="a-table a-connections" role="grid" aria-label="네트워크 연결">
          <Header
            sort={sort}
            onSort={setSort}
            cols={[
              { key: "name", label: "프로세스" },
              { key: "pid", label: "PID", end: true, className: "a-c-pid" },
              { key: "protocol", label: "프로토콜" },
              { key: "local", label: "로컬 주소", className: "a-c-local" },
              { key: "localPort", label: "로컬 포트", end: true },
              { key: "remote", label: "원격 주소", className: "a-c-remote" },
              { key: "remotePort", label: "원격 포트", end: true, className: "a-c-rport" },
              { key: "state", label: "상태" },
            ]}
          />
          <div className="a-tbody a-scroll" role="rowgroup" tabIndex={0}>
            {rows.length === 0 &&
              (hidden ? (
                <div className="a-empty">
                  <span>현재 필터와 일치하는 항목이 없습니다.</span>
                  <button type="button" className="a-btn" onClick={onShowAll}>
                    모두 표시하고 필터 지우기
                  </button>
                </div>
              ) : (
                <p className="a-empty">{port !== null ? `일치하는 연결이 없습니다. 포트 ${port}을(를) 사용하는 프로그램이 없습니다` : "일치하는 연결이 없습니다"}</p>
              ))}
            {rows.map((c) => {
              const gone = !living.has(c.pid);
              return (
                <div
                  key={c.index}
                  role="row"
                  aria-selected={selected === c.index}
                  className={"a-tr" + (selected === c.index ? " is-selected" : "")}
                  title="두 번 클릭하면 해당 프로세스로 이동합니다"
                  onClick={() => setSelected(selected === c.index ? null : c.index)}
                  onDoubleClick={() => !gone && onOpen(c.pid)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setSelected(c.index);
                    onMenu(event, [
                      { label: "프로세스로 이동", icon: "goTo", disabled: gone, run: () => onOpen(c.pid) },
                      { label: `${c.proc?.name ?? "PID " + c.pid} 끝내기`, icon: "end", danger: true, disabled: gone || c.pid <= 4 },
                      { label: "이 연결 닫기", icon: "dismiss", disabled: c.protocol !== "TCP" || c.state !== "established" || c.local.includes(":") },
                      "-",
                      { label: "로컬 주소 복사", icon: "copy", run: () => void navigator.clipboard?.writeText(endpoint(c.local, c.localPort)).catch(() => {}) },
                      { label: "원격 주소 복사", disabled: !c.remote, run: () => void navigator.clipboard?.writeText(endpoint(c.remote ?? "", c.remotePort)).catch(() => {}) },
                      "-",
                      { label: "맨 위에 고정", icon: "pin" },
                      { label: "메모 추가", icon: "note" },
                    ]);
                  }}
                >
                  <span role="gridcell" className="a-td" title={c.proc?.path}>
                    <ProcessIcon glyph={c.proc?.glyph ?? "app"} />
                    <span className="a-cell-text">{c.proc?.exe ?? "PID " + c.pid}</span>
                    {gone && <span className="a-tag">종료됨</span>}
                  </span>
                  <span role="gridcell" className="a-td is-end is-faint a-c-pid">
                    {c.pid}
                  </span>
                  <span role="gridcell" className="a-td">
                    {c.protocol}
                    {c.local.includes(":") && <span className="a-tag">v6</span>}
                  </span>
                  <span role="gridcell" className="a-td a-mono a-c-local">
                    <span className="a-cell-text">{c.local}</span>
                  </span>
                  <span role="gridcell" className={"a-td is-end a-mono" + (port === c.localPort ? " a-hit" : "")}>
                    {c.localPort}
                  </span>
                  <span role="gridcell" className="a-td is-faint a-mono a-c-remote">
                    <span className="a-cell-text">{c.remote ?? ""}</span>
                  </span>
                  <span role="gridcell" className={"a-td is-end a-mono a-c-rport" + (port === c.remotePort ? " a-hit" : " is-faint")}>
                    {c.remotePort ?? ""}
                  </span>
                  <span role="gridcell" className="a-td">
                    <i className={"a-dot" + (c.state === "established" ? " is-ok" : c.state === "listen" ? " is-listen" : "")} />
                    {c.state ? stateLabel[c.state] : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <footer className="a-list-foot">
          <span>
            듣기 {listen} · 연결됨 {established} · UDP {udp}
          </span>
          <span>2초마다 업데이트됩니다. 행을 두 번 클릭하면 해당 프로세스로 이동합니다.</span>
        </footer>
      </div>
    </div>
  );
}

// History: one recorded series per resource over the chosen range, every
// strip on a shared time axis; a click picks a moment for the table below.
export type { HistoryRange };
const POINTS = 240;
// The demo's clock: Tuesday 3 November, 21:36.
const NOW_MINUTE = 21 * 60 + 36;
function moment(range: HistoryRange, index: number) {
  const r = historyRanges.find((x) => x.value === range)!;
  const minutesAgo = ((POINTS - 1 - index) / (POINTS - 1)) * r.hours * 60;
  const total = NOW_MINUTE - minutesAgo;
  const day = Math.floor(total / 1440);
  const inDay = ((total % 1440) + 1440) % 1440;
  const seconds = Math.round((inDay % 1) * 60);
  const pad = (v: number) => String(Math.floor(v)).padStart(2, "0");
  return { day: 3 + day, text: `11월 ${3 + day}일 ${pad(inDay / 60)}:${pad(inDay % 60)}:${pad(seconds)}` };
}
function historySeries(range: HistoryRange) {
  const r = historyRanges.find((x) => x.value === range)!;
  const seed = r.hours;
  const wave = (i: number, k: number) => {
    const minutes = NOW_MINUTE - ((POINTS - 1 - i) / (POINTS - 1)) * r.hours * 60;
    const hour = (((minutes / 60) % 24) + 24) % 24;
    const busy = hour >= 9 && hour <= 23 ? 1 : 0.25;
    return busy * (0.55 + 0.45 * Math.sin(i / 9 + k)) + noise(i * 7 + k, seed) * 0.35;
  };
  const spike = (i: number, k: number) => (noise(i + k * 31, seed + 5) > 0.93 ? 1 + noise(i, k) * 2 : 0);
  const cpu = Array.from({ length: POINTS }, (_, i) => Math.min(96, 6 + wave(i, 1) * 18 + spike(i, 1) * 20));
  return {
    cpu,
    cpuPeak: cpu.map((v, i) => Math.min(100, v * (1.35 + noise(i, 4) * 0.5))),
    mem: Array.from({ length: POINTS }, (_, i) => 36 + wave(i, 2) * 6 + Math.sin(i / 40) * 2),
    disk: Array.from({ length: POINTS }, (_, i) => (0.3 + wave(i, 3) * 1.4 + spike(i, 3) * 4) * 1024 * 1024),
    net: Array.from({ length: POINTS }, (_, i) => (0.2 + wave(i, 5) * 0.9 + spike(i, 5) * 2.4) * 1024 * 1024),
    gpu: Array.from({ length: POINTS }, (_, i) => Math.min(100, 3 + wave(i, 6) * 12 + spike(i, 6) * 18)),
    bat: Array.from({ length: POINTS }, (_, i) => Math.max(20, 96 - (i / POINTS) * (r.hours > 6 ? 40 : 18))),
  };
}
function linePath(values: number[], max: number) {
  const n = values.length;
  const x = (i: number) => ((i / (n - 1)) * 1000).toFixed(1);
  const y = (v: number) => (100 - (Math.max(0, Math.min(max, v)) / max) * 96).toFixed(2);
  return values.map((v, i) => `${i ? "L" : "M"}${x(i)} ${y(v)}`).join("");
}
export function History({
  range,
  cursor,
  onCursor,
  onOpen,
}: {
  range: HistoryRange;
  cursor: number | null;
  onCursor: (index: number | null) => void;
  onOpen: (pid: number) => void;
}) {
  const data = useMemo(() => historySeries(range), [range]);
  // The strips are static per range: their paths are drawn once, not on every sample or pointer move.
  const cache = useMemo(() => new Map<number[], string>(), [data]);
  const path = (values: number[], max: number) => {
    let d = cache.get(values);
    if (d === undefined) cache.set(values, (d = linePath(values, max)));
    return d;
  };
  const [hover, setHover] = useState<number | null>(null);
  const r = historyRanges.find((x) => x.value === range)!;
  const at = cursor ?? POINTS - 1;
  const diskTop = Math.max(...data.disk) > 8 * 1024 ** 2 ? 10 * 1024 ** 2 : 9 * 1024 ** 2;
  const netTop = Math.max(...data.net) > 3 * 1024 ** 2 ? 5 * 1024 ** 2 : 3 * 1024 ** 2;
  const metrics: {
    key: string;
    name: string;
    color: string;
    value: string;
    sub?: string;
    lines: { values: number[]; faint?: boolean }[];
    max: number;
    scale?: string;
  }[] = [
    {
      key: "cpu",
      name: "CPU",
      color: "var(--a-cpu)",
      value: `${data.cpu[at].toFixed(1)}%`,
      sub: `최대 ${data.cpuPeak[at].toFixed(1)}%`,
      lines: [{ values: data.cpuPeak, faint: true }, { values: data.cpu }],
      max: 100,
    },
    {
      key: "mem",
      name: "메모리",
      color: "var(--a-mem)",
      value: `${((data.mem[at] / 100) * 32).toFixed(1)} GB`,
      sub: "/ 32.0GB",
      lines: [{ values: data.mem }],
      max: 100,
    },
    { key: "disk", name: "디스크", color: "var(--a-io)", value: rate(data.disk[at]), lines: [{ values: data.disk }], max: diskTop, scale: rateLabel(diskTop) },
    { key: "net", name: "네트워크", color: "var(--a-net)", value: rate(data.net[at]), lines: [{ values: data.net }], max: netTop, scale: rateLabel(netTop) },
    { key: "gpu", name: "GPU", color: "var(--a-gpu)", value: `${Math.round(data.gpu[at])}%`, lines: [{ values: data.gpu }], max: 100 },
    { key: "bat", name: "배터리", color: "var(--a-bat)", value: `${Math.round(data.bat[at])}%`, sub: "방전 7.8W", lines: [{ values: data.bat }], max: 100 },
  ];
  // Tick marks on whole steps of the range's interval, as the app places them.
  const minutesSpan = r.hours * 60;
  const start = NOW_MINUTE - minutesSpan;
  const first = Math.ceil(start / r.tick) * r.tick;
  const ticks: { left: number; text: string }[] = [];
  for (let m = first; m <= NOW_MINUTE; m += r.tick) {
    const inDay = ((m % 1440) + 1440) % 1440;
    const left = ((m - start) / minutesSpan) * 100;
    if (left < 3 || left > 97) continue;
    ticks.push({
      left,
      text:
        r.tick >= 1440
          ? `11월 ${3 + Math.floor(m / 1440)}일`
          : `${String(Math.floor(inDay / 60)).padStart(2, "0")}:${String(inDay % 60).padStart(2, "0")}`,
    });
  }
  const tickWidth = (r.tick / minutesSpan) * 100;
  const tickOffset = ((first - start) / minutesSpan) * 100;
  const pick = (event: MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(POINTS - 1, Math.round(((event.clientX - box.left) / box.width) * (POINTS - 1))));
  };
  const busiest = useMemo(() => {
    const pool = processes.filter((p) => (p.cpu ?? 0) > 0.2 || p.mem > 200 * 1024 ** 2);
    return pool
      .map((p) => ({
        p,
        cpu: (p.cpu ?? 0) * (0.2 + noise(p.pid + at, range.length) * 0.9) * (data.cpu[at] / 20),
        mem: p.mem * (0.9 + noise(p.pid, at) * 0.2),
        io: (p.disk ?? 0) * noise(p.pid + 3, at) * 512 * 1024,
        net: (p.net ?? 0) * noise(p.pid + 5, at) * 256 * 1024,
        gpu: (p.gpu ?? 0) * noise(p.pid + 7, at) * 1.4,
      }))
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 12);
  }, [at, range, data]);
  return (
    <div className="a-page a-history">
      <div className="a-history-card">
        <div className="a-history-rows">
          {metrics.map((m) => (
            <div className="a-history-row" key={m.key} style={{ "--c": m.color } as CSSProperties}>
              <div className="a-history-label">
                <span>{m.name}</span>
                <b>{m.value}</b>
                {m.sub && <small>{m.sub}</small>}
              </div>
              <div
                className="a-history-plot"
                role="slider"
                tabIndex={m.key === "cpu" ? 0 : -1}
                aria-label={`${m.name}, 시점 선택`}
                aria-valuemin={0}
                aria-valuemax={POINTS - 1}
                aria-valuenow={at}
                aria-valuetext={moment(range, at).text}
                onPointerMove={(event) => setHover(pick(event))}
                onPointerLeave={() => setHover(null)}
                onClick={(event) => onCursor(pick(event))}
                onKeyDown={(event) => {
                  const step = event.shiftKey ? 12 : 1;
                  if (event.key === "ArrowLeft") onCursor(Math.max(0, at - step));
                  else if (event.key === "ArrowRight") onCursor(Math.min(POINTS - 1, at + step));
                  else if (event.key === "Home") onCursor(0);
                  else if (event.key === "End") onCursor(POINTS - 1);
                  else if (event.key === "Escape") onCursor(null);
                  else return;
                  event.preventDefault();
                }}
              >
                <div
                  className="a-history-ticks"
                  style={{ "--tick-w": `${tickWidth}%`, "--tick-x": `${tickOffset}%` } as CSSProperties}
                />
                <svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
                  {m.lines.map((line, i) => {
                    const d = path(line.values, m.max);
                    return (
                      <g key={i}>
                        {!line.faint && <path d={d + "L1000 100L0 100Z"} fill={m.color} fillOpacity="0.16" />}
                        <path
                          d={d}
                          fill="none"
                          stroke={m.color}
                          strokeOpacity={line.faint ? 0.45 : 1}
                          strokeWidth="1.5"
                          vectorEffect="non-scaling-stroke"
                          strokeLinejoin="round"
                        />
                      </g>
                    );
                  })}
                </svg>
                {m.scale && <span className="a-history-scale">{m.scale}</span>}
                {cursor !== null && <i className="a-history-cursor" style={{ left: `${(cursor / (POINTS - 1)) * 100}%` }} />}
                {hover !== null && hover !== cursor && (
                  <i className="a-history-cursor" style={{ left: `${(hover / (POINTS - 1)) * 100}%`, opacity: 0.25 }} />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="a-history-axis" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t.text + t.left} style={{ left: `${t.left}%` }}>
              {t.text}
            </span>
          ))}
        </div>
      </div>
      <div className="a-busy-card">
        <div className="a-busy-head">
          <b>{cursor === null ? "가장 사용량이 많은 프로세스" : `${moment(range, cursor).text}에 가장 사용량이 많은 프로세스`}</b>
          <span>{cursor === null ? "차트의 아무 시점이나 클릭하면 해당 시점의 프로세스를 볼 수 있습니다" : "차트에서 ← → 키로 시간을 이동하고 Esc 키로 최신 시점으로 돌아갑니다"}</span>
        </div>
        <div className="a-table a-busy" role="grid" aria-label="기록된 프로세스">
          <div className="a-thead" role="row">
            {[
              ["이름", ""],
              ["PID", "is-end a-c-pid"],
              ["CPU", "is-end"],
              ["메모리", "is-end"],
              ["I/O", "is-end a-c-io"],
              ["네트워크", "is-end"],
              ["GPU", "is-end a-c-gpu"],
            ].map(([label, cls]) => (
              <span key={label} role="columnheader" className={"a-th " + cls} aria-sort={label === "CPU" ? "descending" : undefined}>
                <span className="a-th-label">
                  <span>{label}</span>
                  {label === "CPU" && <Icon name="chevronDown" size={12} />}
                </span>
              </span>
            ))}
          </div>
          <div className="a-tbody a-scroll" role="rowgroup">
            {busiest.map(({ p, cpu, mem, io, net, gpu }) => (
              <div key={p.pid} role="row" className="a-tr" onDoubleClick={() => onOpen(p.pid)} title="두 번 클릭하면 해당 프로세스로 이동합니다">
                <span role="gridcell" className="a-td">
                  <ProcessIcon glyph={p.glyph} />
                  <span className="a-cell-text">{p.exe}</span>
                </span>
                <span role="gridcell" className="a-td is-end is-faint a-c-pid">
                  {p.pid}
                </span>
                <span role="gridcell" className="a-td is-end">
                  {percent(cpu)}
                </span>
                <span role="gridcell" className="a-td is-end">
                  {bytes(mem)}
                </span>
                <span role="gridcell" className={"a-td is-end a-c-io" + (io < 1 ? " is-faint" : "")}>
                  {rate(io)}
                </span>
                <span role="gridcell" className={"a-td is-end" + (net < 1 ? " is-faint" : "")}>
                  {rate(net)}
                </span>
                <span role="gridcell" className={"a-td is-end a-c-gpu" + (gpu < 0.05 ? " is-faint" : "")}>
                  {percent(gpu)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="a-busy-note">
          CPU, 메모리, I/O, GPU, 네트워크 사용량 상위 프로세스를 5초마다(최소화 또는 알림 영역 새로 고침 빈도가 더 느리면 그 주기로) 기록하고 7일 동안 보관합니다.
        </p>
      </div>
    </div>
  );
}

export function VisibilityDialog({
  rules,
  onSave,
  onClose,
}: {
  rules: VisibilityRules;
  onSave: (rules: VisibilityRules) => void;
  onClose: () => void;
}) {
  const [keep, setKeep] = useState(rules.keep.join(", "));
  const [hide, setHide] = useState(rules.hide.join(", "));
  const [invalid, setInvalid] = useState(false);
  const save = () => {
    const kept = programNames(keep),
      hidden = programNames(hide);
    if (!kept || !hidden) setInvalid(true);
    else onSave({ keep: kept, hide: hidden });
  };
  const field = (label: string, hint: string, value: string, put: (value: string) => void, placeholder?: string) => (
    <div className="a-rule">
      <span>{label}</span>
      <label className="a-field">
        <input
          value={value}
          onChange={(event) => put(event.target.value)}
          placeholder={placeholder}
          aria-label={label}
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <small>{hint}</small>
    </div>
  );
  return (
    <form
      className="a-dialog is-visibility"
      role="dialog"
      aria-modal="true"
      aria-labelledby="a-dialog-title"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="a-dialog-body a-scroll">
        <h3 id="a-dialog-title">숨기기 규칙 편집</h3>
        <p className="a-dialog-text">시스템 프로세스는 Windows 구성 요소 정보로 식별합니다. 두 페이지가 이 규칙을 공유하며 숨기기 스위치는 각각 저장합니다.</p>
        {field("항상 표시", "시스템 프로세스를 포함해 이 프로그램을 계속 표시합니다. 이 목록은 추가 숨기기보다 우선합니다.", keep, setKeep)}
        {field("추가로 숨기기", "숨기기를 사용할 때 이 프로그램을 숨깁니다. 비워 두면 시스템 프로세스만 숨깁니다.", hide, setHide, "추가로 숨기기")}
        <p className="a-rule-note">실행 파일 이름을 쉼표나 세미콜론으로 구분해 입력하며, 목록마다 최대 128개까지 지정할 수 있습니다. 이름은 대/소문자를 구분하지 않습니다.</p>
        {invalid && (
          <p className="a-rule-error" role="alert">
            경로나 와일드카드가 없는 올바른 실행 파일 이름을 입력하십시오. 목록마다 최대 128개까지 지정할 수 있습니다.
          </p>
        )}
      </div>
      <div className="a-dialog-foot">
        <button type="submit" className="a-btn is-accent" data-primary>
          저장
        </button>
        <button
          type="button"
          className="a-btn"
          onClick={() => {
            setKeep(defaultVisibility.keep.join(", "));
            setHide("");
            setInvalid(false);
          }}
        >
          기본 규칙 복원
        </button>
        <button type="button" className="a-btn" onClick={onClose}>
          취소
        </button>
      </div>
    </form>
  );
}

export type ThemeChoice = "site" | "light" | "dark";
export type VitalsMode = "auto" | "show" | "hide";
/** Grouping the process list by user: automatic (several users signed in), always or never. */
export type UserGrouping = "auto" | "on" | "off";
// The accelerating proxies the updater knows (goodgood-app config.rs, PROXY_PRESETS).
const proxies = ["gh-proxy.com", "gh-proxy.org", "ghfast.top"];
const sections: [string, string, UiIcon][] = [
  ["language", "언어 및 모양", "globe"],
  ["startup", "시작 프로그램 및 알림 영역", "power"],
  ["hotkey", "키보드 바로 가기", "keyboard"],
  ["privilege", "권한", "shield"],
  ["motion", "애니메이션", "sparkle"],
  ["data", "데이터 및 기록", "history"],
  ["rules", "규칙", "bolt"],
  ["update", "업데이트", "update"],
];
function Setting({
  icon,
  title,
  desc,
  note,
  children,
}: {
  icon: UiIcon;
  title: string;
  desc?: ReactNode;
  /** A second line under the description. */
  note?: string;
  children?: ReactNode;
}) {
  return (
    <div className="a-setting">
      <Icon name={icon} />
      <div className="a-setting-text">
        <div>{title}</div>
        {desc && <span>{desc}</span>}
        {note && <span>{note}</span>}
      </div>
      {children && <div className="a-setting-controls">{children}</div>}
    </div>
  );
}
// A number box as the app's (appearance.rs): typed values round into range on
// Enter or leaving the box, the arrow keys step by one.
function NumberBox({
  label,
  value,
  range: [low, high],
  onChange,
}: {
  label: string;
  value: number;
  range: [number, number];
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const commit = (raw: string) => {
    const parsed = Number(raw.trim());
    onChange(raw.trim() && Number.isFinite(parsed) ? Math.max(low, Math.min(high, Math.round(parsed))) : value);
    setText(null);
  };
  return (
    <input
      className="a-number"
      aria-label={label}
      inputMode="numeric"
      value={text ?? String(value)}
      onChange={(event) => setText(event.target.value)}
      onBlur={(event) => commit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit(event.currentTarget.value);
        else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          setText(null);
          // Held keys repeat faster than a render: step from what the box shows.
          const shown = Number(event.currentTarget.value);
          const from = Number.isFinite(shown) ? Math.round(shown) : value;
          onChange(Math.max(low, Math.min(high, from + (event.key === "ArrowUp" ? 1 : -1))));
        } else if (event.key === "Escape") setText(null);
      }}
    />
  );
}

export function Settings({
  theme,
  onTheme,
  motion,
  onMotion,
  navLeft,
  onNav,
  interval,
  onInterval,
  scale,
  onScale,
  fontSize,
  onFontSize,
  vitals,
  onVitals,
  userGroups,
  onUserGroups,
  uiMotion,
  onUiMotion,
  onVisibility,
  onSay,
}: {
  theme: ThemeChoice;
  onTheme: (t: ThemeChoice) => void;
  motion: Motion;
  onMotion: (m: Motion) => void;
  navLeft: boolean;
  onNav: (left: boolean) => void;
  interval: number;
  onInterval: (ms: number) => void;
  scale: number;
  onScale: (scale: number) => void;
  fontSize: number;
  onFontSize: (size: number) => void;
  vitals: VitalsMode;
  onVitals: (mode: VitalsMode) => void;
  userGroups: UserGrouping;
  onUserGroups: (mode: UserGrouping) => void;
  uiMotion: boolean;
  onUiMotion: (on: boolean) => void;
  onVisibility: () => void;
  onSay: (text: string) => void;
}) {
  const [values, setValues] = useState({
    autostart: false,
    tray: true,
    hotkey: true,
    windowMotion: true,
    hardwareAcceleration: true,
    history: true,
    autoUpdate: true,
    whatsNew: true,
    star: true,
    bits: false,
    startPage: "processes",
    trayPage: "current",
    minimized: 5000,
    background: 5000,
    release: 10,
    channel: "stable",
    route: "auto",
    proxy: proxies[0],
  });
  const [customProxy, setCustomProxy] = useState("");
  const [languageChoice, setLanguageChoice] = useState<Language | "system">(language);
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  const body = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const picked = useRef(false);
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const follow = () => {
      if (picked.current) return;
      const top = el.getBoundingClientRect().top + 40 * scaleOf(el);
      const heads = [...el.querySelectorAll<HTMLElement>("section")];
      let index = 0;
      heads.forEach((h, i) => {
        if (h.getBoundingClientRect().top <= top) index = i;
      });
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) index = heads.length - 1;
      setCurrent(index);
    };
    el.addEventListener("scroll", follow, { passive: true });
    const release = () => (picked.current = false);
    el.addEventListener("wheel", release, { passive: true });
    el.addEventListener("pointerdown", release);
    return () => {
      el.removeEventListener("scroll", follow);
      el.removeEventListener("wheel", release);
      el.removeEventListener("pointerdown", release);
    };
  }, []);
  const jump = (index: number) => {
    picked.current = true;
    setCurrent(index);
    const target = body.current?.querySelectorAll("section")[index] as HTMLElement | undefined;
    if (target && body.current)
      body.current.scrollTo({
        top: target.offsetTop - 4,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
  };
  const intervals = [500, 1000, 2000, 5000].map((ms) => ({ value: ms, label: `${ms / 1000}초마다` }));
  const slow = [1000, 2000, 5000, 10000, 30000].map((ms) => ({ value: ms, label: `${ms / 1000}초마다` }));
  return (
    <div className="a-page a-settings a-scroll" ref={body}>
      <div className="a-settings-inner">
      <nav className="a-settings-rail" aria-label="설정 섹션" role="tablist">
        <span className="a-settings-mark" style={{ transform: `translateY(${current * 38}px)` }} aria-hidden="true" />
        {sections.map(([id, name, icon], i) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={i === current}
            aria-current={i === current ? "true" : undefined}
            onClick={() => jump(i)}
          >
            <Icon name={icon} />
            {name}
          </button>
        ))}
      </nav>
      <div className="a-settings-body">
        <section>
          <h2>언어 및 모양</h2>
          <Setting icon="globe" title="표시 언어" desc="알림 영역 메뉴와 메시지를 포함해 즉시 적용됩니다. “Windows와 동일”은 Windows 표시 언어를 따릅니다.">
            <Select
              label="표시 언어"
              value={languageChoice}
              onChange={(value) => {
                if (value !== "system" && !isLanguage(value)) return;
                setLanguageChoice(value);
                const next = value === "system" ? preferredLanguage(navigator.languages) : value;
                // The site keeps the choice, as it does one made in its header.
                rememberLanguage(next);
                if (next !== language()) location.assign(localized(next) + "#demo");
              }}
              options={[{ value: "system", label: "Windows와 동일" }, ...languages.map(item => ({ value: item.id, label: item.name }))]}
            />
          </Setting>
          <Setting icon="theme" title="테마" desc="“Windows와 동일”은 Windows 앱 모드를 따르며 Windows가 전환할 때 밝게/어둡게도 함께 바뀝니다.">
            <Segments
              label="테마"
              value={theme}
              onChange={onTheme}
              items={[
                { value: "site", label: "Windows와 동일" },
                { value: "light", label: "밝게" },
                { value: "dark", label: "어둡게" },
              ]}
            />
          </Setting>
          <Setting
            icon={navLeft ? "navSide" : "navTop"}
            title="탐색 위치"
            desc="측면 창은 기본적으로 아이콘만 표시하며, 왼쪽 위의 ☰ 버튼을 누르면 펼쳐져 페이지 이름이 표시됩니다. 위쪽 탐색은 도구 모음 아래에 페이지를 탭으로 표시합니다."
          >
            <Segments
              label="탐색 위치"
              value={navLeft ? "side" : "top"}
              onChange={(v) => onNav(v === "side")}
              items={[
                { value: "side", label: "측면", icon: "navSide" },
                { value: "top", label: "위쪽", icon: "navTop" },
              ]}
            />
          </Setting>
          <Setting icon="interfaceScale" title="인터페이스 배율" desc="텍스트, 아이콘, 컨트롤의 크기를 80%에서 150%까지 조정합니다(기본값: 100%). 변경 사항은 즉시 적용되고 자동으로 저장됩니다.">
            <NumberBox label="인터페이스 배율" value={scale} range={[80, 150]} onChange={onScale} />
            <span className="a-unit">%</span>
            <Button onClick={() => onScale(100)}>기본값 복원</Button>
          </Setting>
          <Setting icon="fontSize" title="글꼴 크기" desc="기본 글꼴 크기: 11–20 px(기본값: 13 px). 제목과 보조 텍스트는 비례해 조정됩니다. 인터페이스 배율과 함께 적용됩니다.">
            <NumberBox label="글꼴 크기" value={fontSize} range={[11, 20]} onChange={onFontSize} />
            <span className="a-unit">px</span>
            <Button onClick={() => onFontSize(13)}>기본값 복원</Button>
          </Setting>
          <Setting icon="gauge" title="프로세스 개요 영역" desc="자동 모드는 개요 영역과 프로세스 행 10개의 공간을 확보하며, 공간이 부족하면 개요 영역을 접습니다. 그룹을 접거나 필터링해도 이 결정에는 영향을 주지 않습니다.">
            <Select
              label="프로세스 개요 영역"
              context="vitals"
              value={vitals}
              onChange={onVitals}
              options={[
                { value: "auto", label: "자동" },
                { value: "show", label: "항상 표시" },
                { value: "hide", label: "숨기기" },
              ]}
            />
          </Setting>
          <Setting icon="eyeOff" title="시스템 프로세스 숨기기 규칙" desc="항상 표시하거나 함께 숨길 프로그램을 지정합니다. 프로세스와 연결이 이 규칙을 공유하며, 숨기기를 사용하려면 도구 모음 아이콘을 사용합니다.">
            <Button onClick={onVisibility}>숨기기 규칙 편집</Button>
          </Setting>
          <Setting
            icon="users"
            title="사용자별로 프로세스 그룹화"
            desc="프로세스 목록을 로그인한 사용자별로 그룹화합니다. 보기, 범주, 정렬, 검색은 각 그룹 안에서 동일하게 동작합니다. 자동 모드는 둘 이상의 사용자가 로그인한 동안에만 그룹화하며, 연결이 끊긴 세션도 포함합니다. 시스템 서비스를 실행하는 세션처럼 사용자가 없는 세션은 시스템 아래에 표시됩니다."
          >
            <Select
              label="사용자별로 프로세스 그룹화"
              context="userGroups"
              value={userGroups}
              onChange={onUserGroups}
              options={[
                { value: "auto", label: "자동" },
                { value: "on", label: "항상 그룹화" },
                { value: "off", label: "그룹화 안 함" },
              ]}
            />
          </Setting>
        </section>
        <section>
          <h2>시작 프로그램 및 알림 영역</h2>
          <Setting icon="power" title="Windows에 로그인할 때 시작" desc="알림 영역에서 조용히 시작합니다. 키보드 바로 가기를 누르거나 알림 영역 아이콘을 클릭해 창을 엽니다.">
            <Switch state label="Windows에 로그인할 때 시작" checked={values.autostart} onChange={(v) => set("autostart", v)} />
          </Setting>
          <Setting icon="processes" title="기본 페이지" desc="GoodGood이 시작된 뒤 창을 처음 열 때 표시되는 페이지입니다.">
            <Select
              label="기본 페이지"
              value={values.startPage}
              onChange={(v) => set("startPage", v)}
              options={[
                { value: "processes", label: "프로세스" },
                { value: "performance", label: "성능" },
                { value: "services", label: "서비스" },
                { value: "startup", label: "시작" },
                { value: "connections", label: "연결" },
                { value: "history", label: "기록" },
              ]}
            />
          </Setting>
          <Setting icon="tray" title="알림 영역에서 다시 열기" desc="알림 영역이나 바로 가기로 다시 열 때 적용됩니다. 최소화된 창을 복원하면 현재 페이지가 유지됩니다.">
            <Select
              label="알림 영역에서 다시 열기"
              value={values.trayPage}
              onChange={(v) => set("trayPage", v)}
              options={[
                { value: "current", label: "현재 페이지 유지" },
                { value: "default", label: "기본 페이지 열기" },
              ]}
            />
          </Setting>
          <Setting
            icon="tray"
            title="닫을 때 알림 영역에 유지"
            desc="GoodGood을 계속 실행해 다시 빨리 열 수 있게 합니다. 숨겨진 동안에는 알림 영역 새로 고침 빈도로 수집하며 기록과 규칙은 계속 동작합니다."
          >
            <Switch state label="닫을 때 알림 영역에 유지" checked={values.tray} onChange={(v) => set("tray", v)} />
          </Setting>
        </section>
        <section>
          <h2>키보드 바로 가기</h2>
          <Setting
            icon="keyboard"
            title="GoodGood 표시 또는 숨기기"
            desc="대부분의 프로그램에서 동작합니다. 조합은 보통 Ctrl, Alt 또는 Win과 일반 키 하나로 이루어지며, 보조키는 어느 쪽이든 됩니다."
          >
            <span className="a-keys">
              <kbd>Ctrl</kbd>
              <kbd>Alt</kbd>
              <kbd>Esc</kbd>
            </span>
            <Button>변경</Button>
            <Switch state label="GoodGood 표시 또는 숨기기" checked={values.hotkey} onChange={(v) => set("hotkey", v)} />
          </Setting>
          <Setting icon="keyboard" title="키보드 바로 가기" desc="탐색, 업데이트 일시 중지, 프로세스 작업 등의 바로 가기를 확인합니다.">
            <Button onClick={() => onSay("Ctrl+1–8로 페이지를 전환하고, Ctrl+F로 프로세스를 검색하며, Delete로 선택한 프로세스를 끝내고, Ctrl을 누르고 있으면 새로 고침을 일시 중지합니다.")}>
              바로 가기 보기
            </Button>
          </Setting>
        </section>
        <section>
          <h2>권한</h2>
          <Setting icon="shield" title="관리자 권한으로 실행" desc="한 번 권한을 부여하면 로그인, 바로 가기, 작업 관리자 진입점에서 GoodGood을 관리자 권한으로 실행합니다.">
            <span className="a-pill is-ok">권한 부여됨</span>
          </Setting>
          <Setting
            icon="shield"
            title="권한 있는 서비스"
            desc="표준 사용자로 실행 중인 GoodGood이 시스템 프로세스를 관리하고, 규칙을 자동으로 적용하고, 프로세스별 네트워크 트래픽과 디스크 읽기/쓰기를 수집하고, 파일 잠금을 찾고, 디스크 SMART 정보를 읽고, 서비스를 제어하고, IPv4 TCP 연결을 닫을 수 있게 합니다. 설치와 제거에는 모두 관리자 권한이 필요합니다."
          >
            <span className="a-pill is-ok">{`연결됨 · ${appVersion}`}</span>
          </Setting>
          <Setting
            icon="bolt"
            title="커널 센서"
            desc="이 옵션을 켜면 PawnIO를 확인하고, 없거나 오래된 경우 공식 드라이버를 설치하며, 필요할 때 시작합니다. 관리자 권한이 필요합니다. 먼저 GoodGood 권한 있는 서비스를 설치하고 시작하십시오. 이 옵션을 끄면 GoodGood의 센서 수집만 중지됩니다."
          >
            <Button icon="external">PawnIO 웹사이트</Button>
            <Switch state label="커널 센서" checked onChange={() => onSay("데모 창에서는 커널 센서 수집을 중지하지 않습니다.")} />
          </Setting>
          <Setting
            icon="keyboard"
            title="작업 관리자 대체"
            desc="Ctrl+Shift+Esc 및 다른 작업 관리자 바로 가기가 GoodGood을 열게 합니다. 기본값은 꺼짐이며, 별도 복구 도구는 인터페이스나 서비스에 의존하지 않습니다. 권한 있는 서비스를 업데이트하면 대체 항목도 함께 업데이트되어 사용 상태가 유지되며, 서비스를 제거하면 Windows 작업 관리자가 복원됩니다."
          >
            <span className="a-pill">Windows 작업 관리자 사용 중</span>
            <Button
              icon="external"
              title="Windows 작업 관리자를 한 번 열고 현재 대체 설정은 유지합니다."
              onClick={() => onSay("데모 창에서는 Windows 작업 관리자를 열지 않습니다.")}
            >
              Windows 작업 관리자 한 번 열기
            </Button>
          </Setting>
        </section>
        <section>
          <h2>애니메이션</h2>
          <Setting icon="genericApp" title="창 전환 효과" desc="창을 표시, 숨기기, 최소화 또는 복원할 때 페이드 효과를 적용합니다. Windows나 다른 창 관리자가 전환을 처리하게 하려면 끄십시오. 기본값은 Windows의 애니메이션 효과 설정을 따릅니다.">
            <Switch state label="창 전환 효과" checked={values.windowMotion} onChange={(v) => set("windowMotion", v)} />
          </Setting>
          <Setting icon="sparkle" title="인터페이스 애니메이션" desc="페이지와 대화 상자 전환, 선택 표시의 이동, 아이콘 애니메이션입니다. 기본값은 Windows의 애니메이션 효과 설정을 따릅니다.">
            <Switch state label="인터페이스 애니메이션" checked={uiMotion} onChange={onUiMotion} />
          </Setting>
          <Setting
            icon="pulse"
            title="차트 애니메이션"
            desc="프레임 속도가 높을수록 차트가 부드러워지지만 리소스를 더 사용합니다. 부드럽게는 코어 하나의 약 10–15%, 균형은 그 절반 정도를 사용합니다. 절전은 한 번에 1픽셀씩 움직이므로 작은 차트는 계단처럼 움직입니다."
          >
            <Select
              label="차트 애니메이션"
              value={motion}
              onChange={onMotion}
              options={[
                { value: "smooth", label: "부드럽게(새로 고침 빈도에 맞춤)" },
                { value: "step", label: "끔(샘플당 1단계)" },
              ]}
            />
          </Setting>
          <Setting
            icon="gpu"
            title="하드웨어 가속"
            desc="기본적으로 GPU로 인터페이스를 그립니다. 끄면 CPU가 그리며 GoodGood은 GPU를 더 이상 사용하지 않습니다. GPU가 최대로 사용되는 동안 인터페이스가 끊기거나 GoodGood을 GPU에서 분리하려면 이 옵션을 사용하십시오. CPU 사용량이 늘어나므로 차트 애니메이션 설정을 낮추면 도움이 됩니다. 다시 시작하지 않고 즉시 적용됩니다."
          >
            <Switch
              state
              label="하드웨어 가속"
              checked={values.hardwareAcceleration}
              onChange={(v) => set("hardwareAcceleration", v)}
            />
          </Setting>
        </section>
        <section>
          <h2>데이터 및 기록</h2>
          <Setting icon="timer" title="새로 고침 빈도" desc="간격이 짧을수록 차트가 정교해지지만 GoodGood 자체가 리소스를 더 사용합니다.">
            <Select label="새로 고침 빈도" value={interval} onChange={onInterval} options={intervals} />
          </Setting>
          <Setting
            icon="minimize"
            title="최소화 상태의 새로 고침 빈도"
            desc="창이 최소화된 동안 GoodGood이 수집하는 주기입니다. 간격이 길수록 백그라운드 비용이 줄지만, 새로 시작된 프로그램에 규칙이 적용되기까지 최대 한 주기가 걸릴 수 있고 5초를 넘으면 기록이 더 드물게 저장됩니다."
          >
            <Select label="최소화 상태의 새로 고침 빈도" value={values.minimized} onChange={(v) => set("minimized", v)} options={slow} />
          </Setting>
          <Setting
            icon="tray"
            title="알림 영역에서의 새로 고침 빈도"
            desc="알림 영역에 숨겨진 동안 GoodGood이 수집하는 주기이며, 알림 영역 아이콘과 도구 설명도 같은 주기로 갱신됩니다. 간격이 길수록 백그라운드 비용이 줄지만, 새로 시작된 프로그램에 규칙이 적용되기까지 최대 한 주기가 걸릴 수 있고 5초를 넘으면 기록이 더 드물게 저장됩니다."
          >
            <Select label="알림 영역에서의 새로 고침 빈도" value={values.background} onChange={(v) => set("background", v)} options={slow} />
          </Setting>
          <Setting icon="memory" title="숨겨진 동안 메모리 확보" desc="창을 최소화하거나 알림 영역에 둔 상태가 이 시간만큼 지나면 GoodGood이 차트 이미지를 해제하고 사용하지 않는 메모리를 Windows에 반환합니다. 수집과 기록은 계속됩니다. 창을 다시 열면 차트를 먼저 다시 그리므로 잠시 시간이 걸릴 수 있습니다.">
            <Select
              label="숨겨진 동안 메모리 확보"
              value={values.release}
              onChange={(v) => set("release", v)}
              options={[0, 1, 10, 30].map((minutes) => ({
                value: minutes,
                label: minutes ? `${minutes}분 후` : "안 함",
              }))}
            />
          </Setting>
          <Setting
            icon="transfer"
            title="네트워크 속도 단위"
            desc="바이트는 저장소 속도의 단위와 맞고, 비트는 네트워크 어댑터 링크 속도와 회선 요금제의 단위와 맞습니다. 성능 페이지의 네트워크 보기에서는 둘 다 표시합니다."
          >
            <Segments
              label="네트워크 속도 단위"
              value={values.bits ? "bits" : "bytes"}
              onChange={(v) => set("bits", v === "bits")}
              items={[
                { value: "bytes", label: "MB/s", title: "초당 바이트" },
                { value: "bits", label: "Mbps", title: "초당 비트" },
              ]}
            />
          </Setting>
          <Setting
            icon="history"
            title="기록 저장"
            desc={
              values.history
                ? "리소스 사용량과 사용량 상위 프로세스를 5초마다 기록하며, 최소화 또는 알림 영역 새로 고침 빈도가 더 느리면 그 주기를 따릅니다. 데이터는 이 PC에 7일 동안 보관되며 기록 페이지에서 확인할 수 있습니다."
                : "끔. 기존 기록은 7일 후 만료되며, 지금 지울 수도 있습니다."
            }
          >
            <Switch state label="기록 저장" checked={values.history} onChange={(v) => set("history", v)} />
          </Setting>
          <Setting icon="storage" title="저장된 기록" desc="38.6MB를 사용하며 가장 이른 기록은 10/27 09:12입니다.">
            <Button icon="trash" onClick={() => onSay("데모 창에서는 기록을 지우지 않습니다.")}>
              지우기
            </Button>
          </Setting>
        </section>
        <section>
          <h2>규칙</h2>
          <Setting
            icon="bolt"
            title="프로그램이 시작될 때 우선 순위 또는 효율성 모드 설정"
            desc="저장한 규칙은 실행 중인 프로세스에 바로 적용됩니다. 목록에서 프로세스를 마우스 오른쪽 단추로 클릭하고 규칙 추가를 선택해 규칙을 추가할 수도 있습니다."
          >
            <input className="a-number" style={{ width: 190 }} placeholder="프로그램 이름, 예: chrome.exe" aria-label="새 규칙의 프로그램 이름" />
            <Button onClick={() => onSay("데모 창에서는 규칙을 저장하지 않습니다.")}>추가</Button>
          </Setting>
        </section>
        <section>
          <h2>업데이트</h2>
          <Setting icon="update" title="GoodGood이 최신 상태입니다" desc={`현재 버전 ${appVersion} · `} note="업데이트는 GitHub Releases에서 받습니다. GoodGood은 설치 전에 설치 관리자 서명을 확인합니다.">
            <Button onClick={() => onSay("GoodGood이 최신 상태입니다")}>업데이트 확인</Button>
          </Setting>
          <Setting icon="timer" title="자동으로 업데이트 확인" desc="시작 후 약 1분 뒤에 확인하고, 그다음에는 하루에 한 번 확인합니다. 새 버전은 백그라운드에서 다운로드되며 확인을 거친 후에만 설치됩니다.">
            <Switch state label="자동으로 업데이트 확인" checked={values.autoUpdate} onChange={(v) => set("autoUpdate", v)} />
          </Setting>
          <Setting icon="notes" title="업데이트 후 새로운 기능 표시" desc="업데이트 후 창을 처음 열 때 새 버전의 변경 사항을 버전당 한 번 표시합니다. 이 옵션을 끄면 오른쪽 아래의 알림만 GoodGood이 업데이트되었음을 알립니다.">
            <Button onClick={() => onSay("데모 창에서는 업데이트 내용을 표시하지 않습니다. 웹사이트의 ‘변경 기록’ 페이지에서 확인하십시오.")}>이 버전의 변경 사항 보기</Button>
            <Switch state label="업데이트 후 새로운 기능 표시" checked={values.whatsNew} onChange={(v) => set("whatsNew", v)} />
          </Setting>
          <Setting icon="sparkle" title="업데이트 채널" desc="베타는 새 기능을 더 빨리 받지만 안정판보다 안정성이 낮을 수 있습니다. 베타에서 안정판으로 바꾸면 현재 버전보다 새로운 안정판이 나온 뒤에만 업데이트합니다.">
            <Select
              label="업데이트 채널"
              value={values.channel}
              onChange={(v) => set("channel", v)}
              options={[
                { value: "stable", label: "안정판" },
                { value: "beta", label: "베타" },
              ]}
            />
          </Setting>
          <Setting icon="globe" title="다운로드 소스" desc="GitHub 프록시는 제3자가 운영하며 이 PC의 IP 주소와 내려받는 파일을 볼 수 있습니다. 설치 관리자 서명에는 버전 번호도 포함되므로 프록시가 업데이트를 변조하거나 이전 버전을 새 버전으로 속일 수 없습니다.">
            <Select
              label="다운로드 소스"
              value={values.route}
              onChange={(v) => set("route", v)}
              options={[
                { value: "auto", label: "자동(GitHub, 그다음 프록시)" },
                { value: "direct", label: "GitHub만" },
                { value: "proxy", label: "GitHub 프록시만" },
              ]}
            />
          </Setting>
          {values.route !== "direct" && (
            <Setting
              icon="transfer"
              title="GitHub 프록시"
              desc={values.route === "auto" ? "GitHub를 사용할 수 없으면 GoodGood이 이 프록시를, 그다음에는 다른 기본 제공 프록시를 시도합니다." : "모든 업데이트 요청이 이 프록시를 거칩니다."}
            >
              <Select
                label="GitHub 프록시"
                value={values.proxy}
                onChange={(v) => set("proxy", v)}
                options={[...proxies.map((host) => ({ value: host, label: host })), { value: "custom", label: "사용자 지정…" }]}
              />
            </Setting>
          )}
          {values.route !== "direct" && values.proxy === "custom" && (
            <Setting icon="globe" title="사용자 지정 프록시" desc="GitHub URL 앞에 붙는 접두사입니다. https를 사용해야 하며, 예: https://example.com/.">
              <input
                className="a-number"
                style={{ width: 220 }}
                value={customProxy}
                onChange={(event) => setCustomProxy(event.target.value)}
                placeholder="https://"
                aria-label="사용자 지정 프록시 URL"
                spellCheck={false}
                autoComplete="off"
              />
              <Button disabled={!customProxy.trim()}>저장</Button>
            </Setting>
          )}
          <Setting icon="star" title="별표 알림" desc="하루에 한 번 창 오른쪽 아래에 카드를 표시해 GitHub에서 별표를 눌러 달라고 요청합니다. 카드에서 GitHub를 열거나 다시 알리지 않기를 선택하면 자동으로 꺼집니다.">
            <Switch state label="별표 알림" checked={values.star} onChange={(v) => set("star", v)} />
          </Setting>
        </section>
      </div>
      </div>
    </div>
  );
}

// A link card's moving parts (about.rs `project_link`): the hover face, the
// line along its top edge, and its arrow, muted and in the link's colour.
// A link card (about.rs `project_link`): the mark beside the name and address,
// the whole card opening the address, and along its foot the pages there.
function LinkCard({
  repo,
  href,
  mark,
  title,
  address,
  pages,
}: {
  repo?: boolean;
  href: string;
  mark: ReactNode;
  title: string;
  address: string;
  pages: [UiIcon, string, string][];
}) {
  return (
    <div className={"a-link-card" + (repo ? " is-repo" : "")}>
      <span className="a-link-face" aria-hidden="true" />
      <span className="a-link-line" aria-hidden="true" />
      <a className="a-link-head" href={href} target="_blank" rel="noopener">
        {mark}
        <span className="a-link-name">
          <strong>{title}</strong>
          <span className="a-link-address">{address}</span>
        </span>
        <span className="a-link-arrow" aria-hidden="true">
          <Icon name="external" size={14} />
          <Icon name="external" size={14} className="is-lit" />
        </span>
      </a>
      <nav className="a-link-pages">
        {pages.map(([icon, text, url]) => (
          <a key={url} className="a-btn is-ghost is-small" href={url} target="_blank" rel="noopener">
            <Icon name={icon} size={14} />
            {text}
          </a>
        ))}
      </nav>
    </div>
  );
}

// About (about.rs): the app and this build, then where to find help, in one
// column as wide as the settings' content.
export function About({
  onCopy,
  onQuit,
  onSay,
}: {
  onCopy: (text: string, what: string) => void;
  onQuit: () => void;
  onSay: (text: string) => void;
}) {
  return (
    <div className="a-page a-about a-scroll">
      <div className="a-about-inner">
        <div className="a-about-hero">
          <img className="a-about-logo" src="/assets/goodgood.svg" width="64" height="64" alt="" />
          <div className="a-about-text">
            <div className="a-about-name">
              <strong>GoodGood</strong>
              <small>{appVersion}</small>
            </div>
            <p>빠르고 현대적이며 정보가 풍부한 Windows 작업 관리자입니다.</p>
            <span>관리자로 실행 중입니다.</span>
            <span>© 2026 GoodGood contributors</span>
          </div>
          <div className="a-setting-controls">
            <Button onClick={() => onSay("데모 창에서는 업데이트 내용을 표시하지 않습니다. 웹사이트의 ‘변경 기록’ 페이지에서 확인하십시오.")}>새로운 기능</Button>
            <Button onClick={onQuit}>GoodGood 종료</Button>
          </div>
        </div>
        <div className="a-about-links">
          <LinkCard
            href="https://goodgoodtask.com/"
            mark={<img className="a-link-mark" src="/assets/goodgood.svg" width="40" height="40" alt="" />}
            title="GoodGood 웹사이트"
            address="goodgoodtask.com"
            pages={[
              ["download", "다운로드", "https://goodgoodtask.com" + localized(language(), "/download/")],
              ["guide", "사용자 가이드", "https://goodgoodtask.com/docs/guide/"],
              ["notes", "변경 로그", "https://goodgoodtask.com" + localized(language(), "/changelog/")],
            ]}
          />
          <LinkCard
            repo
            href="https://github.com/acc0mplish/GoodGood"
            mark={
              <span className="a-link-mark">
                <Icon name="github" size={24} />
              </span>
            }
            title="GitHub 저장소"
            address="github.com/acc0mplish/GoodGood"
            pages={[
              ["issue", "문제 보고", "https://github.com/acc0mplish/GoodGood/issues/new/choose"],
              ["discussion", "토론", "https://github.com/acc0mplish/GoodGood/discussions"],
              ["release", "릴리스", "https://github.com/acc0mplish/GoodGood/releases"],
            ]}
          />
        </div>
        <h2>프로젝트 및 지원</h2>
        <Setting icon="sparkle" title="시작 가이드" desc="필수 설정과 팁을 다시 살펴봅니다.">
          <Button>가이드 열기</Button>
        </Setting>
        <Setting
          icon="document"
          title="라이선스"
          desc="GoodGood은 Apache License 2.0으로 배포되는 자유 소프트웨어입니다. 해당 라이선스 조건에 따라 재배포하고 수정할 수 있습니다. GoodGood에는 어떠한 보증도 제공되지 않습니다."
        >
          <Button>라이선스 보기</Button>
        </Setting>
        <Setting icon="document" title="타사 구성 요소" desc="GoodGood에 포함된 오픈 소스 구성 요소와 각 라이선스, 저작권 고지입니다.">
          <Button>고지 보기</Button>
        </Setting>
        <Setting
          icon="storage"
          title="로그"
          desc="실행 환경, 기능 상태, 실패한 단계, 오류 코드와 관련 파일 또는 폴더의 실제 경로를 기록합니다. 로컬에 저장되며 파일당 최대 1 MB, 이전 로그 3개까지 보관합니다. 명령줄, 자격 증명, 파일 내용은 기록하지 않습니다. 버그 보고에 사용할 진단 로그를 찾을 때 이 항목을 사용하십시오."
        >
          <Button onClick={() => onSay("데모 창에서는 로그 폴더를 열지 않습니다.")}>로그 폴더 열기</Button>
        </Setting>
      </div>
    </div>
  );
}
