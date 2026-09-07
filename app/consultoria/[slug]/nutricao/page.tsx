import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { getStudentAuthoritativeNutrition } from "@/lib/nutrition-v2/assignment-repository";
import { StudentModuleAccessPanel } from "@/components/consultancies/student-module-access-panel";
import { StudentNutritionV2 } from "@/components/consultancies/nutrition-v2/student-nutrition-v2";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function StudentNutricaoPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const access = await resolveStudentModuleAccess(session.userId, slug);

  if (access.reason === "UNAUTHENTICATED") {
    redirect("/login");
  }

  if (access.reason === "INVALID_CONTEXT" || !access.context) {
    redirect("/selecionar-consultoria");
  }

  if (access.reason === "NOT_STUDENT") {
    redirect(`/consultoria/${access.context.consultancySlug}`);
  }

  if (access.reason === "FINANCIALLY_RESTRICTED") {
    redirect(`/consultoria/${access.context.consultancySlug}/pagamentos/regularizar`);
  }

  // Se onboarding incompleto, exibe painel com pendências
  if (!access.allowed) {
    return (
      <ConsultancyAppShell
        consultancyName={access.context.consultancyName}
        consultancySlug={access.context.consultancySlug}
        consultancyLogoUrl={access.context.consultancyLogoUrl}
        roles={access.context.roles}
        userName={session.fullName}
        userEmail={session.email}
      >
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <StudentModuleAccessPanel
            moduleType="NUTRITION"
            consultancySlug={access.context.consultancySlug}
            consultancyName={access.context.consultancyName}
            allowed={access.allowed}
            confirmedRequirements={access.confirmedRequirements}
            totalRequirements={access.totalRequirements}
          />
        </div>
      </ConsultancyAppShell>
    );
  }

  // Autorização confirmada pelo gate de módulo
  // Autoridade exclusiva Nutrition V2:
  // A. Prescrição V2 ativa -> renderiza Nutrition V2
  // B. Sem prescrição V2 ativa (com ou sem histórico prévio) -> estado sem plano ativo (ZERO fallback V1)
  const v2Auth = await getStudentAuthoritativeNutrition(session.userId, slug);

  return (
    <ConsultancyAppShell
      consultancyName={access.context.consultancyName}
      consultancySlug={access.context.consultancySlug}
      consultancyLogoUrl={access.context.consultancyLogoUrl}
      roles={access.context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="w-full max-w-3xl mx-auto space-y-6">
        {/* Back Link */}
        <div className="flex items-center gap-2">
          <Link
            href={`/consultoria/${access.context.consultancySlug}`}
            className="inline-flex items-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            ← Voltar ao painel
          </Link>
        </div>

        {/* Renderização exclusiva Nutrition V2 */}
        {v2Auth.activeAssignment ? (
          <StudentNutritionV2
            consultancySlug={access.context.consultancySlug}
            consultancyName={access.context.consultancyName}
            consultancyLogoUrl={access.context.consultancyLogoUrl}
            assignedPlan={v2Auth.activeAssignment}
          />
        ) : (
          <div className="space-y-6">
            <PageHeader
              title="Seu Plano Alimentar"
              description="Acompanhe sua dieta atual, opções de refeições e orientações do seu Nutricionista."
            />
            <EmptyState
              title="Seu plano alimentar ainda não foi disponibilizado"
              description="Assim que seu Nutricionista liberar e ativar sua prescrição alimentar, ela aparecerá aqui com todas as refeições, alimentos e opções."
            />
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
