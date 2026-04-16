"use client";

import type { DragEvent, MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AdaptivePageHeader } from "@/components/layout/AdaptivePageHeader";
import { AppMainColumn } from "@/components/layout/AppMainColumn";
import { DeleteFolderModal } from "@/components/dashboard/DeleteFolderModal";
import { FolderFormModal } from "@/components/dashboard/FolderFormModal";
import { FolderGlyph } from "@/components/dashboard/FolderGlyph";
import { FolderSectionAccordionHeader } from "@/components/dashboard/FolderSectionAccordionHeader";
import { FolderSectionToolbar } from "@/components/dashboard/FolderSectionToolbar";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import type { FolderBarItem } from "@/components/dashboard/DashboardFolderBar";
import { IdeaModal, type IdeaModalMode } from "@/components/memos/IdeaModal";
import { DashboardCompletedRevealSection } from "@/components/dashboard/DashboardCompletedRevealSection";
import { DashboardExposureStatusBar } from "@/components/dashboard/DashboardExposureStatusBar";
import { PillSearchField } from "@/components/ui/PillSearchField";
import { TitleCountChip } from "@/components/ui/TitleCountChip";
import { cn } from "@/components/ui/cn";
import { FloatingAddButton } from "@/components/ui/FloatingAddButton";
import { CardActionsOverflow } from "@/components/cards/CardActionsOverflow";
import {
  APP_CARD_GRID_CLASS,
  APP_CARD_GRID_ITEM_CLASS,
  APP_CARD_SHELL_DASHBOARD_CLASS,
  APP_CARD_TITLE_TEXT_CLASS,
  APP_CARD_TITLE_TRACK_CLASS,
} from "@/components/cards/app-card-layout";
import { EditableLifecycleStatusControl } from "@/components/dashboard/WorkflowCard";
import { MemoMarkupBody } from "@/components/workspace/MemoMiniMarkupText";
import { WORKSPACE_HEADER_ADD_MATCH_BTN } from "@/components/workspace/WorkspaceLinksMemosSections";
import { actionIconButtonClass, IconEdit, IconStarPin, IconTrash } from "@/components/ui/action-icons";
import { keywordTagToneClass, normalizeKeyword } from "@/lib/keyword-tag-styles";
import { MEMO_COLORS } from "@/components/memos/idea-note-form-fields";
import { WORKFLOW_STATUS_OPTIONS, type WorkflowRunStatus } from "@/lib/workflow-run-status";
import {
  statusVisibilityPillClass,
  statusVisibilitySignalClass,
} from "@/lib/dashboard-status-visibility-styles";
import type { DashboardFolderRecord } from "@/lib/dashboard-folders-store";
import {
  addMemoFolder,
  loadMemoFolders,
  pickDefaultMemoFolderId,
  removeMemoFolder,
  reorderMemoFolderBefore,
  updateMemoFolder,
} from "@/lib/memo-folders-store";
import { cancelNativeCardLayoutDragIfInteractive, MEMO_ENTRY_MIME } from "@/lib/layout-card-dnd";
import {
  ensureMemoLayoutMerged,
  loadMemoLayout,
  MEMO_LAYOUT_UPDATED_EVENT,
  moveMemoBeforeTargetInFolder,
  moveMemoToFolderEnd,
  reorderMemoBeforeTarget,
  saveMemoLayout,
  type MemoLayoutEntry,
} from "@/lib/memo-layout-store";
import {
  loadPinnedIdeaNoteIds,
  PINNED_IDEA_NOTES_UPDATED_EVENT,
  togglePinnedIdeaNoteId,
} from "@/lib/pinned-idea-notes-store";
import { DEFAULT_STATUS_VISIBILITY, type StatusVisibilityFilter } from "@/lib/dashboard-workflow-filters";
import { partitionMemoDisplayByExposure } from "@/lib/memo-exposure-filters";
import {
  loadNotes,
  NOTES_UPDATED_EVENT,
  removeNote,
  reassignMemoNotesFromFolder,
  syncMemoNoteCategoriesForMemoFolder,
  syncMemoNotesToMemoFolders,
  updateNote,
  type IdeaNote,
} from "@/lib/notes-store";
import { metadataAllSectionsSearchText } from "@/lib/structured-memo-sections";

function orderedNotesForFolder(
  notes: IdeaNote[],
  layout: MemoLayoutEntry[],
  folderId: string,
): IdeaNote[] {
  const byId = new Map(notes.map((n) => [n.id, n]));
  const inFolder = layout.filter((e) => e.folderId === folderId).map((e) => e.id);
  const ordered: IdeaNote[] = [];
  const seen = new Set<string>();
  for (const id of inFolder) {
    const n = byId.get(id);
    if (n && n.folderId === folderId) {
      ordered.push(n);
      seen.add(id);
    }
  }
  for (const n of notes) {
    if (n.folderId === folderId && !seen.has(n.id)) ordered.push(n);
  }
  return ordered;
}

function IdeaMemoCard({
  note,
  folder,
  pinned,
  dropTargetKey,
  memoDnD,
  dimCompleted,
  onOpenModal,
  onTogglePin,
  onEdit,
  onDelete,
}: {
  note: IdeaNote;
  folder: DashboardFolderRecord;
  pinned: boolean;
  dropTargetKey: string | null;
  memoDnD: MemoLayoutDnD | null;
  dimCompleted?: boolean;
  onOpenModal: () => void;
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pinKey = `memo:${note.id}`;
  const converted = note.isConverted;
  const grayscaleMain = cn(
    converted && "grayscale opacity-[0.88] [&_svg]:opacity-70 [&_img]:opacity-90",
  );
  const dnd = memoDnD;
  const cardRef = useRef<HTMLDivElement>(null);

  // Resize Persistence
  const storedHeight = note.metadata?.cardHeight as number | undefined;
  const [currentHeight, setCurrentHeight] = useState<number | undefined>(storedHeight);
  const [isResizing, setIsResizing] = useState(false);

  const stopCardNav = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const newHeight = e.clientY - rect.top;
      // Min height 120px
      if (newHeight >= 120) {
        setCurrentHeight(newHeight);
      }
    };

    const onMouseUp = () => {
      setIsResizing(false);
      // Persist the height
      if (currentHeight) {
        updateNote(note.id, {
          metadata: {
            ...note.metadata,
            cardHeight: currentHeight
          }
        });
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing, currentHeight, note.id, note.metadata]);

  const colorInfo = MEMO_COLORS.find((c) => c.key === (note.color || "yellow")) || MEMO_COLORS[0]!;

  return (
    <div
      ref={cardRef}
      className={cn(
        APP_CARD_GRID_ITEM_CLASS,
        dnd && "cursor-grab rounded-[30px] active:cursor-grabbing",
        dnd && dropTargetKey === pinKey && "ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-50",
        dimCompleted && "opacity-[0.78]",
        "transition-transform hover:scale-[1.01] active:scale-[0.99]",
        isResizing && "transition-none scale-100"
      )}
      style={{
        height: currentHeight ? `${currentHeight}px` : undefined,
        minHeight: "160px" // Default minimum
      }}
      draggable={Boolean(dnd && !isResizing)}
      onDragStart={dnd ? (e) => dnd.onDragStart(e, note.id) : undefined}
      onDragOver={dnd ? (e) => dnd.onDragOver(e, pinKey) : undefined}
      onDragLeave={dnd ? (e) => dnd.onDragLeave(e) : undefined}
      onDrop={dnd ? (e) => dnd.onDrop(e, note.id) : undefined}
      onDragEnd={dnd ? dnd.onDragEnd : undefined}
    >
      <div className={cn(
        "relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-sm shadow-lg",
        colorInfo.bg,
        "before:absolute before:inset-x-0 before:top-0 before:h-2 before:bg-black/5", // Subtle header shadow
        "after:absolute after:bottom-0 after:right-0 after:h-4 after:w-4 after:bg-gradient-to-tl after:from-black/10 after:to-transparent" // Corner fold effect
      )}>
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden p-6 pb-2">
          <div className="flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0 flex-1">
              <div className={cn(APP_CARD_TITLE_TRACK_CLASS, grayscaleMain)}>
                <FolderGlyph folder={folder} size="sm" className="shrink-0 opacity-70" accentColor={folder.color} />
                <button
                  type="button"
                  onClick={onOpenModal}
                  className="min-w-0 flex-1 overflow-hidden text-left outline-none"
                >
                  <span className={cn(APP_CARD_TITLE_TEXT_CLASS, "text-zinc-900")}>{note.title.trim() || "제목 없음"}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                draggable={false}
                onClick={(e) => {
                  stopCardNav(e);
                  onTogglePin();
                }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                  pinned ? "bg-amber-100 text-amber-500 shadow-sm" : "text-zinc-400 hover:bg-black/5 hover:text-zinc-600"
                )}
                aria-pressed={Boolean(pinned)}
                title={pinned ? "상단 고정 해제" : "상단 고정"}
              >
                <IconStarPin active={Boolean(pinned)} className={cn("h-5 w-5", pinned && "fill-current")} />
              </button>

              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  draggable={false}
                  title="수정"
                  onClick={(e) => {
                    stopCardNav(e);
                    onEdit();
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-black/5 hover:text-zinc-600"
                >
                  <IconEdit className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  draggable={false}
                  title="삭제"
                  onClick={(e) => {
                    stopCardNav(e);
                    onDelete();
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div 
            className="flex-1 overflow-y-auto custom-scrollbar mt-3 pr-1 pb-4"
            onMouseDown={(e) => {
              // Prevent drag if clicking content in scrollable area
              if (e.target !== e.currentTarget) e.stopPropagation();
            }}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("input[type='checkbox']")) return;
                onOpenModal();
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                if ((e.target as HTMLElement).closest("input[type='checkbox']")) return;
                e.preventDefault();
                onOpenModal();
              }}
              className="block min-w-0 cursor-pointer text-left outline-none"
              aria-label="메모 상세 열기"
            >
              <div className={cn(grayscaleMain, "space-y-4")}>
                {note.content?.trim() ? (
                  <div className="text-sm font-medium leading-relaxed text-zinc-800/90">
                    <MemoMarkupBody
                      text={note.content}
                      interactiveCheckboxes={!converted}
                      onTextChange={
                        converted ? undefined : (next) => updateNote(note.id, { content: next })
                      }
                    />
                  </div>
                ) : (
                  <div className="h-12" />
                )}

                <div className="flex flex-wrap gap-1.5 opacity-80">
                  <span className={cn("rounded-md border border-black/10 bg-black/5 px-2 py-0.5 text-[10px] font-bold text-zinc-700")}>
                    #{note.category}
                  </span>
                  {(note.tags ?? []).map((tag) => (
                    <span
                      key={`${note.id}:${tag}`}
                      className={cn(
                        "rounded-md border border-black/10 bg-black/5 px-2 py-0.5 text-[10px] font-bold text-zinc-700"
                      )}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4 flex items-center justify-between text-[10px] font-bold text-zinc-500/60 uppercase tracking-wider relative z-30 shrink-0">
            <div className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold ring-1 transition-all",
              statusVisibilityPillClass(note.projectStatus as WorkflowRunStatus || "준비중", true)
            )}>
              <span className={cn("text-xs leading-none", statusVisibilitySignalClass(note.projectStatus as WorkflowRunStatus || "준비중", true))}>
                ⏺
              </span>
              <select
                value={note.projectStatus || "준비중"}
                onChange={(e) => updateNote(note.id, { projectStatus: e.target.value as WorkflowRunStatus })}
                className="appearance-none bg-transparent outline-none cursor-pointer text-inherit"
              >
                {WORKFLOW_STATUS_OPTIONS.map(s => (
                  <option key={s} value={s} className="text-zinc-900 bg-white">{s}</option>
                ))}
              </select>
            </div>
            <span className="opacity-60">{new Date(note.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Resize Handle */}
        <div 
          onMouseDown={startResizing}
          className={cn(
            "absolute bottom-0 inset-x-0 h-1.5 cursor-ns-resize z-[100] transition-colors",
            isResizing ? "bg-black/20" : "hover:bg-black/10"
          )}
          title="높이 조절"
        />
      </div>
    </div>
  );
}

type MemoLayoutDnD = {
  dropTargetKey: string | null;
  onDragStart: (e: DragEvent, id: string) => void;
  onDragOver: (e: DragEvent, key: string) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent, targetId: string) => void;
  onDropToFolderEnd: (e: DragEvent, folderId: string) => void;
  onDragEnd: () => void;
};

export function IdeaMemosView() {
  const [ready, setReady] = useState(false);
  const [notes, setNotes] = useState<IdeaNote[]>([]);
  const [memoLayout, setMemoLayout] = useState<MemoLayoutEntry[]>([]);
  const [folderRecords, setFolderRecords] = useState<DashboardFolderRecord[]>([]);
  const [activeFolderId, setActiveFolderId] = useState("all");
  const [search, setSearch] = useState("");
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [memoDropTarget, setMemoDropTarget] = useState<string | null>(null);
  const [folderModal, setFolderModal] = useState<{
    mode: "create" | "edit";
    initial: DashboardFolderRecord | null;
    editFocus?: "name" | "icon" | "color";
  }>({ mode: "create", initial: null });
  const [ideaModal, setIdeaModal] = useState<{
    open: boolean;
    mode: IdeaModalMode;
    noteId: string | null;
  }>({ open: false, mode: "create", noteId: null });
  const [deleteTarget, setDeleteTarget] = useState<DashboardFolderRecord | null>(null);
  const [visibility, setVisibility] = useState<StatusVisibilityFilter>(DEFAULT_STATUS_VISIBILITY);
  const [compReveal, setCompReveal] = useState(false);

  const bumpNotesAndLayout = useCallback(() => {
    setNotes(loadNotes());
    setMemoLayout(loadMemoLayout());
    setPinnedIds(new Set(loadPinnedIdeaNoteIds()));
  }, []);

  const refreshFolders = useCallback(() => {
    setFolderRecords(loadMemoFolders());
  }, []);

  useEffect(() => {
    setReady(true);
    bumpNotesAndLayout();
    refreshFolders();

    const onNoteUpd = () => bumpNotesAndLayout();
    const onLayUpd = () => setMemoLayout(loadMemoLayout());
    const onPinUpd = () => setPinnedIds(new Set(loadPinnedIdeaNoteIds()));
    const onFoldUpd = () => refreshFolders();

    window.addEventListener(NOTES_UPDATED_EVENT, onNoteUpd);
    window.addEventListener(MEMO_LAYOUT_UPDATED_EVENT, onLayUpd);
    window.addEventListener(PINNED_IDEA_NOTES_UPDATED_EVENT, onPinUpd);
    window.addEventListener("aixit-memo-folders-updated", onFoldUpd);

    return () => {
      window.removeEventListener(NOTES_UPDATED_EVENT, onNoteUpd);
      window.removeEventListener(MEMO_LAYOUT_UPDATED_EVENT, onLayUpd);
      window.removeEventListener(PINNED_IDEA_NOTES_UPDATED_EVENT, onPinUpd);
      window.removeEventListener("aixit-memo-folders-updated", onFoldUpd);
    };
  }, [bumpNotesAndLayout, refreshFolders]);

  const memoDnD: MemoLayoutDnD = useMemo(() => ({
    dropTargetKey: memoDropTarget,
    onDragStart: (e, id) => {
      e.dataTransfer.setData(MEMO_ENTRY_MIME, id);
    },
    onDragOver: (e, key) => {
      e.preventDefault();
      setMemoDropTarget(key);
    },
    onDragLeave: () => setMemoDropTarget(null),
    onDrop: (e, targetId) => {
      e.preventDefault();
      setMemoDropTarget(null);
      const dragId = e.dataTransfer.getData(MEMO_ENTRY_MIME);
      if (!dragId || dragId === targetId) return;
      reorderMemoBeforeTarget(dragId, targetId);
    },
    onDropToFolderEnd: (e, folderId) => {
      e.preventDefault();
      setMemoDropTarget(null);
      const dragId = e.dataTransfer.getData(MEMO_ENTRY_MIME);
      if (!dragId) return;
      moveMemoToFolderEnd(dragId, folderId);
      bumpNotesAndLayout();
    },
    onDragEnd: () => setMemoDropTarget(null),
  }), [memoDropTarget, bumpNotesAndLayout]);

  const filteredNotes = useMemo(() => {
    let list = notes;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n => 
        n.title.toLowerCase().includes(q) || 
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q)) ||
        metadataAllSectionsSearchText(n.metadata).toLowerCase().includes(q)
      );
    }
    return list;
  }, [notes, search]);

  const { visible: exposureNotes, completed: completedNotes } = useMemo(() => {
    return partitionMemoDisplayByExposure(filteredNotes, visibility);
  }, [filteredNotes, visibility]);

  const folderSections = useMemo(() => {
    const list = activeFolderId === "all" ? folderRecords : folderRecords.filter(f => f.id === activeFolderId);
    return list.map(f => ({
      folder: f,
      notes: orderedNotesForFolder(exposureNotes, memoLayout, f.id)
    })).filter(s => s.notes.length > 0 || activeFolderId !== "all");
  }, [folderRecords, activeFolderId, exposureNotes, memoLayout]);

  const handleDeleteFolder = (strategy: "delete" | "move", targetFolderId?: string) => {
    if (!deleteTarget) return;
    if (strategy === "move" && targetFolderId) {
      reassignMemoNotesFromFolder(deleteTarget.id, targetFolderId);
    }
    removeMemoFolder(deleteTarget.id);
    setDeleteTarget(null);
    refreshFolders();
    bumpNotesAndLayout();
  };

  const newMemoFolderId = useMemo(() => {
    if (activeFolderId !== "all") return activeFolderId;
    return pickDefaultMemoFolderId(folderRecords);
  }, [activeFolderId, folderRecords]);

  if (!ready) return null;

  return (
    <AppMainColumn gray>
       <AdaptivePageHeader
        title={
          <div className="flex items-center gap-2">
            메모 보드
            <TitleCountChip count={exposureNotes.length} color="zinc" />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIdeaModal({ open: true, mode: "create", noteId: null })}
              className={cn(WORKSPACE_HEADER_ADD_MATCH_BTN, "h-9 px-4 rounded-lg font-bold shadow-sm")}
            >
              + 새 메모
            </button>
          </div>
        }
      />

      <div className="px-6 py-4 flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <DashboardExposureStatusBar
              visibility={visibility}
              onChange={setVisibility}
              compact
            />
            <div className="w-64">
              <PillSearchField
                value={search}
                onChange={setSearch}
                placeholder="제목, 내용, 태그 검색..."
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-10">
          {folderSections.map(({ folder, notes }) => (
            <div key={folder.id} className="flex flex-col gap-4">
              <FolderSectionAccordionHeader
                folder={folder}
                count={notes.length}
                isOpen={true} // For now always open in this view
                onToggle={() => {}}
                actions={
                  <FolderSectionToolbar
                    onEdit={() => setFolderModal({ mode: "edit", initial: folder })}
                    onDelete={() => setDeleteTarget(folder)}
                    onAddMemo={() => setIdeaModal({ open: true, mode: "create", noteId: null })}
                  />
                }
              />
              <div 
                className={APP_CARD_GRID_CLASS}
                onDragOver={memoDnD ? (e) => memoDnD.onDragOver(e, `folder-end:${folder.id}`) : undefined}
                onDrop={memoDnD ? (e) => memoDnD.onDropToFolderEnd(e, folder.id) : undefined}
              >
                {notes.map(note => (
                  <IdeaMemoCard
                    key={note.id}
                    note={note}
                    folder={folder}
                    pinned={pinnedIds.has(note.id)}
                    dropTargetKey={memoDropTarget}
                    memoDnD={memoDnD}
                    onOpenModal={() => setIdeaModal({ open: true, mode: "view", noteId: note.id })}
                    onTogglePin={() => togglePinnedIdeaNoteId(note.id)}
                    onEdit={() => setIdeaModal({ open: true, mode: "edit", noteId: note.id })}
                    onDelete={() => removeNote(note.id)}
                  />
                ))}
                {notes.length === 0 && (
                   <div 
                    className="flex h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 text-zinc-400 transition-colors hover:border-zinc-300 hover:bg-zinc-100/50"
                    onClick={() => setIdeaModal({ open: true, mode: "create", noteId: null })}
                  >
                    <span className="text-sm font-medium">여기에 첫 메모를 남겨보세요</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {completedNotes.length > 0 && (
            <div className="mt-4">
               <DashboardCompletedRevealSection
                isRevealed={compReveal}
                onToggle={() => setCompReveal(!compReveal)}
                count={completedNotes.length}
              >
                <div className={APP_CARD_GRID_CLASS}>
                  {completedNotes.map(note => {
                    const folder = folderRecords.find(f => f.id === note.folderId) || folderRecords[0]!;
                    return (
                      <IdeaMemoCard
                        key={note.id}
                        note={note}
                        folder={folder}
                        pinned={pinnedIds.has(note.id)}
                        dropTargetKey={null}
                        memoDnD={null}
                        dimCompleted
                        onOpenModal={() => setIdeaModal({ open: true, mode: "view", noteId: note.id })}
                        onTogglePin={() => togglePinnedIdeaNoteId(note.id)}
                        onEdit={() => setIdeaModal({ open: true, mode: "edit", noteId: note.id })}
                        onDelete={() => removeNote(note.id)}
                      />
                    );
                  })}
                </div>
              </DashboardCompletedRevealSection>
            </div>
          )}
        </div>
      </div>

      <FolderFormModal
        open={folderModal.initial != null || folderModal.mode === "create"}
        mode={folderModal.mode}
        initial={folderModal.initial}
        onClose={() => setFolderModal({ mode: "create", initial: null })}
        onConfirm={(payload) => {
          if (folderModal.mode === "edit" && folderModal.initial) {
             updateMemoFolder(folderModal.initial.id, payload);
          } else {
            addMemoFolder({
              name: payload.name,
              emoji: payload.emoji,
              iconType: payload.iconType,
              lucideIcon: payload.lucideIcon ?? null,
              imageDataUrl: payload.imageDataUrl ?? null,
              color: payload.color,
              hidden: payload.hidden,
            });
          }
          refreshFolders();
          syncMemoNotesToMemoFolders();
          bumpNotesAndLayout();
        }}
      />

      <DeleteFolderModal
        open={deleteTarget != null}
        folder={deleteTarget}
        otherFolders={folderRecords}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(strategy, targetFolderId) => {
          handleDeleteFolder(strategy, targetFolderId);
        }}
      />

      <IdeaModal
        open={ideaModal.open}
        mode={ideaModal.mode}
        noteId={ideaModal.noteId ?? undefined}
        folderIdForCreate={newMemoFolderId}
        onClose={() => setIdeaModal((m) => ({ ...m, open: false }))}
        onSaved={bumpNotesAndLayout}
        onRequestEdit={() => setIdeaModal((m) => (m.mode === "view" ? { ...m, mode: "edit" } : m))}
      />
    </>
  );
}
