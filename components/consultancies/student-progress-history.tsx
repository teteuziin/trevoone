import React from "react";
import Link from "next/link";
import type {
  StudentProgressEntryDto,
  ProgressPaginationDto,
} from "@/lib/consultancies/progress";

type Props = {
  entries: StudentProgressEntryDto[];
  pagination?: ProgressPaginationDto;
  latestEntry?: StudentProgressEntryDto | null;
  basePath: string;
  emptyMessage?: string;
};

function formatMeasurement(val: number | null, unit: string): string | null {
  if (val === null || val === undefined) {
    return null;
  }
  return `${val.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ${unit}`;
}

function formatDateDisplay(isoDate: string): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function StudentProgressHistory({
  entries,
  pagination,
  latestEntry,
  basePath,
  emptyMessage = "Nenhum registro de evolução encontrado. Quando a primeira medição for registrada, ela aparecerá aqui.",
}: Props) {
  const totalCount = pagination ? pagination.totalItems : entries.length;

  if (totalCount === 0 || entries.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          Sem histórico de medições
        </h3>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Latest Entry Highlight (Shown only when latestEntry is provided, i.e. on page 1) */}
      {latestEntry && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded">
                Última Medição
              </span>
              <span className="text-xs text-[var(--text-secondary)] font-medium">
                {formatDateDisplay(latestEntry.recordedOn)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
            {latestEntry.weightKg !== null && (
              <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border-subtle)] space-y-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
                  Peso
                </span>
                <span className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  {formatMeasurement(latestEntry.weightKg, "kg")}
                </span>
              </div>
            )}

            {latestEntry.waistCm !== null && (
              <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border-subtle)] space-y-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
                  Cintura
                </span>
                <span className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  {formatMeasurement(latestEntry.waistCm, "cm")}
                </span>
              </div>
            )}

            {latestEntry.abdomenCm !== null && (
              <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border-subtle)] space-y-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
                  Abdômen
                </span>
                <span className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  {formatMeasurement(latestEntry.abdomenCm, "cm")}
                </span>
              </div>
            )}

            {latestEntry.hipCm !== null && (
              <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border-subtle)] space-y-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
                  Quadril
                </span>
                <span className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  {formatMeasurement(latestEntry.hipCm, "cm")}
                </span>
              </div>
            )}

            {latestEntry.armCm !== null && (
              <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border-subtle)] space-y-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
                  Braço
                </span>
                <span className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  {formatMeasurement(latestEntry.armCm, "cm")}
                </span>
              </div>
            )}

            {latestEntry.thighCm !== null && (
              <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border-subtle)] space-y-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
                  Coxa
                </span>
                <span className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  {formatMeasurement(latestEntry.thighCm, "cm")}
                </span>
              </div>
            )}
          </div>

          {latestEntry.note && (
            <p className="text-xs text-[var(--text-secondary)] italic pt-1">
              &ldquo;{latestEntry.note}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Historical Entries Timeline / Cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] px-1">
          Histórico Completo ({totalCount})
        </h3>

        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <div
              key={entry.publicId || `entry-${idx}`}
              className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[var(--border-subtle)] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[var(--text-primary)] font-mono">
                    {formatDateDisplay(entry.recordedOn)}
                  </span>
                  {entry.createdByName && (
                    <span className="text-xs text-[var(--text-tertiary)]">
                      • Registrado por {entry.createdByName}
                    </span>
                  )}
                </div>
              </div>

              {/* Measurements Tags / Values */}
              <div className="flex flex-wrap gap-2 pt-1">
                {entry.weightKg !== null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                    <strong className="font-medium text-[var(--text-secondary)]">Peso:</strong>{" "}
                    {formatMeasurement(entry.weightKg, "kg")}
                  </span>
                )}
                {entry.waistCm !== null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--background)] text-[var(--text-primary)] border border-[var(--border-default)]">
                    <strong className="font-medium text-[var(--text-secondary)]">Cintura:</strong>{" "}
                    {formatMeasurement(entry.waistCm, "cm")}
                  </span>
                )}
                {entry.abdomenCm !== null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--background)] text-[var(--text-primary)] border border-[var(--border-default)]">
                    <strong className="font-medium text-[var(--text-secondary)]">Abdômen:</strong>{" "}
                    {formatMeasurement(entry.abdomenCm, "cm")}
                  </span>
                )}
                {entry.hipCm !== null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--background)] text-[var(--text-primary)] border border-[var(--border-default)]">
                    <strong className="font-medium text-[var(--text-secondary)]">Quadril:</strong>{" "}
                    {formatMeasurement(entry.hipCm, "cm")}
                  </span>
                )}
                {entry.armCm !== null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--background)] text-[var(--text-primary)] border border-[var(--border-default)]">
                    <strong className="font-medium text-[var(--text-secondary)]">Braço:</strong>{" "}
                    {formatMeasurement(entry.armCm, "cm")}
                  </span>
                )}
                {entry.thighCm !== null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--background)] text-[var(--text-primary)] border border-[var(--border-default)]">
                    <strong className="font-medium text-[var(--text-secondary)]">Coxa:</strong>{" "}
                    {formatMeasurement(entry.thighCm, "cm")}
                  </span>
                )}
              </div>

              {entry.note && (
                <p className="text-xs text-[var(--text-secondary)] italic pt-0.5">
                  &ldquo;{entry.note}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Server-side Pagination Pager */}
        {pagination && pagination.totalPages > 1 && (
          <nav
            aria-label="Paginação do histórico de evolução"
            className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--border-subtle)]"
          >
            <div>
              {pagination.hasPrevious ? (
                <Link
                  href={pagination.page === 2 ? basePath : `${basePath}?page=${pagination.page - 1}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] transition-colors shadow-2xs cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Anterior
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] opacity-50 cursor-not-allowed select-none"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Anterior
                </span>
              )}
            </div>

            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Página <span className="text-[var(--text-primary)] font-bold">{pagination.page}</span> de{" "}
              <span className="text-[var(--text-primary)] font-bold">{pagination.totalPages}</span>
            </span>

            <div>
              {pagination.hasNext ? (
                <Link
                  href={`${basePath}?page=${pagination.page + 1}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] transition-colors shadow-2xs cursor-pointer"
                >
                  Próxima
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] opacity-50 cursor-not-allowed select-none"
                >
                  Próxima
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              )}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
