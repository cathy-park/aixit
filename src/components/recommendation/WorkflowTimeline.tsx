import { cn } from "@/components/ui/cn";

export type TimelineStatus = "completed" | "in_progress" | "next" | "waiting";

export function WorkflowTimeline({
  count,
  selectedIndex,
  currentIndex,
  onSelect,
  className,
}: {
  count: number;
  selectedIndex: number;
  currentIndex: number; // -1 means "none"
  onSelect: (idx: number) => void;
  className?: string;
}) {
  const statusFor = (idx: number): TimelineStatus => {
    if (currentIndex < 0) return idx === 0 ? "next" : "waiting";
    if (idx < currentIndex) return "completed";
    if (idx === currentIndex) return "in_progress";
    if (idx === currentIndex + 1) return "next";
    return "waiting";
  };

  const stylesFor = (status: TimelineStatus) => {
    switch (status) {
      case "completed":
        return {
          dot: "bg-emerald-500 ring-emerald-200",
          line: "bg-emerald-200",
          text: "text-emerald-700",
        };
      case "in_progress":
        return {
          dot: "bg-zinc-900 ring-zinc-200",
          line: "bg-zinc-200",
          text: "text-zinc-900",
        };
      case "next":
        return {
          dot: "bg-white ring-zinc-300",
          line: "bg-zinc-200",
          text: "text-zinc-700",
        };
      case "waiting":
      default:
        return {
          dot: "bg-white ring-zinc-200",
          line: "bg-zinc-100",
          text: "text-zinc-500",
        };
    }
  };

  if (count <= 0) return null;

  return (
    <div className={cn("rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200", className)}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">진행 상태</div>
        <div className="text-xs font-semibold text-zinc-500">STEP 1 → STEP {count}</div>
      </div>

      <div className="mt-4 overflow-x-auto pb-1">
        <div className="flex min-w-max items-center gap-3">
          {Array.from({ length: count }).map((_, i) => {
            const status = statusFor(i);
            const styles = stylesFor(status);
            const selected = i === selectedIndex;

            return (
              <div key={i} className="flex items-center">
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl px-2 py-2 transition",
                    "hover:bg-zinc-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-100",
                  )}
                  aria-label={`STEP ${i + 1} 선택`}
                >
                  <span
                    className={cn(
                      "relative grid h-9 w-9 place-items-center rounded-full ring-2 ring-inset transition",
                      styles.dot,
                      selected && "ring-4 ring-zinc-200",
                    )}
                  >
                    <span className={cn("text-xs font-extrabold", status === "completed" ? "text-white" : "text-zinc-900")}>
                      {i + 1}
                    </span>
                    {status === "completed" ? (
                      <span className="pointer-events-none absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-white ring-1 ring-emerald-200">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                    ) : null}
                  </span>

                  <div className="text-left">
                    <div className={cn("text-[11px] font-semibold", styles.text)}>STEP {i + 1}</div>
                    <div className={cn("text-[11px] font-semibold", selected ? "text-zinc-900" : "text-zinc-500")}>
                      {status === "completed"
                        ? "완료"
                        : status === "in_progress"
                          ? "진행중"
                          : status === "next"
                            ? "다음"
                            : "대기"}
                    </div>
                  </div>
                </button>

                {i < count - 1 ? (
                  <div className="mx-1 h-[2px] w-10 rounded-full bg-zinc-100 sm:w-14" aria-hidden="true" />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

