/** @jsxImportSource @/components/replica/i18n */
"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import theme from "../../../../resources/theme.json";
import Curve, { type Motion, type Readout, type Series } from "./Curve";
import DiskDetails from "./DiskDetails";
import { Icon } from "./icons";
import type { MenuEntry } from "./Pages";
import { cpuPower, cpuTemperature, gpuPower, gpuTemperature, useSystemHistory, type Device } from "./Processes";
import {
  clock,
  coreLoad,
  logical,
  machine,
  noise,
  rate,
  rateCeiling,
  rateLabel,
  sampleAt,
  samples,
  span,
  thousands,
  totalMemory,
} from "./model";
import { Button, scaleOf, Segments, Select, slideIn, useIsoLayoutEffect } from "./widgets";

interface Props {
  tick: number;
  interval: number;
  running: boolean;
  motion: Motion;
  device: Device;
  /** The pages chosen within the devices; the window keeps them. */
  pages: PerformancePages;
  onPages: (pages: Partial<PerformancePages>) => void;
  processCount: number;
  threads: number;
  handles: number;
  onDevice: (device: Device) => void;
  /** A context menu at the pointer (Replica's). */
  onMenu: (event: ReactMouseEvent, items: MenuEntry[]) => void;
}
// Which page of a device shows: the CPU's overview (as one curve or one per
// logical processor, all of them or one kind of core) or its details, and the
// disk's overview or its details. The window holds them, so that they outlast
// a visit to another page and the home page can ask for one of them.
export interface PerformancePages {
  cpuPage: "overview" | "details";
  graph: "overall" | "logical";
  filter: "all" | "p" | "e";
  diskPage: "overview" | "details";
  /** The device list's order, as dragged; and the devices taken out of it. */
  order: Device[];
  hidden: Device[];
  /** The CPU graphs draw the kernel time (right-click a CPU graph). */
  kernel: boolean;
}
export const defaultDevices: Device[] = ["cpu", "memory", "disk", "wifi", "gpu", "battery"];
interface CurveProps {
  tick: number;
  interval: number;
  running: boolean;
  motion: Motion;
}
const GB = 1024 ** 3;
// How the hover readout writes each kind of value.
const percentOf = (v: number) => Math.round(v) + "%";
const gigabytes = (v: number) => v.toFixed(1) + " GB";
const celsius = (v: number) => Math.round(v) + " °C";
const watts = (v: number) => Math.round(v) + " W";
const seriesOf = (count: number, f: (t: number) => number, tick: number) =>
  Array.from({ length: count }, (_, i) => f(tick - count + 1 + i));
export function spanLabel(interval: number) {
  const seconds = Math.round((span * interval) / 1000);
  return seconds >= 120 ? `${Math.round(seconds / 60)}분` : `${seconds}초`;
}

function Chart({
  title,
  top,
  series,
  max,
  curve,
  fill,
  color = "var(--a-cpu)",
  foot = true,
  height,
  readout = { format: percentOf },
}: {
  title?: ReactNode;
  top?: ReactNode;
  series: Series[];
  max: number;
  curve: CurveProps;
  fill?: boolean;
  color?: string;
  foot?: boolean;
  height?: number;
  readout?: Readout;
}) {
  return (
    <figure className={"a-chart" + (fill ? " is-fill" : "")}>
      {title !== undefined && (
        <figcaption className="a-chart-caption">
          <span>{title}</span>
          <span>{top}</span>
        </figcaption>
      )}
      <div className="a-chart-frame" style={{ "--c": color, height } as CSSProperties}>
        <div className="a-grid" aria-hidden="true" />
        <Curve series={series} max={max} {...curve} label={typeof title === "string" ? title : undefined} readout={readout} />
      </div>
      {foot && (
        <div className="a-chart-caption">
          <span>{spanLabel(curve.interval)}</span>
          <span>0</span>
        </div>
      )}
    </figure>
  );
}

type Figure = [string, ReactNode, string?, string?];
function Stats({ figures, specs, cpu }: { figures: Figure[]; specs: [string, ReactNode][]; cpu?: boolean }) {
  return (
    <div className={"a-stats" + (cpu ? " is-cpu" : "")}>
      <dl className="a-figures">
        {figures.map(([label, value, unit, note]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {value}
              {unit && <small>{unit}</small>}
            </dd>
            {note && <dd>{note}</dd>}
          </div>
        ))}
      </dl>
      <dl className="a-specs">
        {specs.map(([label, value]) => [
          <dt key={label + ":t"}>{label}</dt>,
          <dd key={label + ":d"}>{value}</dd>,
        ])}
      </dl>
    </div>
  );
}
function Head({ title, model, children }: { title: string; model?: string; children?: ReactNode }) {
  return (
    <header className="a-perf-head">
      <div className="a-perf-title">
        <h2>{title}</h2>
        {children}
      </div>
      {model && <span className="a-model">{model}</span>}
    </header>
  );
}
function Legend({ items }: { items: [string, string, string?][] }) {
  return (
    <div className="a-legend">
      {items.map(([label, color, kind]) => (
        <span key={label} className={kind ? "is-" + kind : undefined} style={{ "--c": color } as CSSProperties}>
          {label}
        </span>
      ))}
    </div>
  );
}
const split = (text: string): [string, string] => {
  const at = text.lastIndexOf(" ");
  return at < 0 ? [text, ""] : [text.slice(0, at), text.slice(at + 1)];
};

// The logical processors' grid as the app picks its columns (model.rs,
// core_grid_columns): full rows first, then readable plots; a grid with empty
// slots keeps this share of its plot size when weighed against a full one, so
// it wins only where no full grid fits or its plots would be much smaller.
// While resizing, the columns it had stay unless another count is clearly
// better.
const { coreMinWidth, coreMinHeight, coreHeaderHeight, coreGap } = theme.layout;
const CORE_GRID_GAPPED = 0.6;
function coreGridColumns(count: number, width: number, height: number, previous: number) {
  if (count <= 1 || width <= 0) return 1;
  const limit = Math.min(count, Math.max(1, Math.floor((width + coreGap) / (coreMinWidth + coreGap))));
  const score = (columns: number) => {
    const rows = Math.ceil(count / columns);
    const cell = (width - (columns - 1) * coreGap) / columns;
    const row = (height - (rows - 1) * coreGap) / rows;
    if (row < coreMinHeight - 0.5) return 0;
    const plot = Math.min(cell / 1.8, row - coreHeaderHeight);
    const slots = rows * columns;
    if (slots === count) return plot;
    // Among grids with empty slots, fewer of them.
    const empty = 1 - count / slots;
    return plot * CORE_GRID_GAPPED * (1 - empty * 0.5);
  };
  let best = limit;
  let bestScore = 0;
  for (let columns = 1; columns <= limit; columns++) {
    const value = score(columns);
    if (value > bestScore) {
      best = columns;
      bestScore = value;
    }
  }
  if (previous > 0 && previous <= limit) {
    const current = score(previous);
    // A small dead band keeps one-pixel drags from moving the cores back and forth.
    if (current > 0 && bestScore <= current * 1.08) return previous;
  }
  // Where nothing fits the height, as many columns as the width takes.
  return best;
}

/** A device entry's height in the list. */
const ROW = 62;
export default function Performance(p: Props) {
  const { graph, filter, cpuPage, diskPage, order, hidden, kernel } = p.pages;
  const devices = order;
  // A device opened from elsewhere (the overview band, the details pane)
  // comes back into the list.
  useEffect(() => {
    if (hidden.includes(p.device)) p.onPages({ hidden: hidden.filter((d) => d !== p.device) });
  }, [p.device]);
  const setGraph = (graph: PerformancePages["graph"]) => p.onPages({ graph });
  const setFilter = (filter: PerformancePages["filter"]) => p.onPages({ filter });
  const setCpuPage = (cpuPage: PerformancePages["cpuPage"]) => p.onPages({ cpuPage });
  const setDiskPage = (diskPage: PerformancePages["diskPage"]) => p.onPages({ diskPage });
  // The tick at which the disk's details were last read: each time its
  // details page opens, and again from the head's button.
  const [diskRead, setDiskRead] = useState(0);
  const [engineCount, setEngineCount] = useState<"smart" | "3" | "6">("smart");
  const [engineLayout, setEngineLayout] = useState<"grid" | "focus" | "rows">("grid");
  const last = useRef({ device: p.device, dir: 1 });
  if (last.current.device !== p.device) {
    last.current = {
      device: p.device,
      dir: Math.sign(devices.indexOf(p.device) - devices.indexOf(last.current.device)) || 1,
    };
  }
  // A device's view moves in from the side of its entry in the list.
  const view = useRef<HTMLDivElement>(null);
  useIsoLayoutEffect(() => slideIn(view.current, { y: last.current.dir * 16 }), [p.device]);
  // The disk's details are read as their page opens (another device and
  // back, or the overview and back), not with every sample.
  useIsoLayoutEffect(() => {
    if (p.device === "disk" && diskPage === "details") setDiskRead(p.tick);
  }, [p.device, diskPage]);
  const markMoves = useRef(false);
  const s = sampleAt(p.tick);
  const h = useSystemHistory(p.tick);
  const curve = { tick: p.tick, interval: p.interval, running: p.running, motion: p.motion };
  const used = (s.mem / 100) * totalMemory;
  const diskMax = rateCeiling(Math.max(...h.disk));
  const netMax = rateCeiling(Math.max(...h.net), true);
  const vram = (t: number) => 3.3 + sampleAt(t).gpu / 900 + noise(41, t) * 0.04;
  const battery = (t: number) => 84 - ((((t % 600) + 600) % 600) / 300);
  const discharge = (t: number) => 16.5 + noise(71, Math.floor(t / 3)) * 1.4;
  const rail: { id: Device; name: string; info: string; values: number[][]; color: string; max: number }[] = [
    { id: "cpu", name: "CPU", info: `${Math.round(s.cpu)}% ${clock("p", p.tick).toFixed(2)} GHz`, values: [h.cpu], color: "var(--a-cpu)", max: 100 },
    {
      id: "memory",
      name: "메모리",
      info: `${(used / GB).toFixed(1)} / 32.0 GB（${Math.round(s.mem)}%）`,
      values: [h.mem],
      color: "var(--a-mem)",
      max: 100,
    },
    {
      id: "disk",
      name: "디스크 0(C:)",
      info: `SSD (NVMe) ${Math.round(s.active)}% 41 °C`,
      values: [h.active],
      color: "var(--a-io)",
      max: 100,
    },
    { id: "wifi", name: "WLAN", info: `R: ${rate(s.rx)} S: ${rate(s.tx)}`, values: [h.rx, h.tx], color: "var(--a-net)", max: netMax },
    {
      id: "gpu",
      name: "GPU 0",
      info: `${Math.round(s.gpu)}% ${Math.round(gpuTemperature(p.tick))} °C ${Math.round(gpuPower(p.tick))} W`,
      values: [h.gpu],
      color: "var(--a-gpu)",
      max: 100,
    },
    {
      id: "battery",
      name: "배터리",
      info: "84% · 2시간 31분 남음",
      values: [seriesOf(samples, battery, p.tick)],
      color: "var(--a-bat)",
      max: 100,
    },
  ];
  const coreCount = logical.filter((c) => filter === "all" || c.kind === filter).length;
  // The processors' grid: the columns it was given for that many processors,
  // and its size when last laid out (kept out of state, so that resizing
  // renders again only when the columns change). Another count starts afresh
  // in the area the grid last had, as in the app.
  const coreGrid = useRef<HTMLDivElement>(null);
  const coreArea = useRef<{ width: number; height: number } | null>(null);
  const [coreLayout, setCoreLayout] = useState({ count: 0, columns: 0 });
  const coreCols =
    coreLayout.count === coreCount
      ? coreLayout.columns
      : coreGridColumns(coreCount, coreArea.current?.width ?? 0, coreArea.current?.height ?? 0, 0);
  useIsoLayoutEffect(() => {
    const el = coreGrid.current;
    if (!el) return;
    // Its own size (the window is drawn scaled), rows included: they keep at
    // least the cards' fit height, the view scrolling below that. Laid out for
    // the first time, it knows only its width, as the app's first layout does;
    // new columns are measured again at the size they give the grid.
    const measure = () => {
      const width = el.offsetWidth;
      const height = coreArea.current ? el.offsetHeight : 0;
      coreArea.current = { width, height: el.offsetHeight };
      setCoreLayout((last) => {
        const columns = coreGridColumns(coreCount, width, height, last.count === coreCount ? last.columns : 0);
        return last.count === coreCount && last.columns === columns ? last : { count: coreCount, columns };
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [p.device, cpuPage, graph, filter, coreCount, coreCols]);
  const cores = useMemo(
    () =>
      logical
        .filter((c) => filter === "all" || c.kind === filter)
        .map((c) => ({
          ...c,
          values: seriesOf(samples, (t) => coreLoad(c.index, t), p.tick),
          // The processor's kernel time, a share of its load.
          kernel: seriesOf(samples, (t) => coreLoad(c.index, t) * (0.24 + noise(c.index * 13 + 5, t) * 0.14), p.tick),
        })),
    [filter, p.tick],
  );
  // Right-click on the CPU graphs: the kernel time shown or not, in both views.
  const cpuMenu = (event: ReactMouseEvent) => {
    event.preventDefault();
    p.onMenu(event, [{ label: "커널 시간 표시", checked: kernel, run: () => p.onPages({ kernel: !kernel }) }]);
  };
  const uptime = (
    <>
      5<small>일</small>&nbsp;14:{String(Math.floor(p.tick / 60) % 60).padStart(2, "0")}:
      {String(((p.tick % 60) + 60) % 60).padStart(2, "0")}
    </>
  );
  let body: ReactNode;
  if (p.device === "cpu") {
    const head = (
      <Head title="CPU" model={machine.cpu}>
        <Segments
          label="CPU 페이지"
          value={cpuPage}
          onChange={setCpuPage}
          items={[
            { value: "overview", label: "개요" },
            { value: "details", label: "자세히" },
          ]}
        />
      </Head>
    );
    if (cpuPage === "overview")
      body = (
        <>
          {head}
          <div className="a-perf-tools">
            {graph === "logical" && (
              <Segments
                label="코어 유형"
                value={filter}
                onChange={setFilter}
                items={[
                  { value: "all", label: "모두", title: "모든 논리 프로세서 표시" },
                  { value: "p", label: "P-코어", title: "성능 코어(P-코어)만 표시" },
                  { value: "e", label: "E-코어", title: "효율 코어(E-코어)만 표시" },
                ]}
              />
            )}
            <Segments
              label="CPU 그래프"
              value={graph}
              onChange={setGraph}
              items={[
                { value: "overall", label: "전체", title: "모든 논리 프로세서의 전체 사용률", tour: "graph-overall" },
                { value: "logical", label: "논리", title: "논리 프로세서마다 차트 하나", tour: "graph-logical" },
              ]}
            />
          </div>
          <div className="a-cpu-graphs" onContextMenu={cpuMenu}>
          {graph === "overall" ? (
            <Chart
              title="% 사용률"
              top="100%"
              max={100}
              curve={curve}
              fill
              readout={{ names: kernel ? ["사용률", "커널 시간"] : ["사용률"], format: percentOf }}
              series={[
                { values: h.cpu, color: "var(--a-cpu)" },
                ...(kernel ? [{ values: h.kernel, color: "var(--a-cpu)", dashed: true, fill: false }] : []),
              ]}
            />
          ) : (
            <div className="a-cores-grid" ref={coreGrid} style={{ "--cols": coreCols } as CSSProperties} key={filter}>
              {cores.map((core) => {
                const color = core.kind === "p" ? "var(--a-cpu)" : "var(--a-cpu-e)";
                return (
                  <div
                    className="a-core"
                    key={core.index}
                    title={`논리 프로세서 ${core.index}, 물리 코어 ${core.kind === "p" ? core.index >> 1 : core.index - 6}(${core.kind === "p" ? "P-코어" : "E-코어"})`}
                  >
                    <div className="a-core-head">
                      <span className="a-kind" style={{ "--c": color } as CSSProperties}>
                        {core.kind.toUpperCase()}
                      </span>
                      <b>{core.index}</b>
                      <span>{clock(core.kind, p.tick + core.index).toFixed(2)} GHz</span>
                      <strong>
                        {Math.round(core.values[core.values.length - 1])}
                        <small>%</small>
                      </strong>
                    </div>
                    <div className="a-chart-frame" style={{ "--c": color } as CSSProperties}>
                      <div className="a-grid" aria-hidden="true" />
                      <Curve
                        series={[
                          { values: core.values, color },
                          ...(kernel ? [{ values: core.kernel, color, faint: true, fill: 0.12 }] : []),
                        ]}
                        max={100}
                        {...curve}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
          {graph === "overall" ? (
            <Legend
              items={[
                ["전체", "var(--a-cpu)"],
                ...(kernel ? [["커널 시간", "var(--a-cpu)", "dashed"] as [string, string, string]] : []),
              ]}
            />
          ) : (
            <Legend
              items={[
                ["P-코어", "var(--a-cpu)"],
                ["E-코어", "var(--a-cpu-e)"],
                ...(kernel ? [["커널 시간", "color-mix(in srgb, var(--a-cpu) 60%, transparent)"] as [string, string]] : []),
              ]}
            />
          )}
          <Stats
            cpu
            figures={[
              ["사용률", Math.round(s.cpu), "%"],
              ["속도", clock("p", p.tick).toFixed(2), "GHz"],
              ["P-코어 속도", (clock("p", p.tick) - 0.41).toFixed(2), "GHz"],
              ["E-코어 속도", clock("e", p.tick).toFixed(2), "GHz"],
              ["온도", Math.round(cpuTemperature(p.tick)), "°C"],
              ["전력", Math.round(cpuPower(p.tick)), "W"],
              ["프로세스", p.processCount],
              ["스레드", thousands(p.threads)],
              ["핸들", thousands(p.handles)],
              ["가동 시간", uptime],
            ]}
            specs={[
              ["기본 속도", "2.50 GHz"],
              ["소켓", "1"],
              ["커널", "14(P-코어 6개 + E-코어 8개)"],
              ["논리 프로세서", "20"],
              ["가상화", "사용 중"],
              ["L1 캐시", "1.2 MB"],
              ["L2 캐시", "11.0 MB"],
              ["L3 캐시", "24.0 MB"],
            ]}
          />
        </>
      );
    else {
      const temp = Math.round(cpuTemperature(p.tick));
      const power = Math.round(cpuPower(p.tick));
      const powerTop = Math.max(90, Math.ceil(Math.max(...seriesOf(samples, cpuPower, p.tick)) / 10) * 10);
      const idle = [10 + noise(81, p.tick) * 2, 5 + noise(82, p.tick), 30 + noise(83, p.tick) * 4];
      body = (
        <>
          {head}
          <div className="a-cards">
            <section className="a-card">
              <div className="a-card-head">
                <b>프로세서 세부 정보</b>
              </div>
              <dl className="a-specs">
                <dt>제조업체</dt>
                <dd>GenuineIntel</dd>
                <dt>제품군 / 모델 / 스테핑</dt>
                <dd>0x6 / 0xBF / 2</dd>
                <dt>마이크로코드 수정 버전</dt>
                <dd>0x4122</dd>
                <dt>온도 원본</dt>
                <dd>프로세서 센서(PawnIO)</dd>
                <dt>명령어 집합</dt>
                <dd />
              </dl>
              <div className="a-flags">
                {["SSE", "SSE2", "SSE3", "SSSE3", "SSE4.1", "SSE4.2", "AVX", "AVX2", "FMA", "AES", "SHA", "BMI1", "BMI2", "AVX-VNNI"].map(
                  (flag) => (
                    <span key={flag}>{flag}</span>
                  ),
                )}
              </div>
            </section>
            <section className="a-card">
              <div className="a-card-head">
                <b>온도 및 전원 차트</b>
                <span>
                  최근 {spanLabel(p.interval)}: {temp}°C · {power}W
                </span>
              </div>
              <div className="a-two">
                <Chart
                  title="온도"
                  top="100 °C"
                  max={100}
                  curve={curve}
                  readout={{ format: celsius }}
                  height={146}
                  series={[{ values: seriesOf(samples, cpuTemperature, p.tick), color: "var(--a-cpu)" }]}
                />
                <Chart
                  title="전력"
                  top={`${powerTop} W`}
                  max={powerTop}
                  curve={curve}
                  readout={{ names: ["패키지", "코어"], format: watts }}
                  height={146}
                  series={[
                    { values: seriesOf(samples, cpuPower, p.tick), color: "var(--a-cpu)" },
                    { values: seriesOf(samples, (t) => cpuPower(t) * 0.72, p.tick), color: "var(--a-cpu)", dashed: true, fill: false },
                  ]}
                />
              </div>
              <Legend
                items={[
                  ["패키지", "var(--a-cpu)"],
                  ["코어", "var(--a-cpu)", "dashed"],
                ]}
              />
            </section>
            <section className="a-card">
              <div className="a-card-head">
                <b>유휴 상태</b>
                <span>
                  Windows：C1 {idle[0].toFixed(1)}% · C2 {idle[1].toFixed(1)}% · C3 {idle[2].toFixed(1)}%
                </span>
              </div>
              <p className="a-card-sub">유휴 상태(Windows)</p>
              <dl className="a-figures">
                {idle.map((v, i) => (
                  <div key={i}>
                    <dt>C{i + 1}</dt>
                    <dd>
                      {v.toFixed(1)}
                      <small>%</small>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </>
      );
    }
  } else if (p.device === "memory") {
    const inUse = used / GB;
    const modified = 0.25;
    const free = 1.26;
    const standby = 32 - inUse - modified - free;
    body = (
      <>
        <Head title="메모리" model="32 GB DDR5" />
        <Chart
          title="메모리 사용량"
          top="32.0 GB"
          max={100}
          curve={curve}
          fill
          color="var(--a-mem)"
          series={[{ values: h.mem, color: "var(--a-mem)" }]}
          readout={{ format: (v) => gigabytes((v / 100) * 32) }}
        />
        <div className="a-membar" role="img" aria-label="메모리 구성">
          <i style={{ width: `${(inUse / 32) * 100}%`, background: "color-mix(in srgb, var(--a-mem) 62%, transparent)" }} title="프로세스, 드라이버 또는 운영 체제가 사용하는 메모리" />
          <i style={{ width: `${(modified / 32) * 100}%`, background: "var(--a-mem)" }} title="다른 용도로 사용하기 전에 내용을 디스크에 먼저 기록해야 하는 메모리" />
          <i style={{ width: `${(standby / 32) * 100}%`, background: "color-mix(in srgb, var(--a-mem) 22%, transparent)" }} title="캐시된 데이터와 코드를 담고 있으며 현재 활발하게 사용되지 않는 메모리" />
        </div>
        <div className="a-legend">
          <span className="is-square is-mem">사용 중 {inUse.toFixed(1)}GB</span>
          <span className="is-square is-mem-mod">수정 256.0MB</span>
          <span className="is-square is-mem-standby">대기 {standby.toFixed(2)}GB</span>
          <span className="is-hollow">여유 {free.toFixed(2)}GB</span>
        </div>
        <Stats
          figures={[
            ["사용 중", inUse.toFixed(1), "GB"],
            ["사용 가능", (32 - inUse).toFixed(1), "GB"],
            ["커밋됨", `${(inUse * 1.27).toFixed(1)} / 48.0`, "GB"],
            ["캐시됨", "7.7", "GB"],
            ["페이징된 풀", "640.0", "MB"],
            ["비페이징된 풀", "310.0", "MB"],
          ]}
          specs={[
            ["속도", "5600 MT/s"],
            ["사용 중인 슬롯", "2 / 2"],
            ["폼 팩터", "SODIMM"],
            ["유형", "DDR5"],
            ["하드웨어 예약", "214 MB"],
          ]}
        />
      </>
    );
  } else if (p.device === "disk") {
    const [readValue, readUnit] = split(s.read < 1 ? "0 KB/s" : rate(s.read));
    const [writeValue, writeUnit] = split(s.write < 1 ? "0 KB/s" : rate(s.write));
    const head = (
      <Head title="디스크 0(C:)" model={machine.disk}>
        <div className="a-disk-controls">
          <Segments
            label="디스크 페이지"
            value={diskPage}
            onChange={setDiskPage}
            items={[
              { value: "overview", label: "개요" },
              { value: "details", label: "자세히" },
            ]}
          />
          {diskPage === "details" && (
            <Button icon="restart" small tone="ghost" title="다시 읽기" onClick={() => setDiskRead(p.tick)} />
          )}
        </div>
      </Head>
    );
    if (diskPage === "details")
      body = (
        <>
          {head}
          <DiskDetails read={diskRead} interval={p.interval} />
        </>
      );
    else
      body = (
        <>
          {head}
          <div className="a-stack is-fill">
            <Chart title="활성 시간" top="100%" max={100} curve={curve} color="var(--a-io)" series={[{ values: h.active, color: "var(--a-io)" }]} />
            <Chart
              title="디스크 전송률"
              top={rateLabel(diskMax)}
              max={diskMax}
              curve={curve}
              readout={{ names: ["읽기", "쓰기"], format: rate }}
              color="var(--a-io)"
              series={[
                { values: h.read, color: "var(--a-io)" },
                { values: h.write, color: "var(--a-io)", dashed: true, fill: false },
              ]}
            />
          </div>
          <Legend
            items={[
              ["읽기", "var(--a-io)"],
              ["쓰기", "var(--a-io)", "dashed"],
            ]}
          />
          <Stats
            figures={[
              ["활성 시간", Math.round(s.active), "%"],
              ["평균 응답 시간", (0.2 + noise(51, p.tick) * 0.4).toFixed(1), "ms"],
              ["읽기 속도", readValue, readUnit],
              ["쓰기 속도", writeValue, writeUnit],
              ["온도", "41", "°C"],
            ]}
            specs={[
              ["용량", "1.8 TB"],
              ["유형", "SSD (NVMe)"],
              ["볼륨", "C:"],
              ["경고 온도", "90 °C"],
            ]}
          />
        </>
      );
  } else if (p.device === "wifi") {
    const [rxValue, rxUnit] = split(s.rx < 1 ? "0 KB/s" : rate(s.rx));
    const [txValue, txUnit] = split(s.tx < 1 ? "0 KB/s" : rate(s.tx));
    body = (
      <>
        <Head title="WLAN" model={machine.wifi} />
        <Chart
          title="처리량"
          top={rateLabel(netMax)}
          max={netMax}
          curve={curve}
          readout={{ names: ["받기", "보내기"], format: rate }}
          fill
          color="var(--a-net)"
          series={[
            { values: h.rx, color: "var(--a-net)" },
            { values: h.tx, color: "var(--a-net)", dashed: true, fill: false },
          ]}
        />
        <Legend
          items={[
            ["받기", "var(--a-net)"],
            ["보내기", "var(--a-net)", "dashed"],
          ]}
        />
        <Stats
          figures={[
            ["받기", rxValue, rxUnit, `${((s.rx * 8) / 1e6).toFixed(2)} Mbps`],
            ["보내기", txValue, txUnit, `${((s.tx * 8) / 1e6).toFixed(2)} Mbps`],
          ]}
          specs={[
            ["연결 유형", "Wi-Fi"],
            ["링크 속도", "1.2 Gbps (143.2 MB/s)"],
            ["IPv4 주소", "192.0.2.24"],
            [
              "IPv6 주소",
              <>
                <span>2001:db8::24</span>
                <span>2001:db8::8a2e:370:7334</span>
              </>,
            ],
            ["물리적 주소", "02-00-00-00-00-01"],
          ]}
        />
      </>
    );
  } else if (p.device === "gpu") {
    const all: [string, (t: number) => number][] = [
      ["3D", (t) => sampleAt(t).gpu],
      ["Video Encode", (t) => 12 + noise(62, Math.floor(t / 3)) * 14],
      ["Compute 0", (t) => sampleAt(t).gpu * 0.22],
      ["Copy", (t) => sampleAt(t).gpu * 0.12 + noise(61, t) * 2],
      ["Video Decode", (t) => noise(63, Math.floor(t / 4)) * 6],
      ["Compute 1", (t) => noise(64, t) * 1.5],
    ];
    const engines = engineCount === "6" ? all : all.slice(0, 3);
    body = (
      <>
        <Head title="GPU 0" model={machine.gpu} />
        <div className="a-perf-tools">
          <Select
            label="표시 중인 엔진"
            value={engineCount}
            onChange={setEngineCount}
            title="차트의 시간 범위 안에서 사용 중인 엔진만"
            options={[
              { value: "smart", label: "스마트" },
              { value: "3", label: "엔진 3개" },
              { value: "6", label: "엔진 6개 모두" },
            ]}
          />
          <Segments
            label="엔진 차트 배치"
            value={engineLayout}
            onChange={setEngineLayout}
            items={[
              { value: "grid", label: "격자", title: "엔진 차트를 같은 크기로 나란히" },
              { value: "focus", label: "집중", title: "첫 번째 엔진을 크게, 나머지를 옆에" },
              { value: "rows", label: "목록", title: "엔진마다 한 행을 차지해 시간을 견주기 쉽게" },
            ]}
          />
        </div>
        <div className="a-chart-caption">
          <span>엔진 사용률</span>
          <span>100%</span>
        </div>
        <div className={"a-engines is-" + engineLayout}>
          {engines.map(([name, f]) => {
            const values = seriesOf(samples, (t) => Math.min(100, f(t)), p.tick);
            return (
              <Chart
                key={name}
                title={
                  <span className="a-engine-head">
                    {name}
                    <Icon name="chevronDown" size={12} />
                  </span>
                }
                top={
                  <b>
                    {Math.round(values[values.length - 1])}
                    <small style={{ color: "var(--a-ink-2)", fontWeight: 400 }}>%</small>
                  </b>
                }
                max={100}
                curve={curve}
                foot={false}
                color="var(--a-gpu)"
                series={[{ values, color: "var(--a-gpu)" }]}
              />
            );
          })}
        </div>
        <div className="a-engine-split" aria-hidden="true" />
        <div className="a-two">
          <Chart
            title="전용 GPU 메모리"
            top="8.0 GB"
            max={8}
            curve={curve}
            readout={{ format: gigabytes }}
            height={80}
            color="var(--a-gpu)"
            series={[{ values: seriesOf(samples, vram, p.tick), color: "var(--a-gpu)" }]}
          />
          <Chart
            title="공유 GPU 메모리"
            top="16.0 GB"
            max={16}
            curve={curve}
            readout={{ format: gigabytes }}
            height={80}
            color="var(--a-gpu)"
            series={[{ values: seriesOf(samples, (t) => 0.3 + noise(42, Math.floor(t / 5)) * 0.03, p.tick), color: "var(--a-gpu)" }]}
          />
        </div>
        <Stats
          figures={[
            ["사용률", Math.round(s.gpu), "%", "Windows 엔진"],
            ["전용 GPU 메모리", `${vram(p.tick).toFixed(1)} / 8.0`, "GB"],
            ["공유 GPU 메모리", "0.3 / 16.0", "GB"],
            ["GPU 온도", Math.round(gpuTemperature(p.tick)), "°C"],
            ["코어 클록", thousands(1650 + s.gpu * 4 + noise(43, p.tick) * 30), "MHz"],
            ["메모리 클록", "7,001", "MHz"],
            ["전력", Math.round(gpuPower(p.tick)), "W"],
          ]}
          specs={[
            ["전원 원본", "NVIDIA NVML · 보드"],
            ["드라이버 버전", "32.0.15.8157"],
            ["드라이버 날짜", "2026-10-08"],
            ["DirectX 버전", "12（FL 12_2）"],
            ["전원 제한", "115 W"],
            ["최대 온도", "105 °C"],
            ["엔진", "6"],
            ["최대 코어 클록", "3,105 MHz"],
          ]}
        />
      </>
    );
  } else {
    body = (
      <>
        <Head title="배터리" model="Contoso CT-4410" />
        <div className="a-stack is-fill">
          <Chart title="충전 수준" top="100%" max={100} curve={curve} color="var(--a-bat)" series={[{ values: seriesOf(samples, battery, p.tick), color: "var(--a-bat)" }]} />
          <Chart title="방전 속도" top="20 W" max={20} curve={curve} readout={{ format: watts }} color="var(--a-bat)" series={[{ values: seriesOf(samples, discharge, p.tick), color: "var(--a-bat)" }]} />
        </div>
        <Stats
          figures={[
            ["충전 수준", "84", "%"],
            ["상태", "배터리 사용 중"],
            ["방전 속도", Math.round(discharge(p.tick)), "W"],
            ["전압", (16.2 + noise(72, p.tick) * 0.05).toFixed(2), "V"],
            ["남은 시간", "2시간 31분"],
            ["상태", "90", "%"],
            ["주기 횟수", "120"],
          ]}
          specs={[
            ["현재 용량", "60.5 Wh"],
            ["최대 충전 용량", "72.0 Wh"],
            ["설계 용량", "80.0 Wh"],
            ["화학 구성", "리튬 이온"],
            ["제조업체", "Contoso"],
            ["모델", "CT-4410"],
            ["일련 번호", "0001"],
          ]}
        />
      </>
    );
  }
  // The list in its order, without the devices taken out of it.
  const listed = order.map((id) => rail.find((r) => r.id === id)!).filter((r) => !hidden.includes(r.id));
  const index = listed.findIndex((r) => r.id === p.device);
  const moving = markMoves.current;
  markMoves.current = true;
  // Hiding the device shown shows the one after it, or before it at the end.
  const hide = (id: Device, on: boolean) => {
    if (on && listed.length <= 1) return;
    p.onPages({ hidden: on ? [...hidden, id] : hidden.filter((d) => d !== id) });
    if (on && id === p.device) {
      const at = listed.findIndex((r) => r.id === id);
      p.onDevice((listed[at + 1] ?? listed[at - 1]).id);
    }
  };
  const deviceMenu = (event: ReactMouseEvent, target: Device | null) => {
    event.preventDefault();
    const item = target ? rail.find((r) => r.id === target) : undefined;
    p.onMenu(event, [
      ...(item
        ? ([
            {
              label: `${item.name} 숨기기`,
              icon: "eyeOff",
              disabled: listed.length <= 1,
              run: () => hide(item.id, true),
            },
            "-",
          ] satisfies MenuEntry[])
        : []),
      {
        label: "표시 중인 장치",
        icon: "eye",
        detail: `${listed.length}/${rail.length}`,
        children: order.map((id) => {
          const shown = !hidden.includes(id);
          return {
            label: rail.find((r) => r.id === id)!.name,
            checked: shown,
            disabled: shown && listed.length <= 1,
            stay: true,
            run: () => hide(id, shown),
          };
        }),
      },
      // One disk: nothing to order (the app's needs two).
      {
        label: "디스크 순서",
        icon: "order",
        disabled: true,
        children: [
          { label: "디스크 번호순", checked: true },
          { label: "드라이브 문자순" },
          { label: "사용자 지정(끌어서 정렬)" },
        ],
      },
      "-",
      { label: "기본 보기 복원", icon: "reset", disabled: !hidden.length, run: () => p.onPages({ hidden: [] }) },
      {
        label: "기본 순서 복원",
        icon: "reset",
        disabled: order.join() === defaultDevices.join(),
        run: () => p.onPages({ order: defaultDevices }),
      },
    ]);
  };
  // Dragging an entry up or down: it follows the pointer, the others make way,
  // and it settles into its new place when let go.
  const [dragging, setDragging] = useState<{ id: Device; dy: number; to: number } | null>(null);
  const dragged = useRef(false);
  const press = (event: ReactPointerEvent<HTMLButtonElement>, id: Device) => {
    if (event.button !== 0) return;
    const el = event.currentTarget;
    const k = scaleOf(el);
    const y0 = event.clientY;
    const from = listed.findIndex((r) => r.id === id);
    let started = false;
    dragged.current = false;
    const move = (e: PointerEvent) => {
      const dy = (e.clientY - y0) / k;
      if (!started) {
        if (Math.abs(dy) < 4) return;
        started = true;
        dragged.current = true;
        el.setPointerCapture(e.pointerId);
      }
      const to = Math.max(0, Math.min(listed.length - 1, from + Math.round(dy / ROW)));
      setDragging({ id, dy, to });
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      if (!started) return;
      setDragging((d) => {
        if (d && d.to !== from) {
          const ids = listed.map((r) => r.id);
          ids.splice(d.to, 0, ids.splice(from, 1)[0]);
          // The hidden devices keep their places among the rest.
          const next = [...ids];
          order.forEach((o, i) => hidden.includes(o) && next.splice(Math.min(i, next.length), 0, o));
          p.onPages({ order: next });
        }
        return null;
      });
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  const shift = (i: number, id: Device) => {
    if (!dragging) return 0;
    if (id === dragging.id) return dragging.dy;
    const from = listed.findIndex((r) => r.id === dragging.id);
    if (from < i && i <= dragging.to) return -ROW;
    if (dragging.to <= i && i < from) return ROW;
    return 0;
  };
  return (
    <div className="a-perf">
      <nav
        className={"a-rail" + (dragging ? " is-dragging" : "")}
        aria-label="장치"
        onContextMenu={(event) => event.target === event.currentTarget && deviceMenu(event, null)}
      >
        <span
          className={"a-rail-mark" + (moving ? " is-moving" : "")}
          style={{ transform: `translateY(${index * ROW + shift(index, p.device)}px)` }}
          aria-hidden="true"
        />
        {listed.map((item, i) => (
          <button
            key={item.id}
            type="button"
            className={"a-rail-item" + (dragging?.id === item.id ? " is-lifted" : "")}
            style={dragging ? { transform: `translateY(${shift(i, item.id)}px)` } : undefined}
            aria-current={p.device === item.id ? "true" : undefined}
            data-tour={"device-" + item.id}
            onPointerDown={(event) => press(event, item.id)}
            onClick={() => {
              if (dragged.current) dragged.current = false;
              else p.onDevice(item.id);
            }}
            onContextMenu={(event) => deviceMenu(event, item.id)}
          >
            <span className="a-rail-text">
              <b>{item.name}</b>
              <span>{item.info}</span>
            </span>
            <span className="a-rail-chart" style={{ "--c": item.color } as CSSProperties}>
              <Curve
                series={item.values.map((values, i) =>
                  i === 0 ? { values, color: item.color } : { values, color: item.color, fill: false, faint: true },
                )}
                max={item.max}
                {...curve}
              />
            </span>
          </button>
        ))}
      </nav>
      <div className="a-perf-gap" />
      <div className="a-perf-main a-scroll">
        {/* The view moves inside a clip: moved in the scroll area itself, its
            offset counted in the scroll range and showed a scrollbar. */}
        <div className="a-perf-stage">
          <div
            key={p.device}
            ref={view}
            className={
              "a-perf-body" +
              ((p.device === "cpu" && cpuPage === "details") || (p.device === "disk" && diskPage === "details") ? " is-details" : "")
            }
          >
            {body}
          </div>
        </div>
      </div>
    </div>
  );
}
