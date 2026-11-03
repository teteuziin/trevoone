import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import {
  getAdminReferralsData,
  getMemberPayoutProfile,
  type MemberPayoutProfile,
} from "@/lib/referrals/service";
import {
  listConsultancyParticipantsForPromotion,
  listCampaignLinksForAdmin,
  listMarketingMaterials,
  getParticipantPromotionalDashboard,
  type EligiblePromotionParticipant,
  type PromotionalCampaignLinkRecord,
  type PromotionalMarketingMaterialRecord,
} from "@/lib/referrals/campaigns";
import { AdminReferralsView } from "@/components/referrals/admin-referrals-view";
import { PromotionalHubView } from "@/components/referrals/promotional-hub-view";
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
  const isEligibleParticipant = context.roles.includes("STUDENT") || context.roles.includes("INFLUENCER");

  let adminData: Awaited<ReturnType<typeof getAdminReferralsData>> | null = null;
  let eligibleParticipants: EligiblePromotionParticipant[] = [];
  let campaignLinks: PromotionalCampaignLinkRecord[] = [];
  let materials: PromotionalMarketingMaterialRecord[] = [];

  let participantDashboard: Awaited<ReturnType<typeof getParticipantPromotionalDashboard>> | null = null;
  let pixProfile: MemberPayoutProfile | null = null;

  if (isAdmin) {
    try {
      const [adminRes, participantsRes, linksRes, materialsRes] = await Promise.all([
        getAdminReferralsData(context.consultancyId).catch((err) => {
          console.error("[IndicacoesPage] Failed to load admin referrals data:", err);
          return null;
        }),
        listConsultancyParticipantsForPromotion(context.consultancyId).catch((err) => {
          console.error("[IndicacoesPage] Failed to list participants:", err);
          return [];
        }),
        listCampaignLinksForAdmin(context.consultancyId).catch((err) => {
          console.error("[IndicacoesPage] Failed to list campaign links:", err);
          return [];
        }),
        listMarketingMaterials(context.consultancyId).catch((err) => {
          console.error("[IndicacoesPage] Failed to list marketing materials:", err);
          return [];
        }),
      ]);

      adminData = adminRes || {
        settings: {
          id: 0,
          consultancyId: context.consultancyId,
          isEnabled: false,
          commissionType: "FIXED_AMOUNT" as const,
          commissionAmountCents: 5000,
          commissionRateBasisPoints: 1000,
          commissionValue: 50.0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        kpis: {
          totalReferrers: 0,
          totalRegistrations: 0,
          totalConversions: 0,
          pendingAmount: 0,
          approvedAmount: 0,
          paidAmount: 0,
        },
        referrers: [],
        commissions: [],
      };
      eligibleParticipants = participantsRes || [];
      campaignLinks = linksRes || [];
      materials = materialsRes || [];
    } catch (err) {
      console.error("[IndicacoesPage] Fatal error caught in admin loader:", err);
      adminData = {
        settings: {
          id: 0,
          consultancyId: context.consultancyId,
          isEnabled: false,
          commissionType: "FIXED_AMOUNT" as const,
          commissionAmountCents: 5000,
          commissionRateBasisPoints: 1000,
          commissionValue: 50.0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        kpis: {
          totalReferrers: 0,
          totalRegistrations: 0,
          totalConversions: 0,
          pendingAmount: 0,
          approvedAmount: 0,
          paidAmount: 0,
        },
        referrers: [],
        commissions: [],
      };
      eligibleParticipants = [];
      campaignLinks = [];
      materials = [];
    }
  } else if (isEligibleParticipant) {
    try {
      const [dashboardRes, pixRes] = await Promise.all([
        getParticipantPromotionalDashboard(context.consultancyId, context.membershipId).catch((err) => {
          console.error("[IndicacoesPage] Failed to load participant dashboard:", err);
          return null;
        }),
        getMemberPayoutProfile(context.consultancyId, context.membershipId).catch((err) => {
          console.error("[IndicacoesPage] Failed to load payout profile:", err);
          return null;
        }),
      ]);

      participantDashboard = dashboardRes || {
        isEnrolled: false,
        participantName: session.fullName,
        defaultCode: "",
        links: [],
        materials: [],
        results: {
          totalClicks: 0,
          registrationsCount: 0,
          conversionsCount: 0,
          pendingAmount: 0,
          approvedAmount: 0,
          paidAmount: 0,
        },
        commissions: [],
      };
      pixProfile = pixRes;
    } catch (err) {
      console.error("[IndicacoesPage] Fatal error caught in participant loader:", err);
      participantDashboard = {
        isEnrolled: false,
        participantName: session.fullName,
        defaultCode: "",
        links: [],
        materials: [],
        results: {
          totalClicks: 0,
          registrationsCount: 0,
          conversionsCount: 0,
          pendingAmount: 0,
          approvedAmount: 0,
          paidAmount: 0,
        },
        commissions: [],
      };
      pixProfile = null;
    }
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
            title="Indicações, Afiliados & Links Individuais"
            subtitle="Gerencie links manuais por parceiro, disponibilize artes oficiais de divulgação e liquide comissões via PIX."
            backHref={`/consultoria/${slug}`}
            backLabel="Voltar ao Painel"
          />
        ) : null}

        {isAdmin && adminData ? (
          <AdminReferralsView
            consultancySlug={slug}
            settings={adminData.settings}
            kpis={adminData.kpis}
            referrers={adminData.referrers}
            commissions={adminData.commissions}
            eligibleParticipants={eligibleParticipants}
            campaignLinks={campaignLinks}
            materials={materials}
          />
        ) : participantDashboard ? (
          <PromotionalHubView
            consultancySlug={slug}
            isEnrolled={participantDashboard.isEnrolled}
            participantName={participantDashboard.participantName || session.fullName}
            defaultCode={participantDashboard.defaultCode}
            links={participantDashboard.links}
            materials={participantDashboard.materials}
            results={participantDashboard.results}
            commissions={participantDashboard.commissions}
            pixProfile={pixProfile}
          />
        ) : (
          <div className="p-8 text-center text-xs text-zinc-500 dark:text-[#8E95A2] bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl shadow-sm">
            Você não possui perfil elegível para o programa de divulgação nesta consultoria.
          </div>
        )}
      </AdminPageContainer>
    </ConsultancyAppShell>
  );
}
