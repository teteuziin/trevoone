import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getNutritionPlanForNutritionist } from "@/lib/consultancies/nutrition";
import { NutritionPlanPrint } from "@/components/consultancies/nutrition-plan-print";

interface PageProps {
  params: Promise<{
    slug: string;
    planPublicId: string;
  }>;
}

export default async function NutritionistPlanPrintPage({ params }: PageProps) {
  const { slug, planPublicId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  if (!context.roles.includes("NUTRITIONIST")) {
    redirect(`/consultoria/${slug}`);
  }

  const plan = await getNutritionPlanForNutritionist({
    actorUserId: session.userId,
    consultancySlug: slug,
    planPublicId,
  });

  if (!plan) {
    notFound();
  }

  // DRAFT não pode ser impresso como versão final
  if (plan.status === "DRAFT") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 text-center">
        <div className="max-w-md p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h1 className="text-lg font-bold text-slate-900">Plano em Rascunho</h1>
          <p className="text-xs text-slate-600">
            Planos alimentares em rascunho não podem ser impressos como versão final. Ative o plano para disponibilizar a impressão.
          </p>
          <Link
            href={`/consultoria/${slug}/nutricao/planos/${planPublicId}`}
            className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            ← Voltar ao editor
          </Link>
        </div>
      </div>
    );
  }

  return (
    <NutritionPlanPrint
      consultancyName={context.consultancyName}
      consultancyLogoUrl={context.consultancyLogoUrl}
      studentName={plan.studentName}
      plan={plan}
      backHref={`/consultoria/${slug}/nutricao/planos/${planPublicId}`}
    />
  );
}
