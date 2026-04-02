import { WorkflowTemplatePageClient } from "@/components/workflow/WorkflowTemplatePageClient";

export default async function WorkflowTemplatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <WorkflowTemplatePageClient slug={slug} />;
}
