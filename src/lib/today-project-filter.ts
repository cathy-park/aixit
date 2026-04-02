import type { DashboardWorkflow } from "@/lib/workflows-store";

/** 로컬 타임존 기준 오늘 날짜 (yyyy-mm-dd) */
export function getTodayIsoLocal(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 해당 날짜가 속한 주의 시작(일요일)을 로컬 기준 YYYY-MM-DD로 */
export function getLocalSundayWeekStartIso(d = new Date()): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = copy.getDay();
  copy.setDate(copy.getDate() - dow);
  return getTodayIsoLocal(copy);
}

/** 일요일 시작 ISO에 대해 같은 주 토요일 YYYY-MM-DD */
export function getLocalSaturdayWeekEndIso(sundayStartIso: string): string {
  const parts = sundayStartIso.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const day = parts[2];
  if (!y || !m || !day) return sundayStartIso;
  const end = new Date(y, m - 1, day + 6);
  return getTodayIsoLocal(end);
}

/** `YYYY-MM-DD` → 예: 4월 6일 (일) */
export function formatKoreanShortDateWithWeekday(iso: string): string {
  const parts = iso.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

/** 일~토 한 주 구간 문구 */
export function formatKoreanWeekRangeSunSat(sundayStartIso: string): string {
  const end = getLocalSaturdayWeekEndIso(sundayStartIso);
  return `${formatKoreanShortDateWithWeekday(sundayStartIso)} – ${formatKoreanShortDateWithWeekday(end)}`;
}

const WEEKDAY_SHORT_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 일요일 시작 주의 7일 (각 YYYY-MM-DD) */
export function getWeekDayIsoListSundayStart(sundayStartIso: string): string[] {
  const parts = sundayStartIso.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const day = parts[2];
  if (!y || !m || !day) return [];
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(y, m - 1, day + i);
    out.push(getTodayIsoLocal(d));
  }
  return out;
}

export function koreanWeekdayShortLabels(): readonly string[] {
  return WEEKDAY_SHORT_KO;
}

/** `YYYY-MM-DD` → 짧은 한국어 표기 (예: 3월 15일 (토) 완료) */
export function formatKoreanCompletedDateLabel(iso: string): string {
  const parts = iso.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return `${iso} 완료`;
  const label = new Date(y, m - 1, d).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  return `${label} 완료`;
}

function validIso(iso?: string): iso is string {
  return Boolean(iso && /^\d{4}-\d{2}-\d{2}$/.test(iso));
}

/** `YYYY-MM-DD` → 로컬 자정 기준 Date (UTC 파싱 오류 방지) */
export function parseLocalDateFromIso(iso: string): Date {
  const parts = iso.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

/**
 * 메인(오늘 대시보드)에 노출할 프로젝트 여부.
 * - 시작일 또는 마감일이 오늘
 * - 시작~마감 구간에 오늘이 포함
 * - 진행 중이며 오늘이 일정 구간 안에 있거나(또는 일정 미설정으로 진행 중인 작업으로 간주)
 * - 준비중이며 시작일이 오늘
 */
export function isProjectRelevantToToday(w: DashboardWorkflow, today: string): boolean {
  if (w.status === "완료" || w.status === "중단") return false;

  const s = validIso(w.startDate) ? w.startDate : undefined;
  const e = validIso(w.endDate) ? w.endDate : undefined;

  if (s === today || e === today) return true;
  if (s && e && s <= today && e >= today) return true;

  if (w.status === "준비중" && s === today) return true;

  if (w.status === "진행중" && w.steps.length > 0) {
    const inWindow =
      (s && e && s <= today && e >= today) ||
      (s && !e && s <= today) ||
      (!s && e && e >= today) ||
      (!s && !e);
    if (inWindow) return true;
  }

  if (w.status === "보류" && s && e && s <= today && e >= today) return true;

  return false;
}
