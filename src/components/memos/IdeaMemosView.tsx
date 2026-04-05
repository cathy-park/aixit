"use client";

import type { DragEvent, MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
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

function partitionPinned(list: IdeaNote[], pinned: Set<string>): IdeaNote[] {
  const pin = list.filter((n) => pinned.has(n.id));
  const rest = list.filter((n) => !pinned.has(n.id));
  return [...pin, ...rest];
}

function noteMatchesSearch(n: IdeaNote, q: string, folderName: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const meta = (n.metadata ?? {}) as Record<string, unknown>;
  const sectionHay = metadataAllSectionsSearchText(meta);
  const tagHay = (n.tags ?? []).join(" ");
  const hay = `${n.title} ${n.content} ${n.category} ${tagHay} ${sectionHay} ${folderName}`.toLowerCase();
  return hay.includes(t);
}

function buildDisplayList(
  folderId: string,
  folderName: string,
  notes: IdeaNote[],
  layout: MemoLayoutEntry[],
  q: string,
  pinned: Set<string>,
): IdeaNote[] {
  const ordered = partitionPinned(orderedNotesForFolder(notes, layout, folderId), pinned);
  return ordered.filter((n) => noteMatchesSearch(n, q, folderName));
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
  /** 완료 가상 그룹(프로젝트 카드와 동일 톤) */
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
  const tagTone = keywordTagToneClass(normalizeKeyword(note.category));
  const dnd = memoDnD;

  const stopCardNav = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className={cn(
        APP_CARD_GRID_ITEM_CLASS,
        dnd && "cursor-grab rounded-[30px] active:cursor-grabbing",
        dnd && dropTargetKey === pinKey && "ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-50",
        dimCompleted && "opacity-[0.78]",
      )}
      draggable={Boolean(dnd)}
      onDragStart={dnd ? (e) => dnd.onDragStart(e, note.id) : undefined}
      onDragOver={dnd ? (e) => dnd.onDragOver(e, pinKey) : undefined}
      onDragLeave={dnd ? (e) => dnd.onDragLeave(e) : undefined}
      onDrop={dnd ? (e) => dnd.onDrop(e, note.id) : undefined}
      onDragEnd={dnd ? dnd.onDragEnd : undefined}
    >
      <div className={APP_CARD_SHELL_DASHBOARD_CLASS}>
        <div className="flex min-w-0 flex-1 flex-col overflow-visible rounded-lg">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className={cn(APP_CARD_TITLE_TRACK_CLASS, grayscaleMain)}>
                <FolderGlyph folder={folder} size="md" className="shrink-0" accentColor={folder.color} />
                <button
                  type="button"
                  onClick={onOpenModal}
                  className="min-w-0 flex-1 overflow-hidden rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-zinc-200"
                >
                  <span className={APP_CARD_TITLE_TEXT_CLASS}>{note.title.trim() || "제목 없음"}</span>
                </button>
                <div className="flex shrink-0 items-center self-center">
                  <EditableLifecycleStatusControl
                    status={note.projectStatus ?? "waiting"}
                    editable={!converted}
                    ariaLabelEntity="아이디어"
                    onChange={(next) => updateNote(note.id, { projectStatus: next })}
                  />
                </div>
                {converted ? (
                  <span className="inline-flex shrink-0 items-center rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold leading-tight text-zinc-600">
                    전환 완료
                  </span>
                ) : null}
              </div>

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
                className="mt-0 block min-w-0 cursor-pointer rounded-2xl text-left outline-none focus-visible:ring-4 focus-visible:ring-zinc-100"
                aria-label="메모 상세 열기"
              >
                <div className={grayscaleMain}>
                  {note.content?.trim() ? (
                    <div className="mt-2 text-sm font-medium leading-snug text-zinc-500">
                      <MemoMarkupBody
                        text={note.content}
                        interactiveCheckboxes={!converted}
                        onTextChange={
                          converted ? undefined : (next) => updateNote(note.id, { content: next })
                        }
                      />
                    </div>
                  ) : null}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold ring-1", tagTone)}>
                      #{note.category}
                    </span>
                    {(note.tags ?? []).map((tag) => (
                      <span
                        key={`${note.id}:${tag}`}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-bold ring-1",
                          keywordTagToneClass(normalizeKeyword(tag)),
                        )}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <CardActionsOverflow
              className="items-start gap-0"
              menuAriaLabel="메모 작업"
              desktopLeading={
                <button
                  type="button"
                  draggable={false}
                  onClick={(e) => {
                    stopCardNav(e);
                    onTogglePin();
                  }}
                  className={cn(
                    actionIconButtonClass,
                    "h-8 w-8",
                    pinned && "text-amber-500 hover:bg-amber-50 hover:text-amber-600",
                  )}
                  aria-pressed={Boolean(pinned)}
                  title={pinned ? "상단 고정 해제" : "상단 고정"}
                >
                  <IconStarPin active={Boolean(pinned)} />
                </button>
              }
              mobileLeading={
                <button
                  type="button"
                  draggable={false}
                  onClick={(e) => {
                    stopCardNav(e);
                    onTogglePin();
                  }}
                  className={cn(
                    actionIconButtonClass,
                    "h-8 w-8",
                    pinned && "text-amber-500 hover:bg-amber-50 hover:text-amber-600",
                  )}
                  aria-pressed={Boolean(pinned)}
                  title={pinned ? "상단 고정 해제" : "상단 고정"}
                >
                  <IconStarPin active={Boolean(pinned)} />
                </button>
              }
            >
              <button
                type="button"
                draggable={false}
                title="수정"
                aria-label="메모 편집"
                onClick={(e) => {
                  stopCardNav(e);
                  onEdit();
                }}
                className={cn(actionIconButtonClass, "h-8 w-8")}
              >
                <IconEdit />
              </button>
              <button
                type="button"
                draggable={false}
                title="삭제"
                aria-label="메모 삭제"
                onClick={(e) => {
                  stopCardNav(e);
                  onDelete();
                }}
                className={cn(actionIconButtonClass, "h-8 w-8")}
              >
                <IconTrash />
              </button>
            </CardActionsOverflow>
          </div>

          {converted && note.convertedProjectId ? (
            <div className="mt-6 border-t border-zinc-100 pt-5">
              <Link
                href={`/workspace?id=${encodeURIComponent(note.convertedProjectId)}`}
                className={cn(WORKSPACE_HEADER_ADD_MATCH_BTN, "inline-flex w-full justify-center no-underline sm:w-auto")}
              >
                워크스페이스 열기
              </Link>
            </div>
          ) : null}
        </div>
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
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DashboardFolderRecord | null>(null);
  const [ideaModal, setIdeaModal] = useState<{
    open: boolean;
    mode: IdeaModalMode;
    noteId: string | null;
  }>({ open: false, mode: "create", noteId: null });
  const [sectionExpanded, setSectionExpanded] = useState<Record<string, boolean>>({});
  const [statusVisibility, setStatusVisibility] = useState<StatusVisibilityFilter>(() => ({
    ...DEFAULT_STATUS_VISIBILITY,
    완료: false,
  }));
  const [includeCompletedInAllView, setIncludeCompletedInAllView] = useState(false);
  const [completedExpandedByFolder, setCompletedExpandedByFolder] = useState<Record<string, boolean>>({});

  const refreshFolders = useCallback(() => {
    setFolderRecords(loadMemoFolders());
  }, []);

  const bumpNotesAndLayout = useCallback(() => {
    const folders = loadMemoFolders();
    const fb = pickDefaultMemoFolderId(folders);
    const n = loadNotes();
    setNotes(n);
    setMemoLayout(ensureMemoLayoutMerged(n, fb));
  }, []);

  useEffect(() => {
    const folders = loadMemoFolders();
    setFolderRecords(folders);
    const fb = pickDefaultMemoFolderId(folders);
    const n = loadNotes();
    setNotes(n);
    setMemoLayout(ensureMemoLayoutMerged(n, fb));
    setPinnedIds(loadPinnedIdeaNoteIds());
    setReady(true);
  }, []);

  useEffect(() => {
    const onNotes = () => bumpNotesAndLayout();
    const onMemoLayout = () => setMemoLayout(loadMemoLayout() ?? []);
    const onMemoFolders = () => {
      refreshFolders();
      syncMemoNotesToMemoFolders();
      bumpNotesAndLayout();
    };
    const onPinned = () => setPinnedIds(loadPinnedIdeaNoteIds());
    window.addEventListener(NOTES_UPDATED_EVENT, onNotes);
    window.addEventListener(MEMO_LAYOUT_UPDATED_EVENT, onMemoLayout);
    window.addEventListener("aixit-memo-folders-updated", onMemoFolders);
    window.addEventListener(PINNED_IDEA_NOTES_UPDATED_EVENT, onPinned);
    return () => {
      window.removeEventListener(NOTES_UPDATED_EVENT, onNotes);
      window.removeEventListener(MEMO_LAYOUT_UPDATED_EVENT, onMemoLayout);
      window.removeEventListener("aixit-memo-folders-updated", onMemoFolders);
      window.removeEventListener(PINNED_IDEA_NOTES_UPDATED_EVENT, onPinned);
    };
  }, [bumpNotesAndLayout, refreshFolders]);

  useEffect(() => {
    if (activeFolderId === "all") return;
    const f = folderRecords.find((x) => x.id === activeFolderId);
    if (f?.hidden) setActiveFolderId("all");
  }, [activeFolderId, folderRecords]);

  const hiddenFolderIds = useMemo(
    () => new Set(folderRecords.filter((f) => f.hidden).map((f) => f.id)),
    [folderRecords],
  );

  const visibleFolderRecords = useMemo(() => folderRecords.filter((f) => !f.hidden), [folderRecords]);

  const hiddenMemoFolders = useMemo(() => folderRecords.filter((f) => f.hidden), [folderRecords]);

  const allVisibleMemoCount = useMemo(
    () => notes.filter((n) => !hiddenFolderIds.has(n.folderId)).length,
    [notes, hiddenFolderIds],
  );

  const folderBarItems: FolderBarItem[] = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of folderRecords) counts[f.id] = 0;
    for (const n of notes) {
      if (hiddenFolderIds.has(n.folderId)) continue;
      counts[n.folderId] = (counts[n.folderId] ?? 0) + 1;
    }
    return visibleFolderRecords.map((f) => ({ ...f, workflowCount: counts[f.id] ?? 0 }));
  }, [notes, folderRecords, visibleFolderRecords, hiddenFolderIds]);

  const newMemoFolderId = useMemo(() => {
    if (activeFolderId !== "all") {
      const f = folderRecords.find((x) => x.id === activeFolderId);
      if (f && !f.hidden) return activeFolderId;
    }
    return pickDefaultMemoFolderId(folderRecords);
  }, [activeFolderId, folderRecords]);

  const q = search.trim();
  const memoSectionsAll = useMemo(() => {
    return visibleFolderRecords.map((folder) => {
      const displayList = buildDisplayList(folder.id, folder.name, notes, memoLayout, q, pinnedIds);
      const { mainItems, completedItems } = partitionMemoDisplayByExposure(displayList, statusVisibility);
      const entriesCount = notes.filter((n) => n.folderId === folder.id).length;
      return { folder, mainItems, completedItems, entriesCount };
    }).filter((x) => x.entriesCount === 0 || x.mainItems.length > 0 || x.completedItems.length > 0);
  }, [visibleFolderRecords, notes, memoLayout, q, pinnedIds, statusVisibility]);

  const singleFolderPartition = useMemo(() => {
    if (activeFolderId === "all") {
      return { mainItems: [] as IdeaNote[], completedItems: [] as IdeaNote[], entriesCount: 0 };
    }
    const folder = folderRecords.find((f) => f.id === activeFolderId);
    if (!folder || folder.hidden) {
      return { mainItems: [] as IdeaNote[], completedItems: [] as IdeaNote[], entriesCount: 0 };
    }
    const displayList = buildDisplayList(folder.id, folder.name, notes, memoLayout, q, pinnedIds);
    const { mainItems, completedItems } = partitionMemoDisplayByExposure(displayList, statusVisibility);
    const entriesCount = notes.filter((n) => n.folderId === folder.id).length;
    return { mainItems, completedItems, entriesCount };
  }, [activeFolderId, folderRecords, notes, memoLayout, q, pinnedIds, statusVisibility]);

  const flatAllMemosAny = useMemo(
    () => memoSectionsAll.reduce((acc, s) => acc + s.mainItems.length + s.completedItems.length, 0),
    [memoSectionsAll],
  );

  const flatAllNonCompletedMemos = useMemo(
    () => memoSectionsAll.reduce((acc, s) => acc + s.mainItems.length, 0),
    [memoSectionsAll],
  );

  const headerCount =
    activeFolderId === "all" ? flatAllNonCompletedMemos : singleFolderPartition.mainItems.length;

  const isSectionExpanded = useCallback(
    (id: string) => sectionExpanded[id] !== false,
    [sectionExpanded],
  );

  const toggleSection = useCallback((id: string) => {
    setSectionExpanded((prev) => {
      const open = prev[id] !== false;
      return { ...prev, [id]: open ? false : true };
    });
  }, []);

  const handleToggleFolderHidden = useCallback(
    (f: DashboardFolderRecord) => {
      updateMemoFolder(f.id, { hidden: !f.hidden });
      refreshFolders();
    },
    [refreshFolders],
  );

  const handleDeleteFolder = useCallback(
    (strategy: "move_all" | "folder_only", targetFolderId: string) => {
      if (!deleteTarget) return;
      void strategy;
      const tid = targetFolderId;
      reassignMemoNotesFromFolder(deleteTarget.id, tid);
      removeMemoFolder(deleteTarget.id);
      refreshFolders();
      bumpNotesAndLayout();
      if (activeFolderId === deleteTarget.id) setActiveFolderId("all");
      setDeleteTarget(null);
    },
    [deleteTarget, activeFolderId, refreshFolders, bumpNotesAndLayout],
  );

  const onMemoDragStart = useCallback((e: DragEvent, id: string) => {
    if (cancelNativeCardLayoutDragIfInteractive(e)) return;
    e.dataTransfer.setData(MEMO_ENTRY_MIME, JSON.stringify({ id }));
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onMemoDragOver = useCallback((e: DragEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setMemoDropTarget(key);
  }, []);

  const onMemoDragLeave = useCallback((e: DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as HTMLElement).contains(related)) return;
    setMemoDropTarget(null);
  }, []);

  const onMemoDrop = useCallback((e: DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setMemoDropTarget(null);
    const raw = e.dataTransfer.getData(MEMO_ENTRY_MIME);
    if (!raw) return;
    let draggedId: string;
    try {
      draggedId = (JSON.parse(raw) as { id: string }).id;
    } catch {
      return;
    }
    if (draggedId === targetId) return;
    const list = loadNotes();
    const draggedNote = list.find((n) => n.id === draggedId);
    const targetNote = list.find((n) => n.id === targetId);
    if (!draggedNote || !targetNote) return;

    let layout = loadMemoLayout() ?? [];
    if (draggedNote.folderId !== targetNote.folderId) {
      layout = moveMemoBeforeTargetInFolder(layout, draggedId, { id: targetId, folderId: targetNote.folderId });
      saveMemoLayout(layout);
      updateNote(draggedId, { folderId: targetNote.folderId });
    } else {
      layout = reorderMemoBeforeTarget(layout, draggedId, targetId);
      saveMemoLayout(layout);
    }
    setMemoLayout(layout);
    setNotes(loadNotes());
  }, []);

  const onMemoDropToFolderEnd = useCallback((e: DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setMemoDropTarget(null);
    const raw = e.dataTransfer.getData(MEMO_ENTRY_MIME);
    if (!raw) return;
    let draggedId: string;
    try {
      draggedId = (JSON.parse(raw) as { id: string }).id;
    } catch {
      return;
    }
    const list = loadNotes();
    const d = list.find((x) => x.id === draggedId);
    if (!d) return;
    let layout = loadMemoLayout() ?? [];
    layout = moveMemoToFolderEnd(layout, draggedId, folderId);
    saveMemoLayout(layout);
    if (d.folderId !== folderId) updateNote(draggedId, { folderId });
    setMemoLayout(layout);
    setNotes(loadNotes());
  }, []);

  const onMemoDragEnd = useCallback(() => setMemoDropTarget(null), []);

  const memoDnD: MemoLayoutDnD = useMemo(
    () => ({
      dropTargetKey: memoDropTarget,
      onDragStart: onMemoDragStart,
      onDragOver: onMemoDragOver,
      onDragLeave: onMemoDragLeave,
      onDrop: onMemoDrop,
      onDropToFolderEnd: onMemoDropToFolderEnd,
      onDragEnd: onMemoDragEnd,
    }),
    [
      memoDropTarget,
      onMemoDragStart,
      onMemoDragOver,
      onMemoDragLeave,
      onMemoDrop,
      onMemoDropToFolderEnd,
      onMemoDragEnd,
    ],
  );

  const openCreate = () => setIdeaModal({ open: true, mode: "create", noteId: null });

  const openView = (note: IdeaNote) => setIdeaModal({ open: true, mode: "view", noteId: note.id });
  const openEdit = (note: IdeaNote) => setIdeaModal({ open: true, mode: "edit", noteId: note.id });

  const togglePin = (id: string) => {
    togglePinnedIdeaNoteId(id);
    setPinnedIds(loadPinnedIdeaNoteIds());
  };

  const deleteNote = (note: IdeaNote) => {
    if (typeof window !== "undefined" && !window.confirm("이 메모를 삭제할까요?")) return;
    removeNote(note.id);
    bumpNotesAndLayout();
  };

  const memoSectionToolbar = (folder: DashboardFolderRecord) => (
    <FolderSectionToolbar
      entityLabel="folder"
      folder={folder}
      onOpenEdit={(focus) => setFolderModal({ mode: "edit", initial: folder, editFocus: focus })}
      onToggleHidden={() => handleToggleFolderHidden(folder)}
      onDelete={() => setDeleteTarget(folder)}
    />
  );

  const renderMemoGrid = (
    items: IdeaNote[],
    sectionFolder: DashboardFolderRecord,
    endDropFolderId: string,
    dimCompleted?: boolean,
  ) => (
    <div className={APP_CARD_GRID_CLASS}>
      {items.map((note) => (
        <IdeaMemoCard
          key={note.id}
          note={note}
          folder={sectionFolder}
          pinned={pinnedIds.has(note.id)}
          dropTargetKey={memoDnD.dropTargetKey}
          memoDnD={memoDnD}
          dimCompleted={dimCompleted}
          onOpenModal={() => openView(note)}
          onTogglePin={() => togglePin(note.id)}
          onEdit={() => openEdit(note)}
          onDelete={() => deleteNote(note)}
        />
      ))}
      <div
        className={cn(
          "col-span-full h-12 w-full rounded-2xl",
          memoDnD.dropTargetKey === `__end__:${endDropFolderId}` &&
            "ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-50",
        )}
        onDragOver={(e) => memoDnD.onDragOver(e, `__end__:${endDropFolderId}`)}
        onDragLeave={memoDnD.onDragLeave}
        onDrop={(e) => memoDnD.onDropToFolderEnd(e, endDropFolderId)}
      />
    </div>
  );

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-50 text-sm text-zinc-600">불러오는 중…</div>
    );
  }

  const foldersToRender =
    activeFolderId === "all" ? visibleFolderRecords : folderRecords.filter((f) => f.id === activeFolderId);

  return (
    <>
      <AdaptivePageHeader
        title="메모"
        count={headerCount}
        description="메모 전용 폴더로 정리하고, 노출 상태에 맞춰 목록을 볼 수 있어요. (프로젝트 폴더와 데이터는 분리됩니다.)"
        hideOnMobile
        rightSlot={
          <button type="button" onClick={openCreate} className={WORKSPACE_HEADER_ADD_MATCH_BTN}>
            추가
          </button>
        }
      />

      <AppMainColumn className="min-w-0 pb-24 text-sm leading-relaxed text-zinc-900">
        <div className="mb-6 space-y-4">
          <DashboardPageHeader
            allWorkflowCount={allVisibleMemoCount}
            folders={folderBarItems}
            activeFolderId={activeFolderId}
            onFolderChange={setActiveFolderId}
            onAddFolderClick={() => setFolderModal({ mode: "create", initial: null })}
            hiddenFolderRecords={hiddenMemoFolders}
            onUnhideHiddenFolder={(id) => {
              updateMemoFolder(id, { hidden: false });
              refreshFolders();
            }}
            onDeleteHiddenFolderRequest={(f) => setDeleteTarget(f)}
            onFolderOpenEdit={(f, focus) => setFolderModal({ mode: "edit", initial: f, editFocus: focus })}
            onFolderToggleHidden={handleToggleFolderHidden}
            onFolderDeleteRequest={(f) => setDeleteTarget(f)}
            onReorderFolders={(dragId, beforeId) => {
              reorderMemoFolderBefore(dragId, beforeId);
              refreshFolders();
            }}
          />

          <PillSearchField
            value={search}
            onChange={setSearch}
            placeholder="메모 제목·본문·카테고리·폴더 이름 검색"
            aria-label="메모 검색"
          />

          <DashboardExposureStatusBar
            statusVisibility={statusVisibility}
            setStatusVisibility={setStatusVisibility}
            showIncludeCompletedToggle={activeFolderId === "all"}
            includeCompletedInAllView={includeCompletedInAllView}
            setIncludeCompletedInAllView={setIncludeCompletedInAllView}
            entityLabel="메모"
          />
        </div>

        <div className="min-w-0 pb-10">
          {activeFolderId === "all" ? (
            <div className="space-y-4">
              {flatAllMemosAny === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-8 text-center text-sm text-zinc-500">
                  조건에 맞는 메모가 없어요.
                </div>
              ) : (
                memoSectionsAll.map(({ folder, mainItems, completedItems, entriesCount }) => (
                  <section key={folder.id} className="space-y-3">
                    <FolderSectionAccordionHeader
                      folder={folder}
                      count={mainItems.length}
                      showHiddenBadge={folder.hidden}
                      expanded={isSectionExpanded(folder.id)}
                      onToggle={() => toggleSection(folder.id)}
                      actions={memoSectionToolbar(folder)}
                    />
                    {isSectionExpanded(folder.id) ? (
                      entriesCount === 0 ? (
                        <div
                          className={cn(
                            "rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-8 text-center text-sm text-zinc-500",
                            memoDnD.dropTargetKey === `__end__:${folder.id}` &&
                              "ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-50",
                          )}
                          onDragOver={(e) => memoDnD.onDragOver(e, `__end__:${folder.id}`)}
                          onDragLeave={memoDnD.onDragLeave}
                          onDrop={(e) => memoDnD.onDropToFolderEnd(e, folder.id)}
                        >
                          이 폴더에 메모가 없어요. 다른 폴더에서 카드를 끌어다 놓으면 이쪽으로 옮겨집니다.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {(() => {
                            const explicit = completedExpandedByFolder[folder.id];
                            const expanded = explicit ?? includeCompletedInAllView;
                            const open = expanded ?? false;
                            const onlyCompletedCollapsed =
                              mainItems.length === 0 && completedItems.length > 0 && !open;
                            return onlyCompletedCollapsed ? (
                              <div
                                className={cn(
                                  "rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-8 text-center text-sm text-zinc-500",
                                  memoDnD.dropTargetKey === `__end__:${folder.id}` &&
                                    "ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-50",
                                )}
                                onDragOver={(e) => memoDnD.onDragOver(e, `__end__:${folder.id}`)}
                                onDragLeave={memoDnD.onDragLeave}
                                onDrop={(e) => memoDnD.onDropToFolderEnd(e, folder.id)}
                              >
                                지금 노출 설정으로 이 폴더에 바로 보이는 메모가 없어요. 완료 항목은 아래「완료 보기」에서 펼치거나, 다른
                                폴더에서 카드를 끌어다 놓을 수 있어요.
                              </div>
                            ) : null;
                          })()}
                          {mainItems.length > 0 ? renderMemoGrid(mainItems, folder, folder.id) : null}
                          {completedItems.length > 0 ? (
                            (() => {
                              const explicit = completedExpandedByFolder[folder.id];
                              const expanded = explicit ?? includeCompletedInAllView;
                              const open = expanded ?? false;
                              return (
                                <DashboardCompletedRevealSection
                                  count={completedItems.length}
                                  expanded={open}
                                  onToggle={() => {
                                    setCompletedExpandedByFolder((prev) => ({
                                      ...prev,
                                      [folder.id]: !open,
                                    }));
                                  }}
                                >
                                  {renderMemoGrid(completedItems, folder, folder.id, true)}
                                </DashboardCompletedRevealSection>
                              );
                            })()
                          ) : null}
                          {mainItems.length === 0 && completedItems.length === 0 ? (
                            <div
                              className={cn(
                                "rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-8 text-center text-sm text-zinc-500",
                                memoDnD.dropTargetKey === `__end__:${folder.id}` &&
                                  "ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-50",
                              )}
                              onDragOver={(e) => memoDnD.onDragOver(e, `__end__:${folder.id}`)}
                              onDragLeave={memoDnD.onDragLeave}
                              onDrop={(e) => memoDnD.onDropToFolderEnd(e, folder.id)}
                            >
                              선택한 조건에 맞는 메모가 없어요. 필터를 바꿔 보거나, 다른 폴더에서 카드를 끌어다 놓으면 이쪽으로 옮겨집니다.
                            </div>
                          ) : null}
                        </div>
                      )
                    ) : null}
                  </section>
                ))
              )}
            </div>
          ) : (
            foldersToRender.map((folder, folderIdx) => {
              const { mainItems, completedItems, entriesCount } = singleFolderPartition;
              const explicit = completedExpandedByFolder[folder.id];
              const completedOpen = explicit ?? false;
              const onlyCompletedCollapsed =
                mainItems.length === 0 && completedItems.length > 0 && !completedOpen;

              return (
                <div key={folder.id} className={cn("space-y-4 rounded-2xl", folderIdx > 0 && "mt-4")}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3 py-1.5 pl-1">
                      <FolderGlyph folder={folder} size="md" accentColor={folder.color} />
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-base font-bold text-zinc-950">{folder.name}</span>
                        {folder.hidden ? (
                          <span className="shrink-0 rounded-full bg-zinc-200/80 px-2 py-0.5 text-[11px] font-bold text-zinc-600">
                            숨김
                          </span>
                        ) : null}
                        <TitleCountChip count={mainItems.length} />
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">{memoSectionToolbar(folder)}</div>
                  </div>

                  <div className="space-y-4">
                    {entriesCount === 0 ? (
                      <div
                        className={cn(
                          "rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-8 text-center text-sm text-zinc-500",
                          memoDnD.dropTargetKey === `__end__:${folder.id}` &&
                            "ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-50",
                        )}
                        onDragOver={(e) => memoDnD.onDragOver(e, `__end__:${folder.id}`)}
                        onDragLeave={memoDnD.onDragLeave}
                        onDrop={(e) => memoDnD.onDropToFolderEnd(e, folder.id)}
                      >
                        이 폴더에 메모가 없어요. 다른 폴더에서 카드를 끌어다 놓으면 이쪽으로 옮겨집니다.
                      </div>
                    ) : (
                      <>
                        {onlyCompletedCollapsed ? (
                          <div
                            className={cn(
                              "rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-8 text-center text-sm text-zinc-500",
                              memoDnD.dropTargetKey === `__end__:${folder.id}` &&
                                "ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-50",
                            )}
                            onDragOver={(e) => memoDnD.onDragOver(e, `__end__:${folder.id}`)}
                            onDragLeave={memoDnD.onDragLeave}
                            onDrop={(e) => memoDnD.onDropToFolderEnd(e, folder.id)}
                          >
                            지금 노출 설정으로 이 폴더에 바로 보이는 메모가 없어요. 완료 항목은 아래「완료 보기」에서 펼치거나, 다른
                            폴더에서 카드를 끌어다 놓을 수 있어요.
                          </div>
                        ) : null}
                        {mainItems.length > 0 ? renderMemoGrid(mainItems, folder, folder.id) : null}

                        {mainItems.length === 0 && completedItems.length === 0 ? (
                          <div
                            className={cn(
                              "rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-8 text-center text-sm text-zinc-500",
                              memoDnD.dropTargetKey === `__end__:${folder.id}` &&
                                "ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-50",
                            )}
                            onDragOver={(e) => memoDnD.onDragOver(e, `__end__:${folder.id}`)}
                            onDragLeave={memoDnD.onDragLeave}
                            onDrop={(e) => memoDnD.onDropToFolderEnd(e, folder.id)}
                          >
                            선택한 조건에 맞는 메모가 없어요. 필터를 바꿔 보거나, 다른 폴더에서 카드를 끌어다 놓으면 이쪽으로 옮겨집니다.
                          </div>
                        ) : null}

                        {completedItems.length > 0 ? (
                          <DashboardCompletedRevealSection
                            count={completedItems.length}
                            expanded={completedOpen}
                            onToggle={() => {
                              setCompletedExpandedByFolder((prev) => ({
                                ...prev,
                                [folder.id]: !completedOpen,
                              }));
                            }}
                          >
                            {renderMemoGrid(completedItems, folder, folder.id, true)}
                          </DashboardCompletedRevealSection>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </AppMainColumn>
      <FloatingAddButton onClick={() => openCreate()} label="추가" />

      <FolderFormModal
        open={folderModal != null}
        mode={folderModal?.mode ?? "create"}
        initial={folderModal?.initial ?? null}
        highlightSection={folderModal?.editFocus ?? null}
        onClose={() => setFolderModal(null)}
        onSave={(payload) => {
          if (payload.id) {
            const { id, ...rest } = payload;
            updateMemoFolder(id, rest);
            syncMemoNoteCategoriesForMemoFolder(id);
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
        noteId={ideaModal.noteId}
        folderIdForCreate={newMemoFolderId}
        onClose={() => setIdeaModal((m) => ({ ...m, open: false }))}
        onSaved={bumpNotesAndLayout}
        onRequestEdit={() => setIdeaModal((m) => (m.mode === "view" ? { ...m, mode: "edit" } : m))}
      />
    </>
  );
}
