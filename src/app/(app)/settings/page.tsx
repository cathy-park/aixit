"use client";

import { AdaptivePageHeader } from "@/components/layout/AdaptivePageHeader";
import { AppMainColumn } from "@/components/layout/AppMainColumn";
import { useState } from "react";
import { supabase, supabaseEnabled } from "@/lib/supabase/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<string | null>(null);

  return (
    <>
      <AdaptivePageHeader
        title="설정"
        description="앱 환경과 계정 관련 옵션을 여기서 다룰 수 있어요."
        hideOnMobile
      />
      <AppMainColumn>
        <div className="mt-4 space-y-4">
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
        </div>
      </AppMainColumn>
    </>
  );
}
