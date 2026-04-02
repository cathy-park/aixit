"use client";

import { useEffect, useRef } from "react";
import { AIXIT_LOCAL_STORAGE_KEYS, dispatchAixitStorageUpdatedEvents, isAixitCoreDataEmpty } from "@/lib/aixit-storage";
import { flushAixitKvQueue, fetchAixitKvMap } from "@/lib/supabase/aixitKv";
import { supabaseEnabled } from "@/lib/supabase/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";

type QueuedValue = string | null;

export function AixitSupabaseSyncProvider() {
  const { user, loading } = useAuth();
  const remoteApplyingRef = useRef(false);
  const queueRef = useRef<Map<string, QueuedValue>>(new Map());
  // DOM setTimeout은 number를 반환합니다.
  const flushTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!supabaseEnabled) return;
    if (typeof window === "undefined") return;
    if (loading) return;
    if (!user) return;

    let cancelled = false;

    async function run() {
      const localHadCore = !isAixitCoreDataEmpty();
      const remoteMap = await fetchAixitKvMap();
      if (cancelled) return;

      const remoteCoreEmpty = isRemoteCoreEmpty(remoteMap);

      // 1) remote가 비어있고 local에 데이터가 있으면 -> local을 remote로 밀어넣기
      if (remoteCoreEmpty && localHadCore) {
        remoteApplyingRef.current = true;
        try {
          const queue = new Map<string, QueuedValue>();
          for (const k of AIXIT_LOCAL_STORAGE_KEYS) {
            const v = window.localStorage.getItem(k);
            if (v != null) queue.set(k, v);
          }
          await flushAixitKvQueue(queue);
        } finally {
          remoteApplyingRef.current = false;
        }
      }

      // 2) remote에 데이터가 있으면 -> remote 값을 local로 적용(캐시)
      const shouldApplyRemote = !remoteCoreEmpty;
      if (shouldApplyRemote) {
        remoteApplyingRef.current = true;
        try {
          for (const k of AIXIT_LOCAL_STORAGE_KEYS) {
            if (Object.prototype.hasOwnProperty.call(remoteMap, k)) window.localStorage.setItem(k, remoteMap[k]);
            else window.localStorage.removeItem(k);
          }
        } finally {
          remoteApplyingRef.current = false;
        }
      }

      dispatchAixitStorageUpdatedEvents();
    }

    run().catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("AixitSupabaseSyncProvider run failed:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  useEffect(() => {
    if (!supabaseEnabled) return;
    if (typeof window === "undefined") return;
    if (loading) return;
    if (!user) return;

    // localStorage write를 가로채서 remote에도 반영합니다.
    const ls = window.localStorage;
    const keysSet = new Set<string>(AIXIT_LOCAL_STORAGE_KEYS as unknown as string[]);

    const originalSetItem = ls.setItem.bind(ls);
    const originalRemoveItem = ls.removeItem.bind(ls);

    function scheduleFlush() {
      if (flushTimerRef.current) return;
      flushTimerRef.current = window.setTimeout(async () => {
        flushTimerRef.current = null;
        const queue = new Map(queueRef.current);
        queueRef.current.clear();
        try {
          await flushAixitKvQueue(queue);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("AixitSupabaseSyncProvider flush failed:", e);
        }
      }, 400);
    }

    // setItem
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ls as any).setItem = (key: string, value: string) => {
      originalSetItem(key, value);
      if (remoteApplyingRef.current) return;
      if (!keysSet.has(key)) return;
      queueRef.current.set(key, value);
      scheduleFlush();
    };

    // removeItem
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ls as any).removeItem = (key: string) => {
      originalRemoveItem(key);
      if (remoteApplyingRef.current) return;
      if (!keysSet.has(key)) return;
      queueRef.current.set(key, null);
      scheduleFlush();
    };

    return () => {
      // 컴포넌트 unmount 시에는 원상 복구하지 않습니다.
      // (현재 앱은 SPA 형태로 상시 유지되며, 원상 복구를 넣으면 타이밍 이슈가 생길 수 있어요)
    };
  }, [loading, user]);

  return null;
}

function isRemoteCoreEmpty(remoteMap: Record<string, string>) {
  const CORE_KEYS = [
    "aixit.dashboardWorkflows.v1",
    "aixit.userWorkflowTemplates.v1",
    "aixit.inspirationSites.v1",
    "aixit.todayTodos.v1",
    "aixit.dashboardLayout.v1",
  ] as const;

  for (const k of CORE_KEYS) {
    const v = remoteMap[k];
    if (v && v.trim().length > 0) return false;
  }
  return true;
}

