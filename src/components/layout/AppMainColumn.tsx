import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/** 헤더와 같은 최대 폭·좌우 패딩 — 2열 카드(min 560px)가 들어갈 수 있도록 여유 폭 */
export const appMainColumnClass = "mx-auto w-full max-w-[min(100%,1240px)] px-4 sm:px-6";

export function AppMainColumn({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(appMainColumnClass, className)}>{children}</div>;
}
