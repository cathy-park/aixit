"use client";

import { useEffect, useState } from "react";
import { supabase, supabaseEnabled } from "@/lib/supabase/supabaseClient";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("로그인 처리 중…");

  useEffect(() => {
    if (!supabaseEnabled || !supabase) {
      setMessage("Supabase가 비활성화되어 있어 로그인 콜백을 처리할 수 없어요.");
      return;
    }
    const client = supabase;

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const next = url.searchParams.get("next") ?? "/";

    async function run() {
      try {
        if (code) {
          const { error } = await client.auth.exchangeCodeForSession(code);
          if (error) {
            setMessage("로그인 세션 교환에 실패했어요. 다시 시도해 주세요.");
            return;
          }
        }
        window.location.replace(next);
      } catch {
        setMessage("로그인 처리 중 오류가 발생했어요.");
      }
    }

    void run();
  }, []);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-8 pb-8 pt-[80px] text-center text-sm text-zinc-600">
      <div className="font-semibold text-zinc-900">Auth Callback</div>
      <div className="text-zinc-500">{message}</div>
    </div>
  );
}

