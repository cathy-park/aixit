"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5 transition-transform duration-200", expanded ? "rotate-180" : "rotate-0")}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/**
 * 연결된 도구가 없을 때 노출되는 내비 아이콘 편집(IconPicker 등) — 아이콘 수가 많아 세로 스크롤이 길어지므로 접기/펼치기 제공.
 */
export function NavigatorIconEditorAccordion({
  title = "내비게이터 아이콘",
  collapsedHint,
  children,
  className,
  defaultOpen = false,
}: {
  title?: string;
  /** 접힌 상태에서만 보이는 한 줄 안내 */
  collapsedHint: string;
  children: ReactNode;
  className?: string;
  /** 첫 렌더 시 펼침 여부 (기본 접힘으로 하단 콘텐츠가 보이도록) */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const panelId = `${baseId}-panel`;

  return (
    <div className={cn("rounded-2xl bg-zinc-50/50 p-5 ring-1 ring-zinc-200", className)}>
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 rounded-xl py-0.5 text-left transition hover:bg-zinc-100/60"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? `${title} 접기` : `${title} 펼치기`}
        id={triggerId}
      >
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-zinc-500">{title}</div>
          {!open ? <p className="mt-1 text-[11px] leading-snug text-zinc-500">{collapsedHint}</p> : null}
        </div>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200/60 hover:text-zinc-800"
          aria-hidden
        >
          <Chevron expanded={open} />
        </span>
      </button>
      {open ? (
        <div id={panelId} role="region" aria-labelledby={triggerId} className="mt-4 border-t border-zinc-200/80 pt-4">
          {children}
        </div>
      ) : null}
    </div>
  );
}
