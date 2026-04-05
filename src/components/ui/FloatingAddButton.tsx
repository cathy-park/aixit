"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { cn } from "@/components/ui/cn";

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("h-6 w-6", className)}
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

/**
 * 모바일 우측 하단 플로팅 '추가' 버튼.
 * - lg 이상에서는 숨김.
 * - iOS safe-area 고려.
 */
export function FloatingAddButton({
  onClick,
  href,
  label = "추가",
  className,
  children,
}: {
  onClick?: (e: MouseEvent) => void;
  href?: string;
  label?: string;
  className?: string;
  /** 기본은 + 아이콘, 필요 시 교체 */
  children?: ReactNode;
}) {
  const base =
    "lg:hidden pointer-events-auto fixed right-5 z-[85] inline-flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg shadow-zinc-900/20 ring-1 ring-zinc-950/10 hover:bg-zinc-800 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-200";
  const style = { bottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" } as const;

  const content = children ?? <PlusIcon />;

  if (href) {
    return (
      <Link href={href} className={cn(base, className)} style={style} aria-label={label} title={label}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(base, className)}
      style={style}
      aria-label={label}
      title={label}
    >
      {content}
    </button>
  );
}

