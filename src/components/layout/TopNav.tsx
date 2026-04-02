import Link from "next/link";
import { cn } from "@/components/ui/cn";

export function TopNav({ active }: { active?: "dashboard" | "calendar" }) {
  return (
    <header className="flex items-center justify-between">
      <div className="text-lg font-semibold tracking-tight">에이짓</div>
      <nav className="flex items-center gap-2">
        <Link
          href="/projects"
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition",
            active === "dashboard" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
          )}
        >
          프로젝트
        </Link>
        <Link
          href="/calendar"
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition",
            active === "calendar" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
          )}
        >
          캘린더
        </Link>
        <button className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-zinc-800">
          새 워크플로우
        </button>
      </nav>
    </header>
  );
}

