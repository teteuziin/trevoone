import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { getActiveTrainingPlanForStudent } from "@/lib/consultancies/training";
import { StudentModuleAccessPanel } from "@/components/consultancies/student-module-access-panel";
import { StudentTrainingPlan } from "@/components/consultancies/student-training-plan";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function StudentTreinosPage({ params }: PageProps) {
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
            moduleType="TRAINING"
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

  // Se autorizado, busca o plano de treino ACTIVE do aluno nesta consultoria
  const activePlan = await getActiveTrainingPlanForStudent(session.userId, slug);

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
            className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            ← Voltar ao painel
          </Link>
        </div>

        {/* Estado vazio (quando não há plano ativo liberado) */}
        {!activePlan ? (
          <div className="p-8 sm:p-12 rounded-2xl bg-white border border-zinc-200 shadow-2xs text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#00A859] mx-auto flex items-center justify-center font-bold">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-zinc-900">
              Seu treino ainda não foi disponibilizado
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 max-w-[380px] mx-auto leading-relaxed">
              Assim que seu Personal Trainer liberar e ativar sua nova ficha de treino, ela aparecerá aqui com todos os exercícios, vídeos e orientações.
            </p>
          </div>
        ) : (
          <StudentTrainingPlan
            consultancySlug={access.context.consultancySlug}
            consultancyName={access.context.consultancyName}
            consultancyLogoUrl={access.context.consultancyLogoUrl}
            plan={activePlan}
          />
        )}
      </div>
    </ConsultancyAppShell>
  );
}
