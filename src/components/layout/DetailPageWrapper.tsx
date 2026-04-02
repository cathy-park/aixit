"use client";

import type { ReactNode } from "react";
import { AppMainColumn } from "@/components/layout/AppMainColumn";
import { cn } from "@/components/ui/cn";

/**
 * 세부 페이지(프로젝트 추가/수정, 워크플로우 수정) 전용 공통 wrapper.
 * - 좌측 시작선: `AppMainColumn`의 `mx-auto ...`를 사용
 * - max-width / 좌우 padding: `AppMainColumn` 기준으로 통일
 */
export function DetailPageWrapper({ children, className }: { children: ReactNode; className?: string }) {
  return <AppMainColumn className={cn("min-w-0", className)}>{children}</AppMainColumn>;
}

