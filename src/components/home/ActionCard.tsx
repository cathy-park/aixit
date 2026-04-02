import Link from "next/link";
import { cn } from "@/components/ui/cn";

export function ActionCard({
  title,
  subtitle,
  href,
  onHoverStart,
  onHoverEnd,
}: {
  title: string;
  subtitle?: string;
  href: string;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}) {
  return (
    <Link
      href={href}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
      className={cn(
        "group relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 transition will-change-transform",
        "cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:ring-zinc-300 active:translate-y-0 active:shadow-sm",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-200",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-base font-semibold tracking-tight text-zinc-950">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-zinc-600">{subtitle}</div> : null}
        </div>
        <div className="mt-0.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 transition group-hover:bg-zinc-900 group-hover:text-white">
          시작하기
        </div>
      </div>

      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-zinc-100 blur-2xl transition group-hover:bg-zinc-200" />
    </Link>
  );
}

