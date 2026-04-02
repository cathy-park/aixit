"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/components/ui/cn";
import type { InspirationSite } from "@/lib/inspiration-store";
import { incrementInspirationShortcut } from "@/lib/inspiration-store";
import { keywordTagToneClass, normalizeKeyword } from "@/lib/keyword-tag-styles";
import { actionIconButtonClass, IconEdit, IconStarPin, IconTrash } from "@/components/ui/action-icons";

export function InspirationSiteCard({
  site,
  onEdit,
  onDelete,
  pinned,
  onTogglePinned,
}: {
  site: InspirationSite;
  onEdit: () => void;
  onDelete: () => void;
  pinned?: boolean;
  onTogglePinned?: () => void;
}) {
  const logo = site.logoUrl?.trim();
  const initials = site.name.trim().slice(0, 2) || "?";
  const shortcutCount = useMemo(() => site.shortcutCount ?? 0, [site.shortcutCount]);

  return (
    <div
      className={cn(
        "w-full rounded-[22px] bg-white p-6 text-left shadow-sm ring-1 ring-zinc-200/90",
      )}
    >
      <div className="flex gap-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-extrabold text-white ring-1 ring-zinc-200/80",
            !logo && "bg-[#1769ff]",
          )}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-lg font-bold tracking-tight text-zinc-950">{site.name}</div>
              <p className="mt-1.5 text-sm leading-snug text-zinc-500">{site.description || site.category}</p>
            </div>
              <div className="flex shrink-0 items-start gap-0.5">
                {onTogglePinned ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onTogglePinned();
                    }}
                    className={cn(
                      actionIconButtonClass,
                      pinned && "text-amber-500 hover:bg-amber-50 hover:text-amber-600",
                    )}
                    aria-pressed={Boolean(pinned)}
                    title={pinned ? "상단 고정 해제" : "상단 고정"}
                  >
                    <IconStarPin active={Boolean(pinned)} />
                  </button>
                ) : null}
              <button
                type="button"
                onClick={onEdit}
                className={actionIconButtonClass}
                title="수정"
                aria-label="수정"
              >
                <IconEdit />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className={actionIconButtonClass}
                title="삭제"
                aria-label="삭제"
              >
                <IconTrash />
              </button>
            </div>
          </div>
        </div>
      </div>

      {site.memo.trim() ? (
        <div className="mt-5 rounded-2xl border border-amber-200/90 bg-[#fffbeb] px-4 py-3 text-sm font-medium leading-snug text-zinc-950">
          {site.memo}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {site.tags.map((t, i) => {
          const raw = t.startsWith("#") ? t.slice(1) : t;
          const tone = keywordTagToneClass(normalizeKeyword(raw));
          return (
            <span key={`${t}-${i}`} className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold ring-1", tone)}>
              {t.startsWith("#") ? t : `#${t}`}
            </span>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-zinc-500">바로가기 클릭</span>
          <span className="font-bold text-zinc-900">{shortcutCount}회</span>
        </div>
        {site.url.trim() ? (
          <Link
            href={site.url.trim().startsWith("http") ? site.url.trim() : `https://${site.url.trim()}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => incrementInspirationShortcut(site.id)}
            className="inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-center text-[13px] font-bold leading-tight text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
          >
            바로가기
          </Link>
        ) : (
          <span className="inline-flex w-full items-center justify-center rounded-full bg-zinc-100 px-6 py-2.5 text-[13px] font-bold leading-tight text-zinc-400 sm:w-auto">
            URL 없음
          </span>
        )}
      </div>
    </div>
  );
}
