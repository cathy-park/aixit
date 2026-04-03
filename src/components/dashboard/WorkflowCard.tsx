"use client";

import type { MouseEvent } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { FolderGlyph } from "@/components/dashboard/FolderGlyph";
import { ToolMiniAvatar } from "@/components/tools/ToolMiniAvatar";
import { cn } from "@/components/ui/cn";
import type { WorkflowPreview } from "@/lib/aixit-data";
import type { DashboardFolderRecord } from "@/lib/dashboard-folders-store";
import { formatShortKoreanDate, isDdayLabelUrgent } from "@/lib/date-schedule";
import { useMergedTools } from "@/hooks/useMergedTools";
import { collectResolvedPreviewTools, uniqueToolIdsAcrossSteps } from "@/lib/dashboard-workflow-preview";
import {
  PROJECT_LIFECYCLE_LABEL,
  PROJECT_LIFECYCLE_OPTIONS,
  type ProjectLifecycleStatus,
} from "@/lib/project-lifecycle-status";
import {
  WORKFLOW_CARD_STATUS_OPTIONS,
  isWorkflowRunStatus,
  type WorkflowRunStatus,
} from "@/lib/workflow-run-status";
import { getDashboardWorkflow, setDashboardWorkflowRunStatus } from "@/lib/workflows-store";
import { getMergedToolById } from "@/lib/user-tools-store";
import { actionIconButtonClass, IconCopy, IconSaveTemplate, IconStarPin, IconTrash } from "@/components/ui/action-icons";
import { CardActionsOverflow } from "@/components/cards/CardActionsOverflow";
import {
  APP_CARD_SHELL_DASHBOARD_CLASS,
  APP_CARD_SHELL_DASHBOARD_INNER_CLASS,
  APP_CARD_TITLE_TEXT_CLASS,
  APP_CARD_TITLE_TRACK_CLASS,
} from "@/components/cards/app-card-layout";

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
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

function PauseMiniIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4.5" height="14" rx="1" />
      <rect x="13.5" y="5" width="4.5" height="14" rx="1" />
    </svg>
  );
}

function StopMiniIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="7" />
      <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" strokeLinecap="round" />
    </svg>
  );
}

function workflowRunStatusMenuRowClass(option: WorkflowRunStatus, current: WorkflowRunStatus) {
  const row =
    "touch-manipulation flex w-full items-center px-3 py-2 text-left text-sm font-semibold transition-colors duration-150";
  if (option !== current) return cn(row, "text-zinc-800 hover:bg-zinc-50");
  switch (option) {
    case "준비중":
      return cn(row, "bg-green-50 text-green-900");
    case "진행중":
      return cn(row, "bg-sky-50 text-sky-900");
    case "보류":
      return cn(row, "bg-orange-50 text-orange-900");
    case "중단":
      return cn(row, "bg-rose-50 text-rose-900");
    case "완료":
      return cn(row, "bg-emerald-50 text-emerald-900");
    default:
      return cn(row, "bg-zinc-100 text-zinc-900");
  }
}

/** 노출 필터·저장 status 와 동일한 5단계 (준비중 / 진행중 / 보류 / 중단 / 완료) */
export function WorkflowRunStatusChip({ status }: { status: WorkflowRunStatus }) {
  switch (status) {
    case "준비중":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-800 ring-1 ring-green-200">
          <CircleOutlineIcon className="h-3.5 w-3.5 shrink-0 stroke-green-600" />
          준비중
        </span>
      );
    case "진행중":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
          <ClockIcon className="h-3.5 w-3.5 shrink-0 stroke-sky-600" />
          진행중
        </span>
      );
    case "보류":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-800 ring-1 ring-orange-200">
          <PauseMiniIcon className="h-3.5 w-3.5 shrink-0 text-orange-600" />
          보류
        </span>
      );
    case "중단":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800 ring-1 ring-rose-200">
          <StopMiniIcon className="h-3.5 w-3.5 shrink-0 stroke-rose-600" />
          중단
        </span>
      );
    case "완료":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
          완료
        </span>
      );
  }
}

/** 프로젝트 카드 상태 칩 (대기 / 진행중 / 완료) — 기존 WorkflowCard 배지 스타일 재사용 */
export function StatusChip({ status }: { status: ProjectLifecycleStatus }) {
  if (status === "waiting") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200">
        <CircleOutlineIcon className="h-3.5 w-3.5 shrink-0 stroke-zinc-500" />
        {PROJECT_LIFECYCLE_LABEL.waiting}
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
        <ClockIcon className="h-3.5 w-3.5 shrink-0 stroke-sky-600" />
        {PROJECT_LIFECYCLE_LABEL.in_progress}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
      {PROJECT_LIFECYCLE_LABEL.completed}
    </span>
  );
}

/** StatusChip + 드롭다운 — 프로젝트 카드·메모 카드 공통 */
export function EditableLifecycleStatusControl({
  status,
  editable,
  onChange,
  ariaLabelEntity = "프로젝트",
}: {
  status: ProjectLifecycleStatus;
  editable: boolean;
  onChange: (next: ProjectLifecycleStatus) => void;
  /** aria-label 접두(예: "아이디어", "프로젝트") */
  ariaLabelEntity?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const sync = () => {
      const el = buttonRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setMenuPos({ top: Math.round(r.bottom + 8), left: Math.round(r.left) });
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: globalThis.PointerEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!editable) {
    return <StatusChip status={status} />;
  }

  const apply = (next: ProjectLifecycleStatus) => {
    onChange(next);
    setOpen(false);
  };

  const portal =
    open &&
    menuPos &&
    typeof document !== "undefined" &&
    createPortal(
      <>
        <button
          type="button"
          draggable={false}
          className="touch-manipulation fixed inset-0 z-[85] cursor-default bg-transparent"
          aria-label="닫기"
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }}
        />
        <ul
          ref={menuRef}
          role="listbox"
          aria-label={`${ariaLabelEntity} 상태 선택`}
          className="fixed z-[95] min-w-[9.5rem] rounded-2xl bg-white py-1.5 text-left shadow-xl ring-1 ring-zinc-200"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {PROJECT_LIFECYCLE_OPTIONS.map((s) => (
            <li key={s} role="presentation">
              <button
                type="button"
                role="option"
                draggable={false}
                aria-selected={s === status}
                className={cn(
                  "touch-manipulation flex w-full items-center px-3 py-2 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50",
                  s === status && "bg-sky-50 text-sky-900",
                )}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  apply(s);
                }}
              >
                {PROJECT_LIFECYCLE_LABEL[s]}
              </button>
            </li>
          ))}
        </ul>
      </>,
      document.body,
    );

  return (
    <div className="relative z-20 inline-flex shrink-0" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        draggable={false}
        className="touch-manipulation relative z-[1] inline-flex rounded-full border-0 bg-transparent p-0 align-middle outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${ariaLabelEntity} 상태: ${PROJECT_LIFECYCLE_LABEL[status]}. 눌러서 변경`}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <StatusChip status={status} />
      </button>
      {portal}
    </div>
  );
}

/** 프로젝트 카드 — 노출 필터와 동일한 5단계; 드롭다운은 트리거 오른쪽 기준 정렬 */
export function EditableWorkflowRunStatusControl({
  workflowId,
  status,
  editable,
  ariaLabelEntity = "프로젝트",
}: {
  workflowId: string;
  status: WorkflowRunStatus;
  editable: boolean;
  ariaLabelEntity?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const sync = () => {
      const el = buttonRef.current;
      if (!el || typeof window === "undefined") return;
      const r = el.getBoundingClientRect();
      setMenuPos({
        top: Math.round(r.bottom + 8),
        right: Math.round(window.innerWidth - r.right),
      });
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: globalThis.PointerEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!editable) {
    return <WorkflowRunStatusChip status={status} />;
  }

  const apply = (next: WorkflowRunStatus) => {
    setDashboardWorkflowRunStatus(workflowId, next);
    setOpen(false);
  };

  const portal =
    open &&
    menuPos &&
    typeof document !== "undefined" &&
    createPortal(
      <>
        <button
          type="button"
          draggable={false}
          className="touch-manipulation fixed inset-0 z-[85] cursor-default bg-transparent"
          aria-label="닫기"
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }}
        />
        <ul
          ref={menuRef}
          role="listbox"
          aria-label={`${ariaLabelEntity} 노출 상태 선택`}
          className="fixed z-[95] min-w-[10.5rem] origin-top-right rounded-2xl bg-white py-1.5 text-left shadow-xl ring-1 ring-zinc-200 transition-opacity duration-150 ease-out"
          style={{ top: menuPos.top, right: menuPos.right, left: "auto" }}
        >
          {WORKFLOW_CARD_STATUS_OPTIONS.map((s) => (
            <li key={s} role="presentation">
              <button
                type="button"
                role="option"
                draggable={false}
                aria-selected={s === status}
                className={workflowRunStatusMenuRowClass(s, status)}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  apply(s);
                }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      </>,
      document.body,
    );

  return (
    <div className="relative z-20 inline-flex shrink-0" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        draggable={false}
        className="touch-manipulation relative z-[1] inline-flex rounded-full border-0 bg-transparent p-0 align-middle outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${ariaLabelEntity} 노출 상태: ${status}. 눌러서 변경`}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <WorkflowRunStatusChip status={status} />
      </button>
      {portal}
    </div>
  );
}

function CardWorkflowRunStatusControl({
  workflowId,
  status,
  editable,
}: {
  workflowId: string;
  status: WorkflowRunStatus;
  editable: boolean;
}) {
  return <EditableWorkflowRunStatusControl workflowId={workflowId} status={status} editable={editable} />;
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

  const liveWorkflow = getDashboardWorkflow(wf.id);
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
  const cardRunStatus: WorkflowRunStatus = isWorkflowRunStatus(wf.status) ? wf.status : "진행중";

  const stopDeleteNav = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const stopLayoutDragBubble = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={APP_CARD_SHELL_DASHBOARD_CLASS}>
      <div className={APP_CARD_SHELL_DASHBOARD_INNER_CLASS}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {/* 상태 칩은 Link 밖 — 카드 이동과 클릭이 겹치지 않도록 */}
            <div className={APP_CARD_TITLE_TRACK_CLASS}>
              {folder ? <FolderGlyph folder={folder} size="md" className="shrink-0" accentColor={folder.color} /> : null}
              <Link
                href={wf.href}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                className="min-w-0 flex-1 overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-zinc-200"
              >
                <span className={APP_CARD_TITLE_TEXT_CLASS}>{wf.title}</span>
              </Link>
              <div className="flex shrink-0 items-center self-center">
                <CardWorkflowRunStatusControl workflowId={wf.id} status={cardRunStatus} editable />
              </div>
            </div>
          </div>

          <CardActionsOverflow
            className="items-start gap-0"
            menuAriaLabel="프로젝트 작업"
            desktopLeading={
              onTogglePin ? (
                <button
                  type="button"
                  draggable={false}
                  onMouseDown={stopLayoutDragBubble}
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
              ) : null
            }
            mobileLeading={
              onTogglePin ? (
                <button
                  type="button"
                  draggable={false}
                  onMouseDown={stopLayoutDragBubble}
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
              ) : null
            }
          >
            {onCopy ? (
              <button
                type="button"
                draggable={false}
                title="복사"
                aria-label="프로젝트 복사"
                onMouseDown={stopLayoutDragBubble}
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
                onMouseDown={stopLayoutDragBubble}
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
                onMouseDown={stopLayoutDragBubble}
                onClick={(e) => {
                  stopDeleteNav(e);
                  onDelete();
                }}
                className={cn(actionIconButtonClass, "h-8 w-8")}
              >
                <IconTrash />
              </button>
            ) : null}
          </CardActionsOverflow>
        </div>

        <Link
          href={wf.href}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          className="mt-0 block w-full min-w-0 rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-zinc-100"
        >
          {wf.subtitle.trim() ? (
            <p className="mt-2 line-clamp-2 text-sm font-medium text-zinc-500">{wf.subtitle}</p>
          ) : null}
          {dateLine ? <p className="mt-1 text-xs font-medium text-zinc-400">{dateLine}</p> : null}

          <div className="mt-5 w-[calc(100%-10px)] max-w-full">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-sm font-bold text-blue-600">
                {stepsDone}/{wf.stepsTotal} 단계 완료
              </span>
              <span className="text-sm">
                <span className={cn("font-bold", ddayUrgent ? "text-red-600" : "font-semibold text-zinc-400")}>
                  {wf.ddayLabel}
                </span>
                <span className="ml-2 font-medium text-zinc-400">{progress}%</span>
              </span>
            </div>

            <div className="mt-2.5 h-[7px] w-full overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-blue-600 transition-[width]" style={{ width: `${progress}%` }} />
            </div>
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
      </div>
    </div>
  );
}
