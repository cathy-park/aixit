import type { WorkspaceWorkflow } from "@/lib/workspace-store";
import type { WorkflowDetail, WorkflowPreview } from "@/lib/aixit-data";
import { workflows, workflowDetails } from "@/lib/aixit-data";
import { scheduleMdToIso } from "@/lib/date-schedule";
import { tools } from "@/lib/tools";
import type { WorkflowRunStatus } from "@/lib/workflow-run-status";
import { isWorkflowRunStatus } from "@/lib/workflow-run-status";
import { getTodayIsoLocal } from "@/lib/today-project-filter";

export type DashboardWorkflow = WorkspaceWorkflow & {
  updatedAt: number;
  /** 대시보드 폴더 (드래그로 변경 가능) */
  folderId?: string;
};

function makeSeedId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Math.random().toString(16).slice(2)}`;
}

function toolIdForDisplayName(name: string): string | undefined {
  const raw = name.trim();
  if (!raw) return undefined;
  const n = raw.toLowerCase();
  const exact = tools.find((t) => t.name.toLowerCase() === n);
  if (exact) return exact.id;
  const fuzzy = tools.find((t) => {
    const xl = t.name.toLowerCase();
    return n.includes(xl) || xl.includes(n);
  });
  if (fuzzy) return fuzzy.id;
  /** 흔한 한글 단계명 → 시드 도구 (복합 이름은 toolIds로 저장되는 것이 정확) */
  if (n.includes("피그마")) return tools.find((t) => t.id === "tool_figma")?.id;
  if (n.includes("커서") || n === "cursor") return tools.find((t) => t.id === "tool_cursor")?.id;
  if (n.includes("깃허브") || n.includes("github")) return tools.find((t) => t.id === "tool_github")?.id;
  if (n.includes("배포") && n.includes("vercel")) return tools.find((t) => t.id === "tool_vercel")?.id;
  return undefined;
}

/** 템플릿 상세 → 워크스페이스 단계 (미리보기·프로젝트 생성 공통) */
export function templateDetailToWorkspaceSteps(detail: WorkflowDetail): WorkspaceWorkflow["steps"] {
  return detail.steps.map((s, idx) => {
    const fromDetail = (s.toolIds ?? []).filter((x) => typeof x === "string" && x.trim().length > 0);
    const ids = fromDetail.length > 0 ? fromDetail : (() => {
      const tid = toolIdForDisplayName(s.toolName);
      return tid ? [tid] : [];
    })();
    return {
      id: `tpl_step_${detail.id}_${idx}`,
      title: s.toolName,
      toolIds: ids,
      memos: [] as NonNullable<WorkspaceWorkflow["steps"][0]["memos"]>,
    };
  });
}

/** 저장 없이 템플릿 미리보기용 DashboardWorkflow 모델 (프로젝트 상세 UI와 동일 레이아웃) */
export function buildTemplatePreviewDashboardWorkflow(detail: WorkflowDetail, preview: WorkflowPreview): DashboardWorkflow {
  const steps = templateDetailToWorkspaceSteps(detail);
  const done = Math.min(Math.max(0, detail.progress.done), Math.max(0, steps.length - 1));
  const complete = steps.length > 0 && detail.progress.done >= detail.progress.total;
  return normalizeDashboardWorkflow({
    id: `template_preview_${detail.id}`,
    name: detail.title,
    subtitle: preview.subtitle,
    steps,
    currentStepIndex: steps.length > 0 ? done : 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: complete ? "완료" : steps.length === 0 ? "준비중" : "진행중",
    emoji: preview.emoji,
    relatedLinks: detail.links.map((l) => ({ id: makeSeedId(), label: l.label, url: l.href })),
    workflowMemos: detail.memo.map((text) => ({ id: makeSeedId(), text })),
  });
}

/** 내장 샘플을 대시보드·워크스페이스용 레코드로 시드 */
export function seedBuiltinDashboardWorkflow(builtinId: string, layoutFolderId?: string): DashboardWorkflow | null {
  const preview = workflows.find((w) => w.id === builtinId);
  const detail = workflowDetails.find((w) => w.id === builtinId);
  if (!preview || !detail) return null;

  const steps = detail.steps.map((s, idx) => {
    const tid = toolIdForDisplayName(s.toolName);
    return {
      id: s.id && String(s.id).length > 0 ? s.id : `builtin_step_${builtinId}_${idx}`,
      title: s.toolName,
      toolIds: tid ? [tid] : [],
      memos: [] as NonNullable<WorkspaceWorkflow["steps"][0]["memos"]>,
    };
  });

  const done = Math.min(Math.max(0, detail.progress.done), Math.max(0, steps.length - 1));

  const raw: DashboardWorkflow = {
    id: detail.id,
    name: detail.title,
    subtitle: preview.subtitle,
    steps,
    currentStepIndex: done,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    folderId: layoutFolderId ?? preview.folderId,
    status: isWorkflowRunStatus(preview.status) ? preview.status : "진행중",
    emoji: preview.emoji,
    startDate: scheduleMdToIso(detail.schedule.start),
    endDate: scheduleMdToIso(detail.schedule.due),
    relatedLinks: detail.links.map((l) => ({ id: makeSeedId(), label: l.label, url: l.href })),
    workflowMemos: detail.memo.map((text) => ({ id: makeSeedId(), text })),
  };

  return normalizeDashboardWorkflow(raw);
}

/** 로컬스토리지에 예전 형태로 저장된 워크플로우를 최신 필드로 맞춤 */
export function normalizeDashboardWorkflow(wf: DashboardWorkflow): DashboardWorkflow {
  const steps = wf.steps.map((s, idx) => ({
    id: s.id && String(s.id).length > 0 ? s.id : `legacy_${wf.id}_${idx}`,
    title: s.title,
    toolIds: Array.isArray(s.toolIds) ? s.toolIds : [],
    memos: Array.isArray(s.memos) ? s.memos : [],
    fallbackEmoji: typeof s.fallbackEmoji === "string" ? s.fallbackEmoji : undefined,
    fallbackColor: typeof s.fallbackColor === "string" ? s.fallbackColor : undefined,
    fallbackImageUrl: typeof s.fallbackImageUrl === "string" ? s.fallbackImageUrl : undefined,
    navigatorIconType:
      s.navigatorIconType === "emoji" ||
      s.navigatorIconType === "lucide" ||
      s.navigatorIconType === "image_url" ||
      s.navigatorIconType === "image_upload"
        ? s.navigatorIconType
        : undefined,
    navigatorLucideIcon:
      typeof s.navigatorLucideIcon === "string" || s.navigatorLucideIcon === null
        ? s.navigatorLucideIcon
        : undefined,
  }));
  const rawStatus = (wf as { status?: unknown }).status;
  const status = isWorkflowRunStatus(rawStatus)
    ? rawStatus
    : String(rawStatus) === "시작 전"
      ? "준비중"
      : "진행중";
  const rawCompleted = (wf as { completedAt?: unknown }).completedAt;
  const completedAt =
    typeof rawCompleted === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawCompleted) ? rawCompleted : undefined;
  return {
    ...wf,
    steps,
    status,
    subtitle: typeof wf.subtitle === "string" ? wf.subtitle : undefined,
    startDate: typeof wf.startDate === "string" ? wf.startDate : undefined,
    endDate: typeof wf.endDate === "string" ? wf.endDate : undefined,
    completedAt,
    relatedLinks: Array.isArray(wf.relatedLinks) ? wf.relatedLinks : [],
    workflowMemos: Array.isArray(wf.workflowMemos) ? wf.workflowMemos : [],
    templateId: typeof wf.templateId === "string" ? wf.templateId : undefined,
  };
}

function isoDateFromTimestamp(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type CalendarCompletedProject = {
  id: string;
  name: string;
};

/** 완료 상태 프로젝트를 완료일(로컬) 기준으로 묶음. `completedAt` 없으면 `updatedAt` 날짜로 보정 */
export function getCompletedProjectsGroupedByDate(): Record<string, CalendarCompletedProject[]> {
  if (typeof window === "undefined") return {};
  const map: Record<string, CalendarCompletedProject[]> = {};
  for (const raw of listDashboardWorkflows()) {
    const w = normalizeDashboardWorkflow(raw);
    if (w.status !== "완료") continue;
    const iso = w.completedAt ?? isoDateFromTimestamp(w.updatedAt);
    if (!map[iso]) map[iso] = [];
    const name = (w.name || "프로젝트").replace(/\s*workflow\s*$/i, "").trim() || w.name || "프로젝트";
    map[iso].push({ id: w.id, name });
  }
  return map;
}

const CAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 캘린더에서 완료 프로젝트를 다른 날짜로 옮김 → `completedAt`(YYYY-MM-DD) 갱신 후 저장 */
export function reassignCompletedProjectCalendarDate(workflowId: string, newDateIso: string): boolean {
  if (typeof window === "undefined") return false;
  if (!CAL_DATE_RE.test(newDateIso)) return false;
  const w = getDashboardWorkflow(workflowId);
  if (!w || w.status !== "완료") return false;
  saveDashboardWorkflow({ ...w, completedAt: newDateIso });
  return true;
}

function newWorkflowItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function newUserWorkflowId() {
  return `wf_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 10)}`;
}

/** 저장된 프로젝트 인스턴스 id — 내장 템플릿 slug(예: night-coding)와 URL에서 혼동되지 않게 구분 */
export function isDashboardProjectInstanceId(id: string): boolean {
  return id.startsWith("wf_");
}

const KEY = "aixit.dashboardWorkflows.v1";

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function listDashboardWorkflows(): DashboardWorkflow[] {
  if (typeof window === "undefined") return [];
  const raw = safeParse<DashboardWorkflow[]>(window.localStorage.getItem(KEY));
  return Array.isArray(raw) ? raw : [];
}

/** 템플릿 카탈로그 id로 만든 프로젝트만, 최근 수정 순 */
export function listDashboardWorkflowsByTemplateId(catalogTemplateId: string): DashboardWorkflow[] {
  return listDashboardWorkflows()
    .filter((w) => w.templateId === catalogTemplateId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** 저장된 워크플로우 단계에서 해당 도구가 연결된 횟수(단계별 1회) */
export function countToolUsageInStoredWorkflows(toolId: string): number {
  let n = 0;
  for (const w of listDashboardWorkflows()) {
    for (const step of w.steps) {
      if (step.toolIds.includes(toolId)) n += 1;
    }
  }
  return n;
}

export function getDashboardWorkflow(id: string): DashboardWorkflow | null {
  const found = listDashboardWorkflows().find((w) => w.id === id) ?? null;
  return found ? normalizeDashboardWorkflow(found) : null;
}

function writeAll(workflows: DashboardWorkflow[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(workflows));
  window.dispatchEvent(new CustomEvent("aixit-workflows-updated"));
}

/** recommendation에서 생성한 워크플로우를 대시보드 목록에 추가 */
export function addDashboardWorkflow(workflow: WorkspaceWorkflow & { folderId?: string }): DashboardWorkflow {
  const now = Date.now();
  const stored = normalizeDashboardWorkflow({
    ...workflow,
    status: workflow.status ?? "진행중",
    updatedAt: now,
    folderId: workflow.folderId ?? "ddokdi",
  });
  if (typeof window === "undefined") return stored;
  const list = listDashboardWorkflows();
  writeAll([stored, ...list.filter((w) => w.id !== stored.id)]);
  return stored;
}

/** 사용자 워크플로우만 스토리지에서 제거 */
export function removeDashboardWorkflow(workflowId: string) {
  if (typeof window === "undefined") return;
  const list = listDashboardWorkflows().filter((w) => w.id !== workflowId);
  writeAll(list);
}

/** workspace에서 진행 상태 등 변경 시 저장 */
export function saveDashboardWorkflow(workflow: DashboardWorkflow) {
  const next: DashboardWorkflow = { ...workflow, updatedAt: Date.now() };
  if (typeof window === "undefined") return;
  const list = listDashboardWorkflows();
  const idx = list.findIndex((w) => w.id === next.id);
  if (idx === -1) {
    writeAll([next, ...list]);
    return;
  }
  const copy = [...list];
  copy[idx] = next;
  writeAll(copy);
}

/** 대시보드 카드 등에서 워크스페이스 없이 실행 상태만 갱신 */
export function setDashboardWorkflowRunStatus(workflowId: string, status: WorkflowRunStatus): boolean {
  if (typeof window === "undefined") return false;
  const w = getDashboardWorkflow(workflowId);
  if (!w) return false;
  if (!isWorkflowRunStatus(status)) return false;
  const completedAt = status === "완료" ? getTodayIsoLocal() : undefined;
  saveDashboardWorkflow({ ...w, status, completedAt });
  return true;
}

export function setDashboardWorkflowFolder(workflowId: string, folderId: string) {
  if (typeof window === "undefined") return;
  const list = listDashboardWorkflows();
  const idx = list.findIndex((w) => w.id === workflowId);
  if (idx < 0) return;
  const copy = [...list];
  copy[idx] = { ...copy[idx], folderId, updatedAt: Date.now() };
  writeAll(copy);
}

/**
 * 템플릿 카탈로그 id 기준으로 새 프로젝트(저장된 인스턴스)를 만듭니다.
 * 레이아웃에는 호출 측에서 `appendUserLayoutEntry` 등으로 반영하세요.
 */
export function createProjectFromTemplate(templateCatalogId: string, folderId: string): DashboardWorkflow | null {
  const preview = workflows.find((w) => w.id === templateCatalogId);
  const detail = workflowDetails.find((w) => w.id === templateCatalogId);
  if (!preview || !detail) return null;

  const steps = templateDetailToWorkspaceSteps(detail).map((s, idx) => ({
    ...s,
    id: `step_${newWorkflowItemId()}_${idx}`,
  }));

  const name = detail.title.replace(/\s*workflow\s*$/i, "").trim() || detail.title;

  // TemplateWorkspaceReadonly의 미리보기 build 로직과 동일하게 초기 진행도/상태를 맞춥니다.
  const done = Math.min(Math.max(0, detail.progress.done), Math.max(0, steps.length - 1));
  const complete = steps.length > 0 && detail.progress.done >= detail.progress.total;
  const status = complete ? "완료" : steps.length === 0 ? "준비중" : "진행중";

  const wf: DashboardWorkflow = normalizeDashboardWorkflow({
    id: newUserWorkflowId(),
    templateId: templateCatalogId,
    name,
    subtitle: preview.subtitle,
    steps,
    currentStepIndex: steps.length > 0 ? done : 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    folderId,
    status,
    emoji: preview.emoji,
    startDate: undefined,
    endDate: undefined,
    // 미리보기에서 노출되는 링크/메모를 그대로 복제합니다.
    relatedLinks: detail.links.map((l) => ({ id: makeSeedId(), label: l.label, url: l.href })),
    workflowMemos: detail.memo.map((text) => ({ id: makeSeedId(), text })),
  });

  addDashboardWorkflow(wf);
  return getDashboardWorkflow(wf.id);
}

/** 템플릿 없이 빈 프로젝트 1건을 저장하고 반환합니다. */
export function createBlankProject(folderId: string): DashboardWorkflow {
  const id = newUserWorkflowId();
  const raw: DashboardWorkflow = normalizeDashboardWorkflow({
    id,
    name: "새 프로젝트",
    steps: [{ id: newWorkflowItemId(), title: "1단계", toolIds: [], memos: [] }],
    currentStepIndex: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    folderId,
    status: "준비중",
    emoji: "📋",
    relatedLinks: [],
    workflowMemos: [],
  });
  addDashboardWorkflow(raw);
  return getDashboardWorkflow(id)!;
}

/**
 * 현재 데이터를 그대로 복제한 사용자 워크플로우를 새 id로 저장합니다.
 * 내장·사용자 원본 모두 `ensureDashboardWorkflow`로 불러온 뒤 복사합니다.
 */
export function duplicateDashboardWorkflowAsUser(sourceWorkflowId: string, folderId: string): DashboardWorkflow | null {
  const base = ensureDashboardWorkflow(sourceWorkflowId, folderId);
  if (!base) return null;
  const newId = newUserWorkflowId();
  const cloned = normalizeDashboardWorkflow({
    ...base,
    id: newId,
    /** 동일 템플릿 출처 유지 → 워크플로 템플릿 상세에서 `listDashboardWorkflowsByTemplateId`로 복사본도 찾아 "프로젝트 열기(수정)" 가능 */
    completedAt: undefined,
    status: "진행중",
    name: `${base.name.trim()} (복사본)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    folderId,
    currentStepIndex: Math.min(base.currentStepIndex, Math.max(0, base.steps.length - 1)),
    steps: base.steps.map((s) => ({
      id: newWorkflowItemId(),
      title: s.title,
      toolIds: [...s.toolIds],
      memos: (s.memos ?? []).map((m) => ({ id: newWorkflowItemId(), text: m.text })),
      fallbackEmoji: s.fallbackEmoji,
      fallbackColor: s.fallbackColor,
      fallbackImageUrl: s.fallbackImageUrl,
      navigatorIconType: s.navigatorIconType,
      navigatorLucideIcon: s.navigatorLucideIcon,
    })),
    relatedLinks: (base.relatedLinks ?? []).map((l) => ({
      id: newWorkflowItemId(),
      label: l.label,
      url: l.url,
    })),
    workflowMemos: (base.workflowMemos ?? []).map((m) => ({
      id: newWorkflowItemId(),
      text: m.text,
    })),
  });
  addDashboardWorkflow(cloned);
  return getDashboardWorkflow(newId);
}

/** 프로젝트(저장된 인스턴스)만 반환. 템플릿 id로는 시드하지 않습니다. */
export function ensureDashboardWorkflow(id: string, layoutFolderId?: string): DashboardWorkflow | null {
  const existing = getDashboardWorkflow(id);
  if (existing) {
    if (layoutFolderId && existing.folderId !== layoutFolderId) {
      saveDashboardWorkflow({ ...existing, folderId: layoutFolderId });
      return getDashboardWorkflow(id);
    }
    return existing;
  }
  return null;
}
