"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/components/ui/cn";
import { appendUserLayoutEntry } from "@/lib/dashboard-layout-store";
import { loadDashboardFolders } from "@/lib/dashboard-folders-store";
import { createBlankProject } from "@/lib/workflows-store";

export function ProjectAddMenu({
  targetFolderId,
  onLayoutChange,
  variant = "pill",
}: {
  /** 새 프로젝트가 들어갈 폴더 id */
  targetFolderId: string;
  /** 레이아웃 state 갱신 (ensureLayoutMerged 등) */
  onLayoutChange: () => void;
  variant?: "pill" | "fab";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState(targetFolderId);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) setSelectedFolderId(targetFolderId);
  }, [open, targetFolderId]);

  useEffect(() => {
    if (!open || variant === "fab") return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, variant]);

  const handleBlank = useCallback(() => {
    const fid = selectedFolderId;
    const proj = createBlankProject(fid);
    appendUserLayoutEntry(proj.id, fid);
    onLayoutChange();
    setOpen(false);
    router.push(`/workspace?id=${encodeURIComponent(proj.id)}`);
  }, [selectedFolderId, onLayoutChange, router]);

  const menuClassName =
    "w-[min(280px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white py-1 shadow-xl ring-1 ring-zinc-100";

  const menuBody = (
    <>
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
        className={cn("w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50")}
      >
        새로 추가하기
      </button>
    </>
  );

  const fabPortal =
    open && mounted && variant === "fab" ? (
      createPortal(
        <div className="fixed inset-0 z-[230]" role="presentation">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
            aria-label="닫기"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            aria-modal="true"
            aria-label="새 프로젝트"
            className={cn("absolute left-1/2 top-1/2 max-h-[min(70vh,520px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto", menuClassName)}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {menuBody}
          </div>
        </div>,
        document.body,
      )
    ) : null;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "inline-flex shrink-0 items-center justify-center bg-zinc-900 font-bold leading-none text-white shadow-sm hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-200",
          variant === "pill" && "h-10 min-h-10 rounded-full px-5 text-sm",
          variant === "fab" &&
            "h-14 w-14 rounded-full text-sm shadow-lg shadow-zinc-900/20 ring-1 ring-zinc-950/10",
        )}
      >
        {variant === "fab" ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="h-6 w-6"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        ) : (
          "추가"
        )}
      </button>
      {fabPortal}
      {open && variant !== "fab" ? (
        <div role="menu" className={cn("absolute right-0 z-50 mt-2", menuClassName)}>
          {menuBody}
        </div>
      ) : null}
    </div>
  );
}
