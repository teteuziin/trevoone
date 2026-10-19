import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
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

  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
      viewModeState={effectiveState}
      themeVariant="dark-overview"
      showDashboardWallpaper={true}
      maxWidth="default"
    >
      <div className="w-full max-w-5xl mx-auto space-y-5 pb-16">
        {/* Compact Header */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#151619] border border-neutral-200/80 dark:border-[#303238] shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/consultoria/${slug}/exercicios`}
              className="w-10 h-10 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 active:scale-95 border border-neutral-200 dark:border-white/10 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-all shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
              aria-label="Voltar para a biblioteca de exercícios"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>

            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight truncate">
                Novo Exercício
              </h1>
              <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-medium truncate">
                Cadastrar exercício personalizado para a consultoria
              </p>
            </div>
          </div>
        </div>

        <ConsultancyExerciseForm
          slug={slug}
          consultancyPublicId={context.consultancyPublicId}
          mode="create"
        />
      </div>
    </ConsultancyAppShell>
  );
}
