import type { DashboardFolderRecord } from "@/lib/dashboard-folders-store";
import { normalizeDashboardFolderRecord } from "@/lib/dashboard-folders-store";

/** 메모 전용 폴더 — 프로젝트 폴더 스토어와 완전 분리 */
export const MEMO_FOLDERS_KEY = "aixit.memoFolders.v1";

export const MEMO_FOLDERS_UPDATED_EVENT = "aixit-memo-folders-updated";

/** 프로젝트 폴더 도메인 분리 마이그레이션 완료 플래그 */
export const MEMO_FOLDER_DOMAIN_SPLIT_FLAG = "aixit.memoFolderDomainSplit.v1";

/** 신규 사용자·빈 데이터 시 메모 폴더 초기 시드 */
export const MEMO_FOLDER_SEED: DashboardFolderRecord[] = [
  { id: "memo-folder-s1", name: "똑디", emoji: "💼", iconType: "emoji", color: "#64748b" },
  { id: "memo-folder-s2", name: "내배캠", emoji: "🎓", iconType: "emoji", color: "#6366f1" },
  { id: "memo-folder-s3", name: "취미", emoji: "🎨", iconType: "emoji", color: "#a855f7" },
];

export const BUILTIN_MEMO_FOLDER_IDS = new Set(MEMO_FOLDER_SEED.map((f) => f.id));

export function isBuiltInMemoFolder(id: string): boolean {
  return BUILTIN_MEMO_FOLDER_IDS.has(id);
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function loadMemoFolders(): DashboardFolderRecord[] {
  if (typeof window === "undefined") return [...MEMO_FOLDER_SEED];
  const raw = safeParse<DashboardFolderRecord[]>(window.localStorage.getItem(MEMO_FOLDERS_KEY));
  if (!raw || !Array.isArray(raw) || raw.length === 0) {
    return [...MEMO_FOLDER_SEED];
  }
  return raw.map(normalizeDashboardFolderRecord);
}

export function readMemoFoldersRaw(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(MEMO_FOLDERS_KEY);
}

export function saveMemoFolders(folders: DashboardFolderRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MEMO_FOLDERS_KEY, JSON.stringify(folders.map(normalizeDashboardFolderRecord)));
  window.dispatchEvent(new CustomEvent(MEMO_FOLDERS_UPDATED_EVENT));
}

/**
 * 보이는 폴더만 순서 변경. 프로젝트 폴더용 `reorderDashboardFolderBefore`와 동일 패턴.
 */
export function reorderMemoFolderBefore(dragId: string, beforeId: string | null) {
  const all = loadMemoFolders();
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
  saveMemoFolders(next);
}

export function addMemoFolder(data: Omit<DashboardFolderRecord, "id"> & { id?: string }): DashboardFolderRecord {
  const id = data.id ?? `memo-folder-${Date.now().toString(16)}`;
  const list = loadMemoFolders();
  const record = normalizeDashboardFolderRecord({ ...data, id } as DashboardFolderRecord);
  saveMemoFolders([...list, record]);
  return record;
}

export function updateMemoFolder(id: string, patch: Partial<DashboardFolderRecord>) {
  const list = loadMemoFolders();
  const idx = list.findIndex((f) => f.id === id);
  if (idx < 0) return;
  const next = [...list];
  next[idx] = normalizeDashboardFolderRecord({ ...next[idx], ...patch, id });
  saveMemoFolders(next);
}

export function removeMemoFolder(id: string) {
  const list = loadMemoFolders().filter((f) => f.id !== id);
  saveMemoFolders(list);
}

export function getMemoFolder(id: string): DashboardFolderRecord | undefined {
  return loadMemoFolders().find((f) => f.id === id);
}

export function pickDefaultMemoFolderId(folders: DashboardFolderRecord[]): string {
  const visible = folders.filter((f) => !f.hidden);
  const preferred = visible.find((f) => f.id === "memo-folder-s1");
  if (preferred) return preferred.id;
  return visible[0]?.id ?? "memo-folder-s1";
}

export const createMemoFolder = addMemoFolder;
export const deleteMemoFolder = removeMemoFolder;
