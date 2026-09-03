import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { getWorkoutWithDraft } from "@/lib/training-v2/workout-repository";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { WorkoutBuilder } from "@/components/consultancies/training-v2/workout-builder";

function ArrowLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function AlertCircle({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

type PageProps = {
  params: Promise<{
    slug: string;
    publicId: string;
  }>;
};

export default async function WorkoutEditorPage({ params }: PageProps) {
  const { slug, publicId } = await params;

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
    result = await getWorkoutWithDraft(ctx, publicId);
  } catch {
    // If forbidden (e.g. other personal's workout)
    redirect(`/consultoria/${slug}/rotinas`);
  }

  if (!result) {
    notFound();
  }

  const { workout, draftVersion } = result;

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
            href={`/consultoria/${slug}/rotinas`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Meus Treinos
          </Link>
        </div>

        {!draftVersion ? (
          <div className="p-8 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              Treino sem rascunho ativo
            </h2>
            <p className="text-sm text-[var(--foreground-muted)] max-w-md mx-auto">
              Todas as versões existentes deste treino já foram publicadas ou arquivadas. Para editar este treino, uma nova versão em rascunho deverá ser gerada.
            </p>
            <Link
              href={`/consultoria/${slug}/rotinas`}
              className="inline-flex items-center px-4 py-2 text-xs font-medium rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--foreground)] hover:bg-[var(--surface-sunken)] transition-colors"
            >
              Retornar à lista de treinos
            </Link>
          </div>
        ) : (
          <WorkoutBuilder
            consultancySlug={slug}
            workout={workout}
            initialDraftVersion={draftVersion}
            isConsultancyAdmin={ctx.canManageConsultancy}
          />
        )}
      </div>
    </ConsultancyAppShell>
  );
}
