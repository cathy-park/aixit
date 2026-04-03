"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/components/ui/cn";
import { actionIconButtonClass, IconMoreVertical } from "@/components/ui/action-icons";
import { APP_CARD_ACTIONS_COLUMN_CLASS } from "@/components/cards/app-card-layout";

function mapMenuItems(
  nodes: ReactNode,
  onClose: () => void,
): ReactNode {
  return Children.map(nodes, (child, i) => {
    if (!isValidElement(child)) return child;
    const p = child.props as {
      className?: string;
      onClick?: (e: ReactMouseEvent<HTMLElement>) => void;
      onMouseDown?: (e: ReactMouseEvent<HTMLElement>) => void;
    };
    return cloneElement(
      child as ReactElement<{
        className?: string;
        onClick?: (e: ReactMouseEvent<HTMLElement>) => void;
        onMouseDown?: (e: ReactMouseEvent<HTMLElement>) => void;
      }>,
      {
        key: `overflow-${i}`,
        // 카드 액션은 아이콘-only 버튼이므로 메뉴 폭을 아이콘 크기만큼만 유지
        className: cn(p.className, "h-10 w-10 min-h-10 min-w-10 justify-center rounded-lg"),
        onMouseDown: (e: ReactMouseEvent<HTMLElement>) => {
          e.stopPropagation();
          p.onMouseDown?.(e);
        },
        onClick: (e: ReactMouseEvent<HTMLElement>) => {
          p.onClick?.(e);
          onClose();
        },
      },
    );
  });
}

/**
 * 카드 우측 액션: 항상 **즐겨찾기(핀) 등 leading** + **더보기(⋮)** 만 노출.
 * 나머지 `children`은 더보기 탭 시 포탈 메뉴로 표시 (PC·모바일 동일).
 */
export function CardActionsOverflow({
  children,
  menuAriaLabel = "추가 작업",
  desktopLeading,
  mobileLeading,
  className,
}: {
  children: ReactNode;
  menuAriaLabel?: string;
  /** 핀 등 — `mobileLeading`과 동일하면 하나만 넘겨도 됨 */
  desktopLeading?: ReactNode;
  mobileLeading?: ReactNode;
  className?: string;
}) {
  const items = Children.toArray(children).filter(Boolean);
  const leading = desktopLeading ?? mobileLeading;

  if (items.length === 0 && !leading) return null;

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (menuPanelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const sync = () => {
      const btn = triggerRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setPos({
        top: Math.round(rect.bottom + 6),
        right: Math.round(window.innerWidth - rect.right),
      });
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("shrink-0", APP_CARD_ACTIONS_COLUMN_CLASS, className)}>
      {leading}
      {items.length > 0 ? (
        <button
          type="button"
          draggable={false}
          className={cn(actionIconButtonClass, "h-8 w-8")}
          ref={triggerRef}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={menuAriaLabel}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          <IconMoreVertical />
        </button>
      ) : null}
      {open && pos && items.length > 0
        ? createPortal(
            <div
              className="fixed inset-0 z-[90]"
              aria-hidden
              onPointerDown={(e) => {
                if (e.target !== e.currentTarget) return;
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              }}
            >
              <div
                ref={menuPanelRef}
                role="menu"
                aria-label={menuAriaLabel}
                className="fixed z-[100] flex w-fit flex-col items-center gap-0.5 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg ring-1 ring-zinc-100"
                style={{ top: pos.top, right: pos.right }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {mapMenuItems(items, () => setOpen(false))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
