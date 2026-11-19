/** @jsxImportSource @/components/replica/i18n */
"use client";
import { useState, type DragEvent } from "react";
import FileLock, { inspect, type LockResult } from "../replica/FileLock";
import { processes } from "../replica/model";
import { store } from "../replica/store";

// Only the names of dropped files are read, in the browser; nothing is uploaded.
export default function FileDrop() {
  const [result, setResult] = useState<LockResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [over, setOver] = useState(false);
  const files = (names: string[], folder: boolean) => {
    setChecking(true);
    setTimeout(() => {
      setResult(inspect(names, folder, processes));
      setChecking(false);
    }, 420);
  };
  const drop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    const folder = [...event.dataTransfer.items].some((i) => i.webkitGetAsEntry?.()?.isDirectory);
    const names = [...event.dataTransfer.files].map((f) => f.name);
    if (names.length) files(names, folder);
  };
  return (
    <div
      className={"goodgood-app file-drop" + (over ? " is-over" : "")}
      data-ui
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setOver(false)}
      onDrop={drop}
    >
      {!result && !checking && <span className="file-hint" aria-hidden="true" />}
      <div className="a-dialog file-drop-dialog">
        <h3>파일을 사용하는 항목</h3>
        <p className="a-dialog-text">파일이 사용 중이어서 삭제나 이동에 실패하면 여기에서 파일을 점유한 프로세스를 찾을 수 있습니다. 파일을 GoodGood 창으로 끌어다 놓아도 됩니다.</p>
        <FileLock
          result={result}
          checking={checking}
          onFiles={files}
          onShow={() => store.set({ request: { page: "processes", view: "list", at: Date.now() } })}
          onEnd={(proc) =>
            setResult((r) => r && { ...r, holders: r.holders.filter((h) => h.proc.pid !== proc.pid) })
          }
        />
      </div>
    </div>
  );
}
