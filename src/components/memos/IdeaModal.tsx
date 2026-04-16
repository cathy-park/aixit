"use client";

import { useCallback, useEffect, useState } from "react";
import { 
  loadMemoFolders 
} from "@/lib/memo-folders-store";
import {
  buildIdeaCopyText,
  emptyIdeaFormState,
  formMetadataFromState,
  IdeaFormFields,
  IdeaMemoReadOnlyPanel,
  noteToFormState,
  type IdeaFormState,
} from "@/components/memos/idea-note-form-fields";
import { 
  WORKSPACE_HEADER_ADD_MATCH_BTN 
} from "@/components/workspace/WorkspaceLinksMemosSections";
import { cn } from "@/components/ui/cn";
import {
  addNote,
  getNote,
  updateNote,
  type IdeaNote,
} from "@/lib/notes-store";
import { type DashboardFolderRecord } from "@/lib/dashboard-folders-store";

export type IdeaModalMode = "create" | "edit" | "view";

export interface IdeaModalProps {
  open: boolean;
  mode: IdeaModalMode;
  noteId?: string;
  folderIdForCreate?: string;
  onClose: () => void;
  onSaved?: () => void;
  onRequestEdit?: () => void;
}

export function IdeaModal({
  open,
  mode,
  noteId,
  folderIdForCreate,
  onClose,
  onSaved,
  onRequestEdit,
}: IdeaModalProps) {
  const [memoFolders] = useState<DashboardFolderRecord[]>(() => loadMemoFolders());
  const [form, setForm] = useState<IdeaFormState>(() => emptyIdeaFormState(folderIdForCreate || "memo-folder-s1"));
  const [resolvedNoteId, setResolvedNoteId] = useState<string | null>(null);

  const effectiveNoteId = resolvedNoteId ?? noteId;

  // Initialize form state
  useEffect(() => {
    if (!open) {
      setResolvedNoteId(null);
      return;
    }
    if (mode === "create") {
      setForm(emptyIdeaFormState(folderIdForCreate || "memo-folder-s1"));
      return;
    }
    
    // Edit or View mode
    if (effectiveNoteId) {
      const n = getNote(effectiveNoteId);
      if (n) {
        setForm(noteToFormState(n));
      }
    }
  }, [open, mode, folderIdForCreate, effectiveNoteId]);

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
      window.alert("복사되었습니다");
    } catch {
      window.prompt("복사할 내용:", text);
    }
  };

  const persistFormToStore = useCallback((): string | null => {
    const metadata = formMetadataFromState(form);
    
    // Create new note
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
    
    // Update existing note
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

  const handleSaveAndClose = () => {
    const id = persistFormToStore();
    if (id !== null) {
      onClose();
    } else {
      window.alert("메모를 저장할 수 없습니다.");
    }
  };

  const headerTitle = mode === "create" ? "새 아이디어" : form.title.trim() || "아이디어";
  const currentNote: IdeaNote | null = (effectiveNoteId && open) ? (getNote(effectiveNoteId) || null) : null;

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
              {mode === "view" ? "기록된 내용을 확인하고 있습니다." : "생각을 자유롭게 기록하세요."}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600">
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
          {mode === "view" && currentNote ? (
            <IdeaMemoReadOnlyPanel note={currentNote} memoFolders={memoFolders} />
          ) : (
            <IdeaFormFields memoFolders={memoFolders} form={form} setForm={setFormPatch} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/30 px-5 py-4">
          <button 
            type="button"
            onClick={copyAll} 
            className="h-10 rounded-full border border-zinc-200 bg-white px-5 text-sm font-bold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
          >
            복사하기
          </button>
          <div className="flex gap-2">
            {mode === "view" ? (
              <button 
                type="button"
                onClick={onRequestEdit} 
                className={cn(
                  WORKSPACE_HEADER_ADD_MATCH_BTN,
                  "h-10 px-6 rounded-full font-bold shadow-md shadow-zinc-200"
                )}
              >
                편집하기
              </button>
            ) : (
              <button 
                type="button"
                onClick={handleSaveAndClose} 
                className={cn(
                  WORKSPACE_HEADER_ADD_MATCH_BTN,
                  "h-10 px-6 rounded-full font-bold shadow-md shadow-zinc-200"
                )}
              >
                저장하기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
