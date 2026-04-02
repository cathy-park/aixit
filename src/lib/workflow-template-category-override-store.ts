const KEY = "aixit.workflowTemplateCategoryOverrides.v1";

export const TEMPLATE_CATEGORY_OVERRIDE_EVENT = "aixit-template-category-override-updated";

function dispatch() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TEMPLATE_CATEGORY_OVERRIDE_EVENT));
}

function safeParse(raw: string | null): Record<string, string> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof val === "string" && val.trim()) out[k] = val;
    }
    return out;
  } catch {
    return null;
  }
}

/** 내장 템플릿만: 라이브러리에서 보이는 폴더(category) 재지정 */
export function loadWorkflowTemplateCategoryOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {};
  return safeParse(window.localStorage.getItem(KEY)) ?? {};
}

export function getWorkflowTemplateCategoryOverride(templateId: string): string | undefined {
  return loadWorkflowTemplateCategoryOverrides()[templateId];
}

export function setWorkflowTemplateCategoryOverride(templateId: string, categoryId: string) {
  if (typeof window === "undefined") return;
  const cur = loadWorkflowTemplateCategoryOverrides();
  const next = { ...cur, [templateId]: categoryId };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  dispatch();
}
