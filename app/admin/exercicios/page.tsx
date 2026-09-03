import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { listExercisesForProfessional } from "@/lib/training-v2/exercise-repository";
import type { ExerciseStatus } from "@/lib/training-v2/types";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type PageProps = {
  searchParams: Promise<{
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

function getStatusBadge(st: string) {
  switch (st) {
    case "PUBLISHED":
      return <Badge variant="success" size="sm">Publicado</Badge>;
    case "DRAFT":
      return <Badge variant="warning" size="sm">Rascunho</Badge>;
    case "ARCHIVED":
      return <Badge variant="neutral" size="sm">Arquivado</Badge>;
    default:
      return <Badge variant="neutral" size="sm">{st}</Badge>;
  }
}

export default async function AdminExercisesPage({ searchParams }: PageProps) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);
  if (!isPlatformAdmin) {
    redirect("/selecionar-consultoria");
  }

  const ctx = await resolveTrainingAccessContext(null);
  if (!ctx || !ctx.canManageGlobal) {
    redirect("/selecionar-consultoria");
  }

  const { q, status, muscle, equipment, page } = await searchParams;

  const validStatus: ExerciseStatus | undefined =
    status === "DRAFT" || status === "PUBLISHED" || status === "ARCHIVED"
      ? (status as ExerciseStatus)
      : undefined;

  const parsedPage = Number(page);
  const currentPage = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  const result = await listExercisesForProfessional(ctx, {
    scope: "GLOBAL",
    status: validStatus,
    query: q || undefined,
    muscleGroup: muscle && muscle !== "Todos os Músculos" ? muscle : undefined,
    equipment: equipment && equipment !== "Todos os Equipamentos" ? equipment : undefined,
    page: currentPage,
    pageSize: 25,
  });

  const { items, total, totalPages } = result;

  return (
    <div className="w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <PageHeader
          title="Biblioteca Oficial de Exercícios"
          description="Gerencie o catálogo oficial global, parâmetros biomecânicos e mídias da Trevo One."
          backHref="/admin"
          backLabel="Painel de Governança"
          actions={
            <Link href="/admin/exercicios/novo">
              <Button variant="primary" size="sm" className="font-bold">
                + Novo Exercício
              </Button>
            </Link>
          }
        />

        {/* Filter Bar */}
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
              <label htmlFor="status-select" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Status
              </label>
              <select
                id="status-select"
                name="status"
                defaultValue={status || "ALL"}
                className="w-full h-10 px-3 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl text-sm outline-none focus:border-[var(--brand)]"
              >
                <option value="ALL">Todos os status</option>
                <option value="DRAFT">Apenas Rascunhos</option>
                <option value="PUBLISHED">Apenas Publicados</option>
                <option value="ARCHIVED">Apenas Arquivados</option>
              </select>
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

            <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-1">
              <Link href="/admin/exercicios">
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
              Mostrando {items.length} de {total} exercício{total === 1 ? "" : "s"} oficiais
            </span>
          </div>

          {items.length === 0 ? (
            <EmptyState
              title="Nenhum exercício oficial encontrado"
              description={
                q || status || muscle || equipment
                  ? "Tente ajustar os termos de pesquisa ou filtros selecionados."
                  : "Cadastre o primeiro exercício da biblioteca global oficial Trevo One."
              }
              action={
                <Link href="/admin/exercicios/novo">
                  <Button variant="primary" size="sm" className="font-bold">
                    Adicionar primeiro exercício
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {items.map((ex) => {
                const hasVideo = ex.media.some((m) => m.role === "EXECUTION_VIDEO");
                const hasImage = ex.media.some((m) => m.role === "START_IMAGE");

                return (
                  <div
                    key={ex.publicId}
                    className="bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] rounded-2xl p-4 sm:p-5 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/exercicios/${ex.publicId}`}
                          className="text-base font-bold text-[var(--text-primary)] hover:text-[var(--brand-foreground)] transition-colors truncate"
                        >
                          {ex.name}
                        </Link>
                        {getStatusBadge(ex.status)}
                        {getDifficultyBadge(ex.difficultyLevel)}
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
                            {hasImage ? "Foto inicial anexada" : "Sem foto inicial"}
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
                      <Link href={`/admin/exercicios/${ex.publicId}`}>
                        <Button variant="secondary" size="sm" className="text-xs font-semibold">
                          Editar e Mídias
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)] text-xs">
              <span className="text-[var(--text-secondary)]">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Link
                    href={`/admin/exercicios?page=${currentPage - 1}${
                      q ? `&q=${encodeURIComponent(q)}` : ""
                    }${status ? `&status=${status}` : ""}${
                      muscle ? `&muscle=${encodeURIComponent(muscle)}` : ""
                    }${equipment ? `&equipment=${encodeURIComponent(equipment)}` : ""}`}
                  >
                    <Button variant="secondary" size="sm" className="text-xs">
                      Anterior
                    </Button>
                  </Link>
                )}
                {currentPage < totalPages && (
                  <Link
                    href={`/admin/exercicios?page=${currentPage + 1}${
                      q ? `&q=${encodeURIComponent(q)}` : ""
                    }${status ? `&status=${status}` : ""}${
                      muscle ? `&muscle=${encodeURIComponent(muscle)}` : ""
                    }${equipment ? `&equipment=${encodeURIComponent(equipment)}` : ""}`}
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
    </div>
  );
}
