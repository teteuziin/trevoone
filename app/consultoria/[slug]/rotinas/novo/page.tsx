import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { createWorkoutDraftAction } from "../actions";
function ArrowLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function Sparkles({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z" />
    </svg>
  );
}

function Dumbbell({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5l11 11M6.5 17.5l11-11M3 8l3-3m0 0l3 3M3 16l3 3m0 0l3-3m9-8l3-3m0 0l3 3m-3 11l3-3m0 0l3 3" />
    </svg>
  );
}

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NewWorkoutPage({ params }: PageProps) {
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

  const ctx = await resolveTrainingAccessContext(slug);
  if (!ctx || !ctx.canAuthorTraining) {
    redirect(`/consultoria/${slug}`);
  }

  async function handleCreate(formData: FormData) {
    "use server";
    const title = String(formData.get("title") || "").trim();
    const objective = String(formData.get("objective") || "").trim() || undefined;
    const difficultyLevel = String(formData.get("difficultyLevel") || "INTERMEDIATE");
    const estimatedDuration = formData.get("estimatedDurationMinutes");
    const notes = String(formData.get("notes") || "").trim() || undefined;

    const res = await createWorkoutDraftAction(slug, {
      title,
      objective,
      difficultyLevel,
      estimatedDurationMinutes: estimatedDuration ? Number(estimatedDuration) : null,
      notes,
    });

    if (res.ok && res.data) {
      redirect(`/consultoria/${slug}/rotinas/${res.data.workoutPublicId}`);
    }
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
      <div className="max-w-xl mx-auto space-y-6 pb-12">
        <Link
          href={`/consultoria/${slug}/rotinas`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Meus Treinos
        </Link>

        <div className="p-6 sm:p-8 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Novo Treino Modular
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">
              Informações Iniciais da Rotina
            </h1>
            <p className="text-xs sm:text-sm text-[var(--foreground-muted)]">
              Defina o nome e os objetivos gerais. Em seguida, você adicionará os blocos e exercícios no Criador.
            </p>
          </div>

          <form action={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                Nome do treino *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                placeholder="Ex: Treino A — Peito e Tríceps"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
              />
            </div>

            <div>
              <label htmlFor="objective" className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                Objetivo principal
              </label>
              <input
                id="objective"
                name="objective"
                type="text"
                placeholder="Ex: Hipertrofia, Força, Resistência muscular..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="difficultyLevel" className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                  Nível de dificuldade
                </label>
                <select
                  id="difficultyLevel"
                  name="difficultyLevel"
                  defaultValue="INTERMEDIATE"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
                >
                  <option value="BEGINNER">Iniciante</option>
                  <option value="INTERMEDIATE">Intermediário</option>
                  <option value="ADVANCED">Avançado</option>
                </select>
              </div>

              <div>
                <label htmlFor="estimatedDurationMinutes" className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                  Duração estimada (min)
                </label>
                <input
                  id="estimatedDurationMinutes"
                  name="estimatedDurationMinutes"
                  type="number"
                  min="5"
                  max="240"
                  defaultValue="50"
                  placeholder="Ex: 50"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                Observações gerais / Recomendações
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Orientações pré-treino, recomendações de aquecimento..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
              />
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
              <Link
                href={`/consultoria/${slug}/rotinas`}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--border-default)] text-[var(--foreground-muted)] hover:bg-[var(--surface-subtle)] transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-xs transition-colors"
              >
                <Dumbbell className="w-3.5 h-3.5" />
                Criar e Abrir no Criador
              </button>
            </div>
          </form>
        </div>
      </div>
    </ConsultancyAppShell>
  );
}
