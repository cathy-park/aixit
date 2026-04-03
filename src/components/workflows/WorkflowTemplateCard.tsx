"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { ToolMiniAvatar } from "@/components/tools/ToolMiniAvatar";
import { cn } from "@/components/ui/cn";
import type { WorkflowTemplateListItem } from "@/lib/aixit-data";
import { useMergedTools } from "@/hooks/useMergedTools";
import { getMergedToolById } from "@/lib/user-tools-store";
import { actionIconButtonClass, IconCopy, IconStarPin, IconTrash } from "@/components/ui/action-icons";
import { CardActionsOverflow } from "@/components/cards/CardActionsOverflow";
import {
  APP_CARD_SHELL_DASHBOARD_CLASS,
  APP_CARD_TITLE_TEXT_CLASS,
  APP_CARD_TITLE_TRACK_CLASS,
} from "@/components/cards/app-card-layout";

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
}: {
  t: WorkflowTemplateListItem;
  pinned?: boolean;
  onTogglePin?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
}) {
  const { tools: toolCatalog } = useMergedTools();
  const toolById = (id: string) => toolCatalog.find((x) => x.id === id) ?? getMergedToolById(id);

  return (
    <div className={APP_CARD_SHELL_DASHBOARD_CLASS}>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <Link
            href={`/workflow/${encodeURIComponent(t.slug)}`}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="min-w-0 flex-1 rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-zinc-100"
          >
            <div className={APP_CARD_TITLE_TRACK_CLASS}>
              <span className={APP_CARD_TITLE_TEXT_CLASS}>{t.title}</span>
            </div>
            {t.subtitle.trim() ? (
              <p className="mt-2 line-clamp-2 text-sm font-medium text-zinc-500">{t.subtitle.trim()}</p>
            ) : null}

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

          <CardActionsOverflow
            className="items-start gap-0.5"
            menuAriaLabel="템플릿 작업"
            desktopLeading={
              onTogglePin ? (
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
              ) : null
            }
            mobileLeading={
              onTogglePin ? (
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
              ) : null
            }
          >
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
          </CardActionsOverflow>
        </div>
      </div>
    </div>
  );
}
