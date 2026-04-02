"use client";

import { useCallback, useEffect, useState } from "react";
import { IconPicker, type IconPickerProps } from "@/components/ui/IconPicker";
import { cn } from "@/components/ui/cn";
import {
  navigatorPickerStateToStepPatch,
  stepToNavigatorPickerState,
  type StepNavigatorPickerState,
  type StepNavigatorStoredFields,
} from "@/lib/step-navigator-icon";
import type { WorkspaceStep } from "@/lib/workspace-store";

const PRESET_COLORS = ["#64748b", "#3b82f6", "#6366f1", "#a855f7", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#0ea5e9", "#14b8a6", "#27272a"];

export type StepNavigatorIconPatch = Pick<
  WorkspaceStep,
  "navigatorIconType" | "navigatorLucideIcon" | "fallbackEmoji" | "fallbackColor" | "fallbackImageUrl"
>;

export function StepNavigatorIconSection({
  step,
  onApply,
  compact,
  className,
}: {
  step: StepNavigatorStoredFields & { id: string };
  onApply: (patch: StepNavigatorIconPatch) => void;
  compact?: boolean;
  className?: string;
}) {
  const [nav, setNav] = useState<StepNavigatorPickerState>(() => stepToNavigatorPickerState(step));
  const [colorDraft, setColorDraft] = useState(nav.color);

  useEffect(() => {
    setNav(stepToNavigatorPickerState(step));
  }, [
    step.id,
    step.navigatorIconType,
    step.navigatorLucideIcon,
    step.fallbackEmoji,
    step.fallbackColor,
    step.fallbackImageUrl,
  ]);

  useEffect(() => {
    setColorDraft(nav.color);
  }, [nav.color]);

  const pushNav = useCallback(
    (next: StepNavigatorPickerState) => {
      setNav(next);
      onApply(navigatorPickerStateToStepPatch(next));
    },
    [onApply],
  );

  const applyColorDraft = useCallback(() => {
    const raw = colorDraft.trim();
    const normalized = raw.startsWith("#") ? raw : `#${raw}`;
    if (/^#([0-9A-Fa-f]{6})$/.test(normalized)) {
      pushNav({ ...nav, color: normalized });
      setColorDraft(normalized);
    } else {
      setColorDraft(nav.color);
    }
  }, [colorDraft, nav, pushNav]);

  const handlePickerTabChange = useCallback(
    (t: IconPickerProps["tab"]) => {
      let iconType = nav.iconType;
      if (t === "image_url") iconType = "image_url";
      else if (t === "image_upload") iconType = "image_upload";
      else if (t === "default") {
        iconType = nav.iconType === "image_url" || nav.iconType === "image_upload" ? "lucide" : nav.iconType;
      }
      pushNav({ ...nav, tab: t, iconType });
    },
    [nav, pushNav],
  );

  const onLucidePick = useCallback(
    (id: string) => {
      pushNav({ ...nav, tab: "default", iconType: "lucide", lucideIcon: id });
    },
    [nav, pushNav],
  );

  const onEmojiPick = useCallback(
    (e: string) => {
      pushNav({ ...nav, tab: "default", iconType: "emoji", emoji: e });
    },
    [nav, pushNav],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <IconPicker
        tab={nav.tab}
        onTabChange={handlePickerTabChange}
        defaultKind="lucide"
        lucideIcon={nav.lucideIcon}
        onLucideIconChange={onLucidePick}
        imageValue={nav.imageDataUrl}
        onImageValueChange={(v) => {
          const tab = nav.tab === "image_url" || nav.tab === "image_upload" ? nav.tab : "image_url";
          const iconType = tab === "image_upload" ? "image_upload" : "image_url";
          pushNav({ ...nav, tab, iconType, imageDataUrl: v });
        }}
        emoji={nav.emoji}
        onEmojiChange={onEmojiPick}
        previewBackground={nav.color}
      />

      <div>
        <div className={cn("font-bold uppercase tracking-wide text-zinc-400", compact ? "text-[10px]" : "text-xs")}>
          배경 색상
        </div>
        <p className={cn("mt-1 text-zinc-500", compact ? "text-[10px]" : "text-[11px]")}>
          폴더·카테고리 아이콘과 같이 루시드 타일 배경에 적용됩니다.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                pushNav({ ...nav, color: c });
                setColorDraft(c);
              }}
              className={cn(
                "h-9 w-9 rounded-full ring-2 ring-offset-2 transition",
                nav.color === c ? "ring-blue-500 ring-offset-white" : "ring-transparent ring-offset-white hover:ring-zinc-300",
              )}
              style={{ backgroundColor: c }}
              aria-label={`색 ${c}`}
            />
          ))}
        </div>

        <div className="mt-3">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500" htmlFor={`step-navigator-color-${step.id}`}>
            색상 코드
          </label>
          <input
            id={`step-navigator-color-${step.id}`}
            inputMode="text"
            value={colorDraft}
            onChange={(e) => setColorDraft(e.target.value)}
            onBlur={() => applyColorDraft()}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              applyColorDraft();
            }}
            placeholder="#RRGGBB"
            className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-mono text-zinc-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>
    </div>
  );
}
