/** App shell 메인 스크롤 영역 — layout `id`와 AdaptivePageHeader 리스너가 동일 값 사용 */
export const AIXIT_MAIN_SCROLL_ID = "aixit-main-scroll";

const COMPACT_SCROLL_THRESHOLD_PX = 20;

/** 메인 열 스크롤 루트의 scrollTop (앱 셸에서는 window 가 아님) */
export function readMainScrollTop(): number {
  if (typeof document === "undefined") return 0;
  const el = document.getElementById(AIXIT_MAIN_SCROLL_ID);
  if (el) return el.scrollTop;
  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function isMainScrollCompact(): boolean {
  return readMainScrollTop() > COMPACT_SCROLL_THRESHOLD_PX;
}
