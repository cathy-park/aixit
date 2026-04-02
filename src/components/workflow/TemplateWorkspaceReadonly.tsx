"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkflowDetail, WorkflowPreview } from "@/lib/aixit-data";
import { appendUserLayoutEntry } from "@/lib/dashboard-layout-store";
import { loadDashboardFolders, pickDefaultProjectFolderId } from "@/lib/dashboard-folders-store";
import { WorkflowNavigatorBar, type NavigatorStatus } from "@/components/recommendation/WorkflowNavigatorBar";
import { ToolCard } from "@/components/tools/ToolCard";
import { useMergedTools } from "@/hooks/useMergedTools";
import {
  buildTemplatePreviewDashboardWorkflow,
  createProjectFromTemplate,
  listDashboardWorkflowsByTemplateId,
  type DashboardWorkflow,
} from "@/lib/workflows-store";
import { createProjectFromUserTemplate, isUserWorkflowTemplateId } from "@/lib/user-workflow-templates-store";
import { cn } from "@/components/ui/cn";
import { DetailPageWrapper } from "@/components/layout/DetailPageWrapper";

export function TemplateWorkspaceReadonly({ detail, preview }: { detail: WorkflowDetail; preview: WorkflowPreview }) {
  const router = useRouter();
  const { tools: toolCatalog } = useMergedTools();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [linkedProjects, setLinkedProjects] = useState<DashboardWorkflow[]>([]);
  const [newProjectFolderId, setNewProjectFolderId] = useState(() =>
    pickDefaultProjectFolderId(loadDashboardFolders()),
  );

  const projectFolderOptions = useMemo(() => loadDashboardFolders().filter((f) => !f.hidden), [detail.id]);

  const refreshLinked = useCallback(() => {
    setLinkedProjects(listDashboardWorkflowsByTemplateId(detail.id));
  }, [detail.id]);

  useEffect(() => {
    refreshLinked();
    const onWf = () => refreshLinked();
    window.addEventListener("aixit-workflows-updated", onWf);
    return () => window.removeEventListener("aixit-workflows-updated", onWf);
  }, [refreshLinked]);

  useEffect(() => {
    setNewProjectFolderId(pickDefaultProjectFolderId(loadDashboardFolders()));
  }, [detail.id]);

  const wf = useMemo(() => buildTemplatePreviewDashboardWorkflow(detail, preview), [detail, preview]);

  const navSteps = useMemo(
    () =>
      wf.steps.map((s) => ({
        id: s.id,
        title: s.title,
        toolIds: s.toolIds,
        primaryToolId: s.toolIds[0],
      })),
    [wf.steps],
  );

  const statuses: NavigatorStatus[] = useMemo(() => {
    if (wf.status === "완료") return wf.steps.map(() => "completed" as const);
    if (wf.status === "준비중") return wf.steps.map(() => "waiting" as const);
    return wf.steps.map((_, idx) => {
      if (idx < wf.currentStepIndex) return "completed";
      if (idx === wf.currentStepIndex) return "in_progress";
      return "waiting";
    });
  }, [wf]);

  const currentStep = wf.steps[currentIndex] ?? null;
  const currentTools = useMemo(() => {
    if (!currentStep) return [];
    return currentStep.toolIds
      .map((id) => toolCatalog.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
  }, [currentStep, toolCatalog]);

  const relatedLinks = wf.relatedLinks ?? [];
  const workflowMemos = wf.workflowMemos ?? [];

  const handleCreateProject = () => {
    const fid = newProjectFolderId;
    const proj = isUserWorkflowTemplateId(detail.id)
      ? createProjectFromUserTemplate(detail.id, fid)
      : createProjectFromTemplate(detail.id, fid);
    if (!proj) return;
    appendUserLayoutEntry(proj.id, fid);
    router.push(`/workspace?id=${encodeURIComponent(proj.id)}`);
  };

  return (
    <DetailPageWrapper>
      <header className="pb-3">
        <Link
          href="/workflows"
          className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-700 hover:text-zinc-950"
        >
          <span aria-hidden>←</span>
          워크플로우 템플릿
        </Link>
        <div className="mt-3 flex flex-col gap-3">
          {/* 1단: 제목 + 우측 액션 */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <label className="block">
                <span className="sr-only">워크플로우 템플릿 제목</span>
                <input
                  value={wf.name}
                  readOnly
                  className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white px-3 py-2 text-2xl font-semibold tracking-tight text-zinc-950 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
                />
              </label>
              {wf.subtitle ? <p className="text-sm font-medium text-zinc-600">{wf.subtitle}</p> : null}
            </div>

            <div className="flex w-full shrink-0 flex-col items-stretch gap-3 sm:w-auto sm:items-end">
              <label className="block w-full sm:max-w-[220px]">
                <span className="text-xs font-semibold text-zinc-500">프로젝트 폴더</span>
                <select
                  value={newProjectFolderId}
                  onChange={(e) => setNewProjectFolderId(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
                >
                  {projectFolderOptions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.emoji} {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={handleCreateProject}
                className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-zinc-800"
              >
                프로젝트 생성
              </button>
              {linkedProjects.length > 0 ? (
                <div className="text-right text-[11px] font-semibold text-zinc-400">
                  기존에 이 템플릿으로 만든 프로젝트가 {linkedProjects.length}개 있어요.
                </div>
              ) : null}
            </div>
          </div>

          <p className="text-xs font-semibold text-zinc-600">
            STEP {Math.min(currentIndex + 1, Math.max(wf.steps.length, 1))} / {Math.max(wf.steps.length, 1)} · 템플릿 미리보기
          </p>
        </div>
      </header>

      <main className="space-y-6 pb-12 pt-6">
        <WorkflowNavigatorBar
          hideTitle
          steps={navSteps}
          selectedIndex={currentIndex}
          statuses={statuses}
          onSelect={setCurrentIndex}
          className="bg-white"
          toolsCatalog={toolCatalog}
        />

        <section className="rounded-2xl bg-white p-6 ring-1 ring-zinc-200">
          <div className="text-xs font-semibold text-zinc-500">현재 STEP</div>
          <div className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">{currentStep?.title ?? "—"}</div>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-zinc-100 pt-6">
            <div className="text-sm font-semibold">연결된 도구</div>
            <span className="text-xs font-semibold text-zinc-500">{currentTools.length}개</span>
          </div>

          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            {currentTools.length === 0 ? (
              <div className="rounded-2xl bg-zinc-50/80 p-6 text-sm text-zinc-600 ring-1 ring-zinc-200 sm:col-span-2">
                이 단계에 매핑된 도구가 없어요.
              </div>
            ) : (
              currentTools.map((t) => <ToolCard key={t.id} mode="workflow" tool={t} />)
            )}
          </div>

          <div className="mt-6 border-t border-zinc-100 pt-6">
            <div className="text-sm font-semibold">이 단계 메모</div>
            <p className="mt-1 text-xs text-zinc-500">템플릿 미리보기에서는 메모를 저장하지 않습니다.</p>
            <p className="mt-3 text-sm text-zinc-400">프로젝트로 만든 뒤 작성할 수 있어요.</p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 ring-1 ring-zinc-200">
            <div className="text-sm font-semibold">관련 링크</div>
            <p className="mt-1 text-xs text-zinc-500">템플릿에 포함된 참고 링크입니다.</p>
            <ul className="mt-4 space-y-2">
              {relatedLinks.length === 0 ? (
                <li className="text-sm text-zinc-500">등록된 링크가 없어요.</li>
              ) : (
                relatedLinks.map((l) => (
                  <li key={l.id} className="rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-200">
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900"
                    >
                      {l.label}
                    </a>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-2xl bg-white p-6 ring-1 ring-zinc-200">
            <div className="text-sm font-semibold">워크플로우 공통 메모</div>
            <p className="mt-1 text-xs text-zinc-500">템플릿 설명용 메모입니다. (읽기 전용)</p>
            <ul className="mt-4 space-y-2">
              {workflowMemos.length === 0 ? (
                <li className="text-sm text-zinc-500">메모가 없어요.</li>
              ) : (
                workflowMemos.map((m) => (
                  <li
                    key={m.id}
                    className={cn("rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-800 ring-1 ring-zinc-200")}
                  >
                    <span className="whitespace-pre-wrap">{m.text}</span>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </main>
    </DetailPageWrapper>
  );
}
