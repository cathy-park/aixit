"use client";

import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { FolderGlyph } from "@/components/dashboard/FolderGlyph";
import { TitleCountChip } from "@/components/ui/TitleCountChip";
import type { DashboardFolderRecord } from "@/lib/dashboard-folders-store";

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

/** 워크플로우·프로젝트 라이브러리 공통: 폴더/카테고리 섹션 헤더 + 우측 접기/펼치기 */
export function FolderSectionAccordionHeader({
  folder,
  title,
  count,
  showHiddenBadge,
  expanded,
  onToggle,
  actions,
}: {
  folder: Pick<DashboardFolderRecord, "id" | "name" | "emoji" | "iconType" | "imageDataUrl" | "lucideIcon" | "color">;
  title?: string;
  count: number;
  showHiddenBadge?: boolean;
  expanded: boolean;
  onToggle: () => void;
  /** 수정·삭제·숨기기 등 — 클릭 시 아코디언과 분리 (stopPropagation 처리됨) */
  actions?: ReactNode;
}) {
  const label = title ?? folder.name;

  return (
    <div className="flex w-full min-w-0 items-center gap-1 sm:gap-2">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1.5 pl-1 text-left transition hover:bg-zinc-100/70"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <FolderGlyph folder={folder} size="md" accentColor={folder.color} />
        <span className="truncate text-base font-bold text-zinc-950">{label}</span>
        {showHiddenBadge ? (
          <span className="shrink-0 rounded-full bg-zinc-200/80 px-2 py-0.5 text-[11px] font-bold text-zinc-600">숨김</span>
        ) : null}
        <TitleCountChip count={count} />
      </button>
      {actions ? (
        <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          {actions}
        </div>
      ) : null}
      <button
        type="button"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
        aria-expanded={expanded}
        aria-label={expanded ? "접기" : "펼치기"}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <Chevron expanded={expanded} />
      </button>
    </div>
  );
}
