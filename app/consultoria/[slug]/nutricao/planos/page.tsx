import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  listNutritionPlansForNutritionist,
  type NutritionPlanStatus,
} from "@/lib/consultancies/nutrition";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { NutritionPlanList } from "@/components/consultancies/nutrition-plan-list";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
    status?: string;
  }>;
}

export default async function NutritionPlansPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page, status: rawStatus } = await searchParams;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  // Permissão estrita: apenas NUTRITIONIST
  if (!context.roles.includes("NUTRITIONIST")) {
    redirect(`/consultoria/${slug}`);
  }

  const parsedPage = Number(page);
  const validPage = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  const validStatus: NutritionPlanStatus | "ALL" =
    rawStatus === "DRAFT" || rawStatus === "ACTIVE" || rawStatus === "ARCHIVED"
      ? rawStatus
      : "ALL";

  const plansResult = await listNutritionPlansForNutritionist({
    actorUserId: session.userId,
    consultancySlug: slug,
    statusFilter: validStatus,
    page: validPage,
    pageSize: 20,
  });

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Módulo de Nutrição</span>
            <span>•</span>
            <span className="text-emerald-600">Prescrição Nutricional</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Planos Alimentares</h1>
          <p className="text-sm text-slate-500">
            Gerencie prescrições alimentares, elabore cardápios e monte a estrutura de refeições para seus alunos.
          </p>
        </div>

        {/* Plan List Component */}
        <NutritionPlanList
          slug={slug}
          items={plansResult.items}
          total={plansResult.total}
          page={plansResult.page}
          pageSize={plansResult.pageSize}
          totalPages={plansResult.totalPages}
          currentStatus={validStatus}
        />
      </div>
    </ConsultancyAppShell>
  );
}
