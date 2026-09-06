import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { getActiveNutritionPlanForStudent } from "@/lib/consultancies/nutrition";
import { getStudentAuthoritativeNutrition } from "@/lib/nutrition-v2/assignment-repository";
import { NutritionPlanPrint } from "@/components/consultancies/nutrition-plan-print";
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

  // Regra de autoridade canônica (Seção 41 e 56):
  // A. V2 Ativo -> Imprime plano V2
  // B. Histórico V2 sem ativo -> Redireciona para /nutricao (não imprime plano legado V1 antigo)
  // C. Sem histórico V2 -> Comportamento legado V1
  const v2Auth = await getStudentAuthoritativeNutrition(session.userId, slug);

  if (v2Auth.hasV2History) {
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

  // Busca plano ativo do aluno legado no V1
  const activePlan = await getActiveNutritionPlanForStudent(session.userId, slug);
  if (!activePlan) {
    redirect(`/consultoria/${access.context.consultancySlug}/nutricao`);
  }

  return (
    <NutritionPlanPrint
      consultancyName={access.context.consultancyName}
      consultancyLogoUrl={access.context.consultancyLogoUrl}
      studentName={session.fullName}
      plan={activePlan}
      backHref={`/consultoria/${access.context.consultancySlug}/nutricao`}
    />
  );
}
