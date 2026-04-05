import type { WorkflowDetail, WorkflowPreview, WorkflowTemplateListItem } from "@/lib/aixit-data";
import { getWorkflowTemplateCategoryLabelStatic } from "@/lib/workflow-template-folders-store";
import type { DashboardWorkflow } from "@/lib/workflows-store";
import {
  addDashboardWorkflow,
  getDashboardWorkflow,
  normalizeDashboardWorkflow,
  newUserWorkflowId,
} from "@/lib/workflows-store";

const KEY = "aixit.userWorkflowTemplates.v1";

export const WORKFLOW_USER_TEMPLATE_PREFIX = "user_tpl_";

export const USER_WORKFLOW_TEMPLATES_EVENT = "aixit-user-workflow-templates-updated";

export type UserWorkflowTemplateStep = {
  toolName: string;
  toolIds: string[];
};

export type UserWorkflowTemplateRecord = {
  id: string;
  categoryId: string;
  title: string;
  subtitle: string;
  emoji: string;
  steps: UserWorkflowTemplateStep[];
  links: Array<{ label: string; href: string }>;
  memos: string[];
  createdAt: number;
  sourceWorkflowId?: string;
};

function newTemplateId() {
  return `${WORKFLOW_USER_TEMPLATE_PREFIX}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function newStepId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `step_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(USER_WORKFLOW_TEMPLATES_EVENT));
}

function normalizeRecord(raw: unknown): UserWorkflowTemplateRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.id.startsWith(WORKFLOW_USER_TEMPLATE_PREFIX)) return null;
  if (typeof o.categoryId !== "string" || typeof o.title !== "string") return null;
  const subtitle = typeof o.subtitle === "string" ? o.subtitle : "";
  const emoji = typeof o.emoji === "string" ? o.emoji : "📋";
  const createdAt = typeof o.createdAt === "number" ? o.createdAt : 0;
  const stepsRaw = o.steps;
  const steps: UserWorkflowTemplateStep[] = [];
  if (Array.isArray(stepsRaw)) {
    for (const s of stepsRaw) {
      if (!s || typeof s !== "object") continue;
      const st = s as Record<string, unknown>;
      const toolName = typeof st.toolName === "string" ? st.toolName : "단계";
      const toolIds = Array.isArray(st.toolIds)
        ? st.toolIds.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        : [];
      steps.push({ toolName, toolIds });
    }
  }
  const linksRaw = o.links;
  const links: Array<{ label: string; href: string }> = [];
  if (Array.isArray(linksRaw)) {
    for (const l of linksRaw) {
      if (!l || typeof l !== "object") continue;
      const lr = l as Record<string, unknown>;
      if (typeof lr.label === "string" && typeof lr.href === "string") links.push({ label: lr.label, href: lr.href });
    }
  }
  const memosRaw = o.memos;
  const memos = Array.isArray(memosRaw) ? memosRaw.filter((x): x is string => typeof x === "string") : [];
  const sourceWorkflowId = typeof o.sourceWorkflowId === "string" ? o.sourceWorkflowId : undefined;
  return { id: o.id, categoryId: o.categoryId, title: o.title, subtitle, emoji, steps, links, memos, createdAt, sourceWorkflowId };
}

export function loadUserWorkflowTemplates(): UserWorkflowTemplateRecord[] {
  if (typeof window === "undefined") return [];
  const raw = safeParse<unknown[]>(window.localStorage.getItem(KEY));
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeRecord).filter((x): x is UserWorkflowTemplateRecord => x != null);
}

function saveAll(list: UserWorkflowTemplateRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  notify();
}

export function isUserWorkflowTemplateId(id: string): boolean {
  return id.startsWith(WORKFLOW_USER_TEMPLATE_PREFIX);
}

export function getUserWorkflowTemplateById(id: string): UserWorkflowTemplateRecord | null {
  return loadUserWorkflowTemplates().find((t) => t.id === id) ?? null;
}

/** URL 슬러그(= 저장 id)로 조회 */
export function getUserWorkflowTemplateBySlug(slug: string): UserWorkflowTemplateRecord | null {
  return getUserWorkflowTemplateById(slug);
}

export function updateUserWorkflowTemplateCategory(templateId: string, categoryId: string): boolean {
  const list = loadUserWorkflowTemplates();
  const idx = list.findIndex((t) => t.id === templateId);
  if (idx < 0) return false;
  const next = [...list];
  next[idx] = { ...next[idx], categoryId };
  saveAll(next);
  return true;
}

/** 내 워크플로 템플릿 상세에서 제목/설명(서브타이틀) 편집 시 저장 */
export function updateUserWorkflowTemplateMeta(
  templateId: string,
  payload: { title: string; subtitle: string },
): boolean {
  const list = loadUserWorkflowTemplates();
  const idx = list.findIndex((t) => t.id === templateId);
  if (idx < 0) return false;
  const next = [...list];
  next[idx] = { ...next[idx], title: payload.title, subtitle: payload.subtitle };
  saveAll(next);
  return true;
}

/** 내 워크플로 템플릿 상세에서 관련 링크·공통 메모 편집 시 저장 */
export function updateUserWorkflowTemplateLinksAndMemos(
  templateId: string,
  payload: { links: Array<{ label: string; href: string }>; memos: string[] },
): boolean {
  const list = loadUserWorkflowTemplates();
  const idx = list.findIndex((t) => t.id === templateId);
  if (idx < 0) return false;
  const next = [...list];
  next[idx] = { ...next[idx], links: payload.links, memos: payload.memos };
  saveAll(next);
  return true;
}

/** 내 템플릿 상세에서 STEP 이름·도구 구성 편집 시 저장 */
export function updateUserWorkflowTemplateSteps(templateId: string, steps: UserWorkflowTemplateStep[]): boolean {
  const list = loadUserWorkflowTemplates();
  const idx = list.findIndex((t) => t.id === templateId);
  if (idx < 0) return false;
  const normalized = steps.map((s) => ({
    toolName: typeof s.toolName === "string" && s.toolName.trim() ? s.toolName.trim() : "단계",
    toolIds: [...(s.toolIds ?? []).filter((x) => typeof x === "string" && x.trim())],
  }));
  if (normalized.length === 0) return false;
  const next = [...list];
  next[idx] = { ...next[idx], steps: normalized };
  saveAll(next);
  return true;
}

export type CreateUserWorkflowTemplateBlueprint = {
  categoryId: string;
  title: string;
  subtitle: string;
  emoji?: string;
  steps: Array<{ title: string; toolIds: string[] }>;
};

/** 추천/빌더 UI에서 템플릿만 저장 (프로젝트 생성 없음) */
export function createUserWorkflowTemplateBlueprint(params: CreateUserWorkflowTemplateBlueprint): UserWorkflowTemplateRecord {
  const steps: UserWorkflowTemplateStep[] =
    params.steps.length > 0
      ? params.steps.map((s) => ({
          toolName: s.title.trim() || "단계",
          toolIds: [...(s.toolIds ?? []).filter((x) => typeof x === "string" && x.trim())],
        }))
      : [{ toolName: "1단계", toolIds: [] }];
  const rec: UserWorkflowTemplateRecord = {
    id: newTemplateId(),
    categoryId: params.categoryId,
    title: params.title.trim() || "내 템플릿",
    subtitle: typeof params.subtitle === "string" ? params.subtitle.trim() : "",
    emoji: params.emoji?.trim() || "📋",
    steps,
    links: [],
    memos: [],
    createdAt: Date.now(),
  };
  const list = loadUserWorkflowTemplates();
  saveAll([rec, ...list]);
  return rec;
}

function toolNameForStep(
  step: DashboardWorkflow["steps"][0],
  resolveTool: (toolId: string) => { name: string } | undefined,
): string {
  for (const tid of step.toolIds ?? []) {
    const id = typeof tid === "string" ? tid.trim() : "";
    if (!id) continue;
    const t = resolveTool(id);
    if (t?.name) return t.name;
  }
  return step.title?.trim() || "단계";
}

export type AddUserTemplateFromDashboardMeta = {
  /** 비어 있으면 프로젝트 이름으로 보정 */
  title: string;
  subtitle: string;
};

/**
 * 프로젝트 → 내 워크플로 템플릿. 단계·도구 구성만 복사하고 링크·공통 메모는 넣지 않습니다.
 */
export function addUserWorkflowTemplateFromDashboard(
  wf: DashboardWorkflow,
  categoryId: string,
  resolveTool: (toolId: string) => { name: string } | undefined,
  meta: AddUserTemplateFromDashboardMeta,
): UserWorkflowTemplateRecord {
  const steps: UserWorkflowTemplateStep[] = wf.steps.map((s) => ({
    toolName: toolNameForStep(s, resolveTool),
    toolIds: [...(s.toolIds ?? []).filter((x) => typeof x === "string" && x.trim())],
  }));
  const title = meta.title.trim() || wf.name.trim() || "내 템플릿";
  const subtitle = typeof meta.subtitle === "string" ? meta.subtitle.trim() : "";
  const rec: UserWorkflowTemplateRecord = {
    id: newTemplateId(),
    categoryId,
    title,
    subtitle,
    emoji: wf.emoji ?? "📋",
    steps: steps.length > 0 ? steps : [{ toolName: "1단계", toolIds: [] }],
    links: [],
    memos: [],
    createdAt: Date.now(),
    sourceWorkflowId: wf.id,
  };
  const list = loadUserWorkflowTemplates();
  saveAll([rec, ...list]);
  return rec;
}

function previewToolIdsFromSteps(steps: UserWorkflowTemplateStep[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of steps) {
    for (const id of s.toolIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      if (out.length >= 3) return out;
    }
  }
  return out;
}

export function userWorkflowTemplateToDetail(rec: UserWorkflowTemplateRecord): WorkflowDetail {
  const steps = rec.steps.map((s, i) => ({
    id: `ut-${rec.id}-${i}`,
    toolName: s.toolName,
    statusLabel: "대기",
    toolIds: [...s.toolIds],
  }));
  return {
    id: rec.id,
    slug: rec.id,
    title: rec.title,
    emoji: rec.emoji,
    progress: { done: 0, total: Math.max(1, steps.length), percentLabel: "0%" },
    steps,
    schedule: { start: "—", due: "—", budget: "—" },
    people: [],
    links: rec.links.map((l) => ({ label: l.label, href: l.href })),
    memo: rec.memos.length ? rec.memos : [],
  };
}

export function userWorkflowTemplateToPreview(rec: UserWorkflowTemplateRecord): WorkflowPreview {
  const total = Math.max(1, rec.steps.length);
  const title = rec.title.replace(/\s*workflow\s*$/i, "").trim() || rec.title;
  return {
    id: rec.id,
    folderId: rec.categoryId,
    title,
    subtitle: rec.subtitle,
    status: "준비중",
    emoji: rec.emoji,
    href: `/workflow/${encodeURIComponent(rec.id)}`,
    stepsCompleted: 0,
    stepsTotal: total,
    stepsDone: 0,
    ddayLabel: "—",
    progressPercentLabel: "0%",
    progressPercent: 0,
    toolsCount: previewToolIdsFromSteps(rec.steps).length,
    previewToolIds: previewToolIdsFromSteps(rec.steps),
  };
}

export function listUserWorkflowTemplateListItems(): WorkflowTemplateListItem[] {
  return loadUserWorkflowTemplates().map((rec) => {
    const title = rec.title.replace(/\s*workflow\s*$/i, "").trim() || rec.title;
    return {
      templateId: rec.id,
      slug: rec.id,
      title,
      subtitle: rec.subtitle,
      emoji: rec.emoji,
      categoryId: rec.categoryId,
      categoryLabel: getWorkflowTemplateCategoryLabelStatic(rec.categoryId),
      stepCount: rec.steps.length,
      previewToolIds: previewToolIdsFromSteps(rec.steps),
    };
  });
}

/** 템플릿에서 새 프로젝트 인스턴스 생성 */
export function createProjectFromUserTemplate(templateId: string, folderId: string): DashboardWorkflow | null {
  const rec = getUserWorkflowTemplateById(templateId);
  if (!rec) return null;

  const steps = rec.steps.map((s, idx) => ({
    id: `${newStepId()}_${idx}`,
    title: s.toolName,
    toolIds: [...s.toolIds],
    memos: [] as NonNullable<DashboardWorkflow["steps"][0]["memos"]>,
  }));

  const name = rec.title.replace(/\s*workflow\s*$/i, "").trim() || rec.title;

  const status = steps.length > 0 ? "진행중" : "준비중";

  const wf = normalizeDashboardWorkflow({
    id: newUserWorkflowId(),
    templateId,
    name,
    subtitle: rec.subtitle,
    steps,
    currentStepIndex: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    folderId,
    status,
    emoji: rec.emoji || "📋",
    startDate: undefined,
    endDate: undefined,
    relatedLinks: rec.links.map((l) => ({ id: newStepId(), label: l.label, url: l.href })),
    workflowMemos: rec.memos.map((text) => ({ id: newStepId(), text })),
  });

  addDashboardWorkflow(wf);
  return getDashboardWorkflow(wf.id);
}
