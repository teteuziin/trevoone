import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { NutritionFoodForm } from "@/components/consultancies/nutrition-food-form";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function NewManualFoodPage({ params }: Props) {
  const { slug } = await params;
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
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
      <div className="w-full space-y-6">
        <PageHeader
          title="Novo alimento manual"
          description="Cadastre um novo alimento e seus valores nutricionais para a biblioteca da consultoria."
          backHref={`/consultoria/${slug}/nutricao/alimentos`}
          backLabel="Voltar à biblioteca"
        />

        <NutritionFoodForm consultancySlug={slug} mode="create" />
      </div>
    </ConsultancyAppShell>
  );
}
