import type { ReactNode } from "react";

export function AppShell({ topbar, sidebar, children }: { topbar: ReactNode; sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex min-h-dvh max-w-[1200px] flex-col px-4 py-5 sm:px-6">
        {topbar}
        <div className="mt-5 grid flex-1 gap-4 lg:grid-cols-[260px_1fr] lg:gap-6">
          <div>{sidebar}</div>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}

