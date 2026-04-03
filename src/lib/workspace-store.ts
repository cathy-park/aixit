import type { WorkflowRunStatus } from "@/lib/workflow-run-status";
import type { ProjectLifecycleStatus } from "@/lib/project-lifecycle-status";
import type { DashboardFolderIconType } from "@/lib/dashboard-folders-store";

export type WorkspaceMemoItem = {
  id: string;
  text: string;
};

export type WorkspaceLinkItem = {
  id: string;
  label: string;
  url: string;
};

export type WorkspaceStep = {
  id: string;
  title: string;
  toolIds: string[];
  /** workspace에서만 사용: 이 STEP 전용 메모 */
  memos?: WorkspaceMemoItem[];
  /** 연결 도구가 없을 때 내비게이터에 표시할 이모지·배경색 */
  fallbackEmoji?: string;
  fallbackColor?: string;
  /** 연결 도구가 없을 때 내비게이터 아이콘으로 쓸 이미지 URL (http/https) — 있으면 이모지보다 우선 */
  fallbackImageUrl?: string;
  /** 폴더·카테고리와 동일: 내비 아이콘 종류 (없으면 기존 fallback 필드만으로 추론) */
  navigatorIconType?: DashboardFolderIconType;
  /** navigatorIconType이 lucide일 때 `folder-lucide-icons` 프리셋 id */
  navigatorLucideIcon?: string | null;
};

export type WorkspaceWorkflow = {
  id: string;
  name: string;
  steps: WorkspaceStep[];
  currentStepIndex: number;
  createdAt: number;
  /** 프로젝트를 만든 워크플로우 템플릿 카탈로그 id (aixit-data workflows.id) */
  templateId?: string;
  sourceTaskType?: string;
  /** 대시보드·워크스페이스 공통 상태 */
  status?: WorkflowRunStatus;
  /** 카드 UI·간단 필터용: waiting | in_progress | completed (`status`와 동기화) */
  projectStatus?: ProjectLifecycleStatus;
  /** 사용자 워크플로우 카드 이모지 (없으면 기본) */
  emoji?: string;
  /** 카드 부제목 (대시보드 한 줄 설명) */
  subtitle?: string;
  /** 시작일 ISO (yyyy-mm-dd) */
  startDate?: string;
  /** 마감일 ISO (yyyy-mm-dd) */
  endDate?: string;
  /** 상태가 완료로 바뀐 날(로컬 YYYY-MM-DD) — 캘린더 표시용 */
  completedAt?: string;
  /** workflow 전체 관련 링크 */
  relatedLinks?: WorkspaceLinkItem[];
  /** workflow 전체 공통 메모 */
  workflowMemos?: WorkspaceMemoItem[];
  /** 프로젝트 출처 (예: 메모 승격 시 "idea") */
  origin?: string;
  /** 승격 원본 아이디어(메모) id */
  originIdeaId?: string;
};

const KEY = "aixit.activeWorkflow.v1";

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function saveActiveWorkflow(workflow: WorkspaceWorkflow) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, JSON.stringify(workflow));
}

export function loadActiveWorkflow(): WorkspaceWorkflow | null {
  if (typeof window === "undefined") return null;
  return safeParse<WorkspaceWorkflow>(window.sessionStorage.getItem(KEY));
}

export function clearActiveWorkflow() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY);
}

