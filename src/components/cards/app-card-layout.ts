/** 카드 트랙 최소 목표(px) — 한 열에 들어갈 때 `min(100%, …)`와 함께 쓰여 잘림·가로 스크롤 없이 줄바꿈 */
export const APP_CARD_MIN_WIDTH_PX = 560;

/**
 * 공통 카드 그리드: 최대 2열. 열 전환은 뷰포트가 아니라 가장 가까운 `@container`(앱 본문) 너비 기준.
 * 앱 레이아웃 `AppChrome`에 `container-type:inline-size`가 있어, 사이드바가 넓어도 본문이 좁으면 1열.
 */
export const APP_CARD_GRID_CLASS =
  "grid w-full grid-flow-row gap-4 grid-cols-1 @min-[1140px]:grid-cols-2";

/** 그리드 셀 래퍼 — 셀 안에서만 줄어들도록 `min-w-0`, 행마다 wrap; 카드 테두리·링이 부모에 잘리지 않게 */
export const APP_CARD_GRID_ITEM_CLASS =
  "w-full min-w-0 max-w-full justify-self-stretch overflow-visible";

/** 대시보드·메모·프로젝트형 카드 바깥 프레임 — overflow 없음(테두리·모서리가 부모/레이어에 덜 잘림) */
export const APP_CARD_SHELL_DASHBOARD_CLASS =
  "flex w-full min-w-0 box-border rounded-[28px] border border-zinc-200/80 bg-white p-5 shadow-md shadow-zinc-200/50";

/**
 * 카드 안쪽 콘텐츠 클립 — 바깥 `rounded-[28px]` + `p-5`(20px)에 맞춘 이너 반경 ≈ 8px
 */
export const APP_CARD_SHELL_DASHBOARD_INNER_CLASS =
  "flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg";

/** 창고형 카드 외곽 (도구·영감) — 시각 톤 통일 */
export const APP_CARD_SHELL_WAREHOUSE_CLASS =
  "w-full min-w-0 overflow-hidden rounded-[28px] border border-zinc-200/80 bg-white p-5 text-left shadow-md shadow-zinc-200/50";

/** 상단 한 줄: 본문 트랙 + 우측 액션 열 */
export const APP_CARD_TOP_ROW_CLASS = "flex min-w-0 items-center gap-3";

/**
 * 클릭 영역 안: [아이콘 shrink-0] [제목 flex-1 truncate] [칩·상태 shrink-0] — flex-wrap 금지.
 * 행 전체에 overflow-hidden을 두면 상태 드롭다운·레이어가 잘리거나 포인터 계산이 꼬일 수 있어 제목 쪽에서만 자름.
 */
export const APP_CARD_TITLE_TRACK_CLASS =
  "flex min-w-0 flex-1 items-center gap-2 whitespace-nowrap";

export const APP_CARD_TITLE_TEXT_CLASS =
  "min-w-0 flex-1 truncate text-lg font-bold tracking-tight text-zinc-950";

/** 우측 고정 액션(핀·편집·삭제) */
export const APP_CARD_ACTIONS_COLUMN_CLASS = "flex shrink-0 flex-row items-center gap-0";

/** 그리드 빈 상태 등 */
export const APP_CARD_GRID_EMPTY_SPAN_CLASS = "col-span-full";
