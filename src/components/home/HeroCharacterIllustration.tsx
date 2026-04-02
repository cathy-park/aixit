"use client";

import { cn } from "@/components/ui/cn";

/**
 * 홈 헤더용 hero 캐릭터 일러스트.
 * - `public/image_8.png` (정사각형에 가깝게 object-contain)
 * - avatar size(`w-8`, `w-10`…) 직접 쓰지 않고 부모가 넘긴 정사각형 박스에 맞춤
 */
export function HeroCharacterIllustration({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/image_8.png?v=2"
        alt=""
        draggable={false}
        className="h-full w-full object-contain object-center"
      />
    </div>
  );
}
