import {
  appendMemoLayoutEntry,
  loadMemoLayout,
  migrateAllMemoEntriesFromFolder,
  removeMemoLayoutEntry,
  remapMemoLayoutUnknownFolders,
  saveMemoLayout,
  updateMemoEntryFolder,
} from "@/lib/memo-layout-store";
import { ensureMemoCategoryFolderSync } from "@/lib/memo-category-folder-sync";
import { ensureMemoFolderDomainSplit } from "@/lib/memo-folder-migration";
import {
  findMemoFolderByCategoryKey,
  getMemoFolder,
  loadMemoFolders,
  MEMO_FOLDER_SEED,
  memoFolderCategoryKey,
  pickDefaultMemoFolderId,
  ensureMemoFolderForCategoryKey,
} from "@/lib/memo-folders-store";
import { isProjectLifecycleStatus, type ProjectLifecycleStatus } from "@/lib/project-lifecycle-status";
import { type WorkflowRunStatus, isWorkflowRunStatus } from "@/lib/workflow-run-status";

/** 메모 폴더와 1:1 — `memoFolderCategoryKey(folder)`와 항상 동일 */
export type NoteCategory = string;

export type GeneralNoteMetadata = Record<string, unknown>;

export type IdeaNote = {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  /** 사용자 지정 태그 (폴더 category와 별도; UI는 #폴더 + #태그) */
  tags: string[];
  metadata: GeneralNoteMetadata;
  /** 메모 전용 폴더 id (`memo-folders-store`) */
  folderId: string;
  /** 카드 상태 (시작전 | 준비중 | 진행중 | 보류 | 중단 | 완료) */
  projectStatus?: string;
  isConverted: boolean;
  convertedProjectId?: string;
  /** 메모 배경 색상 (yellow, rose, blue, green, orange, purple) */
  color?: string;
  createdAt: number;
  updatedAt: number;
};

export const NOTES_UPDATED_EVENT = "aixit-notes-updated";

const KEY = "aixit.ideaNotes.v1";

let memoFolderSplitEnsured = false;
let memoCategoryFolderSyncEnsured = false;

export function structureTypeFromMemoCategoryLabel(label: string): string {
  return "일반";
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `note_${Date.now().toString(16)}`;
}

const MAX_TAGS_PER_NOTE = 48;
const MAX_TAG_LENGTH = 48;

/** 로컬 저장용 태그 배열 정규화 (trim, # 제거, 대소문자 무시 중복 제거) */
export function normalizeIdeaNoteTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    if (typeof x !== "string") continue;
    let t = x.trim().replace(/^#+/u, "").trim();
    if (!t) continue;
    if (t.length > MAX_TAG_LENGTH) t = t.slice(0, MAX_TAG_LENGTH).trim();
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= MAX_TAGS_PER_NOTE) break;
  }
  return out;
}

function deriveNoteProjectStatus(n: Pick<IdeaNote, "isConverted" | "projectStatus">): string {
  if (n.isConverted) return "완료";
  const raw = n.projectStatus;
  if (typeof raw === "string" && raw.trim()) return raw;
  return "준비중";
}

/** 템플릿 로직 제거: raw 데이터를 그대로 반환 */
export function migrateMetadataForCategory(category: NoteCategory, raw: unknown): IdeaNote["metadata"] {
  return (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as GeneralNoteMetadata;
}

function reconcileMemoFolderAndCategory(
  n: Pick<IdeaNote, "folderId" | "category">,
  folders: ReturnType<typeof loadMemoFolders>,
): { folderId: string; category: NoteCategory } {
  const rawId = typeof n.folderId === "string" ? n.folderId.trim() : "";
  const rawCat = typeof n.category === "string" ? n.category.trim() : "";
  const byId = (id: string) => folders.find((f) => f.id === id);
  const folderFromId = rawId ? byId(rawId) : undefined;

  if (folderFromId) {
    return { folderId: folderFromId.id, category: memoFolderCategoryKey(folderFromId) };
  }

  const fromKey = rawCat ? findMemoFolderByCategoryKey(folders, rawCat) : undefined;
  if (fromKey) {
    return { folderId: fromKey.id, category: memoFolderCategoryKey(fromKey) };
  }

  const fallbackId = pickDefaultMemoFolderId(folders);
  const fb = byId(fallbackId) ?? folders[0];
  if (fb) return { folderId: fb.id, category: memoFolderCategoryKey(fb) };
  return { folderId: "memo-folder-s1", category: "똑디" };
}

function normalizeNote(n: IdeaNote): IdeaNote {
  const folders: ReturnType<typeof loadMemoFolders> =
    typeof window !== "undefined" ? loadMemoFolders() : [...MEMO_FOLDER_SEED];
  const { folderId, category } = reconcileMemoFolderAndCategory(n, folders);
  const metadata = migrateMetadataForCategory(category, n.metadata);
  const projectStatus = deriveNoteProjectStatus({
    isConverted: Boolean(n.isConverted),
    projectStatus: n.projectStatus,
  });
  const tags = normalizeIdeaNoteTags((n as { tags?: unknown }).tags);
  return {
    ...n,
    title: typeof n.title === "string" ? n.title : "",
    content: typeof n.content === "string" ? n.content : "",
    category,
    tags,
    metadata,
    folderId,
    projectStatus,
    color: typeof n.color === "string" ? n.color : "yellow",
    isConverted: Boolean(n.isConverted),
    convertedProjectId: typeof n.convertedProjectId === "string" ? n.convertedProjectId : undefined,
    createdAt: typeof n.createdAt === "number" ? n.createdAt : Date.now(),
    updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : Date.now(),
  };
}

/** 메모 폴더 id 변경·삭제 후 note·레이아웃 보정 (메모 도메인만) */
export function syncMemoNotesToMemoFolders() {
  if (typeof window === "undefined") return;
  const folders = loadMemoFolders();
  const validIds = folders.map((f) => f.id);
  const fallback = pickDefaultMemoFolderId(folders);
  const list = loadNotes();
  const next = list.map((n) =>
    normalizeNote(
      validIds.includes(n.folderId) ? n : { ...n, folderId: fallback, updatedAt: Date.now() },
    ),
  );
  writeAll(next);
  let layout = loadMemoLayout() ?? [];
  layout = remapMemoLayoutUnknownFolders(layout, validIds, fallback);
  saveMemoLayout(layout);
}

/** @deprecated 메모 전용으로 `syncMemoNotesToMemoFolders` 사용 */
export function syncMemoNotesToDashboardFolders() {
  syncMemoNotesToMemoFolders();
}

/** 메모 폴더 삭제·이동 시 메모·레이아웃만 갱신 */
export function reassignMemoNotesFromFolder(fromFolderId: string, toFolderId: string) {
  if (typeof window === "undefined") return;
  const list = loadNotes().map((n) =>
    n.folderId === fromFolderId ? normalizeNote({ ...n, folderId: toFolderId, updatedAt: Date.now() }) : n,
  );
  writeAll(list);
  let layout = loadMemoLayout() ?? [];
  layout = migrateAllMemoEntriesFromFolder(layout, fromFolderId, toFolderId);
  saveMemoLayout(layout);
}

/** 템플릿 기능이 제거되어 유효성 검사가 불필요함 */
export function validateStructuredNote(note: Pick<IdeaNote, "category" | "metadata">): string | null {
  return null;
}

export function loadNotes(): IdeaNote[] {
  if (typeof window === "undefined") return [];
  if (!memoFolderSplitEnsured) {
    memoFolderSplitEnsured = true;
    ensureMemoFolderDomainSplit();
  }
  if (!memoCategoryFolderSyncEnsured) {
    memoCategoryFolderSyncEnsured = true;
    ensureMemoCategoryFolderSync();
  }
  const raw = safeParse<IdeaNote[]>(window.localStorage.getItem(KEY));
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((x) => normalizeNote(x as IdeaNote));
}

/** 메모 폴더 이름·slug 변경 후 해당 폴더 메모의 `category`를 폴더 키와 맞춥니다. */
export function syncMemoNoteCategoriesForMemoFolder(folderId: string) {
  if (typeof window === "undefined") return;
  const f = getMemoFolder(folderId);
  if (!f) return;
  const list = loadNotes();
  const next = list.map((n) => (n.folderId === folderId ? normalizeNote(n) : n));
  writeAll(next);
}

function writeAll(notes: IdeaNote[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(notes));
  window.dispatchEvent(new CustomEvent(NOTES_UPDATED_EVENT));
}

export function saveNotes(notes: IdeaNote[]) {
  writeAll(notes.map(normalizeNote));
}

export function addNote(
  input: Omit<IdeaNote, "id" | "createdAt" | "updatedAt" | "isConverted" | "folderId" | "category"> & {
    isConverted?: boolean;
    folderId?: string;
    /** 생략 시 `folderId`로부터 파생 */
    category?: NoteCategory;
    projectStatus?: string;
    color?: string;
  },
) {
  const now = Date.now();
  const folders = loadMemoFolders();
  let folderId = "";
  let categorySeed = typeof input.category === "string" ? input.category : "";
  const fidIn = input.folderId?.trim();
  if (fidIn) {
    const hit = getMemoFolder(fidIn);
    if (hit) {
      folderId = hit.id;
      categorySeed = memoFolderCategoryKey(hit);
    } else {
      folderId = fidIn;
    }
  } else if (categorySeed.trim()) {
    const ensured = ensureMemoFolderForCategoryKey(categorySeed);
    folderId = ensured.id;
    categorySeed = memoFolderCategoryKey(ensured);
  } else {
    const fb = pickDefaultMemoFolderId(folders);
    const hit = getMemoFolder(fb) ?? folders[0];
    folderId = hit?.id ?? fb;
    categorySeed = hit ? memoFolderCategoryKey(hit) : categorySeed;
  }
  const note: IdeaNote = normalizeNote({
    ...input,
    folderId,
    category: categorySeed,
    id: makeId(),
    isConverted: input.isConverted ?? false,
    projectStatus: input.projectStatus ?? "준비중",
    createdAt: now,
    updatedAt: now,
  } as IdeaNote);
  const list = loadNotes();
  writeAll([note, ...list.filter((x) => x.id !== note.id)]);
  const layout = loadMemoLayout() ?? [];
  saveMemoLayout(appendMemoLayoutEntry(layout, note.id, note.folderId));
  return note;
}

export function updateNote(id: string, patch: Partial<Omit<IdeaNote, "id" | "createdAt">>) {
  const list = loadNotes();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  const prev = list[idx];
  const folders = loadMemoFolders();

  let workingFolderId = prev.folderId;
  let workingCategory = prev.category;
  const pFolder = patch.folderId !== undefined;
  const pCat = patch.category !== undefined;

  if (pFolder && pCat) {
    workingFolderId = patch.folderId!.trim();
    const f = getMemoFolder(workingFolderId);
    workingCategory = f ? memoFolderCategoryKey(f) : prev.category;
  } else if (pFolder) {
    workingFolderId = patch.folderId!.trim();
    const f = getMemoFolder(workingFolderId);
    workingCategory = f
      ? memoFolderCategoryKey(f)
      : reconcileMemoFolderAndCategory({ folderId: workingFolderId, category: prev.category }, folders).category;
  } else if (pCat) {
    const ensured = ensureMemoFolderForCategoryKey(patch.category!);
    workingFolderId = ensured.id;
    workingCategory = memoFolderCategoryKey(ensured);
  }

  const mergedMeta =
    patch.metadata !== undefined
      ? migrateMetadataForCategory(workingCategory, patch.metadata)
      : prev.metadata;
  const mergedTags = patch.tags !== undefined ? patch.tags : prev.tags;
  const next = normalizeNote({
    ...prev,
    ...patch,
    folderId: workingFolderId,
    category: workingCategory,
    metadata: mergedMeta,
    tags: mergedTags,
    id: prev.id,
    createdAt: prev.createdAt,
    updatedAt: Date.now(),
  });
  const copy = [...list];
  copy[idx] = next;
  writeAll(copy);
  if (next.folderId !== prev.folderId) {
    const layout = loadMemoLayout() ?? [];
    saveMemoLayout(updateMemoEntryFolder(layout, id, next.folderId));
  }
  return next;
}

export function removeNote(id: string) {
  writeAll(loadNotes().filter((x) => x.id !== id));
  saveMemoLayout(removeMemoLayoutEntry(loadMemoLayout() ?? [], id));
}

export function getNote(id: string): IdeaNote | null {
  return loadNotes().find((x) => x.id === id) ?? null;
}
