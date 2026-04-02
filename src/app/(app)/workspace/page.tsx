import { Suspense } from "react";
import { WorkspaceView } from "@/components/workspace/WorkspaceView";

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-600">불러오는 중…</div>
      }
    >
      <WorkspaceView />
    </Suspense>
  );
}
