import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { PageHeader } from "@/components/ui/page-header";
import { ExerciseForm } from "@/components/admin/training-v2/exercise-form";

export default async function NewExercisePage() {
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

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <PageHeader
          title="Novo Exercício Oficial"
          description="Cadastre um novo rascunho editorial para a biblioteca global oficial Trevo One."
          backHref="/admin/exercicios"
          backLabel="Biblioteca de Exercícios"
        />

        <ExerciseForm mode="create" />
      </div>
    </div>
  );
}
