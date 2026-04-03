"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { APP_NAV_ITEMS } from "@/components/layout/app-nav-items";

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
        {APP_NAV_ITEMS.map((item) => {
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
