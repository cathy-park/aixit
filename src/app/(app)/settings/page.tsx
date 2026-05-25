"use client";

import { AdaptivePageHeader } from "@/components/layout/AdaptivePageHeader";
import { AppMainColumn } from "@/components/layout/AppMainColumn";
import { useState } from "react";
import { supabase, supabaseEnabled } from "@/lib/supabase/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";
import { APP_NAV_ITEMS } from "@/components/layout/app-nav-items";
import { useNavVisibility } from "@/lib/use-nav-visibility";
import { AIXIT_LOCAL_STORAGE_KEYS, dispatchAixitStorageUpdatedEvents } from "@/lib/aixit-storage";
import { flushAixitKvQueue, fetchAixitKvMap } from "@/lib/supabase/aixitKv";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { isVisible, toggle } = useNavVisibility();

  /** PC → Supabase: 현재 localStorage 전체를 Remote에 강제 업로드 */
  async function forcePushToRemote() {
    if (!supabaseEnabled || !user) {
      setSyncStatus("❌ Supabase 연결이 필요합니다.");
      return;
    }
    setSyncing(true);
    setSyncStatus("⏳ 업로드 중...");
    try {
      const queue = new Map<string, string>();
      for (const k of AIXIT_LOCAL_STORAGE_KEYS) {
        const v = window.localStorage.getItem(k);
        if (v != null) queue.set(k, v);
      }
      await flushAixitKvQueue(queue);
      setSyncStatus(`✅ ${queue.size}개 항목을 Supabase에 업로드했어요. 모바일에서 새로고침하세요.`);
    } catch (e) {
      setSyncStatus(`❌ 업로드 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSyncing(false);
    }
  }

  /** Supabase → PC: Remote 데이터를 내려받아 localStorage에 적용 */
  async function forcePullFromRemote() {
    if (!supabaseEnabled || !user) {
      setSyncStatus("❌ Supabase 연결이 필요합니다.");
      return;
    }
    setSyncing(true);
    setSyncStatus("⏳ 다운로드 중...");
    try {
      const remoteMap = await fetchAixitKvMap();
      let applied = 0;
      for (const k of AIXIT_LOCAL_STORAGE_KEYS) {
        if (Object.prototype.hasOwnProperty.call(remoteMap, k)) {
          window.localStorage.setItem(k, remoteMap[k]);
          applied++;
        }
      }
      dispatchAixitStorageUpdatedEvents();
      setSyncStatus(`✅ ${applied}개 항목을 내려받았어요. 화면이 갱신됩니다.`);
    } catch (e) {
      setSyncStatus(`❌ 다운로드 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <AdaptivePageHeader
        title="설정"
        description="앱 환경과 계정 관련 옵션을 여기서 다룰 수 있어요."
        hideOnMobile
      />
      <AppMainColumn>
        <div className="mt-4 space-y-4">
          {/* 계정 섹션 */}
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

          {/* 데이터 동기화 섹션 */}
          {supabaseEnabled && user && (
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
              <div className="text-base font-semibold text-zinc-950">데이터 동기화</div>
              <div className="mt-1 text-xs text-zinc-500">
                PC ↔ 모바일 간 데이터가 맞지 않을 때 수동으로 동기화할 수 있어요.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={syncing}
                  onClick={forcePushToRemote}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  ↑ 이 기기 → Supabase 업로드
                </button>
                <button
                  type="button"
                  disabled={syncing}
                  onClick={forcePullFromRemote}
                  className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:opacity-50"
                >
                  ↓ Supabase → 이 기기 다운로드
                </button>
              </div>
              {syncStatus && (
                <div className="mt-3 text-xs font-medium text-zinc-700">{syncStatus}</div>
              )}
            </div>
          )}

          {/* 메뉴 표시 설정 섹션 */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
            <div className="text-base font-semibold text-zinc-950">메뉴 표시 설정</div>
            <div className="mt-1 text-xs text-zinc-500">
              좌측(PC) / 상단(모바일) 메뉴에 표시할 항목을 선택하세요.
            </div>
            <div className="mt-4 space-y-1">
              {APP_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const visible = isVisible(item.id);
                const locked = item.alwaysVisible === true;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-zinc-50"
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className="h-5 w-5 shrink-0 text-zinc-400"
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span className="text-sm font-semibold text-zinc-800">{item.label}</span>
                      {locked && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                          항상 표시
                        </span>
                      )}
                    </div>

                    {/* 토글 스위치 */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={visible}
                      aria-label={`${item.label} 메뉴 ${visible ? "숨기기" : "표시하기"}`}
                      disabled={locked}
                      onClick={() => !locked && toggle(item.id, !visible)}
                      className={[
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2",
                        visible ? "bg-zinc-900" : "bg-zinc-200",
                        locked ? "cursor-not-allowed opacity-40" : "",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200",
                          visible ? "translate-x-5" : "translate-x-0",
                        ].join(" ")}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AppMainColumn>
    </>
  );
}

