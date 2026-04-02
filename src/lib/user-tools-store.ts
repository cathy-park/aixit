import { tools as seedTools, type Tool } from "@/lib/tools";

const OVERRIDES_KEY = "aixit.toolOverrides.v1";
const USER_TOOLS_KEY = "aixit.userTools.v1";
const DELETED_KEY = "aixit.deletedBuiltinToolIds.v1";

/** 도구 저장소 변경 시 같은 탭의 모든 useMergedTools 인스턴스가 갱신되도록 브로드캐스트 */
export const TOOLS_CATALOG_UPDATED_EVENT = "aixit-tools-catalog-updated";

function notifyToolsCatalogUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TOOLS_CATALOG_UPDATED_EVENT));
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadOverrides(): Record<string, Partial<Tool>> {
  if (typeof window === "undefined") return {};
  const v = safeParse<Record<string, Partial<Tool>>>(window.localStorage.getItem(OVERRIDES_KEY));
  return v && typeof v === "object" ? v : {};
}

export function saveOverrides(next: Record<string, Partial<Tool>>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
  notifyToolsCatalogUpdated();
}

export function loadUserTools(): Tool[] {
  if (typeof window === "undefined") return [];
  const v = safeParse<Tool[]>(window.localStorage.getItem(USER_TOOLS_KEY));
  return Array.isArray(v) ? v : [];
}

export function saveUserTools(list: Tool[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_TOOLS_KEY, JSON.stringify(list));
  notifyToolsCatalogUpdated();
}

export function loadDeletedBuiltinIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const v = safeParse<string[]>(window.localStorage.getItem(DELETED_KEY));
  return new Set(Array.isArray(v) ? v : []);
}

export function saveDeletedBuiltinIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DELETED_KEY, JSON.stringify([...ids]));
  notifyToolsCatalogUpdated();
}

function mergeTool(base: Tool, patch?: Partial<Tool>): Tool {
  if (!patch) return { ...base };
  const { credentialProvider, ...rest } = patch;
  const out: Tool = { ...base, ...rest };
  if (Object.prototype.hasOwnProperty.call(patch, "credentialProvider")) {
    if (credentialProvider == null) {
      delete out.credentialProvider;
    } else {
      out.credentialProvider = credentialProvider;
    }
  }
  return out;
}

/** 클라이언트에서만: 시드 + 사용자 도구 + 오버라이드 + 삭제 반영 */
export function listMergedTools(): Tool[] {
  if (typeof window === "undefined") return [...seedTools];
  const deleted = loadDeletedBuiltinIds();
  const overrides = loadOverrides();
  const userTools = loadUserTools();

  const builtins = seedTools
    .filter((t) => !deleted.has(t.id))
    .map((t) => mergeTool(t, overrides[t.id]));

  const seen = new Set(builtins.map((t) => t.id));
  const extra = userTools.filter((t) => !seen.has(t.id));
  return [...extra, ...builtins];
}

export function getMergedToolById(id: string): Tool | undefined {
  return listMergedTools().find((t) => t.id === id);
}

export function upsertBuiltinOverride(id: string, patch: Partial<Tool>) {
  const o = loadOverrides();
  const next = { ...o[id], ...patch } as Partial<Tool>;
  if (Object.prototype.hasOwnProperty.call(patch, "credentialProvider") && patch.credentialProvider == null) {
    delete next.credentialProvider;
  }
  o[id] = next;
  saveOverrides(o);
}

export function upsertUserTool(tool: Tool) {
  const list = loadUserTools();
  const idx = list.findIndex((t) => t.id === tool.id);
  if (idx < 0) list.unshift(tool);
  else list[idx] = tool;
  saveUserTools(list);
}

export function removeToolFromStore(id: string) {
  if (id.startsWith("user_tool_")) {
    saveUserTools(loadUserTools().filter((t) => t.id !== id));
    return;
  }
  const d = loadDeletedBuiltinIds();
  d.add(id);
  saveDeletedBuiltinIds(d);
}

export function makeUserToolId() {
  return `user_tool_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const EDITABLE_KEYS: (keyof Tool)[] = [
  "name",
  "description",
  "href",
  "logoText",
  "logoImageUrl",
  "avatarBackgroundColor",
  "credentialProvider",
  "credentialId",
  "credentialSecret",
  "highlightNote",
  "active",
  "subscriptionLabel",
  "tags",
  "cardTags",
];

/** 사용자 도구는 통째로 저장, 내장 도구는 시드 대비 변경분만 오버라이드 */
export function persistTool(tool: Tool) {
  if (tool.id.startsWith("user_tool_")) {
    upsertUserTool(tool);
    return;
  }
  const seed = seedTools.find((s) => s.id === tool.id);
  if (!seed) return;
  const patch: Partial<Tool> = {};
  for (const k of EDITABLE_KEYS) {
    const next = tool[k];
    const prev = seed[k];
    const same =
      next === prev ||
      (typeof next === "object" && typeof prev === "object" && JSON.stringify(next) === JSON.stringify(prev));
    if (!same) {
      (patch as Record<string, unknown>)[k as string] = next;
    }
  }
  const ov = loadOverrides()[tool.id];
  if (!tool.credentialProvider && ov?.credentialProvider) {
    (patch as Record<string, unknown>).credentialProvider = null;
  }
  upsertBuiltinOverride(tool.id, patch);
}
