"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
  FolderKanban,
  Home,
  Lightbulb,
  Settings,
  StickyNote,
  Wrench,
} from "lucide-react";
import { cn } from "@/components/ui/cn";

export type PrimarySidebarVariant = "full" | "rail";

const NAV: Array<{
  href: string;
  label: string;
  icon: typeof Home;
  match: (p: string) => boolean;
}> = [
  { href: "/dashboard", label: "홈", icon: Home, match: (p: string) => p === "/dashboard" },
  {
    href: "/projects",
    label: "프로젝트",
    icon: FolderKanban,
    match: (p: string) =>
      p === "/projects" || p.startsWith("/workspace") || p.startsWith("/recommendation"),
  },
  {
    href: "/workflows",
    label: "워크플로우",
    icon: BookOpen,
    match: (p: string) => p.startsWith("/workflows") || p.startsWith("/workflow/"),
  },
  { href: "/calendar", label: "캘린더", icon: Calendar, match: (p: string) => p.startsWith("/calendar") },
  { href: "/tools", label: "도구 창고", icon: Wrench, match: (p: string) => p.startsWith("/tools") },
  {
    href: "/inspiration",
    label: "영감 창고",
    icon: Lightbulb,
    match: (p: string) => p.startsWith("/inspiration"),
  },
  { href: "/memos", label: "메모", icon: StickyNote, match: (p: string) => p.startsWith("/memos") },
  { href: "/settings", label: "설정", icon: Settings, match: (p: string) => p.startsWith("/settings") },
];

export function PrimarySidebar({ variant = "full" }: { variant?: PrimarySidebarVariant }) {
  const pathname = usePathname() ?? "";
  const rail = variant === "rail";

  if (rail) {
    return (
      <aside
        className="flex h-full min-h-0 w-[4.5rem] shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-zinc-200 bg-white py-4 pl-2 pr-1"
        aria-label="주요 메뉴"
      >
        <Link
          href="/dashboard"
          className="mx-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl outline-none ring-zinc-200 focus-visible:ring-2"
          title="AIXIT 홈"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo2.png?v=7" alt="" className="h-7 w-7 object-contain" draggable={false} />
        </Link>
        <nav className="mt-6 flex flex-col items-center gap-1" aria-label="주요 메뉴">
          {NAV.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition",
                  active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                )}
              >
                <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={2} aria-hidden />
                <span className="sr-only">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    );
  }

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
