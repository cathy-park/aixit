"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WorkflowDetail, WorkflowPreview } from "@/lib/aixit-data";
import { appendUserLayoutEntry } from "@/lib/dashboard-layout-store";
import { loadDashboardFolders, pickDefaultProjectFolderId } from "@/lib/dashboard-folders-store";
import { WorkflowNavigatorBar, type NavigatorStatus } from "@/components/recommendation/WorkflowNavigatorBar";
import { APP_CARD_GRID_CLASS } from "@/components/cards/app-card-layout";
import { ToolCard } from "@/components/tools/ToolCard";
import { useMergedTools } from "@/hooks/useMergedTools";
import {
  buildTemplatePreviewDashboardWorkflow,
  createProjectFromTemplate,
  listDashboardWorkflowsByTemplateId,
  type DashboardWorkflow,
} from "@/lib/workflows-store";
import type { UserWorkflowTemplateStep } from "@/lib/user-workflow-templates-store";
import {
  createProjectFromUserTemplate,
  isUserWorkflowTemplateId,
  updateUserWorkflowTemplateMeta,
  updateUserWorkflowTemplateLinksAndMemos,
  updateUserWorkflowTemplateSteps,
} from "@/lib/user-workflow-templates-store";
import {
  getBuiltinTemplateLinksMemosOverride,
  setBuiltinTemplateLinksMemosOverride,
} from "@/lib/builtin-template-links-memos-store";
import type { WorkspaceLinkItem, WorkspaceMemoItem } from "@/lib/workspace-store";
import {
  DETAIL_HEADER_TITLE_ACTION_ROW_CLASS,
  DETAIL_PAGE_SUBTITLE_TEXTAREA_CLASS,
  DETAIL_PAGE_TITLE_INPUT_CLASS,
  DETAIL_PRIMARY_HEADER_ROW_CLASS,
  DETAIL_PRIMARY_HEADER_TRAILING_CLASS,
  WORKSPACE_HEADER_ADD_MATCH_BTN,
  WorkspaceRelatedLinksSection,
  WorkspaceWorkflowCommonMemosSection,
} from "@/components/workspace/WorkspaceLinksMemosSections";
import { DetailPageWrapper } from "@/components/layout/DetailPageWrapper";
import { cn } from "@/components/ui/cn";

function makeTplRowId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `tpl_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

type TemplateLinksMemosSavePayload = { links: Array<{ label: string; href: string }>; memos: string[] };

/** 템플릿 상세: 관련 링크·공통 메모 — 내 템플릿·내장 템플릿 공통 UI */
function TemplateLinksMemosEditor({
  hydrateKey,
  initialLinks,
  initialMemos,
  onSave,
  linksDescription,
  memosDescription,
}: {
  hydrateKey: string;
  initialLinks: Array<{ label: string; href: string }>;
  initialMemos: string[];
  onSave: (payload: TemplateLinksMemosSavePayload) => void;
  linksDescription: string;
  memosDescription: string;
}) {
  const linksSig = JSON.stringify(initialLinks);
  const memosSig = JSON.stringify(initialMemos);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const [linkRows, setLinkRows] = useState<WorkspaceLinkItem[]>([]);
  const [memoRows, setMemoRows] = useState<WorkspaceMemoItem[]>([]);
  const [linkDraft, setLinkDraft] = useState({ label: "", url: "" });
  const [memoDraft, setMemoDraft] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLinkRows(
      initialLinks.map((l) => ({
        id: makeTplRowId(),
        label: l.label,
        url: l.href,
      })),
    );
    setMemoRows(
      initialMemos.map((text) => ({
        id: makeTplRowId(),
        text,
      })),
    );
    setHydrated(true);
  }, [hydrateKey, linksSig, memosSig]);

  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => {
      onSaveRef.current({
        links: linkRows.map((l) => ({ label: l.label, href: l.url })),
        memos: memoRows.map((m) => m.text),
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [linkRows, memoRows, hydrateKey, hydrated]);

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
      <WorkspaceRelatedLinksSection
        mode="editable"
        links={linkRows}
        linkDraft={linkDraft}
        onLinkDraftChange={setLinkDraft}
        onAddLink={addLinkRow}
        onRemoveLink={removeLinkRow}
        onUpdateLink={(id, patch) =>
          setLinkRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
        }
        description={linksDescription}
      />
      <WorkspaceWorkflowCommonMemosSection
        mode="editable"
        memos={memoRows}
        memoDraft={memoDraft}
        onMemoDraftChange={setMemoDraft}
        onAddMemo={addMemoRow}
        onRemoveMemo={removeMemoRow}
        onUpdateMemo={(id, text) =>
          setMemoRows((rows) => rows.map((r) => (r.id === id ? { ...r, text } : r)))
        }
        description={memosDescription}
      />
    </>
  );
}

export function TemplateWorkspaceReadonly({ detail, preview }: { detail: WorkflowDetail; preview: WorkflowPreview }) {
  const router = useRouter();
  const { tools: toolCatalog } = useMergedTools();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [linkedProjects, setLinkedProjects] = useState<DashboardWorkflow[]>([]);
  const [metaHydrated, setMetaHydrated] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [subtitleDraft, setSubtitleDraft] = useState("");

  const refreshLinked = useCallback(() => {
    setLinkedProjects(listDashboardWorkflowsByTemplateId(detail.id));
  }, [detail.id]);

  useEffect(() => {
    refreshLinked();
    const onWf = () => refreshLinked();
    window.addEventListener("aixit-workflows-updated", onWf);
    return () => window.removeEventListener("aixit-workflows-updated", onWf);
  }, [refreshLinked]);

  const saveBuiltinLinksMemos = useCallback(
    (payload: TemplateLinksMemosSavePayload) => {
      const prev = getBuiltinTemplateLinksMemosOverride(detail.id);
      setBuiltinTemplateLinksMemosOverride(detail.id, {
        links: payload.links,
        memos: payload.memos,
        stepTitles: prev?.stepTitles,
      });
    },
    [detail.id],
  );

  const isUserTemplate = isUserWorkflowTemplateId(detail.id);

  const [localSteps, setLocalSteps] = useState<UserWorkflowTemplateStep[]>([]);
  const stepsSignature = detail.steps.map((s, i) => `${i}:${s.toolName}:${(s.toolIds ?? []).join(",")}`).join("|");

  useEffect(() => {
    setLocalSteps(
      detail.steps.map((s) => ({
        toolName: s.toolName,
        toolIds: [...(s.toolIds ?? [])],
      })),
    );
  }, [detail.id, stepsSignature]);

  const patchedDetail = useMemo(() => {
    if (localSteps.length !== detail.steps.length) return detail;
    return {
      ...detail,
      steps: detail.steps.map((s, i) => ({
        ...s,
        toolName: localSteps[i]?.toolName ?? s.toolName,
      })),
    };
  }, [detail, localSteps]);

  const wf = useMemo(() => buildTemplatePreviewDashboardWorkflow(patchedDetail, preview), [patchedDetail, preview]);

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

  const reorderLocalSteps = useCallback((from: number, to: number) => {
    if (from === to) return;
    setLocalSteps((prev) => {
      const next = [...prev];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
    setCurrentIndex((idx) => {
      if (idx === from) return to;
      if (from < to && idx > from && idx <= to) return idx - 1;
      if (from > to && idx >= to && idx < from) return idx + 1;
      return idx;
    });
  }, []);
  const metaSig = `${detail.id}:${detail.title}:${preview.subtitle}`;
  useEffect(() => {
    setTitleDraft(detail.title);
    setSubtitleDraft(preview.subtitle ?? "");
    setMetaHydrated(true);
  }, [metaSig]);

  useEffect(() => {
    if (!isUserTemplate) return;
    if (!metaHydrated) return;
    const t = window.setTimeout(() => {
      updateUserWorkflowTemplateMeta(detail.id, {
        title: titleDraft.trim() || "내 템플릿",
        subtitle: subtitleDraft.trim(),
      });
    }, 350);
    return () => window.clearTimeout(t);
  }, [detail.id, isUserTemplate, metaHydrated, titleDraft, subtitleDraft]);

  useEffect(() => {
    if (localSteps.length === 0) return;
    const t = window.setTimeout(() => {
      if (isUserTemplate) {
        updateUserWorkflowTemplateSteps(detail.id, localSteps);
        return;
      }
      const prev = getBuiltinTemplateLinksMemosOverride(detail.id);
      setBuiltinTemplateLinksMemosOverride(detail.id, {
        links: prev?.links ?? detail.links.map((l) => ({ label: l.label, href: l.href })),
        memos: prev?.memos ? [...prev.memos] : [...detail.memo],
        stepTitles: localSteps.map((s) => s.toolName),
      });
    }, 450);
    return () => window.clearTimeout(t);
  }, [localSteps, isUserTemplate, detail.id, detail.links, detail.memo]);

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

        <div className={DETAIL_PRIMARY_HEADER_ROW_CLASS}>
          <div className={DETAIL_HEADER_TITLE_ACTION_ROW_CLASS}>
            <div className="min-w-0 flex-1">
              <label className="block">
                <span className="sr-only">워크플로우 템플릿 제목</span>
                <input
                  value={isUserTemplate ? titleDraft : wf.name}
                  readOnly={!isUserTemplate}
                  onChange={isUserTemplate ? (e) => setTitleDraft(e.target.value) : undefined}
                  className={DETAIL_PAGE_TITLE_INPUT_CLASS}
                />
              </label>
            </div>
            <div className={DETAIL_PRIMARY_HEADER_TRAILING_CLASS}>
              <button type="button" onClick={handleCreateProject} className={WORKSPACE_HEADER_ADD_MATCH_BTN}>
                프로젝트 생성
              </button>
            </div>
          </div>
          <label className="block max-w-2xl">
            <span className="sr-only">워크플로우 템플릿 설명</span>
            <textarea
              value={isUserTemplate ? subtitleDraft : preview.subtitle}
              readOnly={!isUserTemplate}
              onChange={isUserTemplate ? (e) => setSubtitleDraft(e.target.value) : undefined}
              rows={2}
              placeholder={isUserTemplate ? "설명을 적어보세요" : undefined}
              className={DETAIL_PAGE_SUBTITLE_TEXTAREA_CLASS}
            />
          </label>
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
          onReorder={isUserTemplate ? reorderLocalSteps : undefined}
          className="bg-white"
          toolsCatalog={toolCatalog}
        />

        <p className="text-[11px] leading-snug text-zinc-500">
          STEP 이름은 아래 입력란에서 바꿀 수 있어요. 내 템플릿은 칩을 드래그해 순서도 바꿀 수 있습니다(PC).
        </p>

        <section className="rounded-2xl bg-white p-6 ring-1 ring-zinc-200">
          <div className="text-xs font-semibold text-zinc-500">현재 STEP</div>
          <label className="mt-2 block">
            <span className="sr-only">단계 이름</span>
            <input
              value={localSteps[currentIndex]?.toolName ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setLocalSteps((rows) => rows.map((row, i) => (i === currentIndex ? { ...row, toolName: v } : row)));
              }}
              placeholder="단계 이름"
              className={cn(
                "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xl font-semibold tracking-tight text-zinc-950",
                "outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100",
              )}
            />
          </label>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-zinc-100 pt-6">
            <div className="text-sm font-semibold">연결된 도구</div>
            <span className="text-xs font-semibold text-zinc-500">{currentTools.length}개</span>
          </div>

          <div className={cn("mt-3", APP_CARD_GRID_CLASS)}>
            {currentTools.length === 0 ? (
              <div className="col-span-full rounded-2xl bg-zinc-50/80 p-6 text-sm text-zinc-600 ring-1 ring-zinc-200">
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
            <TemplateLinksMemosEditor
              hydrateKey={detail.id}
              initialLinks={detail.links}
              initialMemos={detail.memo}
              onSave={(payload) => updateUserWorkflowTemplateLinksAndMemos(detail.id, payload)}
              linksDescription="이 템플릿에 저장됩니다. 여기서 바꾼 내용은 이후「프로젝트 생성」 시 그대로 복사돼요."
              memosDescription="이 템플릿에 저장됩니다. 프로젝트 워크스페이스의 공통 메모와 같은 역할이에요."
            />
          ) : (
            <TemplateLinksMemosEditor
              hydrateKey={detail.id}
              initialLinks={detail.links}
              initialMemos={detail.memo}
              onSave={saveBuiltinLinksMemos}
              linksDescription="이 기기 브라우저에 저장됩니다. 바꾼 링크는「프로젝트 생성」 시 그대로 복사돼요."
              memosDescription="이 기기 브라우저에 저장됩니다. 프로젝트 워크스페이스의 공통 메모와 같이 새 프로젝트에 복사돼요."
            />
          )}
        </div>
      </main>
    </DetailPageWrapper>
  );
}
