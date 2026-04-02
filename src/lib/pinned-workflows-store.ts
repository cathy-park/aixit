const KEY = "aixit.pinnedWorkflowKeys.v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function layoutEntryPinKey(kind: "builtin" | "user", id: string): string {
  return `${kind}:${id}`;
}

export function loadPinnedWorkflowKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const raw = safeParse<string[]>(window.localStorage.getItem(KEY));
  return new Set(Array.isArray(raw) ? raw : []);
}

export function savePinnedWorkflowKeys(keys: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify([...keys]));
}

export function togglePinnedWorkflowKey(key: string): Set<string> {
  const next = new Set(loadPinnedWorkflowKeys());
  if (next.has(key)) next.delete(key);
  else next.add(key);
  savePinnedWorkflowKeys(next);
  return next;
}

export function removePinnedWorkflowKey(key: string) {
  const next = new Set(loadPinnedWorkflowKeys());
  if (!next.delete(key)) return;
  savePinnedWorkflowKeys(next);
}
