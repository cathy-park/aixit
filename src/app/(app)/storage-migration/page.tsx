"use client";

import { useEffect } from "react";
import { AIXIT_STORAGE_SNAPSHOT_MESSAGE_TYPE, loadAixitLocalStorageSnapshot } from "@/lib/aixit-storage";

export default function StorageMigrationPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nonce = params.get("nonce") ?? "";

    const snapshot = loadAixitLocalStorageSnapshot();
    window.parent?.postMessage(
      {
        type: AIXIT_STORAGE_SNAPSHOT_MESSAGE_TYPE,
        nonce,
        snapshot,
      },
      "*",
    );
  }, []);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center text-sm text-zinc-600">
      <div>Storage migration helper</div>
      <div className="text-zinc-400">이 페이지는 자동으로만 사용됩니다.</div>
    </div>
  );
}

