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
  // 색상환 순서로 확실히 구분되는 20가지
  "bg-red-50 text-red-900 ring-red-200",        // 🔴 빨강
  "bg-orange-50 text-orange-900 ring-orange-200", // 🟠 주황
  "bg-amber-50 text-amber-900 ring-amber-200",  // 🟡 황색
  "bg-yellow-50 text-yellow-900 ring-yellow-200", // 💛 노랑
  "bg-lime-50 text-lime-900 ring-lime-200",     // 🟢 연두
  "bg-emerald-50 text-emerald-900 ring-emerald-200", // 🌿 초록
  "bg-teal-50 text-teal-900 ring-teal-200",     // 🩵 청록
  "bg-cyan-50 text-cyan-900 ring-cyan-200",     // 🔵 시안
  "bg-sky-50 text-sky-900 ring-sky-200",        // ☁️ 하늘
  "bg-blue-50 text-blue-900 ring-blue-200",     // 💙 파랑
  "bg-indigo-50 text-indigo-900 ring-indigo-200", // 🫐 남색
  "bg-violet-50 text-violet-900 ring-violet-200", // 🔮 바이올렛
  "bg-purple-50 text-purple-900 ring-purple-200", // 💜 보라
  "bg-fuchsia-50 text-fuchsia-900 ring-fuchsia-200", // 🟣 마젠타
  "bg-pink-50 text-pink-900 ring-pink-200",     // 🩷 핑크
  "bg-rose-50 text-rose-900 ring-rose-200",     // 🌹 장미
  "bg-red-100 text-red-800 ring-red-300",       // 🔴 딥레드
  "bg-green-50 text-green-900 ring-green-200",  // 💚 녹색
  "bg-stone-50 text-stone-900 ring-stone-200",  // 🟤 갈색
  "bg-zinc-100 text-zinc-800 ring-zinc-300",    // ⚫ 회색
];
