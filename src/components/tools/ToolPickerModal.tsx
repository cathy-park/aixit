"use client";

import { useEffect, useMemo, useState } from "react";
import type { Tool } from "@/lib/tools";
import { ToolCard } from "@/components/tools/ToolCard";
import { useMergedTools } from "@/hooks/useMergedTools";
import { PillSearchField } from "@/components/ui/PillSearchField";
import { WarehouseKeywordsRow } from "@/components/warehouse/WarehouseKeywordsRow";
import { normalizeKeyword } from "@/lib/keyword-tag-styles";

function toolMatchesQuery(t: Tool, q: string): boolean {
  if (!q) return true;
  const ql = q.toLowerCase();
  if (t.name.toLowerCase().includes(ql)) return true;
  if ((t.description ?? "").toLowerCase().includes(ql)) return true;
  if ((t.tags ?? []).some((x) => x.toLowerCase().includes(ql))) return true;
  if (t.category.toLowerCase().includes(ql)) return true;
  if ((t.highlightNote ?? "").toLowerCase().includes(ql)) return true;
  if ((t.capabilities ?? []).some((x) => x.toLowerCase().includes(ql))) return true;
  if ((t.recommendedFor ?? []).some((x) => x.toLowerCase().includes(ql))) return true;
  if (t.cardTags?.some((c) => c.label.toLowerCase().includes(ql))) return true;
  return false;
}

export function ToolPickerModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (tool: Tool) => void;
}) {
  const { tools } = useMergedTools();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tools.filter((t) => toolMatchesQuery(t, q));
    return [...list].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.name.localeCompare(b.name, "ko");
    });
  }, [query, tools]);

  const pickerKeywords = useMemo(() => {
    const counts = new Map<string, number>();
    const display = new Map<string, string>();
    const bump = (raw: string) => {
      const n = normalizeKeyword(raw);
      if (!n) return;
      counts.set(n, (counts.get(n) ?? 0) + 1);
      if (!display.has(n)) {
        const pretty = raw.trim().replace(/^#+/u, "").trim() || n;
        display.set(n, pretty);
      }
    };
    for (const tool of filtered) {
      if (tool.cardTags?.length) {
        for (const c of tool.cardTags) bump(c.label);
      }
      if (tool.tags?.length) {
        for (const raw of tool.tags) bump(raw);
      }
    }
    return [...counts.entries()]
      .map(([normalized, count]) => ({ normalized, display: display.get(normalized)!, count }))
      .sort((a, b) => b.count - a.count || a.display.localeCompare(b.display, "ko"))
      .map(({ normalized, display: d }) => ({ normalized, display: d }));
  }, [filtered]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="도구 선택">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" aria-label="닫기" />

      <div className="relative w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl ring-1 ring-zinc-200">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-lg font-semibold tracking-tight">도구 추가</div>
            <div className="mt-1 text-sm text-zinc-600">
              필요한 도구를 검색한 뒤, 카드 아무 곳이나 눌러 추가하세요. 창고에서 비활성화한 도구도 단계에 연결할 수 있어요. 하단 활성화 스위치만 누를 때는 카드가 선택되지 않아요.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            title="닫기"
            className="rounded-full bg-zinc-50 p-2 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-white"
          >
            <span aria-hidden className="text-xl leading-none">
              ×
            </span>
          </button>
        </div>

        <div className="mt-4">
          <PillSearchField
            value={query}
            onChange={setQuery}
            placeholder="도구 이름, 태그, 설명 검색"
            aria-label="도구 검색"
          />
          <WarehouseKeywordsRow keywords={pickerKeywords} onKeywordClick={(d) => setQuery(d)} />
        </div>

          <div className="mt-6 max-h-[55vh] overflow-auto px-1 pt-2">
          <div className="grid grid-cols-2 gap-5">
            {filtered.map((tool) => (
              <ToolCard
                key={tool.id}
                mode="picker"
                tool={tool}
                onSelect={() => {
                  onPick(tool);
                  onClose();
                }}
              />
            ))}
          </div>
          {filtered.length === 0 ? <div className="py-10 text-center text-sm text-zinc-500">검색 결과가 없어요.</div> : null}
        </div>
      </div>
    </div>
  );
}
