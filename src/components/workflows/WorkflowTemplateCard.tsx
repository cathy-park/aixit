"use client";

import type { DragEvent, MouseEvent } from "react";
import Link from "next/link";
import { ToolMiniAvatar } from "@/components/tools/ToolMiniAvatar";
import { cn } from "@/components/ui/cn";
import type { WorkflowTemplateListItem } from "@/lib/aixit-data";
import { useMergedTools } from "@/hooks/useMergedTools";
import { getMergedToolById } from "@/lib/user-tools-store";
import { actionIconButtonClass, IconCopy, IconStarPin, IconTrash } from "@/components/ui/action-icons";

function stopNav(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export function WorkflowTemplateCard({
  t,
  pinned,
  onTogglePin,
  onCopy,
  onDelete,
  deleteDisabled = false,
  dnd,
}: {
  t: WorkflowTemplateListItem;
  pinned?: boolean;
  onTogglePin?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  dnd?: {
    mime: string;
    onMoveBefore: (dragId: string, beforeId: string) => void;
  };
}) {
  const { tools: toolCatalog } = useMergedTools();
  const toolById = (id: string) => toolCatalog.find((x) => x.id === id) ?? getMergedToolById(id);

  const draggable = Boolean(dnd);
  const handleDragStart = (e: DragEvent) => {
    if (!dnd) return;
    e.dataTransfer.setData(dnd.mime, t.templateId);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: DragEvent) => {
    if (!dnd) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (e: DragEvent) => {
    if (!dnd) return;
    e.preventDefault();
    const raw = e.dataTransfer.getData(dnd.mime);
    if (!raw || raw === t.templateId) return;
    dnd.onMoveBefore(raw, t.templateId);
  };

  return (
    <div
      className={cn(
        "flex rounded-[28px] bg-white p-5 shadow-md shadow-zinc-200/50 ring-1 ring-zinc-200/80",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onDragOver={draggable ? handleDragOver : undefined}
      onDrop={draggable ? handleDrop : undefined}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <Link
            href={`/workflow/${encodeURIComponent(t.slug)}`}
            className="min-w-0 flex-1 rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-zinc-100"
            draggable={draggable}
            onDragStart={draggable ? handleDragStart : undefined}
            onDragOver={draggable ? handleDragOver : undefined}
            onDrop={draggable ? handleDrop : undefined}
          >
            <div className="flex flex-wrap items-center gap-2 gap-y-1">
              <span className="truncate text-lg font-bold tracking-tight text-zinc-950">{t.title}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-medium text-zinc-500">{t.subtitle}</p>
            <p className="mt-3 text-xs font-semibold text-zinc-400">{t.stepCount}단계 · 추천 도구 미리보기</p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-zinc-500">주요 도구:</span>
              <div className="flex items-center pl-1">
                {t.previewToolIds.map((id, i) => (
                  <div
                    key={id}
                    className={cn("-ml-2 first:ml-0", i === 0 && "z-30", i === 1 && "z-20", i === 2 && "z-10")}
                  >
                    <ToolMiniAvatar tool={toolById(id)} size="md" />
                  </div>
                ))}
              </div>
            </div>
          </Link>

          <div className="flex shrink-0 flex-row items-start gap-0.5">
            {onTogglePin ? (
              <button
                type="button"
                draggable={false}
                onClick={(e) => {
                  stopNav(e);
                  onTogglePin();
                }}
                className={cn(
                  actionIconButtonClass,
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
                title="프로젝트로 복사"
                aria-label="프로젝트로 복사"
                onClick={(e) => {
                  stopNav(e);
                  onCopy();
                }}
                className={actionIconButtonClass}
              >
                <IconCopy />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                draggable={false}
                disabled={deleteDisabled}
                title={deleteDisabled ? "삭제할 수 없어요" : "라이브러리에서 숨기기"}
                aria-label="라이브러리에서 숨기기"
                onClick={(e) => {
                  stopNav(e);
                  if (deleteDisabled) return;
                  onDelete();
                }}
                className={actionIconButtonClass}
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
