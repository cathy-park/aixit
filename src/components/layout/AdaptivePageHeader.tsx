"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { TitleCountChip } from "@/components/ui/TitleCountChip";
import { cn } from "@/components/ui/cn";
import { AIXIT_MAIN_SCROLL_ID, isMainScrollCompact } from "@/components/layout/main-scroll-id";
import { appMainColumnClass } from "@/components/layout/AppMainColumn";

export { AIXIT_MAIN_SCROLL_ID } from "@/components/layout/main-scroll-id";

/**
 * 앱 셸 메인 스크롤(`#aixit-main-scroll`) 기준 sticky 헤더.
 * 스크롤 상단: 투명·구분선 없음. 스크롤 compact 시에만 흰 배경 + 하단선.
 * 내용은 `AppMainColumn`과 동일 폭(`appMainColumnClass`).
 */
export function AdaptivePageHeader({
  title,
  count,
  description,
  rightSlot,
  className,
}: {
  title: ReactNode | ((compact: boolean) => ReactNode);
  count?: number | null;
  description?: ReactNode;
  rightSlot?: ReactNode;
  className?: string;
}) {
  const [compact, setCompact] = useState(false);

  useLayoutEffect(() => {
    setCompact(isMainScrollCompact());
  }, []);

  useEffect(() => {
    const el = document.getElementById(AIXIT_MAIN_SCROLL_ID);
    const sync = () => setCompact(isMainScrollCompact());

    sync();
    el?.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("scroll", sync, { passive: true });

    let ro: ResizeObserver | undefined;
    if (el && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => sync());
      ro.observe(el);
    }

    return () => {
      el?.removeEventListener("scroll", sync);
      window.removeEventListener("scroll", sync);
      ro?.disconnect();
    };
  }, []);

  const titleNode = typeof title === "function" ? title(compact) : title;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full shrink-0 shadow-none transition-[padding,background-color,border-color] duration-200 ease-out",
        className,
      )}
    >
      {/* 브라우저 theme-color(#1E1E21)와 이어지는 상단 포인트 띠 — 본문 헤더와 분리 */}
      <div
        className="w-full shrink-0 bg-[#1E1E21]"
        style={{ height: "max(6px, env(safe-area-inset-top, 0px))" }}
        aria-hidden
      />
      <div
        className={cn(
          "transition-[padding,background-color,border-color] duration-200 ease-out",
          compact
            ? "border-b border-zinc-200 bg-white py-2.5"
            : "border-b border-transparent bg-transparent py-3 pb-4",
        )}
      >
        <div
          className={cn(
            appMainColumnClass,
            "flex flex-col gap-3 transition-all duration-200 ease-out sm:flex-row sm:items-start sm:justify-between sm:gap-4",
            compact && "gap-2",
          )}
        >
          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                "flex flex-wrap items-baseline gap-x-2 gap-y-1 font-semibold tracking-tight text-zinc-950 transition-all duration-200 ease-out",
                compact ? "text-lg sm:text-xl" : "text-2xl sm:text-3xl",
              )}
            >
              <span className="min-w-0 [text-decoration:inherit]">{titleNode}</span>
              {count != null ? (
                <TitleCountChip
                  count={count}
                  className={cn("transition-all duration-200 ease-out", compact && "text-[10px]")}
                />
              ) : null}
            </h1>
            {description != null ? (
              <div
                className={cn(
                  "overflow-hidden transition-[max-height,opacity] duration-200 ease-out",
                  compact ? "pointer-events-none max-h-0 opacity-0" : "max-h-40 opacity-100",
                )}
              >
                <p className="mt-1 mb-5 text-sm text-zinc-600">{description}</p>
              </div>
            ) : null}
          </div>
          {rightSlot ? (
            <div
              className={cn(
                "flex w-full shrink-0 justify-end sm:w-auto sm:justify-end sm:self-start",
                compact ? "pt-0.5" : "pt-0.5 sm:pt-1",
              )}
            >
              {rightSlot}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
