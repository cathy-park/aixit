"use client";

import { cn } from "@/components/ui/cn";
import { Wrench, Lightbulb, MessageSquare } from "lucide-react";
import { WarehouseType } from "@/lib/warehouse-move";

export function MoveCardModal({
  open,
  onClose,
  onMove,
  currentWarehouse,
}: {
  open: boolean;
  onClose: () => void;
  onMove: (target: WarehouseType) => void;
  currentWarehouse: WarehouseType;
}) {
  if (!open) return null;

  const options: { id: WarehouseType; label: string; icon: any; color: string }[] = [
    { id: "tools" as const, label: "도구 창고", icon: Wrench, color: "text-blue-600 bg-blue-50" },
    { id: "inspiration" as const, label: "영감 창고", icon: Lightbulb, color: "text-amber-600 bg-amber-50" },
    { id: "chatbots" as const, label: "챗봇 창고", icon: MessageSquare, color: "text-emerald-600 bg-emerald-50" },
  ].filter(opt => opt.id !== currentWarehouse);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-zinc-200">
        <h2 className="text-xl font-bold text-zinc-900 text-center">어디로 이동할까요?</h2>
        <p className="mt-2 text-sm text-zinc-500 text-center">카드를 다른 보관함으로 옮깁니다.</p>

        <div className="mt-8 space-y-3">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onMove(opt.id)}
              className="flex w-full items-center gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 transition hover:bg-zinc-100 hover:border-zinc-200"
            >
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", opt.color)}>
                <opt.icon className="h-6 w-6" />
              </div>
              <span className="text-base font-bold text-zinc-800">{opt.label}(으)로 이동</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-8 w-full rounded-2xl bg-zinc-100 py-4 text-sm font-bold text-zinc-600 hover:bg-zinc-200 transition"
        >
          취소
        </button>
      </div>
    </div>
  );
}
