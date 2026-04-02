"use client";

import type { DragEvent } from "react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DeleteFolderModal } from "@/components/dashboard/DeleteFolderModal";
import { FolderFormModal } from "@/components/dashboard/FolderFormModal";
import { FolderGlyph } from "@/components/dashboard/FolderGlyph";
import { FolderSectionAccordionHeader } from "@/components/dashboard/FolderSectionAccordionHeader";
import { FolderSectionToolbar } from "@/components/dashboard/FolderSectionToolbar";
import { AdaptivePageHeader } from "@/components/layout/AdaptivePageHeader";
import { AppMainColumn } from "@/components/layout/AppMainColumn";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { ProjectAddMenu } from "@/components/dashboard/ProjectAddMenu";
import { SaveAsTemplateModal } from "@/components/dashboard/SaveAsTemplateModal";
import { WorkflowCard } from "@/components/dashboard/WorkflowCard";
import { PillSearchField } from "@/components/ui/PillSearchField";
import { TitleCountChip } from "@/components/ui/TitleCountChip";
import { workflows, type WorkflowPreview } from "@/lib/aixit-data";
import {
  collectFilteredWorkflowItems,
  DEFAULT_STATUS_VISIBILITY,
  STATUS_ORDER,
  type StatusVisibilityFilter,
} from "@/lib/dashboard-workflow-filters";
import { dashboardWorkflowToPreview } from "@/lib/dashboard-workflow-preview";
import {
  addDashboardFolder,
  loadDashboardFolders,
  pickDefaultProjectFolderId,
  removeDashboardFolder,
  reorderDashboardFolderBefore,
  updateDashboardFolder,
  type DashboardFolderRecord,
} from "@/lib/dashboard-folders-store";
import type { LayoutEntry } from "@/lib/dashboard-layout-store";
import {
  ensureLayoutMerged,
  insertLayoutEntryAfter,
  migrateAllEntriesFromFolder,
  moveEntryToFolderEnd,
  moveEntryBeforeTargetInFolder,
  remapLayoutUnknownFolders,
  removeLayoutEntry,
  reorderBeforeTarget,
  saveLayout,
} from "@/lib/dashboard-layout-store";
import { LAYOUT_ENTRY_MIME } from "@/lib/layout-card-dnd";
import {
  layoutEntryPinKey,
  loadPinnedWorkflowKeys,
  removePinnedWorkflowKey,
  togglePinnedWorkflowKey,
} from "@/lib/pinned-workflows-store";
import type { WorkflowRunStatus } from "@/lib/workflow-run-status";
import { statusSectionSignalClass } from "@/lib/workflow-run-status";
import {
  duplicateDashboardWorkflowAsUser,
  ensureDashboardWorkflow,
  removeDashboardWorkflow,
  setDashboardWorkflowFolder,
} from "@/lib/workflows-store";
import { cn } from "@/components/ui/cn";

const FOLDER_INITIAL = 6;
const FOLDER_CHUNK = 6;

function statusVisibilityPillClass(status: WorkflowRunStatus, on: boolean) {
  if (!on) return "bg-zinc-100 text-zinc-400 ring-zinc-200";
  switch (status) {
    case "진행중":
      return "bg-sky-50 text-sky-800 ring-sky-200";
    case "보류":
      return "bg-orange-50 text-orange-800 ring-orange-200";
    case "중단":
      return "bg-rose-50 text-rose-800 ring-rose-200";
    case "준비중":
      return "bg-zinc-100 text-zinc-800 ring-zinc-200";
    case "완료":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    default:
      return "bg-zinc-100 text-zinc-800 ring-zinc-200";
  }
}

type FlatWf = {
  folder: DashboardFolderRecord;
  entry: LayoutEntry;
  preview: WorkflowPreview;
};

function buildGridNodes(
  items: FlatWf[],
  opts: {
    gridClass: string;
    showFolderBadge: boolean;
    pinnedKeys: Set<string>;
    /** 완료 카드들은 opacity를 약간 낮춰 "가상 완료 그룹"임을 표현 */
    dimCompleted?: boolean;
    /** 그리드 빈 공간(끝) 드롭 시 이동할 폴더 */
    endDropFolderId?: string;
    onTogglePin: (entry: LayoutEntry) => void;
    onCopy: (entry: LayoutEntry) => void;
    onSaveAsTemplate?: (entry: LayoutEntry) => void;
    onDelete: (entry: LayoutEntry) => void;
    layoutDnD?: {
      dropTargetKey: string | null;
      onDragStart: (e: DragEvent, entry: LayoutEntry) => void;
      onDragOver: (e: DragEvent, pinKey: string) => void;
      onDragLeave: (e: DragEvent) => void;
      onDrop: (e: DragEvent, targetEntry: LayoutEntry) => void;
      onDropToFolderEnd: (e: DragEvent, folderId: string) => void;
      onDragEnd: () => void;
    };
  },
) {
  const dnd = opts.layoutDnD;
  const endDropKey = dnd && opts.endDropFolderId ? `__end__:${opts.endDropFolderId}` : null;
  return (
    <div className={cn("grid gap-4", opts.gridClass)}>
      {items.map(({ folder, entry, preview }) => {
        const pinKey = layoutEntryPinKey(entry.kind, entry.id);
        return (
          <div
            key={pinKey}
            className={cn(
              "min-w-0 w-full max-w-xl justify-self-start",
              dnd && "cursor-grab rounded-[30px] active:cursor-grabbing",
              dnd && dnd.dropTargetKey === pinKey && "ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-50",
              opts.dimCompleted && preview.status === "완료" && "opacity-[0.78]",
            )}
            draggable={Boolean(dnd)}
            onDragStart={dnd ? (e) => dnd.onDragStart(e, entry) : undefined}
            onDragOver={dnd ? (e) => dnd.onDragOver(e, pinKey) : undefined}
            onDragLeave={dnd ? (e) => dnd.onDragLeave(e) : undefined}
            onDrop={dnd ? (e) => dnd.onDrop(e, entry) : undefined}
            onDragEnd={dnd ? dnd.onDragEnd : undefined}
          >
            {opts.showFolderBadge ? (
              <div className="mb-1 text-[11px] font-semibold text-zinc-400">{folder.name}</div>
            ) : null}
            <WorkflowCard
              wf={preview}
              folder={folder}
              pinned={opts.pinnedKeys.has(pinKey)}
              onTogglePin={() => opts.onTogglePin(entry)}
              onCopy={() => opts.onCopy(entry)}
              onSaveAsTemplate={opts.onSaveAsTemplate ? () => opts.onSaveAsTemplate!(entry) : undefined}
              onDelete={() => opts.onDelete(entry)}
            />
          </div>
        );
      })}
      {dnd && opts.endDropFolderId ? (
        <div
          className={cn(
            "col-span-full h-12 w-full rounded-2xl",
            endDropKey && dnd.dropTargetKey === endDropKey && "ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-50",
          )}
          onDragOver={(e) => dnd.onDragOver(e, endDropKey!)}
          onDragLeave={dnd.onDragLeave}
          onDrop={(e) => dnd.onDropToFolderEnd(e, opts.endDropFolderId!)}
        />
      ) : null}
    </div>
  );
}

export function DashboardExperience() {
  const router = useRouter();
  const [layout, setLayout] = useState<LayoutEntry[]>([]);
  const [folderRecords, setFolderRecords] = useState<DashboardFolderRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState("all");
  const [pinnedKeys, setPinnedKeys] = useState<Set<string>>(new Set());
  const [folderModal, setFolderModal] = useState<{
    mode: "create" | "edit";
    initial: DashboardFolderRecord | null;
    editFocus?: "name" | "icon" | "color";
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DashboardFolderRecord | null>(null);
  // 메인 프로젝트 리스트는 "완료"를 제외하고,
  // "완료"는 폴더 내부의 가상 그룹(기본 collapsed)으로만 보여줍니다.
  const [statusVisibility, setStatusVisibility] = useState<StatusVisibilityFilter>(() => ({
    ...DEFAULT_STATUS_VISIBILITY,
    완료: false,
  }));
  /** 전체(all) 보기에서 완료 카드를 펼쳐서 보여줄지 */
  const [includeCompletedInAllView, setIncludeCompletedInAllView] = useState(false);
  /** 폴더별 "완료 보기" 접힘/펼침(사용자 액션으로 명시된 값만 저장) */
  const [completedExpandedByFolder, setCompletedExpandedByFolder] = useState<Record<string, boolean>>({});
  const [workflowSearch, setWorkflowSearch] = useState("");
  const [folderVisible, setFolderVisible] = useState(FOLDER_INITIAL);
  /** 전체 보기: 폴더별 카드 영역 접기/펼치기 — 새로고침 시 전부 펼침 */
  const [sectionExpanded, setSectionExpanded] = useState<Record<string, boolean>>({});
  const [layoutDropTarget, setLayoutDropTarget] = useState<string | null>(null);
  const [saveTemplateEntry, setSaveTemplateEntry] = useState<LayoutEntry | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const refreshFolders = useCallback(() => {
    setFolderRecords(loadDashboardFolders());
  }, []);

  useEffect(() => {
    const folders = loadDashboardFolders();
    const validIds = folders.map((f) => f.id);
    const fallback = validIds.includes("ddokdi") ? "ddokdi" : validIds[0] ?? "ddokdi";
    let lay = ensureLayoutMerged();
    lay = remapLayoutUnknownFolders(lay, validIds, fallback);
    saveLayout(lay);
    setLayout(lay);
    setFolderRecords(folders);
    setPinnedKeys(loadPinnedWorkflowKeys());
    setReady(true);
  }, []);

  useEffect(() => {
    const onFoldersUpdated = () => refreshFolders();
    window.addEventListener("aixit-dashboard-folders-updated", onFoldersUpdated);
    return () => window.removeEventListener("aixit-dashboard-folders-updated", onFoldersUpdated);
  }, [refreshFolders]);

  const resolvePreview = useCallback((entry: LayoutEntry) => {
    const u = ensureDashboardWorkflow(entry.id, entry.folderId);
    if (!u) return null;
    const templateEmoji = u.templateId ? workflows.find((w) => w.id === u.templateId)?.emoji : undefined;
    return dashboardWorkflowToPreview(u, { folderId: entry.folderId, builtinEmoji: templateEmoji ?? u.emoji });
  }, []);

  const togglePin = useCallback((entry: LayoutEntry) => {
    setPinnedKeys(togglePinnedWorkflowKey(layoutEntryPinKey(entry.kind, entry.id)));
  }, []);

  const hiddenProjectFolders = useMemo(() => folderRecords.filter((f) => f.hidden), [folderRecords]);

  const visibleFolderRecords = useMemo(() => folderRecords.filter((f) => !f.hidden), [folderRecords]);

  const allVisibleWorkflowCount = useMemo(() => {
    const hiddenIds = new Set(folderRecords.filter((f) => f.hidden).map((f) => f.id));
    return layout.filter((e) => !hiddenIds.has(e.folderId)).length;
  }, [layout, folderRecords]);

  const folderBarItems = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of folderRecords) counts[f.id] = 0;
    for (const e of layout) {
      counts[e.folderId] = (counts[e.folderId] ?? 0) + 1;
    }
    return visibleFolderRecords.map((f) => ({ ...f, workflowCount: counts[f.id] ?? 0 }));
  }, [layout, folderRecords, visibleFolderRecords]);

  const newProjectTargetFolderId = useMemo(() => {
    if (activeFolderId !== "all") {
      const f = folderRecords.find((x) => x.id === activeFolderId);
      if (f && !f.hidden) return activeFolderId;
    }
    return pickDefaultProjectFolderId(folderRecords);
  }, [activeFolderId, folderRecords]);

  useEffect(() => {
    if (activeFolderId === "all") return;
    const f = folderRecords.find((x) => x.id === activeFolderId);
    if (f?.hidden) setActiveFolderId("all");
  }, [activeFolderId, folderRecords]);

  const foldersToRender =
    activeFolderId === "all" ? visibleFolderRecords : folderRecords.filter((f) => f.id === activeFolderId);

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

  const projectSectionsAll = useMemo(() => {
    const q = workflowSearch.trim();
    const completedOnlyVisibility: StatusVisibilityFilter = {
      진행중: false,
      준비중: false,
      보류: false,
      완료: true,
      중단: false,
    };
    return folderRecords
      .filter((folder) => !folder.hidden)
      .map((folder) => {
        const entries = layout.filter((e) => e.folderId === folder.id);
        const nonCompletedItems = collectFilteredWorkflowItems(folder, entries, statusVisibility, pinnedKeys, resolvePreview, q).map(
          (item) => ({ folder, ...item }),
        );
        const completedItems = collectFilteredWorkflowItems(
          folder,
          entries,
          completedOnlyVisibility,
          pinnedKeys,
          resolvePreview,
          q,
        ).map((item) => ({ folder, ...item }));

        return { folder, nonCompletedItems, completedItems, entriesCount: entries.length };
      })
      // "빈 폴더"는 전체에서 항상 섹션만이라도 보여주되, 필터/검색으로 인해 실제 프로젝트가 있는 폴더는 제외합니다.
      .filter((x) => x.entriesCount === 0 || x.nonCompletedItems.length > 0 || x.completedItems.length > 0);
  }, [folderRecords, layout, statusVisibility, pinnedKeys, resolvePreview, workflowSearch]);

  const flatAllNonCompletedWorkflows = useMemo(() => {
    const out: FlatWf[] = [];
    const q = workflowSearch.trim();
    for (const folder of folderRecords) {
      if (folder.hidden) continue;
      const entries = layout.filter((e) => e.folderId === folder.id);
      const items = collectFilteredWorkflowItems(folder, entries, statusVisibility, pinnedKeys, resolvePreview, q);
      for (const item of items) {
        out.push({ folder, ...item });
      }
    }
    return out;
  }, [folderRecords, layout, statusVisibility, pinnedKeys, resolvePreview, workflowSearch]);

  const flatAllCompletedWorkflows = useMemo(() => {
    const out: FlatWf[] = [];
    const q = workflowSearch.trim();
    const completedOnlyVisibility: StatusVisibilityFilter = {
      진행중: false,
      준비중: false,
      보류: false,
      완료: true,
      중단: false,
    };
    for (const folder of folderRecords) {
      if (folder.hidden) continue;
      const entries = layout.filter((e) => e.folderId === folder.id);
      const items = collectFilteredWorkflowItems(folder, entries, completedOnlyVisibility, pinnedKeys, resolvePreview, q);
      for (const item of items) {
        out.push({ folder, ...item });
      }
    }
    return out;
  }, [folderRecords, layout, pinnedKeys, resolvePreview, workflowSearch]);

  const flatAllWorkflowsAny = useMemo(() => {
    // 전체 보기에서 "빈 결과"는 완료 그룹 헤더까지 포함한 존재 여부 기준입니다.
    return [...flatAllNonCompletedWorkflows, ...flatAllCompletedWorkflows];
  }, [flatAllNonCompletedWorkflows, flatAllCompletedWorkflows]);

  const flatSingleFolder = useMemo(() => {
    if (activeFolderId === "all") return [];
    const folder = folderRecords.find((f) => f.id === activeFolderId);
    if (!folder) return [];
    const entries = layout.filter((e) => e.folderId === folder.id);
    return collectFilteredWorkflowItems(
      folder,
      entries,
      statusVisibility,
      pinnedKeys,
      resolvePreview,
      workflowSearch.trim(),
    ).map((item) => ({ folder, ...item }));
  }, [activeFolderId, folderRecords, layout, statusVisibility, pinnedKeys, resolvePreview, workflowSearch]);

  const flatSingleFolderCompleted = useMemo(() => {
    if (activeFolderId === "all") return [];
    const folder = folderRecords.find((f) => f.id === activeFolderId);
    if (!folder) return [];
    const entries = layout.filter((e) => e.folderId === folder.id);
    const completedOnlyVisibility: StatusVisibilityFilter = {
      진행중: false,
      준비중: false,
      보류: false,
      완료: true,
      중단: false,
    };
    return collectFilteredWorkflowItems(folder, entries, completedOnlyVisibility, pinnedKeys, resolvePreview, workflowSearch.trim()).map(
      (item) => ({ folder, ...item }),
    );
  }, [activeFolderId, folderRecords, layout, pinnedKeys, resolvePreview, workflowSearch]);

  useEffect(() => {
    setFolderVisible(FOLDER_INITIAL);
  }, [activeFolderId, workflowSearch, statusVisibility]);

  const folderShown = flatSingleFolder.slice(0, folderVisible);

  useEffect(() => {
    if (activeFolderId === "all") return;
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setFolderVisible((v) => Math.min(v + FOLDER_CHUNK, flatSingleFolder.length));
        }
      },
      { root: null, rootMargin: "100px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [activeFolderId, flatSingleFolder.length, folderVisible]);

  const handleDeleteWorkflow = useCallback((entry: LayoutEntry) => {
    if (typeof window !== "undefined" && !window.confirm("이 프로젝트를 삭제할까요?")) return;
    removePinnedWorkflowKey(layoutEntryPinKey(entry.kind, entry.id));
    setPinnedKeys(loadPinnedWorkflowKeys());
    removeDashboardWorkflow(entry.id);
    setLayout((prev) => {
      const next = removeLayoutEntry(prev, entry.kind, entry.id);
      saveLayout(next);
      return next;
    });
  }, []);

  const handleCopyWorkflow = useCallback(
    (entry: LayoutEntry) => {
      const copy = duplicateDashboardWorkflowAsUser(entry.id, entry.folderId);
      if (!copy) return;
      setLayout((prev) => {
        const next = insertLayoutEntryAfter(prev, entry, {
          kind: "user",
          id: copy.id,
          folderId: entry.folderId,
        });
        saveLayout(next);
        return next;
      });
      router.push(`/workspace?id=${encodeURIComponent(copy.id)}`);
    },
    [router],
  );

  const handleToggleFolderHidden = useCallback((f: DashboardFolderRecord) => {
    updateDashboardFolder(f.id, { hidden: !f.hidden });
    refreshFolders();
  }, [refreshFolders]);

  const handleProjectLayoutRefresh = useCallback(() => {
    const folders = loadDashboardFolders();
    const validIds = folders.map((f) => f.id);
    const fallback = validIds.includes("ddokdi") ? "ddokdi" : validIds[0] ?? "ddokdi";
    let lay = ensureLayoutMerged();
    lay = remapLayoutUnknownFolders(lay, validIds, fallback);
    saveLayout(lay);
    setLayout(lay);
    setFolderRecords(folders);
  }, []);

  const handleDeleteFolder = (strategy: "move_all" | "folder_only", targetFolderId: string) => {
    if (!deleteTarget) return;
    const tid = targetFolderId;
    setLayout((prev) => {
      const next = migrateAllEntriesFromFolder(prev, deleteTarget.id, tid);
      saveLayout(next);
      return next;
    });
    removeDashboardFolder(deleteTarget.id);
    refreshFolders();
    if (activeFolderId === deleteTarget.id) setActiveFolderId("all");
    setDeleteTarget(null);
  };

  const layoutDnD = useMemo(
    () => ({
      dropTargetKey: layoutDropTarget,
      onDragStart: (e: DragEvent, entry: LayoutEntry) => {
        e.dataTransfer.setData(LAYOUT_ENTRY_MIME, JSON.stringify({ kind: entry.kind, id: entry.id }));
        e.dataTransfer.effectAllowed = "move";
      },
      onDragOver: (e: DragEvent, pinKey: string) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        setLayoutDropTarget(pinKey);
      },
      onDragLeave: (e: DragEvent) => {
        const related = e.relatedTarget as Node | null;
        if (related && e.currentTarget.contains(related)) return;
        setLayoutDropTarget(null);
      },
      onDrop: (e: DragEvent, targetEntry: LayoutEntry) => {
        e.preventDefault();
        e.stopPropagation();
        setLayoutDropTarget(null);
        const raw = e.dataTransfer.getData(LAYOUT_ENTRY_MIME);
        if (!raw) return;
        let dragged: { kind: LayoutEntry["kind"]; id: string };
        try {
          dragged = JSON.parse(raw) as { kind: LayoutEntry["kind"]; id: string };
        } catch {
          return;
        }
        if (dragged.kind === targetEntry.kind && dragged.id === targetEntry.id) return;

        setLayout((prev) => {
          const d = prev.find((x) => x.kind === dragged.kind && x.id === dragged.id);
          const t = prev.find((x) => x.kind === targetEntry.kind && x.id === targetEntry.id);
          if (!d || !t) return prev;

          let next: LayoutEntry[];
          if (d.folderId === t.folderId) {
            next = reorderBeforeTarget(prev, { kind: d.kind, id: d.id }, { kind: t.kind, id: t.id });
          } else {
            next = moveEntryBeforeTargetInFolder(prev, d.kind, d.id, t);
            setDashboardWorkflowFolder(d.id, t.folderId);
          }
          saveLayout(next);
          return next;
        });
      },
      onDropToFolderEnd: (e: DragEvent, folderId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setLayoutDropTarget(null);
        const raw = e.dataTransfer.getData(LAYOUT_ENTRY_MIME);
        if (!raw) return;
        let dragged: { kind: LayoutEntry["kind"]; id: string };
        try {
          dragged = JSON.parse(raw) as { kind: LayoutEntry["kind"]; id: string };
        } catch {
          return;
        }

        setLayout((prev) => {
          const d = prev.find((x) => x.kind === dragged.kind && x.id === dragged.id);
          if (!d) return prev;
          const next = moveEntryToFolderEnd(prev, d.kind, d.id, folderId);
          if (d.folderId !== folderId) {
            setDashboardWorkflowFolder(d.id, folderId);
          }
          saveLayout(next);
          return next;
        });
      },
      onDragEnd: () => setLayoutDropTarget(null),
    }),
    [layoutDropTarget],
  );

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-50 text-sm text-zinc-600">불러오는 중…</div>
    );
  }

  const gridOpts = {
    pinnedKeys,
    onTogglePin: togglePin,
    onCopy: handleCopyWorkflow,
    onSaveAsTemplate: (entry: LayoutEntry) => setSaveTemplateEntry(entry),
    onDelete: handleDeleteWorkflow,
    layoutDnD,
  };

  const projectSectionToolbar = (folder: DashboardFolderRecord) => (
    <FolderSectionToolbar
      entityLabel="folder"
      folder={folder}
      onOpenEdit={(focus) => setFolderModal({ mode: "edit", initial: folder, editFocus: focus })}
      onToggleHidden={() => handleToggleFolderHidden(folder)}
      onDelete={() => setDeleteTarget(folder)}
    />
  );

  return (
    <>
      <AdaptivePageHeader
        title="프로젝트"
        count={activeFolderId === "all" ? flatAllNonCompletedWorkflows.length : flatSingleFolder.length}
        description="폴더로 묶어 정리하고, 노출 상태에 맞춰 오늘 끝낼 작업을 관리하세요."
        rightSlot={
          <ProjectAddMenu targetFolderId={newProjectTargetFolderId} onLayoutChange={handleProjectLayoutRefresh} />
        }
      />

      <AppMainColumn className="min-w-0">
      <div className="mb-6 space-y-4">
        <DashboardPageHeader
          allWorkflowCount={allVisibleWorkflowCount}
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
          }}
        />

        <PillSearchField
          value={workflowSearch}
          onChange={setWorkflowSearch}
          placeholder="프로젝트 이름, 설명, 상태, 폴더 검색"
          aria-label="프로젝트 검색"
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="w-full text-xs font-semibold text-zinc-500 sm:mr-1 sm:w-auto">노출 상태</span>
          {STATUS_ORDER.map((s) => (
            // 완료는 가상 그룹으로 분리되므로 메인 노출 상태에서 제외
            s === "완료" ? null : (
            <button
              key={s}
              type="button"
              onClick={() => setStatusVisibility((p) => ({ ...p, [s]: !p[s] }))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition hover:opacity-90",
                statusVisibilityPillClass(s, statusVisibility[s]),
              )}
              aria-pressed={statusVisibility[s]}
            >
              <span className={cn("text-sm leading-none", statusSectionSignalClass(s))} aria-hidden>
                ⏺
              </span>
              {s}
            </button>
            )
          ))}
          {activeFolderId === "all" ? (
            <button
              type="button"
              onClick={() => setIncludeCompletedInAllView((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition hover:opacity-90",
                includeCompletedInAllView
                  ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                  : "bg-zinc-100 text-zinc-400 ring-zinc-200",
              )}
              aria-pressed={includeCompletedInAllView}
              title="완료 프로젝트를 기본 접힘 상태에서 펼쳐서 보여요"
            >
              <span className="text-sm leading-none" aria-hidden>
                ✓
              </span>
              완료 포함 보기
            </button>
          ) : null}
          <span className="w-full text-[11px] text-zinc-400 sm:ml-2 sm:w-auto">켜진 상태의 프로젝트만 메인 리스트에 보여요.</span>
        </div>
      </div>

      <div className="min-w-0 pb-10">
        {activeFolderId === "all" ? (
          <div className="space-y-4">
            {flatAllWorkflowsAny.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-8 text-center text-sm text-zinc-500">
                조건에 맞는 프로젝트가 없어요.
              </div>
            ) : (
              projectSectionsAll.map(({ folder, nonCompletedItems, completedItems, entriesCount }) => (
                <section key={folder.id} className="space-y-3">
                  <FolderSectionAccordionHeader
                    folder={folder}
                    count={nonCompletedItems.length}
                    showHiddenBadge={folder.hidden}
                    expanded={isSectionExpanded(folder.id)}
                    onToggle={() => toggleSection(folder.id)}
                    actions={projectSectionToolbar(folder)}
                  />
                  {isSectionExpanded(folder.id)
                    ? entriesCount === 0 ? (
                        <div
                          className={cn(
                            "rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-6 text-sm text-zinc-500",
                            layoutDnD.dropTargetKey === `__end__:${folder.id}` &&
                              "ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-50",
                          )}
                          onDragOver={(e) => layoutDnD.onDragOver(e, `__end__:${folder.id}`)}
                          onDragLeave={layoutDnD.onDragLeave}
                          onDrop={(e) => layoutDnD.onDropToFolderEnd(e, folder.id)}
                        >
                          이 폴더에 프로젝트가 없어요.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {nonCompletedItems.length > 0 ? (
                            buildGridNodes(nonCompletedItems, {
                              ...gridOpts,
                              gridClass: "grid-cols-1 sm:grid-cols-2",
                              showFolderBadge: false,
                              endDropFolderId: folder.id,
                            })
                          ) : null}

                          {completedItems.length > 0 ? (
                            <div className="space-y-3">
                              {(() => {
                                const explicit = completedExpandedByFolder[folder.id];
                                const expanded = explicit ?? includeCompletedInAllView;
                                return (
                                  <>
                                    <div className="mt-2 border-t border-zinc-200/50 pt-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCompletedExpandedByFolder((prev) => ({
                                            ...prev,
                                            [folder.id]: !(expanded ?? false),
                                          }));
                                        }}
                                        className="flex w-full items-center justify-between gap-2 rounded-md px-0.5 py-1 text-left text-xs text-zinc-500 transition hover:bg-zinc-100/50 hover:text-zinc-700"
                                        aria-expanded={expanded}
                                      >
                                        <span className="min-w-0 truncate">
                                          완료 보기{" "}
                                          <span className="tabular-nums text-zinc-500">{completedItems.length}</span>개
                                        </span>
                                        <svg
                                          width={14}
                                          height={14}
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          className={cn(
                                            "shrink-0 text-slate-500 transition-transform duration-200 ease-out",
                                            !expanded && "rotate-180",
                                          )}
                                          aria-hidden
                                        >
                                          <path
                                            d="M18 15l-6-6-6 6"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </svg>
                                      </button>
                                    </div>

                                    {expanded ? (
                                      <div className="mt-0.5">
                                        {buildGridNodes(completedItems, {
                                          ...gridOpts,
                                          gridClass: "grid-cols-1 sm:grid-cols-2",
                                          showFolderBadge: false,
                                          dimCompleted: true,
                                          endDropFolderId: folder.id,
                                        })}
                                      </div>
                                    ) : null}
                                  </>
                                );
                              })()}
                            </div>
                          ) : null}

                          {nonCompletedItems.length === 0 && completedItems.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-6 text-sm text-zinc-500">
                              선택한 조건에 맞는 프로젝트가 없어요. 필터를 바꿔 보세요.
                            </div>
                          ) : null}
                        </div>
                      )
                    : null}
                </section>
              ))
            )}
          </div>
        ) : (
          foldersToRender.map((folder, folderIdx) => {
            const entries = layout.filter((e) => e.folderId === folder.id);

            return (
              <div key={folder.id} className={cn("space-y-4 rounded-2xl", folderIdx > 0 && "mt-4")}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3 py-1.5 pl-1">
                    <FolderGlyph folder={folder} size="md" accentColor={folder.color} />
                    <span className="truncate text-base font-bold text-zinc-950">{folder.name}</span>
                    {folder.hidden ? (
                      <span className="shrink-0 rounded-full bg-zinc-200/80 px-2 py-0.5 text-[11px] font-bold text-zinc-600">
                        숨김
                      </span>
                    ) : null}
                    <TitleCountChip count={flatSingleFolder.length} />
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">{projectSectionToolbar(folder)}</div>
                </div>

                <div className="space-y-4">
                  {entries.length === 0 ? (
                    <div
                      className={cn(
                        "rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-6 text-sm text-zinc-500",
                        layoutDnD.dropTargetKey === `__end__:${folder.id}` &&
                          "ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-50",
                      )}
                      onDragOver={(e) => layoutDnD.onDragOver(e, `__end__:${folder.id}`)}
                      onDragLeave={layoutDnD.onDragLeave}
                      onDrop={(e) => layoutDnD.onDropToFolderEnd(e, folder.id)}
                    >
                      이 폴더에 프로젝트가 없어요.
                    </div>
                  ) : (
                    <>
                      {flatSingleFolder.length > 0 ? (
                        <Fragment>
                          {buildGridNodes(folderShown, {
                            ...gridOpts,
                            gridClass: "grid-cols-1 xl:grid-cols-3",
                            showFolderBadge: false,
                            endDropFolderId: folder.id,
                          })}
                          {folderVisible < flatSingleFolder.length ? (
                            <div ref={loadMoreRef} className="h-12 w-full shrink-0" aria-hidden />
                          ) : null}
                        </Fragment>
                      ) : null}

                      {flatSingleFolder.length === 0 && flatSingleFolderCompleted.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-6 text-sm text-zinc-500">
                          선택한 조건에 맞는 프로젝트가 없어요. 필터를 바꿔 보세요.
                        </div>
                      ) : null}

                      {flatSingleFolderCompleted.length > 0 ? (
                        <div className="space-y-3">
                          {(() => {
                            const explicit = completedExpandedByFolder[folder.id];
                            const expanded = explicit ?? false;
                            return (
                              <>
                                <div className="mt-2 border-t border-zinc-200/50 pt-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCompletedExpandedByFolder((prev) => ({
                                        ...prev,
                                        [folder.id]: !expanded,
                                      }));
                                    }}
                                    className="flex w-full items-center justify-between gap-2 rounded-md px-0.5 py-1 text-left text-xs text-zinc-500 transition hover:bg-zinc-100/50 hover:text-zinc-700"
                                    aria-expanded={expanded}
                                  >
                                    <span className="min-w-0 truncate">
                                      완료 보기{" "}
                                      <span className="tabular-nums text-zinc-500">{flatSingleFolderCompleted.length}</span>개
                                    </span>
                                    <svg
                                      width={14}
                                      height={14}
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      className={cn(
                                        "shrink-0 text-slate-500 transition-transform duration-200 ease-out",
                                        !expanded && "rotate-180",
                                      )}
                                      aria-hidden
                                    >
                                      <path
                                        d="M18 15l-6-6-6 6"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </button>
                                </div>

                                {expanded ? (
                                  <div className="mt-0.5">
                                    {buildGridNodes(flatSingleFolderCompleted, {
                                      ...gridOpts,
                                      gridClass: "grid-cols-1 xl:grid-cols-3",
                                      showFolderBadge: false,
                                      dimCompleted: true,
                                      endDropFolderId: folder.id,
                                    })}
                                  </div>
                                ) : null}
                              </>
                            );
                          })()}
                        </div>
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
        }}
      />

      <SaveAsTemplateModal
        open={saveTemplateEntry != null}
        workflowId={saveTemplateEntry?.kind === "user" ? saveTemplateEntry.id : null}
        layoutFolderId={saveTemplateEntry?.folderId ?? pickDefaultProjectFolderId(folderRecords)}
        onClose={() => setSaveTemplateEntry(null)}
      />

      <DeleteFolderModal
        open={deleteTarget != null}
        folder={deleteTarget}
        otherFolders={folderRecords}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(strategy, targetFolderId) => {
          void strategy;
          handleDeleteFolder(strategy, targetFolderId);
        }}
      />
    </>
  );
}
