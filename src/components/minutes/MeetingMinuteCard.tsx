"use client";

import { useRef, useState, useEffect, useCallback, MouseEvent } from "react";
import { MeetingMinute, MinutesFolder, updateMeetingMinute, deleteMeetingMinute } from "@/lib/minutes-store";
import { cn } from "@/components/ui/cn";
import { IconEdit, IconTrash } from "@/components/ui/action-icons";
import { APP_CARD_GRID_ITEM_CLASS, APP_CARD_TITLE_TRACK_CLASS, APP_CARD_TITLE_TEXT_CLASS } from "@/components/cards/app-card-layout";
import { PaperclipIcon, CalendarIcon, VideoIcon, MailIcon, FileTextIcon, LinkIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function MeetingMinuteCard({
  minute,
  folder,
  onDelete,
}: {
  minute: MeetingMinute;
  folder: MinutesFolder;
  onDelete: () => void;
}) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  // Resize Persistence
  // We can use minute.attachments or a custom metadata field if we want to support resizing.
  // For simplicity, we'll give it a standard height unless we want to persist it.
  const [currentHeight, setCurrentHeight] = useState<number | undefined>(undefined);
  const [isResizing, setIsResizing] = useState(false);

  const stopCardNav = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const onMouseMove = (e: globalThis.MouseEvent) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const newHeight = e.clientY - rect.top;
      if (newHeight >= 120) {
        setCurrentHeight(newHeight);
      }
    };

    const onMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing, currentHeight]);

  // bg-blue-50/50 for minutes
  const bgColor = "bg-blue-50/50";

  return (
    <div
      ref={cardRef}
      className={cn(
        APP_CARD_GRID_ITEM_CLASS,
        isResizing && "transition-none scale-100"
      )}
      style={{
        height: currentHeight ? `${currentHeight}px` : undefined,
        minHeight: "160px"
      }}
    >
      <div className={cn(
        "relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-sm shadow-lg",
        bgColor,
        "before:absolute before:inset-x-0 before:top-0 before:h-2 before:bg-black/5",
        "after:absolute after:bottom-0 after:right-0 after:h-4 after:w-4 after:bg-gradient-to-tl after:from-black/10 after:to-transparent",
        "border border-zinc-200/50 hover:border-blue-200 transition-colors"
      )}>
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden p-6 pb-2">
          {/* Header & Icons */}
          <div className="relative shrink-0">
            <div className="min-w-0 pr-10">
              <div className={cn(APP_CARD_TITLE_TRACK_CLASS)}>
                <Link
                  href={`/minutes/${folder.id}/${minute.id}`}
                  className="min-w-0 flex-1 overflow-hidden text-left outline-none flex items-start gap-2"
                >
                  {minute.iconType === "meet" && <VideoIcon className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />}
                  {minute.iconType === "email" && <MailIcon className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />}
                  {(!minute.iconType || minute.iconType === "default") && <FileTextIcon className="w-5 h-5 shrink-0 text-zinc-400 mt-0.5" />}
                  <span className={cn(APP_CARD_TITLE_TEXT_CLASS, "text-zinc-900 leading-tight")}>
                    {minute.title.trim() || "제목 없음"}
                  </span>
                </Link>
              </div>
            </div>

            {/* Absolute Icons */}
            <div className="absolute top-0 right-0 flex flex-col items-end gap-2 z-40">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  title="삭제"
                  onClick={(e) => {
                    stopCardNav(e);
                    onDelete();
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div 
            className="flex-1 overflow-y-auto custom-scrollbar mt-3 pr-1 pb-4"
          >
            <Link
              href={`/minutes/${folder.id}/${minute.id}`}
              className="block min-w-0 cursor-pointer text-left outline-none"
              aria-label="회의록 상세 열기"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{minute.date}</span>
                </div>
                {minute.attachments && minute.attachments.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-100/50 w-max px-2 py-1 rounded-md">
                    <PaperclipIcon className="w-4 h-4" />
                    <span className="font-medium">첨부 {minute.attachments.length}개</span>
                  </div>
                )}
                {minute.links && minute.links.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-100/50 w-max px-2 py-1 rounded-md">
                    <LinkIcon className="w-4 h-4" />
                    <span className="font-medium">링크 {minute.links.length}개</span>
                  </div>
                )}
              </div>
            </Link>
          </div>

          <div className="mt-auto pt-4 flex items-center justify-between text-[10px] font-bold text-zinc-500/60 uppercase tracking-wider relative z-30 shrink-0 border-t border-black/5">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="shrink-0 rounded-md border border-black/10 bg-black/5 px-1.5 py-0.5 text-[9px] font-bold text-zinc-600">
                {folder.name}
              </span>
            </div>
            <span className="shrink-0 opacity-60 ml-2">{new Date(minute.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Resize Handle */}
        <div 
          onMouseDown={startResizing}
          className={cn(
            "absolute bottom-0 inset-x-0 h-1.5 cursor-ns-resize z-[100] transition-colors",
            isResizing ? "bg-black/20" : "hover:bg-black/10"
          )}
          title="높이 조절"
        />
      </div>
    </div>
  );
}
