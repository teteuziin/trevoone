import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { generateSupervisorSummary } from "@/lib/monitoring/supervisor-summary";
import { evaluateConsultancyStudents } from "@/lib/monitoring/evaluator";
import { getProfessionalRadarData } from "@/lib/monitoring/professional-radar";
import { getAdminReferralsData } from "@/lib/referrals/service";
import { getProfessionalActionsHistory } from "@/lib/monitoring/admin-actions";
import { OperationsCenterView } from "@/components/operations/operations-center-view";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function OperacoesPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const viewModeState = await resolveEffectiveViewMode(slug, context.roles);
  const effectiveMode = viewModeState.effectiveMode;

  const isAdmin = effectiveMode === "ADMIN" && context.roles.includes("CONSULTANCY_ADMIN");
  if (!isAdmin) {
    redirect(`/consultoria/${slug}`);
  }

  const [supervisorSummary, studentsResult, teamResult, referralsData, escalationsHistory] =
    await Promise.all([
      generateSupervisorSummary(context.consultancyId),
      evaluateConsultancyStudents(context.consultancyId),
      getProfessionalRadarData(context.consultancyId),
      getAdminReferralsData(context.consultancyId),
      getProfessionalActionsHistory(context.consultancyId),
    ]);

  const pendingCommissionsCount = referralsData.commissions.filter(
    (c) => c.status === "PENDING"
  ).length;
  const pendingPayoutsCount = referralsData.commissions.filter(
    (c) => c.status === "APPROVED"
  ).length;

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      consultancyPublicId={context.consultancyPublicId}
      viewModeState={viewModeState}
    >
      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)] block">
            Centro de Operações &amp; Inteligência
          </span>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Operações da Consultoria
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Supervisão ativa de adesão de alunos, acompanhamento da equipe técnica e gestão centralizada.
          </p>
        </div>

        <OperationsCenterView
          consultancySlug={slug}
          supervisorSummary={supervisorSummary}
          studentsResult={studentsResult}
          teamResult={teamResult}
          referralsSummary={{
            pendingCommissionsCount,
            pendingPayoutsCount,
            pendingAmount: referralsData.kpis.pendingAmount,
            approvedAmount: referralsData.kpis.approvedAmount,
          }}
          escalationsHistory={escalationsHistory}
        />
      </div>
    </ConsultancyAppShell>
  );
}
