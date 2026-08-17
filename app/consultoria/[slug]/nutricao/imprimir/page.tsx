import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { getActiveNutritionPlanForStudent } from "@/lib/consultancies/nutrition";
import { NutritionPlanPrint } from "@/components/consultancies/nutrition-plan-print";

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

  // Busca plano ativo do aluno autenticado
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
