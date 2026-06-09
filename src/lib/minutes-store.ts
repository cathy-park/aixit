export type AttachmentMeta = {
  id: string;
  name: string;
  size: number;
  type: string;
  // Supabase Storage 경로 또는 IndexedDB 식별자
  storagePath?: string; 
};

export type MinuteLink = {
  id: string;
  url: string;
  title: string;
};

export type MinutesFolder = {
  id: string;
  name: string;
  iconUrl?: string; // base64 resized image
  createdAt: string; // ISO 8601
  order: number;
  hidden?: boolean;
  attachments?: AttachmentMeta[];
  links?: MinuteLink[];
};

export type MinuteIconType = "meet" | "email" | "default";

export type MeetingMinute = {
  id: string;
  folderId: string;
  title: string;
  iconType?: MinuteIconType;
  date: string; // YYYY-MM-DD format
  content: string; // Markdown text
  attachments: AttachmentMeta[];
  links?: MinuteLink[];
  createdAt: string;
  updatedAt: string;
};

export type MinutesStoreData = {
  folders: MinutesFolder[];
  minutes: MeetingMinute[];
};

const KEY = "aixit.minutes.v1";

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `min_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
}

function safeParse(raw: string | null): MinutesStoreData {
  const def: MinutesStoreData = { folders: [], minutes: [] };
  if (!raw) return def;
  try {
    const parsed = JSON.parse(raw);
    return {
      folders: Array.isArray(parsed?.folders) ? parsed.folders : [],
      minutes: Array.isArray(parsed?.minutes) ? parsed.minutes : [],
    };
  } catch {
    return def;
  }
}

export function loadMinutesStore(): MinutesStoreData {
  if (typeof window === "undefined") return { folders: [], minutes: [] };
  return safeParse(window.localStorage.getItem(KEY));
}

export function saveMinutesStore(data: MinutesStoreData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("aixit-minutes-updated"));
}

// ---- 폴더 관련 API ----

export function createMinutesFolder(name: string): MinutesFolder {
  const store = loadMinutesStore();
  const folder: MinutesFolder = {
    id: newId(),
    name: name.trim() || "새 폴더",
    createdAt: new Date().toISOString(),
    order: store.folders.length,
  };
  store.folders.push(folder);
  saveMinutesStore(store);
  return folder;
}

export function updateMinutesFolder(id: string, updates: Partial<Pick<MinutesFolder, "name" | "order" | "iconUrl" | "hidden" | "attachments" | "links">>): boolean {
  const store = loadMinutesStore();
  const folder = store.folders.find((f) => f.id === id);
  if (!folder) return false;
  if (updates.name !== undefined) folder.name = updates.name.trim();
  if (updates.iconUrl !== undefined) folder.iconUrl = updates.iconUrl;
  if (updates.order !== undefined) folder.order = updates.order;
  if (updates.hidden !== undefined) folder.hidden = updates.hidden;
  if (updates.attachments !== undefined) folder.attachments = updates.attachments;
  if (updates.links !== undefined) folder.links = updates.links;
  saveMinutesStore(store);
  return true;
}

export function deleteMinutesFolder(id: string): boolean {
  const store = loadMinutesStore();
  const initialLength = store.folders.length;
  store.folders = store.folders.filter((f) => f.id !== id);
  // 폴더 삭제 시 해당 폴더의 회의록도 삭제 (선택적: 여기서는 삭제)
  store.minutes = store.minutes.filter((m) => m.folderId !== id);
  
  if (store.folders.length === initialLength) return false;
  saveMinutesStore(store);
  return true;
}

// ---- 회의록 관련 API ----

export function createMeetingMinute(folderId: string, title: string, date: string, iconType: MinuteIconType = "default"): MeetingMinute {
  const store = loadMinutesStore();
  const minute: MeetingMinute = {
    id: newId(),
    folderId,
    title,
    iconType,
    date,
    content: "",
    attachments: [],
    links: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.minutes.push(minute);
  saveMinutesStore(store);
  return minute;
}

export function updateMeetingMinute(
  id: string,
  updates: Partial<Pick<MeetingMinute, "title" | "date" | "content" | "attachments" | "iconType" | "links">>
): MeetingMinute | null {
  const store = loadMinutesStore();
  const minute = store.minutes.find((m) => m.id === id);
  if (!minute) return null;

  if (updates.title !== undefined) minute.title = updates.title;
  if (updates.date !== undefined) minute.date = updates.date;
  if (updates.content !== undefined) minute.content = updates.content;
  if (updates.attachments !== undefined) minute.attachments = updates.attachments;
  if (updates.iconType !== undefined) minute.iconType = updates.iconType;
  if (updates.links !== undefined) minute.links = updates.links;
  minute.updatedAt = new Date().toISOString();
  saveMinutesStore(store);
  return minute;
}

export function deleteMeetingMinute(id: string): boolean {
  const store = loadMinutesStore();
  const initialLength = store.minutes.length;
  store.minutes = store.minutes.filter((m) => m.id !== id);
  if (store.minutes.length === initialLength) return false;
  saveMinutesStore(store);
  return true;
}
