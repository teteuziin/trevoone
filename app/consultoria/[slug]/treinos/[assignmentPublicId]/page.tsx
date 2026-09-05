import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { getStudentWorkoutView } from "@/lib/training-v2/assignment-repository";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { StudentWorkoutRenderer } from "@/components/consultancies/training-v2/student-workout-renderer";

type PageProps = {
  params: Promise<{
    slug: string;
    assignmentPublicId: string;
  }>;
};

export default async function StudentWorkoutDetailPage({ params }: PageProps) {
  const { slug, assignmentPublicId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const ctx = await resolveTrainingAccessContext(slug);
  if (!ctx) {
    redirect(`/consultoria/${slug}`);
  }

  // Load through assignment authority (verifies student ownership & active status)
  const workoutView = await getStudentWorkoutView(ctx, assignmentPublicId);
  if (!workoutView) {
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
      <div className="space-y-4 max-w-3xl mx-auto pb-12">
        {/* Back Link */}
        <div>
          <Link
            href={`/consultoria/${slug}/treinos`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
          >
            ← Voltar aos meus treinos
          </Link>
        </div>

        {/* Frozen Workout Renderer (Read-Only) */}
        <StudentWorkoutRenderer workout={workoutView} />
      </div>
    </ConsultancyAppShell>
  );
}
