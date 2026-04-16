"use client";

import type { Dispatch, SetStateAction } from "react";
import { cn } from "@/components/ui/cn";
import { STATUS_ORDER, type StatusVisibilityFilter } from "@/lib/dashboard-workflow-filters";
import {
  statusVisibilityPillClass,
  statusVisibilitySignalClass,
} from "@/lib/dashboard-status-visibility-styles";

type Props = {
  statusVisibility: StatusVisibilityFilter;
  setStatusVisibility: Dispatch<SetStateAction<StatusVisibilityFilter>>;
  /** 전체(all) 폴더 보기일 때만 표시 */
  showIncludeCompletedToggle: boolean;
  includeCompletedInAllView: boolean;
  setIncludeCompletedInAllView: Dispatch<SetStateAction<boolean>>;
  /** 힌트 문구 (프로젝트 / 메모) */
  entityLabel: "프로젝트" | "메모";
};

export function DashboardExposureStatusBar({
  statusVisibility,
  setStatusVisibility,
  showIncludeCompletedToggle,
  includeCompletedInAllView,
  setIncludeCompletedInAllView,
  entityLabel,
}: Props) {
  const hint = `켜진 상태의 ${entityLabel}만 메인 리스트에 보여요.`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-full text-xs font-semibold text-zinc-500 sm:mr-1 sm:w-auto">노출 상태</span>
      {STATUS_ORDER.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setStatusVisibility((p) => ({ ...p, [s]: !p[s] }))}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition hover:opacity-90",
            "outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50",
            statusVisibilityPillClass(s, statusVisibility[s]),
          )}
          aria-pressed={statusVisibility[s]}
        >
          <span
            className={cn("text-sm leading-none", statusVisibilitySignalClass(s, statusVisibility[s]))}
            aria-hidden
          >
            ⏺
          </span>
          {s}
        </button>
      ))}
      {showIncludeCompletedToggle ? (
        <button
          type="button"
          onClick={() => setIncludeCompletedInAllView((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition hover:opacity-90",
            "outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50",
            includeCompletedInAllView
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
              : "bg-zinc-100 text-zinc-400 ring-zinc-200",
          )}
          aria-pressed={includeCompletedInAllView}
          title={`완료 ${entityLabel}를 기본 접힘 상태에서 펼쳐서 보여요`}
        >
          <span className="text-sm leading-none" aria-hidden>
            ✓
          </span>
          완료 포함 보기
        </button>
      ) : null}
      <span className="w-full text-[11px] text-zinc-400 sm:ml-2 sm:w-auto">{hint}</span>
    </div>
  );
}
