import {
  createProjectFromTemplate,
  listDashboardWorkflows,
  removeDashboardWorkflow,
  setDashboardWorkflowFolder,
} from "@/lib/workflows-store";

export type LayoutEntry =
  | { kind: "builtin"; id: string; folderId: string }
  | { kind: "user"; id: string; folderId: string };

const KEY = "aixit.dashboardLayout.v1";

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function loadLayout(): LayoutEntry[] | null {
  if (typeof window === "undefined") return null;
  const raw = safeParse<LayoutEntry[]>(window.localStorage.getItem(KEY));
  return Array.isArray(raw) ? raw : null;
}

export function saveLayout(entries: LayoutEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent("aixit-dashboard-layout-updated"));
}

function keyOf(e: LayoutEntry) {
  return `${e.kind}:${e.id}`;
}

export function removeLayoutEntry(layout: LayoutEntry[], kind: LayoutEntry["kind"], id: string): LayoutEntry[] {
  return layout.filter((e) => !(e.kind === kind && e.id === id));
}

/**
 * 레이아웃의 내장(builtin) 슬롯을 템플릿 기반 프로젝트 인스턴스로 치환합니다.
 */
function migrateBuiltinSlotsToProjects(layout: LayoutEntry[]): LayoutEntry[] {
  const next: LayoutEntry[] = [];
  for (const e of layout) {
    if (e.kind === "user") {
      next.push(e);
      continue;
    }
    removeDashboardWorkflow(e.id);
    const proj = createProjectFromTemplate(e.id, e.folderId);
    if (proj) {
      next.push({ kind: "user", id: proj.id, folderId: e.folderId });
    }
  }
  return next;
}

/** 최초/누락 항목 병합 후 레이아웃 반환 — 프로젝트(저장 인스턴스)만 추적, 카탈로그 템플릿은 포함하지 않음 */
export function ensureLayoutMerged(): LayoutEntry[] {
  let layout = loadLayout();

  if (!layout || layout.length === 0) {
    layout = listDashboardWorkflows().map((u) => ({
      kind: "user" as const,
      id: u.id,
      folderId: u.folderId ?? "ddokdi",
    }));
    saveLayout(layout);
    return layout;
  }

  const hasBuiltin = layout.some((e) => e.kind === "builtin");
  if (hasBuiltin) {
    layout = migrateBuiltinSlotsToProjects(layout);
    saveLayout(layout);
  }

  const seen = new Set(layout.map(keyOf));

  for (const u of listDashboardWorkflows()) {
    const k = `user:${u.id}`;
    if (!seen.has(k)) {
      layout.push({ kind: "user", id: u.id, folderId: u.folderId ?? "ddokdi" });
      seen.add(k);
    }
  }

  saveLayout(layout);
  return layout;
}

export function appendUserLayoutEntry(workflowId: string, folderId: string) {
  const layout = ensureLayoutMerged();
  if (layout.some((e) => e.kind === "user" && e.id === workflowId)) return;
  const next = [...layout, { kind: "user" as const, id: workflowId, folderId }];
  saveLayout(next);
}

/** 특정 카드 바로 뒤에 레이아웃 항목 삽입 (복사본 배치용) */
export function insertLayoutEntryAfter(
  layout: LayoutEntry[],
  after: Pick<LayoutEntry, "kind" | "id">,
  entry: LayoutEntry,
): LayoutEntry[] {
  const i = layout.findIndex((e) => e.kind === after.kind && e.id === after.id);
  if (i < 0) return [...layout, entry];
  const next = [...layout];
  next.splice(i + 1, 0, entry);
  return next;
}

export function moveEntryToFolderEnd(layout: LayoutEntry[], kind: LayoutEntry["kind"], id: string, folderId: string): LayoutEntry[] {
  const rest = layout.filter((e) => !(e.kind === kind && e.id === id));
  return [...rest, { kind, id, folderId } as LayoutEntry];
}

export function updateEntryFolder(layout: LayoutEntry[], kind: LayoutEntry["kind"], id: string, folderId: string): LayoutEntry[] {
  return layout.map((e) => (e.kind === kind && e.id === id ? { ...e, folderId } : e));
}

/** 같은 폴더 내에서 target 앞에 끼워 넣기 */
export function reorderBeforeTarget(
  layout: LayoutEntry[],
  dragged: Pick<LayoutEntry, "kind" | "id">,
  target: Pick<LayoutEntry, "kind" | "id">,
): LayoutEntry[] {
  const di = layout.findIndex((e) => e.kind === dragged.kind && e.id === dragged.id);
  const ti = layout.findIndex((e) => e.kind === target.kind && e.id === target.id);
  if (di < 0 || ti < 0) return layout;
  const d = layout[di];
  const t = layout[ti];
  if (d.folderId !== t.folderId) return layout;
  const next = [...layout];
  next.splice(di, 1);
  const newTi = next.findIndex((e) => e.kind === target.kind && e.id === target.id);
  next.splice(newTi, 0, d);
  return next;
}

/** 다른 폴더에서 카드 위로 드롭: 타깃 폴더로 옮기고 타깃 바로 앞에 삽입 */
export function moveEntryBeforeTargetInFolder(
  layout: LayoutEntry[],
  draggedKind: LayoutEntry["kind"],
  draggedId: string,
  target: LayoutEntry,
): LayoutEntry[] {
  const rest = layout.filter((e) => !(e.kind === draggedKind && e.id === draggedId));
  const ti = rest.findIndex((e) => e.kind === target.kind && e.id === target.id);
  if (ti < 0) return layout;
  const moved: LayoutEntry = { kind: draggedKind, id: draggedId, folderId: target.folderId } as LayoutEntry;
  const next = [...rest];
  next.splice(ti, 0, moved);
  return next;
}

/** 특정 폴더에 있던 모든 워크플로우를 다른 폴더로 옮기고 스토어와 동기화 */
export function migrateAllEntriesFromFolder(
  layout: LayoutEntry[],
  fromFolderId: string,
  toFolderId: string,
): LayoutEntry[] {
  const next = layout.map((e) => (e.folderId === fromFolderId ? { ...e, folderId: toFolderId } : e));
  for (const e of layout) {
    if (e.folderId === fromFolderId) {
      setDashboardWorkflowFolder(e.id, toFolderId);
    }
  }
  return next;
}

/** 존재하지 않는 folderId를 fallback으로 교체 (스토어 동기화 포함) */
export function remapLayoutUnknownFolders(
  layout: LayoutEntry[],
  validFolderIds: string[],
  fallbackFolderId: string,
): LayoutEntry[] {
  const valid = new Set(validFolderIds);
  const next = layout.map((e) => (valid.has(e.folderId) ? e : { ...e, folderId: fallbackFolderId }));
  for (let i = 0; i < layout.length; i++) {
    if (!valid.has(layout[i].folderId)) {
      setDashboardWorkflowFolder(layout[i].id, fallbackFolderId);
    }
  }
  return next;
}
