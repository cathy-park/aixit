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
    <div className="mt-3 mb-5 flex flex-col sm:flex-row sm:items-center gap-2">
      <span className="shrink-0 text-xs font-semibold text-zinc-500 sm:mr-1">사용 중인 키워드</span>
      <div className="flex w-full overflow-x-auto scrollbar-hide gap-2 sm:w-auto sm:flex-1 pb-1">
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
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 transition hover:opacity-90",
                  tone,
                )}
              >
                {label}
              </button>
            );
          }
          return (
            <span key={normalized} className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1", tone)}>
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
