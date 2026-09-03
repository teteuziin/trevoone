import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { listExercisesForProfessional } from "@/lib/training-v2/exercise-repository";
import type { ExerciseStatus } from "@/lib/training-v2/types";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    tab?: string;
    q?: string;
    status?: string;
    muscle?: string;
    equipment?: string;
    page?: string;
  }>;
};

const COMMON_MUSCLES = [
  "Todos os Músculos",
  "Peitoral",
  "Dorsal",
  "Trapézio",
  "Deltoide Anterior",
  "Deltoide Lateral",
  "Deltoide Posterior",
  "Quadríceps",
  "Isquiotibiais",
  "Glúteos",
  "Panturrilhas",
  "Bíceps",
  "Tríceps",
  "Antebraço",
  "Abdômen",
  "Lombar",
  "Cardiorrespiratório",
];

const COMMON_EQUIPMENT = [
  "Todos os Equipamentos",
  "Halteres",
  "Barra",
  "Barra W",
  "Polia / Cabo",
  "Máquina Articulada",
  "Máquina com Placas",
  "Peso Corporal",
  "Elástico / Faixa",
  "Kettlebell",
  "Smith Machine",
  "Banco Regulável",
];

function getDifficultyBadge(diff: string) {
  switch (diff) {
    case "BEGINNER":
      return <Badge variant="neutral" size="sm">Iniciante</Badge>;
    case "INTERMEDIATE":
      return <Badge variant="brand" size="sm">Intermediário</Badge>;
    case "ADVANCED":
      return <Badge variant="warning" size="sm">Avançado</Badge>;
    default:
      return <Badge variant="neutral" size="sm">{diff}</Badge>;
  }
}

export default async function ConsultancyExercisesPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { tab = "TODOS", q, status, muscle, equipment, page } = await searchParams;

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

  const validStatus: ExerciseStatus | undefined =
    status === "DRAFT" || status === "PUBLISHED" || status === "ARCHIVED"
      ? (status as ExerciseStatus)
      : undefined;

  const parsedPage = Number(page);
  const currentPage = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  // Determine repository scope filter based on selected tab
  let repoScope: "ALL" | "GLOBAL" | "CONSULTANCY" = "ALL";
  if (tab === "TREVO_ONE") {
    repoScope = "GLOBAL";
  } else if (tab === "CONSULTORIA" || tab === "MEUS") {
    repoScope = "CONSULTANCY";
  }

  const result = await listExercisesForProfessional(ctx, {
    scope: repoScope,
    status: validStatus,
    query: q || undefined,
    muscleGroup: muscle && muscle !== "Todos os Músculos" ? muscle : undefined,
    equipment: equipment && equipment !== "Todos os Equipamentos" ? equipment : undefined,
    page: currentPage,
    pageSize: 25,
  });

  // Filter items specifically for the tab semantics if needed
  let displayItems = result.items;
  if (tab === "CONSULTORIA") {
    // Shared exercises only
    displayItems = displayItems.filter((i) => i.scope === "CONSULTANCY" && i.visibility === "CONSULTANCY");
  } else if (tab === "MEUS") {
    // Creator only exercises
    displayItems = displayItems.filter((i) => i.scope === "CONSULTANCY" && i.visibility === "CREATOR_ONLY");
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
      <div className="w-full max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Biblioteca de Exercícios"
          description="Consulte o acervo oficial Trevo One e gerencie os exercícios exclusivos da sua consultoria."
          backHref={`/consultoria/${slug}`}
          backLabel="Início da Consultoria"
          actions={
            <Link href={`/consultoria/${slug}/exercicios/novo`}>
              <Button variant="primary" size="sm" className="font-bold">
                + Novo Exercício
              </Button>
            </Link>
          }
        />

        {/* Source Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-2xl">
          {[
            { id: "TODOS", label: "Todos" },
            { id: "TREVO_ONE", label: "Trevo One" },
            { id: "CONSULTORIA", label: "Minha Consultoria" },
            {
              id: "MEUS",
              label: context.roles.includes("CONSULTANCY_ADMIN") && !context.roles.includes("PERSONAL")
                ? "Privados (Supervisão)"
                : "Só para mim",
            },
          ].map((t) => {
            const isSelected = tab === t.id;
            return (
              <Link
                key={t.id}
                href={`/consultoria/${slug}/exercicios?tab=${t.id}${q ? `&q=${encodeURIComponent(q)}` : ""}${
                  muscle ? `&muscle=${encodeURIComponent(muscle)}` : ""
                }${equipment ? `&equipment=${encodeURIComponent(equipment)}` : ""}`}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all select-none ${
                  isSelected
                    ? "bg-[var(--surface)] text-[var(--brand-foreground)] shadow-xs font-bold border border-[var(--border-default)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* Filters Bar */}
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input type="hidden" name="tab" value={tab} />

            <div>
              <label htmlFor="search-input" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Buscar por nome
              </label>
              <input
                id="search-input"
                name="q"
                defaultValue={q || ""}
                placeholder="Ex: Supino, Agachamento..."
                className="w-full h-10 px-3 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl text-sm placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--brand)]"
              />
            </div>

            <div>
              <label htmlFor="muscle-select" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Grupo muscular
              </label>
              <select
                id="muscle-select"
                name="muscle"
                defaultValue={muscle || "Todos os Músculos"}
                className="w-full h-10 px-3 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl text-sm outline-none focus:border-[var(--brand)]"
              >
                {COMMON_MUSCLES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="equipment-select" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Equipamento
              </label>
              <select
                id="equipment-select"
                name="equipment"
                defaultValue={equipment || "Todos os Equipamentos"}
                className="w-full h-10 px-3 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl text-sm outline-none focus:border-[var(--brand)]"
              >
                {COMMON_EQUIPMENT.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 pt-1">
              <Link href={`/consultoria/${slug}/exercicios?tab=${tab}`}>
                <Button type="button" variant="ghost" size="sm" className="text-xs">
                  Limpar filtros
                </Button>
              </Link>
              <Button type="submit" variant="secondary" size="sm" className="text-xs font-semibold">
                Aplicar filtros
              </Button>
            </div>
          </form>
        </div>

        {/* Exercises List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
            <span>
              Mostrando {displayItems.length} exercício{displayItems.length === 1 ? "" : "s"}
            </span>
          </div>

          {displayItems.length === 0 ? (
            <EmptyState
              title="Nenhum exercício encontrado"
              description={
                q || muscle || equipment
                  ? "Tente ajustar os filtros ou termos da sua busca."
                  : tab === "MEUS"
                  ? "Você ainda não criou nenhum exercício privado. Clique em '+ Novo Exercício' para cadastrar."
                  : "Nenhum exercício disponível nesta seção."
              }
              action={
                <Link href={`/consultoria/${slug}/exercicios/novo`}>
                  <Button variant="primary" size="sm" className="font-bold">
                    Cadastrar exercício
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {displayItems.map((ex) => {
                const isGlobal = ex.scope === "GLOBAL";
                const isShared = ex.scope === "CONSULTANCY" && ex.visibility === "CONSULTANCY";
                const isPrivate = ex.scope === "CONSULTANCY" && ex.visibility === "CREATOR_ONLY";

                // Edit permissions: Global is never editable here. Consultancy is editable by creator or admin.
                const canEditThis = !isGlobal && (ctx.canManageConsultancy || isPrivate);

                const hasVideo = ex.media?.some((m) => m.role === "EXECUTION_VIDEO");
                const hasImage = ex.media?.some((m) => m.role === "START_IMAGE");

                return (
                  <div
                    key={ex.publicId}
                    className="bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] rounded-2xl p-4 sm:p-5 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/consultoria/${slug}/exercicios/${ex.publicId}`}
                          className="text-base font-bold text-[var(--text-primary)] hover:text-[var(--brand-foreground)] transition-colors truncate"
                        >
                          {ex.name}
                        </Link>

                        {/* Source Badges per Section 40 */}
                        {isGlobal && (
                          <Badge variant="brand" size="sm" className="text-[10px] font-bold">
                            Trevo One
                          </Badge>
                        )}
                        {isShared && (
                          <Badge variant="info" size="sm" className="text-[10px] font-bold">
                            Minha Consultoria
                          </Badge>
                        )}
                        {isPrivate && (
                          <Badge variant="neutral" size="sm" className="text-[10px]">
                            Só para mim
                          </Badge>
                        )}

                        {getDifficultyBadge(ex.difficultyLevel)}

                        {ex.status === "DRAFT" && (
                          <Badge variant="warning" size="sm" className="text-[10px]">
                            Rascunho
                          </Badge>
                        )}
                        {ex.status === "ARCHIVED" && (
                          <Badge variant="neutral" size="sm" className="text-[10px]">
                            Arquivado
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {ex.muscleGroupPrimary}
                        </span>
                        <span>•</span>
                        <span>{ex.equipment}</span>
                        {ex.movementPattern && (
                          <>
                            <span>•</span>
                            <span className="text-[var(--text-tertiary)]">
                              {ex.movementPattern}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Media indicators */}
                      <div className="flex items-center gap-3 pt-1 text-[11px]">
                        <span className="flex items-center gap-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              hasImage ? "bg-[var(--brand)]" : "bg-[var(--border-strong)]"
                            }`}
                          />
                          <span className={hasImage ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-tertiary)]"}>
                            {hasImage ? "Foto inicial" : "Sem foto"}
                          </span>
                        </span>

                        <span className="flex items-center gap-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              hasVideo ? "bg-[var(--brand)]" : "bg-[var(--border-strong)]"
                            }`}
                          />
                          <span className={hasVideo ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-tertiary)]"}>
                            {hasVideo ? "Vídeo anexado" : "Sem vídeo"}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                      <Link href={`/consultoria/${slug}/exercicios/${ex.publicId}`}>
                        <Button
                          variant={canEditThis ? "secondary" : "ghost"}
                          size="sm"
                          className="text-xs font-semibold"
                        >
                          {canEditThis ? "Editar e Mídias" : "Visualizar"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {result.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)] text-xs">
              <span className="text-[var(--text-secondary)]">
                Página {currentPage} de {result.totalPages}
              </span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Link
                    href={`/consultoria/${slug}/exercicios?page=${currentPage - 1}&tab=${tab}${
                      q ? `&q=${encodeURIComponent(q)}` : ""
                    }${muscle ? `&muscle=${encodeURIComponent(muscle)}` : ""}${
                      equipment ? `&equipment=${encodeURIComponent(equipment)}` : ""
                    }`}
                  >
                    <Button variant="secondary" size="sm" className="text-xs">
                      Anterior
                    </Button>
                  </Link>
                )}
                {currentPage < result.totalPages && (
                  <Link
                    href={`/consultoria/${slug}/exercicios?page=${currentPage + 1}&tab=${tab}${
                      q ? `&q=${encodeURIComponent(q)}` : ""
                    }${muscle ? `&muscle=${encodeURIComponent(muscle)}` : ""}${
                      equipment ? `&equipment=${encodeURIComponent(equipment)}` : ""
                    }`}
                  >
                    <Button variant="secondary" size="sm" className="text-xs">
                      Próxima
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ConsultancyAppShell>
  );
}
