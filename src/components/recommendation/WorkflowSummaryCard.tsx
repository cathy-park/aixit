import { cn } from "@/components/ui/cn";

export function WorkflowSummaryCard({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200", className)}>
      <div className="text-sm font-semibold text-zinc-500">선택한 작업</div>
      <div className="mt-2 text-xl font-semibold tracking-tight">{title}</div>
      <div className="mt-2 text-sm text-zinc-600">{description}</div>
    </div>
  );
}

