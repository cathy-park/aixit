import type { ReactNode } from "react";
import { TitleCountChip } from "@/components/ui/TitleCountChip";

export function PageTitleWithCount({ title, count }: { title: ReactNode; count?: number | null }) {
  return (
    <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">
      <span className="min-w-0">{title}</span>
      {count != null ? <TitleCountChip count={count} /> : null}
    </h1>
  );
}
