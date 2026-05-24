"use client";

import { useCallback, useEffect, useState } from "react";
import { APP_NAV_ITEMS } from "@/components/layout/app-nav-items";

const STORAGE_KEY = "aixit.navVisibility.v1";

/** id → 표시 여부 맵 */
export type NavVisibilityMap = Record<string, boolean>;

function loadFromStorage(): NavVisibilityMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as NavVisibilityMap;
  } catch {
    return {};
  }
}

function saveToStorage(map: NavVisibilityMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/**
 * 메뉴 아이템의 표시 여부를 관리하는 훅.
 * - alwaysVisible 아이템은 항상 true 반환
 * - 저장된 값이 없으면 기본적으로 모두 true
 */
export function useNavVisibility() {
  const [visibility, setVisibility] = useState<NavVisibilityMap>(() => loadFromStorage());

  // 다른 탭/창과 동기화
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setVisibility(loadFromStorage());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isVisible = useCallback(
    (id: string): boolean => {
      const item = APP_NAV_ITEMS.find((n) => n.id === id);
      if (item?.alwaysVisible) return true;
      // 저장된 값이 없으면 기본 true (처음엔 모두 보임)
      return visibility[id] !== false;
    },
    [visibility],
  );

  const toggle = useCallback((id: string, value: boolean) => {
    setVisibility((prev) => {
      const next = { ...prev, [id]: value };
      saveToStorage(next);
      return next;
    });
  }, []);

  return { isVisible, toggle, visibility };
}
