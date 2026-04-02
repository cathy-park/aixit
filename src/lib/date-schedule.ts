/** "3/28" 형태를 ISO 날짜로 (연도 고정 mock) */
export function scheduleMdToIso(md: string, year = 2026): string | undefined {
  if (!md || md === "—") return undefined;
  const m = md.trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m) return undefined;
  const month = Number.parseInt(m[1], 10);
  const day = Number.parseInt(m[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatShortKoreanDate(iso?: string): string | null {
  if (!iso) return null;
  const [y, mo, d] = iso.split("-").map(Number);
  if (!y || !mo || !d) return null;
  return `${mo}/${d}`;
}

/** 마감일 기준 D-n 라벨 (Asia/Seoul 기준 단순 일수) */
export function ddayLabelFromEnd(iso?: string, now = new Date()): string {
  if (!iso) return "—";
  const end = new Date(`${iso}T23:59:59+09:00`);
  if (Number.isNaN(end.getTime())) return "—";
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - startOfToday.getTime();
  const diffDays = Math.ceil(diffMs / 86400000);
  if (diffDays > 0) return `D-${diffDays}`;
  if (diffDays === 0) return "D-day";
  return `D+${Math.abs(diffDays)}`;
}

/** D-day, D-1~3 등 임박 시 강조(빨간색) */
export function isDdayLabelUrgent(label: string): boolean {
  if (label === "D-day") return true;
  const m = label.match(/^D-(\d+)$/);
  if (m) return Number.parseInt(m[1], 10) <= 3;
  return false;
}
