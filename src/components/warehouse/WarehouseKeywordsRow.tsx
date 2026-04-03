"use client";

import { cn } from "@/components/ui/cn";
import { keywordTagToneClass, normalizeKeyword } from "@/lib/keyword-tag-styles";

export type WarehouseKeywordItem = { normalized: string; display: string };

export function WarehouseKeywordsRow({
  keywords,
  onKeywordClick,
}: {
  keywords: WarehouseKeywordItem[];
  onKeywordClick?: (display: string) => void;
}) {
  if (keywords.length === 0) return null;

  return (
    <div className="mt-3 mb-5 flex flex-wrap items-center gap-2">
      <span className="w-full text-xs font-semibold text-zinc-500 sm:mr-1 sm:w-auto">사용 중인 키워드</span>
      <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-1">
        {keywords.map(({ normalized, display }) => {
          const tone = keywordTagToneClass(normalized);
          const label = display.startsWith("#") ? display : `#${display}`;
          if (onKeywordClick) {
            return (
              <button
                key={normalized}
                type="button"
                onClick={() => onKeywordClick(display)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 transition hover:opacity-90",
                  tone,
                )}
              >
                {label}
              </button>
            );
          }
          return (
            <span key={normalized} className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold ring-1", tone)}>
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function mergeKeywordDisplay(raw: string, map: Map<string, string>) {
  const n = normalizeKeyword(raw);
  if (!n) return;
  if (!map.has(n)) {
    const pretty = raw.trim().replace(/^#+/u, "").trim() || n;
    map.set(n, pretty);
  }
}
