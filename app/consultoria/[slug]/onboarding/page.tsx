// Student initial onboarding questionnaire page
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getStudentOnboardingStatus } from "@/lib/consultancies/student-onboarding";
import { getStudentIntakeSummary } from "@/lib/consultancies/student-intake";
import {
  StudentOnboardingPanel,
  type StudentOnboardingItemPresentation,
} from "@/components/consultancies/student-onboarding-panel";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function StudentOnboardingPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const isStudent = context.roles.includes("STUDENT");
  if (!isStudent) {
    redirect(`/consultoria/${context.consultancySlug}`);
  }

  const [onboardingStatus, intakeSummaryRes] = await Promise.all([
    getStudentOnboardingStatus(session.userId, slug),
    getStudentIntakeSummary(session.userId, slug),
  ]);

  // Build requirement-to-native-intake map by requirementPublicId
  const intakeMap = new Map(
    (intakeSummaryRes.summary || []).map((item) => [
      item.requirementPublicId,
      item,
    ])
  );

  // Enrich requirements with server-resolved native form identity
  const enrichedRequirements: StudentOnboardingItemPresentation[] =
    onboardingStatus.requirements.map((req) => {
      const nativeSummary = intakeMap.get(req.publicId);

      return {
        ...req,
        nativeFormKey: nativeSummary?.formKey || null,
        nativeSubmissionStatus: nativeSummary?.status || null,
        hasNativeContent: nativeSummary?.hasNativeContent || false,
      };
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
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <StudentOnboardingPanel
          consultancySlug={context.consultancySlug}
          consultancyName={context.consultancyName}
          initialStatus={{
            ...onboardingStatus,
            requirements: enrichedRequirements,
          }}
        />
      </div>
    </ConsultancyAppShell>
  );
}
