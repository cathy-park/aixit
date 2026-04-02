"use client";

import { AdaptivePageHeader } from "@/components/layout/AdaptivePageHeader";
import { AppMainColumn } from "@/components/layout/AppMainColumn";
import { MonthlyCalendarView } from "@/components/calendar/MonthlyCalendarView";

export default function CalendarPage() {
  return (
    <>
      <AdaptivePageHeader
        title="캘린더"
        description="이번주 할 일 완료·프로젝트 완료 처리가 날짜별로 모입니다. 월을 바꿔 과거·이후 기록을 볼 수 있어요."
      />
      <AppMainColumn>
        <div className="mt-4">
          <MonthlyCalendarView />
        </div>
      </AppMainColumn>
    </>
  );
}
