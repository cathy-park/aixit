import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/** 헤더와 같은 최대 폭·좌우 패딩 — 본문만 이 안에 넣습니다. */
export const appMainColumnClass = "mx-auto w-full max-w-[1100px] px-4 sm:px-6";

export function AppMainColumn({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(appMainColumnClass, className)}>{children}</div>;
}
