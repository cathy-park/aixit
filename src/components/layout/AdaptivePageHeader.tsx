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
 * lg 미만: 한 줄 — 좌측 타이틀만(개수 칩 숨김) + 우측 액션만, 설명 숨김.
 */
export function AdaptivePageHeader({
  title,
  count,
  description,
  rightSlot,
  hideOnMobile = false,
  className,
}: {
  title: ReactNode | ((compact: boolean) => ReactNode);
  count?: number | null;
  description?: ReactNode;
  rightSlot?: ReactNode;
  /** lg 미만에서 페이지 헤더 자체를 숨김 (앱 상단 헤더만 사용) */
  hideOnMobile?: boolean;
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
    <>
      {hideOnMobile ? <div className="h-5 w-full shrink-0 lg:hidden" aria-hidden /> : null}
      <header
        className={cn(
          "sticky top-0 z-40 w-full shrink-0 shadow-none transition-[padding,background-color,border-color] duration-200 ease-out",
          hideOnMobile && "hidden lg:block",
          compact
            ? "border-b border-zinc-200 bg-white py-2.5"
            : "border-b border-transparent bg-transparent py-3 pb-4",
          className,
        )}
      >
      <div
        className={cn(
          appMainColumnClass,
          "flex flex-row items-center justify-between gap-3 lg:items-start lg:gap-4",
          compact && "gap-2",
        )}
      >
        <div className="min-w-0 flex-1 lg:flex lg:flex-col lg:gap-3">
          <h1
            className={cn(
              "flex min-w-0 flex-nowrap items-center gap-x-2 font-semibold tracking-tight text-zinc-950 transition-all duration-200 ease-out",
              compact ? "text-lg sm:text-xl" : "text-lg lg:text-2xl lg:leading-tight xl:text-3xl",
            )}
          >
            <span className="min-w-0 truncate [text-decoration:inherit]">{titleNode}</span>
            {count != null ? (
              <TitleCountChip
                count={count}
                className={cn(
                  "hidden shrink-0 lg:inline-flex transition-all duration-200 ease-out",
                  compact && "text-[10px]",
                )}
              />
            ) : null}
          </h1>
          {description != null ? (
            <div
              className={cn(
                "hidden overflow-hidden transition-[max-height,opacity] duration-200 ease-out lg:block",
                compact ? "lg:pointer-events-none lg:max-h-0 lg:opacity-0" : "lg:max-h-40 lg:opacity-100",
              )}
            >
              <p className="mt-1 mb-5 text-sm text-zinc-600">{description}</p>
            </div>
          ) : null}
        </div>
        {rightSlot ? (
          <div
            className={cn(
              "flex shrink-0 flex-nowrap items-center justify-end bg-transparent lg:self-start",
              compact ? "pt-0.5" : "pt-0.5 lg:pt-1",
            )}
          >
            {rightSlot}
          </div>
        ) : null}
      </div>
    </header>
    </>
  );
}
