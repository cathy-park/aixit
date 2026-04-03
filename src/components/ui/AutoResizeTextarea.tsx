"use client";

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> & {
  /** 최소 높이(px). 내용이 적어도 이 높이는 유지합니다. */
  minHeightPx?: number;
};

/**
 * 값에 따라 세로 높이가 늘어나는 textarea (스크롤 최소화).
 */
export function AutoResizeTextarea({ className, minHeightPx = 72, value, onChange, ...props }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    el.style.height = "auto";
    el.style.height = `${Math.max(minHeightPx, el.scrollHeight)}px`;
    el.scrollTop = scrollTop;
  }, [value, minHeightPx]);

  return (
    <textarea
      ref={ref}
      rows={1}
      className={cn(className)}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
}
