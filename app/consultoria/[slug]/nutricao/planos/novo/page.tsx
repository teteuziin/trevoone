import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { listActiveStudentsForNutritionist } from "@/lib/consultancies/nutrition";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { NutritionPlanCreateForm } from "@/components/consultancies/nutrition-plan-create-form";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function NewNutritionPlanPage({ params }: PageProps) {
  const { slug } = await params;

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

  const students = await listActiveStudentsForNutritionist({
    actorUserId: session.userId,
    consultancySlug: slug,
  });

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Novo Plano Alimentar"
          description="Inicie um novo rascunho de plano alimentar para um aluno ativo da sua consultoria."
          backHref={`/consultoria/${slug}/nutricao/planos`}
          backLabel="Voltar aos planos alimentares"
        />

        {/* Create Form */}
        <NutritionPlanCreateForm slug={slug} students={students} />
      </div>
    </ConsultancyAppShell>
  );
}
