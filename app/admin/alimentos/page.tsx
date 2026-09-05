import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import { listGlobalFoodsForAdmin } from "@/lib/nutrition-v2/food-repository";
import { GlobalFoodManager } from "@/components/admin/nutrition-v2/global-food-manager";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminAlimentosPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login?returnUrl=/admin/alimentos");
  }

  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);
  if (!isPlatformAdmin) {
    redirect("/selecionar-consultoria");
  }

  const ctx = await resolveNutritionAccessContext();
  if (!ctx || !ctx.canManageGlobal) {
    redirect("/selecionar-consultoria");
  }

  const query = typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : undefined;
  const status =
    resolvedSearchParams.status === "ACTIVE" || resolvedSearchParams.status === "ARCHIVED"
      ? resolvedSearchParams.status
      : "ALL";
  const page = typeof resolvedSearchParams.page === "string" ? Number(resolvedSearchParams.page) : 1;

  const initialResult = await listGlobalFoodsForAdmin(ctx, {
    query,
    status,
    page,
    pageSize: 20,
  });

  return <GlobalFoodManager initialResult={initialResult} />;
}
