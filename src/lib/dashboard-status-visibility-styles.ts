import type { WorkflowRunStatus } from "@/lib/workflow-run-status";

/** 대시보드·메모 공통 — 노출 상태 칩(on/off) 스타일 */
export function statusVisibilityPillClass(status: WorkflowRunStatus, on: boolean) {
  if (!on) return "bg-zinc-100 text-zinc-400 ring-zinc-200";
  switch (status) {
    case "진행중":
      return "bg-sky-50 text-sky-800 ring-sky-200";
    case "보류":
      return "bg-orange-50 text-orange-800 ring-orange-200";
    case "중단":
      return "bg-rose-50 text-rose-800 ring-rose-200";
    case "준비중":
      return "bg-zinc-100 text-zinc-800 ring-zinc-200";
    case "완료":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    default:
      return "bg-zinc-100 text-zinc-800 ring-zinc-200";
  }
}
