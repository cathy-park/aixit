const KEY = "aixit.pinnedInspirationIds.v1";

export const PINNED_INSPIRATION_UPDATED_EVENT = "aixit-pinned-inspiration-updated";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadPinnedInspirationIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const raw = safeParse<string[]>(window.localStorage.getItem(KEY));
  return new Set(Array.isArray(raw) ? raw : []);
}

function savePinnedInspirationIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify([...ids]));
}

export function togglePinnedInspirationId(id: string): Set<string> {
  const next = new Set(loadPinnedInspirationIds());
  if (next.has(id)) next.delete(id);
  else next.add(id);
  savePinnedInspirationIds(next);

  window.dispatchEvent(new CustomEvent(PINNED_INSPIRATION_UPDATED_EVENT));
  return next;
}

