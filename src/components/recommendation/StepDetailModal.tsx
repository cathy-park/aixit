"use client";

import { useMemo } from "react";
import { cn } from "@/components/ui/cn";
import { APP_CARD_GRID_CLASS } from "@/components/cards/app-card-layout";
import { ToolCard } from "@/components/tools/ToolCard";
import { useMergedTools } from "@/hooks/useMergedTools";

export function StepDetailModal({
  open,
  onClose,
  stepNumber,
  title,
  description,
  toolIds,
  tips,
}: {
  open: boolean;
  onClose: () => void;
  stepNumber: number;
  title: string;
  description?: string;
  toolIds: string[];
  tips?: string[];
}) {
  const { tools } = useMergedTools();

  const toolList = useMemo(
    () =>
      toolIds
        .map((id) => tools.find((t) => t.id === id))
        .filter((t): t is NonNullable<typeof t> => Boolean(t)),
    [toolIds, tools],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`STEP ${stepNumber} 상세`}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
        aria-label="모달 닫기"
      />

      <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl ring-1 ring-zinc-200">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-zinc-500">STEP {stepNumber}</div>
            <div className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-full bg-zinc-50 px-3 py-1.5 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200",
              "hover:bg-white",
            )}
          >
            닫기
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {description?.trim() ? (
            <div>
              <div className="text-xs font-semibold text-zinc-500">이 단계에서 하는 일</div>
              <div className="mt-2 text-sm text-zinc-700">{description.trim()}</div>
            </div>
          ) : null}

          <div>
            <div className="text-xs font-semibold text-zinc-500">추천 도구</div>
            <div className={cn("mt-3", APP_CARD_GRID_CLASS)}>
              {toolList.length === 0 ? (
                <div className="col-span-full text-sm text-zinc-500">연결된 도구가 없어요.</div>
              ) : null}
              {toolList.map((tool) => (
                <ToolCard key={tool.id} mode="warehouse" tool={tool} />
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-zinc-500">진행 팁 / 메모</div>
            <div className="mt-2 space-y-2">
              {(tips ?? []).length === 0 ? (
                <div className="text-sm text-zinc-500">필요하면 체크리스트를 추가해보세요.</div>
              ) : (
                (tips ?? []).map((tip, idx) => (
                  <div key={idx} className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700 ring-1 ring-zinc-200">
                    {tip}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

