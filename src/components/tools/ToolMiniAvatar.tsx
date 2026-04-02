"use client";

import { cn } from "@/components/ui/cn";
import type { Tool } from "@/lib/tools";

function OpenAiMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.096 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.055 6.055 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.744-7.097zm-9.022 12.303a4.475 4.475 0 0 1-2.876-1.04l.141-.08 4.779-2.758a.785.785 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM4.935 17.392a4.482 4.482 0 0 1-.535-3.014l.142.085 4.783 2.759a.77.77 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.196-1.658l-.609-1.003-.001-.001zm-1.59-10.831a4.469 4.469 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.675l5.815 3.354-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.5 6.561l-.155-1zm15.89-.645-5.833-3.387L15.63 1.36a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.104v-5.678a.79.79 0 0 0-.407-.667zm2.01 3.022-.141-.085-4.774-2.782a.776.776 0 0 0-.785-.001L8.06 8.92V6.588a.066.066 0 0 1 .029-.061l4.81-2.768a4.5 4.5 0 0 1 6.68 4.66zm-16.34 3.455 2.022-1.159v2.322a.07.07 0 0 1-.028.062L7.07 15.7a4.505 4.505 0 0 1-1.305-8.454l5.833-3.371-.002 2.332a.79.79 0 0 0 .388.67l5.815 3.354-2.02 1.168a.076.076 0 0 1-.072 0l-4.828-2.785z" />
    </svg>
  );
}

/** 워크플로우 카드 등 — 도구 카드와 동일한 로고(이미지·ChatGPT 마크·텍스트) */
export function ToolMiniAvatar({
  tool,
  size = "md",
  className,
}: {
  tool: Tool | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  const dim = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const textCls = size === "sm" ? "text-[9px]" : "text-[10px]";
  const box = cn(
    "grid shrink-0 place-items-center overflow-hidden rounded-full font-extrabold tracking-tight text-white ring-2 ring-white",
    dim,
    className,
  );

  if (!tool) {
    return (
      <div className={cn(box, "bg-zinc-400")} aria-hidden title="등록되지 않은 도구 ID">
        <span className={textCls}>?</span>
      </div>
    );
  }

  const url = tool.logoImageUrl?.trim();
  const hex = tool.avatarBackgroundColor?.trim();

  if (url) {
    return (
      <div
        className={cn(box, "ring-zinc-200")}
        style={{ backgroundColor: hex && /^#/.test(hex) ? hex : "#f4f4f5" }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  if (tool.id === "tool_chatgpt") {
    const gptBg = hex && /^#/.test(hex) ? hex : "#059669";
    return (
      <div className={cn(box, "text-white ring-white")} style={{ backgroundColor: gptBg }} aria-hidden>
        <OpenAiMark className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
      </div>
    );
  }

  const label = (tool.logoText ?? tool.name ?? "?").slice(0, 3);
  return (
    <div
      className={cn(box, !hex && "bg-zinc-900", tool.cardAvatarClassName)}
      style={hex && /^#/.test(hex) ? { backgroundColor: hex } : undefined}
      aria-hidden
    >
      <span className={cn("font-extrabold tracking-tight", label.length <= 2 ? "text-[11px]" : textCls)}>{label}</span>
    </div>
  );
}
