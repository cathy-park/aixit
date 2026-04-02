"use client";

import { cn } from "@/components/ui/cn";

/** 도구·영감 카드용 iOS 스타일 스위치 (기존 h-7 w-11 대비 약 10% 축소) */
export function IosCardToggle({
  on,
  onToggle,
  id,
  "aria-label": ariaLabel,
}: {
  on: boolean;
  onToggle: () => void;
  id?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={onToggle}
      className={cn(
        "relative h-[25px] w-10 shrink-0 rounded-full transition-[colors,box-shadow] duration-200 ease-out",
        on
          ? "bg-[#2563eb]"
          : "bg-zinc-300 shadow-[0_0_0_2px_rgba(239,68,68,0.45),0_0_12px_rgba(239,68,68,0.35)]",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white transition-transform duration-200 ease-out",
          on ? "translate-x-4 shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
        )}
      />
    </button>
  );
}
