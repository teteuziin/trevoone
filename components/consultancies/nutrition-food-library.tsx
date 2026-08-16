import Link from "next/link";
import { normalizeSearchText, type NutritionFoodListItemDto } from "@/lib/consultancies/nutrition";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

type Props = {
  consultancySlug: string;
  items: NutritionFoodListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  searchQuery: string;
};

function formatNumber(val: number, decimals: number = 1): string {
  if (!Number.isFinite(val)) return "0";
  return val.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function NutritionFoodLibrary({
  consultancySlug,
  items,
  total,
  page,
  pageSize,
  totalPages,
  searchQuery,
}: Props) {
  const normalizedQuery = normalizeSearchText(searchQuery);
  const isSearchApplied = normalizedQuery.length >= 2;
  const isShortQuery = normalizedQuery.length === 1;

  function getPageUrl(targetPage: number) {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    params.set("page", String(targetPage));
    return `/consultoria/${consultancySlug}/nutricao/alimentos?${params.toString()}`;
  }

  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Biblioteca de alimentos"
        description="Consulte alimentos e informações nutricionais disponíveis para esta consultoria."
        backHref={`/consultoria/${consultancySlug}`}
        backLabel="Voltar à visão geral"
      />

      {/* Search and Filters Bar */}
      <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3">
        <form method="GET" action={`/consultoria/${consultancySlug}/nutricao/alimentos`} className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <label htmlFor="food-search-input" className="sr-only">
                Buscar alimento por nome
              </label>
              <input
                id="food-search-input"
                name="q"
                type="text"
                defaultValue={searchQuery}
                placeholder="Buscar arroz, frango, banana..."
                aria-describedby={isShortQuery ? "short-query-hint" : undefined}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border-default)] focus-visible:outline-2 focus-visible:outline-[var(--brand)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] bg-[var(--surface)] transition-colors"
              />
              <svg
                className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white transition-colors cursor-pointer"
              >
                Buscar
              </button>
              {searchQuery && (
                <Link
                  href={`/consultoria/${consultancySlug}/nutricao/alimentos`}
                  className="w-full sm:w-auto px-3 py-2 text-sm font-medium text-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-hover)] border border-[var(--border-default)] rounded-lg transition-colors"
                >
                  Limpar
                </Link>
              )}
            </div>
          </div>

          {isShortQuery && (
            <p id="short-query-hint" className="text-xs text-[var(--text-secondary)]">
              Digite pelo menos 2 caracteres para buscar.
            </p>
          )}
        </form>

        {/* Dynamic Counter & Status */}
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-1 border-t border-[var(--border-subtle)]">
          <span>
            {total === 0
              ? isSearchApplied
                ? "Nenhum alimento encontrado"
                : "Nenhum alimento disponível"
              : `Exibindo ${startItem}–${endItem} de ${total} alimentos disponíveis`}
          </span>
          {isSearchApplied && (
            <span className="font-medium text-[var(--text-primary)]">
              Filtro: &ldquo;{searchQuery}&rdquo;
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      {items.length === 0 ? (
        isSearchApplied ? (
          <EmptyState
            title="Nenhum alimento encontrado"
            description={`Não encontramos nenhum alimento correspondente ao termo "${searchQuery}".`}
            action={
              <Link
                href={`/consultoria/${consultancySlug}/nutricao/alimentos`}
                className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] transition-colors"
              >
                Limpar busca
              </Link>
            }
          />
        ) : (
          <EmptyState
            title="Nenhum alimento disponível"
            description="Esta consultoria ainda não possui alimentos cadastrados na biblioteca."
          />
        )
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--surface-subtle)] text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  <th scope="col" className="py-3 px-4">Alimento</th>
                  <th scope="col" className="py-3 px-3">Referência</th>
                  <th scope="col" className="py-3 px-3 text-right">Energia</th>
                  <th scope="col" className="py-3 px-3 text-right">Proteína</th>
                  <th scope="col" className="py-3 px-3 text-right">Carboidrato</th>
                  <th scope="col" className="py-3 px-3 text-right">Gordura</th>
                  <th scope="col" className="py-3 px-3 text-center">Origem</th>
                  <th scope="col" className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-sm">
                {items.map((food) => (
                  <tr
                    key={food.publicId}
                    className="hover:bg-[var(--surface-hover)] transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-medium text-[var(--text-primary)]">
                      <div className="flex flex-col">
                        <Link
                          href={`/consultoria/${consultancySlug}/nutricao/alimentos/${food.publicId}`}
                          className="hover:text-[var(--brand)] transition-colors line-clamp-1"
                        >
                          {food.name}
                        </Link>
                        {food.category && (
                          <span className="text-xs text-[var(--text-secondary)] font-normal">
                            {food.category}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                      {food.referenceAmount} {food.referenceUnit.toLowerCase()}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-right font-semibold text-[var(--text-primary)] whitespace-nowrap">
                      {Math.round(food.caloriesKcal)} kcal
                    </td>
                    <td className="py-3.5 px-3 text-xs text-right text-[var(--text-primary)] whitespace-nowrap">
                      {formatNumber(food.proteinG)} g
                    </td>
                    <td className="py-3.5 px-3 text-xs text-right text-[var(--text-primary)] whitespace-nowrap">
                      {formatNumber(food.carbohydrateG)} g
                    </td>
                    <td className="py-3.5 px-3 text-xs text-right text-[var(--text-primary)] whitespace-nowrap">
                      {formatNumber(food.fatG)} g
                    </td>
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {food.sourceKey === "TACO" ? (
                        <Badge variant="neutral">TACO</Badge>
                      ) : (
                        <Badge variant="neutral">Manual</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/consultoria/${consultancySlug}/nutricao/alimentos/${food.publicId}`}
                        className="inline-flex items-center text-xs font-semibold text-[var(--brand)] hover:underline"
                      >
                        Detalhes →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {items.map((food) => (
              <div
                key={food.publicId}
                className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <Link
                      href={`/consultoria/${consultancySlug}/nutricao/alimentos/${food.publicId}`}
                      className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--brand)] transition-colors line-clamp-2"
                    >
                      {food.name}
                    </Link>
                    {food.category && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        {food.category}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {food.sourceKey === "TACO" ? (
                      <Badge variant="neutral">TACO</Badge>
                    ) : (
                      <Badge variant="neutral">Manual</Badge>
                    )}
                  </div>
                </div>

                {/* Macro summary pills */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[var(--border-subtle)] text-center text-xs">
                  <div className="bg-[var(--surface-subtle)] p-2 rounded-lg">
                    <p className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">kcal</p>
                    <p className="font-semibold text-[var(--text-primary)] mt-0.5">
                      {Math.round(food.caloriesKcal)}
                    </p>
                  </div>
                  <div className="bg-[var(--surface-subtle)] p-2 rounded-lg">
                    <p className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Prot</p>
                    <p className="font-medium text-[var(--text-primary)] mt-0.5">
                      {formatNumber(food.proteinG)}g
                    </p>
                  </div>
                  <div className="bg-[var(--surface-subtle)] p-2 rounded-lg">
                    <p className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Carb</p>
                    <p className="font-medium text-[var(--text-primary)] mt-0.5">
                      {formatNumber(food.carbohydrateG)}g
                    </p>
                  </div>
                  <div className="bg-[var(--surface-subtle)] p-2 rounded-lg">
                    <p className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Gord</p>
                    <p className="font-medium text-[var(--text-primary)] mt-0.5">
                      {formatNumber(food.fatG)}g
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[var(--text-secondary)]">
                    Por {food.referenceAmount} {food.referenceUnit.toLowerCase()}
                  </span>
                  <Link
                    href={`/consultoria/${consultancySlug}/nutricao/alimentos/${food.publicId}`}
                    className="font-semibold text-[var(--brand)] hover:underline"
                  >
                    Ver detalhes →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Navigation */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-xs text-[var(--text-secondary)]">
              <div>
                Página <span className="font-bold text-[var(--text-primary)]">{page}</span> de{" "}
                <span className="font-bold text-[var(--text-primary)]">{totalPages}</span>
              </div>

              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={getPageUrl(page - 1)}
                    className="px-3 py-1.5 font-semibold text-[var(--text-primary)] bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] border border-[var(--border-default)] rounded-lg transition-colors"
                  >
                    ← Anterior
                  </Link>
                ) : (
                  <span className="px-3 py-1.5 font-medium text-[var(--text-tertiary)] bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-lg opacity-50 cursor-not-allowed">
                    ← Anterior
                  </span>
                )}

                {page < totalPages ? (
                  <Link
                    href={getPageUrl(page + 1)}
                    className="px-3 py-1.5 font-semibold text-[var(--text-primary)] bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] border border-[var(--border-default)] rounded-lg transition-colors"
                  >
                    Próxima →
                  </Link>
                ) : (
                  <span className="px-3 py-1.5 font-medium text-[var(--text-tertiary)] bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-lg opacity-50 cursor-not-allowed">
                    Próxima →
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
