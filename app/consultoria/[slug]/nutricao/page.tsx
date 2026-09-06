import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { getActiveNutritionPlanForStudent } from "@/lib/consultancies/nutrition";
import { getStudentAuthoritativeNutrition } from "@/lib/nutrition-v2/assignment-repository";
import { StudentModuleAccessPanel } from "@/components/consultancies/student-module-access-panel";
import { StudentNutritionPlan } from "@/components/consultancies/student-nutrition-plan";
import { StudentNutritionV2 } from "@/components/consultancies/nutrition-v2/student-nutrition-v2";
import { NutritionOfflineSync } from "@/components/offline/nutrition-offline-sync";
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
  // Regra de autoridade canônica (Seção 41):
  // A. Se possui prescrição V2 ativa -> renderiza V2
  // B. Senão se possui histórico de prescrição V2 -> V2 é autoritativo, exibe estado sem plano ativo (NÃO ressuscita V1)
  // C. Senão (zero histórico V2) -> comportamento legado V1
  const v2Auth = await getStudentAuthoritativeNutrition(session.userId, slug);

  const isV2Authoritative = v2Auth.hasV2History;
  const activeV1Plan = !isV2Authoritative
    ? await getActiveNutritionPlanForStudent(session.userId, slug)
    : null;

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
        {/* Silent Nutrition Offline Auto-Sync Bridge for V1 */}
        {!isV2Authoritative && activeV1Plan && (
          <NutritionOfflineSync
            userPublicId={session.userPublicId}
            userName={session.fullName}
            consultancyPublicId={access.context.consultancyPublicId}
            consultancyName={access.context.consultancyName}
            consultancySlug={access.context.consultancySlug}
            consultancyLogoUrl={access.context.consultancyLogoUrl}
            plan={activeV1Plan}
          />
        )}

        {/* Back Link */}
        <div className="flex items-center gap-2">
          <Link
            href={`/consultoria/${access.context.consultancySlug}`}
            className="inline-flex items-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            ← Voltar ao painel
          </Link>
        </div>

        {/* Renderização condicional conforme regra de autoridade */}
        {isV2Authoritative ? (
          v2Auth.activeAssignment ? (
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
                title="Nenhum plano alimentar ativo no momento"
                description="Você não possui uma prescrição alimentar ativa nesta consultoria. Quando seu Nutricionista prescrever um novo plano, ele aparecerá aqui."
              />
            </div>
          )
        ) : !activeV1Plan ? (
          <div className="space-y-6">
            <PageHeader
              title="Seu Plano Alimentar"
              description="Acompanhe sua dieta atual, opções de refeições e orientações do seu Nutricionista."
            />
            <EmptyState
              title="Seu plano alimentar ainda não foi disponibilizado"
              description="Assim que seu Nutricionista liberar e ativar seu plano alimentar, ele aparecerá aqui com todas as refeições, alimentos e opções."
            />
          </div>
        ) : (
          <StudentNutritionPlan
            consultancySlug={access.context.consultancySlug}
            consultancyName={access.context.consultancyName}
            consultancyLogoUrl={access.context.consultancyLogoUrl}
            plan={activeV1Plan}
          />
        )}
      </div>
    </ConsultancyAppShell>
  );
}
