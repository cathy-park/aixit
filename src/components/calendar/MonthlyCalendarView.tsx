"use client";

/**
 * 월간 캘린더는 커스텀 그리드입니다.
 * 일정 이동: HTML5 DnD — 예정·완료 할 일은 `reassignTodayTodoCalendarDate`, 완료 프로젝트는 `reassignCompletedProjectCalendarDate`(completedAt).
 */
import type { DragEvent } from "react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/components/ui/cn";
import { actionIconButtonClass, IconTrash } from "@/components/ui/action-icons";
import { formatKoreanShortDateWithWeekday, getTodayIsoLocal } from "@/lib/today-project-filter";
import { shouldCommitTagOnEnter } from "@/lib/tag-input-keydown";
import {
  addPlannedTodoForDate,
  getCompletedTodosGroupedByDate,
  getPlannedTodosGroupedByDate,
  reassignTodayTodoCalendarDate,
  removeTodayTodoById,
  setTodayTodoDone,
  setTodoCategory,
  type TodayTodo,
} from "@/lib/today-todos-store";
import {
  loadTodoCategories,
  saveTodoCategories,
  addTodoCategory,
  updateTodoCategory,
  deleteTodoCategory,
  CATEGORY_COLOR_OPTIONS,
  type TodoCategory,
} from "@/lib/todo-categories-store";
import {
  getCompletedProjectsGroupedByDate,
  reassignCompletedProjectCalendarDate,
  updateDashboardWorkflowCategory,
  type CalendarCompletedProject,
} from "@/lib/workflows-store";

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** 캘린더 셀 간 일정(예정·완료 할 일·완료 프로젝트) 이동 */
const CAL_ITEM_DRAG_MIME = "application/x-aixit-cal-item";

type CalDragKind = "planned" | "todo" | "project";

function parseCalDragPayload(dt: DataTransfer): { kind: CalDragKind; id: string } | null {
  const raw = dt.getData(CAL_ITEM_DRAG_MIME);
  if (raw) {
    try {
      const p = JSON.parse(raw) as { kind?: string; id?: string };
      if (
        (p.kind === "planned" || p.kind === "todo" || p.kind === "project") &&
        typeof p.id === "string" &&
        p.id.length > 0
      ) {
        return { kind: p.kind, id: p.id };
      }
    } catch {
      /* ignore */
    }
  }
  const plain = dt.getData("text/plain");
  if (plain.startsWith("aixit-cal:")) {
    const rest = plain.slice("aixit-cal:".length);
    const colon = rest.indexOf(":");
    if (colon > 0) {
      const kind = rest.slice(0, colon) as CalDragKind;
      const id = rest.slice(colon + 1);
      if ((kind === "planned" || kind === "todo" || kind === "project") && id) return { kind, id };
    }
  }
  if (plain.startsWith("aixit-cal-todo:")) {
    return { kind: "todo", id: plain.slice("aixit-cal-todo:".length) };
  }
  return null;
}

/**
 * 달력 그리드에 보이는 모든 칸을 실제 `Date`로 채움(이전 달 말일·다음 달 초일 포함).
 * 드롭 시 `getTodayIsoLocal(cell)`로 연·월·일이 정확히 반영됨.
 */
function monthGridCellsAllDates(year: number, monthIndex: number): Date[] {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const padStart = first.getDay();
  const daysInMonth = last.getDate();
  const cells: Date[] = [];
  for (let i = 0; i < padStart; i++) {
    cells.push(new Date(year, monthIndex, i + 1 - padStart));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, monthIndex, d));
  }
  let k = 1;
  while (cells.length % 7 !== 0) {
    cells.push(new Date(year, monthIndex, daysInMonth + k));
    k++;
  }
  return cells;
}

function monthTitle(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });
}

type CalCellLine =
  | { kind: "planned"; id: string; label: string; colorClass?: string }
  | { kind: "todo"; id: string; label: string; colorClass?: string }
  | { kind: "project"; id: string; label: string; colorClass?: string };

function cellPreviewLines(
  iso: string,
  plannedByDate: Record<string, TodayTodo[]>,
  todosByDate: Record<string, TodayTodo[]>,
  projectsByDate: Record<string, CalendarCompletedProject[]>,
  categories: TodoCategory[],
  max = 3,
): { lines: CalCellLine[]; total: number } {
  const planned = plannedByDate[iso] ?? [];
  const todos = todosByDate[iso] ?? [];
  const projects = projectsByDate[iso] ?? [];

  const getCatColor = (catId?: string) => categories.find((c) => c.id === catId)?.colorClass;

  const lines: CalCellLine[] = [
    ...planned.map((t) => ({
      kind: "planned" as const,
      id: t.id,
      label: t.text,
      colorClass: getCatColor(t.categoryId),
    })),
    ...todos.map((t) => ({
      kind: "todo" as const,
      id: t.id,
      label: t.text,
      colorClass: getCatColor(t.categoryId),
    })),
    ...projects.map((p) => ({
      kind: "project" as const,
      id: p.id,
      label: p.name,
      colorClass: getCatColor(p.categoryId),
    })),
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
  const [calDropTargetIso, setCalDropTargetIso] = useState<string | null>(null);
  const calItemDraggingRef = useRef(false);

  const [categories, setCategories] = useState<TodoCategory[]>([]);
  const [isCatSettingsOpen, setIsCatSettingsOpen] = useState(false);

  useEffect(() => {
    setCategories(loadTodoCategories());
    const onCatsUpdated = () => setCategories(loadTodoCategories());
    window.addEventListener("aixit-todo-categories-updated", onCatsUpdated);
    return () => window.removeEventListener("aixit-todo-categories-updated", onCatsUpdated);
  }, []);

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

  const cells = useMemo(() => monthGridCellsAllDates(year, monthIndex), [year, monthIndex]);
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

  const onCalDragOver = useCallback((e: DragEvent, iso: string) => {
    if (!calItemDraggingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setCalDropTargetIso(iso);
  }, []);

  const onCalDragLeave = useCallback((e: DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setCalDropTargetIso(null);
  }, []);

  const onCalDrop = useCallback((e: DragEvent, iso: string) => {
    e.preventDefault();
    e.stopPropagation();
    calItemDraggingRef.current = false;
    setCalDropTargetIso(null);
    const parsed = parseCalDragPayload(e.dataTransfer);
    if (!parsed) return;
    let ok = false;
    if (parsed.kind === "project") {
      ok = reassignCompletedProjectCalendarDate(parsed.id, iso);
    } else {
      ok = reassignTodayTodoCalendarDate(parsed.id, iso);
    }
    if (ok) setRefreshKey((k) => k + 1);
  }, []);

  const onCalItemDragStart = useCallback((e: DragEvent, kind: CalDragKind, id: string) => {
    e.stopPropagation();
    calItemDraggingRef.current = true;
    const payload = JSON.stringify({ kind, id });
    e.dataTransfer.setData(CAL_ITEM_DRAG_MIME, payload);
    e.dataTransfer.setData("text/plain", `aixit-cal:${kind}:${id}`);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onCalItemDragEnd = useCallback(() => {
    calItemDraggingRef.current = false;
    setCalDropTargetIso(null);
  }, []);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl bg-zinc-50 p-1 ring-1 ring-zinc-200/60">
            <button
              type="button"
              onClick={goPrev}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white hover:text-zinc-950 hover:shadow-sm"
              aria-label="이전 달"
            >
              ‹
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById("cal-month-picker") as HTMLInputElement;
                  if (input) input.showPicker();
                }}
                className="px-3 py-1 text-base font-bold tracking-tight text-zinc-950 transition hover:opacity-70 sm:text-lg"
              >
                {monthTitle(year, monthIndex)}
              </button>
              <input
                id="cal-month-picker"
                type="month"
                className="pointer-events-none absolute inset-0 opacity-0"
                value={`${year}-${String(monthIndex + 1).padStart(2, "0")}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split("-").map(Number);
                  setYear(y);
                  setMonthIndex(m - 1);
                }}
              />
            </div>
            <button
              type="button"
              onClick={goNext}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white hover:text-zinc-950 hover:shadow-sm"
              aria-label="다음 달"
            >
              ›
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-x-6 gap-y-3">
          <ul
            className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-semibold text-zinc-500"
            aria-label="일정 색 범례"
          >
            {categories.map((c) => {
              const dotMatch = c.colorClass.match(/bg-(\w+)-/);
              const colorName = dotMatch ? dotMatch[1] : "zinc";
              const dotColor = {
                emerald: "bg-emerald-400",
                sky: "bg-sky-400",
                amber: "bg-amber-400",
                indigo: "bg-indigo-400",
                rose: "bg-rose-400",
                violet: "bg-violet-400",
                zinc: "bg-zinc-400",
              }[colorName] || "bg-zinc-400";

              return (
                <li key={c.id} className="flex items-center gap-1.5">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotColor)} aria-hidden />
                  {c.name}
                </li>
              );
            })}
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-400" aria-hidden />
            </li>
          </ul>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCatSettingsOpen(true)}
              className="rounded-xl bg-sky-50 px-4 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-100"
            >
              카테고리 관리
            </button>
            <button
              type="button"
              onClick={goThisMonth}
              className="rounded-xl bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-800 transition hover:bg-zinc-200"
            >
              이번 달
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-zinc-200 ring-1 ring-zinc-200">
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
        {cells.map((cell) => {
          const iso = getTodayIsoLocal(cell);
          const inCurrentMonth = cell.getMonth() === monthIndex && cell.getFullYear() === year;
          const isToday = iso === todayIso;
          const weekendDow = cell.getDay();
          const { lines, total } = cellPreviewLines(iso, plannedByDate, todosByDate, projectsByDate, categories);

          return (
            <div
              key={iso}
              data-cal-date={iso}
              className={cn(
                "min-h-[5.5rem] p-1.5 transition-[background-color,box-shadow] duration-150 sm:min-h-[6.5rem] sm:p-2",
                inCurrentMonth ? "bg-white" : "bg-zinc-50/70",
                calDropTargetIso === iso &&
                  "bg-sky-100/95 shadow-[inset_0_0_0_2px_theme(colors.sky.500)]",
              )}
              onDragOver={(e) => onCalDragOver(e, iso)}
              onDragLeave={onCalDragLeave}
              onDrop={(e) => onCalDrop(e, iso)}
            >
              <button
                type="button"
                onClick={() => {
                  setDayPopupIso(iso);
                  setPlanDraft("");
                }}
                className="w-full text-left outline-none transition hover:bg-zinc-50/80 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-0"
                aria-label={`${formatKoreanShortDateWithWeekday(iso)}, 기록 ${total}건`}
              >
                <div
                  className={cn(
                    "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                    isToday
                      ? "bg-zinc-900 text-white"
                      : !inCurrentMonth
                        ? weekendDow === 0
                          ? "text-red-400"
                          : weekendDow === 6
                            ? "text-blue-400"
                            : "text-zinc-400"
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
                      draggable
                      onDragStart={(e) => onCalItemDragStart(e, line.kind, line.id)}
                      onDragEnd={onCalItemDragEnd}
                      className={cn(
                        "truncate rounded-md px-1 py-0.5 text-[10px] font-medium leading-tight ring-1 sm:text-[11px]",
                        line.colorClass
                          ? `${line.colorClass} ring-opacity-30`
                          : line.kind === "planned"
                            ? "bg-sky-50 text-sky-950 ring-sky-100"
                            : line.kind === "todo"
                              ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
                              : "bg-indigo-50 text-indigo-900 ring-indigo-100",
                        "cursor-grab active:cursor-grabbing",
                      )}
                      title={`${line.label} — 드래그하여 다른 날로 이동`}
                    >
                      {line.label}
                    </li>
                  ))}
                  {total > 3 ? (
                    <li className="text-[10px] font-semibold text-zinc-400">+{total - 3}</li>
                  ) : null}
                </ul>
              </button>
            </div>
          );
        })}
      </div>

      {dayPopupIso ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cal-day-popup-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="닫기"
            onClick={() => setDayPopupIso(null)}
          />
          <div className="relative max-h-[min(85vh,32rem)] w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-zinc-200">
            <div className="border-b border-zinc-100 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="cal-day-popup-title" className="text-lg font-bold tracking-tight text-zinc-950">
                    {formatKoreanShortDateWithWeekday(dayPopupIso)}
                  </h2>
                  <p className="mt-0.5 text-sm text-zinc-500">이 날의 예정 할 일·완료 기록·프로젝트예요.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDayPopupIso(null)}
                  aria-label="닫기"
                  title="닫기"
                  className="shrink-0 rounded-full bg-zinc-50 p-2 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-white"
                >
                  <span aria-hidden className="block text-xl leading-none">
                    ×
                  </span>
                </button>
              </div>
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
                      if (!shouldCommitTagOnEnter(e)) return;
                      e.preventDefault();
                      addPlanned();
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
                        draggable
                        onDragStart={(e) => onCalItemDragStart(e, "planned", t.id)}
                        onDragEnd={onCalItemDragEnd}
                        className={cn(
                          "flex cursor-grab items-center gap-2 rounded-xl border px-3 py-2.5 active:cursor-grabbing",
                          t.categoryId && categories.find(c => c.id === t.categoryId)
                            ? categories.find(c => c.id === t.categoryId)?.colorClass
                            : "border-sky-100 bg-sky-50/90"
                        )}
                        title="드래그하여 다른 날로 이동"
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
                        <CategorySelect
                          categories={categories}
                          currentId={t.categoryId}
                          onSelect={(catId) => setTodoCategory(t.id, catId)}
                        />
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
                          draggable
                          onDragStart={(e) => onCalItemDragStart(e, "todo", t.id)}
                          onDragEnd={onCalItemDragEnd}
                          className={cn(
                            "flex cursor-grab items-center gap-2 rounded-xl border px-4 py-3 active:cursor-grabbing",
                            t.categoryId && categories.find(c => c.id === t.categoryId)
                              ? categories.find(c => c.id === t.categoryId)?.colorClass
                              : "border-emerald-100 bg-emerald-50/80"
                          )}
                          title="드래그하여 다른 날로 이동"
                        >
                          <span className="flex-1 text-sm font-medium leading-snug text-emerald-950">
                            {t.text}
                          </span>
                          <CategorySelect
                            categories={categories}
                            currentId={t.categoryId}
                            onSelect={(catId) => setTodoCategory(t.id, catId)}
                          />
                          <button
                            type="button"
                            onClick={() => removeTodayTodoById(t.id)}
                            title="삭제"
                            aria-label="완료한 할 일 삭제"
                            className={actionIconButtonClass}
                          >
                            <IconTrash />
                          </button>
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
                      {popupProjects.map((p) => {
                        const cat = p.categoryId ? categories.find((c) => c.id === p.categoryId) : undefined;
                        return (
                          <li
                            key={p.id}
                            draggable
                            onDragStart={(e) => onCalItemDragStart(e, "project", p.id)}
                            onDragEnd={onCalItemDragEnd}
                            className="group flex items-center gap-2"
                            title="드래그하여 다른 날로 이동"
                          >
                            <div className="flex-1">
                              <button
                                type="button"
                                onClick={() => openProject(p.id)}
                                className={cn(
                                  "w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold leading-snug transition focus-visible:outline-none focus-visible:ring-2",
                                  cat
                                    ? `${cat.colorClass} border-transparent hover:opacity-90 focus-visible:ring-zinc-400`
                                    : "border-indigo-200 bg-indigo-50/90 text-indigo-950 hover:bg-indigo-100/90 focus-visible:ring-indigo-400",
                                )}
                              >
                                {p.name}
                                <span className="mt-1 block text-[11px] font-medium opacity-70">워크스페이스로 이동</span>
                              </button>
                            </div>
                            <CategorySelect
                              categories={categories}
                              currentId={p.categoryId}
                              onSelect={(catId) => {
                                updateDashboardWorkflowCategory(p.id, catId);
                              }}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isCatSettingsOpen && (
        <CategorySettingsModal
          categories={categories}
          onClose={() => setIsCatSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function CategorySelect({
  categories,
  currentId,
  onSelect,
}: {
  categories: TodoCategory[];
  currentId?: string;
  onSelect: (id?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const current = categories.find((c) => c.id === currentId);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setOpen(!open);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className={cn(
          "h-6 min-w-[3rem] rounded px-1.5 text-[10px] font-bold ring-1 ring-inset transition",
          current
            ? `${current.colorClass} ring-opacity-20`
            : "bg-zinc-100 text-zinc-500 ring-zinc-200 hover:bg-zinc-200",
        )}
      >
        {current?.name || "분류 없음"}
      </button>
      {open &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[1000] cursor-default bg-transparent"
              onClick={() => setOpen(false)}
            />
            <ul
              className="fixed z-[1001] mt-1 w-36 overflow-hidden rounded-xl bg-white p-1 shadow-2xl ring-1 ring-zinc-200"
              style={{
                top: coords.top,
                left: Math.max(10, coords.left + coords.width - 144),
              }}
            >
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(undefined);
                    setOpen(false);
                  }}
                  className="w-full rounded-lg px-2 py-1.5 text-left text-[11px] font-medium text-zinc-500 hover:bg-zinc-50"
                >
                  분류 없음
                </button>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(c.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full rounded-lg px-2 py-1.5 text-left text-[11px] font-bold transition",
                      c.colorClass,
                      "ring-1 ring-inset ring-transparent hover:ring-zinc-200",
                    )}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </>,
          document.body,
        )}
    </div>
  );
}

function CategorySettingsModal({
  categories,
  onClose,
}: {
  categories: TodoCategory[];
  onClose: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState(CATEGORY_COLOR_OPTIONS[0]);

  const onSave = () => {
    if (!draftName.trim()) return;
    if (editingId) {
      updateTodoCategory(editingId, draftName.trim(), draftColor);
    } else {
      addTodoCategory(draftName.trim(), draftColor);
    }
    setDraftName("");
    setEditingId(null);
  };

  const startEdit = (c: TodoCategory) => {
    setEditingId(c.id);
    setDraftName(c.name);
    setDraftColor(c.colorClass);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-zinc-200">
        <div className="border-b border-zinc-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-950">카테고리 관리</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-zinc-50 p-2 text-zinc-500 hover:bg-zinc-100"
            >
              ×
            </button>
          </div>
        </div>
        <div className="p-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                {editingId ? "수정하기" : "추가하기"}
              </div>
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (shouldCommitTagOnEnter(e)) {
                      e.preventDefault();
                      onSave();
                    }
                  }}
                  placeholder="카테고리 이름"
                  className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-100"
                />
                <button
                  type="button"
                  onClick={onSave}
                  className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800"
                >
                  {editingId ? "저장" : "추가"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setDraftName("");
                    }}
                    className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-200"
                  >
                    취소
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDraftColor(c)}
                    className={cn(
                      "h-6 w-6 rounded-full ring-2 ring-offset-1 transition",
                      c.split(" ")[0], // get bg color class
                      draftColor === c ? "ring-sky-500" : "ring-transparent",
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">목록</div>
              <ul className="space-y-2">
                {categories.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-3">
                    <div className={cn("rounded-lg px-2 py-1 text-xs font-bold ring-1 ring-inset", c.colorClass)}>
                      {c.name}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        className="text-xs font-semibold text-zinc-500 hover:underline"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTodoCategory(c.id)}
                        className="text-xs font-semibold text-rose-600 hover:underline"
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
