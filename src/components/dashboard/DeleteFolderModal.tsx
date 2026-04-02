"use client";

import { useEffect, useState } from "react";
import { cn } from "@/components/ui/cn";
import type { DashboardFolderRecord } from "@/lib/dashboard-folders-store";

export type DeleteFolderStrategy = "move_all" | "folder_only";

export function DeleteFolderModal({
  open,
  folder,
  otherFolders,
  onClose,
  onConfirm,
}: {
  open: boolean;
  folder: DashboardFolderRecord | null;
  otherFolders: DashboardFolderRecord[];
  onClose: () => void;
  onConfirm: (strategy: DeleteFolderStrategy, targetFolderId: string) => void;
}) {
  const [strategy, setStrategy] = useState<DeleteFolderStrategy>("move_all");
  const [targetId, setTargetId] = useState("");

  useEffect(() => {
    if (!open || !folder) return;
    const t = otherFolders.filter((f) => f.id !== folder.id);
    setTargetId(t[0]?.id ?? "");
  }, [open, folder, otherFolders]);

  if (!open || !folder) return null;

  const targets = otherFolders.filter((f) => f.id !== folder.id);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm" aria-label="닫기" />

      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-zinc-200">
        <h2 className="text-lg font-bold text-zinc-950">폴더 삭제</h2>
        <p className="mt-2 text-sm text-zinc-600">
          <span className="font-semibold text-zinc-900">{folder.name}</span> 폴더를 삭제합니다. 안에 있는 워크플로우 처리 방식을
          선택하세요.
        </p>

        <div className="mt-5 space-y-3">
          <label
            className={cn(
              "flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition",
              strategy === "move_all" ? "border-blue-500 bg-blue-50/50" : "border-zinc-200 bg-zinc-50",
            )}
          >
            <input
              type="radio"
              name="del-strat"
              checked={strategy === "move_all"}
              onChange={() => setStrategy("move_all")}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-bold text-zinc-900">다른 폴더로 모두 이동</div>
              <div className="mt-1 text-xs text-zinc-600">워크플로우는 유지하고 아래 폴더로 옮깁니다.</div>
              {strategy === "move_all" && targets.length > 0 ? (
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="mt-3 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold"
                >
                  {targets.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.emoji} {f.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </label>

          <label
            className={cn(
              "flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition",
              strategy === "folder_only" ? "border-amber-500 bg-amber-50/50" : "border-zinc-200 bg-zinc-50",
            )}
          >
            <input
              type="radio"
              name="del-strat"
              checked={strategy === "folder_only"}
              onChange={() => setStrategy("folder_only")}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-bold text-zinc-900">폴더만 제거 (mock)</div>
              <div className="mt-1 text-xs text-zinc-600">워크플로우는 기본 폴더(첫 번째 대상)로 자동 이동합니다.</div>
            </div>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              const tid = strategy === "move_all" ? targetId || targets[0]?.id : targets[0]?.id;
              if (!tid) return;
              onConfirm(strategy, tid);
              onClose();
            }}
            disabled={targets.length === 0}
            className="rounded-full bg-rose-600 px-5 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-40"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
