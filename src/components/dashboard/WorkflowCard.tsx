"use client";

import type { MouseEvent } from "react";
import { useMemo } from "react";
import Link from "next/link";
import { FolderGlyph } from "@/components/dashboard/FolderGlyph";
import { ToolMiniAvatar } from "@/components/tools/ToolMiniAvatar";
import { cn } from "@/components/ui/cn";
import type { WorkflowPreview } from "@/lib/aixit-data";
import type { DashboardFolderRecord } from "@/lib/dashboard-folders-store";
import { formatShortKoreanDate, isDdayLabelUrgent } from "@/lib/date-schedule";
import { useMergedTools } from "@/hooks/useMergedTools";
import { collectResolvedPreviewTools, uniqueToolIdsAcrossSteps } from "@/lib/dashboard-workflow-preview";
import { getDashboardWorkflow } from "@/lib/workflows-store";
import { getMergedToolById } from "@/lib/user-tools-store";
import { actionIconButtonClass, IconCopy, IconSaveTemplate, IconStarPin, IconTrash } from "@/components/ui/action-icons";

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 8v8" strokeLinecap="round" />
      <path d="M14 8v8" strokeLinecap="round" />
    </svg>
  );
}

function CircleOutlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}

function StatusBadge({ status }: { status: WorkflowPreview["status"] }) {
  if (status === "진행중") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
        <ClockIcon className="h-3.5 w-3.5 shrink-0 stroke-sky-600" />
        진행중
      </span>
    );
  }
  if (status === "보류") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-800 ring-1 ring-orange-200/90">
        <PauseIcon className="h-3.5 w-3.5 shrink-0 stroke-orange-700" />
        보류
      </span>
    );
  }
  if (status === "준비중") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200">
        <CircleOutlineIcon className="h-3.5 w-3.5 shrink-0 stroke-zinc-500" />
        준비중
      </span>
    );
  }
  const cls =
    status === "완료"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : "bg-rose-50 text-rose-800 ring-rose-200";
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", cls)}>{status}</span>;
}

export function WorkflowCard({
  wf,
  folder,
  pinned,
  onTogglePin,
  onCopy,
  onSaveAsTemplate,
  onDelete,
}: {
  wf: WorkflowPreview;
  /** 있으면 제목 앞 아이콘으로 워크플로우 이모지 대신 폴더 글리프 사용 */
  folder?: Pick<DashboardFolderRecord, "emoji" | "iconType" | "imageDataUrl" | "lucideIcon" | "color">;
  pinned?: boolean;
  onTogglePin?: () => void;
  onCopy?: () => void;
  /** 프로젝트 구성을 워크플로우 템플릿 라이브러리에 추가 */
  onSaveAsTemplate?: () => void;
  onDelete?: () => void;
}) {
  const { tools: toolCatalog } = useMergedTools();
  const toolById = (id: string) => toolCatalog.find((x) => x.id === id) ?? getMergedToolById(id);

  const liveWorkflow = useMemo(() => getDashboardWorkflow(wf.id), [wf.id]);
  const toolsCountUnique = liveWorkflow ? uniqueToolIdsAcrossSteps(liveWorkflow).length : wf.toolsCount;
  const resolvedPreviewTools = useMemo(() => {
    if (!liveWorkflow) return [];
    const resolve = (id: string) => toolCatalog.find((x) => x.id === id) ?? getMergedToolById(id);
    return collectResolvedPreviewTools(liveWorkflow, resolve, 3);
  }, [liveWorkflow, toolCatalog]);

  const stepsDone = wf.stepsCompleted ?? wf.stepsDone ?? 0;
  const progress = wf.progressPercent ?? Math.round((stepsDone / Math.max(1, wf.stepsTotal)) * 100);
  const startLabel = formatShortKoreanDate(wf.startDate);
  const endLabel = formatShortKoreanDate(wf.endDate);
  const dateLine =
    startLabel && endLabel ? `${startLabel} – ${endLabel}` : startLabel ? `시작 ${startLabel}` : endLabel ? `마감 ${endLabel}` : null;

  const previewIds = wf.previewToolIds ?? [];
  const extraTools = Math.max(0, toolsCountUnique - 3);
  const ddayUrgent = isDdayLabelUrgent(wf.ddayLabel);

  const stopDeleteNav = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="flex box-border overflow-hidden rounded-[28px] border border-zinc-200/80 bg-white p-5 shadow-md shadow-zinc-200/50">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <Link
            href={wf.href}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="min-w-0 flex-1 rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-zinc-100"
          >
            <div className="flex flex-wrap items-center gap-2 gap-y-1">
              {folder ? <FolderGlyph folder={folder} size="md" className="shrink-0" accentColor={folder.color} /> : null}
              <span className="truncate text-lg font-bold tracking-tight text-zinc-950">{wf.title}</span>
              <StatusBadge status={wf.status} />
            </div>
            {wf.subtitle.trim() ? (
              <p className="mt-2 line-clamp-2 text-sm font-medium text-zinc-500">{wf.subtitle}</p>
            ) : null}
            {dateLine ? <p className="mt-1 text-xs font-medium text-zinc-400">{dateLine}</p> : null}

            <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-sm font-bold text-blue-600">
                {stepsDone}/{wf.stepsTotal} 단계 완료
              </span>
              <span className="text-sm">
                <span
                  className={cn("font-bold", ddayUrgent ? "text-red-600" : "font-semibold text-zinc-400")}
                >
                  {wf.ddayLabel}
                </span>
                <span className="ml-2 font-medium text-zinc-400">{progress}%</span>
              </span>
            </div>

            <div className="mt-2.5 h-[7px] w-full overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-blue-600 transition-[width]" style={{ width: `${progress}%` }} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-zinc-500">사용 중:</span>
              <div className="flex items-center">
                {resolvedPreviewTools.length > 0
                  ? resolvedPreviewTools.map((t, i) => (
                      <div
                        key={t.id}
                        className={cn("-ml-2 first:ml-0", i === 0 && "z-30", i === 1 && "z-20", i === 2 && "z-10")}
                      >
                        <ToolMiniAvatar tool={t} size="md" />
                      </div>
                    ))
                  : previewIds.map((id, i) => (
                      <div
                        key={`${id}-${i}`}
                        className={cn("-ml-2 first:ml-0", i === 0 && "z-30", i === 1 && "z-20", i === 2 && "z-10")}
                      >
                        <ToolMiniAvatar tool={toolById(id)} size="md" />
                      </div>
                    ))}
              </div>
              {extraTools > 0 ? (
                <span className="text-xs font-medium text-zinc-400">+{extraTools}개 도구</span>
              ) : toolsCountUnique === 0 ? (
                <span className="text-xs text-zinc-400">연결된 도구 없음</span>
              ) : null}
            </div>
          </Link>

          <div className="flex shrink-0 flex-row items-start gap-0">
            {onTogglePin ? (
              <button
                type="button"
                draggable={false}
                onClick={(e) => {
                  stopDeleteNav(e);
                  onTogglePin();
                }}
                className={cn(
                  actionIconButtonClass,
                  "h-8 w-8",
                  pinned && "text-amber-500 hover:bg-amber-50 hover:text-amber-600",
                )}
                aria-pressed={Boolean(pinned)}
                title={pinned ? "상단 고정 해제" : "상단 고정"}
              >
                <IconStarPin active={Boolean(pinned)} />
              </button>
            ) : null}
            {onCopy ? (
              <button
                type="button"
                draggable={false}
                title="복사"
                aria-label="프로젝트 복사"
                onClick={(e) => {
                  stopDeleteNav(e);
                  onCopy();
                }}
                className={cn(actionIconButtonClass, "h-8 w-8")}
              >
                <IconCopy />
              </button>
            ) : null}
            {onSaveAsTemplate ? (
              <button
                type="button"
                draggable={false}
                title="템플릿으로 추가"
                aria-label="워크플로우 템플릿으로 추가"
                onClick={(e) => {
                  stopDeleteNav(e);
                  onSaveAsTemplate();
                }}
                className={cn(actionIconButtonClass, "h-8 w-8")}
              >
                <IconSaveTemplate />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                draggable={false}
                title="삭제"
                aria-label="프로젝트 삭제"
                onClick={(e) => {
                  stopDeleteNav(e);
                  onDelete();
                }}
                className={cn(actionIconButtonClass, "h-8 w-8")}
              >
                <IconTrash />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
