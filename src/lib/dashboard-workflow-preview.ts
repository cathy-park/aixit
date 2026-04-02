import type { WorkflowPreview } from "@/lib/aixit-data";
import type { Tool } from "@/lib/tools";
import type { DashboardWorkflow } from "@/lib/workflows-store";
import { ddayLabelFromEnd } from "@/lib/date-schedule";

/** 모든 단계의 toolIds 를 순서대로 훑어 중복 id 는 한 번만 — 종류(고유) 수·미리보기 id 목록 */
export function uniqueToolIdsAcrossSteps(w: DashboardWorkflow): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const step of w.steps) {
    for (const raw of step.toolIds ?? []) {
      const id = typeof raw === "string" ? raw.trim() : "";
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      order.push(id);
    }
  }
  return order;
}

function uniqueToolCount(w: DashboardWorkflow) {
  return uniqueToolIdsAcrossSteps(w).length;
}

/**
 * 내비게이터와 동일: 단계마다 toolIds 중 카탈로그에서 첫 번으로 찾아지는 도구만 사용,
 * 단계 순으로 중복 제거 후 최대 limit 개(카드 스택용).
 */
export function collectResolvedPreviewTools(
  w: DashboardWorkflow,
  resolve: (id: string) => Tool | undefined,
  limit = 3,
): Tool[] {
  const seen = new Set<string>();
  const out: Tool[] = [];
  for (const step of w.steps) {
    const resolved = (step.toolIds ?? [])
      .map((raw) => {
        const id = typeof raw === "string" ? raw.trim() : "";
        return id ? resolve(id) : undefined;
      })
      .find((t): t is Tool => Boolean(t));
    if (!resolved) continue;
    if (seen.has(resolved.id)) continue;
    seen.add(resolved.id);
    out.push(resolved);
    if (out.length >= limit) break;
  }
  return out;
}

function stepsCompletedFromWorkflow(w: DashboardWorkflow): number {
  const total = Math.max(1, w.steps.length);
  const status = w.status ?? "진행중";
  if (status === "완료") return total;
  if (status === "준비중") return 0;
  return Math.min(Math.max(0, w.currentStepIndex), total);
}

export function dashboardWorkflowToPreview(
  w: DashboardWorkflow,
  opts: { folderId: string; builtinEmoji?: string },
): WorkflowPreview {
  const total = Math.max(1, w.steps.length);
  const status = w.status ?? "진행중";
  const stepsCompleted = stepsCompletedFromWorkflow(w);

  const progressPct =
    status === "완료" ? 100 : status === "준비중" ? 0 : Math.min(100, Math.round((stepsCompleted / total) * 100));

  const title = w.name.replace(/\s*workflow\s*$/i, "").trim() || w.name;
  const emoji = w.emoji ?? opts.builtinEmoji ?? "📋";

  /** 카드·검색용: 사용자가 워크스페이스에 적은 설명만 (없으면 빈 문자열 — 자동 '현재 단계' 문구는 넣지 않음) */
  const subtitle = typeof w.subtitle === "string" ? w.subtitle.trim() : "";

  const allToolIds = uniqueToolIdsAcrossSteps(w);

  return {
    id: w.id,
    folderId: opts.folderId,
    title,
    subtitle,
    status,
    emoji,
    href: `/workspace?id=${encodeURIComponent(w.id)}`,
    stepsCompleted,
    stepsTotal: total,
    stepsDone: stepsCompleted,
    ddayLabel: ddayLabelFromEnd(w.endDate),
    progressPercentLabel: `${progressPct}%`,
    progressPercent: progressPct,
    toolsCount: uniqueToolCount(w),
    startDate: w.startDate,
    endDate: w.endDate,
    previewToolIds: allToolIds.slice(0, 3),
  };
}

export function userWorkflowToPreview(w: DashboardWorkflow): WorkflowPreview {
  return dashboardWorkflowToPreview(w, { folderId: w.folderId ?? "ddokdi" });
}
