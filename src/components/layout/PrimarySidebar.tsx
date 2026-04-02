"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { cn } from "@/components/ui/cn";

const NAV: Array<{
  href: string;
  label: string;
  match: (p: string) => boolean;
  icon?: "lightbulb";
}> = [
  { href: "/dashboard", label: "홈", match: (p: string) => p === "/dashboard" },
  {
    href: "/projects",
    label: "프로젝트",
    match: (p: string) =>
      p === "/projects" ||
      p.startsWith("/workspace") ||
      p.startsWith("/recommendation"),
  },
  {
    href: "/workflows",
    label: "워크플로우",
    match: (p: string) => p.startsWith("/workflows") || p.startsWith("/workflow/"),
  },
  { href: "/calendar", label: "캘린더", match: (p: string) => p.startsWith("/calendar") },
  { href: "/tools", label: "도구 창고", match: (p: string) => p.startsWith("/tools") },
  { href: "/inspiration", label: "영감 창고", match: (p: string) => p.startsWith("/inspiration") },
  { href: "/memos", label: "메모", match: (p: string) => p.startsWith("/memos"), icon: "lightbulb" },
  { href: "/settings", label: "설정", match: (p: string) => p.startsWith("/settings") },
];

export function PrimarySidebar() {
  const pathname = usePathname() ?? "";

  return (
    <aside className="flex h-full min-h-0 w-[220px] shrink-0 flex-col overflow-y-auto border-r border-zinc-200 bg-white px-3 py-6">
      <Link
        href="/dashboard"
        className="block min-w-0 bg-transparent px-3 text-lg font-semibold tracking-tight text-zinc-950 shadow-none ring-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo2.png?v=7"
          alt="AIXIT"
          className="h-auto max-h-8 w-full max-w-full bg-transparent object-contain object-left"
          draggable={false}
        />
      </Link>
      <p className="mt-1 px-3 text-xs font-medium text-zinc-500">워크플로우 내비게이터</p>

      <nav className="mt-8 flex flex-col gap-0.5" aria-label="주요 메뉴">
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100",
              )}
            >
              {item.icon === "lightbulb" ? (
                <Lightbulb className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-zinc-500")} aria-hidden />
              ) : null}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
