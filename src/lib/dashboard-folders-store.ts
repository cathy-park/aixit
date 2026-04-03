export type DashboardFolderIconType = "emoji" | "lucide" | "image_url" | "image_upload";

export type DashboardFolderRecord = {
  id: string;
  name: string;
  emoji: string;
  iconType: DashboardFolderIconType;
  imageDataUrl?: string | null;
  /** iconType이 lucide일 때 lucide-react 아이콘 이름 (예: FolderOpen) */
  lucideIcon?: string | null;
  /** 헤더·칩 강조색 (hex) */
  color: string;
  /** true면 폴더 칩에서 숨김 (전체 보기에서는 해당 폴더 프로젝트도 함께 표시) */
  hidden?: boolean;
};

const KEY = "aixit.dashboardFolders.v1";

const SEED: DashboardFolderRecord[] = [
  { id: "ddokdi", name: "똑디", emoji: "💼", iconType: "emoji", color: "#64748b" },
  { id: "naebae", name: "내배캠", emoji: "🎓", iconType: "emoji", color: "#6366f1" },
  { id: "hobby", name: "취미", emoji: "🎨", iconType: "emoji", color: "#a855f7" },
];

/** 앱 기본 프로젝트 폴더 — 숨김/삭제·칩 더보기 제한용 */
export const BUILTIN_DASHBOARD_FOLDER_IDS = new Set(SEED.map((f) => f.id));

export function isBuiltInDashboardFolder(id: string): boolean {
  return BUILTIN_DASHBOARD_FOLDER_IDS.has(id);
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function loadDashboardFolders(): DashboardFolderRecord[] {
  if (typeof window === "undefined") return [...SEED];
  const raw = safeParse<DashboardFolderRecord[]>(window.localStorage.getItem(KEY));
  if (!raw || !Array.isArray(raw) || raw.length === 0) {
    const initial = [...SEED];
    window.localStorage.setItem(KEY, JSON.stringify(initial));
    return initial;
  }
  return raw.map(normalizeDashboardFolderRecord);
}

export function saveDashboardFolders(folders: DashboardFolderRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(folders.map(normalizeDashboardFolderRecord)));
  window.dispatchEvent(new CustomEvent("aixit-dashboard-folders-updated"));
}

/**
 * 칩에 보이는 폴더(숨김 아님)만 순서 변경. 전체 배열에서 숨김 폴더의 상대 위치는 유지.
 * @param beforeId 드롭 대상 폴더 id 앞에 끼워 넣음. null이면 보이는 폴더 목록의 맨 뒤.
 */
export function reorderDashboardFolderBefore(dragId: string, beforeId: string | null) {
  const all = loadDashboardFolders();
  const visible = all.filter((f) => !f.hidden);
  const fromIdx = visible.findIndex((f) => f.id === dragId);
  if (fromIdx < 0) return;
  if (beforeId === dragId) return;

  const [moved] = visible.splice(fromIdx, 1);

  if (beforeId == null) {
    visible.push(moved);
  } else {
    const i = visible.findIndex((f) => f.id === beforeId);
    if (i < 0) visible.push(moved);
    else visible.splice(i, 0, moved);
  }

  let vi = 0;
  const next = all.map((f) => (f.hidden ? f : visible[vi++]));
  saveDashboardFolders(next);
}

export function normalizeDashboardFolderRecord(f: DashboardFolderRecord): DashboardFolderRecord {
  const raw = f.iconType as string;
  let iconType: DashboardFolderIconType = "emoji";
  if (raw === "image") {
    const url = (f.imageDataUrl ?? "").trim();
    iconType = url.startsWith("data:") ? "image_upload" : "image_url";
  } else if (raw === "lucide" || raw === "image_url" || raw === "image_upload" || raw === "emoji") {
    iconType = raw;
  }

  const imageDataUrl =
    iconType === "image_url" || iconType === "image_upload" ? (f.imageDataUrl ?? null) : null;

  const lucideIcon = iconType === "lucide" ? (f.lucideIcon?.trim() || "FolderOpen") : null;

  const emoji =
    iconType === "emoji"
      ? (f.emoji || "📁")
      : iconType === "lucide"
        ? ""
        : f.emoji || "📁";

  return {
    id: f.id,
    name: f.name || "이름 없음",
    emoji,
    iconType,
    imageDataUrl,
    lucideIcon,
    color: f.color && /^#[0-9A-Fa-f]{6}$/.test(f.color) ? f.color : "#64748b",
    hidden: Boolean(f.hidden),
  };
}

export function addDashboardFolder(
  data: Omit<DashboardFolderRecord, "id"> & { id?: string },
): DashboardFolderRecord {
  const id = data.id ?? `folder_${Date.now().toString(16)}`;
  const list = loadDashboardFolders();
  const record = normalizeDashboardFolderRecord({ ...data, id } as DashboardFolderRecord);
  saveDashboardFolders([...list, record]);
  return record;
}

export function updateDashboardFolder(id: string, patch: Partial<DashboardFolderRecord>) {
  const list = loadDashboardFolders();
  const idx = list.findIndex((f) => f.id === id);
  if (idx < 0) return;
  const next = [...list];
  next[idx] = normalizeDashboardFolderRecord({ ...next[idx], ...patch, id });
  saveDashboardFolders(next);
}

export function removeDashboardFolder(id: string) {
  const list = loadDashboardFolders().filter((f) => f.id !== id);
  saveDashboardFolders(list);
}

export function getDashboardFolder(id: string): DashboardFolderRecord | undefined {
  return loadDashboardFolders().find((f) => f.id === id);
}

/** 새 프로젝트 기본 폴더: 숨기지 않은 폴더 중 똑디 우선 */
export function pickDefaultProjectFolderId(folders: DashboardFolderRecord[]): string {
  const visible = folders.filter((f) => !f.hidden);
  const ddokdi = visible.find((f) => f.id === "ddokdi");
  if (ddokdi) return ddokdi.id;
  return visible[0]?.id ?? "ddokdi";
}

/** 명시적 프로젝트 폴더 전용 API (메모 폴더 스토어와 구분) */
export const loadProjectFolders = loadDashboardFolders;
export const saveProjectFolders = saveDashboardFolders;
export const createProjectFolder = addDashboardFolder;
export const updateProjectFolder = updateDashboardFolder;
export const deleteProjectFolder = removeDashboardFolder;
export const reorderProjectFolderBefore = reorderDashboardFolderBefore;
