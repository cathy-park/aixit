"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ToolCard } from "@/components/tools/ToolCard";
import { ToolFormModal } from "@/components/tools/ToolFormModal";
import { WarehouseKeywordsRow } from "@/components/warehouse/WarehouseKeywordsRow";
import { AdaptivePageHeader } from "@/components/layout/AdaptivePageHeader";
import { AppMainColumn } from "@/components/layout/AppMainColumn";
import { PillSearchField } from "@/components/ui/PillSearchField";
import { useMergedTools } from "@/hooks/useMergedTools";
import { normalizeKeyword } from "@/lib/keyword-tag-styles";
import type { Tool } from "@/lib/tools";
import { persistTool, removeToolFromStore } from "@/lib/user-tools-store";
import { loadPinnedToolIds, togglePinnedToolId, PINNED_TOOLS_UPDATED_EVENT } from "@/lib/pinned-tools-store";

function toolMatchesSearch(tool: Tool, q: string) {
  if (!q) return true;
  const hay = [
    tool.name,
    tool.category,
    tool.description ?? "",
    tool.highlightNote ?? "",
    ...(tool.tags ?? []),
    ...tool.capabilities,
    ...tool.recommendedFor,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function ToolsWarehouseView() {
  const { tools, refresh } = useMergedTools();
  const [modal, setModal] = useState<{ mode: "create" | "edit"; initial: Tool | null } | null>(null);
  const [search, setSearch] = useState("");
  const [pinnedToolIds, setPinnedToolIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setPinnedToolIds(loadPinnedToolIds());
    const onUpd = () => setPinnedToolIds(loadPinnedToolIds());
    window.addEventListener(PINNED_TOOLS_UPDATED_EVENT, onUpd);
    return () => window.removeEventListener(PINNED_TOOLS_UPDATED_EVENT, onUpd);
  }, []);

  const filteredTools = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = tools.filter((t) => toolMatchesSearch(t, q));
    return [...list].sort((a, b) => {
      const pa = pinnedToolIds.has(a.id);
      const pb = pinnedToolIds.has(b.id);
      if (pa !== pb) return pa ? -1 : 1;
      const ua = a.usageCount ?? 0;
      const ub = b.usageCount ?? 0;
      if (ub !== ua) return ub - ua;
      return a.name.localeCompare(b.name, "ko");
    });
  }, [tools, search, pinnedToolIds]);

  const toolTagSuggestions = useMemo(() => {
    const s = new Set<string>();
    for (const tool of tools) {
      if (tool.cardTags?.length) {
        for (const c of tool.cardTags) {
          const t = c.label.trim().replace(/^#+/u, "").trim();
          if (t) s.add(t);
        }
      }
      for (const raw of tool.tags ?? []) {
        const t = raw.trim().replace(/^#+/u, "").trim();
        if (t) s.add(t);
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b, "ko"));
  }, [tools]);

  const warehouseKeywords = useMemo(() => {
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
    for (const tool of filteredTools) {
      if (tool.cardTags?.length) for (const c of tool.cardTags) bump(c.label);
      if (tool.tags?.length) for (const raw of tool.tags) bump(raw);
    }
    return [...counts.entries()]
      .map(([normalized, count]) => ({ normalized, display: display.get(normalized)!, count }))
      .sort((a, b) => b.count - a.count || a.display.localeCompare(b.display, "ko"))
      .map(({ normalized, display: d }) => ({ normalized, display: d }));
  }, [filteredTools]);

  const openCreate = useCallback(() => setModal({ mode: "create", initial: null }), []);
  const openEdit = useCallback((t: Tool) => setModal({ mode: "edit", initial: t }), []);

  const handleSave = useCallback(
    (tool: Tool) => {
      persistTool(tool);
      refresh();
    },
    [refresh],
  );

  const handleDelete = useCallback(
    (t: Tool) => {
      if (typeof window === "undefined") return;
      if (!window.confirm(`「${t.name}」도구를 삭제할까요?`)) return;
      removeToolFromStore(t.id);
      refresh();
    },
    [refresh],
  );

  return (
    <>
      <AdaptivePageHeader
        title="도구 창고"
        count={filteredTools.length}
        description="등록된 도구를 한곳에서 살펴보세요."
        rightSlot={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-bold leading-none text-white shadow-sm hover:bg-zinc-800"
          >
            추가
          </button>
        }
      />
      <AppMainColumn>
      <div className="mt-0">
        <PillSearchField
          value={search}
          onChange={setSearch}
          placeholder="도구 이름, 태그, 메모 검색"
          aria-label="도구 검색"
        />
        <WarehouseKeywordsRow keywords={warehouseKeywords} onKeywordClick={(d) => setSearch(d)} />
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {filteredTools.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-8 text-center text-sm text-zinc-500">
            검색 결과가 없어요.
          </div>
        ) : (
          filteredTools.map((tool) => (
            <ToolCard
              key={tool.id}
              mode="warehouse"
              tool={tool}
              onEdit={() => openEdit(tool)}
              onDelete={() => handleDelete(tool)}
              pinned={pinnedToolIds.has(tool.id)}
              onTogglePinned={() => {
                togglePinnedToolId(tool.id);
                // event listener에서 pinnedToolIds가 갱신됩니다.
              }}
              onWarehouseTogglePersist={(next) => {
                persistTool(next);
                refresh();
              }}
            />
          ))
        )}
      </div>
      </AppMainColumn>

      <ToolFormModal
        open={modal != null}
        mode={modal?.mode ?? "create"}
        initial={modal?.initial ?? null}
        suggestionTags={toolTagSuggestions}
        onClose={() => setModal(null)}
        onSave={handleSave}
      />
    </>
  );
}
