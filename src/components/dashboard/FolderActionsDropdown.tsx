"use client";

import { createPortal } from "react-dom";
import type { RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

function useMenuPosition(open: boolean, anchorRef: RefObject<HTMLElement | null>) {
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    const update = () => {
      const el = anchorRef.current;
      if (!el) {
        setBox(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const w = 220;
      const left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8));
      setBox({ top: r.bottom + 6, left, width: w });
    };
    update();
    const id = requestAnimationFrame(update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorRef]);

  return box;
}

export function FolderActionsDropdown({
  open,
  onClose,
  anchorRef,
  noun,
  hidden,
  onEditName,
  onEditIcon,
  onEditColor,
  onToggleHidden,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  noun: "폴더" | "카테고리";
  hidden: boolean;
  onEditName: () => void;
  onEditIcon: () => void;
  onEditColor: () => void;
  onToggleHidden: () => void;
  onDelete: () => void;
}) {
  const box = useMenuPosition(open, anchorRef);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onMouseDown, true);
    return () => document.removeEventListener("mousedown", onMouseDown, true);
  }, [open, onClose, anchorRef]);

  if (!open || box == null || typeof document === "undefined") return null;

  const item = "block w-full px-4 py-2.5 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50";

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[10000] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl ring-1 ring-zinc-100"
      style={{ top: box.top, left: box.left, minWidth: box.width }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        role="menuitem"
        className={item}
        onClick={() => {
          onClose();
          onEditName();
        }}
      >
        이름 수정
      </button>
      <button
        type="button"
        role="menuitem"
        className={item}
        onClick={() => {
          onClose();
          onEditIcon();
        }}
      >
        아이콘 변경
      </button>
      <button
        type="button"
        role="menuitem"
        className={item}
        onClick={() => {
          onClose();
          onEditColor();
        }}
      >
        색상 변경
      </button>
      <button
        type="button"
        role="menuitem"
        className={item}
        onClick={() => {
          onClose();
          onToggleHidden();
        }}
      >
        {hidden ? "칩에 다시 표시" : "숨기기"}
      </button>
      <button
        type="button"
        role="menuitem"
        className={item}
        onClick={() => {
          onClose();
          onDelete();
        }}
      >
        삭제
      </button>
    </div>,
    document.body,
  );
}
