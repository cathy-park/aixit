/** 카드 최소 가로폭(px) — 그리드·아이템 래퍼와 동일 기준 */
export const APP_CARD_MIN_WIDTH_PX = 560;

/**
 * 앱 공통 카드 그리드: `minmax(560px,1fr)`로 카드가 560px 미만으로 줄지 않음.
 * 좁은 뷰포트에서는 열 수가 줄고, 필요 시 가로 스크롤.
 */
export const APP_CARD_GRID_CLASS =
  "grid w-full gap-4 [grid-template-columns:repeat(auto-fill,minmax(560px,1fr))]";

/** 그리드 안 카드 래퍼(DnD·정렬용) — max-w 제한 없음 */
export const APP_CARD_GRID_ITEM_CLASS = "w-full min-w-[560px] max-w-none justify-self-stretch";

/** 대시보드·메모·프로젝트형 카드 외곽 (WorkflowCard·메모 등) */
export const APP_CARD_SHELL_DASHBOARD_CLASS =
  "flex w-full min-w-0 box-border overflow-hidden rounded-[28px] border border-zinc-200/80 bg-white p-5 shadow-md shadow-zinc-200/50";

/** 창고형 카드 외곽 (도구·영감) — 시각 톤 통일 */
export const APP_CARD_SHELL_WAREHOUSE_CLASS =
  "w-full min-w-0 overflow-hidden rounded-[28px] border border-zinc-200/80 bg-white p-5 text-left shadow-md shadow-zinc-200/50";

/** 상단 한 줄: 본문 트랙 + 우측 액션 열 */
export const APP_CARD_TOP_ROW_CLASS = "flex min-w-0 items-center gap-3";

/**
 * 클릭 영역 안: [아이콘 shrink-0] [제목 flex-1 truncate] [칩·상태 shrink-0] — flex-wrap 금지
 */
export const APP_CARD_TITLE_TRACK_CLASS =
  "flex min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap";

export const APP_CARD_TITLE_TEXT_CLASS =
  "min-w-0 flex-1 truncate text-lg font-bold tracking-tight text-zinc-950";

/** 우측 고정 액션(핀·편집·삭제) */
export const APP_CARD_ACTIONS_COLUMN_CLASS = "flex shrink-0 flex-row items-center gap-0";

/** 그리드 빈 상태 등 */
export const APP_CARD_GRID_EMPTY_SPAN_CLASS = "col-span-full";
