"use client";

import { cn } from "@/components/ui/cn";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 워크플로우 / 도구 창고 / 영감 창고 공통 검색 필드 (왼쪽 돋보기, 알약 형태)
 */
export function PillSearchField({
  value,
  onChange,
  placeholder,
  id,
  "aria-label": ariaLabel,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  id?: string;
  "aria-label"?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full", className)}>
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden>
        <SearchIcon className="h-5 w-5" />
      </span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="h-11 w-full rounded-full border border-zinc-200/90 bg-white py-2.5 pr-4 pl-11 text-sm font-medium text-zinc-900 outline-none ring-zinc-100/80 placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
        aria-label={ariaLabel ?? placeholder}
      />
    </div>
  );
}
