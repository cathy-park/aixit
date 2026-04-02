"use client";

import { cn } from "@/components/ui/cn";
import { StepNavigatorIconSection } from "@/components/workspace/StepNavigatorIconSection";
import { ToolAvatar } from "@/components/tools/ToolAvatar";
import { useMergedTools } from "@/hooks/useMergedTools";
import { actionIconButtonClass, IconTrash } from "@/components/ui/action-icons";
import type { DashboardFolderIconType } from "@/lib/dashboard-folders-store";

export type EditableStep = {
  id: string;
  title: string;
  toolIds: string[];
  fallbackEmoji?: string;
  fallbackColor?: string;
  fallbackImageUrl?: string;
  navigatorIconType?: DashboardFolderIconType;
  navigatorLucideIcon?: string | null;
};

export function EditableWorkflowStepCard({
  index,
  step,
  onChange,
  onDelete,
  onAddTool,
  className,
}: {
  index: number;
  step: EditableStep;
  onChange: (next: EditableStep) => void;
  onDelete: () => void;
  onAddTool: () => void;
  className?: string;
}) {
  const { tools: catalog } = useMergedTools();
  const selectedTools = step.toolIds
    .map((id) => catalog.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <div className={cn("relative rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200", className)}>
      <button
        type="button"
        onClick={onDelete}
        className={cn(actionIconButtonClass, "absolute right-4 top-4")}
        title={`STEP ${index} 삭제`}
        aria-label={`STEP ${index} 삭제`}
      >
        <IconTrash />
      </button>

      <div className="flex items-start justify-between gap-4 pr-14">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-zinc-500">STEP {index}</div>
          <label className="mt-2 block">
            <div className="sr-only">단계 제목</div>
            <input
              value={step.title}
              onChange={(e) => onChange({ ...step, title: e.target.value })}
              placeholder="단계 제목을 입력하세요"
              className={cn(
                "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-base font-semibold tracking-tight text-zinc-950",
                "outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100",
              )}
            />
          </label>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-zinc-500">도구</div>
          <button
            type="button"
            onClick={onAddTool}
            className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
          >
            도구 추가
          </button>
        </div>

        {selectedTools.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedTools.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-50 px-3 py-1 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200"
              >
                <ToolAvatar text={t.logoText ?? t.name} size="sm" className="h-6 w-6 rounded-full" />
                <span>{t.name}</span>
                <button
                  type="button"
                  onClick={() => onChange({ ...step, toolIds: step.toolIds.filter((id) => id !== t.id) })}
                  className="ml-1 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
                  aria-label={`${t.name} 제거`}
                >
                  제거
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="text-sm text-zinc-500">도구를 추가하면 로고가 내비게이터에 표시돼요.</div>
            <div className="rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-200">
              <div className="text-xs font-semibold text-zinc-600">도구가 없을 때 내비 아이콘</div>
              <p className="mt-1 text-[11px] text-zinc-500">폴더·카테고리와 동일한 아이콘 선택 UI입니다.</p>
              <StepNavigatorIconSection
                compact
                className="mt-3"
                step={step}
                onApply={(patch) => onChange({ ...step, ...patch })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
