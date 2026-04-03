"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP_CARD_GRID_CLASS, APP_CARD_GRID_ITEM_CLASS } from "@/components/cards/app-card-layout";
import { WorkflowCard } from "@/components/dashboard/WorkflowCard";
import { workflows as templateCatalog } from "@/lib/aixit-data";
import { dashboardWorkflowToPreview } from "@/lib/dashboard-workflow-preview";
import { loadDashboardFolders, type DashboardFolderRecord } from "@/lib/dashboard-folders-store";
import type { LayoutEntry } from "@/lib/dashboard-layout-store";
import { ensureLayoutMerged, saveLayout } from "@/lib/dashboard-layout-store";
import {
  layoutEntryPinKey,
  loadPinnedWorkflowKeys,
  removePinnedWorkflowKey,
  togglePinnedWorkflowKey,
} from "@/lib/pinned-workflows-store";
import { shouldCommitTagOnEnter } from "@/lib/tag-input-keydown";
import {
  formatKoreanCompletedDateLabel,
  formatKoreanShortDateWithWeekday,
  formatKoreanWeekRangeSunSat,
  getLocalSundayWeekStartIso,
  getTodayIsoLocal,
  getWeekDayIsoListSundayStart,
  isProjectRelevantToToday,
  koreanWeekdayShortLabels,
} from "@/lib/today-project-filter";
import { loadCurrentWeekTodos, saveCurrentWeekTodos, type TodayTodo } from "@/lib/today-todos-store";
import { ensureDashboardWorkflow } from "@/lib/workflows-store";
import { cn } from "@/components/ui/cn";
import { actionIconButtonClass, IconTrash } from "@/components/ui/action-icons";
import { AdaptivePageHeader } from "@/components/layout/AdaptivePageHeader";
import { AppMainColumn } from "@/components/layout/AppMainColumn";
import {
  DEFAULT_HOME_GREETING_NAME,
  HOME_GREETING_UPDATED_EVENT,
  loadHomeGreetingName,
  saveHomeGreetingName,
} from "@/lib/home-greeting-store";
import { HeroCharacterIllustration } from "@/components/home/HeroCharacterIllustration";
import { TitleCountChip } from "@/components/ui/TitleCountChip";

function newTodoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `td_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
}

export function HomeTodayDashboard() {
  const [today] = useState(() => getTodayIsoLocal());
  const [layout, setLayout] = useState<LayoutEntry[]>([]);
  const [folders, setFolders] = useState<DashboardFolderRecord[]>([]);
  const [pinnedKeys, setPinnedKeys] = useState<Set<string>>(() => new Set());
  const [todos, setTodos] = useState<TodayTodo[]>([]);
  const [todoDraft, setTodoDraft] = useState("");
  const [ready, setReady] = useState(false);
  const [greetName, setGreetName] = useState(DEFAULT_HOME_GREETING_NAME);
  const [greetEdit, setGreetEdit] = useState(false);
  const [greetDraft, setGreetDraft] = useState(DEFAULT_HOME_GREETING_NAME);
  const greetSkipBlur = useRef(false);
  const [weekInfoOpen, setWeekInfoOpen] = useState(false);
  /** 날짜가 바뀌면(자정) 주간 칩의 오늘 표시를 갱신 */
  const [calendarPulse, setCalendarPulse] = useState(0);

  const refreshLayout = useCallback(() => {
    setLayout(ensureLayoutMerged());
    setFolders(loadDashboardFolders());
    setPinnedKeys(loadPinnedWorkflowKeys());
  }, []);

  useEffect(() => {
    refreshLayout();
    setTodos(loadCurrentWeekTodos());
    setGreetName(loadHomeGreetingName());
    setReady(true);
  }, [refreshLayout]);

  useEffect(() => {
    const onWorkflows = () => refreshLayout();
    const onTodos = () => setTodos(loadCurrentWeekTodos());
    const onFolders = () => refreshLayout();
    const onGreeting = () => setGreetName(loadHomeGreetingName());
    window.addEventListener("aixit-workflows-updated", onWorkflows);
    window.addEventListener("aixit-dashboard-layout-updated", onWorkflows);
    window.addEventListener("aixit-dashboard-folders-updated", onFolders);
    window.addEventListener("aixit-today-todos-updated", onTodos);
    window.addEventListener(HOME_GREETING_UPDATED_EVENT, onGreeting);
    return () => {
      window.removeEventListener("aixit-workflows-updated", onWorkflows);
      window.removeEventListener("aixit-dashboard-layout-updated", onWorkflows);
      window.removeEventListener("aixit-dashboard-folders-updated", onFolders);
      window.removeEventListener("aixit-today-todos-updated", onTodos);
      window.removeEventListener(HOME_GREETING_UPDATED_EVENT, onGreeting);
    };
  }, [refreshLayout]);

  /** 주가 바뀌면 목록 초기화, 자정이 지나면 오늘 칩 갱신 */
  useEffect(() => {
    let lastWeek = getLocalSundayWeekStartIso();
    let lastDay = getTodayIsoLocal();
    const tick = () => {
      const nowWeek = getLocalSundayWeekStartIso();
      const nowDay = getTodayIsoLocal();
      if (nowWeek !== lastWeek) {
        lastWeek = nowWeek;
        setTodos(loadCurrentWeekTodos());
      }
      if (nowDay !== lastDay) {
        lastDay = nowDay;
        setCalendarPulse((n) => n + 1);
      }
    };
    const id = window.setInterval(tick, 30_000);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, []);

  const folderById = useMemo(() => Object.fromEntries(folders.map((f) => [f.id, f])), [folders]);

  const todayProjects = useMemo(() => {
    const out: {
      entry: LayoutEntry;
      folder: DashboardFolderRecord;
      preview: ReturnType<typeof dashboardWorkflowToPreview>;
    }[] = [];

    for (const entry of layout) {
      if (entry.kind !== "user") continue;
      const wf = ensureDashboardWorkflow(entry.id, entry.folderId);
      if (!wf || !isProjectRelevantToToday(wf, today)) continue;
      const folder = folderById[entry.folderId];
      if (!folder || folder.hidden) continue;
      const templateEmoji = wf.templateId ? templateCatalog.find((w) => w.id === wf.templateId)?.emoji : undefined;
      const preview = dashboardWorkflowToPreview(wf, {
        folderId: entry.folderId,
        builtinEmoji: templateEmoji ?? wf.emoji,
      });
      out.push({ entry, folder, preview });
    }

    const pinKey = (e: LayoutEntry) => layoutEntryPinKey(e.kind, e.id);
    out.sort((a, b) => {
      const pa = pinnedKeys.has(pinKey(a.entry));
      const pb = pinnedKeys.has(pinKey(b.entry));
      if (pa !== pb) return pa ? -1 : 1;
      return a.preview.title.localeCompare(b.preview.title, "ko");
    });

    return out;
  }, [layout, folderById, today, pinnedKeys]);

  const togglePin = useCallback((entry: LayoutEntry) => {
    setPinnedKeys(togglePinnedWorkflowKey(layoutEntryPinKey(entry.kind, entry.id)));
  }, []);

  const sortedWeekTodos = useMemo(() => {
    return [...todos].sort((a, b) => {
      const aSch = a.scheduledDate;
      const bSch = b.scheduledDate;
      if (!aSch && !bSch) return 0;
      if (!aSch) return -1;
      if (!bSch) return 1;
      return aSch.localeCompare(bSch);
    });
  }, [todos]);

  const addTodo = () => {
    const text = todoDraft.trim();
    if (!text) return;
    const next = [...todos, { id: newTodoId(), text, done: false }];
    setTodos(next);
    saveCurrentWeekTodos(next);
    setTodoDraft("");
  };

  const toggleTodo = (id: string) => {
    const next = todos.map((t) => {
      if (t.id !== id) return t;
      const done = !t.done;
      return done
        ? { ...t, done: true, completedAt: getTodayIsoLocal() }
        : { ...t, done: false, completedAt: undefined };
    });
    setTodos(next);
    saveCurrentWeekTodos(next);
  };

  const removeTodo = (id: string) => {
    const next = todos.filter((t) => t.id !== id);
    setTodos(next);
    saveCurrentWeekTodos(next);
  };

  if (!ready) {
    return <div className="py-12 text-center text-sm text-zinc-500">불러오는 중…</div>;
  }

  void calendarPulse;
  const weekStartIso = getLocalSundayWeekStartIso();
  const weekDayIsos = getWeekDayIsoListSundayStart(weekStartIso);
  const todayIso = getTodayIsoLocal();
  const weekdayLabels = koreanWeekdayShortLabels();

  const commitGreet = () => {
    if (greetSkipBlur.current) {
      greetSkipBlur.current = false;
      return;
    }
    const v = greetDraft.trim() || DEFAULT_HOME_GREETING_NAME;
    saveHomeGreetingName(v);
    setGreetName(v);
    setGreetEdit(false);
  };

  return (
    <>
      <AdaptivePageHeader
        className="border-transparent !bg-transparent shadow-none"
        title={(compact) => (
          <div className={cn("flex w-full min-w-0 flex-row items-center", compact ? "gap-3" : "gap-4")}>
            <HeroCharacterIllustration
              className={cn("shrink-0", compact ? "h-20 w-20" : "h-24 w-24 sm:h-28 sm:w-28")}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  {greetEdit ? (
                    <input
                      autoFocus
                      value={greetDraft}
                      onChange={(e) => setGreetDraft(e.target.value)}
                      onBlur={commitGreet}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitGreet();
                        }
                        if (e.key === "Escape") {
                          greetSkipBlur.current = true;
                          setGreetDraft(greetName);
                          setGreetEdit(false);
                        }
                      }}
                      className={cn(
                        "max-w-[12rem] rounded-md border border-orange-400 bg-white px-2 py-0.5 font-semibold tracking-tight text-orange-700 outline-none focus:ring-2 focus:ring-orange-200",
                        compact ? "text-base sm:max-w-[11rem]" : "text-xl sm:max-w-[14rem] sm:text-2xl",
                      )}
                      aria-label="호칭"
                    />
                  ) : (
                    <button
                      type="button"
                      className={cn(
                        "border-b border-dashed border-orange-500/90 bg-transparent px-0 text-left font-semibold text-orange-600 decoration-transparent transition hover:text-orange-700",
                        compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl",
                      )}
                      onClick={() => {
                        setGreetDraft(greetName);
                        setGreetEdit(true);
                      }}
                      title="호칭 바꾸기"
                    >
                      {greetName}
                    </button>
                  )}

                  <svg
                    className={cn(
                      "shrink-0 text-zinc-400",
                      compact ? "h-3.5 w-3.5" : "h-4 w-4",
                    )}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M12 20h9" strokeLinecap="round" />
                    <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
                  </svg>
                  <span
                    className={cn(
                      "font-semibold text-zinc-950",
                      compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl",
                    )}
                  >
                    님의 오늘 할 일
                  </span>
                  <TitleCountChip
                    count={todayProjects.length}
                    className={cn(compact && "text-[10px]")}
                  />
              </div>
              <p className="text-sm font-normal leading-snug text-zinc-600">
                오늘 일정이 포함된 프로젝트만 모아서 보여드립니다.
              </p>
            </div>
          </div>
        )}
        count={null}
      />

      <AppMainColumn className="min-w-0 pb-12">
      <section className="mt-0" aria-labelledby="today-projects-heading">
        <h2 id="today-projects-heading" className="sr-only">
          오늘 일정 프로젝트
        </h2>
        {todayProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-8 text-center text-sm text-zinc-500">
            오늘 일정에 해당하는 프로젝트가 없어요.{" "}
            <Link href="/projects" className="font-semibold text-zinc-800 underline underline-offset-2 hover:text-zinc-950">
              프로젝트
            </Link>
            에서 전체 목록을 확인하거나 일정을 맞춰 보세요.
          </div>
        ) : (
          <div className={APP_CARD_GRID_CLASS}>
            {todayProjects.map(({ entry, folder, preview }) => (
              <div key={layoutEntryPinKey(entry.kind, entry.id)} className={APP_CARD_GRID_ITEM_CLASS}>
                <WorkflowCard
                  wf={preview}
                  folder={folder}
                  pinned={pinnedKeys.has(layoutEntryPinKey(entry.kind, entry.id))}
                  onTogglePin={() => togglePin(entry)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 pt-5" aria-labelledby="week-todos-heading">
        <h2 id="week-todos-heading" className="text-lg font-semibold tracking-tight text-zinc-950">
          이번주 할 일
        </h2>
        <p className="mt-1 flex items-center gap-2.5 text-sm text-zinc-500">
          <span className="font-medium text-zinc-700">{formatKoreanWeekRangeSunSat(weekStartIso)}</span>
          <span className="relative inline-flex items-center">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200"
              aria-label="캘린더 예정 일정 설명"
              aria-expanded={weekInfoOpen}
              onClick={() => setWeekInfoOpen((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setWeekInfoOpen(false);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </button>
            {weekInfoOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-[60] cursor-default"
                  aria-label="닫기"
                  onClick={() => setWeekInfoOpen(false)}
                />
                <div
                  role="dialog"
                  aria-label="캘린더 예정 일정 안내"
                  className="absolute left-0 top-[calc(100%+8px)] z-[70] w-[min(520px,calc(100vw-2rem))] rounded-2xl bg-white p-4 text-xs font-medium leading-relaxed text-zinc-700 shadow-xl ring-1 ring-zinc-200"
                >
                  캘린더에 넣은 예정 일정은 예정일이 이번 주이면서 그날(로컬)이 되면 여기에 자동으로 붙습니다. 매주 일요일이 지나면 이번 주 목록은 비우고
                  새 주를 시작합니다. 완료한 기록은 캘린더에 남습니다. 이 기기 브라우저에 저장됩니다.
                </div>
              </>
            ) : null}
          </span>
        </p>

        <div
          className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2"
          role="group"
          aria-label="이번 주 날짜, 일요일부터 토요일까지"
        >
          {weekDayIsos.map((iso, i) => {
            const isToday = iso === todayIso;
            const dom = Number(iso.slice(8, 10));
            const label = weekdayLabels[i] ?? "";
            return (
              <div
                key={iso}
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border py-2.5 text-center sm:py-3",
                  isToday
                    ? "border-sky-200 bg-sky-50 text-sky-800 shadow-sm ring-1 ring-sky-100"
                    : "border-zinc-200 bg-zinc-50/80 text-zinc-700",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide sm:text-xs",
                    isToday ? "text-sky-700" : i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : "text-zinc-500",
                  )}
                >
                  {label}
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-base font-bold tabular-nums sm:text-lg",
                    isToday ? "text-sky-800" : i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : "text-zinc-700",
                  )}
                >
                  {dom}
                </span>
              </div>
            );
          })}
        </div>

        <ul className="mt-5 space-y-2">
          {sortedWeekTodos.length === 0 ? (
            <li className="text-sm text-zinc-400">할 일을 추가하거나 캘린더에서 예정일을 잡아 보세요.</li>
          ) : (
            sortedWeekTodos.map((t) => (
              <li
                key={t.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-white px-4 py-3 ring-1",
                  t.done
                    ? "border-zinc-200 bg-zinc-50/70 ring-zinc-200/60"
                    : "border-zinc-200 ring-zinc-100",
                )}
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggleTodo(t.id)}
                    className={cn(
                      "h-4 w-4 shrink-0 rounded border-zinc-300 focus:ring-zinc-400",
                      t.done
                        ? "border-zinc-200 accent-zinc-300 text-zinc-300 opacity-90"
                        : "text-zinc-900 accent-zinc-900",
                    )}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                    <span className={cn("min-w-0 text-sm font-medium text-zinc-900", t.done && "text-zinc-600 line-through")}>
                      {t.text}
                    </span>
                    {t.scheduledDate && !t.done ? (
                      <span className="shrink-0 text-[11px] font-semibold text-sky-700 tabular-nums sm:text-xs">
                        {formatKoreanShortDateWithWeekday(t.scheduledDate)}
                      </span>
                    ) : null}
                  </span>
                </label>
                {t.done && t.completedAt ? (
                  <span className="shrink-0 text-xs font-medium text-zinc-500 tabular-nums">
                    {formatKoreanCompletedDateLabel(t.completedAt)}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeTodo(t.id)}
                  title="삭제"
                  aria-label="할 일 삭제"
                  className={actionIconButtonClass}
                >
                  <IconTrash />
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={todoDraft}
            onChange={(e) => setTodoDraft(e.target.value)}
            onKeyDown={(e) => {
              if (!shouldCommitTagOnEnter(e)) return;
              e.preventDefault();
              addTodo();
            }}
            placeholder="할 일을 입력하세요"
            className="min-h-12 h-12 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-base leading-normal text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100 sm:h-11 sm:min-h-0 sm:text-sm"
          />
          <button
            type="button"
            onClick={addTodo}
            className="min-h-12 h-12 shrink-0 rounded-full bg-zinc-900 px-6 text-sm font-bold text-white hover:bg-zinc-800 sm:h-11 sm:min-h-0"
          >
            추가
          </button>
        </div>
      </section>

      </AppMainColumn>
    </>
  );
}
