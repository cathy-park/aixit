"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildIdeaCopyText,
  emptyIdeaFormState,
  formMetadataFromState,
  IdeaFormFields,
  noteToFormState,
  type IdeaFormState,
} from "@/components/memos/idea-note-form-fields";
import { WORKSPACE_HEADER_ADD_MATCH_BTN } from "@/components/workspace/WorkspaceLinksMemosSections";
import { listWorkflowTemplates } from "@/lib/aixit-data";
import { appendUserLayoutEntry } from "@/lib/dashboard-layout-store";
import { promoteNoteToProject, type PromoteTemplateChoice } from "@/lib/note-to-project";
import {
  addNote,
  getNote,
  updateNote,
  validateStructuredNote,
  type IdeaNote,
} from "@/lib/notes-store";

export type IdeaModalMode = "create" | "edit" | "view";

const PRIMARY_BLUE_BTN =
  "inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-bold leading-none text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40";

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
  const [form, setForm] = useState<IdeaFormState>(emptyIdeaFormState);
  const [resolvedNoteId, setResolvedNoteId] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const templates = useMemo(() => listWorkflowTemplates(), []);

  const effectiveNoteId = resolvedNoteId ?? noteId;

  const resetFromProps = useCallback(() => {
    if (mode === "create") {
      setForm(emptyIdeaFormState());
      setResolvedNoteId(null);
    } else if (noteId) {
      const n = getNote(noteId);
      setForm(n ? noteToFormState(n) : emptyIdeaFormState());
      setResolvedNoteId(null);
    }
  }, [mode, noteId]);

  useEffect(() => {
    if (!open) return;
    resetFromProps();
    setTemplateOpen(false);
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

  const save = () => {
    const metadata = formMetadataFromState(form);
    const err = validateStructuredNote({ category: form.category, metadata });
    if (err) {
      window.alert(err);
      return;
    }
    if (mode === "create" && !resolvedNoteId) {
      const note = addNote({
        title: form.title,
        content: form.content,
        category: form.category,
        metadata,
        folderId: folderIdForCreate,
      });
      setResolvedNoteId(note.id);
      onSaved?.();
      return;
    }
    const id = effectiveNoteId;
    if (!id) return;
    updateNote(id, {
      title: form.title,
      content: form.content,
      category: form.category,
      metadata,
    });
    onSaved?.();
  };

  const runPromote = (choice: PromoteTemplateChoice) => {
    const id = effectiveNoteId;
    if (!id) return;
    const note = getNote(id);
    if (!note) return;
    const err = validateStructuredNote(note);
    if (err) {
      window.alert(err);
      return;
    }
    const result = promoteNoteToProject(note, note.folderId, choice);
    if (!result) {
      window.alert("프로젝트를 만들 수 없습니다. 템플릿을 확인해 주세요.");
      return;
    }
    appendUserLayoutEntry(result.projectId, note.folderId);
    updateNote(note.id, { isConverted: true, convertedProjectId: result.projectId });
    setTemplateOpen(false);
    onClose();
    onSaved?.();
    router.push(`/workspace?id=${encodeURIComponent(result.projectId)}`);
  };

  const openTemplatePicker = () => {
    const id = effectiveNoteId;
    if (!id) {
      window.alert("먼저 저장해 주세요.");
      return;
    }
    const note = getNote(id);
    if (!note) return;
    const err = validateStructuredNote(note);
    if (err) {
      window.alert(err);
      return;
    }
    setTemplateOpen(true);
  };

  const headerTitle =
    mode === "create" ? "새 아이디어" : form.title.trim() || "아이디어";

  const currentNote: IdeaNote | null =
    effectiveNoteId && open ? (getNote(effectiveNoteId) ?? null) : null;
  const showProjectStart = Boolean(currentNote && !currentNote.isConverted);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
        <div
          className="flex max-h-[min(90vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200"
          role="dialog"
          aria-labelledby="idea-modal-title"
        >
          <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
            <div className="min-w-0">
              <h2 id="idea-modal-title" className="text-base font-semibold text-zinc-900">
                {headerTitle}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                카테고리를 바꿔도 다른 모드에 적어 둔 내용은 유지됩니다.
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

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <IdeaFormFields form={form} setForm={setFormPatch} />
          </div>

          <div className="flex flex-col gap-3 border-t border-zinc-100 px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={copyAll}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              전체 복사
            </button>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <button type="button" onClick={save} className={WORKSPACE_HEADER_ADD_MATCH_BTN}>
                저장
              </button>
              {showProjectStart ? (
                <button type="button" onClick={openTemplatePicker} className={PRIMARY_BLUE_BTN}>
                  프로젝트 시작하기
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {templateOpen && currentNote ? (
        <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            className="flex max-h-[min(90vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200"
            role="dialog"
            aria-labelledby="idea-template-pick-title"
          >
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 id="idea-template-pick-title" className="text-base font-semibold text-zinc-900">
                프로젝트 템플릿 선택
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                기획 내용은 프로젝트 설명·메모·할 일로 이관됩니다. 워크플로 단계는 템플릿을 고르면 유지됩니다.
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <button
                type="button"
                onClick={() => runPromote("blank")}
                className="mb-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
              >
                빈 프로젝트 (기획 필드 → 단계로만 구성)
              </button>
              <ul className="space-y-2">
                {templates.map((t) => (
                  <li key={t.templateId}>
                    <button
                      type="button"
                      onClick={() => runPromote(t.templateId)}
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm hover:bg-zinc-50"
                    >
                      <span className="font-semibold text-zinc-900">{t.title}</span>
                      <span className="mt-0.5 block text-xs text-zinc-500">{t.subtitle}</span>
                      <span className="mt-1 inline-block text-[10px] font-medium text-zinc-400">
                        {t.categoryLabel} · {t.stepCount}단계
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-zinc-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setTemplateOpen(false)}
                className="w-full rounded-full border border-zinc-200 bg-white py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
