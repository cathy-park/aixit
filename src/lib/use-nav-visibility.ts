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

const ORDER_STORAGE_KEY = "aixit.navOrder.v1";

function loadOrderFromStorage(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as string[];
  } catch {
    return null;
  }
}

function saveOrderToStorage(order: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
}

export function useNavOrder() {
  const [order, setOrder] = useState<string[]>(() => {
    const saved = loadOrderFromStorage();
    if (saved && saved.length > 0) return saved;
    return APP_NAV_ITEMS.map(i => i.id);
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ORDER_STORAGE_KEY) {
        const saved = loadOrderFromStorage();
        if (saved && saved.length > 0) setOrder(saved);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateOrder = useCallback((newOrder: string[]) => {
    setOrder(newOrder);
    saveOrderToStorage(newOrder);
    window.dispatchEvent(new Event("aixit-nav-order-updated"));
  }, []);

  useEffect(() => {
    const onUpdate = () => {
      const saved = loadOrderFromStorage();
      if (saved && saved.length > 0) setOrder(saved);
    };
    window.addEventListener("aixit-nav-order-updated", onUpdate);
    return () => window.removeEventListener("aixit-nav-order-updated", onUpdate);
  }, []);

  return { order, updateOrder };
}
