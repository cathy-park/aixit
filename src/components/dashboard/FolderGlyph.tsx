import { cn } from "@/components/ui/cn";
import type { DashboardFolderRecord } from "@/lib/dashboard-folders-store";
import { resolveFolderLucideIcon } from "@/lib/folder-lucide-icons";

export function FolderGlyph({
  folder,
  size = "md",
  className,
  /** 있으면 이모지/루시드 타일 배경으로 사용 (프로젝트 폴더 색상) */
  accentColor,
}: {
  folder: Pick<DashboardFolderRecord, "emoji" | "iconType" | "imageDataUrl" | "lucideIcon">;
  size?: "sm" | "md" | "lg";
  className?: string;
  accentColor?: string;
}) {
  const dim = size === "sm" ? "h-5 w-5 text-base" : size === "lg" ? "h-10 w-10 text-2xl" : "h-8 w-8 text-lg";
  const iconInner = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-6 w-6" : "h-4 w-4";

  const useAccent = Boolean(accentColor && /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(accentColor));
  const bgStyle = useAccent ? { backgroundColor: accentColor! } : undefined;

  const showImage =
    (folder.iconType === "image_url" || folder.iconType === "image_upload") && folder.imageDataUrl;

  if (showImage) {
    return (
      <img
        src={folder.imageDataUrl!}
        alt=""
        className={cn(
          "shrink-0 rounded-xl object-cover ring-1 ring-zinc-200",
          size === "sm" ? "h-5 w-5" : size === "lg" ? "h-10 w-10" : "h-8 w-8",
          className,
        )}
      />
    );
  }

  if (folder.iconType === "lucide") {
    const Icon = resolveFolderLucideIcon(folder.lucideIcon);
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-xl ring-1 ring-zinc-200/80",
          dim,
          !useAccent && "bg-zinc-50",
          className,
        )}
        style={bgStyle}
      >
        <Icon className={cn(iconInner, useAccent ? "text-white" : "text-zinc-800")} strokeWidth={2} aria-hidden />
      </span>
    );
  }

  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-xl ring-1 ring-zinc-200/80", dim, !useAccent && "bg-zinc-50", className)}
      style={bgStyle}
    >
      <span className={cn("leading-none", useAccent ? "text-white" : undefined)}>{folder.emoji || "📁"}</span>
    </span>
  );
}
