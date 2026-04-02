"use client";

import { useEffect } from "react";
import {
  AIXIT_STORAGE_SNAPSHOT_MESSAGE_TYPE,
  applyAixitLocalStorageSnapshot,
  getAutoMigrationMarkerKey,
  isAixitCoreDataEmpty,
} from "@/lib/aixit-storage";

function pickOtherHost(hostname: string) {
  if (hostname === "127.0.0.1") return "localhost";
  if (hostname === "localhost") return "127.0.0.1";
  return null;
}

function pickOtherPort(port: string) {
  // 개발 중 포트만 바뀌어서 데이터가 "사라진 것처럼" 보이는 경우가 많습니다.
  // (localStorage는 origin(host+port)별로 분리 저장)
  if (port === "3000") return "3001";
  if (port === "3001") return "3000";
  return null;
}

export function AixitStorageMigrationBootstrap() {
  useEffect(() => {
    // storage-migration iframe helper 쪽에서는 동작하지 않게 가드
    if (window.location.pathname.startsWith("/storage-migration")) return;

    const hostname = window.location.hostname;
    const otherHost = pickOtherHost(hostname);
    const port = window.location.port ? window.location.port : "";
    const otherPort = pickOtherPort(port);
    if (!otherHost && !otherPort) return;

    const protocol = window.location.protocol;
    const destOrigin = `${protocol}//${hostname}${port ? `:${port}` : ""}`;

    // 후보 origin들을 우선순위로 나열합니다.
    // 1) host/port 둘 다 변경된 경우 (localhost:3001 -> 127.0.0.1:3000 등)
    // 2) host만 다른 경우
    // 3) port만 다른 경우
    const candidateOrigins: string[] = [];
    if (otherHost && otherPort) candidateOrigins.push(`${protocol}//${otherHost}:${otherPort}`);
    if (otherHost) candidateOrigins.push(`${protocol}//${otherHost}${port ? `:${port}` : ""}`);
    if (otherPort) candidateOrigins.push(`${protocol}//${hostname}:${otherPort}`);
    // 중복 제거
    const uniqueCandidates = [...new Set(candidateOrigins)].filter((o) => o !== destOrigin);
    if (uniqueCandidates.length === 0) return;

    const markerKey = getAutoMigrationMarkerKey(window.location.host);
    if (window.localStorage.getItem(markerKey)) return;

    // 목적: destination(origin=127.0.0.1 or localhost)의 핵심 데이터가 비어 있을 때만 자동 동기화
    if (!isAixitCoreDataEmpty()) return;

    let done = false;
    let iframe: HTMLIFrameElement | null = null;
    let currentOtherOrigin: string | null = null;
    let tryIndex = 0;

    const cleanup = () => {
      done = true;
      if (iframe) iframe.remove();
      window.removeEventListener("message", onMessage);
    };

    const onMessage = (e: MessageEvent) => {
      if (done) return;
      if (!currentOtherOrigin) return;
      if (e.origin !== currentOtherOrigin) return;

      const msg = e.data as unknown;
      if (!msg || typeof msg !== "object") return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyMsg = msg as any;
      if (anyMsg.type !== AIXIT_STORAGE_SNAPSHOT_MESSAGE_TYPE) return;

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

    const tryNext = () => {
      if (done) return;
      if (tryIndex >= uniqueCandidates.length) {
        cleanup();
        return;
      }

      currentOtherOrigin = uniqueCandidates[tryIndex] ?? null;
      tryIndex += 1;
      if (!currentOtherOrigin) return;

      const nonce = `aixit_mig_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      // 다른 origin의 helper 페이지(iframe)에서 snapshot을 postMessage로 받습니다.
      if (iframe) iframe.remove();
      iframe = document.createElement("iframe");
      iframe.src = `${currentOtherOrigin}/storage-migration?nonce=${encodeURIComponent(nonce)}`;
      iframe.style.display = "none";
      iframe.setAttribute("aria-hidden", "true");
      document.body.appendChild(iframe);

      // 다음 후보로 넘어가기 위한 타임아웃(응답이 오면 cleanup으로 종료)
      window.setTimeout(() => {
        if (!done) tryNext();
      }, 1_500);
    };

    tryNext();

    window.setTimeout(() => cleanup(), 6_000);
    return () => cleanup();
  }, []);

  return null;
}

