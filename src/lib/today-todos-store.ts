import {
  getLocalSundayWeekStartIso,
  getTodayIsoLocal,
  parseLocalDateFromIso,
} from "@/lib/today-project-filter";

const KEY = "aixit.todayTodos.v1";

export type TodayTodo = {
  id: string;
  text: string;
  done: boolean;
  /** 체크 완료 시 기록되는 로컬 날짜 (YYYY-MM-DD) */
  completedAt?: string;
  /** 할 일이 속한 주의 시작일(일요일, YYYY-MM-DD). 없으면 불러올 때 보정 */
  weekStartIso?: string;
  /** 캘린더에서 미리 잡은 예정일(YYYY-MM-DD). 해당 주의 홈「이번주 할 일」에 자동 표시 */
  scheduledDate?: string;
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function validCompletedAt(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function newTodoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `td_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
}

function normalizeTodo(raw: unknown): TodayTodo | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  if (typeof t.id !== "string" || typeof t.text !== "string" || typeof t.done !== "boolean") return null;
  const completedAt = t.done && validCompletedAt(t.completedAt) ? t.completedAt : undefined;
  const weekStartIso = validCompletedAt(t.weekStartIso) ? t.weekStartIso : undefined;
  const scheduledDate = validCompletedAt(t.scheduledDate) ? t.scheduledDate : undefined;
  return {
    id: t.id,
    text: t.text,
    done: t.done,
    ...(completedAt ? { completedAt } : {}),
    ...(weekStartIso ? { weekStartIso } : {}),
    ...(scheduledDate ? { scheduledDate } : {}),
  };
}

function inferWeekStartIso(t: TodayTodo, fallbackThisWeekSunday: string): string {
  if (t.scheduledDate && validCompletedAt(t.scheduledDate)) {
    return getLocalSundayWeekStartIso(parseLocalDateFromIso(t.scheduledDate));
  }
  if (t.weekStartIso && validCompletedAt(t.weekStartIso)) return t.weekStartIso;
  if (t.done && t.completedAt) {
    const [y, m, d] = t.completedAt.split("-").map(Number);
    if (y && m && d) return getLocalSundayWeekStartIso(new Date(y, m - 1, d));
  }
  return fallbackThisWeekSunday;
}

function enrichTodosWithWeekStart(list: TodayTodo[]): TodayTodo[] {
  const fallback = getLocalSundayWeekStartIso();
  let changed = false;
  const out = list.map((t) => {
    const nextWs = inferWeekStartIso(t, fallback);
    if (t.weekStartIso === nextWs) return t;
    changed = true;
    return { ...t, weekStartIso: nextWs };
  });
  if (changed && typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(out));
    window.dispatchEvent(new CustomEvent("aixit-today-todos-updated"));
  }
  return out;
}

/** 전체 목록(캘린더·보관용). 주 시작 필드가 없으면 한 번 보정해 저장합니다. */
export function loadTodayTodos(): TodayTodo[] {
  if (typeof window === "undefined") return [];
  const raw = safeParse<unknown[]>(window.localStorage.getItem(KEY));
  if (!Array.isArray(raw)) return [];
  const parsed = raw.map(normalizeTodo).filter((x): x is TodayTodo => x != null);
  return enrichTodosWithWeekStart(parsed);
}

function belongsToWeek(t: TodayTodo, ws: string): boolean {
  if (t.scheduledDate && validCompletedAt(t.scheduledDate)) {
    const stepWeek = getLocalSundayWeekStartIso(parseLocalDateFromIso(t.scheduledDate));
    if (stepWeek !== ws) return false;
    if (t.done) return true;
    /** 예정일 당일(로컬)부터 홈에 표시. 그 전에는 캘린더에서만 확인 */
    const today = getTodayIsoLocal();
    return t.scheduledDate <= today;
  }
  return t.weekStartIso === ws;
}

/** 홈「이번주 할 일」: 이번 주(일요일 시작)에 속하는 수동 할 일 + 예정일이 이번 주인 캘린더 일정 */
export function loadCurrentWeekTodos(): TodayTodo[] {
  if (typeof window === "undefined") return [];
  const ws = getLocalSundayWeekStartIso();
  return loadTodayTodos().filter((t) => belongsToWeek(t, ws));
}

function stampWeekStartsForSave(todos: TodayTodo[], currentWeekSunday: string): TodayTodo[] {
  return todos.map((t) => ({
    ...t,
    weekStartIso:
      t.scheduledDate && validCompletedAt(t.scheduledDate)
        ? getLocalSundayWeekStartIso(parseLocalDateFromIso(t.scheduledDate))
        : currentWeekSunday,
  }));
}

/** 홈「이번주 할 일」만 교체·저장. 다른 주·과거 완료 기록은 그대로 둡니다. */
export function saveCurrentWeekTodos(todos: TodayTodo[]) {
  if (typeof window === "undefined") return;
  const ws = getLocalSundayWeekStartIso();
  const all = loadTodayTodos();
  const rest = all.filter((t) => !belongsToWeek(t, ws));
  const stamped = stampWeekStartsForSave(todos, ws);
  window.localStorage.setItem(KEY, JSON.stringify([...rest, ...stamped]));
  window.dispatchEvent(new CustomEvent("aixit-today-todos-updated"));
}

export function saveTodayTodos(todos: TodayTodo[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(todos));
  window.dispatchEvent(new CustomEvent("aixit-today-todos-updated"));
}

/** 완료 처리되었고 `completedAt`이 있는 항목만, 날짜(YYYY-MM-DD) → 목록 */
export function getCompletedTodosGroupedByDate(): Record<string, TodayTodo[]> {
  const byDate: Record<string, TodayTodo[]> = {};
  for (const t of loadTodayTodos()) {
    if (!t.done || !t.completedAt) continue;
    const k = t.completedAt;
    if (!byDate[k]) byDate[k] = [];
    byDate[k].push(t);
  }
  return byDate;
}

/** 미완료이며 `scheduledDate`가 있는 예정 할 일, 날짜 → 목록 */
export function getPlannedTodosGroupedByDate(): Record<string, TodayTodo[]> {
  const byDate: Record<string, TodayTodo[]> = {};
  for (const t of loadTodayTodos()) {
    if (t.done) continue;
    if (!t.scheduledDate || !validCompletedAt(t.scheduledDate)) continue;
    const k = t.scheduledDate;
    if (!byDate[k]) byDate[k] = [];
    byDate[k].push(t);
  }
  return byDate;
}

/** 캘린더에서 특정 날짜에 예정 할 일 추가 (홈 이번 주 목록과 동기화) */
export function addPlannedTodoForDate(text: string, dateIso: string): TodayTodo | null {
  const trimmed = text.trim();
  if (!trimmed || !validCompletedAt(dateIso)) return null;
  const ws = getLocalSundayWeekStartIso(parseLocalDateFromIso(dateIso));
  const todo: TodayTodo = {
    id: newTodoId(),
    text: trimmed,
    done: false,
    scheduledDate: dateIso,
    weekStartIso: ws,
  };
  const all = loadTodayTodos();
  saveTodayTodos([...all, todo]);
  return todo;
}

export function removeTodayTodoById(id: string) {
  const all = loadTodayTodos().filter((t) => t.id !== id);
  saveTodayTodos(all);
}

/** 완료 토글·날짜 기록 (캘린더·홈 공통) */
export function setTodayTodoDone(id: string, done: boolean) {
  const all = loadTodayTodos().map((t) => {
    if (t.id !== id) return t;
    return done
      ? { ...t, done: true, completedAt: getTodayIsoLocal() }
      : { ...t, done: false, completedAt: undefined };
  });
  saveTodayTodos(all);
}

/** 캘린더에서 할 일(예정·완료 기록)을 다른 날짜로 옮김 */
export function reassignTodayTodoCalendarDate(id: string, newDateIso: string): boolean {
  if (!validCompletedAt(newDateIso)) return false;
  const all = loadTodayTodos();
  let hit = false;
  const next = all.map((t) => {
    if (t.id !== id) return t;
    hit = true;
    const ws = getLocalSundayWeekStartIso(parseLocalDateFromIso(newDateIso));
    if (t.done) {
      return { ...t, completedAt: newDateIso };
    }
    return { ...t, scheduledDate: newDateIso, weekStartIso: ws };
  });
  if (!hit) return false;
  saveTodayTodos(next);
  return true;
}
