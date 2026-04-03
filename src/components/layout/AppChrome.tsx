"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { AIXIT_MAIN_SCROLL_ID } from "@/components/layout/main-scroll-id";
import { MobileTopNav, MOBILE_TOPBAR_HEIGHT_PX } from "@/components/layout/MobileTopNav";
import { PrimarySidebar } from "@/components/layout/PrimarySidebar";

/** 이 너비 이하: 좌측 사이드바 없음 → 상단 다크 네비 */
const MOBILE_TOP_NAV_MEDIA = "(max-width: 1024px)";

function subscribeMobileTopNav(onChange: () => void) {
  const mq = window.matchMedia(MOBILE_TOP_NAV_MEDIA);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getMobileTopNavSnapshot() {
  return window.matchMedia(MOBILE_TOP_NAV_MEDIA).matches;
}

function getMobileTopNavServerSnapshot() {
  return false;
}

export function AppChrome({ children }: { children: ReactNode }) {
  const useMobileTopNav = useSyncExternalStore(
    subscribeMobileTopNav,
    getMobileTopNavSnapshot,
    getMobileTopNavServerSnapshot,
  );

  if (useMobileTopNav) {
    return (
      <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-zinc-50 text-zinc-950">
        <MobileTopNav topbarHeightPx={MOBILE_TOPBAR_HEIGHT_PX} />
        <div className="@container flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden [container-type:inline-size]">
          <div
            id={AIXIT_MAIN_SCROLL_ID}
            className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="flex min-w-0 flex-col bg-transparent pb-6 pt-0">{children}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden bg-zinc-50 text-zinc-950">
      <PrimarySidebar />
      {/* 카드 그리드 `@min-[1140px]:grid-cols-2` 기준 — 본문(사이드바 제외) 실제 너비 */}
      <div className="@container flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden [container-type:inline-size]">
        <div
          id={AIXIT_MAIN_SCROLL_ID}
          className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain"
        >
          <div className="flex min-w-0 flex-col bg-transparent pb-6 pt-[50px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
