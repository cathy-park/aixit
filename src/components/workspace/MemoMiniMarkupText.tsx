"use client";

import { cn } from "@/components/ui/cn";
import { renderMemoMiniMarkup } from "@/lib/memo-mini-markup";

export function MemoMiniMarkupText({ text, className }: { text: string; className?: string }) {
  const node = renderMemoMiniMarkup(text);
  return <span className={cn("whitespace-pre-wrap break-words", className)}>{node ?? text}</span>;
}
