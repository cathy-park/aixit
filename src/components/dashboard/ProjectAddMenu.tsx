"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { appendUserLayoutEntry } from "@/lib/dashboard-layout-store";
import { loadDashboardFolders } from "@/lib/dashboard-folders-store";
import { createBlankProject } from "@/lib/workflows-store";

export function ProjectAddMenu({
  targetFolderId,
  onLayoutChange,
}: {
  /** 새 프로젝트가 들어갈 폴더 id */
  targetFolderId: string;
  /** 레이아웃 state 갱신 (ensureLayoutMerged 등) */
  onLayoutChange: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState(targetFolderId);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setSelectedFolderId(targetFolderId);
  }, [open, targetFolderId]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const handleBlank = useCallback(() => {
    const fid = selectedFolderId;
    const proj = createBlankProject(fid);
    appendUserLayoutEntry(proj.id, fid);
    onLayoutChange();
    setOpen(false);
    router.push(`/workspace?id=${encodeURIComponent(proj.id)}`);
  }, [selectedFolderId, onLayoutChange, router]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-10 min-h-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-bold leading-none text-white shadow-sm hover:bg-zinc-800"
      >
        추가
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[260px] overflow-hidden rounded-2xl border border-zinc-200 bg-white py-1 shadow-lg ring-1 ring-zinc-100"
        >
          <label className="block border-b border-zinc-100 px-4 py-3">
            <span className="text-[11px] font-semibold text-zinc-500">프로젝트 폴더</span>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-2 py-2 text-xs font-semibold text-zinc-900 outline-none focus:border-zinc-300"
            >
              {loadDashboardFolders()
                .filter((f) => !f.hidden)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.emoji} {f.name}
                  </option>
                ))}
            </select>
          </label>
          <Link
            role="menuitem"
            href="/workflows"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            워크플로우 선택하기
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleBlank}
            className={cn(
              "w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50",
            )}
          >
            새로 추가하기
          </button>
        </div>
      ) : null}
    </div>
  );
}
