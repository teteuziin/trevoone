import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import { getPatientRecordDetailAction } from "../../patient-actions";
import { PatientRecordView } from "@/components/consultancies/nutrition-v2/patient-record-view";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";

interface PatientRecordPageProps {
  params: Promise<{ slug: string; studentPublicId: string }>;
}

export default async function PatientRecordPage({ params }: PatientRecordPageProps) {
  const { slug, studentPublicId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?returnUrl=/consultoria/${slug}/planos-v2/prontuario/${studentPublicId}`);
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  const ctx = await resolveNutritionAccessContext(slug);
  if (!ctx || !ctx.canAuthorNutrition) {
    notFound();
  }

  const res = await getPatientRecordDetailAction(slug, studentPublicId);
  if (!res.success || !res.detail) {
    notFound();
  }

  return (
    <ConsultancyAppShell
      consultancyName={context?.consultancyName || ctx.consultancySlug || slug}
      consultancySlug={context?.consultancySlug || ctx.consultancySlug || slug}
      consultancyLogoUrl={context?.consultancyLogoUrl}
      roles={context?.roles || ctx.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <PatientRecordView initialDetail={res.detail} slug={slug} />
    </ConsultancyAppShell>
  );
}
