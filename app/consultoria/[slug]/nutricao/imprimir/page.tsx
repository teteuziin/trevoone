import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { getStudentAuthoritativeNutrition } from "@/lib/nutrition-v2/assignment-repository";
import { StudentNutritionV2Print } from "@/components/consultancies/nutrition-v2/student-nutrition-v2-print";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function StudentNutritionPrintPage({ params }: PageProps) {
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

  // Guard de onboarding: se incompleto, redireciona para a página principal de nutrição com o painel de pendências
  if (!access.allowed) {
    redirect(`/consultoria/${access.context.consultancySlug}/nutricao`);
  }

  // Regra de autoridade exclusiva Nutrition V2:
  // A. V2 Ativo -> Imprime plano frozen V2
  // B. Sem V2 ativo -> Redireciona para /nutricao (ZERO fallback V1)
  const v2Auth = await getStudentAuthoritativeNutrition(session.userId, slug);

  if (!v2Auth.activeAssignment) {
    redirect(`/consultoria/${access.context.consultancySlug}/nutricao`);
  }

  return (
    <StudentNutritionV2Print
      consultancySlug={access.context.consultancySlug}
      consultancyName={access.context.consultancyName}
      consultancyLogoUrl={access.context.consultancyLogoUrl}
      studentName={session.fullName}
      assignedPlan={v2Auth.activeAssignment}
      backHref={`/consultoria/${access.context.consultancySlug}/nutricao`}
    />
  );
}
