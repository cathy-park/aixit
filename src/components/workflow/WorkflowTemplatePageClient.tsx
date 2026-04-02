"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { getWorkflowDetail, workflows } from "@/lib/aixit-data";
import { isDashboardProjectInstanceId } from "@/lib/workflows-store";
import {
  getUserWorkflowTemplateBySlug,
  userWorkflowTemplateToDetail,
  userWorkflowTemplateToPreview,
  USER_WORKFLOW_TEMPLATES_EVENT,
} from "@/lib/user-workflow-templates-store";
import { TemplateWorkspaceReadonly } from "@/components/workflow/TemplateWorkspaceReadonly";

export function WorkflowTemplatePageClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [userTick, setUserTick] = useState(0);

  useEffect(() => {
    const on = () => setUserTick((n) => n + 1);
    window.addEventListener(USER_WORKFLOW_TEMPLATES_EVENT, on);
    return () => window.removeEventListener(USER_WORKFLOW_TEMPLATES_EVENT, on);
  }, []);

  useEffect(() => {
    if (isDashboardProjectInstanceId(slug)) {
      router.replace(`/workspace?id=${encodeURIComponent(slug)}`);
    }
  }, [slug, router]);

  const resolved = useMemo(() => {
    void userTick;
    if (isDashboardProjectInstanceId(slug)) return null;
    const builtinDetail = getWorkflowDetail(slug);
    if (builtinDetail) {
      const preview = workflows.find((w) => w.id === builtinDetail.id);
      if (preview) return { kind: "builtin" as const, detail: builtinDetail, preview };
    }
    const userRec = getUserWorkflowTemplateBySlug(slug);
    if (userRec) {
      return {
        kind: "user" as const,
        detail: userWorkflowTemplateToDetail(userRec),
        preview: userWorkflowTemplateToPreview(userRec),
      };
    }
    return null;
  }, [slug, userTick]);

  if (isDashboardProjectInstanceId(slug)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-600">
        프로젝트 편집 화면으로 이동 중…
      </div>
    );
  }

  if (!resolved) notFound();

  return <TemplateWorkspaceReadonly detail={resolved.detail} preview={resolved.preview} />;
}
