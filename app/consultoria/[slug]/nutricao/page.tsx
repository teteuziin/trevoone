import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { getStudentAuthoritativeNutrition } from "@/lib/nutrition-v2/assignment-repository";
import { StudentModuleAccessPanel } from "@/components/consultancies/student-module-access-panel";
import { StudentNutritionV2 } from "@/components/consultancies/nutrition-v2/student-nutrition-v2";
import { StudentFollowupTrigger } from "@/components/consultancies/nutrition-v2/student-followup-trigger";
import { getPendingCheckinForStudent } from "@/lib/nutrition-v2/checkin-repository";
import { getPendingPreQuestionnaireForStudent } from "@/lib/nutrition-v2/pre-questionnaire-repository";
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
        userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
        consultancyPublicId={access.context.consultancyPublicId}
        activeRole="STUDENT"
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
  const pendingPreQuestionnaire = await getPendingPreQuestionnaireForStudent(
    access.context.consultancyId,
    access.context.membershipId
  );
  const pendingCheckin = await getPendingCheckinForStudent(
    access.context.consultancyId,
    access.context.membershipId
  );

  return (
    <ConsultancyAppShell
      consultancyName={access.context.consultancyName}
      consultancySlug={access.context.consultancySlug}
      consultancyLogoUrl={access.context.consultancyLogoUrl}
      roles={access.context.roles}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
      consultancyPublicId={access.context.consultancyPublicId}
      activeRole="STUDENT"
    >
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-16">
        {/* Renderização exclusiva Nutrition V2 */}
        {v2Auth.activeAssignment ? (
          <StudentNutritionV2
            consultancySlug={access.context.consultancySlug}
            consultancyName={access.context.consultancyName}
            consultancyLogoUrl={access.context.consultancyLogoUrl}
            studentName={session.fullName}
            assignedPlan={v2Auth.activeAssignment}
            userPublicId={session.userPublicId}
            consultancyPublicId={access.context.consultancyPublicId}
            role="STUDENT"
            pendingCheckinRequestPublicId={pendingCheckin?.publicId}
            pendingPreQuestionnairePublicId={pendingPreQuestionnaire?.publicId}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Link
                href={`/consultoria/${access.context.consultancySlug}`}
                className="inline-flex items-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-h-[44px]"
              >
                ← Voltar ao painel
              </Link>

              <StudentFollowupTrigger
                consultancySlug={access.context.consultancySlug}
                pendingCheckinRequestPublicId={pendingCheckin?.publicId}
              />
            </div>

            {pendingPreQuestionnaire && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-emerald-800 dark:text-emerald-200 block text-sm">
                    📋 Pré-Questionário Nutricional Pendente
                  </span>
                  <p className="text-emerald-700 dark:text-emerald-300 text-xs leading-relaxed">
                    Sua nutricionista solicitou o preenchimento antes da sua consulta. Suas respostas ajudarão a montar seu plano alimentar personalizado.
                  </p>
                </div>
                <Link
                  href={`/consultoria/${access.context.consultancySlug}/nutricao/pre-questionario/${pendingPreQuestionnaire.publicId}`}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 shadow-xs inline-flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer"
                >
                  <span>Responder Pré-Questionário →</span>
                </Link>
              </div>
            )}

            <PageHeader
              title="Seu Plano Alimentar"
              description="Acompanhe sua dieta atual, opções de refeições e orientações da sua equipe de nutrição."
            />
            <EmptyState
              title="Seu plano alimentar ainda não está disponível."
              description="Assim que sua equipe de nutrição disponibilizar sua prescrição alimentar, ela aparecerá aqui com todas as refeições e alimentos."
            />
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
