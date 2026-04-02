const KEY = "aixit.workflowTemplateDisplayOrder.v1";
export const TEMPLATE_LIBRARY_ORDER_EVENT = "aixit-workflow-template-order-updated";

function safeParse(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : null;
  } catch {
    return null;
  }
}

function dispatch() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TEMPLATE_LIBRARY_ORDER_EVENT));
}

export function loadTemplateDisplayOrder(): string[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY)) ?? [];
}

function saveOrder(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(ids));
  dispatch();
}

/** 카탈로그 id 기준으로 저장 순서와 병합 (누락 id는 끝에) */
export function mergeTemplateOrderWithCatalog(catalogIds: string[]): string[] {
  const saved = loadTemplateDisplayOrder();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of saved) {
    if (catalogIds.includes(id) && !seen.has(id)) {
      out.push(id);
      seen.add(id);
    }
  }
  for (const id of catalogIds) {
    if (!seen.has(id)) {
      out.push(id);
      seen.add(id);
    }
  }
  return out;
}

export function moveTemplateIdBefore(draggedTemplateId: string, targetTemplateId: string, catalogIds: string[]) {
  if (draggedTemplateId === targetTemplateId) return;
  const ord = mergeTemplateOrderWithCatalog(catalogIds);
  const di = ord.indexOf(draggedTemplateId);
  const ti = ord.indexOf(targetTemplateId);
  if (di < 0 || ti < 0) return;
  ord.splice(di, 1);
  const newTi = ord.indexOf(targetTemplateId);
  ord.splice(newTi, 0, draggedTemplateId);
  saveOrder(ord);
}

/** 그리드 맨 끝 드롭: `afterTemplateId` 뒤로 이동 (프로젝트 폴더 끝 드롭과 동일 UX) */
export function moveTemplateIdAfter(draggedTemplateId: string, afterTemplateId: string, catalogIds: string[]) {
  if (draggedTemplateId === afterTemplateId) return;
  const ord = mergeTemplateOrderWithCatalog(catalogIds);
  const di = ord.indexOf(draggedTemplateId);
  const ai = ord.indexOf(afterTemplateId);
  if (di < 0 || ai < 0) return;
  ord.splice(di, 1);
  const newAi = ord.indexOf(afterTemplateId);
  ord.splice(newAi + 1, 0, draggedTemplateId);
  saveOrder(ord);
}
