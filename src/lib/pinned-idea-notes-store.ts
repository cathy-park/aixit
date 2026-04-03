const KEY = "aixit.pinnedIdeaNoteIds.v1";

export const PINNED_IDEA_NOTES_UPDATED_EVENT = "aixit-pinned-idea-notes-updated";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadPinnedIdeaNoteIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const raw = safeParse<string[]>(window.localStorage.getItem(KEY));
  return new Set(Array.isArray(raw) ? raw : []);
}

function savePinned(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify([...ids]));
}

export function togglePinnedIdeaNoteId(id: string): Set<string> {
  const next = new Set(loadPinnedIdeaNoteIds());
  if (next.has(id)) next.delete(id);
  else next.add(id);
  savePinned(next);
  window.dispatchEvent(new CustomEvent(PINNED_IDEA_NOTES_UPDATED_EVENT));
  return next;
}
