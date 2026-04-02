"use client";

import Image from "next/image";
import Link from "next/link";
import { supabase, supabaseEnabled } from "@/lib/supabase/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.7 2.9l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.1-.1-2.2-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.7 1.1 7.7 2.9l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10.1-2 13.7-5.2l-6.3-5.3c-1.7 1.3-4 2.1-7.4 2.1-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.5 39.5 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3-3.4 5.4-6.6 6.9l.1.1 6.3 5.3C37 38.6 44 34 44 24c0-1.1-.1-2.2-.4-3.5z"
      />
    </svg>
  );
}

export default function LandingPageClient() {
  const { user, loading } = useAuth();

  const canLogin = supabaseEnabled && Boolean(supabase);

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-[#1E1E21] px-6 py-12 text-zinc-100">
      <div className="w-full max-w-[420px] text-center">
        <div className="mx-auto w-full max-w-[min(100%,320px)]">
          <Image
            src="/landing-intro-aixit.png?v=1"
            alt="AIXIT"
            width={512}
            height={512}
            priority
            unoptimized
            className="h-auto w-full object-contain"
          />
        </div>

        <p className="mt-6 text-sm leading-relaxed text-zinc-400">
          직관적이고 쉽고 빠르게 워크플로우를 관리해보세요!
        </p>

        {loading ? (
          <div className="mt-8 rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-3 text-sm text-zinc-300">
            세션 확인 중…
          </div>
        ) : user ? (
          <Link
            href="/dashboard"
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            대시보드로 이동
          </Link>
        ) : (
          <button
            type="button"
            disabled={!canLogin}
            onClick={async () => {
              if (!supabase || !supabaseEnabled) return;
              const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
              await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo },
              });
            }}
            className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-100 shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GoogleMark />
            구글로 계속하기
          </button>
        )}

        {!canLogin ? (
          <div className="mt-3 text-xs text-rose-400">
            Supabase 환경변수가 설정되지 않아 로그인할 수 없어요. <span className="font-mono">.env.local</span>을
            확인해 주세요.
          </div>
        ) : null}

        <div className="mt-5">
          <Link
            href="/dashboard?guest=1"
            className="text-sm font-semibold text-zinc-400 underline decoration-zinc-600 underline-offset-4 hover:text-zinc-200"
          >
            둘러보기
          </Link>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          둘러보기 모드에서는 데이터가 이 브라우저의 로컬 저장소에만 저장돼요. 브라우저 데이터 삭제/시크릿 모드에서는
          사라질 수 있어요. 나중에 구글로 로그인하면 로컬 데이터를 계정으로 옮겨서 동기화할 수 있습니다.
        </p>
      </div>
    </main>
  );
}

