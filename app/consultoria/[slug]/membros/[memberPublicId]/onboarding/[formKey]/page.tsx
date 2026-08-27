import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getIntakeFormDefinition } from "@/lib/consultancies/intake-schemas";
import { getAdminStudentIntakeSubmission } from "@/lib/consultancies/student-intake";
import { ConsultancyAdminShell } from "@/components/consultancies/consultancy-admin-shell";
import { AdminStudentIntakeReview } from "@/components/onboarding/admin-student-intake-review";

type PageProps = {
  params: Promise<{
    slug: string;
    memberPublicId: string;
    formKey: string;
  }>;
};

export default async function AdminStudentIntakeReviewPage({ params }: PageProps) {
  const { slug, memberPublicId, formKey } = await params;

  // 1. Authenticated session guard
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  // 2. Validate formKey against known form registry
  const formDef = getIntakeFormDefinition(formKey);
  if (!formDef) {
    notFound();
  }

  // 3. Resolve tenancy context & verify CONSULTANCY_ADMIN role
  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  if (!context.roles.includes("CONSULTANCY_ADMIN")) {
    redirect(`/consultoria/${slug}`);
  }

  // 4. Server-authoritative domain fetch & tenant isolation check
  const data = await getAdminStudentIntakeSubmission(
    session.userId,
    slug,
    memberPublicId,
    formKey
  );

  if (!data.authorized) {
    redirect(`/consultoria/${slug}/membros/${memberPublicId}/onboarding`);
  }

  return (
    <ConsultancyAdminShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      currentSection="members"
    >
      <AdminStudentIntakeReview
        consultancySlug={context.consultancySlug}
        memberPublicId={memberPublicId}
        formKey={formKey}
        data={data}
      />
    </ConsultancyAdminShell>
  );
}
