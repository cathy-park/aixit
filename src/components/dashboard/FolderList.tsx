import type { DragEvent } from "react";
import { cn } from "@/components/ui/cn";
import type { Folder } from "@/lib/aixit-data";

export function FolderList({
  folders,
  activeFolderId,
  onChange,
  dropHighlightFolderId,
  onFolderDragOver,
  onFolderDrop,
}: {
  folders: Folder[];
  activeFolderId: string;
  onChange: (id: string) => void;
  /** 드래그 중 폴더 탭 하이라이트 (전체 제외) */
  dropHighlightFolderId?: string | null;
  onFolderDragOver?: (folderId: string | null) => void;
  /** 전체 제외, 실제 폴더에 드롭 시 */
  onFolderDrop?: (folderId: string, e: DragEvent) => void;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
      <div className="text-sm font-semibold">폴더</div>
      <div className="mt-3 space-y-1">
        {folders.map((f) => {
          const active = f.id === activeFolderId;
          const droppable = f.id !== "all" && Boolean(onFolderDrop);
          const highlighted = droppable && dropHighlightFolderId === f.id;

          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange(f.id)}
              onDragOver={
                droppable
                  ? (e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      onFolderDragOver?.(f.id);
                    }
                  : undefined
              }
              onDragLeave={
                droppable
                  ? () => {
                      onFolderDragOver?.(null);
                    }
                  : undefined
              }
              onDrop={
                droppable
                  ? (e) => {
                      onFolderDrop?.(f.id, e);
                    }
                  : undefined
              }
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition",
                active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100",
                highlighted && !active && "bg-sky-50 ring-2 ring-sky-200",
                droppable && "cursor-auto",
              )}
            >
              <span className="w-5">{f.emoji}</span>
              <span className="truncate">{f.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
