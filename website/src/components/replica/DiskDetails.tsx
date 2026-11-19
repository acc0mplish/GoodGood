/** @jsxImportSource @/components/replica/i18n */
"use client";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { machine, thousands } from "./model";
import { scaleOf, useIsoLayoutEffect } from "./widgets";

// The disk's details page as the app draws it (performance/disk_details.rs):
// health, device information and the NVMe SMART/health log as cards, read
// once each time the page opens and again from the head's button.

// The demo's clock: 21:36 when the window opened (Pages.tsx's history).
const START = 21 * 3600 + 36 * 60;
// An NVMe data unit is a thousand 512-byte sectors.
const UNIT = 512_000;
const TB = 1024 ** 4;
// Health tiles three a row where each gets 170 px, else one a row.
const TILE_MIN = 170;
const TILE_GAP = 24;
// Space between a table's columns, and between tables side by side.
const CELL_GAP = 12;
const GROUP_GAP = 28;
// Once no further table may stand beside it, a table is drawn at most this
// many times as wide as its text needs: width beyond that goes between the
// tables instead of between a name and its figures.
const TABLE_STRETCH = 2;
// How far names may be squeezed into wrapping before a row puts its figures
// under the name: down to this share of the widest name.
const NAME_SQUEEZE = 0.6;
// Groups side by side need the shortest column to reach this share of the
// tallest, as two parts of three.
const EVEN_COLUMNS = [2, 3];
// Remaining life at or below which the drive counts as worn.
const WORN = 10;

// What the drive reports. The live temperature is the overview's; the log
// is as it was when read, its counters moving on with the disk's activity.
const identity = {
  // Protocol identity first: Windows' generic serial can be the namespace's
  // EUI-64 instead of the manufacturer's SN (fictional values).
  sources: [
    { model: machine.disk, firmware: "4B2QJXD7", serial: "S7DPNJ0X402719K" },
    { model: "Samsung SSD 990 PRO 2TB", firmware: "4B2QJXD7", serial: "0025_3852_41B0_7C1E." },
  ],
  capacity: 2_000_398_934_016,
  warning: 90,
  critical: 95,
};
const pick = (field: "model" | "firmware" | "serial") =>
  identity.sources.map((s) => s[field].trim()).find(Boolean) ?? "—";
function healthLog(seconds: number) {
  const t = Math.max(0, seconds);
  return {
    criticalWarning: 0,
    availableSpare: 100,
    spareThreshold: 10,
    percentageUsed: 3,
    mediaErrors: 0,
    errorLogEntries: 0,
    dataUnitsRead: 38_215_904 + Math.floor(t * 61),
    dataUnitsWritten: 29_604_118 + Math.floor(t * 23),
    hostReadCommands: 412_906_537 + Math.floor(t * 1_480),
    hostWriteCommands: 318_442_091 + Math.floor(t * 620),
    controllerBusyMinutes: 1_734 + Math.floor(t / 600),
    powerCycles: 612,
    powerOnHours: 2_846 + Math.floor(t / 3600),
    unsafeShutdowns: 23,
    kelvin: 314,
    sensors: [314, 320],
    warningMinutes: 0,
    criticalMinutes: 0,
    transitions: [3, 0],
    thermalSeconds: [127, 0],
  };
}
type Log = ReturnType<typeof healthLog>;

// Critical warning bits, the reason each names and how bad it is: running
// hot is a caution, the rest mean the drive is failing.
const WARNINGS: [number, string, number][] = [
  [0x01, "사용 가능한 예비 영역이 임계값 미만", 2],
  [0x02, "온도가 임계값을 초과", 1],
  [0x04, "신뢰성 저하", 2],
  [0x08, "미디어가 읽기 전용 모드로 전환됨", 2],
  [0x10, "휘발성 메모리 백업 실패", 2],
  [0x20, "영구 메모리 영역이 읽기 전용", 2],
];
const STATUS = ["양호", "주의", "나쁨"];
// Each condition's colour, which the health bars share: the life bar the
// status's, the temperature its condition against the drive's thresholds,
// the spare green until it falls below its threshold.
const TONE = ["var(--a-net)", "var(--a-io)", "var(--a-danger)"];
const life = (log: Log) => Math.max(0, 100 - log.percentageUsed);
const spareLow = (log: Log) => log.availableSpare < log.spareThreshold;
function warnings(log: Log) {
  const named = WARNINGS.filter(([bit]) => log.criticalWarning & bit);
  // A later revision may define more bits: worth a look, not a verdict.
  if (log.criticalWarning & ~0x3f) named.push([0, "기타 심각한 경고", 1]);
  return named;
}
// The drive's condition and the reasons for it; the warning bits are kept
// apart from the remaining life.
function assess(log: Log): [number, string[]] {
  const found = warnings(log);
  if (spareLow(log) && !(log.criticalWarning & 0x01)) found.push([0x01, "사용 가능한 예비 영역이 임계값 미만", 2]);
  if (log.mediaErrors > 0) found.push([0, "미디어 및 데이터 무결성 오류 있음", 1]);
  if (life(log) <= WORN) found.push([0, "수명 10% 이하 남음", 1]);
  return [Math.max(0, ...found.map(([, , level]) => level)), found.map(([, reason]) => reason)];
}
// How hot the drive runs against the thresholds it reports: a condition, as
// the health status's, so that the bar takes the same colours.
const temperatureCondition = (celsius: number, warning?: number, critical?: number) =>
  critical !== undefined && celsius >= critical ? 2 : warning !== undefined && celsius >= warning ? 1 : 0;
// Reasons in a list, each translated on its own.
const list = (reasons: string[]) => reasons.flatMap((reason, i) => (i ? ["、", reason] : [reason]));
const capacity = (bytes: number) => (bytes >= TB ? (bytes / TB).toFixed(1) + " TB" : Math.round(bytes / 1024 ** 3) + " GB");
const celsius = (kelvin: number) => Math.round(kelvin - 273.15) + " °C";
function clockText(seconds: number) {
  const s = ((Math.round(seconds) % 86400) + 86400) % 86400;
  const pad = (v: number) => String(Math.floor(v)).padStart(2, "0");
  return `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`;
}

// Splits weights into at most `columns` runs, in order, keeping the tallest
// run as short as possible: its height and the run lengths.
function balance(weights: number[], columns: number): [number, number[]] {
  const sum = (w: number[]) => w.reduce((a, b) => a + b, 0);
  if (columns <= 1 || weights.length <= 1) return [sum(weights), [weights.length]];
  let best: [number, number[]] = [Infinity, []];
  for (let first = 1; first < weights.length; first++) {
    const [rest, runs] = balance(weights.slice(first), columns - 1);
    const tallest = Math.max(rest, sum(weights.slice(0, first)));
    if (tallest < best[0]) best = [tallest, [first, ...runs]];
  }
  return best;
}

// How groups of rows share the tables that fit side by side: whole groups
// in each column where that leaves the columns about even (how many each
// takes), otherwise null, for each group's rows across the width, so that a
// short group does not leave the space under it empty.
function arrange(rows: number[], tables: number): number[] | null {
  if (tables <= 1 || rows.length <= 1) return [rows.length];
  // Each group's rows plus its header and the gap under it.
  const weights = rows.map((count) => count + 2);
  const [tallest, runs] = balance(weights, tables);
  let taken = 0;
  const heights = runs.map((run) => {
    const height = weights.slice(taken, taken + run).reduce((a, b) => a + b, 0);
    taken += run;
    return height;
  });
  const [part, whole] = EVEN_COLUMNS;
  return runs.length === tables && Math.min(...heights) * whole >= tallest * part ? runs : null;
}
// How tables are drawn in the width there is: how many stand side by side,
// the widest one is drawn, how wide each column of figures is, and whether
// the figures go under the name. Columns are as wide as their text, so a name
// and its figures sit as close as the width allows; width left over goes
// evenly to the columns of figures, which are right-aligned.
function fitTables(width: number, name: number, cells: number[], most: number) {
  const figures = cells.reduce((a, b) => a + b, 0) + CELL_GAP * cells.length;
  const natural = name + figures;
  const tables = Math.max(1, Math.min(most, Math.floor((width + GROUP_GAP) / (natural + GROUP_GAP))));
  const share = (width - GROUP_GAP * (tables - 1)) / tables;
  const limit = tables === most && share > natural * TABLE_STRETCH ? natural * TABLE_STRETCH : undefined;
  const each = limit ?? share;
  const spare = Math.max(0, (each - natural) / Math.max(1, cells.length));
  return { tables, limit, cells: cells.map((cell) => Math.floor(cell + spare)), stacked: each < figures + name * NAME_SQUEEZE };
}

interface Attribute {
  name: string;
  value: ReactNode;
  raw: string;
  alert?: boolean;
}
// The SMART/health log's fields in three groups: health, usage and temperature.
function attributes(log: Log): [string, Attribute[]][] {
  const n = thousands;
  const named = warnings(log).map(([, reason]) => reason);
  return [
    [
      "상태",
      [
        {
          name: "심각한 경고",
          value: named.length ? list(named) : "없음",
          raw: "0x" + log.criticalWarning.toString(16).toUpperCase().padStart(2, "0"),
          alert: log.criticalWarning !== 0,
        },
        { name: "사용 가능한 예비 영역", value: log.availableSpare + "%", raw: n(log.availableSpare), alert: spareLow(log) },
        { name: "사용 가능한 예비 영역 임계값", value: log.spareThreshold + "%", raw: n(log.spareThreshold) },
        { name: "사용 비율", value: log.percentageUsed + "%", raw: n(log.percentageUsed), alert: life(log) <= WORN },
        { name: "미디어 및 데이터 무결성 오류", value: n(log.mediaErrors), raw: n(log.mediaErrors), alert: log.mediaErrors > 0 },
        { name: "오류 로그 항목", value: n(log.errorLogEntries), raw: n(log.errorLogEntries) },
      ],
    ],
    [
      "사용량",
      [
        { name: "읽은 데이터 단위", value: capacity(log.dataUnitsRead * UNIT), raw: n(log.dataUnitsRead) },
        { name: "쓴 데이터 단위", value: capacity(log.dataUnitsWritten * UNIT), raw: n(log.dataUnitsWritten) },
        { name: "호스트 읽기 명령", value: n(log.hostReadCommands), raw: n(log.hostReadCommands) },
        { name: "호스트 쓰기 명령", value: n(log.hostWriteCommands), raw: n(log.hostWriteCommands) },
        { name: "컨트롤러 사용 중 시간", value: n(log.controllerBusyMinutes) + "분", raw: n(log.controllerBusyMinutes) },
        { name: "전원 주기", value: n(log.powerCycles), raw: n(log.powerCycles) },
        { name: "전원 켜진 시간", value: n(log.powerOnHours) + "시간", raw: n(log.powerOnHours) },
        { name: "비정상 종료", value: n(log.unsafeShutdowns), raw: n(log.unsafeShutdowns) },
      ],
    ],
    [
      "온도",
      [
        { name: "복합 온도", value: celsius(log.kelvin), raw: n(log.kelvin) },
        ...log.sensors.map((kelvin, i) => ({ name: `온도 센서 ${i + 1}`, value: celsius(kelvin), raw: n(kelvin) })),
        { name: "경고 온도 시간", value: n(log.warningMinutes) + "분", raw: n(log.warningMinutes) },
        { name: "위험 온도 시간", value: n(log.criticalMinutes) + "분", raw: n(log.criticalMinutes) },
        ...log.transitions.map((count, i) => ({ name: `열 관리 온도 ${i + 1} 전환 횟수`, value: n(count), raw: n(count) })),
        ...log.thermalSeconds.map((s, i) => ({ name: `열 관리 온도 ${i + 1} 총 시간`, value: n(s) + "초", raw: n(s) })),
      ],
    ],
  ];
}

function Card({
  title,
  note,
  summary,
  alert,
  children,
}: {
  title: string;
  note?: string;
  summary?: string;
  alert?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={"a-card" + (alert ? " is-alert" : "")}>
      <div className="a-card-head">
        <b>
          {title}
          {note && <small className="a-card-note">{note}</small>}
        </b>
        <span>{summary}</span>
      </div>
      {children}
    </section>
  );
}
// A figure, a level bar (0–1) with an optional mark such as a threshold, and a line or two under it.
function Tile({
  label,
  figure,
  level,
  mark,
  color,
  caption,
  alert,
}: {
  label: string;
  figure: ReactNode;
  level: number;
  mark?: number;
  color: string;
  caption?: ReactNode;
  alert?: [ReactNode, string];
}) {
  const unit = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) * 100 + "%" : "0%");
  return (
    <div className="a-disk-tile">
      <span className="a-disk-label">{label}</span>
      <div className="a-disk-figure">{figure}</div>
      <div className="a-disk-meter" style={{ "--c": color } as CSSProperties}>
        <i style={{ width: unit(level) }} />
        {mark !== undefined && <b style={{ left: unit(mark) }} />}
      </div>
      {caption && <p>{caption}</p>}
      {alert && <p style={{ color: alert[1] }}>{alert[0]}</p>}
    </div>
  );
}
function Reading({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="a-disk-reading">
      <span>{label}</span>
      <b>
        {value}
        {unit && <small>{unit}</small>}
      </b>
    </div>
  );
}
// "17.8 TB" as a reading's figure and unit.
const reading = (text: string) => {
  const at = text.lastIndexOf(" ");
  return { value: text.slice(0, at), unit: text.slice(at + 1) };
};

// The card column's width, less a card's padding and border, and the text scale.
function useCardWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 1240, text: 1 });
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const width = el.offsetWidth - 34;
      const text = parseFloat(getComputedStyle(el).fontSize) / 13 || 1;
      setBox((b) => (b.width === width && b.text === text ? b : { width, text }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, box] as const;
}

export default function DiskDetails({ read, interval }: { read: number; interval: number }) {
  const [ref, { width, text }] = useCardWidth();
  const [serialShown, setSerialShown] = useState(false);
  const seconds = (read * interval) / 1000;
  const log = healthLog(seconds);
  const [condition, reasons] = assess(log);
  const left = life(log);
  // The live reading, as on the overview; the bar runs to the critical
  // temperature, its mark at the warning one.
  const temperature = 41;
  const top = Math.max(1, identity.critical);
  const tiles = width >= 3 * TILE_MIN + 2 * TILE_GAP ? 3 : 1;
  const wide = width >= 2 * 300 + GROUP_GAP;
  const groups = attributes(log);
  // The widest name (or group title) and the widest of each column of
  // figures, as the page's language and text size draw them: read off a
  // hidden copy of the texts, a pixel to spare.
  const ruler = useRef<HTMLDivElement>(null);
  const [needs, setNeeds] = useState({ name: 150 * text, cells: [72 * text, 88 * text] });
  useIsoLayoutEffect(() => {
    const el = ruler.current;
    if (!el || el.children.length < 3) return;
    const k = scaleOf(el);
    const [name, ...cells] = [0, 1, 2].map((i) => Math.ceil(el.children[i].getBoundingClientRect().width / k) + 1);
    setNeeds((n) => (n.name === name && n.cells.every((cell, i) => cell === cells[i]) ? n : { name, cells }));
  });
  const sheet = fitTables(width, needs.name, needs.cells, groups.length);
  const runs = arrange(
    groups.map(([, rows]) => rows.length),
    sheet.tables,
  );
  const figure = (content: ReactNode, column: number, className?: string) => (
    <span className={"a-smart-cell" + (className ? " " + className : "")} style={{ width: sheet.cells[column] }}>
      {content}
    </span>
  );
  // A table continuing a group keeps the header's height without its title.
  const table = (title: string | null, rows: Attribute[]) => (
    <div className="a-smart-table" key={rows[0].name}>
      <div className={"a-smart-row is-head" + (sheet.stacked ? " is-stacked" : "")}>
        <span className="a-smart-name">{title ?? "\u00a0"}</span>
        <span className="a-smart-figures">
          {figure("값", 0)}
          {figure("원시 값", 1)}
        </span>
      </div>
      {rows.map((row) => (
        <div className={"a-smart-row" + (sheet.stacked ? " is-stacked" : "")} key={row.name}>
          <span className="a-smart-name" data-i18n="smart">
            {row.name}
          </span>
          <span className="a-smart-figures">
            {figure(row.value, 0, row.alert ? "is-alert" : undefined)}
            {figure(row.raw, 1, "is-raw")}
          </span>
        </div>
      ))}
    </div>
  );
  const lane = (key: number, children?: ReactNode) => (
    <div className="a-smart-lane" key={key} style={{ maxWidth: sheet.limit }}>
      {children}
    </div>
  );
  const serial = pick("serial");
  const identityRows: [string, ReactNode][] = [
    ["모델", pick("model")],
    ["펌웨어", pick("firmware")],
    [
      "일련 번호",
      // Hidden until asked for: pages like this one end up in screenshots.
      <div className="a-disk-serial">
        {serialShown ? serial : "•".repeat(12)}
        <button type="button" onClick={() => setSerialShown((v) => !v)}>
          {serialShown ? "숨기기" : "표시"}
        </button>
      </div>,
    ],
    ["용량", `${capacity(identity.capacity)}(${thousands(identity.capacity)}바이트)`],
    ["볼륨", "C:"],
  ];
  const linkRows: [string, ReactNode][] = [
    ["인터페이스", "NVMe"],
    ["전송 모드", "PCIe 4.0 ×4"],
    ["표준", "NVMe 2.0"],
    ["섹터 크기", "논리 512B, 물리 4KB"],
    [
      "기능",
      <div className="a-disk-tags">
        {["SMART", "TRIM", "휘발성 쓰기 캐시"].map((feature) => (
          <span key={feature}>{feature}</span>
        ))}
      </div>,
    ],
  ];
  const specs = (rows: [string, ReactNode][]) => (
    <dl className="a-specs">
      {rows.map(([label, value]) => [<dt key={label + ":t"}>{label}</dt>, <dd key={label + ":d"}>{value}</dd>])}
    </dl>
  );
  return (
    <div className="a-cards a-disk" ref={ref}>
      <Card title="상태" summary={`${clockText(START + seconds)}에 읽음`} alert={condition === 2}>
        <div className="a-disk-tiles" style={{ gridTemplateColumns: `repeat(${tiles}, minmax(0, 1fr))` }}>
          <Tile
            label="상태"
            figure={
              <span className="a-disk-state" style={{ "--c": TONE[condition] } as CSSProperties}>
                {STATUS[condition]}
              </span>
            }
            level={left / 100}
            color={TONE[condition]}
            caption={`남은 수명 ${left}%`}
            alert={reasons.length ? [list(reasons), condition === 2 ? "var(--a-danger)" : "var(--a-ink)"] : undefined}
          />
          <Tile
            label="온도"
            figure={
              <>
                {temperature}
                <small>°C</small>
              </>
            }
            level={temperature / top}
            mark={identity.warning / top}
            color={TONE[temperatureCondition(temperature, identity.warning, identity.critical)]}
            caption={[`경고 ${identity.warning}°C`, " · ", `심각 ${identity.critical}°C`]}
          />
          <Tile
            label="사용 가능한 예비 영역"
            figure={
              <>
                {log.availableSpare}
                <small>%</small>
              </>
            }
            level={log.availableSpare / 100}
            mark={log.spareThreshold / 100}
            color={spareLow(log) ? "var(--a-danger)" : TONE[0]}
            caption={`임계값 ${log.spareThreshold}%`}
          />
        </div>
        <div className="a-disk-readings">
          <Reading label="총 읽기" {...reading(capacity(log.dataUnitsRead * UNIT))} />
          <Reading label="총 쓰기" {...reading(capacity(log.dataUnitsWritten * UNIT))} />
          <Reading label="전원 켜진 시간" value={thousands(log.powerOnHours)} unit="시간" />
          <Reading label="전원 주기" value={thousands(log.powerCycles)} />
          <Reading label="비정상 종료" value={thousands(log.unsafeShutdowns)} />
          <Reading label="미디어 오류" value={thousands(log.mediaErrors)} />
        </div>
      </Card>
      <Card title="장치 정보">
        {wide ? (
          <div className="a-disk-device">
            {specs(identityRows)}
            {specs(linkRows)}
          </div>
        ) : (
          specs([...identityRows, ...linkRows])
        )}
      </Card>
      <Card title="SMART 특성" note="NVMe 상태 로그">
        <div className="a-smart">
          <div className="a-smart-ruler" ref={ruler} aria-hidden="true">
            {groups.map(([group, rows]) => [
              <b key={group}>{group}</b>,
              <span key={group + ":v"}>값</span>,
              <span key={group + ":r"}>원시 값</span>,
              ...rows.flatMap((row) => [
                <span key={row.name} data-i18n="smart">
                  {row.name}
                </span>,
                <span key={row.name + ":v"}>{row.value}</span>,
                <span key={row.name + ":r"}>{row.raw}</span>,
              ]),
            ])}
          </div>
          {runs ? (
            // Whole groups in each column, in order.
            <div className="a-smart-lanes">
              {runs.map((run, column) => {
                const from = runs.slice(0, column).reduce((a, b) => a + b, 0);
                return lane(
                  column,
                  groups.slice(from, from + run).map(([group, rows]) => table(group, rows)),
                );
              })}
            </div>
          ) : (
            // The groups one under another, each one's rows across the tables.
            <div className="a-smart-bands">
              {groups.map(([group, rows]) => {
                // No table of a single row while another has several.
                const tables = Math.max(1, Math.min(sheet.tables, Math.ceil(rows.length / 2)));
                const size = Math.max(1, Math.ceil(rows.length / tables));
                // Every band keeps the same columns.
                return (
                  <div className="a-smart-lanes" key={group}>
                    {Array.from({ length: sheet.tables }, (_, i) => {
                      const chunk = rows.slice(i * size, (i + 1) * size);
                      return lane(i, chunk.length ? table(i ? null : group, chunk) : undefined);
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
