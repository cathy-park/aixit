"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { cn } from "@/components/ui/cn";
import { IconTrash } from "@/components/ui/action-icons";
import type { RecommendedStep } from "@/lib/recommendations";
import { isNavigatorImageSource, normalizeNavigatorImageSource } from "@/lib/http-url";
import { resolveFolderLucideIcon } from "@/lib/folder-lucide-icons";
import type { DashboardFolderIconType } from "@/lib/dashboard-folders-store";
import { tools as defaultTools, type Tool } from "@/lib/tools";

export type NavigatorStatus = "completed" | "in_progress" | "waiting";

const STEP_DND = "application/aixit-workspace-step";

export type NavigatorStep = RecommendedStep & { id?: string };

function stepKey(s: NavigatorStep, idx: number) {
  return s.id ?? `nav-step-${idx}`;
}

function OpenAiMarkNav({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.096 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.055 6.055 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.744-7.097zm-9.022 12.303a4.475 4.475 0 0 1-2.876-1.04l.141-.08 4.779-2.758a.785.785 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM4.935 17.392a4.482 4.482 0 0 1-.535-3.014l.142.085 4.783 2.759a.77.77 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.196-1.658l-.609-1.003-.001-.001zm-1.59-10.831a4.469 4.469 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.675l5.815 3.354-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.5 6.561l-.155-1zm15.89-.645-5.833-3.387L15.63 1.36a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.104v-5.678a.79.79 0 0 0-.407-.667zm2.01 3.022-.141-.085-4.774-2.782a.776.776 0 0 0-.785-.001L8.06 8.92V6.588a.066.066 0 0 1 .029-.061l4.81-2.768a4.5 4.5 0 0 1 6.68 4.66zm-16.34 3.455 2.022-1.159v2.322a.07.07 0 0 1-.028.062L7.07 15.7a4.505 4.505 0 0 1-1.305-8.454l5.833-3.371-.002 2.332a.79.79 0 0 0 .388.67l5.815 3.354-2.02 1.168a.076.076 0 0 1-.072 0l-4.828-2.785z" />
    </svg>
  );
}

function NavigatorStepLeadIcon({
  tool,
  fallbackEmoji,
  fallbackColor,
  fallbackImageUrl,
  navigatorIconType,
  navigatorLucideIcon,
}: {
  tool: Tool | null;
  fallbackEmoji?: string;
  fallbackColor?: string;
  fallbackImageUrl?: string;
  navigatorIconType?: DashboardFolderIconType;
  navigatorLucideIcon?: string | null;
}) {
  const box =
    "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-white ring-1 ring-zinc-200";
  if (!tool) {
    const raw = fallbackColor?.trim() ?? "";
    const bg = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(raw) ? raw : "#27272a";
    const imgRaw = fallbackImageUrl?.trim() ?? "";
    const imgSrc = normalizeNavigatorImageSource(imgRaw);
    if (isNavigatorImageSource(imgSrc)) {
      return (
        <div className={cn(box, "ring-zinc-200/80")} style={{ backgroundColor: bg }} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgSrc} alt="" className="h-full w-full object-cover" />
        </div>
      );
    }
    // "도구가 없을 때" 내비게이터 아이콘은 라인(루시드)만 표시합니다.
    const lucideId = (navigatorLucideIcon?.trim() || "FolderOpen") as string;
    const Icon = resolveFolderLucideIcon(lucideId);
    return (
      <div className={cn(box, "ring-zinc-200/80")} style={{ backgroundColor: bg }} aria-hidden>
        <Icon className="h-4 w-4 text-white" strokeWidth={2} />
      </div>
    );
  }
  const url = tool.logoImageUrl?.trim();
  const hex = tool.avatarBackgroundColor?.trim();
  if (url) {
    return (
      <div
        className={cn(box, "ring-zinc-200/80")}
        style={{ backgroundColor: hex && /^#/.test(hex) ? hex : "#f4f4f5" }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  if (tool.id === "tool_chatgpt") {
    const gptBg = hex && /^#/.test(hex) ? hex : "#059669";
    return (
      <div className={cn(box, "text-white ring-emerald-500/35")} style={{ backgroundColor: gptBg }} aria-hidden>
        <OpenAiMarkNav className="h-5 w-5" />
      </div>
    );
  }
  const label = (tool.logoText ?? tool.name ?? "?").slice(0, 3);
  return (
    <div
      className={cn(box, "ring-zinc-200/80", !hex && "bg-zinc-900", tool.cardAvatarClassName)}
      style={hex && /^#/.test(hex) ? { backgroundColor: hex } : undefined}
      aria-hidden
    >
      <span className={cn("font-extrabold tracking-tight", label.length <= 2 ? "text-[11px]" : "text-[10px]")}>
        {label}
      </span>
    </div>
  );
}

export function WorkflowNavigatorBar({
  steps,
  selectedIndex,
  onSelect,
  statuses,
  className,
  hideTitle,
  onReorder,
  onAddStep,
  onDeleteStep,
  canDelete,
  toolsCatalog,
}: {
  steps: NavigatorStep[];
  selectedIndex: number;
  onSelect: (idx: number) => void;
  statuses?: NavigatorStatus[];
  className?: string;
  hideTitle?: boolean;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onAddStep?: () => void;
  onDeleteStep?: () => void;
  /** STEP 삭제 가능 여부 (최소 1단계 유지) */
  canDelete?: boolean;
  toolsCatalog?: Tool[];
}) {
  const catalog = toolsCatalog ?? defaultTools;
  const toolById = (id?: string) => {
    if (!id) return null;
    return catalog.find((t) => t.id === id) ?? null;
  };
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragEnabled = Boolean(onSelect); // step 이동용 드래그 항상 허용
  const reorderable = Boolean(onReorder); // 순서 변경까지 원할 때만 onReorder 사용

  const scrollWrapRef = useRef<HTMLDivElement | null>(null);
  const stepBtnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    // steps 길이가 바뀌면 ref 배열도 갱신
    stepBtnRefs.current = stepBtnRefs.current.slice(0, steps.length);
  }, [steps.length]);

  useEffect(() => {
    const btn = stepBtnRefs.current[selectedIndex];
    if (!btn) return;
    // 선택된 STEP이 화면 밖으로 밀려서 테두리가 잘리는 문제 방지
    btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedIndex]);

  const handleDragStart = (idx: number) => (e: DragEvent) => {
    if (!dragEnabled) return;
    e.dataTransfer.setData(STEP_DND, String(idx));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (idx: number) => (e: DragEvent) => {
    if (!dragEnabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  };

  const handleDragLeave = () => setDragOverIdx(null);

  const handleDrop = (toIndex: number) => (e: DragEvent) => {
    if (!dragEnabled) return;
    e.preventDefault();
    setDragOverIdx(null);
    const raw = e.dataTransfer.getData(STEP_DND);
    const from = Number.parseInt(raw, 10);
    if (Number.isNaN(from) || from === toIndex) return;
    if (reorderable && onReorder) {
      onReorder(from, toIndex);
    } else {
      // 순서 변경 기능이 없는 화면에서는 드래그 드롭으로 "이동(선택 변경)"만 합니다.
      onSelect(toIndex);
    }
  };

  const handleDragEnd = () => setDragOverIdx(null);

  return (
    <div className={cn("rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200", className)}>
      {!hideTitle ? <div className="text-sm font-semibold">추천 workflow navigator</div> : null}

      <div
        className={cn("overflow-x-auto overflow-y-visible py-1 px-4 sm:px-6", !hideTitle && "mt-4")}
        ref={scrollWrapRef}
      >
        <div className="flex min-w-max items-center">
          {steps.map((s, idx) => {
            const primary =
              (s.toolIds ?? []).map((id) => toolById(id)).find((t): t is Tool => Boolean(t)) ??
              toolById(s.primaryToolId);
            const selected = idx === selectedIndex;
            const status = statuses?.[idx];
            const statusDot =
              status === "completed"
                ? "bg-emerald-500"
                : status === "in_progress"
                  ? "bg-zinc-900"
                  : status === "waiting"
                    ? "bg-zinc-300"
                    : "";
            const dropHighlight = reorderable && dragOverIdx === idx;

            return (
              <div key={stepKey(s, idx)} className="flex items-center">
                <div
                  onDragOver={dragEnabled ? handleDragOver(idx) : undefined}
                  onDragLeave={dragEnabled ? handleDragLeave : undefined}
                  onDrop={dragEnabled ? handleDrop(idx) : undefined}
                  className={cn(
                    "flex items-center rounded-2xl transition",
                    dropHighlight && "bg-sky-50 ring-2 ring-sky-200",
                  )}
                >
                  <button
                    type="button"
                    draggable={dragEnabled}
                    onDragStart={dragEnabled ? handleDragStart(idx) : undefined}
                    onDragEnd={dragEnabled ? handleDragEnd : undefined}
                    onClick={() => onSelect(idx)}
                    ref={(el) => {
                      stepBtnRefs.current[idx] = el;
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2 text-left transition",
                      "hover:bg-zinc-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-100",
                      selected && "bg-zinc-50 ring-1 ring-zinc-200",
                      dragEnabled && "cursor-grab active:cursor-grabbing",
                    )}
                    aria-label={`STEP ${idx + 1} ${s.title}`}
                    title={reorderable ? "드래그하여 순서 변경" : "드래그하여 이동"}
                  >
                    <div className="relative">
                      <NavigatorStepLeadIcon
                        tool={primary}
                        fallbackEmoji={s.stepFallbackEmoji}
                        fallbackColor={s.stepFallbackColor}
                        fallbackImageUrl={s.stepFallbackImageUrl}
                        navigatorIconType={s.stepNavigatorIconType}
                        navigatorLucideIcon={s.stepFallbackLucideIcon}
                      />
                      {status ? (
                        <span
                          className={cn(
                            "absolute -bottom-1 -right-1 h-3 w-3 rounded-full ring-2 ring-white",
                            statusDot,
                          )}
                          aria-hidden="true"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-zinc-500">STEP {idx + 1}</div>
                      <div className="max-w-[180px] truncate text-sm font-semibold text-zinc-900">{s.title}</div>
                    </div>
                  </button>
                </div>
                {idx < steps.length - 1 ? (
                  <div
                    className={cn(
                      "mx-2 h-[2px] w-10 rounded-full sm:w-14",
                      status === "completed" ? "bg-emerald-200" : "bg-zinc-200",
                    )}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {onAddStep || onDeleteStep ? (
        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
          {onAddStep ? (
            <button
              type="button"
              onClick={onAddStep}
              className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              STEP 추가
            </button>
          ) : null}
          {onDeleteStep ? (
            <button
              type="button"
              onClick={onDeleteStep}
              disabled={!canDelete}
              title="STEP 삭제"
              aria-label="STEP 삭제"
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#9da2b0] ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconTrash className="h-4 w-4" />
              <span>STEP 삭제</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
