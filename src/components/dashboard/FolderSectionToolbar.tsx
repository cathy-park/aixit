"use client";

import { useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import type { DashboardFolderRecord } from "@/lib/dashboard-folders-store";
import { FolderActionsDropdown } from "@/components/dashboard/FolderActionsDropdown";

/**
 * 프로젝트·워크플로우 섹션 타이틀 우측: ⋮ 더보기 (이름·아이콘·색·숨김·삭제)
 */
export function FolderSectionToolbar({
  folder,
  entityLabel,
  onOpenEdit,
  onToggleHidden,
  onDelete,
}: {
  folder: Pick<DashboardFolderRecord, "hidden">;
  entityLabel: "folder" | "category";
  onOpenEdit: (focus?: "name" | "icon" | "color") => void;
  onToggleHidden: () => void;
  onDelete: () => void;
}) {
  const noun = entityLabel === "category" ? "카테고리" : "폴더";
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${noun} 더보기`}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800",
        )}
      >
        <span className="text-lg leading-none" aria-hidden>
          ⋮
        </span>
      </button>
      <FolderActionsDropdown
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={btnRef}
        noun={noun}
        hidden={Boolean(folder.hidden)}
        onEditName={() => onOpenEdit("name")}
        onEditIcon={() => onOpenEdit("icon")}
        onEditColor={() => onOpenEdit("color")}
        onToggleHidden={onToggleHidden}
        onDelete={onDelete}
      />
    </>
  );
}
