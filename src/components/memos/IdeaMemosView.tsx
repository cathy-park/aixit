"use client";

import type { DragEvent } from "react";
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
import { PillSearchField } from "@/components/ui/PillSearchField";
import { cn } from "@/components/ui/cn";
import { TOOL_CARD_SHELL_CLASS } from "@/components/tools/ToolCard";
import { WORKSPACE_HEADER_ADD_MATCH_BTN } from "@/components/workspace/WorkspaceLinksMemosSections";
import { keywordTagToneClass, normalizeKeyword } from "@/lib/keyword-tag-styles";
import {
  addDashboardFolder,
  loadDashboardFolders,
  pickDefaultProjectFolderId,
  removeDashboardFolder,
  reorderDashboardFolderBefore,
  updateDashboardFolder,
  type DashboardFolderRecord,
} from "@/lib/dashboard-folders-store";
import {
  ensureLayoutMerged,
  migrateAllEntriesFromFolder,
  saveLayout,
} from "@/lib/dashboard-layout-store";
import { MEMO_ENTRY_MIME } from "@/lib/layout-card-dnd";
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
import {
  loadNotes,
  NOTES_UPDATED_EVENT,
  removeNote,
  reassignMemoNotesFromFolder,
  syncMemoNotesToDashboardFolders,
  updateNote,
  type IdeaNote,
} from "@/lib/notes-store";

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
  const metaVals = Object.values((n.metadata ?? {}) as Record<string, string>).join(" ");
  const hay = `${n.title} ${n.content} ${n.category} ${metaVals} ${folderName}`.toLowerCase();
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
  pinned,
  dropTargetKey,
  memoDnD,
  onOpenModal,
  onTogglePin,
  onEdit,
  onDelete,
}: {
  note: IdeaNote;
  pinned: boolean;
  dropTargetKey: string | null;
  memoDnD: MemoLayoutDnD | null;
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

  return (
    <div
      className={cn(
        "min-w-0 w-full max-w-xl justify-self-start",
        dnd && "cursor-grab rounded-[30px] active:cursor-grabbing",
        dnd && dropTargetKey === pinKey && "ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-50",
      )}
      draggable={Boolean(dnd)}
      onDragStart={dnd ? (e) => dnd.onDragStart(e, note.id) : undefined}
      onDragOver={dnd ? (e) => dnd.onDragOver(e, pinKey) : undefined}
      onDragLeave={dnd ? (e) => dnd.onDragLeave(e) : undefined}
      onDrop={dnd ? (e) => dnd.onDrop(e, note.id) : undefined}
      onDragEnd={dnd ? dnd.onDragEnd : undefined}
    >
      <article className={cn(TOOL_CARD_SHELL_CLASS, "relative")}>
        <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-full bg-white/90 px-0.5 py-0.5 shadow-sm ring-1 ring-zinc-200/80 backdrop-blur-sm">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full text-base leading-none hover:bg-zinc-100",
              pinned && "text-amber-500",
            )}
            aria-label={pinned ? "즐겨찾기 해제" : "즐겨찾기"}
            title="즐겨찾기"
          >
            {pinned ? "★" : "☆"}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="grid h-8 w-8 place-items-center rounded-full text-base leading-none hover:bg-zinc-100"
            aria-label="수정"
            title="수정"
          >
            ✏
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="grid h-8 w-8 place-items-center rounded-full text-base leading-none hover:bg-zinc-100"
            aria-label="삭제"
            title="삭제"
          >
            🗑
          </button>
        </div>

        <div className={grayscaleMain}>
          <button type="button" onClick={onOpenModal} className="w-full pr-24 text-left">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-lg font-bold tracking-tight text-zinc-950">
                  {note.title.trim() || "제목 없음"}
                </span>
                {converted ? (
                  <span className="inline-flex shrink-0 items-center rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold leading-tight text-zinc-600">
                    전환 완료
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 line-clamp-3 text-sm leading-snug text-zinc-500">
                {note.content?.trim() || "본문 없음"}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold ring-1", tagTone)}>
                #{note.category}
              </span>
            </div>
          </button>
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
      </article>
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

  const refreshFolders = useCallback(() => {
    setFolderRecords(loadDashboardFolders());
  }, []);

  const bumpNotesAndLayout = useCallback(() => {
    const folders = loadDashboardFolders();
    const fb = pickDefaultProjectFolderId(folders);
    const n = loadNotes();
    setNotes(n);
    setMemoLayout(ensureMemoLayoutMerged(n, fb));
  }, []);

  useEffect(() => {
    const folders = loadDashboardFolders();
    setFolderRecords(folders);
    const fb = pickDefaultProjectFolderId(folders);
    const n = loadNotes();
    setNotes(n);
    setMemoLayout(ensureMemoLayoutMerged(n, fb));
    setPinnedIds(loadPinnedIdeaNoteIds());
    setReady(true);
  }, []);

  useEffect(() => {
    const onNotes = () => bumpNotesAndLayout();
    const onMemoLayout = () => setMemoLayout(loadMemoLayout() ?? []);
    const onFolders = () => {
      refreshFolders();
      syncMemoNotesToDashboardFolders();
      bumpNotesAndLayout();
    };
    const onPinned = () => setPinnedIds(loadPinnedIdeaNoteIds());
    window.addEventListener(NOTES_UPDATED_EVENT, onNotes);
    window.addEventListener(MEMO_LAYOUT_UPDATED_EVENT, onMemoLayout);
    window.addEventListener("aixit-dashboard-folders-updated", onFolders);
    window.addEventListener(PINNED_IDEA_NOTES_UPDATED_EVENT, onPinned);
    return () => {
      window.removeEventListener(NOTES_UPDATED_EVENT, onNotes);
      window.removeEventListener(MEMO_LAYOUT_UPDATED_EVENT, onMemoLayout);
      window.removeEventListener("aixit-dashboard-folders-updated", onFolders);
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

  const hiddenProjectFolders = useMemo(() => folderRecords.filter((f) => f.hidden), [folderRecords]);

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
    return pickDefaultProjectFolderId(folderRecords);
  }, [activeFolderId, folderRecords]);

  const q = search.trim();
  const memoSectionsAll = useMemo(() => {
    return visibleFolderRecords.map((folder) => {
      const items = buildDisplayList(folder.id, folder.name, notes, memoLayout, q, pinnedIds);
      const entriesCount = notes.filter((n) => n.folderId === folder.id).length;
      return { folder, items, entriesCount };
    }).filter((x) => x.entriesCount === 0 || x.items.length > 0);
  }, [visibleFolderRecords, notes, memoLayout, q, pinnedIds]);

  const singleFolderDisplay = useMemo(() => {
    if (activeFolderId === "all") return [];
    const folder = folderRecords.find((f) => f.id === activeFolderId);
    if (!folder || folder.hidden) return [];
    return buildDisplayList(folder.id, folder.name, notes, memoLayout, q, pinnedIds);
  }, [activeFolderId, folderRecords, notes, memoLayout, q, pinnedIds]);

  const headerCount =
    activeFolderId === "all"
      ? memoSectionsAll.reduce((acc, s) => acc + s.items.length, 0)
      : singleFolderDisplay.length;

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
      updateDashboardFolder(f.id, { hidden: !f.hidden });
      refreshFolders();
    },
    [refreshFolders],
  );

  const handleDeleteFolder = useCallback(
    (strategy: "move_all" | "folder_only", targetFolderId: string) => {
      if (!deleteTarget) return;
      void strategy;
      const tid = targetFolderId;
      const prev = ensureLayoutMerged();
      const next = migrateAllEntriesFromFolder(prev, deleteTarget.id, tid);
      saveLayout(next);
      reassignMemoNotesFromFolder(deleteTarget.id, tid);
      removeDashboardFolder(deleteTarget.id);
      refreshFolders();
      bumpNotesAndLayout();
      if (activeFolderId === deleteTarget.id) setActiveFolderId("all");
      setDeleteTarget(null);
    },
    [deleteTarget, activeFolderId, refreshFolders, bumpNotesAndLayout],
  );

  const onMemoDragStart = useCallback((e: DragEvent, id: string) => {
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

  const renderMemoGrid = (items: IdeaNote[], endDropFolderId: string) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((note) => (
        <IdeaMemoCard
          key={note.id}
          note={note}
          pinned={pinnedIds.has(note.id)}
          dropTargetKey={memoDnD.dropTargetKey}
          memoDnD={memoDnD}
          onOpenModal={() => openEdit(note)}
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
        description="프로젝트와 같은 폴더로 정리하고, 카드를 끌어 순서·폴더를 바꿀 수 있어요."
        rightSlot={
          <button type="button" onClick={openCreate} className={WORKSPACE_HEADER_ADD_MATCH_BTN}>
            새 아이디어 기록
          </button>
        }
      />

      <AppMainColumn className="min-w-0 pb-20 text-sm leading-relaxed text-zinc-900">
        <div className="mb-6 space-y-4">
          <DashboardPageHeader
            allWorkflowCount={allVisibleMemoCount}
            folders={folderBarItems}
            activeFolderId={activeFolderId}
            onFolderChange={setActiveFolderId}
            onAddFolderClick={() => setFolderModal({ mode: "create", initial: null })}
            hiddenFolderRecords={hiddenProjectFolders}
            onUnhideHiddenFolder={(id) => {
              updateDashboardFolder(id, { hidden: false });
              refreshFolders();
            }}
            onDeleteHiddenFolderRequest={(f) => setDeleteTarget(f)}
            onFolderOpenEdit={(f, focus) => setFolderModal({ mode: "edit", initial: f, editFocus: focus })}
            onFolderToggleHidden={handleToggleFolderHidden}
            onFolderDeleteRequest={(f) => setDeleteTarget(f)}
            onReorderFolders={(dragId, beforeId) => {
              reorderDashboardFolderBefore(dragId, beforeId);
              refreshFolders();
            }}
          />

          <PillSearchField
            value={search}
            onChange={setSearch}
            placeholder="메모 제목·본문·카테고리·폴더 이름 검색"
            aria-label="메모 검색"
          />
        </div>

        <div className="min-w-0 pb-10">
          {activeFolderId === "all" ? (
            <div className="space-y-4">
              {memoSectionsAll.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-8 text-center text-sm text-zinc-500">
                  조건에 맞는 메모가 없어요.
                </div>
              ) : (
                memoSectionsAll.map(({ folder, items, entriesCount }) => (
                  <section key={folder.id} className="space-y-3">
                    <FolderSectionAccordionHeader
                      folder={folder}
                      count={items.length}
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
                      ) : items.length === 0 ? (
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
                          검색 조건에 맞는 메모가 없어요.
                        </div>
                      ) : (
                        renderMemoGrid(items, folder.id)
                      )
                    ) : null}
                  </section>
                ))
              )}
            </div>
          ) : (
            foldersToRender.map((folder, folderIdx) => (
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
                    </span>
                  </div>
                  {memoSectionToolbar(folder)}
                </div>

                {singleFolderDisplay.length === 0 ? (
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
                    {notes.filter((n) => n.folderId === folder.id).length === 0
                      ? "이 폴더에 메모가 없어요. 새 아이디어를 기록하거나 다른 폴더에서 카드를 끌어다 놓아 보세요."
                      : "조건에 맞는 메모가 없어요."}
                  </div>
                ) : (
                  renderMemoGrid(singleFolderDisplay, folder.id)
                )}
              </div>
            ))
          )}
        </div>
      </AppMainColumn>

      <FolderFormModal
        open={folderModal != null}
        mode={folderModal?.mode ?? "create"}
        initial={folderModal?.initial ?? null}
        highlightSection={folderModal?.editFocus ?? null}
        onClose={() => setFolderModal(null)}
        onSave={(payload) => {
          if (payload.id) {
            const { id, ...rest } = payload;
            updateDashboardFolder(id, rest);
          } else {
            addDashboardFolder({
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
          syncMemoNotesToDashboardFolders();
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
      />
    </>
  );
}
