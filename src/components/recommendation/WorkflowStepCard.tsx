import { cn } from "@/components/ui/cn";

export function WorkflowStepCard({
  index,
  title,
  tools,
  className,
}: {
  index: number;
  title: string;
  tools: string[];
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-zinc-500">STEP {index}</div>
          <div className="mt-1 text-base font-semibold tracking-tight text-zinc-950">{title}</div>
        </div>
        <div className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">추천</div>
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold text-zinc-500">추천 도구</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {tools.map((t) => (
            <span key={t} className="rounded-full bg-zinc-50 px-3 py-1 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

