import {
  appendMemoLayoutEntry,
  loadMemoLayout,
  migrateAllMemoEntriesFromFolder,
  removeMemoLayoutEntry,
  remapMemoLayoutUnknownFolders,
  saveMemoLayout,
  updateMemoEntryFolder,
} from "@/lib/memo-layout-store";
import { loadDashboardFolders, pickDefaultProjectFolderId } from "@/lib/dashboard-folders-store";

export const NOTE_CATEGORIES = ["MVP", "강의", "소설", "일반"] as const;
export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** MVP — Problem / Hypothesis / Experience / Features */
export type MvpNoteMetadata = {
  problem?: string;
  hypothesis?: string;
  criticalExperience?: string;
  features?: string;
};

/** 강의 — Target / Goal / Curriculum / Assignment */
export type LectureNoteMetadata = {
  target?: string;
  goal?: string;
  curriculum?: string;
  assignment?: string;
};

/** 소설 — Logline / Worldview / Characters / Plot */
export type NovelNoteMetadata = {
  logline?: string;
  worldview?: string;
  characters?: string;
  plot?: string;
};

export type GeneralNoteMetadata = Record<string, unknown>;

export type IdeaNote = {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  metadata: MvpNoteMetadata | LectureNoteMetadata | NovelNoteMetadata | GeneralNoteMetadata;
  /** 대시보드 폴더 id (프로젝트와 동일 스토어) */
  folderId: string;
  isConverted: boolean;
  convertedProjectId?: string;
  createdAt: number;
  updatedAt: number;
};

export const NOTES_UPDATED_EVENT = "aixit-notes-updated";

const KEY = "aixit.ideaNotes.v1";

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

function resolveFolderId(raw: unknown): string {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (typeof window !== "undefined") {
    return pickDefaultProjectFolderId(loadDashboardFolders());
  }
  return "ddokdi";
}

/** 로컬에 남은 구버전 키를 신규 스키마로 합칩니다. */
export function migrateMetadataForCategory(category: NoteCategory, raw: unknown): IdeaNote["metadata"] {
  const m = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  switch (category) {
    case "MVP":
      return {
        problem: str(m.problem ?? m.problemDefinition),
        hypothesis: str(m.hypothesis ?? m.coreHypothesis),
        criticalExperience: str(m.criticalExperience ?? m.coreExperience),
        features: str(m.features ?? m.coreFeatures),
      };
    case "강의":
      return {
        target: str(m.target ?? m.targetLearners),
        goal: str(m.goal ?? m.learningGoals),
        curriculum: str(m.curriculum ?? m.curriculumSummary),
        assignment: str(m.assignment),
      };
    case "소설":
      return {
        logline: str(m.logline),
        worldview: str(m.worldview ?? m.worldbuildingNotes),
        characters: str(m.characters ?? m.characterSheet),
        plot: str(m.plot),
      };
    default:
      return m;
  }
}

function normalizeNote(n: IdeaNote): IdeaNote {
  const category = NOTE_CATEGORIES.includes(n.category as NoteCategory) ? n.category : "일반";
  const metadata = migrateMetadataForCategory(category, n.metadata);
  const folderId = resolveFolderId((n as { folderId?: unknown }).folderId);
  return {
    ...n,
    title: typeof n.title === "string" ? n.title : "",
    content: typeof n.content === "string" ? n.content : "",
    category,
    metadata,
    folderId,
    isConverted: Boolean(n.isConverted),
    convertedProjectId: typeof n.convertedProjectId === "string" ? n.convertedProjectId : undefined,
    createdAt: typeof n.createdAt === "number" ? n.createdAt : Date.now(),
    updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : Date.now(),
  };
}

/** 폴더 id 변경·삭제 후 메모 folderId·레이아웃 보정 (프로젝트 페이지와 동기) */
export function syncMemoNotesToDashboardFolders() {
  if (typeof window === "undefined") return;
  const folders = loadDashboardFolders();
  const validIds = folders.map((f) => f.id);
  const fallback = pickDefaultProjectFolderId(folders);
  const list = loadNotes();
  const next = list.map((n) =>
    validIds.includes(n.folderId) ? n : normalizeNote({ ...n, folderId: fallback }),
  );
  writeAll(next);
  let layout = loadMemoLayout() ?? [];
  layout = remapMemoLayoutUnknownFolders(layout, validIds, fallback);
  saveMemoLayout(layout);
}

/** 폴더 삭제 시 프로젝트와 동일하게 메모·레이아웃 이동 */
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

/** 승격·저장 전 카테고리별 필수 입력 검사 (한글 메시지). */
export function validateStructuredNote(note: Pick<IdeaNote, "category" | "metadata">): string | null {
  if (note.category === "일반") return null;
  if (note.category === "MVP") {
    const m = note.metadata as MvpNoteMetadata;
    if (!m.problem?.trim()) return "Problem(문제 정의)를 입력해 주세요.";
    if (!m.hypothesis?.trim()) return "Hypothesis(핵심 가설)를 입력해 주세요.";
    if (!m.criticalExperience?.trim()) return "Experience(핵심 경험)를 입력해 주세요.";
    if (!m.features?.trim()) return "Features(MVP 최소 기능)를 입력해 주세요.";
    return null;
  }
  if (note.category === "강의") {
    const m = note.metadata as LectureNoteMetadata;
    if (!m.target?.trim()) return "Target(누구에게 무엇을)을 입력해 주세요.";
    if (!m.goal?.trim()) return "Goal(수강생의 변화)를 입력해 주세요.";
    if (!m.curriculum?.trim()) return "Curriculum(목차)를 입력해 주세요.";
    if (!m.assignment?.trim()) return "Assignment(실습 과제)를 입력해 주세요.";
    return null;
  }
  if (note.category === "소설") {
    const m = note.metadata as NovelNoteMetadata;
    if (!m.logline?.trim()) return "Logline(한 줄 요약)을 입력해 주세요.";
    if (!m.worldview?.trim()) return "Worldview(세계관·규칙)을 입력해 주세요.";
    if (!m.characters?.trim()) return "Characters(결핍·목표)를 입력해 주세요.";
    if (!m.plot?.trim()) return "Plot(갈등·기승전결)을 입력해 주세요.";
    return null;
  }
  return null;
}

export function loadNotes(): IdeaNote[] {
  if (typeof window === "undefined") return [];
  const raw = safeParse<IdeaNote[]>(window.localStorage.getItem(KEY));
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((x) => normalizeNote(x as IdeaNote));
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
  input: Omit<IdeaNote, "id" | "createdAt" | "updatedAt" | "isConverted" | "folderId"> & {
    isConverted?: boolean;
    folderId?: string;
  },
) {
  const now = Date.now();
  const folderId = input.folderId?.trim() || pickDefaultProjectFolderId(loadDashboardFolders());
  const note: IdeaNote = normalizeNote({
    ...input,
    folderId,
    id: makeId(),
    isConverted: input.isConverted ?? false,
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
  const mergedCategory = patch.category ?? prev.category;
  const mergedMeta =
    patch.metadata !== undefined
      ? migrateMetadataForCategory(mergedCategory, patch.metadata)
      : prev.metadata;
  const next = normalizeNote({
    ...prev,
    ...patch,
    metadata: mergedMeta,
    id: prev.id,
    createdAt: prev.createdAt,
    updatedAt: Date.now(),
  });
  const copy = [...list];
  copy[idx] = next;
  writeAll(copy);
  if (patch.folderId !== undefined && patch.folderId !== prev.folderId) {
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
