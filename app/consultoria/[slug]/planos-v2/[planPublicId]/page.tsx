import { notFound, redirect } from "next/navigation";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import { getPlanVersionTreeByPlanPublicId } from "@/lib/nutrition-v2/plan-repository";
import { NutritionPlanBuilder } from "@/components/consultancies/nutrition-v2/nutrition-plan-builder";

interface PlanBuilderPageProps {
  params: Promise<{ slug: string; planPublicId: string }>;
  searchParams: Promise<{ v?: string }>;
}

export default async function PlanBuilderPage({ params, searchParams }: PlanBuilderPageProps) {
  const { slug, planPublicId } = await params;
  const { v: versionPublicId } = await searchParams;

  const ctx = await resolveNutritionAccessContext(slug);
  if (!ctx) {
    redirect(`/login?returnUrl=/consultoria/${slug}/planos-v2/${planPublicId}`);
  }

  if (!ctx.canAuthorNutrition) {
    notFound();
  }

  const tree = await getPlanVersionTreeByPlanPublicId(ctx, planPublicId, versionPublicId);
  if (!tree) {
    notFound();
  }

  return <NutritionPlanBuilder slug={slug} initialTree={tree} />;
}
