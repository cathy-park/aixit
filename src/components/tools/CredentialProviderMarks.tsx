"use client";

import type { ComponentType } from "react";
import { cn } from "@/components/ui/cn";
import type { CredentialProviderId } from "@/lib/tools";

export const CREDENTIAL_PROVIDER_LIST: { id: CredentialProviderId; label: string }[] = [
  { id: "email", label: "이메일·아이디" },
  { id: "google", label: "Google" },
  { id: "kakao", label: "카카오" },
  { id: "naver", label: "네이버" },
  { id: "apple", label: "Apple" },
  { id: "facebook", label: "Facebook" },
  { id: "github", label: "GitHub" },
  { id: "ddokdi", label: "똑디" },
  { id: "x", label: "X" },
];

/** 이메일 SVG 아이콘 (기존 봉투 스타일) */
function EmailEnvelopeMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

/** 공식 컬러 G 마크 — `public/brands/google-g.png` */
function GoogleMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 고정 브랜드 에셋, 외부 최적화 불필요
    <img
      src="/brands/google-g.png"
      alt=""
      draggable={false}
      className={cn(className, "object-contain")}
    />
  );
}

function KakaoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#FEE500" />
      <path
        fill="#191919"
        d="M12 6.5c-3.2 0-5.8 2-5.8 4.45 0 1.58 1.02 2.97 2.55 3.75l-.55 2.05 2.37-1.45c.45.08.92.12 1.41.12 3.2 0 5.8-2 5.8-4.47S15.2 6.5 12 6.5z"
      />
    </svg>
  );
}

function NaverMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="5" fill="#03C75A" />
      <path fill="#fff" d="M14.2 7.5h3.3v9h-3.05L10.5 11.8V16.5H7.5v-9h3.05l3.65 4.7V7.5z" />
    </svg>
  );
}

/** Apple ID / 애플 로그인 마크 — `public/brands/apple-id-mark.png` */
function AppleMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 고정 브랜드 에셋
    <img
      src="/brands/apple-id-mark.png"
      alt=""
      draggable={false}
      className={cn(className, "object-cover")}
      aria-hidden
    />
  );
}

/** Facebook 로고 — `public/brands/facebook-mark.png` */
function FacebookMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 고정 브랜드 에셋
    <img
      src="/brands/facebook-mark.png"
      alt=""
      draggable={false}
      className={cn(className, "object-cover")}
      aria-hidden
    />
  );
}

/** GitHub 마크 — `public/brands/github-mark.png` */
function GitHubMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 고정 브랜드 에셋
    <img
      src="/brands/github-mark.png"
      alt=""
      draggable={false}
      className={cn(className, "object-cover")}
      aria-hidden
    />
  );
}

/** 똑디 로고 — `public/brands/ddokdi-mark.png` */
function DdokdiMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 고정 브랜드 에셋
    <img
      src="/brands/ddokdi-mark.png"
      alt=""
      draggable={false}
      className={cn(className, "object-cover")}
      aria-hidden
    />
  );
}

function XMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const MARKS: Record<CredentialProviderId, ComponentType<{ className?: string }>> = {
  email: EmailEnvelopeMark,
  google: GoogleMark,
  kakao: KakaoMark,
  naver: NaverMark,
  apple: AppleMark,
  facebook: FacebookMark,
  github: GitHubMark,
  ddokdi: DdokdiMark,
  x: XMark,
};

export function CredentialProviderMark({
  id,
  className,
  size = "md",
}: {
  id: CredentialProviderId;
  className?: string;
  /** xs: 메인 로고 우하단 배지용 작은 원 */
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const Mark = MARKS[id];
  const dim =
    size === "xs"
      ? "h-[22px] w-[22px]"
      : size === "sm"
        ? "h-8 w-8"
        : size === "lg"
          ? "h-12 w-12"
          : "h-10 w-10";
  if (id === "email") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-white text-[#9da2b0] ring-2 ring-white shadow-md",
          dim,
          className,
        )}
        aria-hidden
      >
        <Mark
          className={
            size === "xs"
              ? "h-3 w-3"
              : size === "sm"
                ? "h-4 w-4"
                : size === "lg"
                  ? "h-6 w-6"
                  : "h-5 w-5"
          }
        />
      </span>
    );
  }
  if (id === "apple") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center overflow-hidden bg-black shadow-md",
          size === "xs" ? "rounded-full ring-2 ring-white" : "rounded-xl ring-1 ring-zinc-200",
          dim,
          className,
        )}
        aria-hidden
      >
        <Mark className="h-full w-full" />
      </span>
    );
  }
  if (id === "x") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center bg-zinc-900 text-white shadow-md",
          size === "xs" ? "rounded-full ring-2 ring-white" : "rounded-xl ring-1 ring-zinc-200",
          dim,
          className,
        )}
        aria-hidden
      >
        <Mark
          className={
            size === "xs" ? "h-3 w-3" : size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-5 w-5"
          }
        />
      </span>
    );
  }
  if (id === "facebook") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center overflow-hidden shadow-md",
          size === "xs" ? "rounded-full ring-2 ring-white" : "rounded-xl ring-1 ring-zinc-200",
          dim,
          className,
        )}
        aria-hidden
      >
        <Mark className="h-full w-full" />
      </span>
    );
  }
  if (id === "github") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center overflow-hidden bg-black shadow-md",
          size === "xs" ? "rounded-full ring-2 ring-white" : "rounded-xl ring-1 ring-zinc-200",
          dim,
          className,
        )}
        aria-hidden
      >
        <Mark className="h-full w-full" />
      </span>
    );
  }
  if (size === "xs") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-md",
          id === "google" && "bg-white",
          dim,
          className,
        )}
        aria-hidden
      >
        <Mark
          className={cn("h-full w-full rounded-full", id === "google" ? "object-contain p-px" : "object-cover")}
        />
      </span>
    );
  }
  return <Mark className={cn(dim, "rounded-xl ring-1 ring-zinc-200/80", className)} />;
}
