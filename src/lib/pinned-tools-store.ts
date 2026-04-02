const KEY = "aixit.pinnedToolIds.v1";

export const PINNED_TOOLS_UPDATED_EVENT = "aixit-pinned-tools-updated";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadPinnedToolIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const raw = safeParse<string[]>(window.localStorage.getItem(KEY));
  return new Set(Array.isArray(raw) ? raw : []);
}

function savePinnedToolIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify([...ids]));
}

export function togglePinnedToolId(id: string): Set<string> {
  const next = new Set(loadPinnedToolIds());
  if (next.has(id)) next.delete(id);
  else next.add(id);
  savePinnedToolIds(next);

  window.dispatchEvent(new CustomEvent(PINNED_TOOLS_UPDATED_EVENT));
  return next;
}

