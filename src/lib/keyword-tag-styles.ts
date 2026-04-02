/** 창고·카드 공통: 동일 키워드(정규화 기준)면 항상 같은 색 */

const TONE_CLASSES = [
  "bg-sky-50 text-sky-800 ring-sky-200/90",
  "bg-emerald-50 text-emerald-800 ring-emerald-200/90",
  "bg-violet-50 text-violet-800 ring-violet-200/90",
  "bg-amber-50 text-amber-900 ring-amber-200/90",
  "bg-rose-50 text-rose-800 ring-rose-200/90",
  "bg-cyan-50 text-cyan-800 ring-cyan-200/90",
  "bg-indigo-50 text-indigo-800 ring-indigo-200/90",
  "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200/90",
] as const;

export function normalizeKeyword(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/u, "")
    .trim()
    .toLowerCase();
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function keywordTagToneClass(normalizedKey: string): string {
  if (!normalizedKey) return TONE_CLASSES[0];
  return TONE_CLASSES[hashString(normalizedKey) % TONE_CLASSES.length];
}
