/** @jsxImportSource @/components/replica/i18n */
"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { setLanguage, translate, type Language } from "../replica/i18n";
import { store, useShared } from "../replica/store";

// A guided demo of the window above it, in chapters the visitor can pick: a
// cursor walks through each page, its menus and dialogs, then the tray, until
// the visitor moves the mouse over the window, clicks or presses a key.
type Find = (app: HTMLElement, stage: HTMLElement) => Element | null | undefined;
interface Step {
  label: string;
  find?: Find;
  // What the cursor does there: a click by default.
  type?: string;
  menu?: boolean;
  at?: number;
  sweep?: [number, number];
  run?: () => void;
  hold?: number;
}
interface Chapter {
  label: string;
  steps: Step[];
}
// Targets are found by their text as the page shows it, in its language.
const byText = (root: ParentNode, selector: string, text: string) =>
  [...root.querySelectorAll(selector)].find((el) => el.textContent?.trim().startsWith(translate(text)));
const labelled = (selector: string, label: string) => `${selector}[aria-label="${translate(label)}"]`;
const nav = (id: string, text: string): Find => (app) =>
  app.querySelector(`[data-tour="nav-${id}"]`) ?? byText(app, ".a-nav button", text);
const tour = (id: string): Find => (app) => app.querySelector(`[data-tour="${id}"]`);
const titled = (title: string): Find => (app) => app.querySelector(`button[title="${translate(title)}"]`);
const segment = (text: string): Find => (app) => byText(app, ".a-window button[aria-checked]", text);
let startupItem = "";

const chapters: Chapter[] = [
  {
    label: "프로세스",
    steps: [
      { label: "프로세스 페이지 열기", find: nav("processes", "프로세스") },
      { label: "CPU 사용량 순으로 정렬", find: tour("col-cpu") },
      { label: "사용량이 가장 높은 프로세스를 선택해 세부 정보 확인", find: (a) => a.querySelector(".a-tbody .a-tr[data-key]") },
      { label: "상황에 맞는 메뉴: 프로세스 트리 끝내기, 우선 순위, 효율성 모드와 규칙", find: (a) => a.querySelector(".a-tbody .a-tr.is-selected, .a-tbody .a-tr[data-key]"), menu: true, hold: 2200 },
      { label: "해당 프로세스에 효율성 모드 적용", find: (a) => byText(a, ".a-menu [role^=menuitem]", "효율성 모드") },
      { label: "프로세스 트리로 전환해 부모와 자식 관계로 확인", find: tour("view-tree") },
      // The tree starts folded to its roots: the header's menu opens every branch.
      { label: "모두 펼치기", find: tour("col-name"), menu: true },
      { label: "모두 펼치기", find: (a) => byText(a, ".a-menu [role^=menuitem]", "모두 펼치기") },
      { label: "앱별 그룹으로 돌아가기", find: tour("view-apps") },
      { label: "이름 순으로 정렬", find: tour("col-name") },
    ],
  },
  {
    label: "성능",
    steps: [
      { label: "성능 페이지 열기", find: nav("performance", "성능") },
      { label: "CPU: 사용률, 주파수, 온도와 전력", find: tour("device-cpu") },
      { label: "곡선 위에 마우스를 올려 임의 시점의 값 확인", find: (a) => a.querySelector(".a-chart .curve.is-readout"), sweep: [0.92, 0.3], hold: 2600 },
      { label: "논리 프로세서마다 곡선 하나, 성능 코어와 효율 코어 구분", find: tour("graph-logical") },
      { label: "메모리 사용 현황 확인", find: tour("device-memory") },
      { label: "디스크의 읽기·쓰기 속도와 활성 시간 확인", find: tour("device-disk") },
      { label: "디스크 세부 정보: 상태, 남은 수명과 SMART 속성", find: (a) => [...a.querySelectorAll<HTMLElement>(".a-disk-controls .a-seg button")].at(-1), hold: 2600 },
      { label: "그래픽 장치의 엔진 사용률과 전용 메모리 확인", find: tour("device-gpu") },
    ],
  },
  {
    label: "연결",
    steps: [
      { label: "연결 페이지 열기", find: nav("connections", "연결") },
      { label: "포트로 해당 포트를 사용하는 프로세스 찾기", find: (a) => a.querySelector('[data-tour="search"]') ?? a.querySelector(".a-search input"), type: "443" },
      { label: "연결을 선택해 로컬·원격 엔드포인트 확인", find: (a) => a.querySelector(".a-connections .a-tr") },
    ],
  },
  {
    label: "서비스",
    steps: [
      { label: "서비스 페이지 열기", find: nav("services", "서비스") },
      {
        label: "실행 중인 서비스 선택",
        find: (a) => [...a.querySelectorAll(".a-services .a-tr")].find((row) => row.textContent?.includes(translate("실행 중"))),
      },
      { label: "서비스 다시 시작, 상태가 곧바로 갱신됨", find: titled("서비스 다시 시작"), hold: 2400 },
    ],
  },
  {
    label: "시작 프로그램",
    steps: [
      { label: "시작 프로그램 페이지 열기", find: nav("startup", "시작 프로그램") },
      {
        label: "로그인 시 시작되는 항목 사용 안 함, 다음 로그인부터 적용",
        find: (a) => {
          const toggle = a.querySelector<HTMLElement>('.a-startup button[role="switch"][aria-checked="true"]');
          startupItem = toggle?.dataset.startup ?? "";
          return toggle;
        },
      },
      {
        label: "해당 항목 다시 사용",
        find: (a) => a.querySelector(`.a-startup button[data-startup="${CSS.escape(startupItem)}"][aria-checked="false"]`),
      },
    ],
  },
  {
    label: "기록",
    steps: [
      { label: "기록 페이지 열기, 최근 7일 기록이 이 PC에 저장됨", find: nav("history", "기록") },
      { label: "시간 범위 전환", find: segment("1일") },
      { label: "임의 시점을 선택해 그때 가장 사용량이 많았던 프로세스 확인", find: (a) => a.querySelector(".a-history-plot"), at: 0.36, hold: 2600 },
    ],
  },
  {
    label: "도구",
    steps: [
      { label: "새 작업 실행, 관리자 권한으로 실행 선택 가능", find: titled("새 작업 실행") },
      { label: "프로그램 이름이나 경로 입력", find: (a) => a.querySelector("#a-task-input"), type: "notepad.exe" },
      { label: "대화 상자 닫기", find: (a) => byText(a, ".a-dialog.is-task .a-dialog-foot button", "취소") },
      { label: "파일을 사용하는 프로세스 찾기, 창에 파일을 끌어다 놓아도 됨", find: titled("파일 사용 현황 찾기(창에 파일을 끌어다 놓아도 됨)") },
      {
        label: "해당 파일을 사용하는 프로세스를 나열하고 바로 끝내기",
        find: (a) => a.querySelector(".a-dialog.is-lock"),
        run: () => store.set({ command: { action: "lock", names: [translate("회의록.txt")], at: Date.now() } }),
        hold: 2800,
      },
      { label: "대화 상자 닫기", find: (a) => a.querySelector(".a-dialog.is-lock .a-dialog-foot [data-primary]") },
    ],
  },
  {
    label: "설정",
    steps: [
      { label: "설정 페이지 열기", find: nav("settings", "설정") },
      { label: "밝은 테마로 전환", find: segment("밝게") },
      { label: "어두운 테마로 전환", find: segment("어둡게") },
      { label: "테마를 시스템 설정에 따름", find: segment("시스템") },
      { label: "정보 페이지를 열어 버전, 현재 권한과 프로젝트 정보 확인", find: nav("about", "정보"), hold: 2200 },
    ],
  },
  {
    label: "알림 영역",
    steps: [
      { label: "창 최대화", find: (a) => a.querySelector(labelled(".a-caption ", "최대화")) },
      { label: "이전 크기로 복원", find: (a) => a.querySelector(labelled(".a-caption ", "이전 크기로 복원")) },
      { label: "닫아도 알림 영역에 남아 샘플링, 기록과 규칙이 계속 동작", find: (a) => a.querySelector(labelled(".a-caption ", "닫기")), hold: 2400 },
      { label: "작업 표시줄의 숨겨진 아이콘 열기", find: (_, s) => s.querySelector(".tb-tray > .tb-small") },
      { label: "알림 영역 아이콘을 클릭하면 창이 표시되며 Ctrl+Alt+Esc로도 가능", find: (_, s) => s.querySelector(".tb-flyout .tb-small") },
    ],
  },
];

// Headless checks can advance the complete tour without changing app timings.
const tourScale = () => Math.min(1, Math.max(0.1, (globalThis as { __goodgoodTourTestScale?: number }).__goodgoodTourTestScale ?? 1));
const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, Math.max(80, ms * tourScale()));
    signal.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("stopped", "AbortError"));
    });
  });
function setValue(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
// Runs step on every frame for ms, with progress from 0 to 1 eased in and out.
const glide = (ms: number, signal: AbortSignal, step: (progress: number) => void) =>
  new Promise<void>((resolve, reject) => {
    const begin = performance.now();
    let frame = requestAnimationFrame(function next(now) {
      const t = Math.min(1, (now - begin) / (ms * tourScale()));
      step((1 - Math.cos(Math.PI * t)) / 2);
      if (t < 1) frame = requestAnimationFrame(next);
      else resolve();
    });
    signal.addEventListener("abort", () => {
      cancelAnimationFrame(frame);
      reject(new DOMException("stopped", "AbortError"));
    });
  });
// A point across the element, in the middle of its height.
const pointIn = (el: Element, fx: number) => {
  const r = el.getBoundingClientRect();
  return { clientX: r.left + r.width * fx, clientY: r.top + r.height / 2 };
};

export default function HeroTour({ lang = "ko" }: { lang?: Language }) {
  setLanguage(lang);
  const self = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"waiting" | "playing" | "paused">("waiting");
  const [label, setLabel] = useState("");
  const [visible, setVisible] = useState(false);
  // The chapter on show, how far into it, and where the next run starts.
  const [chapter, setChapter] = useState(0);
  const [progress, setProgress] = useState(0);
  const [start, setStart] = useState({ chapter: 0, at: 0 });
  const touched = useRef(false);
  const [full, setFull] = useState(false);
  // The note on what the demo is: shown under the pointer or focus, and on a tap.
  const [note, setNote] = useState(false);
  const { request } = useShared();
  // A comparison row asked the window to show a page: the visitor has taken over.
  useEffect(() => {
    if (!request) return;
    touched.current = true;
    setMode((m) => (m === "playing" || m === "waiting" ? "paused" : m));
  }, [request]);

  // Full screen shows the desktop at its own 1920 × 1080 where the screen allows;
  // without the Fullscreen API (iPhone Safari) the stage covers the page instead.
  useEffect(() => {
    const stage = self.current?.closest<HTMLElement>(".stage");
    if (!stage) return;
    stage.classList.toggle("is-full", full);
    if (full && stage.requestFullscreen && !document.fullscreenElement) stage.requestFullscreen().catch(() => {});
    if (!full && document.fullscreenElement === stage) document.exitFullscreen().catch(() => {});
    const exit = () => document.fullscreenElement !== stage && setFull(false);
    const key = (event: KeyboardEvent) => event.key === "Escape" && setFull(false);
    document.addEventListener("fullscreenchange", exit);
    if (full) document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("fullscreenchange", exit);
      document.removeEventListener("keydown", key);
    };
  }, [full]);

  // Watch the stage, and hand over to the visitor at their first real input.
  useEffect(() => {
    const stage = self.current?.closest(".stage") as HTMLElement | null;
    if (!stage) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.intersectionRatio > 0.45), {
      threshold: [0, 0.45, 0.8],
    });
    io.observe(stage);
    const take = (event: Event) => {
      if (!event.isTrusted) return;
      if (event.target instanceof Element && event.target.closest(".tour-bar")) return;
      touched.current = true;
      setMode((m) => (m === "playing" || m === "waiting" ? "paused" : m));
    };
    // Anything in the window takes over, and so does a click on the taskbar.
    const parts: [Element, string[]][] = [
      [stage.querySelector(".window") ?? stage, ["pointerdown", "wheel", "keydown", "dragenter", "pointermove"]],
      [stage.querySelector(".taskbar") ?? stage, ["pointerdown", "keydown"]],
    ];
    for (const [el, types] of parts) for (const type of types) el.addEventListener(type, take, true);
    return () => {
      io.disconnect();
      for (const [el, types] of parts) for (const type of types) el.removeEventListener(type, take, true);
    };
  }, []);

  // Start on its own once the window has hydrated and is in view, unless motion is reduced.
  useEffect(() => {
    if (mode !== "waiting" || !visible || touched.current) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMode("paused");
      return;
    }
    // The window hydrates with this component; it only has to be there.
    const id = setTimeout(() => {
      if (document.querySelector(".stage .goodgood-app")) setMode("playing");
    }, 1800);
    return () => clearTimeout(id);
  }, [mode, visible]);

  useEffect(() => {
    if (mode !== "playing" || !visible) return;
    const stage = self.current?.closest(".stage") as HTMLElement | null;
    const app = stage?.querySelector<HTMLElement>(".goodgood-app");
    const pointer = cursor.current;
    if (!stage || !app || !pointer) return;
    const control = new AbortController();
    const { signal } = control;
    const move = (x: number, y: number) => {
      const box = stage.getBoundingClientRect();
      pointer.style.transform = `translate(${x - box.left}px, ${y - box.top}px)`;
    };
    const press = () => {
      pointer.classList.remove("is-press");
      void pointer.offsetWidth;
      pointer.classList.add("is-press");
    };
    // Each chapter starts from a quiet window: no menu or dialog, not in the tray.
    const settle = async () => {
      if (app.querySelector(".a-menu, .a-dialog")) {
        app.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        await wait(300, signal);
      }
      if (app.classList.contains("is-tray")) {
        store.set({ command: { action: "show", at: Date.now() } });
        await wait(500, signal);
      }
    };
    const act = async (step: Step, target: HTMLElement) => {
      const r = target.getBoundingClientRect();
      const fx = step.sweep?.[0] ?? step.at;
      const x = fx === undefined ? Math.min(r.left + Math.min(r.width / 2, 60), r.right - 6) : r.left + r.width * fx;
      const y = r.top + r.height / 2;
      move(x, y);
      await wait(760, signal);
      if (step.sweep) {
        // The pointer glides along the curve and the readout follows it on
        // every frame, as it follows a real pointer.
        const [from, to] = step.sweep;
        pointer.style.transition = "opacity 300ms ease";
        await glide(1700, signal, (progress) => {
          const at = pointIn(target, from + (to - from) * progress);
          target.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, ...at }));
          move(at.clientX, at.clientY);
        });
        await wait((step.hold ?? 1500) - 900, signal);
        pointer.style.transition = "";
        target.dispatchEvent(new PointerEvent("pointerout", { bubbles: true, relatedTarget: stage }));
        return;
      }
      press();
      if (step.run) step.run();
      else if (step.type !== undefined && target instanceof HTMLInputElement) {
        target.focus({ preventScroll: true });
        setValue(target, "");
        for (const ch of step.type) {
          await wait(130, signal);
          setValue(target, target.value + ch);
        }
      } else if (step.menu)
        target.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: x, clientY: y }));
      else if (step.at !== undefined) target.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: x, clientY: y }));
      else target.click();
      await wait(step.hold ?? (step.type ? 1700 : 1500), signal);
    };
    (async () => {
      pointer.classList.add("is-on");
      for (let c = start.chapter; ; c = (c + 1) % chapters.length) {
        setChapter(c);
        setProgress(0);
        await settle();
        const { steps } = chapters[c];
        for (const [i, step] of steps.entries()) {
          // A step that leads off the page waits for what the step before it opened.
          let target = step.find?.(app, stage);
          if (!target && step.run) target = app;
          (globalThis as { __goodgoodTourTrace?: { chapter: number; step: number; found: boolean; label: string }[] }).__goodgoodTourTrace?.push({ chapter: c, step: i, found: target instanceof HTMLElement, label: translate(step.label) });
          if (!(target instanceof HTMLElement)) continue;
          setLabel(step.label);
          setProgress((i + 1) / steps.length);
          await act(step, target);
        }
      }
    })().catch(() => {});
    return () => {
      control.abort();
      pointer.classList.remove("is-on");
      pointer.style.transition = "";
    };
  }, [mode, visible, start]);

  const playing = mode === "playing";
  return (
    <div className="tour" ref={self}>
      <div className="tour-cursor" ref={cursor} aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 22 22">
          <path d="M4 2.5 17.5 11l-6.2 1.4 3.6 6.6-2.6 1.4-3.6-6.6L4 18.2z" />
        </svg>
        <i />
      </div>
      <div className="tour-bar">
        <div className={"tour-chip" + (playing ? " is-playing" : "")}>
          <span className="tour-dot" aria-hidden="true" />
          <span className="tour-text" aria-live="polite">
            {playing ? label : mode === "paused" ? "데모가 일시 중지되었습니다. 창을 직접 조작할 수 있습니다" : "인터페이스 데모 · 모의 데이터"}
          </span>
          <span className="tour-note" data-open={note ? "" : undefined}>
            <button
              type="button"
              className="tour-note-button"
              aria-label="이 데모 정보"
              aria-describedby="tour-note"
              aria-expanded={note}
              onClick={() => setNote(!note)}
              onBlur={() => setNote(false)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5.5M12 7.6v.1" />
              </svg>
            </button>
            <span className="tour-note-tip" role="tooltip" id="tour-note">
              이 데모는 웹에서 GoodGood의 인터페이스와 상호 작용을 재현한 것으로 참고용입니다. 브라우저 기술의 한계로 애니메이션, 부드러움과 세부 동작이 실제 프로그램과 다를 수 있으며 새 버전의 기능이 아직 반영되지 않았을 수 있습니다. 실제 프로그램을 기준으로 하십시오.
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              touched.current = playing;
              if (!playing) setStart({ chapter, at: Date.now() });
              setMode(playing ? "paused" : "playing");
            }}
          >
            {playing ? "일시 중지" : "데모 재생"}
          </button>
        </div>
        <div className="tour-chapters" role="group" aria-label="데모 장">
          {chapters.map((c, i) => (
            <button
              type="button"
              key={c.label}
              aria-pressed={i === chapter}
              data-i18n="nav"
              style={{ "--p": i === chapter ? (playing ? progress : 1) : 0 } as CSSProperties}
              onClick={() => {
                touched.current = false;
                setStart({ chapter: i, at: Date.now() });
                setMode("playing");
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button type="button" className="tour-full" aria-pressed={full} onClick={() => setFull(!full)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={full ? "M9 4v5H4m11-5v5h5M9 20v-5H4m11 5v-5h5" : "M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5"} />
          </svg>
          {full ? "전체 화면 종료" : "전체 화면 미리 보기"}
        </button>
      </div>
    </div>
  );
}
