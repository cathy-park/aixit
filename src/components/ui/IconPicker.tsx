"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { FOLDER_LUCIDE_PRESETS, resolveFolderLucideIcon } from "@/lib/folder-lucide-icons";

export type IconPickerImageTab = "image_url" | "image_upload";

export type IconPickerProps = {
  tab: "default" | IconPickerImageTab;
  onTabChange: (tab: IconPickerProps["tab"]) => void;
  /** 기본 탭에서 이모지 vs 루시드 중 무엇이 선택인지 */
  defaultKind: "lucide" | "emoji";
  lucideIcon: string;
  onLucideIconChange: (name: string) => void;
  imageValue: string;
  onImageValueChange: (v: string) => void;
  emoji: string;
  onEmojiChange: (e: string) => void;
  previewBackground: string;
  className?: string;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

function PreviewGlyph({
  tab,
  defaultKind,
  lucideIcon,
  emoji,
  imageValue,
  background,
}: {
  tab: IconPickerProps["tab"];
  defaultKind: "lucide" | "emoji";
  lucideIcon: string;
  emoji: string;
  imageValue: string;
  background: string;
}) {
  const dim = "h-14 w-14";
  const bg = background && /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(background) ? background : "#64748b";

  // 기본 탭에서는 이모지 UI를 숨기므로 미리보기도 루시드 아이콘만 사용합니다.
  void defaultKind;
  void emoji;

  if (tab === "image_url" || tab === "image_upload") {
    const src = imageValue.trim();
    if (src) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className={cn("shrink-0 rounded-2xl object-cover ring-2 ring-white/30 shadow-md", dim)} />
      );
    }
    return (
      <div
        className={cn("grid shrink-0 place-items-center rounded-2xl text-xs font-bold text-white/90 ring-2 ring-white/25", dim)}
        style={{ backgroundColor: bg }}
      >
        이미지
      </div>
    );
  }

  const Icon = resolveFolderLucideIcon(lucideIcon);

  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-2xl ring-2 ring-white/25 shadow-md", dim)}
      style={{ backgroundColor: bg }}
    >
      <Icon className="h-7 w-7 text-white" strokeWidth={2} aria-hidden />
    </div>
  );
}

export function IconPicker({
  tab,
  onTabChange,
  defaultKind,
  lucideIcon,
  onLucideIconChange,
  imageValue,
  onImageValueChange,
  emoji,
  onEmojiChange,
  previewBackground,
  className,
}: IconPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlDraft, setUrlDraft] = useState("");

  // 이 컴포넌트는 기본 탭에서 이모지 선택 UI를 제공하지 않습니다.
  // (하지만 호출부가 넘기는 값/타입 호환을 위해) onEmojiChange는 사용하지 않습니다.
  void onEmojiChange;

  const applyUrl = useCallback(() => {
    const u = urlDraft.trim();
    if (!u) return;
    onImageValueChange(u);
    setUrlDraft("");
  }, [urlDraft, onImageValueChange]);

  const onFile = useCallback(
    async (file: File | null) => {
      if (!file || !file.type.startsWith("image/")) return;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        onImageValueChange(dataUrl);
      } catch {
        /* ignore */
      }
    },
    [onImageValueChange],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">미리보기</span>
        <PreviewGlyph
          tab={tab}
          defaultKind={defaultKind}
          lucideIcon={lucideIcon}
          emoji={emoji}
          imageValue={imageValue}
          background={previewBackground}
        />
      </div>

      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-zinc-400">아이콘 타입</div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onTabChange("default")}
            className={cn(
              "rounded-2xl border-2 px-3 py-2.5 text-center text-xs font-bold transition sm:text-sm",
              tab === "default" ? "border-blue-500 bg-blue-50 text-blue-900" : "border-zinc-200 bg-zinc-50 text-zinc-700",
            )}
          >
            기본 아이콘
          </button>
          <button
            type="button"
            onClick={() => onTabChange("image_url")}
            className={cn(
              "rounded-2xl border-2 px-3 py-2.5 text-center text-xs font-bold transition sm:text-sm",
              tab === "image_url" ? "border-blue-500 bg-blue-50 text-blue-900" : "border-zinc-200 bg-zinc-50 text-zinc-700",
            )}
          >
            이미지 주소
          </button>
          <button
            type="button"
            onClick={() => onTabChange("image_upload")}
            className={cn(
              "rounded-2xl border-2 px-3 py-2.5 text-center text-xs font-bold transition sm:text-sm",
              tab === "image_upload" ? "border-blue-500 bg-blue-50 text-blue-900" : "border-zinc-200 bg-zinc-50 text-zinc-700",
            )}
          >
            이미지 업로드
          </button>
        </div>
      </div>

      {tab === "default" ? (
        <div className="space-y-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-zinc-400">아이콘 선택</div>
            <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-6">
              {FOLDER_LUCIDE_PRESETS.map(({ id, Icon, label }) => {
                const selected = defaultKind === "lucide" && lucideIcon === id;
                return (
                  <button
                    key={id}
                    type="button"
                    title={label}
                    onClick={() => onLucideIconChange(id)}
                    className={cn(
                      "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl ring-1 transition",
                      selected ? "bg-blue-600 text-white ring-blue-400" : "bg-zinc-50 text-zinc-700 ring-zinc-200 hover:bg-zinc-100",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                    <span className="max-w-full truncate px-0.5 text-[9px] font-semibold">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "image_url" ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
          <div className="text-xs font-bold text-zinc-800">이미지 URL</div>
          <p className="mt-1 text-[11px] text-zinc-500">https 로 시작하는 주소를 넣고 적용하세요.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1">
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
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <button
              type="button"
              onClick={applyUrl}
              className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              적용
            </button>
          </div>
          {imageValue.trim() ? (
            <button
              type="button"
              onClick={() => onImageValueChange("")}
              className="mt-3 text-xs font-semibold text-rose-600 hover:underline"
            >
              이미지 제거
            </button>
          ) : null}
        </div>
      ) : null}

      {tab === "image_upload" ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6">
          <div className="text-xs font-bold text-zinc-800">파일에서 선택</div>
          <p className="mt-1 text-[11px] text-zinc-500">PNG, JPG 등 이미지 파일만 업로드됩니다.</p>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-4 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50 sm:w-auto"
          >
            파일 선택
          </button>
          {imageValue.trim() ? (
            <button
              type="button"
              onClick={() => onImageValueChange("")}
              className="mt-3 block text-xs font-semibold text-rose-600 hover:underline"
            >
              이미지 제거
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
