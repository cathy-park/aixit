"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMergedTools } from "@/hooks/useMergedTools";
import { loadWorkflowTemplateFolders, type WorkflowTemplateFolderRecord } from "@/lib/workflow-template-folders-store";
import { getMergedToolById } from "@/lib/user-tools-store";
import { addUserWorkflowTemplateFromDashboard } from "@/lib/user-workflow-templates-store";
import { ensureDashboardWorkflow } from "@/lib/workflows-store";

const DEFAULT_CATEGORY = "wf-cat-plan";

type Props = {
  open: boolean;
  workflowId: string | null;
  layoutFolderId: string;
  onClose: () => void;
};

export function SaveAsTemplateModal({ open, workflowId, layoutFolderId, onClose }: Props) {
  const { tools: toolCatalog } = useMergedTools();
  const [folders, setFolders] = useState<WorkflowTemplateFolderRecord[]>([]);
  const [categoryId, setCategoryId] = useState(DEFAULT_CATEGORY);
  const [savedHint, setSavedHint] = useState(false);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateSubtitle, setTemplateSubtitle] = useState("");

  const refreshFolders = useCallback(() => {
    setFolders(loadWorkflowTemplateFolders());
  }, []);

  useEffect(() => {
    if (!open) return;
    refreshFolders();
    setSavedHint(false);
    const vis = loadWorkflowTemplateFolders().filter((f) => !f.hidden);
    const pick = vis.find((f) => f.id === DEFAULT_CATEGORY) ?? vis[0];
    setCategoryId(pick?.id ?? DEFAULT_CATEGORY);
    if (workflowId) {
      const wf = ensureDashboardWorkflow(workflowId, layoutFolderId);
      if (wf) {
        setTemplateTitle(wf.name.trim() || "");
        setTemplateSubtitle(typeof wf.subtitle === "string" ? wf.subtitle.trim() : "");
      }
    }
  }, [open, refreshFolders, workflowId, layoutFolderId]);

  useEffect(() => {
    const onUpd = () => refreshFolders();
    window.addEventListener("aixit-workflow-template-folders-updated", onUpd);
    return () => window.removeEventListener("aixit-workflow-template-folders-updated", onUpd);
  }, [refreshFolders]);

  const resolveTool = useCallback(
    (toolId: string) => {
      return toolCatalog.find((x) => x.id === toolId) ?? getMergedToolById(toolId);
    },
    [toolCatalog],
  );

  const visibleFolders = useMemo(() => folders.filter((f) => !f.hidden), [folders]);

  const handleSave = () => {
    if (!workflowId) return;
    const wf = ensureDashboardWorkflow(workflowId, layoutFolderId);
    if (!wf) return;
    addUserWorkflowTemplateFromDashboard(wf, categoryId, resolveTool, {
      title: templateTitle.trim() || wf.name.trim() || "내 템플릿",
      subtitle: templateSubtitle,
    });
    setSavedHint(true);
  };

  if (!open || !workflowId) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="save-tpl-title">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm" aria-label="닫기" />
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-zinc-200">
        <h2 id="save-tpl-title" className="text-lg font-bold text-zinc-950">
          템플릿으로 추가
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          단계와 연결된 도구 구성만 템플릿으로 남깁니다. 프로젝트에 있던 <span className="font-semibold text-zinc-800">관련 링크·공통 메모</span>는
          템플릿에 넣지 않아요. 아래에서 템플릿 제목·설명을 정한 뒤 저장하세요.
        </p>

        <label className="mt-4 block">
          <span className="text-xs font-semibold text-zinc-500">템플릿 제목</span>
          <input
            type="text"
            value={templateTitle}
            onChange={(e) => setTemplateTitle(e.target.value)}
            placeholder="예: 상세페이지 기획 템플릿"
            className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-xs font-semibold text-zinc-500">템플릿 설명</span>
          <textarea
            value={templateSubtitle}
            onChange={(e) => setTemplateSubtitle(e.target.value)}
            rows={3}
            placeholder="어떤 프로젝트에 쓸지 짧게 적어두면 나중에 찾기 쉬워요."
            className="mt-1 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-semibold text-zinc-500">템플릿 폴더</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
          >
            {visibleFolders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.emoji} {f.name}
              </option>
            ))}
          </select>
        </label>

        {savedHint ? (
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">
            저장했어요. 워크플로우 메뉴에서 템플릿으로 확인할 수 있어요.
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-200"
          >
            {savedHint ? "닫기" : "취소"}
          </button>
          {!savedHint ? (
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800"
            >
              저장
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
