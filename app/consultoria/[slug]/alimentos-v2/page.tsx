import React from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import { listUnifiedFoodsForNutritionist } from "@/lib/nutrition-v2/food-repository";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { NutritionistFoodLibrary } from "@/components/consultancies/nutrition-v2/nutritionist-food-library";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AlimentosV2Page({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?returnUrl=/consultoria/${slug}/alimentos-v2`);
  }

  const ctx = await resolveNutritionAccessContext(slug);
  if (!ctx || !ctx.canAuthorNutrition) {
    // Only Nutritionists have access to this professional library
    notFound();
  }

  const query = typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : undefined;
  const scope =
    resolvedSearchParams.scope === "GLOBAL" || resolvedSearchParams.scope === "CONSULTANCY"
      ? resolvedSearchParams.scope
      : "ALL";
  const status =
    resolvedSearchParams.status === "ARCHIVED" || resolvedSearchParams.status === "ALL"
      ? resolvedSearchParams.status
      : "ACTIVE";
  const page = typeof resolvedSearchParams.page === "string" ? Number(resolvedSearchParams.page) : 1;

  const initialResult = await listUnifiedFoodsForNutritionist(ctx, {
    query,
    scope,
    status,
    page,
    pageSize: 20,
  });

  return (
    <ConsultancyAppShell
      consultancyName={ctx.consultancySlug!}
      consultancySlug={ctx.consultancySlug!}
      roles={ctx.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <NutritionistFoodLibrary slug={slug} initialResult={initialResult} />
    </ConsultancyAppShell>
  );
}
