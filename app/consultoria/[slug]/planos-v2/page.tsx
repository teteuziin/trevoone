import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import { listPlansForConsultancy } from "@/lib/nutrition-v2/plan-repository";

interface PlanosV2PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function PlanosV2Page({ params, searchParams }: PlanosV2PageProps) {
  const { slug } = await params;
  const { page: pageStr, q: query } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const ctx = await resolveNutritionAccessContext(slug);
  if (!ctx) {
    redirect(`/login?returnUrl=/consultoria/${slug}/planos-v2`);
  }

  if (!ctx.canAuthorNutrition) {
    notFound();
  }

  const { items, totalPages } = await listPlansForConsultancy(ctx, {
    page,
    query,
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Planos Alimentares
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Editor profissional de prescrições nutricionais com snapshots históricos e porções.
          </p>
        </div>

        <Link
          href={`/consultoria/${slug}/planos-v2/novo`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Criar Novo Plano</span>
        </Link>
      </div>

      {/* Plan list */}
      {items.length === 0 ? (
        <div className="text-center py-20 px-4 bg-[var(--surface-primary)] border border-dashed border-[var(--border)] rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Nenhum plano alimentar criado
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Crie um plano alimentar para montar refeições, alimentos, porções e substituições.
          </p>
          <Link
            href={`/consultoria/${slug}/planos-v2/novo`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--brand-primary)] text-white hover:opacity-90 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Criar Primeiro Plano</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((plan) => (
            <div
              key={plan.publicId}
              className="p-5 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border)] shadow-sm hover:border-[var(--brand-primary)]/50 transition-colors flex flex-col justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-[var(--text-primary)] leading-snug">
                    {plan.currentVersion?.title || "Plano sem título"}
                  </h3>
                  {plan.currentVersion?.status === "DRAFT" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shrink-0">
                      V{plan.currentVersion.versionNumber} · Rascunho
                    </span>
                  ) : plan.currentVersion?.status === "PUBLISHED" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      V{plan.currentVersion.versionNumber} · Publicada
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20 shrink-0">
                      V{plan.currentVersion?.versionNumber || 1} · Arquivada
                    </span>
                  )}
                </div>
                {plan.currentVersion?.subtitle && (
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                    {plan.currentVersion.subtitle}
                  </p>
                )}
                <p className="text-[11px] text-[var(--text-muted)] pt-1">
                  Atualizado em: {new Date(plan.updatedAt).toLocaleDateString("pt-BR")}
                </p>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-[var(--border)]">
                <Link
                  href={`/consultoria/${slug}/planos-v2/${plan.publicId}`}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--brand-primary)] text-white hover:opacity-90 shadow-sm inline-flex items-center gap-1.5"
                >
                  <span>Abrir Editor</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Link
            href={`/consultoria/${slug}/planos-v2?page=${page - 1}`}
            className={`px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] ${
              page <= 1 ? "pointer-events-none opacity-40" : ""
            }`}
          >
            Anterior
          </Link>
          <span className="text-xs text-[var(--text-muted)] font-medium">
            {page} / {totalPages}
          </span>
          <Link
            href={`/consultoria/${slug}/planos-v2?page=${page + 1}`}
            className={`px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] ${
              page >= totalPages ? "pointer-events-none opacity-40" : ""
            }`}
          >
            Próxima
          </Link>
        </div>
      )}
    </div>
  );
}
