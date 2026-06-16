"use client";

import { useEffect, useRef } from "react";
import {
  AIXIT_LOCAL_STORAGE_KEYS,
  dispatchAixitStorageUpdatedEvents,
  isAixitCoreDataEmpty,
} from "@/lib/aixit-storage";
import { flushAixitKvQueue, fetchAixitKvMap } from "@/lib/supabase/aixitKv";
import { supabase, supabaseEnabled } from "@/lib/supabase/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";

type QueuedValue = string | null;

const CORE_KEYS = [
  "aixit.dashboardWorkflows.v1",
  "aixit.userWorkflowTemplates.v1",
  "aixit.todayTodos.v1",
  "aixit.dashboardLayout.v1",
  "aixit.minutes.v1",
] as const;

function isRemoteCoreEmpty(remoteMap: Record<string, string>) {
  for (const k of CORE_KEYS) {
    const v = remoteMap[k];
    if (v && v.trim().length > 0) return false;
  }
  return true;
}

export function AixitSupabaseSyncProvider() {
  const { user, loading } = useAuth();
  const remoteApplyingRef = useRef(false);
  const queueRef = useRef<Map<string, QueuedValue>>(new Map());
  const flushTimerRef = useRef<number | null>(null);
  // Realtime 채널 재사용을 위한 ref
  const realtimeChannelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  // ─────────────────────────────────────────────
  // 1) 초기 로드: 로그인 직후 remote↔local 비교 동기화
  // ─────────────────────────────────────────────
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

      // 케이스 1) remote 비어있음 + local 있음 → local을 remote로 업로드
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
        dispatchAixitStorageUpdatedEvents();
        return;
      }

      // 케이스 2) remote 있음 + local 비어있음 → remote를 local로 다운로드
      if (!remoteCoreEmpty && !localHadCore) {
        remoteApplyingRef.current = true;
        try {
          for (const k of AIXIT_LOCAL_STORAGE_KEYS) {
            if (Object.prototype.hasOwnProperty.call(remoteMap, k)) {
              window.localStorage.setItem(k, remoteMap[k]);
            }
          }
        } finally {
          remoteApplyingRef.current = false;
        }
        dispatchAixitStorageUpdatedEvents();
        return;
      }

      // 케이스 3) remote + local 둘 다 있음 → remote 키를 전부 local로 병합
      // (remote가 "가장 최근에 저장된 기기"의 데이터이므로 remote 우선 적용)
      if (!remoteCoreEmpty && localHadCore) {
        remoteApplyingRef.current = true;
        let changed = false;
        try {
          for (const k of AIXIT_LOCAL_STORAGE_KEYS) {
            const remoteVal = remoteMap[k];
            const localVal = window.localStorage.getItem(k);
            // remote에 있는 키가 local과 다를 경우 remote 값 적용
            if (remoteVal !== undefined && remoteVal !== localVal) {
              window.localStorage.setItem(k, remoteVal);
              changed = true;
            }
          }
        } finally {
          remoteApplyingRef.current = false;
        }
        if (changed) dispatchAixitStorageUpdatedEvents();

        // local에만 있는 키는 remote로 업로드
        const localOnlyQueue = new Map<string, QueuedValue>();
        for (const k of AIXIT_LOCAL_STORAGE_KEYS) {
          if (!Object.prototype.hasOwnProperty.call(remoteMap, k)) {
            const localVal = window.localStorage.getItem(k);
            if (localVal != null) localOnlyQueue.set(k, localVal);
          }
        }
        if (localOnlyQueue.size > 0) {
          flushAixitKvQueue(localOnlyQueue).catch((e) => {
            console.warn("AixitSupabaseSyncProvider: local-only→remote upload failed:", e);
          });
        }
      }
    }

    run().catch((err) => {
      console.warn("AixitSupabaseSyncProvider run failed:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  // ─────────────────────────────────────────────
  // 2) Auto-save: localStorage 변경을 Supabase로 자동 upsert (debounce 400ms)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!supabaseEnabled) return;
    if (typeof window === "undefined") return;
    if (loading) return;
    if (!user) return;

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
          console.warn("AixitSupabaseSyncProvider flush failed:", e);
        }
      }, 400);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ls as any).setItem = (key: string, value: string) => {
      try {
        originalSetItem(key, value);
      } catch (e) {
        console.warn(`LocalStorage setItem failed for key "${key}":`, e);
      }
      if (remoteApplyingRef.current) return;
      if (!keysSet.has(key)) return;
      queueRef.current.set(key, value);
      scheduleFlush();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ls as any).removeItem = (key: string) => {
      originalRemoveItem(key);
      if (remoteApplyingRef.current) return;
      if (!keysSet.has(key)) return;
      queueRef.current.set(key, null);
      scheduleFlush();
    };

    return () => {
      // SPA이므로 unmount 시 원상 복구하지 않음
    };
  }, [loading, user]);

  // ─────────────────────────────────────────────
  // 3) Realtime 구독: 다른 기기의 Supabase 변경을 실시간으로 수신
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!supabaseEnabled || !supabase) return;
    if (typeof window === "undefined") return;
    if (loading) return;
    if (!user) return;

    const keysSet = new Set<string>(AIXIT_LOCAL_STORAGE_KEYS as unknown as string[]);

    // 기존 채널이 있으면 정리
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    const channel = supabase
      .channel(`aixit-kv-sync-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE 모두
          schema: "public",
          table: "aixit_kv",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // 자기 기기가 업로드 중인 동안은 Realtime echo를 무시
          if (remoteApplyingRef.current) return;

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const { k, v } = payload.new as { k: string; v: string };
            if (!keysSet.has(k)) return;

            // 현재 local 값과 다를 때만 적용 (불필요한 re-render 방지)
            const currentLocal = window.localStorage.getItem(k);
            if (currentLocal === v) return;

            remoteApplyingRef.current = true;
            try {
              window.localStorage.setItem(k, v);
            } finally {
              remoteApplyingRef.current = false;
            }
            dispatchAixitStorageUpdatedEvents();
          } else if (payload.eventType === "DELETE") {
            const { k } = payload.old as { k: string };
            if (!keysSet.has(k)) return;

            remoteApplyingRef.current = true;
            try {
              window.localStorage.removeItem(k);
            } finally {
              remoteApplyingRef.current = false;
            }
            dispatchAixitStorageUpdatedEvents();
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.info("[AixitSync] Realtime 구독 시작 ✅");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[AixitSync] Realtime 채널 오류, 재연결 시도:", status);
        }
      });

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current && supabase) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [loading, user]);

  // ─────────────────────────────────────────────
  // 4) visibilitychange re-fetch: 모바일 백그라운드 복귀 시 최신 데이터 pull
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!supabaseEnabled) return;
    if (typeof window === "undefined") return;
    if (loading) return;
    if (!user) return;

    let lastFetchAt = Date.now();
    const REFETCH_COOLDOWN_MS = 10_000; // 10초 쿨다운 (너무 잦은 re-fetch 방지)

    async function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;

      const now = Date.now();
      if (now - lastFetchAt < REFETCH_COOLDOWN_MS) return;
      lastFetchAt = now;

      try {
        const remoteMap = await fetchAixitKvMap();
        const keysSet = new Set<string>(AIXIT_LOCAL_STORAGE_KEYS as unknown as string[]);

        remoteApplyingRef.current = true;
        let changed = false;
        try {
          for (const k of AIXIT_LOCAL_STORAGE_KEYS) {
            if (!keysSet.has(k)) continue;
            const remoteVal = remoteMap[k];
            const localVal = window.localStorage.getItem(k);
            if (remoteVal !== undefined && remoteVal !== localVal) {
              window.localStorage.setItem(k, remoteVal);
              changed = true;
            }
          }
        } finally {
          remoteApplyingRef.current = false;
        }

        if (changed) {
          console.info("[AixitSync] visibilitychange: 원격 데이터 변경 감지, UI 갱신 ✅");
          dispatchAixitStorageUpdatedEvents();
        }
      } catch (e) {
        console.warn("[AixitSync] visibilitychange re-fetch 실패:", e);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loading, user]);

  return null;
}
