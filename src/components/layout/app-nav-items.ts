import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Calendar,
  FolderKanban,
  Home,
  Lightbulb,
  Settings,
  StickyNote,
  Wrench,
} from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
};

/** 사이드바·모바일 상단 메뉴 공통 */
export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/dashboard", label: "홈", icon: Home, match: (p) => p === "/dashboard" },
  {
    href: "/projects",
    label: "프로젝트",
    icon: FolderKanban,
    match: (p) => p === "/projects" || p.startsWith("/workspace") || p.startsWith("/recommendation"),
  },
  {
    href: "/workflows",
    label: "워크플로우",
    icon: BookOpen,
    match: (p) => p.startsWith("/workflows") || p.startsWith("/workflow/"),
  },
  { href: "/calendar", label: "캘린더", icon: Calendar, match: (p) => p.startsWith("/calendar") },
  { href: "/tools", label: "도구 창고", icon: Wrench, match: (p) => p.startsWith("/tools") },
  {
    href: "/inspiration",
    label: "영감 창고",
    icon: Lightbulb,
    match: (p) => p.startsWith("/inspiration"),
  },
  { href: "/memos", label: "메모", icon: StickyNote, match: (p) => p.startsWith("/memos") },
  { href: "/settings", label: "설정", icon: Settings, match: (p) => p.startsWith("/settings") },
];
