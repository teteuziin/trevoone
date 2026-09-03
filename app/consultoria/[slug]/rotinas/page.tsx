import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { listWorkoutsForProfessional } from "@/lib/training-v2/workout-repository";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";

function Plus({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function Search({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
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

function Calendar({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function Clock({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Layers({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="2 12 12 17 22 12" strokeLinecap="round" strokeLinejoin="round" />
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

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
};

export default async function ConsultancyWorkoutsPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { q, status = "ALL", page = "1" } = await searchParams;

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

  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const validStatus =
    status === "DRAFT" || status === "PUBLISHED" || status === "ARCHIVED" ? status : "ALL";

  const { items, total, limit } = await listWorkoutsForProfessional(ctx, {
    query: q,
    status: validStatus,
    page: currentPage,
    limit: 18,
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--primary-subtle)] text-[var(--primary)]">
                <Sparkles className="w-3.5 h-3.5" />
                Criador de Treinos
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
              Rotinas de Treino
            </h1>
            <p className="text-sm text-[var(--foreground-muted)] mt-1">
              Estruture treinos modulares por blocos, exercícios da biblioteca ou personalizados.
            </p>
          </div>

          <Link
            href={`/consultoria/${slug}/rotinas/novo`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Novo treino
          </Link>
        </div>

        {/* Filter bar */}
        <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <form method="GET" className="relative flex-1">
              <input type="hidden" name="status" value={validStatus} />
              <Search className="w-4 h-4 text-[var(--foreground-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="q"
                defaultValue={q || ""}
                placeholder="Buscar por título do treino..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
              />
            </form>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: "ALL", label: "Todos" },
                { id: "DRAFT", label: "Rascunhos" },
                { id: "PUBLISHED", label: "Publicados" },
                { id: "ARCHIVED", label: "Arquivados" },
              ].map((tab) => {
                const isActive = validStatus === tab.id;
                const url = new URL(`http://localhost/consultoria/${slug}/rotinas`);
                if (q) url.searchParams.set("q", q);
                if (tab.id !== "ALL") url.searchParams.set("status", tab.id);

                return (
                  <Link
                    key={tab.id}
                    href={url.pathname + url.search}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? "bg-[var(--primary)] text-white shadow-xs"
                        : "text-[var(--foreground-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Workouts Grid */}
        {items.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[var(--surface-subtle)] flex items-center justify-center mx-auto text-[var(--foreground-muted)] mb-4">
              <Dumbbell className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-[var(--foreground)]">
              {q || validStatus !== "ALL"
                ? "Nenhum treino encontrado para os filtros informados."
                : "Você ainda não possui rotinas criadas."}
            </h3>
            <p className="text-sm text-[var(--foreground-muted)] max-w-md mx-auto mt-1 mb-5">
              {q || validStatus !== "ALL"
                ? "Tente ajustar sua busca ou limpar os filtros de status."
                : "Comece agora criando seu primeiro treino modular baseado em blocos."}
            </p>
            <Link
              href={`/consultoria/${slug}/rotinas/novo`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Criar primeiro treino
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((w) => {
              const isDraft = w.currentVersionStatus === "DRAFT";
              const isPublished = w.currentVersionStatus === "PUBLISHED";
              const isArchived = w.status === "ARCHIVED" || w.currentVersionStatus === "ARCHIVED";

              return (
                <div
                  key={w.publicId}
                  className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--border-subtle)] hover:shadow-sm transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold text-[var(--foreground)] line-clamp-1">
                        {w.title}
                      </h3>
                      {isDraft && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                          Rascunho
                        </span>
                      )}
                      {isPublished && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                          Publicado
                        </span>
                      )}
                      {isArchived && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20 shrink-0">
                          Arquivado
                        </span>
                      )}
                    </div>

                    {w.objective && (
                      <p className="text-xs text-[var(--foreground-muted)] line-clamp-2">
                        {w.objective}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-[var(--foreground-muted)]">
                      {w.estimatedDurationMinutes != null && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          ~{w.estimatedDurationMinutes} min
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        {w.blocksCount} {w.blocksCount === 1 ? "bloco" : "blocos"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(w.updatedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[var(--foreground-muted)]">
                      {w.difficultyLevel === "BEGINNER"
                        ? "Iniciante"
                        : w.difficultyLevel === "ADVANCED"
                        ? "Avançado"
                        : "Intermediário"}
                    </span>
                    <Link
                      href={`/consultoria/${slug}/rotinas/${w.publicId}`}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-[var(--surface-subtle)] hover:bg-[var(--surface-sunken)] text-[var(--foreground)] border border-[var(--border-default)] transition-colors"
                    >
                      Abrir no Criador
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              const url = new URL(`http://localhost/consultoria/${slug}/rotinas`);
              if (q) url.searchParams.set("q", q);
              if (validStatus !== "ALL") url.searchParams.set("status", validStatus);
              url.searchParams.set("page", String(p));

              return (
                <Link
                  key={p}
                  href={url.pathname + url.search}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-medium transition-colors ${
                    currentPage === p
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--surface)] text-[var(--foreground-muted)] border border-[var(--border-default)] hover:bg-[var(--surface-subtle)]"
                  }`}
                >
                  {p}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
