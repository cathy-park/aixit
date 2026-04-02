const KEY = "aixit.dismissedBuiltinWorkflows.v1";

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function listDismissedBuiltinIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const raw = safeParse<string[]>(window.localStorage.getItem(KEY));
  return new Set(Array.isArray(raw) ? raw : []);
}

export function dismissBuiltinWorkflow(id: string) {
  if (typeof window === "undefined") return;
  const s = listDismissedBuiltinIds();
  s.add(id);
  window.localStorage.setItem(KEY, JSON.stringify([...s]));
}
