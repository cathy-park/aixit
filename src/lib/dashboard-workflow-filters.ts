import type { WorkflowPreview } from "@/lib/aixit-data";
import type { LayoutEntry } from "@/lib/dashboard-layout-store";
import type { DashboardFolderRecord } from "@/lib/dashboard-folders-store";
import type { WorkflowRunStatus } from "@/lib/workflow-run-status";

export const STATUS_ORDER: WorkflowRunStatus[] = ["진행중", "준비중", "보류", "완료", "중단"];

/** 노출 상태 — 켜진 상태의 카드만 목록에 표시 */
export type StatusVisibilityFilter = Record<WorkflowRunStatus, boolean>;

export const DEFAULT_STATUS_VISIBILITY: StatusVisibilityFilter = {
  진행중: true,
  준비중: true,
  보류: true,
  완료: true,
  중단: true,
};

function passesVisibility(status: WorkflowRunStatus, v: StatusVisibilityFilter): boolean {
  return Boolean(v[status]);
}

function entryKey(e: LayoutEntry) {
  return `${e.kind}:${e.id}`;
}

/** 마감일(ISO yyyy-mm-dd) 오름차순 정렬용 타임스탬프. 없으면 맨 뒤 */
export function endDateSortValue(iso?: string): number {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return Number.POSITIVE_INFINITY;
  const t = new Date(`${iso}T12:00:00`).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/** 폴더 내 항목을 필터·검색 후 정렬: 핀 → 마감 임박 순 → 레이아웃 순 */
export function collectFilteredWorkflowItems(
  folder: DashboardFolderRecord,
  entries: LayoutEntry[],
  visibility: StatusVisibilityFilter,
  pinnedKeys: Set<string>,
  resolvePreview: (entry: LayoutEntry) => WorkflowPreview | null,
  searchTrim: string,
): { entry: LayoutEntry; preview: WorkflowPreview }[] {
  const resolved = entries
    .map((entry) => {
      const preview = resolvePreview(entry);
      return preview ? { entry, preview } : null;
    })
    .filter((x): x is { entry: LayoutEntry; preview: WorkflowPreview } => x != null);

  const statusFiltered = resolved.filter(({ preview }) => passesVisibility(preview.status, visibility));

  const q = searchTrim.toLowerCase();
  const searched = q
    ? statusFiltered.filter(
        ({ preview }) =>
          preview.title.toLowerCase().includes(q) ||
          preview.subtitle.toLowerCase().includes(q) ||
          String(preview.status).toLowerCase().includes(q) ||
          folder.name.toLowerCase().includes(q),
      )
    : statusFiltered;

  const orderMap = new Map(entries.map((e, i) => [entryKey(e), i]));
  return [...searched].sort((a, b) => {
    const ka = entryKey(a.entry);
    const kb = entryKey(b.entry);
    const pa = pinnedKeys.has(ka);
    const pb = pinnedKeys.has(kb);
    if (pa !== pb) return pa ? -1 : 1;
    const ta = endDateSortValue(a.preview.endDate);
    const tb = endDateSortValue(b.preview.endDate);
    if (ta !== tb) return ta - tb;
    return (orderMap.get(entryKey(a.entry)) ?? 0) - (orderMap.get(entryKey(b.entry)) ?? 0);
  });
}
