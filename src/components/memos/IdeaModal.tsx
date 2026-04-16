"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadMemoFolders, memoFolderCategoryKey } from "@/lib/memo-folders-store";
import {
  buildIdeaCopyText,
  emptyIdeaFormState,
  formMetadataFromState,
  IdeaFormFields,
  IdeaMemoReadOnlyPanel,
  noteToFormState,
  type IdeaFormState,
} from "@/components/memos/idea-note-form-fields";
import { WORKSPACE_HEADER_ADD_MATCH_BTN } from "@/components/workspace/WorkspaceLinksMemosSections";
import { appendUserLayoutEntry } from "@/lib/dashboard-layout-store";
import { loadDashboardFolders, pickDefaultProjectFolderId } from "@/lib/dashboard-folders-store";
import { promoteNoteToProject, type PromoteTemplateChoice } from "@/lib/note-to-project";
import { listWorkflowTemplatesForMenu } from "@/lib/workflow-templates-menu-list";
import { cn } from "@/components/ui/cn";
import {
  addNote,
  getNote,
  updateNote,
  type IdeaNote,
} from "@/lib/notes-store";

export type IdeaModalMode = "create" | "edit" | "view";

const PROJECT_START_BTN_BASE =
  "inline-flex h-9 w-full shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2";

const PROJECT_START_BTN_ENABLED =
  "border border-blue-600 bg-blue-600 text-white hover:bg-blue-700";

const PROJECT_START_BTN_DISABLED =
  "cursor-not-allowed border border-zinc-200/80 bg-zinc-100 text-zinc-600";

const SELECT_CLASS =
  "mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-0 text-[13px] leading-9 text-zinc-900 outline-none focus-visible:border-zinc-300 focus-visible:ring-2 focus-visible:ring-zinc-100/90 focus-visible:ring-offset-0";

const PROMOTE_BLANK_SELECT_VALUE = "__blank__";
const TEMPLATE_PLACEHOLDER_VALUE = "";

export function IdeaModal({
  open,
  mode,
  noteId,
  folderIdForCreate,
  onClose,
  onSaved,
  onRequestEdit,
}: {
  open: boolean;
  mode: IdeaModalMode;
  noteId?: string;
  folderIdForCreate?: string;
  onClose: () => void;
  onSaved?: () => void;
  onRequestEdit?: () => void;
}) {
  const router = useRouter();
  const [memoFolders] = useState(() => loadMemoFolders());
  const [form, setForm] = useState<IdeaFormState>(() => emptyIdeaFormState(folderIdForCreate || "memo-folder-s1"));
  const [resolvedNoteId, setResolvedNoteId] = useState<string | null>(null);
  const [selectedWorkflowTemplateId, setSelectedWorkflowTemplateId] = useState(TEMPLATE_PLACEHOLDER_VALUE);

  const effectiveNoteId = resolvedNoteId ?? noteId;

  const availableTemplates = useMemo(() => {
    return listWorkflowTemplatesForMenu();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setResolvedNoteId(null);
      setSelectedWorkflowTemplateId(TEMPLATE_PLACEHOLDER_VALUE);
      return;
    }
    if (mode === "create") {
      setForm(emptyIdeaFormState(folderIdForCreate || "memo-folder-s1"));
      return;
    }
    const n = effectiveNoteId ? getNote(effectiveNoteId) : null;
    if (n) setForm(noteToFormState(n));
  }, [open, mode, noteId, folderIdForCreate]);

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

  const persistFormToStore = useCallback((): string | null => {
    const metadata = formMetadataFromState(form);
    if (mode === "create" && !resolvedNoteId) {
      const note = addNote({
        title: form.title,
        content: form.content,
        tags: form.tags,
        metadata,
        folderId: form.folderId,
        color: form.color,
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
      tags: form.tags,
      metadata,
      color: form.color,
      projectStatus: form.projectStatus,
    });
    onSaved?.();
    return id;
  }, [form, mode, effectiveNoteId, resolvedNoteId, onSaved]);

  const save = () => {
    const id = persistFormToStore();
    if (id !== null) {
      onClose();
    } else {
      window.alert("메모를 저장할 수 없습니다.");
    }
  };

  const runPromote = (choice: PromoteTemplateChoice) => {
    let id: string | null = persistFormToStore();
    if (!id) id = effectiveNoteId;
    if (!id) {
      window.alert("메모를 저장할 수 없습니다.");
      return;
    }
    const note = getNote(id);
    if (!note) {
      window.alert("메모를 찾을 수 없습니다.");
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

  const headerTitle = mode === "create" ? "새 아이디어" : form.title.trim() || "아이디어";
  const currentNote: IdeaNote | null = effectiveNoteId && open ? (getNote(effectiveNoteId) ?? null) : null;
  const showProjectStart = Boolean(currentNote && !currentNote.isConverted) || mode === "create";

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative z-10 flex max-h-[min(90vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200"
        role="dialog"
        aria-labelledby="idea-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id="idea-modal-title" className="text-base font-semibold text-zinc-900">
              {headerTitle}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {mode === "view" ? "읽기 전용입니다. 수정하려면 편집을 눌러 주세요." : "아이디어를 기록하고 워크스페이스로 전환해보세요."}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600">
            <span className="text-xl">×</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {mode === "view" && currentNote ? (
            <IdeaMemoReadOnlyPanel note={currentNote} memoFolders={memoFolders} />
          ) : (
            <IdeaFormFields memoFolders={memoFolders} form={form} setForm={setFormPatch} />
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50/30 px-5 py-4">
          {showProjectStart && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-tighter">프로젝트 전환</label>
                <div className="flex gap-2">
                  <select
                    className={SELECT_CLASS}
                    value={selectedWorkflowTemplateId}
                    onChange={(e) => setSelectedWorkflowTemplateId(e.target.value)}
                  >
                    <option value={TEMPLATE_PLACEHOLDER_VALUE}>워크스페이스 템플릿 선택</option>
                    <option value={PROMOTE_BLANK_SELECT_VALUE}>빈 워크스페이스로 시작</option>
                    {availableTemplates.map((t) => (
                      <option key={t.templateId} value={t.templateId}>{t.title}</option>
                    ))}
                  </select>
                  <button
                    disabled={!canStartProject}
                    onClick={onStartProject}
                    className={cn(
                      PROJECT_START_BTN_BASE,
                      canStartProject ? PROJECT_START_BTN_ENABLED : PROJECT_START_BTN_DISABLED
                    )}
                  >
                    시작
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <button onClick={copyAll} className="h-9 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
              복사
            </button>
            <div className="flex gap-2">
              {mode === "view" ? (
                <button onClick={onRequestEdit} className={WORKSPACE_HEADER_ADD_MATCH_BTN}>편집</button>
              ) : (
                <button onClick={save} className={WORKSPACE_HEADER_ADD_MATCH_BTN}>저장</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
