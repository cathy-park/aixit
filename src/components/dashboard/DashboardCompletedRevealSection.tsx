"use client";

import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

type Props = {
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
};

/** 프로젝트·메모 공통 —「완료 보기 n개」접기/펼치기 + 펼침 시 콘텐츠 */
export function DashboardCompletedRevealSection({ count, expanded, onToggle, children }: Props) {
  if (count <= 0) return null;

  return (
    <div className="space-y-3">
      <div className="mt-2 border-t border-zinc-200/50 pt-1.5">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-2 rounded-md px-0.5 py-1 text-left text-xs text-zinc-500 transition hover:bg-zinc-100/50 hover:text-zinc-700"
          aria-expanded={expanded}
        >
          <span className="min-w-0 truncate">
            완료 보기 <span className="tabular-nums text-zinc-500">{count}</span>개
          </span>
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            className={cn(
              "shrink-0 text-slate-500 transition-transform duration-200 ease-out",
              !expanded && "rotate-180",
            )}
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
        </button>
      </div>

      {expanded ? <div className="mt-0.5">{children}</div> : null}
    </div>
  );
}
