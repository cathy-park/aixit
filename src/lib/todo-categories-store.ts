"use client";

const KEY = "aixit.todoCategories.v1";

export type TodoCategory = {
  id: string;
  name: string;
  colorClass: string;
};

const DEFAULT_CATEGORIES: TodoCategory[] = [
  { id: "cat-1", name: "내배캠", colorClass: "bg-emerald-100 text-emerald-950 ring-emerald-200" },
  { id: "cat-2", name: "콜로소", colorClass: "bg-sky-100 text-sky-950 ring-sky-200" },
  { id: "cat-3", name: "개인", colorClass: "bg-amber-100 text-amber-950 ring-amber-200" },
  { id: "cat-4", name: "똑디", colorClass: "bg-indigo-100 text-indigo-950 ring-indigo-200" },
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
  // 명확하게 구분되는 15가지 은은/진함 교차 팔레트
  "bg-red-100 text-red-950 ring-red-200",         // 🔴 빨강
  "bg-orange-100 text-orange-950 ring-orange-200", // 🟠 주황
  "bg-amber-200 text-amber-950 ring-amber-300",   // 🟤 황토/갈색 (오렌지와 옐로우 사이 구분선)
  "bg-yellow-100 text-yellow-950 ring-yellow-300", // 💛 노랑
  "bg-lime-100 text-lime-950 ring-lime-300",      // 🟢 연두
  "bg-green-100 text-green-950 ring-green-200",   // 🌿 초록
  "bg-emerald-200 text-emerald-950 ring-emerald-300", // 💚 딥에메랄드 (초록과 확연히 구분)
  "bg-teal-100 text-teal-950 ring-teal-200",      // 🩵 민트/청록
  "bg-sky-100 text-sky-950 ring-sky-200",         // ☁️ 하늘
  "bg-blue-200 text-blue-950 ring-blue-300",      // 💙 선명한 파랑 (하늘색과 확연히 구분)
  "bg-indigo-100 text-indigo-950 ring-indigo-200", // 🫐 남색
  "bg-violet-100 text-violet-950 ring-violet-200", // 🔮 바이올렛
  "bg-fuchsia-200 text-fuchsia-950 ring-fuchsia-300", // 🟣 마젠타/자주 (핑크/보라와 확연히 구분)
  "bg-pink-100 text-pink-950 ring-pink-200",      // 🩷 핑크
  "bg-zinc-100 text-zinc-900 ring-zinc-200",      // ⚫ 회색
];
