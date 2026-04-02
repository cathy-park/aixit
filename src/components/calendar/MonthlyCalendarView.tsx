"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/components/ui/cn";
import { actionIconButtonClass, IconTrash } from "@/components/ui/action-icons";
import { formatKoreanShortDateWithWeekday, getTodayIsoLocal } from "@/lib/today-project-filter";
import {
  addPlannedTodoForDate,
  getCompletedTodosGroupedByDate,
  getPlannedTodosGroupedByDate,
  removeTodayTodoById,
  setTodayTodoDone,
  type TodayTodo,
} from "@/lib/today-todos-store";
import { getCompletedProjectsGroupedByDate, type CalendarCompletedProject } from "@/lib/workflows-store";

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];

function monthGridCells(year: number, monthIndex: number): (Date | null)[] {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const padStart = first.getDay();
  const daysInMonth = last.getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < padStart; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, monthIndex, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function monthTitle(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });
}

type CalCellLine =
  | { kind: "planned"; id: string; label: string }
  | { kind: "todo"; id: string; label: string }
  | { kind: "project"; id: string; label: string };

function cellPreviewLines(
  iso: string,
  plannedByDate: Record<string, TodayTodo[]>,
  todosByDate: Record<string, TodayTodo[]>,
  projectsByDate: Record<string, CalendarCompletedProject[]>,
  max = 3,
): { lines: CalCellLine[]; total: number } {
  const planned = plannedByDate[iso] ?? [];
  const todos = todosByDate[iso] ?? [];
  const projects = projectsByDate[iso] ?? [];
  const lines: CalCellLine[] = [
    ...planned.map((t) => ({ kind: "planned" as const, id: t.id, label: t.text })),
    ...todos.map((t) => ({ kind: "todo" as const, id: t.id, label: t.text })),
    ...projects.map((p) => ({ kind: "project" as const, id: p.id, label: p.name })),
  ].slice(0, max);
  return { lines, total: planned.length + todos.length + projects.length };
}

export function MonthlyCalendarView() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [refreshKey, setRefreshKey] = useState(0);
  const [dayPopupIso, setDayPopupIso] = useState<string | null>(null);
  const [planDraft, setPlanDraft] = useState("");

  useEffect(() => {
    const bump = () => setRefreshKey((k) => k + 1);
    window.addEventListener("aixit-today-todos-updated", bump);
    window.addEventListener("aixit-workflows-updated", bump);
    return () => {
      window.removeEventListener("aixit-today-todos-updated", bump);
      window.removeEventListener("aixit-workflows-updated", bump);
    };
  }, []);

  const todosByDate = useMemo(() => {
    void refreshKey;
    return getCompletedTodosGroupedByDate();
  }, [refreshKey]);

  const plannedByDate = useMemo(() => {
    void refreshKey;
    return getPlannedTodosGroupedByDate();
  }, [refreshKey]);

  const projectsByDate = useMemo(() => {
    void refreshKey;
    return getCompletedProjectsGroupedByDate();
  }, [refreshKey]);

  const popupPlanned = dayPopupIso ? (plannedByDate[dayPopupIso] ?? []) : [];
  const popupCompletedTodos = dayPopupIso ? (todosByDate[dayPopupIso] ?? []) : [];
  const popupProjects = dayPopupIso ? (projectsByDate[dayPopupIso] ?? []) : [];

  const cells = useMemo(() => monthGridCells(year, monthIndex), [year, monthIndex]);
  const todayIso = getTodayIsoLocal();

  const goPrev = useCallback(() => {
    setMonthIndex((m) => {
      if (m === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goNext = useCallback(() => {
    setMonthIndex((m) => {
      if (m === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const goThisMonth = useCallback(() => {
    const d = new Date();
    setYear(d.getFullYear());
    setMonthIndex(d.getMonth());
  }, []);

  useEffect(() => {
    if (!dayPopupIso) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDayPopupIso(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dayPopupIso]);

  const openProject = useCallback(
    (id: string) => {
      setDayPopupIso(null);
      router.push(`/workspace?id=${encodeURIComponent(id)}`);
    },
    [router],
  );

  const addPlanned = useCallback(() => {
    if (!dayPopupIso) return;
    const text = planDraft.trim();
    if (!text) return;
    addPlannedTodoForDate(text, dayPopupIso);
    setPlanDraft("");
  }, [dayPopupIso, planDraft]);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
        <h2 className="text-lg font-bold tracking-tight text-zinc-950">{monthTitle(year, monthIndex)}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={goThisMonth}
            className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-200"
          >
            이번 달
          </button>
          <div className="flex items-center rounded-full ring-1 ring-zinc-200">
            <button
              type="button"
              onClick={goPrev}
              className="px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              aria-label="이전 달"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goNext}
              className="px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              aria-label="다음 달"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        날짜를 눌러 <span className="font-semibold text-sky-800">미리 일정(예정 할 일)</span>을 넣을 수 있어요. 예정일이 이번 주에 들어오면 홈{" "}
        <span className="font-semibold text-zinc-700">이번주 할 일</span>에 자동으로 나타납니다. 체크 완료한 할 일은{" "}
        <span className="font-semibold text-emerald-800">초록</span>, 예정만 잡힌 일은{" "}
        <span className="font-semibold text-sky-800">하늘색</span>, 워크스페이스 <span className="font-semibold text-zinc-700">완료</span> 프로젝트는{" "}
        <span className="font-semibold text-indigo-800">보라</span> 톤으로 보입니다.
      </p>

      <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-zinc-200 ring-1 ring-zinc-200">
        {WEEKDAYS_KO.map((d, i) => (
          <div
            key={d}
            className={cn(
              "bg-zinc-50 py-2 text-center text-[11px] font-bold",
              i === 0 && "text-red-600",
              i === 6 && "text-blue-600",
              i > 0 && i < 6 && "text-zinc-500",
            )}
          >
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          const iso = cell ? getTodayIsoLocal(cell) : "";
          const isToday = Boolean(cell && iso === todayIso);
          const weekendDow = cell ? cell.getDay() : -1; // 0 일, 6 토
          const { lines, total } = cell
            ? cellPreviewLines(iso, plannedByDate, todosByDate, projectsByDate)
            : { lines: [] as CalCellLine[], total: 0 };

          return (
            <div
              key={cell ? iso : `empty-${i}`}
              className={cn(
                "min-h-[5.5rem] bg-white p-1.5 sm:min-h-[6.5rem] sm:p-2",
                !cell && "bg-zinc-50/80",
              )}
            >
              {cell ? (
                <button
                  type="button"
                  onClick={() => {
                    setDayPopupIso(iso);
                    setPlanDraft("");
                  }}
                  className="w-full text-left outline-none transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-0"
                  aria-label={`${formatKoreanShortDateWithWeekday(iso)}, 기록 ${total}건`}
                >
                  <div
                    className={cn(
                      "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                      isToday
                        ? "bg-zinc-900 text-white"
                        : weekendDow === 0
                          ? "text-red-600"
                          : weekendDow === 6
                            ? "text-blue-600"
                            : "text-zinc-700",
                    )}
                  >
                    {cell.getDate()}
                  </div>
                  <ul className="space-y-0.5">
                    {lines.map((line) => (
                      <li
                        key={`${line.kind}-${line.id}`}
                        className={cn(
                          "truncate rounded-md px-1 py-0.5 text-[10px] font-medium leading-tight ring-1 sm:text-[11px]",
                          line.kind === "planned"
                            ? "bg-sky-50 text-sky-950 ring-sky-100"
                            : line.kind === "todo"
                              ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
                              : "bg-indigo-50 text-indigo-900 ring-indigo-100",
                        )}
                        title={line.label}
                      >
                        {line.label}
                      </li>
                    ))}
                    {total > 3 ? (
                      <li className="text-[10px] font-semibold text-zinc-400">+{total - 3}</li>
                    ) : null}
                  </ul>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {dayPopupIso ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cal-day-popup-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            aria-label="닫기"
            onClick={() => setDayPopupIso(null)}
          />
          <div className="relative max-h-[min(85vh,32rem)] w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-zinc-200">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 id="cal-day-popup-title" className="text-lg font-bold tracking-tight text-zinc-950">
                {formatKoreanShortDateWithWeekday(dayPopupIso)}
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500">이 날의 예정 할 일·완료 기록·프로젝트예요.</p>
            </div>
            <div className="max-h-[min(58vh,24rem)] overflow-y-auto px-5 py-4">
              <section aria-labelledby="cal-popup-planned" className="border-b border-zinc-100 pb-5">
                <h3 id="cal-popup-planned" className="text-xs font-bold uppercase tracking-wide text-sky-700">
                  예정 할 일 (홈 이번 주와 연동)
                </h3>
                <p className="mt-1 text-[11px] text-zinc-500">예정일이 이번 주이면, 그날이 되면 홈「이번주 할 일」에 자동으로 나타납니다.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={planDraft}
                    onChange={(e) => setPlanDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPlanned();
                      }
                    }}
                    placeholder="할 일을 입력하세요"
                    className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  />
                  <button
                    type="button"
                    onClick={addPlanned}
                    className="h-10 shrink-0 rounded-full bg-sky-700 px-5 text-sm font-bold text-white hover:bg-sky-800"
                  >
                    일정 추가
                  </button>
                </div>
                {popupPlanned.length === 0 ? (
                  <p className="mt-3 text-sm text-zinc-400">예정된 할 일이 없어요.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {popupPlanned.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50/90 px-3 py-2.5"
                      >
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => setTodayTodoDone(t.id, true)}
                            className="h-4 w-4 shrink-0 rounded border-zinc-300 text-sky-700 focus:ring-sky-400"
                          />
                          <span className="text-sm font-medium leading-snug text-sky-950">{t.text}</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => removeTodayTodoById(t.id)}
                          title="삭제"
                          aria-label="예정 할 일 삭제"
                          className={actionIconButtonClass}
                        >
                          <IconTrash />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="space-y-5 pt-5">
                {popupCompletedTodos.length > 0 ? (
                  <section aria-labelledby="cal-popup-todos">
                    <h3 id="cal-popup-todos" className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                      완료한 할 일
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {popupCompletedTodos.map((t) => (
                        <li
                          key={t.id}
                          className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm font-medium leading-snug text-emerald-950"
                        >
                          {t.text}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {popupProjects.length > 0 ? (
                  <section aria-labelledby="cal-popup-projects">
                    <h3 id="cal-popup-projects" className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                      프로젝트
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {popupProjects.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => openProject(p.id)}
                            className="w-full rounded-xl border border-indigo-200 bg-indigo-50/90 px-4 py-3 text-left text-sm font-semibold leading-snug text-indigo-950 transition hover:bg-indigo-100/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                          >
                            {p.name}
                            <span className="mt-1 block text-[11px] font-medium text-indigo-600/90">워크스페이스로 이동</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            </div>
            <div className="border-t border-zinc-100 px-5 py-3">
              <button
                type="button"
                onClick={() => setDayPopupIso(null)}
                className="w-full rounded-full bg-zinc-900 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
