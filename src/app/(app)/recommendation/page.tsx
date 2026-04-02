import { getRecommendation } from "@/lib/recommendations";
import { RecommendationBuilder } from "@/components/recommendation/RecommendationBuilder";

export default async function RecommendationPage({
  searchParams,
}: {
  searchParams: Promise<{ taskType?: string }>;
}) {
  const { taskType } = await searchParams;
  const task = (taskType ?? "").trim();
  const preset = getRecommendation(task);

  return <RecommendationBuilder taskType={task} preset={preset} />;
}
