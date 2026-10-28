import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { getReferrerDashboardData, getAdminReferralsData } from "@/lib/referrals/service";
import { ReferrerStudentView } from "@/components/referrals/referrer-student-view";
import { AdminReferralsView } from "@/components/referrals/admin-referrals-view";
import { AdminExecutiveHeader } from "@/components/admin/admin-executive-header";
import { AdminPageContainer } from "@/components/admin/admin-page-container";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function IndicacoesPage({ params }: PageProps) {
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
  const isReferrer = context.roles.includes("STUDENT") || context.roles.includes("INFLUENCER");

  let adminData = null;
  let referrerData = null;

  if (isAdmin) {
    adminData = await getAdminReferralsData(context.consultancyId);
  }
  if (isReferrer) {
    referrerData = await getReferrerDashboardData(context.consultancyId, context.membershipId);
  }

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
      consultancyPublicId={context.consultancyPublicId}
      viewModeState={viewModeState}
      showDashboardWallpaper={true}
    >
      <AdminPageContainer>
        {isAdmin ? (
          <AdminExecutiveHeader
            eyebrow="● ADMINISTRAÇÃO · CRESCIMENTO"
            title="Indicações e comissões"
            subtitle="Acompanhe indicadores, conversões, aprove comissões e liquide pagamentos PIX com segurança."
            backHref={`/consultoria/${slug}`}
            backLabel="Voltar ao Painel"
          />
        ) : (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Parceria & Recompensas
            </span>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Minhas Indicações
            </h1>
            <p className="text-xs text-zinc-500 dark:text-[#8E95A2] mt-1">
              Compartilhe seu link exclusivo, veja amigos convertidos e gerencie seu recebimento PIX.
            </p>
          </div>
        )}

        {isAdmin && adminData ? (
          <AdminReferralsView
            consultancySlug={slug}
            settings={adminData.settings}
            kpis={adminData.kpis}
            referrers={adminData.referrers}
            commissions={adminData.commissions}
          />
        ) : referrerData ? (
          <ReferrerStudentView
            consultancySlug={slug}
            code={referrerData.code}
            referralUrl={referrerData.referralUrl}
            registrationsCount={referrerData.registrationsCount}
            conversionsCount={referrerData.conversionsCount}
            pendingAmount={referrerData.pendingAmount}
            approvedAmount={referrerData.approvedAmount}
            paidAmount={referrerData.paidAmount}
            pixProfile={referrerData.pixProfile}
            commissions={referrerData.commissions}
          />
        ) : (
          <div className="p-8 text-center text-xs text-zinc-500 dark:text-[#8E95A2] bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl shadow-sm">
            Você não possui perfil elegível para o programa de indicações nesta consultoria.
          </div>
        )}
      </AdminPageContainer>
    </ConsultancyAppShell>
  );
}
