import type { WorkflowDetail, WorkflowStep } from "@/lib/aixit-data";

const KEY = "aixit.builtinTemplateLinksMemos.v1";

export const BUILTIN_TEMPLATE_LINKS_MEMOS_EVENT = "aixit-builtin-template-links-memos-updated";

export type BuiltinTemplateStepOverride = {
  toolName: string;
  toolIds: string[];
};

export type BuiltinTemplateLinksMemosPayload = {
  links: Array<{ label: string; href: string }>;
  memos: string[];
  /** 카탈로그 STEP과 같은 순서의 표시 이름(로컬 오버라이드) */
  stepTitles?: string[];
  /** 단계 이름·연결 도구(개수가 카탈로그와 다르면 단계 추가/삭제로 간주) */
  stepsOverride?: BuiltinTemplateStepOverride[];
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
  const soRaw = o.stepsOverride;
  const stepsOverride: BuiltinTemplateStepOverride[] = [];
  if (Array.isArray(soRaw)) {
    for (const row of soRaw) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const toolName = typeof r.toolName === "string" ? r.toolName : "단계";
      const toolIds = Array.isArray(r.toolIds)
        ? r.toolIds.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        : [];
      stepsOverride.push({ toolName, toolIds });
    }
  }
  return {
    links,
    memos,
    ...(stepTitles?.length ? { stepTitles } : {}),
    ...(stepsOverride.length ? { stepsOverride } : {}),
  };
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
    stepsOverride: payload.stepsOverride ?? existing?.stepsOverride,
  };
  window.localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new Event(BUILTIN_TEMPLATE_LINKS_MEMOS_EVENT));
}

function mergeBuiltinSteps(detail: WorkflowDetail, o: BuiltinTemplateLinksMemosPayload): WorkflowStep[] {
  const base = detail.steps;
  if (o.stepsOverride && o.stepsOverride.length > 0) {
    const ov = o.stepsOverride;
    if (ov.length === base.length) {
      return base.map((s, i) => {
        const row = ov[i];
        if (!row) return s;
        return {
          ...s,
          toolName: row.toolName?.trim() ? row.toolName : s.toolName,
          toolIds: row.toolIds?.length ? [...row.toolIds] : (s.toolIds ?? []),
        };
      });
    }
    return ov.map((row, i) => ({
      id: base[i]?.id ?? `ov_${detail.id}_${i}`,
      toolName: row.toolName?.trim() || base[i]?.toolName || `단계 ${i + 1}`,
      statusLabel: base[i]?.statusLabel ?? "대기",
      toolIds: [...(row.toolIds ?? [])],
    }));
  }
  if (o.stepTitles && o.stepTitles.length > 0) {
    return base.map((s, i) => {
      const t = o.stepTitles![i];
      return {
        ...s,
        toolName: typeof t === "string" && t.trim() ? t : s.toolName,
      };
    });
  }
  return base;
}

/** 카탈로그 상세에 사용자가 저장한 링크·메모·STEP 이름·도구 구성을 합칩니다. */
export function mergeWorkflowDetailWithBuiltinOverrides(detail: WorkflowDetail): WorkflowDetail {
  const o = getBuiltinTemplateLinksMemosOverride(detail.id);
  if (!o) return detail;
  const steps = mergeBuiltinSteps(detail, o);
  return { ...detail, links: o.links, memo: o.memos, steps };
}
