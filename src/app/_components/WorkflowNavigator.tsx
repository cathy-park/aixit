"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Workflow, WorkflowStep } from "@/lib/workflows";
import { mockWorkflows } from "@/lib/workflows";

type StepState = "selected" | "default";

function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatRelative(ts: number) {
  const diffMs = Date.now() - ts;
  const mins = Math.round(diffMs / 60000);
  if (mins <= 0) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function StatusPill({ status }: { status: WorkflowStep["status"] }) {
  const styles =
    status === "succeeded"
      ? "bg-emerald-500/15 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300"
      : status === "running"
        ? "bg-sky-500/15 text-sky-700 ring-sky-600/20 dark:text-sky-300"
        : status === "failed"
          ? "bg-rose-500/15 text-rose-700 ring-rose-600/20 dark:text-rose-300"
          : status === "queued"
            ? "bg-amber-500/15 text-amber-700 ring-amber-600/20 dark:text-amber-300"
            : "bg-zinc-500/15 text-zinc-700 ring-zinc-600/20 dark:text-zinc-300";

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        styles,
      )}
    >
      {status}
    </span>
  );
}

function StepDot({ status, state }: { status: WorkflowStep["status"]; state: StepState }) {
  const base =
    status === "succeeded"
      ? "bg-emerald-500"
      : status === "running"
        ? "bg-sky-500"
        : status === "failed"
          ? "bg-rose-500"
          : status === "queued"
            ? "bg-amber-500"
            : "bg-zinc-400 dark:bg-zinc-600";

  return (
    <span
      className={clsx(
        "h-2.5 w-2.5 shrink-0 rounded-full",
        base,
        state === "selected" && "ring-4 ring-zinc-200 dark:ring-zinc-800",
      )}
    />
  );
}

function Icon({ name, className }: { name: "search" | "play" | "sparkle" | "arrow"; className?: string }) {
  if (name === "search") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path
          d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "play") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path
          d="M8.5 6.8v10.4c0 1.1 1.2 1.8 2.2 1.2l8.1-5.2c.9-.6.9-1.9 0-2.5l-8.1-5.2c-1-.6-2.2.1-2.2 1.3Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (name === "sparkle") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path
          d="M12 2l1.2 5.2L18 8.4l-4.8 1.2L12 14.8l-1.2-5.2L6 8.4l4.8-1.2L12 2Z"
          fill="currentColor"
        />
        <path
          d="M19.5 13l.7 3 2.8.7-2.8.7-.7 3-.7-3-2.8-.7 2.8-.7.7-3Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WorkflowNavigator() {
  const [query, setQuery] = useState("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(mockWorkflows[0]?.id ?? "");
  const [selectedStepId, setSelectedStepId] = useState<string>("");

  const workflow = useMemo(
    () => mockWorkflows.find((w) => w.id === selectedWorkflowId) ?? mockWorkflows[0],
    [selectedWorkflowId],
  );

  const steps = workflow?.steps ?? [];
  const selectedStep = useMemo(() => steps.find((s) => s.id === selectedStepId) ?? steps[0], [steps, selectedStepId]);

  useEffect(() => {
    if (!workflow) return;
    setSelectedStepId(workflow.steps[0]?.id ?? "");
  }, [workflow?.id]);

  const filteredWorkflows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mockWorkflows;
    return mockWorkflows.filter((w) => {
      if (w.name.toLowerCase().includes(q)) return true;
      if (w.description.toLowerCase().includes(q)) return true;
      if (w.tags.some((t) => t.toLowerCase().includes(q))) return true;
      if (w.steps.some((s) => s.title.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [query]);

  const stepListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && !(e.metaKey || e.ctrlKey || e.altKey)) {
        const el = document.getElementById("workflow-search") as HTMLInputElement | null;
        if (el) {
          e.preventDefault();
          el.focus();
        }
      }
      if (!workflow || steps.length === 0) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

      const active = document.activeElement;
      if (active && active.id === "workflow-search") return;

      const idx = Math.max(
        0,
        steps.findIndex((s) => s.id === (selectedStep?.id ?? "")),
      );
      const nextIdx = e.key === "ArrowDown" ? Math.min(steps.length - 1, idx + 1) : Math.max(0, idx - 1);
      const next = steps[nextIdx];
      if (!next) return;
      e.preventDefault();
      setSelectedStepId(next.id);

      const container = stepListRef.current;
      const el = container?.querySelector<HTMLButtonElement>(`button[data-step-id="${next.id}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedStep?.id, steps, workflow]);

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex min-h-dvh max-w-[1400px] flex-col">
        <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/60">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
                <Icon name="sparkle" className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">AI Workflow Navigator</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Browse workflows, steps, and state</div>
              </div>
            </div>
            <div className="hidden items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 sm:flex">
              <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-800 dark:bg-zinc-900">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">/</span> search
              </span>
              <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-800 dark:bg-zinc-900">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">↑</span>{" "}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">↓</span> steps
              </span>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:gap-6">
          <aside className="lg:w-[360px]">
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      id="workflow-search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search workflows, tags, steps…"
                      className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-4 focus:ring-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700 dark:focus:ring-zinc-800/60"
                    />
                  </div>
                </div>
              </div>

              <div className="max-h-[40vh] overflow-auto lg:max-h-[calc(100dvh-220px)]">
                <div className="p-2">
                  {filteredWorkflows.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      No workflows match “{query}”.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredWorkflows.map((w) => {
                        const selected = w.id === selectedWorkflowId;
                        return (
                          <button
                            key={w.id}
                            onClick={() => setSelectedWorkflowId(w.id)}
                            className={clsx(
                              "group flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                              selected
                                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                                : "hover:bg-zinc-50 dark:hover:bg-zinc-950",
                            )}
                          >
                            <div
                              className={clsx(
                                "mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg",
                                selected
                                  ? "bg-white/10 text-white dark:bg-zinc-950/10 dark:text-zinc-950"
                                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
                              )}
                            >
                              <Icon name="play" className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="truncate text-sm font-semibold">{w.name}</div>
                                <span
                                  className={clsx(
                                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                                    selected
                                      ? "bg-white/10 text-white dark:bg-zinc-950/10 dark:text-zinc-950"
                                      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
                                  )}
                                >
                                  {w.steps.length} steps
                                </span>
                              </div>
                              <div
                                className={clsx(
                                  "mt-0.5 line-clamp-2 text-xs",
                                  selected ? "text-white/80 dark:text-zinc-900/70" : "text-zinc-500 dark:text-zinc-400",
                                )}
                              >
                                {w.description}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {w.tags.slice(0, 3).map((t) => (
                                  <span
                                    key={t}
                                    className={clsx(
                                      "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                                      selected
                                        ? "bg-white/10 text-white dark:bg-zinc-950/10 dark:text-zinc-950"
                                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
                                    )}
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <Icon
                              name="arrow"
                              className={clsx(
                                "mt-2 h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-60",
                                selected && "opacity-60",
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
            <section className="lg:w-[520px]">
              <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{workflow?.name ?? "Workflow"}</div>
                      <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {workflow?.updatedAt ? `Updated ${formatRelative(workflow.updatedAt)}` : "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                        Run: {workflow?.runId ?? "—"}
                      </span>
                      <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                        Env: {workflow?.environment ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div ref={stepListRef} className="max-h-[45vh] overflow-auto p-2 lg:max-h-[calc(100dvh-220px)]">
                  <ol className="space-y-1">
                    {steps.map((s, i) => {
                      const selected = s.id === selectedStep?.id;
                      const state: StepState = selected ? "selected" : "default";
                      return (
                        <li key={s.id}>
                          <button
                            data-step-id={s.id}
                            onClick={() => setSelectedStepId(s.id)}
                            className={clsx(
                              "flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                              selected ? "bg-zinc-50 dark:bg-zinc-950" : "hover:bg-zinc-50 dark:hover:bg-zinc-950",
                            )}
                          >
                            <div className="mt-1 flex items-center gap-3">
                              <StepDot status={s.status} state={state} />
                              <div className="h-full w-px bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="truncate text-sm font-semibold">
                                  <span className="text-zinc-400 dark:text-zinc-500">#{i + 1}</span>{" "}
                                  <span>{s.title}</span>
                                </div>
                                <StatusPill status={s.status} />
                              </div>
                              <div className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                                {s.summary}
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            </section>

            <section className="min-w-0 flex-1">
              <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{selectedStep?.title ?? "Step details"}</div>
                      <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {selectedStep?.status ? (
                          <>
                            Status: <span className="font-medium text-zinc-700 dark:text-zinc-200">{selectedStep.status}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                    {selectedStep?.durationMs != null ? (
                      <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                        Duration: {(selectedStep.durationMs / 1000).toFixed(1)}s
                      </span>
                    ) : (
                      <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                        Duration: —
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Summary</div>
                    <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
                      {selectedStep?.summary ?? "Select a step to see details."}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                      <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Inputs</div>
                      <pre className="mt-2 overflow-auto rounded-lg bg-zinc-50 p-2 text-[12px] leading-5 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                        {JSON.stringify(selectedStep?.inputs ?? {}, null, 2)}
                      </pre>
                    </div>
                    <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                      <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Outputs</div>
                      <pre className="mt-2 overflow-auto rounded-lg bg-zinc-50 p-2 text-[12px] leading-5 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                        {JSON.stringify(selectedStep?.outputs ?? {}, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Logs</div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Mock data for now</span>
                    </div>
                    <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <div className="max-h-56 overflow-auto bg-zinc-950 p-3 font-mono text-[12px] leading-5 text-zinc-100">
                        {(selectedStep?.logs ?? ["—"]).map((line, idx) => (
                          <div key={idx} className="whitespace-pre-wrap">
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

