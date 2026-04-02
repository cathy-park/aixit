import type { DashboardFolderIconType, DashboardFolderRecord } from "@/lib/dashboard-folders-store";

/** 워크플로우 템플릿 라이브러리 전용 카테고리 폴더 (개발/디자인/기획 등) */
export type WorkflowTemplateFolderRecord = DashboardFolderRecord;

const KEY = "aixit.workflowTemplateFolders.v1";

const SEED: WorkflowTemplateFolderRecord[] = [
  { id: "wf-cat-plan", name: "기획", emoji: "📋", iconType: "emoji", color: "#6366f1" },
  { id: "wf-cat-design", name: "디자인", emoji: "🎨", iconType: "emoji", color: "#a855f7" },
  { id: "wf-cat-dev", name: "개발", emoji: "💻", iconType: "emoji", color: "#0ea5e9" },
];

/** 기본 워크플로우 카테고리 — 숨김/삭제·칩 더보기 제한용 */
export const BUILTIN_WORKFLOW_TEMPLATE_FOLDER_IDS = new Set(SEED.map((f) => f.id));

export function isBuiltInWorkflowTemplateFolder(id: string): boolean {
  return BUILTIN_WORKFLOW_TEMPLATE_FOLDER_IDS.has(id);
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeFolder(f: WorkflowTemplateFolderRecord): WorkflowTemplateFolderRecord {
  const raw = f.iconType as string;
  let iconType: DashboardFolderIconType = "emoji";
  if (raw === "image") {
    const url = (f.imageDataUrl ?? "").trim();
    iconType = url.startsWith("data:") ? "image_upload" : "image_url";
  } else if (raw === "lucide" || raw === "image_url" || raw === "image_upload" || raw === "emoji") {
    iconType = raw;
  }

  const imageDataUrl =
    iconType === "image_url" || iconType === "image_upload" ? (f.imageDataUrl ?? null) : null;

  const lucideIcon = iconType === "lucide" ? (f.lucideIcon?.trim() || "FolderOpen") : null;

  const emoji =
    iconType === "emoji" ? (f.emoji || "📁") : iconType === "lucide" ? "" : f.emoji || "📁";

  return {
    id: f.id,
    name: f.name || "이름 없음",
    emoji,
    iconType,
    imageDataUrl,
    lucideIcon,
    color: f.color && /^#[0-9A-Fa-f]{6}$/.test(f.color) ? f.color : "#64748b",
    hidden: Boolean(f.hidden),
  };
}

export function loadWorkflowTemplateFolders(): WorkflowTemplateFolderRecord[] {
  if (typeof window === "undefined") return [...SEED];
  const raw = safeParse<WorkflowTemplateFolderRecord[]>(window.localStorage.getItem(KEY));
  if (!raw || !Array.isArray(raw) || raw.length === 0) {
    const initial = [...SEED];
    window.localStorage.setItem(KEY, JSON.stringify(initial));
    return initial;
  }
  return raw.map(normalizeFolder);
}

export function saveWorkflowTemplateFolders(folders: WorkflowTemplateFolderRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(folders.map(normalizeFolder)));
  window.dispatchEvent(new CustomEvent("aixit-workflow-template-folders-updated"));
}

/** 숨김이 아닌 카테고리만 순서 변경. `beforeId` 앞에 삽입, null이면 맨 뒤. */
export function reorderWorkflowTemplateFolderBefore(dragId: string, beforeId: string | null) {
  const all = loadWorkflowTemplateFolders();
  const visible = all.filter((f) => !f.hidden);
  const fromIdx = visible.findIndex((f) => f.id === dragId);
  if (fromIdx < 0) return;
  if (beforeId === dragId) return;

  const [moved] = visible.splice(fromIdx, 1);

  if (beforeId == null) {
    visible.push(moved);
  } else {
    const i = visible.findIndex((f) => f.id === beforeId);
    if (i < 0) visible.push(moved);
    else visible.splice(i, 0, moved);
  }

  let vi = 0;
  const next = all.map((f) => (f.hidden ? f : visible[vi++]));
  saveWorkflowTemplateFolders(next);
}

export function addWorkflowTemplateFolder(
  data: Omit<WorkflowTemplateFolderRecord, "id"> & { id?: string },
): WorkflowTemplateFolderRecord {
  const id = data.id ?? `wf_cat_${Date.now().toString(16)}`;
  const list = loadWorkflowTemplateFolders();
  const record = normalizeFolder({ ...data, id } as WorkflowTemplateFolderRecord);
  saveWorkflowTemplateFolders([...list, record]);
  return record;
}

export function updateWorkflowTemplateFolder(id: string, patch: Partial<WorkflowTemplateFolderRecord>) {
  const list = loadWorkflowTemplateFolders();
  const idx = list.findIndex((f) => f.id === id);
  if (idx < 0) return;
  const next = [...list];
  next[idx] = normalizeFolder({ ...next[idx], ...patch, id });
  saveWorkflowTemplateFolders(next);
}

export function removeWorkflowTemplateFolder(id: string) {
  const list = loadWorkflowTemplateFolders().filter((f) => f.id !== id);
  saveWorkflowTemplateFolders(list);
}

export function getWorkflowTemplateFolder(id: string): WorkflowTemplateFolderRecord | undefined {
  return loadWorkflowTemplateFolders().find((f) => f.id === id);
}

/** SSR·초기 렌더용: id로 시드 카테고리 이름 */
export function getWorkflowTemplateCategoryLabelStatic(id: string): string {
  return SEED.find((f) => f.id === id)?.name ?? "기타";
}
