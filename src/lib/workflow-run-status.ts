/** workspace / dashboard 공통 워크플로우 상태 */
export type WorkflowRunStatus = "완료" | "진행중" | "준비중" | "보류" | "중단";

export const WORKFLOW_STATUS_OPTIONS: WorkflowRunStatus[] = ["진행중", "준비중", "보류", "완료", "중단"];

export function isWorkflowRunStatus(v: unknown): v is WorkflowRunStatus {
  return v === "완료" || v === "진행중" || v === "준비중" || v === "보류" || v === "중단";
}

/** 대시보드 리스트 구역 헤더 — WorkflowCard 상태 칩과 같은 색조 */
export function statusSectionHeaderClass(status: WorkflowRunStatus): string {
  switch (status) {
    case "진행중":
      return "bg-sky-50 text-sky-800 ring-sky-200";
    case "보류":
      return "bg-orange-50 text-orange-800 ring-orange-200/90";
    case "준비중":
      return "bg-zinc-100 text-zinc-800 ring-zinc-200";
    case "완료":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "중단":
      return "bg-rose-50 text-rose-800 ring-rose-200";
    default:
      return "bg-zinc-100 text-zinc-800 ring-zinc-200";
  }
}

export function statusSectionSignalClass(status: WorkflowRunStatus): string {
  switch (status) {
    case "진행중":
      return "text-sky-500";
    case "보류":
      return "text-orange-500";
    case "준비중":
      return "text-zinc-500";
    case "완료":
      return "text-emerald-500";
    case "중단":
      return "text-rose-500";
    default:
      return "text-zinc-500";
  }
}
