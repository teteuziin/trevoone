import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getFoodDetailsForNutritionist } from "@/lib/consultancies/nutrition";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { NutritionFoodForm } from "@/components/consultancies/nutrition-food-form";

type Props = {
  params: Promise<{ slug: string; foodPublicId: string }>;
};

export default async function EditManualFoodPage({ params }: Props) {
  const { slug, foodPublicId } = await params;
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    notFound();
  }

  const food = await getFoodDetailsForNutritionist({
    actorUserId: session.userId,
    consultancySlug: slug,
    foodPublicId,
  });

  // Apenas alimentos MANUAL e ACTIVE podem ser editados
  if (!food || food.sourceType !== "MANUAL" || food.status !== "ACTIVE") {
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
          title={`Editar alimento: ${food.name}`}
          description="Atualize as informações nutricionais e de identificação deste alimento manual."
          backHref={`/consultoria/${slug}/nutricao/alimentos/${foodPublicId}`}
          backLabel="Voltar aos detalhes"
        />

        <NutritionFoodForm
          consultancySlug={slug}
          initialData={food}
          mode="edit"
        />
      </div>
    </ConsultancyAppShell>
  );
}
