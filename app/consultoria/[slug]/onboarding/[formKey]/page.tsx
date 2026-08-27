import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getIntakeFormDefinition } from "@/lib/consultancies/intake-schemas";
import { getIntakeUIFormConfig } from "@/lib/consultancies/intake-ui-config";
import { getStudentIntakeSubmission } from "@/lib/consultancies/student-intake";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { StudentIntakeRunner } from "@/components/onboarding/student-intake-runner";

type PageProps = {
  params: Promise<{
    slug: string;
    formKey: string;
  }>;
};

export default async function StudentIntakeFormPage({ params }: PageProps) {
  const { slug, formKey } = await params;

  // 1. Authenticated session guard
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  // 2. Validate formKey against known form registry
  const formDef = getIntakeFormDefinition(formKey);
  const uiConfig = getIntakeUIFormConfig(formKey);
  if (!formDef || !uiConfig) {
    notFound();
  }

  // 3. Resolve consultancy context and tenant membership
  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  // 4. Strict role guard: only STUDENT may access the intake runner
  const isStudent = context.roles.includes("STUDENT");
  if (!isStudent) {
    redirect(`/consultoria/${context.consultancySlug}`);
  }

  // 5. Load existing native submission or draft via domain authority
  const submissionDetail = await getStudentIntakeSubmission(
    session.userId,
    slug,
    formKey
  );

  if (!submissionDetail.success || !submissionDetail.form) {
    redirect(`/consultoria/${context.consultancySlug}/onboarding`);
  }

  // 6. Detect legacy submission/confirmed requirement without native responses
  const hasNoNativeContent = !submissionDetail.submission;
  const isLegacyWithoutNativeContent =
    hasNoNativeContent &&
    (submissionDetail.requirement?.status === "SUBMITTED" ||
      submissionDetail.requirement?.status === "CONFIRMED");

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <StudentIntakeRunner
        consultancySlug={context.consultancySlug}
        consultancyName={context.consultancyName}
        formDef={formDef}
        uiConfig={uiConfig}
        initialResponses={submissionDetail.submission?.responses || {}}
        initialSubmissionStatus={
          submissionDetail.submission?.status || "NOT_STARTED"
        }
        requirementStatus={
          submissionDetail.requirement?.status || "PENDING"
        }
        isLegacyWithoutNativeContent={isLegacyWithoutNativeContent}
        submissionPublicId={submissionDetail.submission?.publicId || null}
        startedAt={submissionDetail.submission?.startedAt || null}
        submittedAt={submissionDetail.submission?.submittedAt || null}
        confirmedAt={submissionDetail.requirement?.confirmedAt || null}
      />
    </ConsultancyAppShell>
  );
}
