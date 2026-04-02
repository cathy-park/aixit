"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

export function ImageImportBlock({
  value,
  onChange,
  label = "이미지",
  previewClassName,
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  previewClassName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const applyFile = useCallback(
    async (file: File | null) => {
      if (!file || !file.type.startsWith("image/")) return;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        onChange(dataUrl);
      } catch {
        /* ignore */
      }
    },
    [onChange],
  );

  const applyUrl = useCallback(() => {
    const u = urlDraft.trim();
    if (!u) return;
    onChange(u);
    setUrlDraft("");
  }, [urlDraft, onChange]);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) {
        await applyFile(f);
        return;
      }
      const text = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
      const t = text?.trim();
      if (t && /^https?:\/\//i.test(t)) onChange(t);
    },
    [applyFile, onChange],
  );

  return (
    <div>
      <div className="text-xs font-bold text-zinc-800">{label}</div>
      <p className="mt-1 text-[11px] font-medium text-zinc-500">파일 선택, 주소 입력, 여기로 끌어다 놓기 모두 가능해요.</p>

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "mt-3 rounded-2xl border-2 border-dashed px-4 py-6 transition",
          dragOver ? "border-blue-400 bg-blue-50/50" : "border-zinc-200 bg-zinc-50/80",
        )}
      >
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div
            className={cn(
              "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-zinc-200",
              previewClassName,
            )}
          >
            {value.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value.trim()} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="px-2 text-center text-xs font-semibold text-zinc-400">미리보기</span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={(e) => applyFile(e.target.files?.[0] ?? null)} />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50 sm:w-auto"
            >
              파일에서 선택
            </button>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-zinc-500">이미지 주소 (URL)</span>
                <input
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyUrl();
                    }
                  }}
                  placeholder="https://…"
                  className="mt-1 w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-blue-500/30"
                />
              </label>
              <button
                type="button"
                onClick={applyUrl}
                className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
              >
                주소 적용
              </button>
            </div>
            {value.trim() ? (
              <button type="button" onClick={() => onChange("")} className="self-start text-xs font-semibold text-rose-600 hover:underline">
                이미지 제거
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
