"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WorkflowRunStatus } from "@/lib/workflow-run-status";
import { workflows } from "@/lib/aixit-data";
import {
  ensureDashboardWorkflow,
  isDashboardProjectInstanceId,
  saveDashboardWorkflow,
  setDashboardWorkflowFolder,
  type DashboardWorkflow,
} from "@/lib/workflows-store";
import { loadDashboardFolders } from "@/lib/dashboard-folders-store";
import {
  appendUserLayoutEntry,
  ensureLayoutMerged,
  saveLayout,
  updateEntryFolder,
} from "@/lib/dashboard-layout-store";
import { getTodayIsoLocal } from "@/lib/today-project-filter";
import { WORKFLOW_STATUS_OPTIONS } from "@/lib/workflow-run-status";
import type { WorkspaceLinkItem, WorkspaceMemoItem } from "@/lib/workspace-store";
import { WorkflowNavigatorBar, type NavigatorStatus } from "@/components/recommendation/WorkflowNavigatorBar";
import { ToolCard } from "@/components/tools/ToolCard";
import { useMergedTools } from "@/hooks/useMergedTools";
import { ToolPickerModal } from "@/components/tools/ToolPickerModal";
import {
  StepNavigatorIconSection,
  type StepNavigatorIconPatch,
} from "@/components/workspace/StepNavigatorIconSection";
import { cn } from "@/components/ui/cn";
import { actionIconButtonClass, IconTrash } from "@/components/ui/action-icons";
import { DetailPageWrapper } from "@/components/layout/DetailPageWrapper";

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function WorkspaceView() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const searchParams = useSearchParams();
  const workflowId = searchParams.get("id");
  const { tools: toolCatalog } = useMergedTools();

  const [wf, setWf] = useState<DashboardWorkflow | null>(null);
  /** true = 아직 로컬스토리지에 쓰지 않은 편집(디바운스 대기 중) */
  const [dirty, setDirty] = useState(false);
  const [toolPickerOpen, setToolPickerOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState({ label: "", url: "" });
  const [memoDraft, setMemoDraft] = useState("");
  const [stepMemoDraft, setStepMemoDraft] = useState("");

  const workspaceStateRef = useRef({ wf: null as DashboardWorkflow | null, dirty: false });
  workspaceStateRef.current = { wf, dirty };

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wfDraftRef = useRef<DashboardWorkflow | null>(null);

  const clearPersistTimer = useCallback(() => {
    if (persistTimerRef.current != null) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
  }, []);

  const schedulePersist = useCallback(
    (draft: DashboardWorkflow) => {
      wfDraftRef.current = draft;
      clearPersistTimer();
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null;
        const latest = wfDraftRef.current;
        if (latest) {
          saveDashboardWorkflow(latest);
          setDirty(false);
        }
      }, 400);
    },
    [clearPersistTimer],
  );

  useEffect(() => {
    return () => {
      clearPersistTimer();
      const w = wfDraftRef.current;
      if (w) saveDashboardWorkflow(w);
    };
  }, [clearPersistTimer]);

  /** `router` 참조가 바뀔 때마다 reload가 재실행되면 편집 중인 상태가 스토리지 값으로 덮여 수정이 안 되는 것처럼 보일 수 있음 */
  const reload = useCallback(() => {
    if (!workflowId) {
      clearPersistTimer();
      const w = wfDraftRef.current;
      if (w) saveDashboardWorkflow(w);
      wfDraftRef.current = null;
      setWf(null);
      setDirty(false);
      return;
    }
    const { wf: cur, dirty: isDirty } = workspaceStateRef.current;
    if (isDirty && cur?.id === workflowId) {
      return;
    }
    clearPersistTimer();
    const pending = wfDraftRef.current;
    if (pending && pending.id !== workflowId) {
      saveDashboardWorkflow(pending);
    }
    const loaded = ensureDashboardWorkflow(workflowId) ?? null;
    if (
      !loaded &&
      !isDashboardProjectInstanceId(workflowId) &&
      workflows.some((w) => w.id === workflowId)
    ) {
      routerRef.current.replace(`/workflow/${encodeURIComponent(workflowId)}`);
      return;
    }
    setWf(loaded);
    wfDraftRef.current = loaded;
    setDirty(false);
  }, [workflowId, clearPersistTimer]);

  useEffect(() => {
    reload();
  }, [reload]);

  const applyLocal = useCallback(
    (next: DashboardWorkflow) => {
      setWf(next);
      setDirty(true);
      schedulePersist(next);
    },
    [schedulePersist],
  );

  const handleSave = useCallback(() => {
    if (!wf) return;
    clearPersistTimer();
    saveDashboardWorkflow(wf);
    wfDraftRef.current = wf;
    setDirty(false);
    router.push("/projects");
  }, [wf, router, clearPersistTimer]);

  const navSteps = useMemo(() => {
    if (!wf) return [];
    return wf.steps.map((s) => ({
      id: s.id,
      title: s.title,
      toolIds: s.toolIds,
      primaryToolId: s.toolIds[0],
      stepFallbackEmoji: s.fallbackEmoji,
      stepFallbackColor: s.fallbackColor,
      stepFallbackImageUrl: s.fallbackImageUrl,
      stepNavigatorIconType: s.navigatorIconType,
      stepFallbackLucideIcon: s.navigatorLucideIcon ?? undefined,
    }));
  }, [wf]);

  const folderOptions = useMemo(() => loadDashboardFolders().filter((f) => !f.hidden), []);

  const moveWorkflowToFolder = useCallback((folderId: string) => {
    if (!wf) return;
    setDashboardWorkflowFolder(wf.id, folderId);
    const layout = ensureLayoutMerged();
    if (!layout.some((e) => e.kind === "user" && e.id === wf.id)) {
      appendUserLayoutEntry(wf.id, folderId);
    } else {
      saveLayout(updateEntryFolder(layout, "user", wf.id, folderId));
    }
    applyLocal({ ...wf, folderId, updatedAt: Date.now() });
  }, [wf, applyLocal]);

  const currentIndex = wf?.currentStepIndex ?? 0;
  const total = wf?.steps.length ?? 0;
  const currentStep = wf?.steps[currentIndex] ?? null;

  const statuses: NavigatorStatus[] = useMemo(() => {
    if (!wf) return [];
    if (wf.status === "완료") return wf.steps.map(() => "completed" as const);
    if (wf.status === "준비중") return wf.steps.map(() => "waiting" as const);
    return wf.steps.map((_, idx) => {
      if (idx < wf.currentStepIndex) return "completed";
      if (idx === wf.currentStepIndex) return "in_progress";
      return "waiting";
    });
  }, [wf]);

  const reorderSteps = (from: number, to: number) => {
    if (!wf || from === to) return;
    const movedId = wf.steps[from]?.id;
    if (!movedId) return;
    const next = [...wf.steps];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const found = next.findIndex((s) => s.id === movedId);
    const newIdx = found === -1 ? wf.currentStepIndex : found;
    applyLocal({
      ...wf,
      steps: next,
      currentStepIndex: Math.min(Math.max(0, newIdx), next.length - 1),
      updatedAt: Date.now(),
    });
  };

  const setWorkflowStatus = (status: WorkflowRunStatus) => {
    if (!wf) return;
    clearPersistTimer();
    const completedAt = status === "완료" ? getTodayIsoLocal() : undefined;
    const next: DashboardWorkflow = { ...wf, status, completedAt, updatedAt: Date.now() };
    setWf(next);
    saveDashboardWorkflow(next);
    wfDraftRef.current = next;
    setDirty(false);
  };

  const currentTools = useMemo(() => {
    if (!currentStep) return [];
    return currentStep.toolIds
      .map((id) => toolCatalog.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
  }, [currentStep, toolCatalog]);

  const relatedLinks = wf?.relatedLinks ?? [];
  const workflowMemos = wf?.workflowMemos ?? [];
  const stepMemos = currentStep?.memos ?? [];

  const onSelectStep = (idx: number) => {
    if (!wf) return;
    const next: DashboardWorkflow = {
      ...wf,
      currentStepIndex: Math.max(0, Math.min(idx, wf.steps.length - 1)),
      updatedAt: Date.now(),
    };
    applyLocal(next);
  };

  const setCurrentStepTitle = (title: string) => {
    if (!wf || !currentStep) return;
    const nextSteps = wf.steps.map((s, i) => (i === currentIndex ? { ...s, title } : s));
    applyLocal({ ...wf, steps: nextSteps, updatedAt: Date.now() });
  };

  const deleteCurrentStep = () => {
    if (!wf || wf.steps.length <= 1) return;
    const nextSteps = wf.steps.filter((_, i) => i !== currentIndex);
    const nextIndex = Math.min(currentIndex, nextSteps.length - 1);
    applyLocal({
      ...wf,
      steps: nextSteps,
      currentStepIndex: Math.max(0, nextIndex),
      updatedAt: Date.now(),
    });
  };

  const addStepAfterCurrent = () => {
    if (!wf) return;
    const newStep = { id: makeId(), title: "새 단계", toolIds: [] as string[], memos: [] as WorkspaceMemoItem[] };
    const insertAt = Math.min(currentIndex + 1, wf.steps.length);
    const nextSteps = [...wf.steps.slice(0, insertAt), newStep, ...wf.steps.slice(insertAt)];
    applyLocal({
      ...wf,
      steps: nextSteps,
      currentStepIndex: insertAt,
      updatedAt: Date.now(),
    });
  };

  const removeToolFromCurrentStep = (toolId: string) => {
    if (!wf || !currentStep) return;
    const nextSteps = wf.steps.map((s, i) =>
      i === currentIndex ? { ...s, toolIds: s.toolIds.filter((id) => id !== toolId) } : s,
    );
    applyLocal({ ...wf, steps: nextSteps, updatedAt: Date.now() });
  };

  const setCurrentStepNavigator = (patch: StepNavigatorIconPatch) => {
    if (!wf || !currentStep) return;
    const nextSteps = wf.steps.map((s, i) => (i === currentIndex ? { ...s, ...patch } : s));
    applyLocal({ ...wf, steps: nextSteps, updatedAt: Date.now() });
  };

  const addRelatedLink = () => {
    if (!wf) return;
    const label = linkDraft.label.trim();
    const url = linkDraft.url.trim();
    if (!label || !url) return;
    const item: WorkspaceLinkItem = { id: makeId(), label, url };
    applyLocal({
      ...wf,
      relatedLinks: [...relatedLinks, item],
      updatedAt: Date.now(),
    });
    setLinkDraft({ label: "", url: "" });
  };

  const removeRelatedLink = (id: string) => {
    if (!wf) return;
    applyLocal({
      ...wf,
      relatedLinks: relatedLinks.filter((l) => l.id !== id),
      updatedAt: Date.now(),
    });
  };

  const addWorkflowMemo = () => {
    if (!wf) return;
    const text = memoDraft.trim();
    if (!text) return;
    const item: WorkspaceMemoItem = { id: makeId(), text };
    applyLocal({
      ...wf,
      workflowMemos: [...workflowMemos, item],
      updatedAt: Date.now(),
    });
    setMemoDraft("");
  };

  const removeWorkflowMemo = (id: string) => {
    if (!wf) return;
    applyLocal({
      ...wf,
      workflowMemos: workflowMemos.filter((m) => m.id !== id),
      updatedAt: Date.now(),
    });
  };

  const addStepMemo = () => {
    if (!wf || !currentStep) return;
    const text = stepMemoDraft.trim();
    if (!text) return;
    const item: WorkspaceMemoItem = { id: makeId(), text };
    const nextSteps = wf.steps.map((s, i) =>
      i === currentIndex ? { ...s, memos: [...(s.memos ?? []), item] } : s,
    );
    applyLocal({ ...wf, steps: nextSteps, updatedAt: Date.now() });
    setStepMemoDraft("");
  };

  const removeStepMemo = (id: string) => {
    if (!wf || !currentStep) return;
    const nextSteps = wf.steps.map((s, i) =>
      i === currentIndex ? { ...s, memos: (s.memos ?? []).filter((m) => m.id !== id) } : s,
    );
    applyLocal({ ...wf, steps: nextSteps, updatedAt: Date.now() });
  };

  if (!workflowId) {
    return (
      <DetailPageWrapper>
        <div className="pb-10">
          <header className="pb-5">
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-700 hover:text-zinc-950"
            >
              <span aria-hidden>←</span>
              프로젝트
            </Link>
          </header>
          <div className="mt-6 rounded-2xl bg-white p-6 text-sm text-zinc-600 shadow-sm ring-1 ring-zinc-200">
            프로젝트를 열려면{" "}
            <Link href="/projects" className="font-semibold text-zinc-900 hover:underline">
              프로젝트
            </Link>
            메뉴에서 카드를 선택해주세요.
          </div>
        </div>
      </DetailPageWrapper>
    );
  }

  if (!wf) {
    return (
      <DetailPageWrapper>
        <div className="pb-10">
          <header className="pb-5">
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-700 hover:text-zinc-950"
            >
              <span aria-hidden>←</span>
              프로젝트
            </Link>
          </header>
          <div className="mt-6 rounded-2xl bg-white p-6 text-sm text-zinc-600 shadow-sm ring-1 ring-zinc-200">
            프로젝트를 찾을 수 없어요.{" "}
            <Link href="/projects" className="font-semibold text-zinc-900 hover:underline">
              프로젝트
            </Link>
            로 돌아가 주세요.
          </div>
        </div>
      </DetailPageWrapper>
    );
  }

  return (
    <DetailPageWrapper>
      <>
      <header className="pb-3">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-700 hover:text-zinc-950"
        >
          <span aria-hidden>←</span>
          프로젝트
        </Link>
        <div className="mt-3 flex flex-col gap-3">
          {/* 1단: 프로젝트 제목 + 상태 */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <label className="block">
                <span className="sr-only">워크플로우 제목</span>
                <input
                  value={wf.name}
                  onChange={(e) => applyLocal({ ...wf, name: e.target.value, updatedAt: Date.now() })}
                  className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white px-3 py-2 text-2xl font-semibold tracking-tight text-zinc-950 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
                />
              </label>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className="flex flex-wrap items-center justify-end gap-2">
                {dirty ? (
                  <span className="text-xs font-semibold text-amber-800">저장되지 않은 변경이 있어요</span>
                ) : null}
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-zinc-800"
                >
                  저장
                </button>
              </div>
            </div>
          </div>

          {/* 2단: 폴더 / 시작일 / 마감일 (inline 배치) */}
          <div className="flex flex-wrap items-end gap-3">
            <label className="block w-full sm:w-auto sm:min-w-[240px]">
              <span className="text-xs font-semibold text-zinc-500">프로젝트 폴더</span>
              <select
                value={wf.folderId ?? folderOptions[0]?.id ?? "ddokdi"}
                onChange={(e) => moveWorkflowToFolder(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
              >
                {folderOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.emoji} {f.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block min-w-[140px]">
              <span className="text-xs font-semibold text-zinc-500">시작일</span>
              <input
                type="date"
                value={wf.startDate ?? ""}
                onChange={(e) =>
                  applyLocal({ ...wf, startDate: e.target.value || undefined, updatedAt: Date.now() })
                }
                className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
              />
            </label>

            <label className="block min-w-[140px]">
              <span className="text-xs font-semibold text-zinc-500">마감일</span>
              <input
                type="date"
                value={wf.endDate ?? ""}
                onChange={(e) =>
                  applyLocal({ ...wf, endDate: e.target.value || undefined, updatedAt: Date.now() })
                }
                className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
              />
            </label>

            <label className="block min-w-[190px]">
              <span className="text-xs font-semibold text-zinc-500">워크플로우 상태</span>
              <select
                value={wf.status ?? "진행중"}
                onChange={(e) => setWorkflowStatus(e.target.value as (typeof WORKFLOW_STATUS_OPTIONS)[number])}
                className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
              >
                {WORKFLOW_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>

      <main className="space-y-4 pb-12 pt-0">
        <WorkflowNavigatorBar
          hideTitle
          steps={navSteps}
          selectedIndex={currentIndex}
          statuses={statuses}
          onSelect={onSelectStep}
          onReorder={reorderSteps}
          onAddStep={addStepAfterCurrent}
          onDeleteStep={deleteCurrentStep}
          canDelete={wf.steps.length > 1}
          className="bg-white"
          toolsCatalog={toolCatalog}
        />

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <div className="text-xs font-semibold text-zinc-500">현재 STEP</div>
          <label className="mt-2 block">
            <span className="sr-only">단계 이름</span>
            <input
              value={currentStep?.title ?? ""}
              onChange={(e) => setCurrentStepTitle(e.target.value)}
              placeholder="단계 이름"
              className={cn(
                "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xl font-semibold tracking-tight text-zinc-950",
                "outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100",
              )}
            />
          </label>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-zinc-100 pt-6">
            <div className="text-sm font-semibold">연결된 도구</div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500">{currentTools.length}개</span>
              <button
                type="button"
                onClick={() => setToolPickerOpen(true)}
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                도구 추가
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            {currentTools.length === 0 ? (
              <div className="space-y-4 sm:col-span-2">
                <div className="rounded-2xl bg-zinc-50/80 p-6 text-sm text-zinc-600 ring-1 ring-zinc-200">
                  이 STEP에 연결된 도구가 없어요. 도구 추가로 연결하거나, 아래에서 내비게이터에 보일 아이콘을 정할 수 있어요.
                </div>
                <div className="rounded-2xl bg-zinc-50/50 p-5 ring-1 ring-zinc-200">
                  <div className="text-xs font-semibold text-zinc-500">내비게이터 아이콘</div>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    프로젝트 폴더·워크플로 카테고리와 같은 방식으로 기본 아이콘(루시드), 이모지, 이미지 URL·업로드를 고를 수 있어요. 도구가 없을 때 이 설정이 표시됩니다.
                  </p>
                  {currentStep ? (
                    <StepNavigatorIconSection className="mt-4" step={currentStep} onApply={setCurrentStepNavigator} />
                  ) : null}
                </div>
              </div>
            ) : (
              currentTools.map((t) => (
                <ToolCard
                  key={t.id}
                  mode="workflow"
                  tool={t}
                  onDisconnect={() => removeToolFromCurrentStep(t.id)}
                />
              ))
            )}
          </div>

          <div className="mt-6 border-t border-zinc-100 pt-6">
            <div className="text-sm font-semibold">이 단계 메모</div>
            <p className="mt-1 text-xs font-semibold text-zinc-500">이 STEP에만 해당하는 메모입니다. workflow 공통 메모와 별도로 저장됩니다.</p>
            <ul className="mt-4 space-y-2">
              {stepMemos.length === 0 ? (
                <li className="text-sm text-zinc-500">아직 메모가 없어요.</li>
              ) : (
                stepMemos.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-start justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-800 ring-1 ring-zinc-200"
                  >
                    <span className="min-w-0 flex-1 whitespace-pre-wrap">{m.text}</span>
                    <button
                      type="button"
                      onClick={() => removeStepMemo(m.id)}
                      title="삭제"
                      aria-label="메모 삭제"
                      className={cn(actionIconButtonClass, "h-8 w-8 bg-white")}
                    >
                      <IconTrash />
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1">
                <span className="sr-only">메모 입력</span>
                <textarea
                  value={stepMemoDraft}
                  onChange={(e) => setStepMemoDraft(e.target.value)}
                  placeholder="이 단계에서 기억할 내용을 적어보세요"
                  rows={2}
                  className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
                />
              </label>
              <button
                type="button"
                onClick={addStepMemo}
                className="h-10 shrink-0 rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                메모 추가
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
              <div className="text-sm font-semibold">관련 링크</div>
              <p className="mt-1 text-xs text-zinc-500">workflow 전체와 연결된 참고 링크입니다.</p>
              <ul className="mt-4 space-y-2">
                {relatedLinks.length === 0 ? (
                  <li className="text-sm text-zinc-500">등록된 링크가 없어요.</li>
                ) : (
                  relatedLinks.map((l) => (
                    <li
                      key={l.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-200"
                    >
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900"
                      >
                        {l.label}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeRelatedLink(l.id)}
                        title="삭제"
                        aria-label="링크 삭제"
                        className={cn(actionIconButtonClass, "h-8 w-8 bg-white")}
                      >
                        <IconTrash />
                      </button>
                    </li>
                  ))
                )}
              </ul>
              <div className="mt-4 space-y-2">
                <input
                  value={linkDraft.label}
                  onChange={(e) => setLinkDraft((d) => ({ ...d, label: e.target.value }))}
                  placeholder="링크 제목"
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
                />
                <input
                  value={linkDraft.url}
                  onChange={(e) => setLinkDraft((d) => ({ ...d, url: e.target.value }))}
                  placeholder="https://…"
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
                />
                <button
                  type="button"
                  onClick={addRelatedLink}
                  className="w-full rounded-full bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 sm:w-auto sm:px-6"
                >
                  링크 추가
                </button>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
              <div className="text-sm font-semibold">workflow 공통 메모</div>
              <p className="mt-1 text-xs text-zinc-500">모든 STEP에서 공유하는 메모입니다.</p>
              <ul className="mt-4 space-y-2">
                {workflowMemos.length === 0 ? (
                  <li className="text-sm text-zinc-500">아직 메모가 없어요.</li>
                ) : (
                  workflowMemos.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-start justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-800 ring-1 ring-zinc-200"
                    >
                      <span className="min-w-0 flex-1 whitespace-pre-wrap">{m.text}</span>
                      <button
                        type="button"
                        onClick={() => removeWorkflowMemo(m.id)}
                        title="삭제"
                        aria-label="메모 삭제"
                        className={cn(actionIconButtonClass, "h-8 w-8 bg-white")}
                      >
                        <IconTrash />
                      </button>
                    </li>
                  ))
                )}
              </ul>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">공통 메모</span>
                  <textarea
                    value={memoDraft}
                    onChange={(e) => setMemoDraft(e.target.value)}
                    placeholder="전체 workflow에 해당하는 메모"
                    rows={2}
                    className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
                  />
                </label>
                <button
                  type="button"
                  onClick={addWorkflowMemo}
                  className="h-10 shrink-0 rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  메모 추가
                </button>
              </div>
            </section>
          </div>
      </main>

      <ToolPickerModal
        open={toolPickerOpen}
        onClose={() => setToolPickerOpen(false)}
        onPick={(tool) => {
          if (!wf || !currentStep) return;
          if (currentStep.toolIds.includes(tool.id)) return;
          const nextSteps = wf.steps.map((s, i) =>
            i === currentIndex ? { ...s, toolIds: [...s.toolIds, tool.id] } : s,
          );
          applyLocal({ ...wf, steps: nextSteps, updatedAt: Date.now() });
        }}
      />
      </>
    </DetailPageWrapper>
  );
}
