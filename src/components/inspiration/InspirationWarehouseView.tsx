"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { InspirationSiteCard } from "@/components/inspiration/InspirationSiteCard";
import { WarehouseKeywordsRow } from "@/components/warehouse/WarehouseKeywordsRow";
import { AdaptivePageHeader } from "@/components/layout/AdaptivePageHeader";
import { AppMainColumn } from "@/components/layout/AppMainColumn";
import { PillSearchField } from "@/components/ui/PillSearchField";
import { InspirationSiteFormModal } from "@/components/inspiration/InspirationSiteFormModal";
import {
  addInspirationSite,
  loadInspirationSites,
  removeInspirationSite,
  updateInspirationSite,
  type InspirationSite,
} from "@/lib/inspiration-store";
import {
  loadPinnedInspirationIds,
  togglePinnedInspirationId,
  PINNED_INSPIRATION_UPDATED_EVENT,
} from "@/lib/pinned-inspiration-store";
import { normalizeKeyword } from "@/lib/keyword-tag-styles";

export function InspirationWarehouseView() {
  const [sites, setSites] = useState<InspirationSite[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; initial: InspirationSite | null } | null>(null);
  const [pinnedInspirationIds, setPinnedInspirationIds] = useState<Set<string>>(() => new Set());

  const refresh = useCallback(() => setSites(loadInspirationSites()), []);

  useEffect(() => {
    refresh();
    const onUpd = () => refresh();
    window.addEventListener("aixit-inspiration-updated", onUpd);
    return () => window.removeEventListener("aixit-inspiration-updated", onUpd);
  }, [refresh]);

  useEffect(() => {
    setPinnedInspirationIds(loadPinnedInspirationIds());
    const onPinnedUpd = () => setPinnedInspirationIds(loadPinnedInspirationIds());
    window.addEventListener(PINNED_INSPIRATION_UPDATED_EVENT, onPinnedUpd);
    return () => window.removeEventListener(PINNED_INSPIRATION_UPDATED_EVENT, onPinnedUpd);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = !q
      ? sites
      : sites.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.memo.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q) ||
            s.tags.some((t) => t.toLowerCase().includes(q)),
        );
    return [...list].sort((a, b) => {
      const pa = pinnedInspirationIds.has(a.id);
      const pb = pinnedInspirationIds.has(b.id);
      if (pa !== pb) return pa ? -1 : 1;
      const ca = a.shortcutCount ?? 0;
      const cb = b.shortcutCount ?? 0;
      if (cb !== ca) return cb - ca;
      return a.name.localeCompare(b.name, "ko");
    });
  }, [sites, search, pinnedInspirationIds]);

  const inspirationTagSuggestions = useMemo(() => {
    const s = new Set<string>();
    for (const site of sites) {
      for (const raw of site.tags) {
        const t = raw.trim().replace(/^#+/u, "");
        if (t) s.add(t);
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b, "ko"));
  }, [sites]);

  const warehouseKeywords = useMemo(() => {
    const counts = new Map<string, number>();
    const display = new Map<string, string>();
    for (const site of filtered) {
      for (const raw of site.tags) {
        const n = normalizeKeyword(raw);
        if (!n) continue;
        counts.set(n, (counts.get(n) ?? 0) + 1);
        if (!display.has(n)) {
          const pretty = raw.trim().replace(/^#+/u, "").trim() || n;
          display.set(n, pretty);
        }
      }
    }
    return [...counts.entries()]
      .map(([normalized, count]) => ({ normalized, display: display.get(normalized)!, count }))
      .sort((a, b) => b.count - a.count || a.display.localeCompare(b.display, "ko"))
      .map(({ normalized, display: d }) => ({ normalized, display: d }));
  }, [filtered]);

  return (
    <>
      <AdaptivePageHeader
        title="영감 창고"
        count={filtered.length}
        description="레퍼런스·포트폴리오·아이디어를 카드로 모아두는 공간이에요."
        rightSlot={
          <button
            type="button"
            onClick={() => setModal({ mode: "create", initial: null })}
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
          placeholder="사이트 이름, 설명, 태그, 메모 검색"
          aria-label="영감 검색"
        />
        <WarehouseKeywordsRow keywords={warehouseKeywords} onKeywordClick={(d) => setSearch(d)} />
      </div>

      <ul className="mt-5 grid gap-5 sm:grid-cols-2">
        {filtered.length === 0 ? (
          <li className="col-span-full rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-8 text-center text-sm text-zinc-500">
            검색 결과가 없어요.
          </li>
        ) : (
          filtered.map((site) => (
            <li key={site.id}>
              <InspirationSiteCard
                site={site}
                onEdit={() => setModal({ mode: "edit", initial: site })}
                onDelete={() => {
                  if (typeof window !== "undefined" && !window.confirm(`「${site.name}」을(를) 삭제할까요?`)) return;
                  removeInspirationSite(site.id);
                  refresh();
                }}
                pinned={pinnedInspirationIds.has(site.id)}
                onTogglePinned={() => {
                  togglePinnedInspirationId(site.id);
                }}
              />
            </li>
          ))
        )}
      </ul>
      </AppMainColumn>

      <InspirationSiteFormModal
        open={modal != null}
        mode={modal?.mode ?? "create"}
        initial={modal?.initial ?? null}
        suggestionTags={inspirationTagSuggestions}
        onClose={() => setModal(null)}
        onSave={(payload) => {
          const { id, ...rest } = payload;
          if (id) {
            updateInspirationSite(id, rest);
          } else {
            addInspirationSite({ ...rest, shortcutCount: 0 });
          }
          refresh();
        }}
      />
    </>
  );
}
