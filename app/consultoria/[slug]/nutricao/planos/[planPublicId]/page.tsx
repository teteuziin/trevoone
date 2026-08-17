import { redirect, notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getNutritionPlanForNutritionist } from "@/lib/consultancies/nutrition";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { NutritionPlanEditor } from "@/components/consultancies/nutrition-plan-editor";

interface PageProps {
  params: Promise<{
    slug: string;
    planPublicId: string;
  }>;
}

export default async function NutritionPlanDetailPage({ params }: PageProps) {
  const { slug, planPublicId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  // Permissão estrita: apenas NUTRITIONIST
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

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="w-full max-w-5xl mx-auto">
        <NutritionPlanEditor slug={slug} plan={plan} />
      </div>
    </ConsultancyAppShell>
  );
}
