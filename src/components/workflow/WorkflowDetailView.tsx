"use client";

import Link from "next/link";
import { useMemo } from "react";
import { APP_CARD_GRID_CLASS } from "@/components/cards/app-card-layout";
import { ToolCard } from "@/components/tools/ToolCard";
import { cn } from "@/components/ui/cn";
import type { WorkflowDetail, WorkflowStep } from "@/lib/aixit-data";
import { useMergedTools } from "@/hooks/useMergedTools";
import type { Tool } from "@/lib/tools";

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200", className)}>{children}</div>;
}

function resolveToolForStep(step: WorkflowStep, catalog: Tool[]): Tool {
  const name = step.toolName.trim().toLowerCase();
  const byName = catalog.find((t) => t.name.trim().toLowerCase() === name);
  if (byName) return byName;
  const byId = catalog.find((t) => t.id === step.id);
  if (byId) return byId;
  return {
    id: `wf-step-${step.id}`,
    name: step.toolName,
    category: "워크플로우",
    capabilities: [],
    difficulty: "easy",
    recommendedFor: [],
    active: true,
    description: step.statusLabel,
  };
}

export function WorkflowDetailView({ wf }: { wf: WorkflowDetail }) {
  const { tools: catalog } = useMergedTools();

  const uniqueStepTools = useMemo(() => {
    const seen = new Set<string>();
    const out: Tool[] = [];
    for (const s of wf.steps) {
      const t = resolveToolForStep(s, catalog);
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      out.push(t);
    }
    return out;
  }, [wf.steps, catalog]);

  return (
    <div className="min-w-0 space-y-4">
      <header className="pb-5">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-700 hover:text-zinc-950"
        >
          <span aria-hidden>←</span>
          프로젝트
        </Link>
        <div className="mt-3 min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{wf.title}</h1>
          <p className="mt-1 mb-5 text-sm text-zinc-600">
            {wf.progress.done}/{wf.progress.total} 단계 완료 · {wf.progress.percentLabel}
          </p>
        </div>
      </header>

      <Card>
        <div className="text-sm font-semibold">연결된 도구</div>
        <p className="mt-1 text-xs text-zinc-500">단계에 사용 중인 도구입니다. 도구 창고와 동일한 카드로 표시돼요.</p>
        <div className={cn("mt-4", APP_CARD_GRID_CLASS)}>
          {uniqueStepTools.length === 0 ? (
            <div className="col-span-full rounded-2xl bg-zinc-50/80 p-6 text-sm text-zinc-600 ring-1 ring-zinc-200">
              등록된 도구가 없어요.
            </div>
          ) : (
            uniqueStepTools.map((tool) => <ToolCard key={tool.id} mode="workflow" tool={tool} />)
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">워크플로우 단계</div>
          <button type="button" className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zinc-800">
            단계 추가
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {wf.steps.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
              <div className="text-sm font-semibold">{s.toolName}</div>
              <div className="text-sm text-zinc-600">{s.statusLabel}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold">일정 &amp; 금액</div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-zinc-50 p-3">
              <div className="text-xs font-semibold text-zinc-500">시작일</div>
              <div className="mt-1 font-semibold">{wf.schedule.start}</div>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3">
              <div className="text-xs font-semibold text-zinc-500">마감일</div>
              <div className="mt-1 font-semibold">{wf.schedule.due}</div>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3">
              <div className="text-xs font-semibold text-zinc-500">금액</div>
              <div className="mt-1 font-semibold">{wf.schedule.budget}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold">함께하는 사람들</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {wf.people.length === 0 ? (
              <div className="text-sm text-zinc-500">—</div>
            ) : (
              wf.people.map((p) => (
                <div key={p.name} className="flex items-center gap-2 rounded-full bg-zinc-50 px-3 py-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                    {p.initial}
                  </div>
                  <div className="text-sm font-semibold">{p.name}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="text-sm font-semibold">관련 링크</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {wf.links.length === 0 ? (
            <div className="text-sm text-zinc-500">—</div>
          ) : (
            wf.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 hover:bg-white"
              >
                {l.label}
              </a>
            ))
          )}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold">메모</div>
        <div className="mt-3 space-y-2">
          {wf.memo.map((m, idx) => (
            <div key={idx} className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              {m}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
