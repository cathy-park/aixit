"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { AIXIT_MAIN_SCROLL_ID } from "@/components/layout/main-scroll-id";
import { PrimarySidebar } from "@/components/layout/PrimarySidebar";

/** 뷰포트가 이 너비 이하이면 사이드바를 레일로 축소해 본문(카드) 폭을 먼저 확보 */
const SIDEBAR_RAIL_MEDIA = "(max-width: 1399px)";

function subscribeSidebarRail(onChange: () => void) {
  const mq = window.matchMedia(SIDEBAR_RAIL_MEDIA);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSidebarRailSnapshot() {
  return window.matchMedia(SIDEBAR_RAIL_MEDIA).matches;
}

function getSidebarRailServerSnapshot() {
  return false;
}

export function AppChrome({ children }: { children: ReactNode }) {
  const sidebarRail = useSyncExternalStore(
    subscribeSidebarRail,
    getSidebarRailSnapshot,
    getSidebarRailServerSnapshot,
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden bg-zinc-50 text-zinc-950">
      <PrimarySidebar variant={sidebarRail ? "rail" : "full"} />
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
