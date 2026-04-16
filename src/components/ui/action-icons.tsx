import { cn } from "@/components/ui/cn";

/** 참고 스타일: 얇은 스트로크, 둥근 끝, 뮤티드 슬레이트 (#9da2b0) */
const svgProps = {
  viewBox: "0 0 24 24" as const,
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const actionIconButtonClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#9da2b0] transition-colors hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/80 disabled:pointer-events-none disabled:opacity-35";

export function IconEdit({ className }: { className?: string }) {
  return (
    <svg className={cn("h-[18px] w-[18px]", className)} aria-hidden {...svgProps}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

export function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={cn("h-[18px] w-[18px]", className)} aria-hidden {...svgProps}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

/** 복제 — 둥근 모서리 두 겹 사각형(라인만) */
/** 템플릿으로 저장 — 겹친 사각형 + 플러스 느낌의 간단한 레이어 아이콘 */
export function IconSaveTemplate({ className }: { className?: string }) {
  return (
    <svg className={cn("h-[18px] w-[18px]", className)} aria-hidden {...svgProps}>
      <rect x="3" y="5" width="14" height="14" rx="2" />
      <path d="M7 3h10a2 2 0 012 2v10" />
      <path d="M12 11v6M9 14h6" strokeLinecap="round" />
    </svg>
  );
}

export function IconCopy({ className }: { className?: string }) {
  return (
    <svg className={cn("h-[18px] w-[18px]", className)} aria-hidden {...svgProps}>
      <rect x="4" y="4" width="12" height="12" rx="2" />
      <rect x="8" y="8" width="12" height="12" rx="2" />
    </svg>
  );
}

/** 세로 점 세 개 — 카드 액션 오버플로 메뉴 트리거 */
export function IconMoreVertical({ className }: { className?: string }) {
  return (
    <svg className={cn("h-[18px] w-[18px]", className)} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="6" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="18" r="1.5" />
    </svg>
  );
}

export function IconMove({ className }: { className?: string }) {
  return (
    <svg className={cn("h-[18px] w-[18px]", className)} aria-hidden {...svgProps}>
      <path d="M16 3h5v5" />
      <path d="M8 21H3v-5" />
      <path d="M13 11l8-8" />
      <path d="M11 13l-8 8" />
    </svg>
  );
}

const STAR_PATH = "M12 2.5l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2.5z";

/** 상단 고정: 꺼짐은 회색 라인, 켜짐은 채운 별(부모 `text-amber-500` 등으로 색 지정) */
export function IconStarPin({ active, className }: { active?: boolean; className?: string }) {
  return (
    <svg
      className={cn(
        "h-[18px] w-[18px] transition-[transform,fill,stroke] duration-200 ease-out",
        active ? "scale-[1.03]" : "scale-100",
        className,
      )}
      viewBox="0 0 24 24"
      aria-hidden
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={active ? 1.25 : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={STAR_PATH} />
    </svg>
  );
}
