import { supabase, supabaseEnabled } from "@/lib/supabase/supabaseClient";

export type InspirationSite = {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  memo: string;
  tags: string[];
  /** data URL 또는 http(s) 이미지 주소 */
  logoUrl: string;
  active: boolean;
  /** 바로가기 클릭 누적 */
  shortcutCount: number;
};

const KEY = "aixit.inspirationSites.v1";

export const INSPIRATION_CATEGORIES = ["레퍼런스", "포트폴리오", "영감", "UI", "프로덕트", "챗봇", "기타"] as const;

let cache: InspirationSite[] | null = null;
let isFetching = false;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `insp_${Date.now().toString(16)}`;
}

const SEED: InspirationSite[] = [
  {
    id: "seed_behance",
    name: "Behance",
    description: "어도비 크리에이티브 포트폴리오",
    url: "https://www.behance.net",
    category: "레퍼런스",
    memo: "매주 월요일 트렌드 체크, Discover 탭에 좋은 작품 많음",
    tags: ["레퍼런스", "포트폴리오", "영감"],
    logoUrl: "",
    active: true,
    shortcutCount: 0,
  },
];

function normalize(s: InspirationSite): InspirationSite {
  const needsSeedShortcutReset = s.id === "seed_behance" && s.shortcutCount === 234;
  return {
    ...s,
    tags: Array.isArray(s.tags) ? s.tags : [],
    logoUrl: typeof s.logoUrl === "string" ? s.logoUrl : "",
    shortcutCount: needsSeedShortcutReset
      ? 0
      : typeof s.shortcutCount === "number"
        ? s.shortcutCount
        : 0,
    active: s.active !== false,
  };
}

/** 
 * 로컬 스토리지는 이제 '오프라인/미로그인 시 최소한의 캐시' 용도로만 사용합니다. 
 * 용량 초과 에러를 방지하기 위해 try-catch로 감쌉니다.
 */
function saveToLocalStorage(sites: InspirationSite[]) {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(sites);
    // 500KB를 넘어가면 로컬 스토리지는 아예 시도하지 않음
    if (serialized.length > 500 * 1024) {
      console.warn("Data too large for LocalStorage (>500KB), skipped local backup.");
      return;
    }
    window.localStorage.setItem(KEY, serialized);
  } catch (e) {
    // 혹시라도 위에서 못 걸러낸 에러가 있다면 여기서 잡음
    console.warn("LocalStorage quota exceeded, skipping local backup for inspiration sites.", e);
  }
}

async function saveToSupabase(sites: InspirationSite[]) {
  if (!supabaseEnabled || !supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("aixit_kv")
    .upsert({ user_id: user.id, k: KEY, v: JSON.stringify(sites) }, { onConflict: "user_id,k" });

  if (error) {
    console.error("Failed to save inspiration sites to Supabase:", error.message);
  }
}

export function loadInspirationSites(): InspirationSite[] {
  if (typeof window === "undefined") return SEED.map(normalize);

  // 1. 캐시가 있으면 즉시 반환
  if (cache) return cache;

  // 2. 캐시가 없으면 로컬 스토리지에서 먼저 로드 (빠른 피드백)
  const raw = safeParse<InspirationSite[]>(window.localStorage.getItem(KEY));
  const initial = (raw && Array.isArray(raw) && raw.length > 0) ? raw.map(normalize) : SEED.map(normalize);
  cache = initial;

  // 3. 백그라운드에서 수파베이스 데이터 로드 시도
  triggerSupabaseFetch();
  
  return initial;
}

async function triggerSupabaseFetch() {
  if (isFetching || !supabaseEnabled || !supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  isFetching = true;
  try {
    const { data, error } = await supabase
      .from("aixit_kv")
      .select("v")
      .eq("user_id", user.id)
      .eq("k", KEY)
      .single();

    if (!error && data?.v) {
      const remote = safeParse<InspirationSite[]>(data.v);
      if (remote && Array.isArray(remote)) {
        cache = remote.map(normalize);
        window.dispatchEvent(new CustomEvent("aixit-inspiration-updated"));
      }
    }
  } catch (e) {
    console.error("Supabase fetch error:", e);
  } finally {
    isFetching = false;
  }
}

export function saveInspirationSites(sites: InspirationSite[]) {
  cache = sites;
  saveToLocalStorage(sites);
  saveToSupabase(sites);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("aixit-inspiration-updated"));
  }
}

export function addInspirationSite(site: Omit<InspirationSite, "id">) {
  const list = loadInspirationSites();
  const next: InspirationSite = { ...site, id: makeId() };
  const updated = [next, ...list.filter((x) => x.id !== next.id)];
  saveInspirationSites(updated);
  return next;
}

export function updateInspirationSite(id: string, patch: Partial<InspirationSite>) {
  const list = loadInspirationSites();
  const updated = list.map((x) => (x.id === id ? normalize({ ...x, ...patch, id: x.id }) : x));
  saveInspirationSites(updated);
}

export function removeInspirationSite(id: string) {
  const updated = loadInspirationSites().filter((x) => x.id !== id);
  saveInspirationSites(updated);
}

export function incrementInspirationShortcut(id: string) {
  const list = loadInspirationSites();
  const updated = list.map((x) => (x.id === id ? { ...x, shortcutCount: (x.shortcutCount ?? 0) + 1 } : x));
  saveInspirationSites(updated);
}
