"use client";

import { useEffect, useRef, useState } from "react";
import { IconPicker, type IconPickerProps } from "@/components/ui/IconPicker";
import { cn } from "@/components/ui/cn";
import type { DashboardFolderIconType, DashboardFolderRecord } from "@/lib/dashboard-folders-store";

const PRESET_COLORS = ["#64748b", "#3b82f6", "#6366f1", "#a855f7", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#0ea5e9", "#14b8a6"];

export function FolderFormModal({
  open,
  mode,
  initial,
  onClose,
  onSave,
  highlightSection,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial: DashboardFolderRecord | null;
  onClose: () => void;
  onSave: (payload: Omit<DashboardFolderRecord, "id"> & { id?: string }) => void;
  /** 더보기 메뉴에서 구역별로 열 때 스크롤·포커스 */
  highlightSection?: "name" | "icon" | "color" | null;
}) {
  const [pickerTab, setPickerTab] = useState<IconPickerProps["tab"]>("default");
  const [folderIconType, setFolderIconType] = useState<DashboardFolderIconType>("lucide");
  const [lucideIcon, setLucideIcon] = useState("FolderOpen");
  const [emoji, setEmoji] = useState("📁");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [colorDraft, setColorDraft] = useState(PRESET_COLORS[0]);
  const [hidden, setHidden] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      const it = initial.iconType;
      setFolderIconType(it);
      setLucideIcon(initial.lucideIcon ?? "FolderOpen");
      setEmoji(initial.emoji || "📁");
      setImageDataUrl(initial.imageDataUrl ?? null);
      setPickerTab(
        it === "image_url" ? "image_url" : it === "image_upload" ? "image_upload" : "default",
      );
      setName(initial.name);
      setColor(initial.color);
      setColorDraft(initial.color);
      setHidden(Boolean(initial.hidden));
    } else {
      setPickerTab("default");
      setFolderIconType("lucide");
      setLucideIcon("FolderOpen");
      setEmoji("📁");
      setImageDataUrl(null);
      setName("");
      setColor(PRESET_COLORS[0]);
      setColorDraft(PRESET_COLORS[0]);
      setHidden(false);
    }
  }, [open, mode, initial]);

  useEffect(() => {
    if (!open || mode !== "edit" || !highlightSection) return;
    const t = window.setTimeout(() => {
      if (highlightSection === "name") {
        nameInputRef.current?.focus({ preventScroll: true });
        nameInputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      } else if (highlightSection === "icon") {
        document.getElementById("folder-modal-icon-section")?.scrollIntoView({ block: "center", behavior: "smooth" });
      } else if (highlightSection === "color") {
        document.getElementById("folder-modal-color-section")?.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, 80);
    return () => window.clearTimeout(t);
  }, [open, mode, highlightSection, initial?.id]);

  const onLucidePick = (id: string) => {
    setFolderIconType("lucide");
    setLucideIcon(id);
  };

  const onEmojiPick = (e: string) => {
    setFolderIconType("emoji");
    setEmoji(e);
  };

  const handlePickerTabChange = (t: IconPickerProps["tab"]) => {
    setPickerTab(t);
    if (t === "image_url") setFolderIconType("image_url");
    else if (t === "image_upload") setFolderIconType("image_upload");
    else setFolderIconType((prev) => (prev === "image_url" || prev === "image_upload" ? "lucide" : prev));
  };

  if (!open) return null;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const isImageIcon = folderIconType === "image_url" || folderIconType === "image_upload";
    const effectiveImage =
      isImageIcon
        ? (imageDataUrl ?? (mode === "edit" ? initial?.imageDataUrl : null) ?? null)
        : null;
    if (isImageIcon && !effectiveImage) return;

    // 이모지 아이콘 선택 UI를 제거했으므로, 이미지가 아닌 경우에는 무조건 루시드로 저장합니다.
    const storeIconType = isImageIcon ? folderIconType : "lucide";

    onSave({
      id: initial?.id,
      name: trimmed,
      emoji: "",
      iconType: storeIconType,
      lucideIcon: storeIconType === "lucide" ? lucideIcon : null,
      imageDataUrl: effectiveImage,
      color,
      hidden,
    });
    onClose();
  };

  const imageRequiredInvalid =
    (folderIconType === "image_url" || folderIconType === "image_upload") &&
    !imageDataUrl &&
    !(mode === "edit" && initial?.imageDataUrl);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-modal-title"
    >
      <button type="button" onClick={onClose} className="absolute inset-0 cursor-default" aria-label="닫기" />

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-zinc-200">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h2 id="folder-modal-title" className="text-lg font-bold tracking-tight text-zinc-950">
            {mode === "create" ? "새 폴더 만들기" : "폴더 수정"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">워크플로우를 담을 폴더 정보를 입력하세요.</p>
        </div>

        <div className="max-h-[min(72vh,640px)] overflow-y-auto px-6 py-5">
          <div id="folder-modal-icon-section">
            <IconPicker
              tab={pickerTab}
              onTabChange={handlePickerTabChange}
              defaultKind="lucide"
              lucideIcon={lucideIcon}
              onLucideIconChange={onLucidePick}
              imageValue={imageDataUrl ?? ""}
              onImageValueChange={(v) => {
                setImageDataUrl(v || null);
                if (pickerTab === "image_url") setFolderIconType("image_url");
                if (pickerTab === "image_upload") setFolderIconType("image_upload");
              }}
              emoji={emoji}
              onEmojiChange={onEmojiPick}
              previewBackground={color}
            />
          </div>

          <div className="mt-6">
            <label className="text-xs font-bold uppercase tracking-wide text-zinc-400" htmlFor="folder-name">
              폴더 이름
            </label>
            <input
              ref={nameInputRef}
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 클라이언트 A"
              className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3">
            <input
              type="checkbox"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900"
            />
            <span>
              <span className="text-sm font-semibold text-zinc-900">폴더 칩에서 숨기기</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                끝난 작업 묶음 등 접어 두려면 켜세요. 전체 보기에서는 프로젝트가 계속 보입니다.
              </span>
            </span>
          </label>

          <div id="folder-modal-color-section" className="mt-6">
            <div className="text-xs font-bold uppercase tracking-wide text-zinc-400">색상</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                onClick={() => {
                  setColor(c);
                  setColorDraft(c);
                }}
                  className={cn(
                    "h-9 w-9 rounded-full ring-2 ring-offset-2 transition",
                    color === c ? "ring-blue-500 ring-offset-white" : "ring-transparent ring-offset-white hover:ring-zinc-300",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`색 ${c}`}
                />
              ))}
            </div>

          <div className="mt-3">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500" htmlFor="folder-color-code">
              색상 코드
            </label>
            <input
              id="folder-color-code"
              inputMode="text"
              value={colorDraft}
              onChange={(e) => setColorDraft(e.target.value)}
              onBlur={() => {
                const raw = colorDraft.trim();
                const normalized = raw.startsWith("#") ? raw : `#${raw}`;
                if (/^#([0-9A-Fa-f]{6})$/.test(normalized)) setColor(normalized);
                else setColorDraft(color);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const raw = colorDraft.trim();
                const normalized = raw.startsWith("#") ? raw : `#${raw}`;
                if (/^#([0-9A-Fa-f]{6})$/.test(normalized)) {
                  setColor(normalized);
                  setColorDraft(normalized);
                } else {
                  setColorDraft(color);
                }
              }}
              placeholder="#RRGGBB"
              className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-mono text-zinc-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/80 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-white"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim() || imageRequiredInvalid}
            className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mode === "create" ? "만들기" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
