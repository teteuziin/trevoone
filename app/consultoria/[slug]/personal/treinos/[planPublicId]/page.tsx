import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  getDraftTrainingPlanForEditor,
  listTrainingExercisesForPersonal,
} from "@/lib/consultancies/training";
import { TrainingPlanEditor } from "@/components/consultancies/training-plan-editor";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";

type PageProps = {
  params: Promise<{
    slug: string;
    planPublicId: string;
  }>;
};

export default async function PersonalTrainingPlanEditorPage({
  params,
}: PageProps) {
  const { slug, planPublicId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  // Permissão estrita: apenas PERSONAL
  if (!context.roles.includes("PERSONAL")) {
    redirect(`/consultoria/${slug}`);
  }

  // Buscar plano DRAFT pertencente a este PERSONAL no tenant
  const plan = await getDraftTrainingPlanForEditor({
    actorUserId: session.userId,
    consultancySlug: slug,
    planPublicId,
  });

  if (!plan) {
    redirect(`/consultoria/${slug}/personal/treinos`);
  }

  // Buscar exercícios da biblioteca para o seletor
  const libraryResult = await listTrainingExercisesForPersonal({
    actorUserId: session.userId,
    consultancySlug: slug,
    statusFilter: "ACTIVE",
    pageSize: 100,
  });

  return (
    <main className="min-h-svh w-full flex flex-col items-center justify-start p-4 sm:p-6 md:p-8 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))] bg-zinc-50/50 text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
      <div className="w-full max-w-[1240px] mx-auto space-y-6">
        <div className="flex items-center justify-between pb-2">
          <div className="w-[120px] sm:w-[130px] shrink-0">
            <TrevoOneLogo priority size={130} />
          </div>
          <span className="text-xs font-semibold text-zinc-500 bg-white border border-zinc-200 px-3 py-1 rounded-full shadow-2xs">
            {context.consultancyName}
          </span>
        </div>

        <TrainingPlanEditor
          consultancySlug={context.consultancySlug}
          plan={plan}
          activeLibraryExercises={libraryResult?.items || []}
        />
      </div>
    </main>
  );
}
