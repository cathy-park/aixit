"use client";

import { cn } from "@/components/ui/cn";
import { renderMemoDocument, renderMemoMiniMarkup, toggleNthMarkdownCheckbox } from "@/lib/memo-mini-markup";

/** 카드·상세 등 블록 마크다운(줄바꿈, 리스트, `- [ ]`) */
export function MemoMarkupBody({
  text,
  className,
  interactiveCheckboxes,
  onTextChange,
}: {
  text: string;
  className?: string;
  interactiveCheckboxes?: boolean;
  onTextChange?: (next: string) => void;
}) {
  const doc = renderMemoDocument(text, {
    interactiveCheckboxes: Boolean(interactiveCheckboxes && onTextChange),
    onToggleCheckbox: (idx) => onTextChange?.(toggleNthMarkdownCheckbox(text, idx)),
  });
  return (
    <div className={cn("min-w-0 break-words text-inherit [&_strong]:text-inherit", className)}>
      {doc ?? (text ? <span className="whitespace-pre-wrap">{text}</span> : null)}
    </div>
  );
}

/** 한 줄·짧은 인라인 위주(기존 호환) */
export function MemoMiniMarkupText({
  text,
  className,
  interactiveCheckboxes,
  onTextChange,
}: {
  text: string;
  className?: string;
  interactiveCheckboxes?: boolean;
  onTextChange?: (next: string) => void;
}) {
  const doc = renderMemoDocument(text, {
    interactiveCheckboxes: Boolean(interactiveCheckboxes && onTextChange),
    onToggleCheckbox: (idx) => onTextChange?.(toggleNthMarkdownCheckbox(text, idx)),
  });
  if (doc) {
    return <div className={cn("min-w-0 whitespace-pre-wrap break-words text-inherit", className)}>{doc}</div>;
  }
  const node = renderMemoMiniMarkup(text);
  return <span className={cn("whitespace-pre-wrap break-words", className)}>{node ?? text}</span>;
}
