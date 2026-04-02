"use client";

import { AdaptivePageHeader } from "@/components/layout/AdaptivePageHeader";
import { AppMainColumn } from "@/components/layout/AppMainColumn";
import { applyAixitLocalStorageSnapshot, dispatchAixitStorageUpdatedEvents, loadAixitLocalStorageSnapshot } from "@/lib/aixit-storage";
import { AIXIT_LOCAL_STORAGE_KEYS } from "@/lib/aixit-storage";
import { useMemo, useState } from "react";
import { supabase, supabaseEnabled } from "@/lib/supabase/supabaseClient";
import { fetchAixitKvMap, flushAixitKvQueue } from "@/lib/supabase/aixitKv";
import { useAuth } from "@/components/auth/AuthProvider";
import { OriginDataRecovery } from "@/components/settings/OriginDataRecovery";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const [importText, setImportText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [supStatus, setSupStatus] = useState<string | null>(null);
  const [supCoreRows, setSupCoreRows] = useState<number | null>(null);
  const [supFetchError, setSupFetchError] = useState<string | null>(null);
  const exportJson = useMemo(() => {
    return JSON.stringify(loadAixitLocalStorageSnapshot(), null, 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function downloadJson(filename: string, text: string) {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function doExport() {
    const snapshot = loadAixitLocalStorageSnapshot();
    const text = JSON.stringify(snapshot, null, 2);
    downloadJson(`aixit-storage-backup_${snapshot.takenAt}.json`, text);
    setStatus("Export 완료: JSON 파일이 다운로드됩니다.");
  }

  async function doImportFromText() {
    setStatus(null);
    const raw = importText.trim();
    if (!raw) {
      setStatus("Import할 JSON이 비어 있어요.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setStatus("JSON 파싱에 실패했어요. 형식을 확인해 주세요.");
      return;
    }

    if (!parsed || typeof parsed !== "object") {
      setStatus("JSON 형식이 올바르지 않아요.");
      return;
    }

    // applyAixitLocalStorageSnapshot은 내부에서 스키마 체크까지 하고 조용히 무시할 수 있으니, 여기서 최소 검증
    const snap = parsed as { schemaVersion?: unknown; values?: unknown };
    if (snap.schemaVersion !== 1 || !snap.values || typeof snap.values !== "object") {
      setStatus("지원하지 않는 스냅샷 형식이에요. Export JSON으로 만든 파일을 사용해 주세요.");
      return;
    }

    try {
      applyAixitLocalStorageSnapshot(parsed as any);
      dispatchAixitStorageUpdatedEvents();
      setStatus("Import 완료: 데이터가 복원되었습니다.");
      setImportText("");
    } catch {
      setStatus("Import 중 오류가 발생했어요. 다시 시도해 주세요.");
    }
  }

  async function supPull() {
    setSupStatus(null);
    setSupFetchError(null);
    if (!user) {
      setSupFetchError("로그인 후 사용할 수 있어요.");
      return;
    }
    try {
      const map = await fetchAixitKvMap();
      let applied = 0;
      for (const k of AIXIT_LOCAL_STORAGE_KEYS) {
        if (Object.prototype.hasOwnProperty.call(map, k)) {
          window.localStorage.setItem(k, map[k]);
          applied += 1;
        } else {
          window.localStorage.removeItem(k);
        }
      }
      dispatchAixitStorageUpdatedEvents();
      setSupStatus(`Supabase → local 적용 완료 (${applied} keys)`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(e);
      setSupFetchError("Supabase Pull 실패 (권한/테이블/RLS 확인 필요)");
    }
  }

  async function supPush() {
    setSupStatus(null);
    setSupFetchError(null);
    if (!user) {
      setSupFetchError("로그인 후 사용할 수 있어요.");
      return;
    }
    try {
      const queue = new Map<string, string | null>();
      for (const k of AIXIT_LOCAL_STORAGE_KEYS) {
        const v = window.localStorage.getItem(k);
        if (v == null) queue.set(k, null);
        else queue.set(k, v);
      }
      await flushAixitKvQueue(queue);
      setSupStatus("local → Supabase 업로드(푸시) 완료");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(e);
      setSupFetchError("Supabase Push 실패 (권한/테이블/RLS 확인 필요)");
    }
  }

  async function supCheck() {
    setSupStatus(null);
    setSupFetchError(null);
    if (!user) {
      setSupFetchError("로그인 후 사용할 수 있어요.");
      return;
    }
    try {
      const map = await fetchAixitKvMap();
      const coreKeys = [
        "aixit.dashboardWorkflows.v1",
        "aixit.userWorkflowTemplates.v1",
        "aixit.inspirationSites.v1",
        "aixit.todayTodos.v1",
        "aixit.dashboardLayout.v1",
      ] as const;
      const present = coreKeys.filter((k) => Object.prototype.hasOwnProperty.call(map, k) && map[k].trim().length > 0);
      setSupCoreRows(present.length);
      setSupStatus(`Supabase core keys 존재: ${present.length}/${coreKeys.length}`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(e);
      setSupFetchError("Supabase Check 실패 (권한/테이블/RLS 확인 필요)");
    }
  }

  return (
    <>
      <AdaptivePageHeader
        title="설정"
        description="앱 환경과 계정 관련 옵션을 여기서 다룰 수 있어요."
      />
      <AppMainColumn>
        <div className="mt-4 space-y-4">
          <OriginDataRecovery />

          <div className="rounded-2xl bg-white p-6 text-sm text-zinc-700 shadow-sm ring-1 ring-zinc-200">
            <div className="text-base font-semibold text-zinc-950">계정</div>
            <div className="mt-1 text-xs text-zinc-500">
              {supabaseEnabled ? "Supabase 연결됨" : "Supabase 연결 비활성화 (.env.local 확인 필요)"}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {loading ? (
                <span className="text-xs text-zinc-500">세션 확인 중…</span>
              ) : user ? (
                <>
                  <span className="text-xs text-zinc-600">
                    로그인됨: <span className="font-mono">{user.email ?? user.id}</span>
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      setStatus(null);
                      setSupFetchError(null);
                      await supabase?.auth.signOut();
                      setStatus("로그아웃 완료");
                    }}
                    className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    setStatus(null);
                    setSupFetchError(null);
                    if (!supabaseEnabled || !supabase) {
                      setStatus("Supabase가 비활성화되어 있어요. .env.local을 확인해 주세요.");
                      return;
                    }
                    const redirectTo = `${window.location.origin}/auth/callback`;
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: "google",
                      options: { redirectTo },
                    });
                    if (error) setStatus("구글 로그인 시작에 실패했어요.");
                  }}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                >
                  Google로 로그인
                </button>
              )}
            </div>
            {status ? <div className="mt-3 text-sm font-semibold text-zinc-700">{status}</div> : null}
            <div className="mt-3 text-xs text-zinc-500">
              다른 컴퓨터와 동기화하려면 Supabase에서 Google Provider와 Redirect URL 설정이 필요해요. 자세한 내용은{" "}
              <span className="font-mono">SUPABASE_SETUP.md</span>를 참고하세요.
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 text-sm text-zinc-700 shadow-sm ring-1 ring-zinc-200">
            <div className="text-base font-semibold text-zinc-950">Supabase Sync (Debug)</div>
            <div className="mt-1 text-xs text-zinc-500">
              {supabaseEnabled ? "연결됨" : "연결 비활성화 (환경변수 확인 필요)"} ·{" "}
              {user ? (
                <>
                  사용자: <span className="font-mono">{user.email ?? user.id}</span>
                </>
              ) : (
                "로그인 필요"
              )}{" "}
              · 테이블: <span className="font-mono">public.aixit_kv</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={supCheck}
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50"
              >
                Check Remote
              </button>
              <button
                type="button"
                onClick={supPush}
                className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                Push local → Supabase
              </button>
              <button
                type="button"
                onClick={supPull}
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Pull Supabase → local
              </button>
            </div>
            {supFetchError ? <div className="mt-3 text-sm font-semibold text-rose-700">{supFetchError}</div> : null}
            {supCoreRows != null ? <div className="mt-2 text-xs text-zinc-500">core keys on remote: {supCoreRows}</div> : null}
            {supStatus ? <div className="mt-2 text-sm font-semibold text-zinc-700">{supStatus}</div> : null}
            <div className="mt-3 text-xs text-zinc-500">
              권장: Cursor preview(데이터 있는 쪽)에서 <span className="font-semibold">Push</span> → Chrome에서 <span className="font-semibold">Pull</span>.
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 text-sm text-zinc-700 shadow-sm ring-1 ring-zinc-200">
            <div className="text-base font-semibold text-zinc-950">Export JSON / Import JSON</div>
            <div className="mt-1 text-sm text-zinc-500">
              `localhost`와 `127.0.0.1`처럼 origin이 달라지면 `localStorage`가 분리되어 데이터가 안 보일 수 있어요. 아래로 백업/복원을 하면 양쪽에서 같은 데이터를 사용할 수 있습니다.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={doExport}
                className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(exportJson);
                    setStatus("Export JSON이 클립보드로 복사되었습니다.");
                  } catch {
                    setStatus("클립보드 복사에 실패했어요.");
                  }
                }}
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50"
              >
                Copy JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportText(exportJson);
                  setStatus(null);
                }}
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50"
              >
                Paste Export into Import
              </button>
            </div>
            <div className="mt-3 text-xs text-zinc-500">
              권장: Export한 JSON을 복사해서 다른 origin(예: 127.0.0.1)에서 Import하세요.
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 text-sm text-zinc-700 shadow-sm ring-1 ring-zinc-200">
            <div className="text-base font-semibold text-zinc-950">Import</div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="여기에 Export한 JSON을 붙여넣으세요."
              className="mt-3 min-h-[200px] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-zinc-500">Import 시 기존 데이터가 snapshot 값으로 덮어써집니다.</div>
              <button
                type="button"
                onClick={doImportFromText}
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Import JSON
              </button>
            </div>
            {status ? <div className="mt-3 text-sm font-semibold text-zinc-700">{status}</div> : null}
          </div>
        </div>
      </AppMainColumn>
    </>
  );
}
