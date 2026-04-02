"use client";

import type { DragEvent } from "react";
import { useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import type { DashboardFolderRecord } from "@/lib/dashboard-folders-store";
import { FolderGlyph } from "@/components/dashboard/FolderGlyph";
import { FolderActionsDropdown } from "@/components/dashboard/FolderActionsDropdown";
import { TitleCountChip } from "@/components/ui/TitleCountChip";
import {
  DASHBOARD_FOLDER_DND_MIME,
  WORKFLOW_TEMPLATE_FOLDER_DND_MIME,
} from "@/lib/layout-card-dnd";

export type FolderBarItem = DashboardFolderRecord & { workflowCount: number };

function FolderChipWithMenu({
  f,
  active,
  onSelect,
  onOpenEdit,
  onToggleHidden,
  onDeleteRequest,
  menuAriaKind,
  reorderMime,
  dropHighlight,
  onReorderDragEnd,
}: {
  f: FolderBarItem;
  active: boolean;
  onSelect: () => void;
  onOpenEdit: (focus?: "name" | "icon" | "color") => void;
  onToggleHidden: () => void;
  onDeleteRequest: () => void;
  menuAriaKind: "folder" | "category";
  reorderMime?: string;
  dropHighlight?: boolean;
  onReorderDragEnd?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const noun = menuAriaKind === "category" ? "카테고리" : "폴더";

  const chipStyle = active
    ? ({ backgroundColor: f.color, boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.2)` } as const)
    : ({ boxShadow: `inset 0 0 0 1px ${f.color}33` } as const);

  const onDragStartMain = (e: DragEvent) => {
    if (!reorderMime) return;
    e.dataTransfer.setData(reorderMime, f.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className={cn(
        "inline-flex items-stretch rounded-full text-sm font-semibold transition",
        active ? "text-white" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50",
        f.hidden && "opacity-75 ring-dashed",
        dropHighlight && "ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-50",
        reorderMime && "[&_.folder-chip-main]:cursor-grab [&_.folder-chip-main]:active:cursor-grabbing",
      )}
      style={chipStyle}
    >
      <button
        type="button"
        className="folder-chip-main inline-flex items-center gap-2 px-3 py-2"
        draggable={Boolean(reorderMime)}
        onDragStart={onDragStartMain}
        onDragEnd={() => onReorderDragEnd?.()}
        onClick={() => onSelect()}
      >
        <FolderGlyph folder={f} size="sm" accentColor={f.color} />
        <span>{f.name}</span>
        <TitleCountChip count={f.workflowCount} variant={active ? "onAccent" : "default"} />
      </button>
      <div className="relative flex items-stretch">
        <button
          ref={moreBtnRef}
          type="button"
          draggable={false}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`${f.name} ${noun} 더보기`}
          className={cn(
            "flex items-center justify-center px-2",
            active ? "border-l border-white/25 hover:bg-white/10" : "border-l border-zinc-200/80 hover:bg-zinc-100/80",
          )}
        >
          <span className="text-base leading-none" aria-hidden>
            ⋮
          </span>
        </button>
        <FolderActionsDropdown
          open={open}
          onClose={() => setOpen(false)}
          anchorRef={moreBtnRef}
          noun={noun}
          hidden={Boolean(f.hidden)}
          onEditName={() => onOpenEdit("name")}
          onEditIcon={() => onOpenEdit("icon")}
          onEditColor={() => onOpenEdit("color")}
          onToggleHidden={onToggleHidden}
          onDelete={onDeleteRequest}
        />
      </div>
    </div>
  );
}

export function DashboardFolderBar({
  allWorkflowCount,
  folders,
  activeFolderId,
  onChange,
  onAddFolderClick,
  variant = "project",
  onFolderOpenEdit,
  onFolderToggleHidden,
  onFolderDeleteRequest,
  onReorderFolders,
}: {
  allWorkflowCount: number;
  folders: FolderBarItem[];
  activeFolderId: string;
  onChange: (id: string) => void;
  onAddFolderClick?: () => void;
  variant?: "project" | "template";
  onFolderOpenEdit?: (folder: FolderBarItem, focus?: "name" | "icon" | "color") => void;
  onFolderToggleHidden?: (folder: FolderBarItem) => void;
  onFolderDeleteRequest?: (folder: FolderBarItem) => void;
  /** 보이는 폴더/카테고리 칩 순서만 변경. `beforeId`가 null이면 맨 뒤. */
  onReorderFolders?: (dragId: string, beforeId: string | null) => void;
}) {
  const showFolderMenu = Boolean(onFolderOpenEdit && onFolderToggleHidden && onFolderDeleteRequest);
  const reorderEnabled = Boolean(onReorderFolders);
  const reorderMime =
    variant === "template" ? WORKFLOW_TEMPLATE_FOLDER_DND_MIME : DASHBOARD_FOLDER_DND_MIME;
  const [folderDropTarget, setFolderDropTarget] = useState<string | "end" | null>(null);

  const typesIncludeMime = (e: DragEvent) =>
    Array.from(e.dataTransfer.types).includes(reorderMime);

  const handleFolderDragOver = (e: DragEvent, targetId: string | "end") => {
    if (!reorderEnabled || !typesIncludeMime(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setFolderDropTarget(targetId);
  };

  const handleFolderDragLeave = (e: DragEvent) => {
    if (!reorderEnabled) return;
    const next = e.relatedTarget as Node | null;
    if (next && (e.currentTarget as HTMLElement).contains(next)) return;
    setFolderDropTarget(null);
  };

  const handleFolderDrop = (e: DragEvent, beforeId: string | null) => {
    if (!reorderEnabled || !onReorderFolders) return;
    e.preventDefault();
    setFolderDropTarget(null);
    const raw = e.dataTransfer.getData(reorderMime);
    if (!raw) return;
    onReorderFolders(raw, beforeId);
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="toolbar"
      aria-label={variant === "template" ? "카테고리 필터" : "폴더 필터"}
    >
      <button
        type="button"
        onClick={() => onChange("all")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition",
          activeFolderId === "all" ? "bg-zinc-900 text-white" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50",
        )}
      >
        <span aria-hidden>📋</span>
        <span>전체</span>
        <TitleCountChip count={allWorkflowCount} variant={activeFolderId === "all" ? "onAccent" : "default"} />
      </button>

      {folders.map((f) => {
        const active = f.id === activeFolderId;

        if (showFolderMenu) {
          return (
            <div
              key={f.id}
              className="inline-flex"
              onDragOver={(e) => handleFolderDragOver(e, f.id)}
              onDragLeave={handleFolderDragLeave}
              onDrop={(e) => handleFolderDrop(e, f.id)}
            >
              <FolderChipWithMenu
                f={f}
                active={active}
                onSelect={() => onChange(f.id)}
                onOpenEdit={(focus) => onFolderOpenEdit!(f, focus)}
                onToggleHidden={() => onFolderToggleHidden!(f)}
                onDeleteRequest={() => onFolderDeleteRequest!(f)}
                menuAriaKind={variant === "template" ? "category" : "folder"}
                reorderMime={reorderEnabled ? reorderMime : undefined}
                dropHighlight={folderDropTarget === f.id}
                onReorderDragEnd={() => setFolderDropTarget(null)}
              />
            </div>
          );
        }

        return (
          <div
            key={f.id}
            className="inline-flex"
            onDragOver={(e) => handleFolderDragOver(e, f.id)}
            onDragLeave={handleFolderDragLeave}
            onDrop={(e) => handleFolderDrop(e, f.id)}
          >
            <div
              className={cn(
                "inline-flex items-stretch rounded-full text-sm font-semibold transition",
                active ? "text-white" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50",
                f.hidden && "opacity-75 ring-dashed",
                folderDropTarget === f.id && "ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-50",
                reorderEnabled && "[&_.folder-chip-main]:cursor-grab [&_.folder-chip-main]:active:cursor-grabbing",
              )}
              style={
                active
                  ? { backgroundColor: f.color, boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.2)` }
                  : { boxShadow: `inset 0 0 0 1px ${f.color}33` }
              }
            >
              <button
                type="button"
                className="folder-chip-main inline-flex items-center gap-2 px-3 py-2"
                draggable={reorderEnabled}
                onDragStart={(e) => {
                  if (!reorderEnabled) return;
                  e.dataTransfer.setData(reorderMime, f.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => setFolderDropTarget(null)}
                onClick={() => onChange(f.id)}
              >
                <FolderGlyph folder={f} size="sm" accentColor={f.color} />
                <span>{f.name}</span>
                <TitleCountChip count={f.workflowCount} variant={active ? "onAccent" : "default"} />
              </button>
            </div>
          </div>
        );
      })}

      {reorderEnabled ? (
        <div
          className={cn(
            "inline-flex min-h-9 w-3 shrink-0 self-center rounded-md transition",
            folderDropTarget === "end" ? "bg-blue-100 ring-2 ring-blue-400" : "bg-transparent",
          )}
          onDragOver={(e) => handleFolderDragOver(e, "end")}
          onDragLeave={handleFolderDragLeave}
          onDrop={(e) => handleFolderDrop(e, null)}
          aria-hidden
        />
      ) : null}

      <button
        type="button"
        onClick={onAddFolderClick}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-zinc-300 bg-zinc-50/80 px-3.5 py-2 text-sm font-semibold text-zinc-600 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-800"
      >
        <span aria-hidden>+</span>
        {variant === "template" ? "카테고리 추가" : "폴더 추가"}
      </button>
    </div>
  );
}
