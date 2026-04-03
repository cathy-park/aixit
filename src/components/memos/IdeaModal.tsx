"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadMemoFolders, memoFolderCategoryKey } from "@/lib/memo-folders-store";
import {
  buildIdeaCopyText,
  emptyIdeaFormState,
  formMetadataFromState,
  IdeaFormFields,
  noteToFormState,
  type IdeaFormState,
} from "@/components/memos/idea-note-form-fields";
import { WORKSPACE_HEADER_ADD_MATCH_BTN } from "@/components/workspace/WorkspaceLinksMemosSections";
import { appendUserLayoutEntry } from "@/lib/dashboard-layout-store";
import { loadDashboardFolders, pickDefaultProjectFolderId } from "@/lib/dashboard-folders-store";
import { promoteNoteToProject, type PromoteTemplateChoice } from "@/lib/note-to-project";
import { TEMPLATE_CATEGORY_OVERRIDE_EVENT } from "@/lib/workflow-template-category-override-store";
import { listWorkflowTemplatesForMenu } from "@/lib/workflow-templates-menu-list";
import { REMOVED_WORKFLOW_TEMPLATES_EVENT } from "@/lib/user-removed-workflow-templates-store";
import { USER_WORKFLOW_TEMPLATES_EVENT } from "@/lib/user-workflow-templates-store";
import { cn } from "@/components/ui/cn";
import {
  addNote,
  getNote,
  updateNote,
  validateStructuredNote,
  type IdeaNote,
} from "@/lib/notes-store";

export type IdeaModalMode = "create" | "edit" | "view";

/** 높이·타이포 공통 (폴더 칩 미선택 / 구조 템플릿 선택 색과 맞춤) */
const PROJECT_START_BTN_BASE =
  "inline-flex h-9 w-full shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2";

const PROJECT_START_BTN_ENABLED =
  "border border-blue-600 bg-blue-600 text-white hover:bg-blue-700";

/** 메모 폴더 칩 비활성(미선택)과 동일 톤 */
const PROJECT_START_BTN_DISABLED =
  "cursor-not-allowed border border-zinc-200/80 bg-zinc-100 text-zinc-600";

const SELECT_CLASS =
  "mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-0 text-[13px] leading-9 text-zinc-900 outline-none focus-visible:border-zinc-300 focus-visible:ring-2 focus-visible:ring-zinc-100/90 focus-visible:ring-offset-0";

/** 드롭다운: 워크플로 템플릿 없이 빈 프로젝트로 시작 */
const PROMOTE_BLANK_SELECT_VALUE = "__blank__";

/** 초기값·미선택 (프로젝트 시작 비활성) */
const TEMPLATE_PLACEHOLDER_VALUE = "";

export function IdeaModal({
  open,
  mode,
  noteId,
  folderIdForCreate,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: IdeaModalMode;
  noteId: string | null;
  folderIdForCreate: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<IdeaFormState>(() => emptyIdeaFormState("memo-folder-s1"));
  const [resolvedNoteId, setResolvedNoteId] = useState<string | null>(null);
  const [selectedWorkflowTemplateId, setSelectedWorkflowTemplateId] = useState(TEMPLATE_PLACEHOLDER_VALUE);
  const [templateMenuTick, setTemplateMenuTick] = useState(0);

  const effectiveNoteId = resolvedNoteId ?? noteId;

  const memoFolders = useMemo(() => (open ? loadMemoFolders() : []), [open]);

  const workflowTemplates = useMemo(() => listWorkflowTemplatesForMenu(), [templateMenuTick, open]);

  useEffect(() => {
    if (!open) return;
    const bump = () => setTemplateMenuTick((x) => x + 1);
    window.addEventListener(USER_WORKFLOW_TEMPLATES_EVENT, bump);
    window.addEventListener(REMOVED_WORKFLOW_TEMPLATES_EVENT, bump);
    window.addEventListener(TEMPLATE_CATEGORY_OVERRIDE_EVENT, bump);
    window.addEventListener("aixit-workflow-template-folders-updated", bump);
    return () => {
      window.removeEventListener(USER_WORKFLOW_TEMPLATES_EVENT, bump);
      window.removeEventListener(REMOVED_WORKFLOW_TEMPLATES_EVENT, bump);
      window.removeEventListener(TEMPLATE_CATEGORY_OVERRIDE_EVENT, bump);
      window.removeEventListener("aixit-workflow-template-folders-updated", bump);
    };
  }, [open]);

  const resetFromProps = useCallback(() => {
    if (mode === "create") {
      setForm(emptyIdeaFormState(folderIdForCreate));
      setResolvedNoteId(null);
    } else if (noteId) {
      const n = getNote(noteId);
      setForm(n ? noteToFormState(n) : emptyIdeaFormState(folderIdForCreate));
      setResolvedNoteId(null);
    }
    setSelectedWorkflowTemplateId(TEMPLATE_PLACEHOLDER_VALUE);
  }, [mode, noteId, folderIdForCreate]);

  useEffect(() => {
    if (!open) return;
    resetFromProps();
  }, [open, resetFromProps]);

  useEffect(() => {
    if (!open || mode === "create" || !noteId) return;
    const n = getNote(noteId);
    if (n) setForm(noteToFormState(n));
  }, [open, mode, noteId]);

  const setFormPatch = useCallback(
    (patch: Partial<IdeaFormState> | ((prev: IdeaFormState) => IdeaFormState)) => {
      setForm((prev) => (typeof patch === "function" ? patch(prev) : { ...prev, ...patch }));
    },
    [],
  );

  const copyAll = async () => {
    const text = buildIdeaCopyText(form);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("복사할 내용:", text);
    }
    window.alert("복사되었습니다");
  };

  /** 검증 없이 디스크에 반영. 새 메모면 id 반환. */
  const persistFormToStore = useCallback((): string | null => {
    const metadata = formMetadataFromState(form);
    if (mode === "create" && !effectiveNoteId) {
      const note = addNote({
        title: form.title,
        content: form.content,
        metadata,
        folderId: form.folderId,
      });
      setResolvedNoteId(note.id);
      onSaved?.();
      return note.id;
    }
    const id = effectiveNoteId;
    if (!id) return null;
    updateNote(id, {
      title: form.title,
      content: form.content,
      folderId: form.folderId,
      metadata,
    });
    onSaved?.();
    return id;
  }, [form, mode, effectiveNoteId, onSaved]);

  const save = () => {
    const id = persistFormToStore();
    if (id !== null) {
      onClose();
    } else {
      window.alert("메모를 저장할 수 없습니다.");
    }
  };

  const runPromote = (choice: PromoteTemplateChoice) => {
    const noteIdAfter = persistFormToStore();
    const id = noteIdAfter ?? effectiveNoteId;
    if (!id) {
      window.alert("메모를 저장할 수 없습니다.");
      return;
    }
    const note = getNote(id);
    if (!note) {
      window.alert("저장된 메모를 찾을 수 없습니다.");
      return;
    }
    const err = validateStructuredNote(note);
    if (err) {
      window.alert(err);
      return;
    }
    const projectFolderId = pickDefaultProjectFolderId(loadDashboardFolders());
    const result = promoteNoteToProject(note, projectFolderId, choice);
    if (!result) {
      window.alert("프로젝트를 만들 수 없습니다. 템플릿을 확인해 주세요.");
      return;
    }
    appendUserLayoutEntry(result.projectId, projectFolderId);
    updateNote(note.id, { isConverted: true, convertedProjectId: result.projectId });
    onClose();
    onSaved?.();
    router.push(`/workspace?id=${encodeURIComponent(result.projectId)}`);
  };

  const canStartProject = selectedWorkflowTemplateId.trim().length > 0;

  const onStartProject = () => {
    if (!canStartProject) return;
    if (selectedWorkflowTemplateId === PROMOTE_BLANK_SELECT_VALUE) {
      runPromote("blank");
      return;
    }
    runPromote(selectedWorkflowTemplateId.trim());
  };

  const onStartBlankOnly = () => {
    runPromote("blank");
  };

  const headerTitle =
    mode === "create" ? "새 아이디어" : form.title.trim() || "아이디어";

  const currentNote: IdeaNote | null =
    effectiveNoteId && open ? (getNote(effectiveNoteId) ?? null) : null;
  const showProjectStart = Boolean(currentNote && !currentNote.isConverted) || mode === "create";

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[min(90vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200"
        role="dialog"
        aria-labelledby="idea-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id="idea-modal-title" className="text-base font-semibold text-zinc-900">
              {headerTitle}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              폴더를 바꿔도 다른 기획 필드에 적어 둔 내용은 유지됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="닫기"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 [overflow-anchor:none]">
          <IdeaFormFields memoFolders={memoFolders} form={form} setForm={setFormPatch} />
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-100 px-5 py-4">
          {showProjectStart ? (
            <>
              {workflowTemplates.length === 0 ? (
                <>
                  <p className="text-sm leading-snug text-zinc-600">
                    등록된 워크플로우 템플릿이 없습니다.
                  </p>
                  <button
                    type="button"
                    onClick={onStartBlankOnly}
                    className={cn(PROJECT_START_BTN_BASE, PROJECT_START_BTN_ENABLED)}
                  >
                    빈 프로젝트로 시작
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="idea-workflow-template-select" className="text-xs font-semibold text-zinc-500">
                      워크스페이스 템플릿
                    </label>
                    <select
                      id="idea-workflow-template-select"
                      className={SELECT_CLASS}
                      value={selectedWorkflowTemplateId}
                      onChange={(e) => setSelectedWorkflowTemplateId(e.target.value)}
                    >
                      <option value={TEMPLATE_PLACEHOLDER_VALUE}>템플릿 선택하기</option>
                      <option value={PROMOTE_BLANK_SELECT_VALUE}>빈 프로젝트로 시작</option>
                      {workflowTemplates.map((t) => (
                        <option
                          key={t.templateId}
                          value={t.templateId}
                          title={
                            [t.subtitle, t.stepCount > 0 ? `${t.stepCount}단계` : ""].filter(Boolean).join(" · ") ||
                            undefined
                          }
                        >
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={!canStartProject}
                    onClick={onStartProject}
                    className={cn(
                      PROJECT_START_BTN_BASE,
                      canStartProject ? PROJECT_START_BTN_ENABLED : PROJECT_START_BTN_DISABLED,
                    )}
                  >
                    프로젝트 시작하기
                  </button>
                </>
              )}
            </>
          ) : null}

          <div className="flex flex-row items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={copyAll}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              전체 복사
            </button>
            <button type="button" onClick={save} className={WORKSPACE_HEADER_ADD_MATCH_BTN}>
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
