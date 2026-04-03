import {
  addMemoFolder,
  findMemoFolderByCategoryKey,
  loadMemoFolders,
  memoFolderCategoryKey,
  pickDefaultMemoFolderId,
} from "@/lib/memo-folders-store";

export const MEMO_CATEGORY_FOLDER_SYNC_FLAG = "aixit.memoCategoryFolderSync.v1";

const NOTES_LS_KEY = "aixit.ideaNotes.v1";

type StoredNote = Record<string, unknown>;

function parseNotesRaw(): StoredNote[] {
  try {
    const raw = window.localStorage.getItem(NOTES_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredNote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotesRaw(notes: StoredNote[]) {
  window.localStorage.setItem(NOTES_LS_KEY, JSON.stringify(notes));
  window.dispatchEvent(new CustomEvent("aixit-notes-updated"));
}

/**
 * 레거시: note.category(예: MVP)와 note.folderId(예: 똑디)가 어긋난 데이터를 한 번에 정리합니다.
 * 이후에는 폴더가 진실(source of truth)이며 normalize 시 category는 폴더에서 파생됩니다.
 */
export function ensureMemoCategoryFolderSync() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(MEMO_CATEGORY_FOLDER_SYNC_FLAG) === "1") return;

  let folders = loadMemoFolders();
  const fallbackId = pickDefaultMemoFolderId(folders);
  const fallbackFolder = folders.find((f) => f.id === fallbackId);
  const fallbackKey = fallbackFolder ? memoFolderCategoryKey(fallbackFolder) : "일반";

  const notes = parseNotesRaw();
  let changed = false;
  const next = notes.map((raw) => {
    const n = raw;
    const cat = typeof n.category === "string" ? n.category.trim() : "";
    const fid = typeof n.folderId === "string" ? n.folderId.trim() : "";
    folders = loadMemoFolders();
    const folder = fid ? folders.find((f) => f.id === fid) : undefined;
    const keyFromFolder = folder ? memoFolderCategoryKey(folder) : "";

    if (folder && cat && cat !== keyFromFolder) {
      changed = true;
      let target = findMemoFolderByCategoryKey(folders, cat);
      if (!target) {
        addMemoFolder({
          name: cat,
          emoji: "",
          iconType: "lucide",
          lucideIcon: "FolderOpen",
          imageDataUrl: null,
          color: "#64748b",
          hidden: false,
        });
        folders = loadMemoFolders();
        target = findMemoFolderByCategoryKey(folders, cat);
      }
      if (target) {
        return { ...n, folderId: target.id, category: memoFolderCategoryKey(target), updatedAt: Date.now() };
      }
    }

    if (!folder) {
      changed = true;
      if (cat) {
        let target = findMemoFolderByCategoryKey(folders, cat);
        if (!target) {
          addMemoFolder({
            name: cat,
            emoji: "",
            iconType: "lucide",
            lucideIcon: "FolderOpen",
            imageDataUrl: null,
            color: "#64748b",
            hidden: false,
          });
          folders = loadMemoFolders();
          target = findMemoFolderByCategoryKey(folders, cat);
        }
        if (target) {
          return { ...n, folderId: target.id, category: memoFolderCategoryKey(target), updatedAt: Date.now() };
        }
      }
      return {
        ...n,
        folderId: fallbackId,
        category: fallbackKey,
        updatedAt: Date.now(),
      };
    }

    if (folder && (!cat || cat === keyFromFolder)) {
      if (cat !== keyFromFolder) {
        changed = true;
        return { ...n, category: keyFromFolder, updatedAt: Date.now() };
      }
    }

    return n;
  });

  if (changed) writeNotesRaw(next);
  window.localStorage.setItem(MEMO_CATEGORY_FOLDER_SYNC_FLAG, "1");
}
