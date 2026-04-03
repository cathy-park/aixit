/** 메모 카드 순서·폴더 배치 (프로젝트 dashboardLayout과 동일 패턴, note id 전용) */

export type MemoLayoutEntry = {
  id: string;
  folderId: string;
};

const KEY = "aixit.memoLayout.v1";

export const MEMO_LAYOUT_UPDATED_EVENT = "aixit-memo-layout-updated";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadMemoLayout(): MemoLayoutEntry[] | null {
  if (typeof window === "undefined") return null;
  const raw = safeParse<MemoLayoutEntry[]>(window.localStorage.getItem(KEY));
  return Array.isArray(raw) ? raw : null;
}

export function saveMemoLayout(entries: MemoLayoutEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(MEMO_LAYOUT_UPDATED_EVENT));
}

function keyOf(e: MemoLayoutEntry) {
  return e.id;
}

/** 저장된 노트 목록과 병합: 누락된 메모는 기본 폴더 끝에 추가 */
export function ensureMemoLayoutMerged(
  notes: Array<{ id: string; folderId?: string }>,
  defaultFolderId: string,
): MemoLayoutEntry[] {
  let layout = loadMemoLayout();
  const byId = new Map(notes.map((n) => [n.id, n]));
  if (!layout || layout.length === 0) {
    layout = notes.map((n) => ({ id: n.id, folderId: n.folderId ?? defaultFolderId }));
    saveMemoLayout(layout);
    return layout;
  }
  const seen = new Set(layout.map(keyOf));
  const next = layout.filter((e) => byId.has(e.id));
  for (const n of notes) {
    if (!seen.has(n.id)) {
      next.push({ id: n.id, folderId: n.folderId ?? defaultFolderId });
      seen.add(n.id);
    }
  }
  saveMemoLayout(next);
  return next;
}

export function removeMemoLayoutEntry(layout: MemoLayoutEntry[], id: string): MemoLayoutEntry[] {
  return layout.filter((e) => e.id !== id);
}

export function appendMemoLayoutEntry(layout: MemoLayoutEntry[], id: string, folderId: string): MemoLayoutEntry[] {
  if (layout.some((e) => e.id === id)) return updateMemoEntryFolder(layout, id, folderId);
  return [...layout, { id, folderId }];
}

export function moveMemoToFolderEnd(layout: MemoLayoutEntry[], id: string, folderId: string): MemoLayoutEntry[] {
  const rest = layout.filter((e) => e.id !== id);
  return [...rest, { id, folderId }];
}

export function updateMemoEntryFolder(layout: MemoLayoutEntry[], id: string, folderId: string): MemoLayoutEntry[] {
  return layout.map((e) => (e.id === id ? { ...e, folderId } : e));
}

export function reorderMemoBeforeTarget(
  layout: MemoLayoutEntry[],
  draggedId: string,
  targetId: string,
): MemoLayoutEntry[] {
  const di = layout.findIndex((e) => e.id === draggedId);
  const ti = layout.findIndex((e) => e.id === targetId);
  if (di < 0 || ti < 0) return layout;
  const d = layout[di];
  const t = layout[ti];
  if (d.folderId !== t.folderId) return layout;
  const next = [...layout];
  next.splice(di, 1);
  const newTi = next.findIndex((e) => e.id === targetId);
  next.splice(newTi, 0, d);
  return next;
}

export function moveMemoBeforeTargetInFolder(
  layout: MemoLayoutEntry[],
  draggedId: string,
  target: MemoLayoutEntry,
): MemoLayoutEntry[] {
  const rest = layout.filter((e) => e.id !== draggedId);
  const ti = rest.findIndex((e) => e.id === target.id);
  if (ti < 0) return layout;
  const next = [...rest];
  next.splice(ti, 0, { id: draggedId, folderId: target.folderId });
  return next;
}

export function migrateAllMemoEntriesFromFolder(
  layout: MemoLayoutEntry[],
  fromFolderId: string,
  toFolderId: string,
): MemoLayoutEntry[] {
  return layout.map((e) => (e.folderId === fromFolderId ? { ...e, folderId: toFolderId } : e));
}

export function remapMemoLayoutUnknownFolders(
  layout: MemoLayoutEntry[],
  validFolderIds: string[],
  fallbackFolderId: string,
): MemoLayoutEntry[] {
  const valid = new Set(validFolderIds);
  return layout.map((e) => (valid.has(e.folderId) ? e : { ...e, folderId: fallbackFolderId }));
}
