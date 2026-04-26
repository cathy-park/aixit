"use client";

const KEY = "aixit.todoCategories.v1";

export type TodoCategory = {
  id: string;
  name: string;
  colorClass: string;
};

const DEFAULT_CATEGORIES: TodoCategory[] = [
  { id: "cat-1", name: "내배캠", colorClass: "bg-emerald-50 text-emerald-900 ring-emerald-100" },
  { id: "cat-2", name: "콜로소", colorClass: "bg-sky-50 text-sky-900 ring-sky-100" },
  { id: "cat-3", name: "개인", colorClass: "bg-amber-50 text-amber-900 ring-amber-100" },
  { id: "cat-4", name: "똑디", colorClass: "bg-indigo-50 text-indigo-900 ring-indigo-100" },
];

export function loadTodoCategories(): TodoCategory[] {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return DEFAULT_CATEGORIES;
  try {
    return JSON.parse(raw) as TodoCategory[];
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveTodoCategories(cats: TodoCategory[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(cats));
  window.dispatchEvent(new CustomEvent("aixit-todo-categories-updated"));
}

export function addTodoCategory(name: string, colorClass: string): TodoCategory {
  const cats = loadTodoCategories();
  const next: TodoCategory = {
    id: `cat_${Date.now()}`,
    name,
    colorClass,
  };
  saveTodoCategories([...cats, next]);
  return next;
}

export function updateTodoCategory(id: string, name: string, colorClass: string) {
  const cats = loadTodoCategories();
  const next = cats.map(c => c.id === id ? { ...c, name, colorClass } : c);
  saveTodoCategories(next);
}

export function deleteTodoCategory(id: string) {
  const cats = loadTodoCategories();
  saveTodoCategories(cats.filter(c => c.id !== id));
}

export const CATEGORY_COLOR_OPTIONS = [
  "bg-emerald-50 text-emerald-900 ring-emerald-100",
  "bg-sky-50 text-sky-900 ring-sky-100",
  "bg-indigo-50 text-indigo-900 ring-indigo-100",
  "bg-amber-50 text-amber-900 ring-amber-100",
  "bg-rose-50 text-rose-900 ring-rose-100",
  "bg-violet-50 text-violet-900 ring-violet-100",
  "bg-zinc-100 text-zinc-900 ring-zinc-200",
];
