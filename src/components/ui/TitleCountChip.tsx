import { cn } from "@/components/ui/cn";

/** 폴더 칩·페이지 타이틀 공통 개수 뱃지 */
export function TitleCountChip({
  count,
  variant = "default",
  className,
}: {
  count: number;
  /** 활성 칩(흰 배경) — 폴더 필터에서 선택된 칩 등 */
  variant?: "default" | "onAccent" | "onDark";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-1.5 text-[11px] font-bold tabular-nums",
        variant === "onAccent"
          ? "bg-white/20 text-white"
          : variant === "onDark"
            ? "bg-white/15 text-zinc-300"
            : "bg-zinc-100 text-zinc-600",
        className,
      )}
      aria-label={`${count}개`}
    >
      {count}개
    </span>
  );
}
