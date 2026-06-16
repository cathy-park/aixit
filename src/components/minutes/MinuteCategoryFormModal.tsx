"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";

export const CATEGORY_COLORS = [
  { value: "bg-zinc-100 text-zinc-600 border-zinc-200", label: "기본 회색" },
  { value: "bg-red-50 text-red-600 border-red-200", label: "빨강" },
  { value: "bg-orange-50 text-orange-600 border-orange-200", label: "주황" },
  { value: "bg-amber-50 text-amber-600 border-amber-200", label: "노랑" },
  { value: "bg-emerald-50 text-emerald-600 border-emerald-200", label: "초록" },
  { value: "bg-blue-50 text-blue-600 border-blue-200", label: "파랑" },
  { value: "bg-indigo-50 text-indigo-600 border-indigo-200", label: "남색" },
  { value: "bg-purple-50 text-purple-600 border-purple-200", label: "보라" },
  { value: "bg-pink-50 text-pink-600 border-pink-200", label: "분홍" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
  initial?: { name: string; color?: string };
}

export function MinuteCategoryFormModal({ open, onClose, onSave, initial }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLORS[0].value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(initial?.name || "");
      setColor(initial?.color || CATEGORY_COLORS[0].value);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, initial]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 pb-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            {initial ? "카테고리 수정" : "카테고리 추가"}
          </h2>
        </div>

        <div className="p-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-zinc-800">이름</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 주간회의"
              className="w-full text-sm text-zinc-900 border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  e.preventDefault();
                  onSave(name.trim(), color);
                }
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-zinc-800">색상</label>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "h-8 rounded-md flex items-center justify-center transition-all border",
                    c.value,
                    color === c.value ? "ring-2 ring-offset-2 ring-blue-500" : ""
                  )}
                  title={c.label}
                >
                  <span className="text-xs font-semibold">Aa</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-50 flex items-center justify-end gap-2 border-t border-zinc-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
          >
            취소
          </button>
          <button
            onClick={() => {
              if (name.trim()) {
                onSave(name.trim(), color);
              }
            }}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
