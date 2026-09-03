import { redirect, notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { getExerciseByIdOrPublicId } from "@/lib/training-v2/exercise-repository";
import { PageHeader } from "@/components/ui/page-header";
import { ExerciseForm } from "@/components/admin/training-v2/exercise-form";

type PageProps = {
  params: Promise<{
    publicId: string;
  }>;
};

export default async function ExerciseDetailPage({ params }: PageProps) {
  const { publicId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);
  if (!isPlatformAdmin) {
    redirect("/selecionar-consultoria");
  }

  const ctx = await resolveTrainingAccessContext(null);
  if (!ctx || !ctx.canManageGlobal) {
    redirect("/selecionar-consultoria");
  }

  const exercise = await getExerciseByIdOrPublicId(ctx, { publicId });
  if (!exercise || exercise.scope !== "GLOBAL") {
    notFound();
  }

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <PageHeader
          title={exercise.name}
          description="Edite os parâmetros técnicos, envie mídias em alta resolução e publique na Biblioteca Global."
          backHref="/admin/exercicios"
          backLabel="Biblioteca de Exercícios"
        />

        <ExerciseForm mode="edit" initialData={exercise} />
      </div>
    </div>
  );
}
