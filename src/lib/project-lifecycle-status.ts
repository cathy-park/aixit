import type { WorkflowRunStatus } from "@/lib/workflow-run-status";

/** 카드·저장용 프로젝트 간단 상태 (영문 키) */
export type ProjectLifecycleStatus = "waiting" | "in_progress" | "completed";

export function isProjectLifecycleStatus(v: unknown): v is ProjectLifecycleStatus {
  return v === "waiting" || v === "in_progress" || v === "completed";
}

export const PROJECT_LIFECYCLE_OPTIONS: ProjectLifecycleStatus[] = ["waiting", "in_progress", "completed"];

export const PROJECT_LIFECYCLE_LABEL: Record<ProjectLifecycleStatus, string> = {
  waiting: "대기",
  in_progress: "진행중",
  completed: "완료",
};

/** WorkflowRunStatus → 카드 상태 (보류·중단은 진행중에 귀속) */
export function runStatusToProjectLifecycle(status: WorkflowRunStatus): ProjectLifecycleStatus {
  if (status === "완료") return "completed";
  if (status === "준비중") return "waiting";
  return "in_progress";
}

export function projectLifecycleToRunStatus(ps: ProjectLifecycleStatus): WorkflowRunStatus {
  if (ps === "completed") return "완료";
  if (ps === "waiting") return "준비중";
  return "진행중";
}

export function deriveStoredProjectStatus(
  wf: { projectStatus?: unknown },
  status: WorkflowRunStatus,
): ProjectLifecycleStatus {
  const raw = wf.projectStatus;
  if (isProjectLifecycleStatus(raw)) return raw;
  return runStatusToProjectLifecycle(status);
}
