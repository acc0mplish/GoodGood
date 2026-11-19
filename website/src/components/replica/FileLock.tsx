/** @jsxImportSource @/components/replica/i18n */
"use client";
import { useRef } from "react";
import { Icon, ProcessIcon } from "./icons";
import type { Process } from "./model";

export interface Holder {
  proc: Process;
  handles: number;
  directory?: boolean;
}
export interface LockResult {
  names: string[];
  folder: boolean;
  holders: Holder[];
}

// A demonstration answer: which of the running mock processes would plausibly hold this kind of file.
export function inspect(names: string[], folder: boolean, alive: Process[]): LockResult {
  const byPid = new Map(alive.map((p) => [p.pid, p]));
  const ext = (names[0]?.split(".").pop() ?? "").toLowerCase();
  const picks: [number, number, boolean?][] = folder
    ? [
        [13004, 1, true],
        [6120, 2],
      ]
    : ext === "pdf"
      ? [[9876, 1]]
      : ["png", "jpg", "jpeg", "gif", "bmp", "webp", "heic"].includes(ext)
        ? [
            [14868, 1],
            [6120, 1],
          ]
        : ["txt", "md", "log", "json", "ts", "tsx", "js", "rs", "toml", "yaml", "csv", "ini"].includes(ext)
          ? [
              [11324, 2],
              [15204, 1],
            ]
          : [
              [6120, 1],
              [8920, 1],
            ];
  return {
    names,
    folder,
    holders: picks
      .filter(([pid]) => byPid.has(pid))
      .map(([pid, handles, directory]) => ({ proc: byPid.get(pid)!, handles, directory })),
  };
}

// The body of the "파일을 사용하는 항목" dialog: the chosen paths (or the drop zone),
// the pickers, then what holds them.
export default function FileLock({
  result,
  checking,
  onFiles,
  onShow,
  onEnd,
  footer = true,
}: {
  result: LockResult | null;
  checking: boolean;
  onFiles: (names: string[], folder: boolean) => void;
  onShow?: (pid: number) => void;
  onEnd: (proc: Process) => void;
  footer?: boolean;
}) {
  const file = useRef<HTMLInputElement>(null);
  const folder = useRef<HTMLInputElement>(null);
  const picked = (input: HTMLInputElement, isFolder: boolean) => {
    const files = [...(input.files ?? [])];
    if (!files.length) return;
    const names = isFolder ? [files[0].webkitRelativePath.split("/")[0] || files[0].name] : files.map((f) => f.name);
    onFiles(names, isFolder);
    input.value = "";
  };
  const base = (name: string) => (result?.folder ? "C:\\Users\\demo\\" : "C:\\Users\\demo\\Documents\\") + name;
  return (
    <div className="a-lock">
      <div className="a-lock-paths">
        {result ? (
          result.names.map((name) => (
            <div className="a-drop-names" key={name}>
              <b>{name}</b>
              <small>{base(name)}</small>
            </div>
          ))
        ) : (
          <div className="a-drop">
            <Icon name="lock" size={20} />
            <span>파일이나 폴더를 창으로 끌어다 놓거나</span>
          </div>
        )}
        <div className="a-lock-actions">
          <button type="button" className="a-btn" onClick={() => file.current?.click()}>
            파일 선택
          </button>
          <button type="button" className="a-btn" onClick={() => folder.current?.click()}>
            <Icon name="folder" />
            폴더 선택
          </button>
          {result && (
            <button type="button" className="a-btn is-ghost" disabled={checking} onClick={() => onFiles(result.names, result.folder)}>
              다시 확인
            </button>
          )}
          <input ref={file} type="file" hidden multiple onChange={(e) => picked(e.currentTarget, false)} />
          <input ref={folder} type="file" hidden {...{ webkitdirectory: "" }} onChange={(e) => picked(e.currentTarget, true)} />
        </div>
      </div>
      <div className="a-lock-result">
        {checking && (
          <>
            <p className="a-lock-status">확인하는 중…</p>
            <div className="a-progress" />
          </>
        )}
        {!checking && result && (
          <>
            <p className="a-lock-status">
              {result.holders.length
                ? `이 파일이나 폴더를 사용 중인 프로세스 ${result.holders.length}개를 찾았습니다.`
                : "이 파일을 사용하는 액세스 가능한 프로세스가 없습니다."}
            </p>
            <ul className="a-lock-list">
              {result.holders.map(({ proc, handles, directory }) => (
                <li key={proc.pid}>
                  <ProcessIcon glyph={proc.glyph} />
                  <span className="a-lock-proc">
                    <span>{proc.name}</span>
                    <small>
                      {proc.exe} PID {proc.pid}
                      {directory && " · 현재 작업 디렉터리"}
                    </small>
                  </span>
                  {proc.pid === 6120 && <span className="a-tag">파일 탐색기</span>}
                  <span className="a-tag a-badge">{handles}개 핸들</span>
                  {onShow && (
                    <button
                      type="button"
                      className="a-btn is-ghost is-small is-icon"
                      aria-label="프로세스에서 표시"
                      title="프로세스에서 표시"
                      onClick={() => onShow(proc.pid)}
                    >
                      <Icon name="goTo" size={14} />
                    </button>
                  )}
                  <button type="button" className="a-btn is-danger is-small" onClick={() => onEnd(proc)}>
                    <Icon name="end" size={14} />
                    작업 끝내기
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      {footer && <p className="a-lock-foot">핸들 조회는 작업 디렉터리로 사용 중인 폴더도 찾습니다. 보호된 프로세스는 확인하지 못할 수 있습니다.</p>}
    </div>
  );
}
