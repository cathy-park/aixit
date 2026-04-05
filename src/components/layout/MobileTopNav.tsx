"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { APP_NAV_ITEMS } from "@/components/layout/app-nav-items";

/** layout.tsx icons와 동일 (앱 아이콘 / 파비콘) */
const APP_ICON_SRC = "/favicon-v2.png?v=8";

const MOBILE_TOPBAR_BG = "#17141E";

export const MOBILE_TOPBAR_HEIGHT_PX = 50;

export function MobileTopNav({ topbarHeightPx = MOBILE_TOPBAR_HEIGHT_PX }: { topbarHeightPx?: number }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  const activeLabel = useMemo(() => {
    for (const item of APP_NAV_ITEMS) if (item.match(pathname)) return item.label;
    return "AIXIT";
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-[60] flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 text-zinc-100",
        )}
        style={{
          height: topbarHeightPx,
          boxSizing: "border-box",
          backgroundColor: MOBILE_TOPBAR_BG,
        }}
      >
        <Link
          href="/dashboard"
          className="flex h-10 items-center gap-2 rounded-lg outline-none ring-white/30 focus-visible:ring-2"
          aria-label="AIXIT 홈"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={APP_ICON_SRC} alt="" className="h-8 w-8 object-contain" draggable={false} />
          <span className="sr-only">홈</span>
        </Link>

        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-sm font-semibold text-white">{activeLabel}</div>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-300 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="메뉴"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute left-0 top-0 z-10 flex h-full w-[min(280px,85vw)] flex-col shadow-xl ring-1 ring-white/10"
            style={{ backgroundColor: MOBILE_TOPBAR_BG }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={APP_ICON_SRC} alt="" className="h-8 w-8 object-contain" draggable={false} />
                <span className="text-sm font-semibold text-white">AIXIT</span>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-label="메뉴 닫기"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-3" aria-label="주요 메뉴">
              {APP_NAV_ITEMS.map((item) => {
                const active = item.match(pathname);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition",
                      active ? "bg-white/15 text-white" : "text-zinc-300 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
