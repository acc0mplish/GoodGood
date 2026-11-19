/** @jsxImportSource @/components/replica/i18n */
"use client";
import { store, useShared, type Accent } from "../replica/store";

// Windows accent colours in the light and dark variants the app uses for each mode.
const accents: { name: string; accent: Accent | null; swatch: string }[] = [
  { name: "시스템 강조색(기본 파랑)", accent: null, swatch: "#0078d4" },
  { name: "주황색", accent: { light: "#b55400", dark: "#ffb36b" }, swatch: "#f7630c" },
  { name: "빨간색", accent: { light: "#b81d34", dark: "#ff99a4" }, swatch: "#e81123" },
  { name: "씨폼 그린", accent: { light: "#00786a", dark: "#5fe0c4" }, swatch: "#00b294" },
  { name: "슬레이트 그레이", accent: { light: "#4c5a66", dark: "#b4c3cf" }, swatch: "#69797e" },
];

export default function AccentPicker() {
  const { accent } = useShared();
  const style = accent
    ? ({ "--a-accent-l": accent.light, "--a-accent-d": accent.dark } as Record<string, string>)
    : undefined;
  return (
    <div className="accent">
      <div className="accent-swatches" role="radiogroup" aria-label="강조색">
        {accents.map((a) => (
          <button
            key={a.name}
            role="radio"
            aria-checked={(accent?.light ?? null) === (a.accent?.light ?? null)}
            aria-label={a.name}
            title={a.name}
            style={{ background: a.swatch }}
            onClick={() => store.set({ accent: a.accent })}
          />
        ))}
      </div>
      <div className="goodgood-app accent-sample" data-ui style={style} aria-hidden="true">
        <div className="accent-tabs">
          <span className="accent-tab is-current">프로세스</span>
          <span className="accent-tab">성능</span>
          <span className="accent-tab">서비스</span>
          <span className="accent-tab">연결</span>
        </div>
        {[
          ["Windows 탐색기", "explorer.exe", "0.4", "169.4 MB", false],
          ["GoodGood", "goodgood.exe", "0.3", "17.8 MB", true],
          ["메모장", "Notepad.exe", "0.1", "48.0 MB", false],
        ].map(([name, exe, cpu, mem, selected]) => (
          <div className={"accent-row a-tr" + (selected ? " is-selected" : "")} key={String(exe)}>
            <span className="a-td a-td-name">
              {selected ? (
                <img className="pico" src="/assets/goodgood.svg" width="16" height="16" alt="" />
              ) : (
                <span className="pico accent-glyph" />
              )}
              <span className="a-name">{name}</span>
              <span className="a-exe">{exe}</span>
            </span>
            <span className="a-td is-end">{cpu}</span>
            <span className="a-td is-end">{mem}</span>
          </div>
        ))}
        <div className="accent-controls">
          <span className="a-seg" aria-hidden="true">
            <button aria-checked="true" role="radio" tabIndex={-1}>
              전체
            </button>
            <button aria-checked="false" role="radio" tabIndex={-1}>
              논리
            </button>
          </span>
          <span className="a-switch" aria-checked="true" role="switch">
            <i />
          </span>
          <span className="a-button is-accent">확인</span>
        </div>
      </div>
    </div>
  );
}
