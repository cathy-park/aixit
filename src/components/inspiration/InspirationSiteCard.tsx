"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { cn } from "@/components/ui/cn";
import type { InspirationSite } from "@/lib/inspiration-store";
import { incrementInspirationShortcut } from "@/lib/inspiration-store";
import { keywordTagToneClass, normalizeKeyword } from "@/lib/keyword-tag-styles";
import { actionIconButtonClass, IconEdit, IconStarPin, IconTrash } from "@/components/ui/action-icons";
import { CardActionsOverflow } from "@/components/cards/CardActionsOverflow";
import { MemoMiniMarkupText } from "@/components/workspace/MemoMiniMarkupText";
import {
  APP_CARD_SHELL_WAREHOUSE_CLASS,
  APP_CARD_TITLE_TEXT_CLASS,
  APP_CARD_TITLE_TRACK_CLASS,
} from "@/components/cards/app-card-layout";

function MemoNoteIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-block", className)} aria-hidden>
      <Image src="/memo-icon.png" alt="" width={16} height={16} className="h-4 w-4" />
    </span>
  );
}

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
  const [noteOpen, setNoteOpen] = useState(false);
  const logo = site.logoUrl?.trim();
  const initials = site.name.trim().slice(0, 2) || "?";
  const shortcutCount = useMemo(() => site.shortcutCount ?? 0, [site.shortcutCount]);
  const hasMemo = Boolean(site.memo.trim());

  return (
    <div className={APP_CARD_SHELL_WAREHOUSE_CLASS}>
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={cn(
            "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl text-base font-extrabold text-white ring-1 ring-zinc-200/80",
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
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-center gap-3">
            <div className={cn(APP_CARD_TITLE_TRACK_CLASS, "min-w-0")}>
              <span className={APP_CARD_TITLE_TEXT_CLASS}>{site.name}</span>
              {hasMemo ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setNoteOpen(true);
                  }}
                  className="inline-flex shrink-0 items-center justify-center rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label="메모 보기"
                  title="메모 보기"
                >
                  <MemoNoteIcon className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <CardActionsOverflow
              className="items-center gap-0.5"
              menuAriaLabel="참고 사이트 작업"
              desktopLeading={
                onTogglePinned ? (
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
                ) : null
              }
              mobileLeading={
                onTogglePinned ? (
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
                ) : null
              }
            >
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
            </CardActionsOverflow>
          </div>
          {site.description?.trim() ? (
            <p className="mt-[-4px] min-w-0 text-sm leading-snug text-zinc-500">{site.description.trim()}</p>
          ) : null}
        </div>
      </div>

      {site.tags.length > 0 ? (
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
      ) : null}

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

      {noteOpen && hasMemo ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspiration-note-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
            aria-label="닫기"
            onClick={() => setNoteOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-zinc-200">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-zinc-900 text-white">
                <MemoNoteIcon className="h-5 w-5" />
              </div>
              <h2 id="inspiration-note-modal-title" className="text-lg font-bold text-zinc-950">
                메모
              </h2>
            </div>
            <div className="mt-5 rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-800 ring-1 ring-zinc-200">
              <MemoMiniMarkupText text={site.memo.trim()} />
            </div>
            <button
              type="button"
              onClick={() => setNoteOpen(false)}
              className="mt-6 w-full rounded-2xl bg-zinc-900 py-3 text-sm font-bold text-white hover:bg-zinc-800"
            >
              닫기
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
