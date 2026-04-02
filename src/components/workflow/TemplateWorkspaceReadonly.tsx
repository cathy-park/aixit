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
import {
  createProjectFromUserTemplate,
  isUserWorkflowTemplateId,
  updateUserWorkflowTemplateLinksAndMemos,
} from "@/lib/user-workflow-templates-store";
import { cn } from "@/components/ui/cn";
import { actionIconButtonClass, IconTrash } from "@/components/ui/action-icons";
import { DetailPageWrapper } from "@/components/layout/DetailPageWrapper";

const tplTitleLikeInputClass =
  "w-full max-w-2xl rounded-xl border border-zinc-200 bg-white px-3 py-2 text-2xl font-semibold tracking-tight text-zinc-950 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100";

const tplTitleLikeUrlClass =
  "w-full max-w-2xl rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100";

const tplTitleLikeMemoTextareaClass =
  "min-h-[6rem] w-full max-w-2xl resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-lg font-medium leading-snug tracking-tight text-zinc-950 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100";

function makeTplRowId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `tpl_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

type TplLinkRow = { id: string; label: string; url: string };
type TplMemoRow = { id: string; text: string };

/** 내 워크플로 템플릿: 관련 링크·공통 메모를 프로젝트 워크스페이스와 동일하게 편집·저장 */
function UserTemplateLinksMemosEditor({ templateId, detail }: { templateId: string; detail: WorkflowDetail }) {
  const linksSig = JSON.stringify(detail.links);
  const memosSig = JSON.stringify(detail.memo);

  const [linkRows, setLinkRows] = useState<TplLinkRow[]>([]);
  const [memoRows, setMemoRows] = useState<TplMemoRow[]>([]);
  const [linkDraft, setLinkDraft] = useState({ label: "", url: "" });
  const [memoDraft, setMemoDraft] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLinkRows(
      detail.links.map((l) => ({
        id: makeTplRowId(),
        label: l.label,
        url: l.href,
      })),
    );
    setMemoRows(
      detail.memo.map((text) => ({
        id: makeTplRowId(),
        text,
      })),
    );
    setHydrated(true);
  }, [templateId, linksSig, memosSig]);

  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => {
      updateUserWorkflowTemplateLinksAndMemos(templateId, {
        links: linkRows.map((l) => ({ label: l.label, href: l.url })),
        memos: memoRows.map((m) => m.text),
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [linkRows, memoRows, templateId, hydrated]);

  const removeLinkRow = (id: string) => setLinkRows((rows) => rows.filter((r) => r.id !== id));
  const removeMemoRow = (id: string) => setMemoRows((rows) => rows.filter((r) => r.id !== id));

  const addLinkRow = () => {
    const label = linkDraft.label.trim();
    const url = linkDraft.url.trim();
    if (!label && !url) return;
    setLinkRows((rows) => [
      ...rows,
      { id: makeTplRowId(), label: label || url || "링크", url: url || "https://" },
    ]);
    setLinkDraft({ label: "", url: "" });
  };

  const addMemoRow = () => {
    const text = memoDraft.trim();
    if (!text) return;
    setMemoRows((rows) => [...rows, { id: makeTplRowId(), text }]);
    setMemoDraft("");
  };

  return (
    <>
      <section className="rounded-2xl bg-white p-6 ring-1 ring-zinc-200">
        <div className="text-sm font-semibold">관련 링크</div>
        <p className="mt-1 text-xs text-zinc-500">
          이 템플릿에 저장됩니다. 여기서 바꾼 내용은 이후「프로젝트 생성」 시 그대로 복사돼요.
        </p>
        <ul className="mt-4 space-y-4">
          {linkRows.length === 0 ? (
            <li className="text-sm text-zinc-500">등록된 링크가 없어요.</li>
          ) : (
            linkRows.map((l) => (
              <li key={l.id} className="rounded-xl bg-zinc-50/80 p-4 ring-1 ring-zinc-200">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className="block">
                      <span className="sr-only">링크 제목</span>
                      <input
                        value={l.label}
                        onChange={(e) =>
                          setLinkRows((rows) => rows.map((r) => (r.id === l.id ? { ...r, label: e.target.value } : r)))
                        }
                        placeholder="링크 제목"
                        className={tplTitleLikeInputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="sr-only">URL</span>
                      <input
                        value={l.url}
                        onChange={(e) =>
                          setLinkRows((rows) => rows.map((r) => (r.id === l.id ? { ...r, url: e.target.value } : r)))
                        }
                        placeholder="https://…"
                        className={tplTitleLikeUrlClass}
                      />
                    </label>
                    {l.url.trim() ? (
                      <a
                        href={l.url.trim().startsWith("http") ? l.url.trim() : `https://${l.url.trim()}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-xs font-semibold text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                      >
                        새 탭에서 열기
                      </a>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLinkRow(l.id)}
                    title="삭제"
                    aria-label="링크 삭제"
                    className={cn(actionIconButtonClass, "h-8 w-8 shrink-0 self-start bg-white")}
                  >
                    <IconTrash />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
        <div className="mt-4 space-y-2">
          <input
            value={linkDraft.label}
            onChange={(e) => setLinkDraft((d) => ({ ...d, label: e.target.value }))}
            placeholder="링크 제목"
            className={tplTitleLikeInputClass}
          />
          <input
            value={linkDraft.url}
            onChange={(e) => setLinkDraft((d) => ({ ...d, url: e.target.value }))}
            placeholder="https://…"
            className={tplTitleLikeUrlClass}
          />
          <button
            type="button"
            onClick={addLinkRow}
            className="w-full rounded-full bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 sm:w-auto sm:px-6"
          >
            링크 추가
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 ring-1 ring-zinc-200">
        <div className="text-sm font-semibold">워크플로우 공통 메모</div>
        <p className="mt-1 text-xs text-zinc-500">이 템플릿에 저장됩니다. 프로젝트 워크스페이스의 공통 메모와 같은 역할이에요.</p>
        <ul className="mt-4 space-y-4">
          {memoRows.length === 0 ? (
            <li className="text-sm text-zinc-500">아직 메모가 없어요.</li>
          ) : (
            memoRows.map((m) => (
              <li
                key={m.id}
                className="flex items-start justify-between gap-3 rounded-xl bg-zinc-50/80 p-4 ring-1 ring-zinc-200"
              >
                <label className="min-w-0 flex-1">
                  <span className="sr-only">공통 메모</span>
                  <textarea
                    value={m.text}
                    onChange={(e) =>
                      setMemoRows((rows) => rows.map((r) => (r.id === m.id ? { ...r, text: e.target.value } : r)))
                    }
                    placeholder="전체 workflow에 해당하는 메모"
                    rows={3}
                    className={tplTitleLikeMemoTextareaClass}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeMemoRow(m.id)}
                  title="삭제"
                  aria-label="메모 삭제"
                  className={cn(actionIconButtonClass, "h-8 w-8 shrink-0 bg-white")}
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
              rows={3}
              className={tplTitleLikeMemoTextareaClass}
            />
          </label>
          <button
            type="button"
            onClick={addMemoRow}
            className="h-10 shrink-0 rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            메모 추가
          </button>
        </div>
      </section>
    </>
  );
}

export function TemplateWorkspaceReadonly({ detail, preview }: { detail: WorkflowDetail; preview: WorkflowPreview }) {
  const router = useRouter();
  const { tools: toolCatalog } = useMergedTools();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [linkedProjects, setLinkedProjects] = useState<DashboardWorkflow[]>([]);

  const refreshLinked = useCallback(() => {
    setLinkedProjects(listDashboardWorkflowsByTemplateId(detail.id));
  }, [detail.id]);

  useEffect(() => {
    refreshLinked();
    const onWf = () => refreshLinked();
    window.addEventListener("aixit-workflows-updated", onWf);
    return () => window.removeEventListener("aixit-workflows-updated", onWf);
  }, [refreshLinked]);

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
    const fid = pickDefaultProjectFolderId(loadDashboardFolders());
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="block min-w-0 flex-1">
            <span className="sr-only">워크플로우 템플릿 제목</span>
            <input
              value={wf.name}
              readOnly
              className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white px-3 py-2 text-2xl font-semibold tracking-tight text-zinc-950 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
            />
          </label>
          <button
            type="button"
            onClick={handleCreateProject}
            className="shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-zinc-800"
          >
            프로젝트 생성
          </button>
        </div>

        {linkedProjects.length > 0 ? (
          <p className="mt-3 text-[11px] font-semibold text-zinc-400">
            기존에 이 템플릿으로 만든 프로젝트가 {linkedProjects.length}개 있어요.
          </p>
        ) : null}
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
          {isUserWorkflowTemplateId(detail.id) ? (
            <UserTemplateLinksMemosEditor templateId={detail.id} detail={detail} />
          ) : (
            <>
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
                <p className="mt-1 text-xs text-zinc-500">카탈로그 템플릿은 읽기 전용이에요. 편집하려면 프로젝트로 만든 뒤 워크스페이스에서 수정하세요.</p>
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
            </>
          )}
        </div>
      </main>
    </DetailPageWrapper>
  );
}
