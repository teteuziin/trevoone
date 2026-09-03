import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { ConsultancyExerciseForm } from "@/components/consultancies/training-v2/consultancy-exercise-form";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NewConsultancyExercisePage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const isProfessional =
    context.roles.includes("PERSONAL") || context.roles.includes("CONSULTANCY_ADMIN");
  if (!isProfessional) {
    redirect(`/consultoria/${slug}`);
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
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Novo Exercício"
          description="Cadastre um novo exercício personalizado para sua consultoria. Por padrão, ele será criado como privado (Só para mim)."
          backHref={`/consultoria/${slug}/exercicios`}
          backLabel="Voltar para a Biblioteca"
        />

        <ConsultancyExerciseForm
          slug={slug}
          consultancyPublicId={context.consultancyPublicId}
          mode="create"
        />
      </div>
    </ConsultancyAppShell>
  );
}
