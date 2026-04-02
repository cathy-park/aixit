"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase, supabaseEnabled } from "@/lib/supabase/supabaseClient";
import { hasAnyAixitPersistedData } from "@/lib/aixit-storage";

const DISMISS_KEY = "aixit.guestNotice.dismissed.v1";

export function GuestModeNotice() {
  const params = useSearchParams();
  const { user, loading } = useAuth();

  const guest = useMemo(() => params?.get("guest") === "1", [params]);
  const [dismissed, setDismissed] = useState(false);
  const [hasLocal, setHasLocal] = useState(false);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    setHasLocal(hasAnyAixitPersistedData());
  }, []);

  if (loading) return null;
  if (user) return null;
  if (!guest) return null;
  if (dismissed) return null;

  const canLogin = supabaseEnabled && Boolean(supabase);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 sm:px-6">
      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="font-semibold">둘러보기 모드</div>
            <div className="mt-1 text-xs text-blue-900/80">
              지금 추가하는 데이터는 이 브라우저의 로컬 저장소에만 저장돼요. 로그인하면 계정으로 옮겨 다른 기기와
              동기화할 수 있어요.
            </div>
            {hasLocal ? (
              <div className="mt-1 text-xs text-blue-900/80">
                현재 이 브라우저에 저장된 데이터가 감지됐어요. 로그인하면 원격이 비어 있을 때 자동으로 업로드됩니다.
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {canLogin ? (
              <button
                type="button"
                onClick={async () => {
                  const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
                  await supabase!.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo },
                  });
                }}
                className="rounded-full bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Google로 로그인
              </button>
            ) : (
              <Link
                href="/settings"
                className="rounded-full bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                설정에서 로그인
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                window.localStorage.setItem(DISMISS_KEY, "1");
                setDismissed(true);
              }}
              className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-blue-900 ring-1 ring-blue-200 hover:bg-blue-100/40"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

