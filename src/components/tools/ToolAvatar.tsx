import { cn } from "@/components/ui/cn";

export function ToolAvatar({
  text,
  size = "md",
  className,
}: {
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const label = (text ?? "?").slice(0, 3);

  return (
    <div
      className={cn(
        "grid place-items-center rounded-2xl bg-zinc-900 text-white ring-1 ring-zinc-200",
        dim,
        className,
      )}
      aria-hidden="true"
    >
      <span className={cn("text-xs font-extrabold tracking-tight", label.length <= 2 ? "text-[11px]" : "text-[10px]")}>
        {label}
      </span>
    </div>
  );
}

