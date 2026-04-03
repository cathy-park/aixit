import type { ReactNode } from "react";
import { PrimarySidebar } from "@/components/layout/PrimarySidebar";
import { AIXIT_MAIN_SCROLL_ID } from "@/components/layout/main-scroll-id";

export default function AppShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden bg-zinc-50 text-zinc-950">
      <PrimarySidebar />
      {/* 단일 스크롤 루트: sticky 헤더는 이 요소의 스크롤포트 기준 (window 스크롤 아님) */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div
          id={AIXIT_MAIN_SCROLL_ID}
          className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain"
        >
          {/* 콘텐츠 높이만큼만 늘어나야 함. flex-1+min-h-0이면 높이가 뷰포트에 고정되어 sticky 헤더의 제한 박스가 짧아져, 일정 스크롤 후 헤더가 사라짐 */}
          <div className="flex min-w-0 flex-col bg-transparent pb-6 pt-[50px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
