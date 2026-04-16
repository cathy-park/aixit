/** workspace / dashboard 공통 워크플로우 상태 */
export type WorkflowRunStatus = "시작전" | "준비중" | "진행중" | "보류" | "중단" | "완료";

export const WORKFLOW_STATUS_OPTIONS: WorkflowRunStatus[] = ["시작전", "준비중", "진행중", "보류", "중단", "완료"];

/** 프로젝트 카드·노출 필터와 동일한 6단계·표시 순서 */
export const WORKFLOW_CARD_STATUS_OPTIONS: WorkflowRunStatus[] = [
  "시작전",
  "준비중",
  "진행중",
  "보류",
  "중단",
  "완료",
];

export function isWorkflowRunStatus(v: unknown): v is WorkflowRunStatus {
  return (
    v === "시작전" || v === "준비중" || v === "진행중" || v === "보류" || v === "중단" || v === "완료"
  );
}

/** 대시보드 리스트 구역 헤더 — WorkflowCard 상태 칩과 같은 색조 */
export function statusSectionHeaderClass(status: WorkflowRunStatus): string {
  switch (status) {
    case "시작전":
      return "bg-slate-50 text-slate-700 ring-slate-200";
    case "진행중":
      return "bg-sky-50 text-sky-800 ring-sky-200";
    case "보류":
      return "bg-orange-50 text-orange-800 ring-orange-200/90";
    case "준비중":
      return "bg-amber-50 text-amber-800 ring-amber-200";
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
    case "시작전":
      return "text-slate-400";
    case "진행중":
      return "text-sky-500";
    case "보류":
      return "text-orange-500";
    case "준비중":
      return "text-amber-500";
    case "완료":
      return "text-emerald-500";
    case "중단":
      return "text-rose-500";
    default:
      return "text-zinc-500";
  }
}
