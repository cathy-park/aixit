"use client";

export const KAKAO_REST_API_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY && process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY.length > 5 ? process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY : "efdf71a5bb1be6ae9d52c876f9fbaa16";

// 만약 Vercel 환경변수에 과거 키(87a3f2...)가 남아있을 경우 새 키로 강제 덮어쓰기
const FINAL_KAKAO_KEY = KAKAO_REST_API_KEY === "87a3f2a0ad48aaa7dfbfa6f9fac4a526" ? "efdf71a5bb1be6ae9d52c876f9fbaa16" : KAKAO_REST_API_KEY;

const TOKEN_KEY = "aixit.kakaoToken.v1";

export type KakaoToken = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_token_expires_in: number;
  saved_at: number;
};

export function getKakaoToken(): KakaoToken | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as KakaoToken;
  } catch {
    return null;
  }
}

export function saveKakaoToken(token: Omit<KakaoToken, "saved_at">) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, JSON.stringify({ ...token, saved_at: Date.now() }));
  window.dispatchEvent(new CustomEvent("aixit-kakao-token-updated"));
}

export function clearKakaoToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new CustomEvent("aixit-kakao-token-updated"));
}

export function isKakaoConnected(): boolean {
  // 토큰이 존재하기만 하면 (사용자가 직접 해제하기 전까지는) 영구적으로 연결된 것으로 간주합니다.
  return getKakaoToken() !== null;
}

export function getKakaoRedirectUri(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/kakao/callback`;
  }
  return "https://aixit.vercel.app/auth/kakao/callback";
}

export function getKakaoAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: FINAL_KAKAO_KEY,
    redirect_uri: getKakaoRedirectUri(),
    response_type: "code",
    scope: "talk_calendar",
  });
  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeKakaoCode(code: string): Promise<KakaoToken> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: FINAL_KAKAO_KEY,
    redirect_uri: getKakaoRedirectUri(),
    code,
  });

  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: params.toString(),
  });

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error_description ?? json.error ?? "토큰 교환 실패");
  }
  return json as KakaoToken;
}

export async function refreshKakaoToken(): Promise<KakaoToken | null> {
  const token = getKakaoToken();
  if (!token?.refresh_token) return null;

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: FINAL_KAKAO_KEY,
    refresh_token: token.refresh_token,
  });

  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: params.toString(),
  });

  const json = await res.json();
  if (!res.ok || json.error) return null;

  const refreshed: KakaoToken = {
    ...token,
    access_token: json.access_token,
    expires_in: json.expires_in,
    ...(json.refresh_token ? { refresh_token: json.refresh_token } : {}),
    saved_at: Date.now(),
  };
  saveKakaoToken(refreshed);
  return refreshed;
}

/** 유효한 access_token 반환 (만료 시 자동 갱신) */
export async function getValidAccessToken(): Promise<string | null> {
  const token = getKakaoToken();
  if (!token) return null;

  // access_token 만료 여부 확인 (여유 시간 1분)
  const expiresAt = token.saved_at + token.expires_in * 1000;
  if (Date.now() < expiresAt - 60000) {
    return token.access_token;
  }

  const refreshed = await refreshKakaoToken();
  return refreshed?.access_token ?? null;
}
