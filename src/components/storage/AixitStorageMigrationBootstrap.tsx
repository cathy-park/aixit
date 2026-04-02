"use client";

import { useEffect } from "react";
import {
  AIXIT_STORAGE_SNAPSHOT_MESSAGE_TYPE,
  applyAixitLocalStorageSnapshot,
  getAutoMigrationMarkerKey,
  isAixitCoreDataEmpty,
} from "@/lib/aixit-storage";
import { supabaseEnabled } from "@/lib/supabase/supabaseClient";

function pickOtherHost(hostname: string) {
  if (hostname === "127.0.0.1") return "localhost";
  if (hostname === "localhost") return "127.0.0.1";
  return null;
}

export function AixitStorageMigrationBootstrap() {
  useEffect(() => {
    // Supabase 동기화 모드에서는 origin 마이그레이션을 비활성화합니다.
    if (supabaseEnabled) return;

    // storage-migration iframe helper 쪽에서는 동작하지 않게 가드
    if (window.location.pathname.startsWith("/storage-migration")) return;

    const hostname = window.location.hostname;
    const otherHost = pickOtherHost(hostname);
    if (!otherHost) return;

    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : "";
    const destOrigin = `${protocol}//${hostname}${port}`;
    const otherOrigin = `${protocol}//${otherHost}${port}`;

    const markerKey = getAutoMigrationMarkerKey(window.location.host);
    if (window.localStorage.getItem(markerKey)) return;

    // 목적: destination(origin=127.0.0.1 or localhost)의 핵심 데이터가 비어 있을 때만 자동 동기화
    if (!isAixitCoreDataEmpty()) return;

    const nonce = `aixit_mig_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    let done = false;
    let iframe: HTMLIFrameElement | null = null;

    const cleanup = () => {
      done = true;
      if (iframe) iframe.remove();
      window.removeEventListener("message", onMessage);
    };

    const onMessage = (e: MessageEvent) => {
      if (done) return;
      if (e.origin !== otherOrigin) return;

      const msg = e.data as unknown;
      if (!msg || typeof msg !== "object") return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyMsg = msg as any;
      if (anyMsg.type !== AIXIT_STORAGE_SNAPSHOT_MESSAGE_TYPE) return;
      if (anyMsg.nonce !== nonce) return;

      try {
        const snapshot = anyMsg.snapshot;
        if (!snapshot || typeof snapshot !== "object") return;

        applyAixitLocalStorageSnapshot(snapshot);
        window.localStorage.setItem(
          markerKey,
          JSON.stringify({
            appliedAt: Date.now(),
            fromOrigin: e.origin,
            toOrigin: destOrigin,
          }),
        );
      } finally {
        cleanup();
      }
    };

    window.addEventListener("message", onMessage);

    // 다른 origin의 helper 페이지(iframe)에서 snapshot을 postMessage로 받습니다.
    iframe = document.createElement("iframe");
    iframe.src = `${otherOrigin}/storage-migration?nonce=${encodeURIComponent(nonce)}`;
    iframe.style.display = "none";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    window.setTimeout(() => cleanup(), 6_000);
    return () => cleanup();
  }, []);

  return null;
}

