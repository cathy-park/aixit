"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EditableWorkflowStepCard,
  type EditableStep,
} from "@/components/recommendation/EditableWorkflowStepCard";
import type { RecommendationResult } from "@/lib/recommendations";
import { ToolPickerModal } from "@/components/tools/ToolPickerModal";
import { appendUserLayoutEntry } from "@/lib/dashboard-layout-store";
import { loadDashboardFolders, pickDefaultProjectFolderId } from "@/lib/dashboard-folders-store";
import { addDashboardWorkflow } from "@/lib/workflows-store";
import type { WorkspaceWorkflow } from "@/lib/workspace-store";
import { DetailPageWrapper } from "@/components/layout/DetailPageWrapper";

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `step_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function RecommendationBuilder({
  taskType,
  preset,
}: {
  taskType: string;
  preset: RecommendationResult | null;
}) {
  const router = useRouter();
  const description = preset?.taskDescription?.trim() ?? "";

  const seededSteps = useMemo<EditableStep[]>(
    () =>
      (preset?.steps ?? []).map((s) => ({
        id: makeId(),
        title: s.title,
        toolIds: s.toolIds,
      })),
    [preset?.taskType],
  );

  const [builderSteps, setBuilderSteps] = useState<EditableStep[]>(seededSteps);
  const [toolPicker, setToolPicker] = useState<{ open: boolean; stepId: string | null }>({ open: false, stepId: null });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetFolderId, setTargetFolderId] = useState("ddokdi");

  const folderOptions = useMemo(() => loadDashboardFolders().filter((f) => !f.hidden), []);

  useEffect(() => {
    setBuilderSteps(seededSteps);
    setStartDate("");
    setEndDate("");
    setTargetFolderId(pickDefaultProjectFolderId(loadDashboardFolders()));
  }, [seededSteps]);

  const workflowName = useMemo(() => {
    if (preset?.taskTitle) return `${preset.taskTitle} workflow`;
    const first = builderSteps[0]?.title?.trim();
    if (first) return first;
    return "새 워크플로우";
  }, [preset?.taskTitle, builderSteps]);

  const canStart = builderSteps.length > 0;

  return (
    <DetailPageWrapper>
      <header className="pb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/workflows"
              className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-700 hover:text-zinc-950"
            >
              <span aria-hidden>←</span>
              워크플로우
            </Link>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-950">프로젝트 추가</h1>
            <p className="mt-1 mb-5 text-sm text-zinc-600 sm:text-base">폴더·일정을 정한 뒤 단계를 쌓고 시작하세요.</p>
          </div>
          <Link
            href="/projects"
            className="shrink-0 self-start rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50 sm:self-auto"
          >
            대시보드
          </Link>
        </div>
      </header>

      <main className="pb-12 pt-6">
        <div className="space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
            <div className="text-sm font-semibold text-zinc-900">프로젝트 폴더</div>
            <p className="mt-1 text-xs text-zinc-500">생성되는 워크플로우가 들어갈 프로젝트 폴더를 선택하세요.</p>
            <select
              value={targetFolderId}
              onChange={(e) => setTargetFolderId(e.target.value)}
              className="mt-3 block w-full max-w-md rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
            >
              {folderOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.emoji} {f.name}
                </option>
              ))}
            </select>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
            <div className="text-sm font-semibold text-zinc-900">일정</div>
            <p className="mt-1 text-xs text-zinc-500">대시보드 카드에 시작일·마감일과 D-day가 표시됩니다.</p>
            <div className="mt-4 flex flex-wrap gap-4">
              <label className="block min-w-[140px] flex-1">
                <span className="text-xs font-semibold text-zinc-500">시작일</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
                />
              </label>
              <label className="block min-w-[140px] flex-1">
                <span className="text-xs font-semibold text-zinc-500">마감일</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
                />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-900">추천된 작업 순서</div>
              <div className="text-xs font-semibold text-zinc-500">총 {builderSteps.length}단계</div>
            </div>

            {builderSteps.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-sm text-zinc-600 shadow-sm ring-1 ring-zinc-200">
                아래 <span className="font-semibold text-zinc-900">단계 추가하기</span>로 첫 단계를 만들어보세요.
              </div>
            ) : (
              <div className="space-y-3">
                {builderSteps.map((s, idx) => (
                  <EditableWorkflowStepCard
                    key={s.id}
                    index={idx + 1}
                    step={s}
                    onChange={(next) => setBuilderSteps((prev) => prev.map((p) => (p.id === s.id ? next : p)))}
                    onDelete={() => setBuilderSteps((prev) => prev.filter((p) => p.id !== s.id))}
                    onAddTool={() => setToolPicker({ open: true, stepId: s.id })}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                setBuilderSteps((prev) => [
                  ...prev,
                  {
                    id: makeId(),
                    title: "",
                    toolIds: [],
                  },
                ])
              }
              className="w-full rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-zinc-800 shadow-sm ring-1 ring-zinc-200 transition hover:bg-zinc-50"
            >
              단계 추가하기
            </button>
          </section>

          <button
            type="button"
            onClick={() => {
              if (!canStart) return;
              const workflow: WorkspaceWorkflow = {
                id: `wf_${Date.now().toString(16)}`,
                name: workflowName,
                subtitle: description || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                steps: builderSteps.map((s) => ({
                  id: s.id,
                  title: s.title.trim() || "단계",
                  toolIds: s.toolIds ?? [],
                  memos: [],
                  fallbackEmoji: s.fallbackEmoji,
                  fallbackColor: s.fallbackColor,
                  fallbackImageUrl: s.fallbackImageUrl,
                  navigatorIconType: s.navigatorIconType,
                  navigatorLucideIcon: s.navigatorLucideIcon,
                })),
                currentStepIndex: 0,
                createdAt: Date.now(),
                sourceTaskType: taskType.trim() || undefined,
                status: "진행중",
              };
              addDashboardWorkflow({ ...workflow, folderId: targetFolderId });
              appendUserLayoutEntry(workflow.id, targetFolderId);
              router.push("/projects");
            }}
            disabled={!canStart}
            className="w-full rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            이 워크플로우로 시작하기
          </button>
        </div>
      </main>

      <ToolPickerModal
        open={toolPicker.open}
        onClose={() => setToolPicker({ open: false, stepId: null })}
        onPick={(tool) => {
          const stepId = toolPicker.stepId;
          if (!stepId) return;
          setBuilderSteps((prev) =>
            prev.map((s) => {
              if (s.id !== stepId) return s;
              if (s.toolIds.includes(tool.id)) return s;
              return { ...s, toolIds: [...s.toolIds, tool.id] };
            }),
          );
        }}
      />
    </DetailPageWrapper>
  );
}
