import { getRecommendation } from "@/lib/recommendations";
import { RecommendationBuilder } from "@/components/recommendation/RecommendationBuilder";

export default async function RecommendationPage({
  searchParams,
}: {
  searchParams: Promise<{ taskType?: string; intent?: string }>;
}) {
  const { taskType, intent } = await searchParams;
  const task = (taskType ?? "").trim();
  const preset = getRecommendation(task);
  const mode = intent === "template" ? "template" : "project";

  return <RecommendationBuilder taskType={task} preset={preset} intent={mode} />;
}
