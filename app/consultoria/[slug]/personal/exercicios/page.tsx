import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  listTrainingExercisesForPersonal,
  getTrainingExerciseForPersonal,
} from "@/lib/consultancies/training";
import { TrainingExerciseLibrary } from "@/components/consultancies/training-exercise-library";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";

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
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="w-full max-w-4xl mx-auto space-y-6">
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
    </ConsultancyAppShell>
  );
}
