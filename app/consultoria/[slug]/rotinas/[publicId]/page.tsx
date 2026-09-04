import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { getWorkoutWithSpecificVersion } from "@/lib/training-v2/workout-repository";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { WorkoutBuilder } from "@/components/consultancies/training-v2/workout-builder";

function ArrowLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

type PageProps = {
  params: Promise<{
    slug: string;
    publicId: string;
  }>;
  searchParams: Promise<{
    version?: string;
  }>;
};

export default async function WorkoutEditorPage({ params, searchParams }: PageProps) {
  const { slug, publicId } = await params;
  const { version: requestedVersionPublicId } = await searchParams;

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

  const ctx = await resolveTrainingAccessContext(slug);
  if (!ctx || !ctx.canAuthorTraining) {
    redirect(`/consultoria/${slug}`);
  }

  let result;
  try {
    result = await getWorkoutWithSpecificVersion(ctx, publicId, requestedVersionPublicId);
  } catch {
    // If forbidden or version mismatch (e.g. forged version id or other personal's workout)
    redirect(`/consultoria/${slug}/rotinas`);
  }

  if (!result || !result.version) {
    notFound();
  }

  const { workout, version, isDraft, allVersions } = result;

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="space-y-6 max-w-5xl mx-auto pb-20">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/consultoria/${slug}/rotinas${workout.isTemplate ? "?tab=templates" : ""}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {workout.isTemplate ? "Voltar para Modelos de Treino" : "Voltar para Meus Treinos"}
          </Link>
        </div>

        <WorkoutBuilder
          consultancySlug={slug}
          workout={workout}
          initialVersion={version}
          isDraft={isDraft}
          allVersions={allVersions}
          isConsultancyAdmin={ctx.canManageConsultancy}
        />
      </div>
    </ConsultancyAppShell>
  );
}
