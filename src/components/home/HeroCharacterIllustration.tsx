"use client";

import { cn } from "@/components/ui/cn";

/**
 * 홈 헤더용 hero 캐릭터 일러스트.
 * - avatar size(`w-8`, `w-10`...) 사용 금지
 * - 최소 높이 96px 이상, 권장 120px
 */
export function HeroCharacterIllustration({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex-shrink-0",
        // 최소 높이 유지 + 텍스트 baseline 정렬과 무관하게 hero 영역을 고정
        "min-h-[96px] h-[120px] w-32",
        className,
      )}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/home-header-character-v3.png?v=1"
        alt=""
        draggable={false}
        className="h-full w-full object-contain"
      />
    </div>
  );
}

