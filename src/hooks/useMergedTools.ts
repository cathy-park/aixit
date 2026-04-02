"use client";

import { useCallback, useEffect, useState } from "react";
import { tools as seedTools, type Tool } from "@/lib/tools";
import { countToolUsageInStoredWorkflows } from "@/lib/workflows-store";
import { listMergedTools, TOOLS_CATALOG_UPDATED_EVENT } from "@/lib/user-tools-store";

function withWorkflowUsageCounts(list: Tool[]): Tool[] {
  return list.map((t) => ({ ...t, usageCount: countToolUsageInStoredWorkflows(t.id) }));
}

export function useMergedTools() {
  const [tools, setTools] = useState<Tool[]>(() => withWorkflowUsageCounts(seedTools));

  const refresh = useCallback(() => {
    setTools(withWorkflowUsageCounts(listMergedTools()));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onWorkflowsUpdated = () => refresh();
    const onToolsCatalogUpdated = () => refresh();
    window.addEventListener("aixit-workflows-updated", onWorkflowsUpdated);
    window.addEventListener(TOOLS_CATALOG_UPDATED_EVENT, onToolsCatalogUpdated);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "aixit.dashboardWorkflows.v1") refresh();
      if (
        e.key === "aixit.userTools.v1" ||
        e.key === "aixit.toolOverrides.v1" ||
        e.key === "aixit.deletedBuiltinToolIds.v1"
      ) {
        refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("aixit-workflows-updated", onWorkflowsUpdated);
      window.removeEventListener(TOOLS_CATALOG_UPDATED_EVENT, onToolsCatalogUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return { tools, refresh };
}
