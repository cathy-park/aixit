"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DragEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listWorkflowTemplates, type WorkflowTemplateListItem } from "@/lib/aixit-data";
import { appendUserLayoutEntry } from "@/lib/dashboard-layout-store";
import { loadDashboardFolders, pickDefaultProjectFolderId } from "@/lib/dashboard-folders-store";
import {
  loadPinnedWorkflowKeys,
  removePinnedWorkflowKey,
  togglePinnedWorkflowKey,
} from "@/lib/pinned-workflows-store";
import {
  addRemovedWorkflowTemplateId,
  loadRemovedWorkflowTemplateIds,
  REMOVED_WORKFLOW_TEMPLATES_EVENT,
} from "@/lib/user-removed-workflow-templates-store";
import { TEMPLATE_CARD_MIME } from "@/lib/layout-card-dnd";
import {
  mergeTemplateOrderWithCatalog,
  moveTemplateIdAfter,
  moveTemplateIdBefore,
  moveTemplateIdToGlobalEnd,
  TEMPLATE_LIBRARY_ORDER_EVENT,
} from "@/lib/template-display-order-store";
import {
  createProjectFromUserTemplate,
  isUserWorkflowTemplateId,
  listUserWorkflowTemplateListItems,
  updateUserWorkflowTemplateCategory,
  USER_WORKFLOW_TEMPLATES_EVENT,
} from "@/lib/user-workflow-templates-store";
import {
  getWorkflowTemplateCategoryOverride,
  setWorkflowTemplateCategoryOverride,
  TEMPLATE_CATEGORY_OVERRIDE_EVENT,
} from "@/lib/workflow-template-category-override-store";
import { createProjectFromTemplate } from "@/lib/workflows-store";
import { WorkflowTemplateCard } from "@/components/workflows/WorkflowTemplateCard";
import { AdaptivePageHeader } from "@/components/layout/AdaptivePageHeader";
import { AppMainColumn } from "@/components/layout/AppMainColumn";
import { TitleCountChip } from "@/components/ui/TitleCountChip";
import { PillSearchField } from "@/components/ui/PillSearchField";
import { DashboardFolderBar } from "@/components/dashboard/DashboardFolderBar";
import { FolderFormModal } from "@/components/dashboard/FolderFormModal";
import { FolderGlyph } from "@/components/dashboard/FolderGlyph";
import { FolderSectionAccordionHeader } from "@/components/dashboard/FolderSectionAccordionHeader";
import { FolderSectionToolbar } from "@/components/dashboard/FolderSectionToolbar";
import { HiddenFoldersManageSection } from "@/components/dashboard/HiddenFoldersManageSection";
import { cn } from "@/components/ui/cn";
import {
  addWorkflowTemplateFolder,
  getWorkflowTemplateCategoryLabelStatic,
  loadWorkflowTemplateFolders,
  removeWorkflowTemplateFolder,
  reorderWorkflowTemplateFolderBefore,
  updateWorkflowTemplateFolder,
  type WorkflowTemplateFolderRecord,
} from "@/lib/workflow-template-folders-store";

const WF_MISC_SECTION_ID = "__wf_misc__";

const miscCategoryFolder: WorkflowTemplateFolderRecord = {
  id: WF_MISC_SECTION_ID,
  name: "기타",
  emoji: "📎",
  iconType: "emoji",
  color: "#94a3b8",
};

function sortTemplatesByPinAndOrder(
  items: WorkflowTemplateListItem[],
  pinned: Set<string>,
  order: string[],
): WorkflowTemplateListItem[] {
  const rank = (id: string) => {
    const i = order.indexOf(id);
    return i < 0 ? 99999 : i;
  };
  return [...items].sort((a, b) => {
    const pa = pinned.has(`tpl:${a.templateId}`);
    const pb = pinned.has(`tpl:${b.templateId}`);
    if (pa !== pb) return pa ? -1 : 1;
    const ra = rank(a.templateId);
    const rb = rank(b.templateId);
    if (ra !== rb) return ra - rb;
    return a.title.localeCompare(b.title, "ko");
  });
}

export function WorkflowsLibraryView() {
  const router = useRouter();
  const [pinnedKeys, setPinnedKeys] = useState<Set<string>>(() => new Set());
  const [templateFolders, setTemplateFolders] = useState<WorkflowTemplateFolderRecord[]>([]);
  const [activeFolderId, setActiveFolderId] = useState("all");
  const [q, setQ] = useState("");
  const [folderModal, setFolderModal] = useState<{
    mode: "create" | "edit";
    initial: WorkflowTemplateFolderRecord | null;
    editFocus?: "name" | "icon" | "color";
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowTemplateFolderRecord | null>(null);
  const [projectFolderModal, setProjectFolderModal] = useState<{ templateId: string; folderId: string } | null>(null);
  /** 아코디언 접기/펼치기만 — 새로고침 시 초기화(전부 펼침) */
  const [sectionExpanded, setSectionExpanded] = useState<Record<string, boolean>>({});
  const [removedTemplateIds, setRemovedTemplateIds] = useState<Set<string>>(() =>
    typeof window !== "undefined" ? loadRemovedWorkflowTemplateIds() : new Set(),
  );
  const [templateOrderTick, setTemplateOrderTick] = useState(0);
  const [userTemplateTick, setUserTemplateTick] = useState(0);
  const [categoryOverrideTick, setCategoryOverrideTick] = useState(0);
  const [templateDropTarget, setTemplateDropTarget] = useState<string | null>(null);

  const refreshRemovedTemplates = useCallback(() => {
    setRemovedTemplateIds(loadRemovedWorkflowTemplateIds());
  }, []);

  useEffect(() => {
    refreshRemovedTemplates();
    const onRm = () => refreshRemovedTemplates();
    window.addEventListener(REMOVED_WORKFLOW_TEMPLATES_EVENT, onRm);
    return () => window.removeEventListener(REMOVED_WORKFLOW_TEMPLATES_EVENT, onRm);
  }, [refreshRemovedTemplates]);

  const refreshTemplateFolders = useCallback(() => {
    setTemplateFolders(loadWorkflowTemplateFolders());
  }, []);

  useEffect(() => {
    refreshTemplateFolders();
    const onUpdate = () => refreshTemplateFolders();
    window.addEventListener("aixit-workflow-template-folders-updated", onUpdate);
    return () => window.removeEventListener("aixit-workflow-template-folders-updated", onUpdate);
  }, [refreshTemplateFolders]);

  useEffect(() => {
    setPinnedKeys(loadPinnedWorkflowKeys());
  }, []);

  useEffect(() => {
    const onOrd = () => setTemplateOrderTick((x) => x + 1);
    window.addEventListener(TEMPLATE_LIBRARY_ORDER_EVENT, onOrd);
    return () => window.removeEventListener(TEMPLATE_LIBRARY_ORDER_EVENT, onOrd);
  }, []);

  useEffect(() => {
    const onUserTpl = () => setUserTemplateTick((x) => x + 1);
    window.addEventListener(USER_WORKFLOW_TEMPLATES_EVENT, onUserTpl);
    return () => window.removeEventListener(USER_WORKFLOW_TEMPLATES_EVENT, onUserTpl);
  }, []);

  useEffect(() => {
    const onCat = () => setCategoryOverrideTick((x) => x + 1);
    window.addEventListener(TEMPLATE_CATEGORY_OVERRIDE_EVENT, onCat);
    return () => window.removeEventListener(TEMPLATE_CATEGORY_OVERRIDE_EVENT, onCat);
  }, []);

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

  const hiddenTemplateFolders = useMemo(() => templateFolders.filter((f) => f.hidden), [templateFolders]);

  const visibleTemplateFolders = useMemo(() => templateFolders.filter((f) => !f.hidden), [templateFolders]);

  const templates = useMemo(() => {
    void userTemplateTick;
    void categoryOverrideTick;
    const labelById = Object.fromEntries(templateFolders.map((f) => [f.id, f.name]));
    const userItems = listUserWorkflowTemplateListItems()
      .filter((t) => !removedTemplateIds.has(t.templateId))
      .map((t) => ({
        ...t,
        categoryLabel: labelById[t.categoryId] ?? getWorkflowTemplateCategoryLabelStatic(t.categoryId),
      }));
    const builtin = listWorkflowTemplates()
      .filter((t) => !removedTemplateIds.has(t.templateId))
      .map((t) => {
        const categoryId = getWorkflowTemplateCategoryOverride(t.templateId) ?? t.categoryId;
        return {
          ...t,
          categoryId,
          categoryLabel: labelById[categoryId] ?? getWorkflowTemplateCategoryLabelStatic(categoryId),
        };
      });
    return [...userItems, ...builtin];
  }, [templateFolders, removedTemplateIds, userTemplateTick, categoryOverrideTick]);

  const templateCatalogIds = useMemo(() => templates.map((t) => t.templateId), [templates]);

  const templateDnD = useMemo(
    () => ({
      dropTargetKey: templateDropTarget,
      onDragStart: (e: DragEvent, templateId: string) => {
        e.dataTransfer.setData(TEMPLATE_CARD_MIME, templateId);
        e.dataTransfer.setData("text/plain", templateId);
        e.dataTransfer.effectAllowed = "move";
      },
      onDragOver: (e: DragEvent, key: string) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        setTemplateDropTarget(key);
      },
      onDragLeave: (e: DragEvent) => {
        const related = e.relatedTarget as Node | null;
        if (related && e.currentTarget.contains(related)) return;
        setTemplateDropTarget(null);
      },
      onDragEnd: () => setTemplateDropTarget(null),
    }),
    [templateDropTarget],
  );

  const templateDisplayOrder = useMemo(
    () => mergeTemplateOrderWithCatalog(templateCatalogIds),
    [templateCatalogIds, templateOrderTick],
  );

  const templateCountByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of templates) {
      m[t.categoryId] = (m[t.categoryId] ?? 0) + 1;
    }
    return m;
  }, [templates]);

  const folderBarItems = useMemo(
    () => visibleTemplateFolders.map((f) => ({ ...f, workflowCount: templateCountByCategory[f.id] ?? 0 })),
    [visibleTemplateFolders, templateCountByCategory],
  );

  useEffect(() => {
    if (activeFolderId === "all") return;
    const f = templateFolders.find((x) => x.id === activeFolderId);
    if (f?.hidden) setActiveFolderId("all");
  }, [activeFolderId, templateFolders]);

  const handleToggleTemplateFolderHidden = useCallback(
    (f: WorkflowTemplateFolderRecord) => {
      updateWorkflowTemplateFolder(f.id, { hidden: !f.hidden });
      refreshTemplateFolders();
    },
    [refreshTemplateFolders],
  );

  const searchFiltered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return templates;
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(s) ||
        t.subtitle.toLowerCase().includes(s) ||
        t.categoryLabel.toLowerCase().includes(s),
    );
  }, [templates, q]);

  const byActiveFolder = useMemo(() => {
    const base =
      activeFolderId === "all" ? searchFiltered : searchFiltered.filter((t) => t.categoryId === activeFolderId);
    return sortTemplatesByPinAndOrder(base, pinnedKeys, templateDisplayOrder);
  }, [searchFiltered, activeFolderId, pinnedKeys, templateDisplayOrder]);

  const foldersToRender =
    activeFolderId === "all" ? visibleTemplateFolders : templateFolders.filter((f) => f.id === activeFolderId);

  const templatesInUnknownCategory = useMemo(() => {
    const visibleIds = new Set(visibleTemplateFolders.map((f) => f.id));
    return sortTemplatesByPinAndOrder(
      searchFiltered.filter((t) => !visibleIds.has(t.categoryId)),
      pinnedKeys,
      templateDisplayOrder,
    );
  }, [searchFiltered, visibleTemplateFolders, pinnedKeys, templateDisplayOrder]);

  const sectionsAll = useMemo(
    () =>
      visibleTemplateFolders.map((folder) => ({
        folder,
        items: sortTemplatesByPinAndOrder(
          searchFiltered.filter((t) => t.categoryId === folder.id),
          pinnedKeys,
          templateDisplayOrder,
        ),
      })),
    [visibleTemplateFolders, searchFiltered, pinnedKeys, templateDisplayOrder],
  );

  const deleteBlockCount = deleteTarget ? templates.filter((t) => t.categoryId === deleteTarget.id).length : 0;

  const categoryHeaderActions = (folder: WorkflowTemplateFolderRecord) => (
    <FolderSectionToolbar
      entityLabel="folder"
      folder={folder}
      onOpenEdit={(focus) => setFolderModal({ mode: "edit", initial: folder, editFocus: focus })}
      onToggleHidden={() => handleToggleTemplateFolderHidden(folder)}
      onDelete={() => setDeleteTarget(folder)}
    />
  );

  const headerTemplateCount = activeFolderId === "all" ? searchFiltered.length : byActiveFolder.length;

  const handleRemoveTemplateFromLibrary = useCallback((templateId: string) => {
    if (typeof window !== "undefined" && !window.confirm("이 워크플로우를 라이브러리에서 숨길까요? (데이터는 삭제되지 않습니다)")) return;
    removePinnedWorkflowKey(`tpl:${templateId}`);
    setPinnedKeys(loadPinnedWorkflowKeys());
    addRemovedWorkflowTemplateId(templateId);
    refreshRemovedTemplates();
  }, [refreshRemovedTemplates]);

  const projectFolderOptions = useMemo(() => loadDashboardFolders().filter((f) => !f.hidden), []);

  const copyTemplateToProject = useCallback((templateId: string) => {
    setProjectFolderModal({
      templateId,
      folderId: pickDefaultProjectFolderId(loadDashboardFolders()),
    });
  }, []);

  const confirmProjectFolder = useCallback(() => {
    if (!projectFolderModal) return;
    const proj = isUserWorkflowTemplateId(projectFolderModal.templateId)
      ? createProjectFromUserTemplate(projectFolderModal.templateId, projectFolderModal.folderId)
      : createProjectFromTemplate(projectFolderModal.templateId, projectFolderModal.folderId);
    if (!proj) {
      setProjectFolderModal(null);
      return;
    }
    appendUserLayoutEntry(proj.id, projectFolderModal.folderId);
    setProjectFolderModal(null);
    router.push(`/workspace?id=${encodeURIComponent(proj.id)}`);
  }, [projectFolderModal, router]);

  const renderTemplateCard = useCallback(
    (t: WorkflowTemplateListItem) => (
      <WorkflowTemplateCard
        t={t}
        pinned={pinnedKeys.has(`tpl:${t.templateId}`)}
        onTogglePin={() => setPinnedKeys(togglePinnedWorkflowKey(`tpl:${t.templateId}`))}
        onCopy={() => copyTemplateToProject(t.templateId)}
        onDelete={() => handleRemoveTemplateFromLibrary(t.templateId)}
      />
    ),
    [pinnedKeys, copyTemplateToProject, handleRemoveTemplateFromLibrary],
  );

  const renderTemplateDndGrid = (items: WorkflowTemplateListItem[], sectionFolderId: string) => {
    const d = templateDnD;
    const readDragId = (e: DragEvent) =>
      e.dataTransfer.getData(TEMPLATE_CARD_MIME) || e.dataTransfer.getData("text/plain");

    const assignToFolderIfNeeded = (dragId: string) => {
      const row = templates.find((x) => x.templateId === dragId);
      if (!row || row.categoryId === sectionFolderId) return;
      if (isUserWorkflowTemplateId(dragId)) {
        updateUserWorkflowTemplateCategory(dragId, sectionFolderId);
      } else {
        setWorkflowTemplateCategoryOverride(dragId, sectionFolderId);
      }
    };

    const onDropBefore = (e: DragEvent, beforeId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setTemplateDropTarget(null);
      const raw = readDragId(e);
      if (!raw || raw === beforeId) return;
      assignToFolderIfNeeded(raw);
      moveTemplateIdBefore(raw, beforeId, templateCatalogIds);
    };

    const onDropAfterLast = (e: DragEvent, lastId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setTemplateDropTarget(null);
      const raw = readDragId(e);
      if (!raw || raw === lastId) return;
      assignToFolderIfNeeded(raw);
      moveTemplateIdAfter(raw, lastId, templateCatalogIds);
    };

    const emptyKey = `__tpl_cat_empty__:${sectionFolderId}`;
    const onDropEmptyFolder = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setTemplateDropTarget(null);
      const raw = readDragId(e);
      if (!raw) return;
      assignToFolderIfNeeded(raw);
      moveTemplateIdToGlobalEnd(raw, templateCatalogIds);
    };

    if (items.length === 0) {
      return (
        <div
          className={cn(
            "rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-8 text-center text-sm text-zinc-500",
            d.dropTargetKey === emptyKey && "ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-50",
          )}
          onDragOver={(e) => d.onDragOver(e, emptyKey)}
          onDragLeave={d.onDragLeave}
          onDrop={onDropEmptyFolder}
        >
          이 폴더에 템플릿이 없어요. 다른 폴더에서 카드를 끌어다 놓으면 이쪽으로 옮겨집니다.
        </div>
      );
    }

    const endDropKey = `__tpl_end__:${sectionFolderId}`;
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((t) => {
          const cellKey = `tplcell:${t.templateId}`;
          return (
            <div
              key={t.templateId}
              className={cn(
                "min-w-0 w-full justify-self-start cursor-grab rounded-[30px] active:cursor-grabbing",
                d.dropTargetKey === cellKey && "ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-50",
              )}
              draggable
              onDragStart={(e) => d.onDragStart(e, t.templateId)}
              onDragOver={(e) => d.onDragOver(e, cellKey)}
              onDragLeave={d.onDragLeave}
              onDrop={(e) => onDropBefore(e, t.templateId)}
              onDragEnd={d.onDragEnd}
            >
              {renderTemplateCard(t)}
            </div>
          );
        })}
        <div
          className={cn(
            "col-span-full h-12 w-full rounded-2xl",
            d.dropTargetKey === endDropKey && "ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-50",
          )}
          onDragOver={(e) => d.onDragOver(e, endDropKey)}
          onDragLeave={d.onDragLeave}
          onDrop={(e) => onDropAfterLast(e, items[items.length - 1]!.templateId)}
        />
      </div>
    );
  };

  return (
    <>
      <AdaptivePageHeader
        title="워크플로우 템플릿"
        count={headerTemplateCount}
        description={
          <>
            템플릿을 고른 뒤 프로젝트로 만들면, 프로젝트 메뉴에서 진행 상황을 관리할 수 있어요. 템플릿 폴더는 프로젝트 폴더와 별도로
            관리됩니다.
          </>
        }
        rightSlot={
          <Link
            href="/recommendation?intent=template"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-bold leading-none text-white shadow-sm hover:bg-zinc-800"
          >
            추가
          </Link>
        }
      />

      <AppMainColumn className="min-w-0 pb-10">
      <div>
        <DashboardFolderBar
          variant="template"
          allWorkflowCount={templates.length}
          folders={folderBarItems}
          activeFolderId={activeFolderId}
          onChange={setActiveFolderId}
          onAddFolderClick={() => setFolderModal({ mode: "create", initial: null })}
          onFolderOpenEdit={(f, focus) => setFolderModal({ mode: "edit", initial: f, editFocus: focus })}
          onFolderToggleHidden={handleToggleTemplateFolderHidden}
          onFolderDeleteRequest={(f) => setDeleteTarget(f)}
          onReorderFolders={(dragId, beforeId) => {
            reorderWorkflowTemplateFolderBefore(dragId, beforeId);
          }}
        />
        <HiddenFoldersManageSection
          variant="template"
          folders={hiddenTemplateFolders}
          onUnhide={(id) => {
            updateWorkflowTemplateFolder(id, { hidden: false });
            refreshTemplateFolders();
          }}
          onRequestDelete={(f) => setDeleteTarget(f)}
        />
      </div>

      <div className="mt-6 min-w-0">
        <PillSearchField
          value={q}
          onChange={setQ}
          placeholder="템플릿 이름, 설명, 폴더 검색"
          aria-label="템플릿 검색"
        />
      </div>

      <div className="mt-8 space-y-6">
        {activeFolderId === "all" ? (
          <>
            {sectionsAll.map(({ folder, items }) => (
              <section key={folder.id} className="space-y-4">
                <FolderSectionAccordionHeader
                  folder={folder}
                  count={items.length}
                  showHiddenBadge={folder.hidden}
                  expanded={isSectionExpanded(folder.id)}
                  onToggle={() => toggleSection(folder.id)}
                  actions={categoryHeaderActions(folder)}
                />
                {isSectionExpanded(folder.id) ? renderTemplateDndGrid(items, folder.id) : null}
              </section>
            ))}
            {templatesInUnknownCategory.length > 0 ? (
              <section className="space-y-4">
                <FolderSectionAccordionHeader
                  folder={miscCategoryFolder}
                  count={templatesInUnknownCategory.length}
                  expanded={isSectionExpanded(WF_MISC_SECTION_ID)}
                  onToggle={() => toggleSection(WF_MISC_SECTION_ID)}
                  actions={
                    <span className="px-2 text-xs font-medium text-zinc-500">숨김·미분류 폴더</span>
                  }
                />
                {isSectionExpanded(WF_MISC_SECTION_ID) ? renderTemplateDndGrid(templatesInUnknownCategory, WF_MISC_SECTION_ID) : null}
              </section>
            ) : null}
            {searchFiltered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-8 text-center text-sm text-zinc-500">
                검색 결과가 없어요.
              </div>
            ) : null}
          </>
        ) : (
          foldersToRender.map((folder) => {
            const items = byActiveFolder;
            return (
              <div key={folder.id} className="space-y-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3 py-1.5 pl-1">
                    <FolderGlyph folder={folder} size="md" accentColor={folder.color} />
                    <span className="truncate text-base font-bold text-zinc-950">{folder.name}</span>
                    {folder.hidden ? (
                      <span className="shrink-0 rounded-full bg-zinc-200/80 px-2 py-0.5 text-[11px] font-bold text-zinc-600">
                        숨김
                      </span>
                    ) : null}
                    <TitleCountChip count={items.length} />
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">{categoryHeaderActions(folder)}</div>
                </div>
                {items.length === 0 && q.trim() ? (
                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-8 text-center text-sm text-zinc-500">
                    검색 조건에 맞는 템플릿이 없어요.
                  </div>
                ) : (
                  renderTemplateDndGrid(items, folder.id)
                )}
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
            updateWorkflowTemplateFolder(id, rest);
          } else {
            addWorkflowTemplateFolder({
              name: payload.name,
              emoji: payload.emoji,
              iconType: payload.iconType,
              lucideIcon: payload.lucideIcon ?? null,
              imageDataUrl: payload.imageDataUrl ?? null,
              color: payload.color,
              hidden: payload.hidden,
            });
          }
          refreshTemplateFolders();
        }}
      />

      {projectFolderModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="tpl-folder-title">
          <button
            type="button"
            onClick={() => setProjectFolderModal(null)}
            className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
            aria-label="닫기"
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-zinc-200">
            <h2 id="tpl-folder-title" className="text-lg font-bold text-zinc-950">
              프로젝트 폴더 선택
            </h2>
            <p className="mt-2 text-sm text-zinc-600">만들 프로젝트가 들어갈 폴더를 고른 뒤 계속하세요.</p>
            <label className="mt-4 block">
              <span className="text-xs font-semibold text-zinc-500">폴더</span>
              <select
                value={projectFolderModal.folderId}
                onChange={(e) =>
                  setProjectFolderModal((m) => (m ? { ...m, folderId: e.target.value } : null))
                }
                className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
              >
                {projectFolderOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.emoji} {f.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setProjectFolderModal(null)}
                className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-200"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmProjectFolder}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800"
              >
                프로젝트 만들기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
            aria-label="닫기"
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-zinc-200">
            <h2 className="text-lg font-bold text-zinc-950">폴더 삭제</h2>
            <p className="mt-2 text-sm text-zinc-600">
              <span className="font-semibold text-zinc-900">{deleteTarget.name}</span> 폴더를 삭제합니다. 템플릿 데이터는 그대로이며,
              전체 보기에서 &quot;기타&quot;로 묶여 보일 수 있어요.
            </p>
            {deleteBlockCount > 0 ? (
              <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 ring-1 ring-rose-200">
                이 폴더를 사용 중인 템플릿이 {deleteBlockCount}개 있어 삭제할 수 없습니다.
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-200"
              >
                취소
              </button>
              <button
                type="button"
                disabled={deleteBlockCount > 0}
                onClick={() => {
                  removeWorkflowTemplateFolder(deleteTarget.id);
                  refreshTemplateFolders();
                  if (activeFolderId === deleteTarget.id) setActiveFolderId("all");
                  setDeleteTarget(null);
                }}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
