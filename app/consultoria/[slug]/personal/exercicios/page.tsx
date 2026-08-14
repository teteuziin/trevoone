import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  listTrainingExercisesForPersonal,
  getTrainingExerciseForPersonal,
} from "@/lib/consultancies/training";
import { TrainingExerciseLibrary } from "@/components/consultancies/training-exercise-library";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    edit?: string;
  }>;
};

export default async function PersonalExercisesPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { q, status, page, edit } = await searchParams;

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

  const validStatus =
    status === "ACTIVE" || status === "INACTIVE" ? status : "ALL";
  const parsedPage = Number(page);
  const validPage = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  const listResult = await listTrainingExercisesForPersonal({
    actorUserId: session.userId,
    consultancySlug: slug,
    search: q || "",
    statusFilter: validStatus,
    page: validPage,
    pageSize: 25,
  });

  const editingExercise = edit
    ? await getTrainingExerciseForPersonal({
        actorUserId: session.userId,
        consultancySlug: slug,
        exercisePublicId: edit,
      })
    : null;

  const items = listResult?.items || [];
  const total = listResult?.total || 0;
  const totalPages = listResult?.totalPages || 1;

  return (
    <main className="min-h-svh w-full flex flex-col items-center justify-start p-4 sm:p-6 md:p-8 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))] bg-zinc-50/50 text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
      <div className="w-full max-w-[800px] mx-auto space-y-6">
        <div className="flex items-center justify-between pb-2">
          <div className="w-[120px] sm:w-[130px] shrink-0">
            <TrevoOneLogo priority size={130} />
          </div>
          <span className="text-xs font-semibold text-zinc-500 bg-white border border-zinc-200 px-3 py-1 rounded-full shadow-2xs">
            {context.consultancyName}
          </span>
        </div>

        <TrainingExerciseLibrary
          consultancySlug={context.consultancySlug}
          items={items}
          total={total}
          page={validPage}
          pageSize={25}
          totalPages={totalPages}
          searchQuery={q || ""}
          statusFilter={validStatus}
          editingExercise={editingExercise}
        />
      </div>
    </main>
  );
}
