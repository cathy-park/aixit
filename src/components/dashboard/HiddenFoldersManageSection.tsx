"use client";

import { useState } from "react";
import type { DashboardFolderRecord } from "@/lib/dashboard-folders-store";
import { FolderGlyph } from "@/components/dashboard/FolderGlyph";
import { cn } from "@/components/ui/cn";
import { actionIconButtonClass, IconTrash } from "@/components/ui/action-icons";

/** 둥근 끝·슬레이트 톤 — 펼침 시 위(접기), 접힘 시 아래(펼치기) */
function HiddenSectionChevron({ expanded, size = 14 }: { expanded: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 text-slate-500 transition-transform duration-200 ease-out", !expanded && "rotate-180")}
      aria-hidden
    >
      <path
        d="M18 15l-6-6-6 6"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HiddenFoldersManageSection({
  variant,
  folders,
  onUnhide,
  onRequestDelete,
}: {
  variant: "project" | "template";
  folders: DashboardFolderRecord[];
  onUnhide: (id: string) => void;
  onRequestDelete: (folder: DashboardFolderRecord) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const title = variant === "template" ? "숨김된 카테고리" : "숨김된 폴더";
  const countLabel = variant === "template" ? "카테고리" : "폴더";

  return (
    <div className="mt-2 border-t border-zinc-200/50 pt-1.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-md px-0.5 py-1 text-left text-xs text-zinc-500 transition hover:bg-zinc-100/50 hover:text-zinc-700"
        aria-expanded={expanded}
      >
        <span className="min-w-0 truncate">
          {title}{" "}
          <span className="tabular-nums text-zinc-500">{folders.length}</span>개
        </span>
        <HiddenSectionChevron expanded={expanded} size={14} />
      </button>

      {expanded ? (
        <div className="mt-0.5">
          {folders.length === 0 ? (
            <p className="py-1 text-[11px] text-zinc-400">숨긴 {countLabel}가 없어요.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 border-t border-zinc-100/80">
              {folders.map((f) => (
                <li key={f.id} className="flex items-center gap-2 py-1.5 pr-0.5">
                  <FolderGlyph folder={f} size="sm" accentColor={f.color} />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-zinc-600">{f.name}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onUnhide(f.id)}
                      className="text-[11px] font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
                    >
                      다시 표시
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDelete(f)}
                      title="삭제"
                      aria-label={`${f.name} 삭제`}
                      className={cn(actionIconButtonClass, "h-8 w-8")}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 border-t border-zinc-100/80 pt-1 text-[10px] leading-snug text-zinc-400">
            칩에서만 가려지며 삭제와 달라요. 다시 표시로 복구할 수 있어요.
          </p>
        </div>
      ) : null}
    </div>
  );
}
