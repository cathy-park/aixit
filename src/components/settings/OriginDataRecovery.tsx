"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AIXIT_STORAGE_SNAPSHOT_MESSAGE_TYPE,
  applyAixitLocalStorageSnapshot,
  dispatchAixitStorageUpdatedEvents,
  loadAixitLocalStorageSnapshot,
  type AixitStorageSnapshot,
} from "@/lib/aixit-storage";

type Found = {
  origin: string;
  snapshot: AixitStorageSnapshot;
  keyCount: number;
  nonEmptyCount: number;
  totalBytes: number;
};

function summarizeSnapshot(origin: string, snapshot: AixitStorageSnapshot): Found {
  const values = snapshot.values ?? {};
  const entries = Object.entries(values);
  let nonEmptyCount = 0;
  let totalBytes = 0;
  for (const [, v] of entries) {
    const s = (v ?? "").trim();
    if (s.length > 0) nonEmptyCount += 1;
    totalBytes += (v ?? "").length;
  }
  return { origin, snapshot, keyCount: entries.length, nonEmptyCount, totalBytes };
}

function buildCandidateOrigins(currentOrigin: string) {
  const url = new URL(currentOrigin);
  const proto = url.protocol;
  const host = url.hostname;
  const port = url.port || (proto === "https:" ? "443" : "80");

  const otherHost = host === "127.0.0.1" ? "localhost" : host === "localhost" ? "127.0.0.1" : null;
  const otherPort = port === "3000" ? "3001" : port === "3001" ? "3000" : null;

  const candidates: string[] = [];

  // Same origin (현재)
  candidates.push(`${proto}//${host}${url.port ? `:${port}` : ""}`.replace(/:80$|:443$/, ""));

  // Host swap
  if (otherHost) candidates.push(`${proto}//${otherHost}${url.port ? `:${port}` : ""}`.replace(/:80$|:443$/, ""));

  // Port swap
  if (otherPort) candidates.push(`${proto}//${host}:${otherPort}`);

  // Host+Port swap
  if (otherHost && otherPort) candidates.push(`${proto}//${otherHost}:${otherPort}`);

  // Common dev origins (safety net)
  if (proto === "http:") {
    candidates.push("http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001");
  }

  return [...new Set(candidates)];
}

export function OriginDataRecovery() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<Found[]>([]);
  const [appliedFrom, setAppliedFrom] = useState<string | null>(null);

  const candidates = useMemo(() => {
    if (typeof window === "undefined") return [];
    return buildCandidateOrigins(window.location.origin);
  }, []);

  const nonceRef = useRef<string>("");
  const pendingOriginsRef = useRef<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    return () => {
      if (iframeRef.current) iframeRef.current.remove();
    };
  }, []);

  async function probeOrigins() {
    if (typeof window === "undefined") return;
    setBusy(true);
    setError(null);
    setAppliedFrom(null);
    setFound([]);

    // Always include current snapshot too (즉시 확인)
    const local = loadAixitLocalStorageSnapshot();
    const localSummary = summarizeSnapshot(window.location.origin, local);

    const results: Found[] = [localSummary];

    const nonce = `aixit_find_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    nonceRef.current = nonce;

    // candidates에서 현재 origin 제거 (이미 localSummary로 포함)
    const others = candidates.filter((o) => o !== window.location.origin);
    pendingOriginsRef.current = [...others];

    const onMessage = (e: MessageEvent) => {
      const msg = e.data as any;
      if (!msg || typeof msg !== "object") return;
      if (msg.type !== AIXIT_STORAGE_SNAPSHOT_MESSAGE_TYPE) return;
      if (msg.nonce !== nonceRef.current) return;
      if (!msg.snapshot) return;

      const snap = msg.snapshot as AixitStorageSnapshot;
      const origin = e.origin;
      results.push(summarizeSnapshot(origin, snap));
    };

    window.addEventListener("message", onMessage);

    try {
      for (const origin of pendingOriginsRef.current) {
        // 현재 페이지가 https면, http origin은 iframe 로딩 자체가 막힐 수 있음(혼합 콘텐츠)
        if (window.location.protocol === "https:" && origin.startsWith("http:")) continue;

        // 새 iframe로 helper 페이지를 로드 → snapshot을 postMessage로 받음
        if (iframeRef.current) iframeRef.current.remove();
        const iframe = document.createElement("iframe");
        iframeRef.current = iframe;
        iframe.src = `${origin}/storage-migration?nonce=${encodeURIComponent(nonce)}`;
        iframe.style.display = "none";
        iframe.setAttribute("aria-hidden", "true");
        document.body.appendChild(iframe);

        // 응답 대기
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => window.setTimeout(r, 900));
      }

      // 정렬: nonEmptyCount desc, bytes desc
      const uniq = new Map<string, Found>();
      for (const r of results) uniq.set(r.origin, r);
      const sorted = [...uniq.values()].sort((a, b) => {
        if (a.nonEmptyCount !== b.nonEmptyCount) return b.nonEmptyCount - a.nonEmptyCount;
        return b.totalBytes - a.totalBytes;
      });
      setFound(sorted);
    } catch (e) {
      setError("데이터 탐색 중 오류가 발생했어요. (다른 origin이 꺼져있거나 차단됐을 수 있어요)");
    } finally {
      window.removeEventListener("message", onMessage);
      if (iframeRef.current) iframeRef.current.remove();
      iframeRef.current = null;
      setBusy(false);
    }
  }

  function apply(foundItem: Found) {
    applyAixitLocalStorageSnapshot(foundItem.snapshot);
    dispatchAixitStorageUpdatedEvents();
    setAppliedFrom(foundItem.origin);
  }

  return (
    <div className="rounded-2xl bg-white p-6 text-sm text-zinc-700 shadow-sm ring-1 ring-zinc-200">
      <div className="text-base font-semibold text-zinc-950">데이터 찾기 (자동 복구)</div>
      <div className="mt-1 text-xs text-zinc-500">
        이전에 다른 주소(예: <span className="font-mono">127.0.0.1:3000</span>, <span className="font-mono">localhost:3001</span>)
        에서 사용했다면 데이터가 그 쪽 브라우저 저장소에 남아있을 수 있어요. 버튼을 누르면 자동으로 찾아서 보여줘요.
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={probeOrigins}
          disabled={busy}
          className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "찾는 중…" : "내 데이터 찾아보기"}
        </button>
      </div>

      {error ? <div className="mt-3 text-sm font-semibold text-rose-700">{error}</div> : null}
      {appliedFrom ? (
        <div className="mt-3 text-sm font-semibold text-emerald-700">
          복원 완료: <span className="font-mono">{appliedFrom}</span>의 데이터를 현재 브라우저로 가져왔어요.
        </div>
      ) : null}

      {found.length > 0 ? (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold text-zinc-500">발견된 후보</div>
          <ul className="space-y-2">
            {found.map((f) => (
              <li key={f.origin} className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs text-zinc-700">{f.origin}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      keys: {f.keyCount} · non-empty: {f.nonEmptyCount} · approx bytes: {f.totalBytes}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => apply(f)}
                    className="shrink-0 rounded-full bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                  >
                    이 데이터로 복원
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="text-[11px] text-zinc-500">
            팁: 복원 후에는 상단의 Supabase Sync에서 로그인하고 <span className="font-semibold">Push local → Supabase</span>를 누르면
            다른 컴퓨터에도 동기화됩니다.
          </div>
        </div>
      ) : null}
    </div>
  );
}

