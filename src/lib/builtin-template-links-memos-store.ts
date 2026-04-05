import type { WorkflowDetail } from "@/lib/aixit-data";

const KEY = "aixit.builtinTemplateLinksMemos.v1";

export const BUILTIN_TEMPLATE_LINKS_MEMOS_EVENT = "aixit-builtin-template-links-memos-updated";

export type BuiltinTemplateLinksMemosPayload = {
  links: Array<{ label: string; href: string }>;
  memos: string[];
  /** 카탈로그 STEP과 같은 순서의 표시 이름(로컬 오버라이드) */
  stepTitles?: string[];
};

function safeParse(raw: string | null): Record<string, BuiltinTemplateLinksMemosPayload> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    return v as Record<string, BuiltinTemplateLinksMemosPayload>;
  } catch {
    return null;
  }
}

function normalizePayload(raw: unknown): BuiltinTemplateLinksMemosPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
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
  const stRaw = o.stepTitles;
  const stepTitles = Array.isArray(stRaw) ? stRaw.filter((x): x is string => typeof x === "string") : undefined;
  return { links, memos, ...(stepTitles?.length ? { stepTitles } : {}) };
}

export function loadBuiltinTemplateLinksMemosOverrides(): Record<string, BuiltinTemplateLinksMemosPayload> {
  if (typeof window === "undefined") return {};
  const parsed = safeParse(window.localStorage.getItem(KEY));
  if (!parsed) return {};
  const out: Record<string, BuiltinTemplateLinksMemosPayload> = {};
  for (const [id, val] of Object.entries(parsed)) {
    const n = normalizePayload(val);
    if (n) out[id] = n;
  }
  return out;
}

export function getBuiltinTemplateLinksMemosOverride(templateCatalogId: string): BuiltinTemplateLinksMemosPayload | undefined {
  return loadBuiltinTemplateLinksMemosOverrides()[templateCatalogId];
}

export function setBuiltinTemplateLinksMemosOverride(
  templateCatalogId: string,
  payload: BuiltinTemplateLinksMemosPayload,
): void {
  if (typeof window === "undefined") return;
  const all = loadBuiltinTemplateLinksMemosOverrides();
  const existing = all[templateCatalogId];
  all[templateCatalogId] = {
    links: payload.links.map((l) => ({ label: l.label, href: l.href })),
    memos: [...payload.memos],
    stepTitles: payload.stepTitles ?? existing?.stepTitles,
  };
  window.localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new Event(BUILTIN_TEMPLATE_LINKS_MEMOS_EVENT));
}

/** 카탈로그 상세에 사용자가 저장한 링크·메모·STEP 이름을 합칩니다. */
export function mergeWorkflowDetailWithBuiltinOverrides(detail: WorkflowDetail): WorkflowDetail {
  const o = getBuiltinTemplateLinksMemosOverride(detail.id);
  if (!o) return detail;
  const steps =
    o.stepTitles && o.stepTitles.length > 0
      ? detail.steps.map((s, i) => ({
          ...s,
          toolName: o.stepTitles![i] !== undefined && o.stepTitles![i] !== "" ? o.stepTitles![i]! : s.toolName,
        }))
      : detail.steps;
  return { ...detail, links: o.links, memo: o.memos, steps };
}
