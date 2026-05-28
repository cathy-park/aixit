"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeKakaoCode, saveKakaoToken } from "@/lib/kakao/kakaoClient";

function KakaoCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [msg, setMsg] = useState("카카오 로그인 처리 중…");

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
      setMsg("카카오 로그인이 취소되었어요.");
      setTimeout(() => router.replace("/settings"), 1500);
      return;
    }

    exchangeKakaoCode(code)
      .then((token) => {
        saveKakaoToken(token);
        setMsg("✅ 카카오 캘린더 연결 완료!");
        setTimeout(() => router.replace("/settings"), 1000);
      })
      .catch((e: Error) => {
        setMsg(`❌ 연결 실패: ${e.message}`);
        setTimeout(() => router.replace("/settings"), 2500);
      });
  }, [code, error, router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="rounded-2xl bg-white px-8 py-10 text-center shadow-sm ring-1 ring-zinc-200">
        <div className="text-4xl">🟡</div>
        <div className="mt-4 text-base font-semibold text-zinc-800">{msg}</div>
        <div className="mt-2 text-xs text-zinc-400">잠시 후 설정 페이지로 이동해요</div>
      </div>
    </div>
  );
}

export default function KakaoCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
          <div className="text-sm text-zinc-500">로딩 중…</div>
        </div>
      }
    >
      <KakaoCallbackInner />
    </Suspense>
  );
}
