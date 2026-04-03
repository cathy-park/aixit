import type { DashboardFolderRecord } from "@/lib/dashboard-folders-store";
import { loadDashboardFolders, normalizeDashboardFolderRecord } from "@/lib/dashboard-folders-store";
import {
  MEMO_FOLDERS_KEY,
  MEMO_FOLDER_DOMAIN_SPLIT_FLAG,
  MEMO_FOLDER_SEED,
  loadMemoFolders,
  pickDefaultMemoFolderId,
  saveMemoFolders,
} from "@/lib/memo-folders-store";
import type { MemoLayoutEntry } from "@/lib/memo-layout-store";
import { saveMemoLayout } from "@/lib/memo-layout-store";
import type { IdeaNote } from "@/lib/notes-store";

const NOTES_LS_KEY = "aixit.ideaNotes.v1";
const MEMO_LAYOUT_LS_KEY = "aixit.memoLayout.v1";

function parseNotesRaw(): IdeaNote[] {
  try {
    const raw = window.localStorage.getItem(NOTES_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IdeaNote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotesRaw(notes: IdeaNote[]) {
  window.localStorage.setItem(NOTES_LS_KEY, JSON.stringify(notes));
  window.dispatchEvent(new CustomEvent("aixit-notes-updated"));
}

function parseMemoFoldersFromLs(): DashboardFolderRecord[] {
  try {
    const raw = window.localStorage.getItem(MEMO_FOLDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DashboardFolderRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return parsed.map(normalizeDashboardFolderRecord);
  } catch {
    return [];
  }
}

/** 메모 폴더 id가 프로젝트 폴더 id와 동일하면 `memo-folder-` 네임스페이스로 분리 */
function detachMemoFoldersFromProjectIds(
  memoFolders: DashboardFolderRecord[],
  projectIds: Set<string>,
): { next: DashboardFolderRecord[]; map: Map<string, string> } {
  const map = new Map<string, string>();
  const next = memoFolders.map((f) => {
    if (!projectIds.has(f.id)) return f;
    if (f.id.startsWith("memo-folder-")) return f;
    const nid = `memo-folder-${f.id}`;
    map.set(f.id, nid);
    return normalizeDashboardFolderRecord({ ...f, id: nid });
  });
  return { next, map };
}

function applyFolderIdMapToNotesAndLayout(map: Map<string, string>, fallback: string) {
  if (map.size === 0) return;
  const notes = parseNotesRaw();
  const nextNotes = notes.map((n) => {
    const to = map.get(n.folderId);
    if (to) return { ...n, folderId: to };
    return n;
  });
  writeNotesRaw(nextNotes);

  try {
    const raw = window.localStorage.getItem(MEMO_LAYOUT_LS_KEY);
    if (!raw) return;
    const layout = JSON.parse(raw) as MemoLayoutEntry[];
    if (!Array.isArray(layout)) return;
    const nextLayout = layout.map((e) => {
      const to = map.get(e.folderId);
      if (to) return { ...e, folderId: to };
      return e;
    });
    saveMemoLayout(nextLayout);
  } catch {
    /* ignore */
  }
}

/** 메모 폴더 id 집합에 맞게 note.folderId 보정 */
export function ensureNoteFolderIdsMatchMemoStore() {
  if (typeof window === "undefined") return;
  const memoFolders = loadMemoFolders();
  const memoIds = new Set(memoFolders.map((f) => f.id));
  const fallback = pickDefaultMemoFolderId(memoFolders);
  const notes = parseNotesRaw();
  let changed = false;
  const next = notes.map((n) => {
    if (memoIds.has(n.folderId)) return n;
    changed = true;
    return { ...n, folderId: fallback };
  });
  if (changed) writeNotesRaw(next);
}

/**
 * 프로젝트 폴더와 메모 폴더 스토어를 분리합니다. 최초 1회(또는 레거시 공유 데이터)에만 동작합니다.
 */
export function ensureMemoFolderDomainSplit() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(MEMO_FOLDER_DOMAIN_SPLIT_FLAG) === "1") {
    ensureNoteFolderIdsMatchMemoStore();
    return;
  }

  const projectFolders = loadDashboardFolders();
  const projectIds = new Set(projectFolders.map((f) => f.id));

  let memoFolders = parseMemoFoldersFromLs();
  const { next: detached, map: detachMap } = detachMemoFoldersFromProjectIds(memoFolders, projectIds);
  if (detachMap.size > 0) {
    memoFolders = detached;
    saveMemoFolders(detached);
    applyFolderIdMapToNotesAndLayout(detachMap, pickDefaultMemoFolderId(detached));
  }

  memoFolders = loadMemoFolders();
  let memoIds = new Set(memoFolders.map((f) => f.id));

  if (memoFolders.length === 0) {
    const notes = parseNotesRaw();
    const usedProjectFolderIds = new Set<string>();
    for (const n of notes) {
      const fid = typeof n.folderId === "string" ? n.folderId : "";
      if (fid && !fid.startsWith("memo-folder-") && projectIds.has(fid)) {
        usedProjectFolderIds.add(fid);
      }
    }

    if (notes.length === 0 && usedProjectFolderIds.size === 0) {
      saveMemoFolders(MEMO_FOLDER_SEED.map((f) => normalizeDashboardFolderRecord(f)));
    } else if (usedProjectFolderIds.size > 0) {
      const built: DashboardFolderRecord[] = [];
      const seen = new Set<string>();
      for (const pf of projectFolders) {
        if (!usedProjectFolderIds.has(pf.id)) continue;
        built.push(
          normalizeDashboardFolderRecord({
            ...pf,
            id: `memo-folder-${pf.id}`,
          }),
        );
        seen.add(pf.id);
      }
      for (const oid of usedProjectFolderIds) {
        if (seen.has(oid)) continue;
        const pf = projectFolders.find((x) => x.id === oid);
        if (pf) {
          built.push(normalizeDashboardFolderRecord({ ...pf, id: `memo-folder-${pf.id}` }));
        }
      }
      saveMemoFolders(built.length > 0 ? built : MEMO_FOLDER_SEED.map((f) => normalizeDashboardFolderRecord(f)));
    } else {
      saveMemoFolders(MEMO_FOLDER_SEED.map((f) => normalizeDashboardFolderRecord(f)));
    }
  }

  memoFolders = loadMemoFolders();
  memoIds = new Set(memoFolders.map((f) => f.id));

  const idMap = new Map<string, string>();
  for (const pid of projectIds) {
    const mid = `memo-folder-${pid}`;
    if (memoIds.has(mid)) idMap.set(pid, mid);
  }

  const notes = parseNotesRaw();
  const fallback = pickDefaultMemoFolderId(memoFolders);
  let notesChanged = false;
  const nextNotes = notes.map((n) => {
    const fid = n.folderId;
    if (memoIds.has(fid)) return n;
    const mapped = idMap.get(fid);
    if (mapped) {
      notesChanged = true;
      return { ...n, folderId: mapped };
    }
    notesChanged = true;
    return { ...n, folderId: fallback };
  });
  if (notesChanged) writeNotesRaw(nextNotes);

  try {
    const raw = window.localStorage.getItem(MEMO_LAYOUT_LS_KEY);
    if (raw) {
      const layout = JSON.parse(raw) as MemoLayoutEntry[];
      if (Array.isArray(layout)) {
        let layoutChanged = false;
        const nextLayout = layout.map((e) => {
          if (memoIds.has(e.folderId)) return e;
          const mapped = idMap.get(e.folderId);
          if (mapped) {
            layoutChanged = true;
            return { ...e, folderId: mapped };
          }
          layoutChanged = true;
          return { ...e, folderId: fallback };
        });
        if (layoutChanged) saveMemoLayout(nextLayout);
      }
    }
  } catch {
    /* ignore */
  }

  window.localStorage.setItem(MEMO_FOLDER_DOMAIN_SPLIT_FLAG, "1");
  ensureNoteFolderIdsMatchMemoStore();
}
