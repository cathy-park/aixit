"use client";

import { AdaptivePageHeader } from "@/components/layout/AdaptivePageHeader";
import { AppMainColumn } from "@/components/layout/AppMainColumn";
import { useEffect, useState } from "react";
import { supabase, supabaseEnabled } from "@/lib/supabase/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";
import { APP_NAV_ITEMS } from "@/components/layout/app-nav-items";
import { useNavVisibility, useNavOrder } from "@/lib/use-nav-visibility";
import { AIXIT_LOCAL_STORAGE_KEYS, dispatchAixitStorageUpdatedEvents } from "@/lib/aixit-storage";
import { flushAixitKvQueue, fetchAixitKvMap } from "@/lib/supabase/aixitKv";
import { KAKAO_REST_API_KEY, getKakaoAuthUrl, isKakaoConnected, clearKakaoToken } from "@/lib/kakao/kakaoClient";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const { isVisible, toggle } = useNavVisibility();
  const { order, updateOrder } = useNavOrder();
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const orderedItems = [...APP_NAV_ITEMS].sort((a, b) => {
    const idxA = order.indexOf(a.id);
    const idxB = order.indexOf(b.id);
    return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
  });

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) return;

    const currentOrder = orderedItems.map(i => i.id);
    const draggedIdx = currentOrder.indexOf(draggedItemId);
    const targetIdx = currentOrder.indexOf(targetId);

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedItemId);

    updateOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
  };
  const [kakaoConnected, setKakaoConnected] = useState(false);
  const kakaoEnabled = Boolean(KAKAO_REST_API_KEY);

  useEffect(() => {
    setKakaoConnected(isKakaoConnected());
    const onUpdate = () => setKakaoConnected(isKakaoConnected());
    window.addEventListener("aixit-kakao-token-updated", onUpdate);
    return () => window.removeEventListener("aixit-kakao-token-updated", onUpdate);
  }, []);

  function handleExport() {
    const data: Record<string, string> = {};
    for (const k of AIXIT_LOCAL_STORAGE_KEYS) {
      const v = window.localStorage.getItem(k);
      if (v != null) data[k] = v;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aixit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSyncStatus("✅ 백업 파일이 다운로드되었습니다.");
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const data = JSON.parse(text) as Record<string, string>;
        let applied = 0;
        for (const k of AIXIT_LOCAL_STORAGE_KEYS) {
          if (data[k] !== undefined) {
            window.localStorage.setItem(k, data[k]);
            applied++;
          }
        }
        dispatchAixitStorageUpdatedEvents();
        setSyncStatus(`✅ ${applied}개 항목을 성공적으로 복원했습니다.`);
      } catch (err) {
        setSyncStatus(`❌ 복원 실패: 올바른 백업 파일이 아닙니다.`);
      }
      e.target.value = "";
    };
    reader.readAsText(file);
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

          {/* 카카오 캘린더 연동 섹션 */}
          {kakaoEnabled && (
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
              <div className="flex items-center gap-2">
                <span className="text-xl">🟡</span>
                <div className="text-base font-semibold text-zinc-950">카카오 캘린더 연동</div>
                {kakaoConnected && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    연결됨
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                AIXIT에 예정 일정을 추가하면 카카오톡 캘린더에도 자동으로 등록돼요.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {kakaoConnected ? (
                  <button
                    type="button"
                    onClick={() => clearKakaoToken()}
                    className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
                  >
                    카카오 연결 해제
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { window.location.href = getKakaoAuthUrl(); }}
                    className="rounded-full bg-[#FEE500] px-4 py-2 text-xs font-bold text-[#191919] hover:bg-yellow-300 transition"
                  >
                    🟡 카카오 계정으로 연결
                  </button>
                )}
              </div>
              {!kakaoConnected && (
                <div className="mt-3 text-[11px] text-zinc-400">
                  연결 후 캘린더에서 일정을 추가하면 자동으로 카카오 캘린더에 동기화됩니다.
                </div>
              )}
            </div>
          )}

          {/* 데이터 백업/복원 섹션 */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
            <div className="text-base font-semibold text-zinc-950">데이터 백업 / 복원</div>
            <div className="mt-1 text-xs text-zinc-500">
              현재 기기의 모든 데이터를 파일로 저장하거나, 파일에서 데이터를 불러올 수 있어요.
              (복원 시 현재 데이터 위에 덮어씁니다.)
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700"
              >
                ↑ JSON 파일로 내보내기 (백업)
              </button>
              <label className="cursor-pointer rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50">
                ↓ 파일에서 불러오기 (복원)
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                />
              </label>
            </div>
            {syncStatus && (
              <div className="mt-3 text-xs font-medium text-zinc-700">{syncStatus}</div>
            )}
          </div>

          {/* 메뉴 표시 설정 섹션 */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
            <div className="text-base font-semibold text-zinc-950">메뉴 표시 설정</div>
            <div className="mt-1 text-xs text-zinc-500">
              좌측(PC) / 상단(모바일) 메뉴에 표시할 항목을 선택하세요.
            </div>
            <div className="mt-4 space-y-1">
              {orderedItems.map((item) => {
                const Icon = item.icon;
                const visible = isVisible(item.id);
                const locked = item.alwaysVisible === true;

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragOver={(e) => handleDragOver(e, item.id)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-zinc-50 cursor-grab active:cursor-grabbing ${draggedItemId === item.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-zinc-300 hover:text-zinc-500 shrink-0">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 3C4 3.55228 3.55228 4 3 4C2.44772 4 2 3.55228 2 3C2 2.44772 2.44772 2 3 2C3.55228 2 4 2.44772 4 3ZM4 9C4 9.55228 3.55228 10 3 10C2.44772 10 2 9.55228 2 9C2 8.44772 2.44772 8 3 8C3.55228 8 4 8.44772 4 9ZM10 3C10 3.55228 9.55228 4 9 4C8.44772 4 8 3.55228 8 3C8 2.44772 8.44772 2 9 2C9.55228 2 10 2.44772 10 3ZM10 9C10 9.55228 9.55228 10 9 10C8.44772 10 8 9.55228 8 9C8 8.44772 8.44772 8 9 8C9.55228 8 10 8.44772 10 9Z" fill="currentColor"/></svg>
                      </div>
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

