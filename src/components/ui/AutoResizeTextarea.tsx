"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type SyntheticEvent,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/components/ui/cn";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> & {
  /** 최소 높이(px). 내용이 적어도 이 높이는 유지합니다. */
  minHeightPx?: number;
  /** 최대 높이(px). 넘으면 내부 스크롤로 두어 autosize 시 스크롤 튐을 줄입니다. */
  maxHeightPx?: number;
};

/**
 * 값에 따라 세로 높이가 늘어나는 textarea.
 * controlled 업데이트 시 scrollTop·커서(selection)를 복원합니다.
 */
export function AutoResizeTextarea({
  className,
  minHeightPx = 72,
  maxHeightPx,
  value,
  onChange,
  onSelect,
  ...props
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const selRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const captureCaret = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    selRef.current = { start: el.selectionStart, end: el.selectionEnd };
  }, []);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      captureCaret();
      onChange?.(e);
    },
    [captureCaret, onChange],
  );

  const handleSelect = useCallback(
    (e: SyntheticEvent<HTMLTextAreaElement>) => {
      captureCaret();
      onSelect?.(e as ChangeEvent<HTMLTextAreaElement>);
    },
    [captureCaret, onSelect],
  );

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const { start, end } = selRef.current;
    const str = typeof value === "string" ? value : "";
    const safeStart = Math.min(start, str.length);
    const safeEnd = Math.min(end, str.length);

    el.style.height = "auto";
    const natural = el.scrollHeight;
    const cap =
      maxHeightPx !== undefined ? Math.max(minHeightPx, Math.min(natural, maxHeightPx)) : Math.max(minHeightPx, natural);
    el.style.height = `${cap}px`;
    el.style.overflowY = maxHeightPx !== undefined && natural > maxHeightPx ? "auto" : "hidden";

    el.scrollTop = scrollTop;
    try {
      el.setSelectionRange(safeStart, safeEnd);
    } catch {
      /* readonly 등 */
    }

    requestAnimationFrame(() => {
      const t = ref.current;
      if (!t) return;
      t.scrollTop = scrollTop;
      try {
        t.setSelectionRange(safeStart, safeEnd);
      } catch {
        /* ignore */
      }
    });
  }, [value, minHeightPx, maxHeightPx]);

  return (
    <textarea
      ref={ref}
      rows={1}
      className={cn(className)}
      value={value}
      onChange={handleChange}
      onSelect={handleSelect}
      {...props}
    />
  );
}
