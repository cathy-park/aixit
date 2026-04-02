const KEY = "aixit.removedWorkflowTemplateIds.v1";
export const REMOVED_WORKFLOW_TEMPLATES_EVENT = "aixit-removed-workflow-templates-updated";

function safeParse(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as string[]).filter((x) => typeof x === "string") : null;
  } catch {
    return null;
  }
}

function dispatch() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(REMOVED_WORKFLOW_TEMPLATES_EVENT));
}

export function loadRemovedWorkflowTemplateIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const arr = safeParse(window.localStorage.getItem(KEY));
  return new Set(arr ?? []);
}

function saveRemoved(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify([...ids]));
  dispatch();
}

/** 라이브러리 목록에서만 제거(데이터 삭제 아님). */
export function addRemovedWorkflowTemplateId(templateId: string) {
  const next = loadRemovedWorkflowTemplateIds();
  if (next.has(templateId)) return;
  next.add(templateId);
  saveRemoved(next);
}
