import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { JittoToolBeltPose } from "@/components/jitto/JittoPoses";

export function JittoHelperPanel({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <aside className={cn("rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200", className)}>
      <JittoToolBeltPose message={message} />
      <div className="mt-4 space-y-2">
        <div className="text-sm font-semibold tracking-tight">지또의 한마디</div>
        <div className="text-sm text-zinc-600">{message}</div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/"
          className="rounded-full bg-zinc-50 px-3 py-1.5 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 hover:bg-white"
        >
          작업 다시 고르기
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          대시보드로
        </Link>
      </div>
    </aside>
  );
}

