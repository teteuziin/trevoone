// Admin view of student onboarding profile
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getStudentOnboardingForAdmin } from "@/lib/consultancies/student-onboarding";
import { ConsultancyAdminShell } from "@/components/consultancies/consultancy-admin-shell";
import {
  AdminStudentOnboardingPanel,
  type AdminOnboardingItemPresentation,
} from "@/components/consultancies/admin-student-onboarding-panel";

type PageProps = {
  params: Promise<{
    slug: string;
    memberPublicId: string;
  }>;
};

/**
 * Server-authoritative resolver mapping onboarding requirement key to native formKey.
 */
function resolveNativeFormKey(requirementKey: string): string | null {
  if (!requirementKey || typeof requirementKey !== "string") return null;
  const key = requirementKey.trim();
  if (key === "physical-assessment" || key === "student-form-1") {
    return "physical-assessment";
  }
  if (key === "complete-anamnesis" || key === "student-form-2") {
    return "complete-anamnesis";
  }
  return null;
}

export default async function AdminStudentOnboardingPage({ params }: PageProps) {
  const { slug, memberPublicId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  if (!context.roles.includes("CONSULTANCY_ADMIN")) {
    redirect(`/consultoria/${slug}`);
  }

  const data = await getStudentOnboardingForAdmin(
    session.userId,
    slug,
    memberPublicId
  );

  if (!data.authorized) {
    redirect(`/consultoria/${slug}/membros`);
  }

  // Enrich requirements server-side with native formKey without exposing health answers
  const enrichedRequirements: AdminOnboardingItemPresentation[] = (
    data.requirements || []
  ).map((req) => ({
    ...req,
    nativeFormKey: resolveNativeFormKey(req.key),
  }));

  return (
    <ConsultancyAdminShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      currentSection="members"
    >
      <AdminStudentOnboardingPanel
        consultancySlug={context.consultancySlug}
        memberPublicId={memberPublicId}
        data={{
          ...data,
          requirements: enrichedRequirements,
        }}
      />
    </ConsultancyAdminShell>
  );
}
