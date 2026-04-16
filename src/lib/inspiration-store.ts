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
    // 기본값은 "클릭 전"처럼 0으로 둡니다.
    shortcutCount: 0,
  },
];

function normalize(s: InspirationSite): InspirationSite {
  // 구버전 seed 값이 잘못 남아있는 경우(예: Behance: 234) 마이그레이션
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

export function loadInspirationSites(): InspirationSite[] {
  if (typeof window === "undefined") return SEED.map(normalize);
  const raw = safeParse<InspirationSite[]>(window.localStorage.getItem(KEY));
  if (!raw || !Array.isArray(raw) || raw.length === 0) {
    window.localStorage.setItem(KEY, JSON.stringify(SEED));
    return SEED.map(normalize);
  }
  return raw.map(normalize);
}

export function saveInspirationSites(sites: InspirationSite[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(sites));
  window.dispatchEvent(new CustomEvent("aixit-inspiration-updated"));
}

export function addInspirationSite(site: Omit<InspirationSite, "id">) {
  const list = loadInspirationSites();
  const next: InspirationSite = { ...site, id: makeId() };
  saveInspirationSites([next, ...list.filter((x) => x.id !== next.id)]);
  return next;
}

export function updateInspirationSite(id: string, patch: Partial<InspirationSite>) {
  const list = loadInspirationSites();
  saveInspirationSites(list.map((x) => (x.id === id ? normalize({ ...x, ...patch, id: x.id }) : x)));
}

export function removeInspirationSite(id: string) {
  saveInspirationSites(loadInspirationSites().filter((x) => x.id !== id));
}

export function incrementInspirationShortcut(id: string) {
  const list = loadInspirationSites();
  saveInspirationSites(list.map((x) => (x.id === id ? { ...x, shortcutCount: (x.shortcutCount ?? 0) + 1 } : x)));
}
