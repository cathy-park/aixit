"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";

const NAV = [
  { href: "/", label: "홈", match: (p: string) => p === "/" },
  {
    href: "/projects",
    label: "프로젝트",
    match: (p: string) =>
      p === "/projects" ||
      p === "/dashboard" ||
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
  { href: "/settings", label: "설정", match: (p: string) => p.startsWith("/settings") },
] as const;

export function PrimarySidebar() {
  const pathname = usePathname() ?? "";

  return (
    <aside className="flex h-full min-h-0 w-[220px] shrink-0 flex-col overflow-y-auto border-r border-zinc-200 bg-white px-3 py-6">
      <Link href="/" className="px-3 text-lg font-semibold tracking-tight text-zinc-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sidebar-logo.png"
          alt="AIXIT"
          className="h-7 w-auto"
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
                "rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
