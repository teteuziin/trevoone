import { NutritionTemplatesButton } from "@/components/consultancies/nutrition-v2/nutrition-templates-button";
import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import { listPlansForConsultancy } from "@/lib/nutrition-v2/plan-repository";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PlanosV2PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14m-7-7h14" />
    </svg>
  );
}

function MealPlanIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default async function PlanosV2Page({ params, searchParams }: PlanosV2PageProps) {
  const { slug } = await params;
  const { page: pageStr, q: query } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?returnUrl=/consultoria/${slug}/planos-v2`);
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  const ctx = await resolveNutritionAccessContext(slug);
  if (!ctx || !ctx.canAuthorNutrition) {
    notFound();
  }

  const { items, totalPages } = await listPlansForConsultancy(ctx, {
    page,
    query,
  });

  return (
    <ConsultancyAppShell
      consultancyName={context?.consultancyName || ctx.consultancySlug || slug}
      consultancySlug={context?.consultancySlug || ctx.consultancySlug || slug}
      consultancyLogoUrl={context?.consultancyLogoUrl}
      roles={context?.roles || ctx.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header Cockpit */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
                Nutrição Clínica
              </span>
              <Badge variant="brand" size="sm">
                Prescrição
              </Badge>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Planos Alimentares
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-xl">
              Editor profissional de cardápios com snapshots de versão, porções de referência e substituições.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <NutritionTemplatesButton consultancySlug={slug} />
            <Link href={`/consultoria/${slug}/planos-v2/novo`} className="shrink-0">
              <Button variant="primary" size="md" className="font-bold min-h-[44px] shadow-sm">
                <PlusIcon className="w-4 h-4 mr-1.5" />
                <span>Novo Plano</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 sm:p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs">
          <form method="GET" action={`/consultoria/${slug}/planos-v2`} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
              <input
                type="search"
                name="q"
                defaultValue={query || ""}
                placeholder="Buscar por título do plano..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
              />
            </div>
            <Button type="submit" variant="secondary" size="md" className="font-semibold px-4 min-h-[42px]">
              Buscar
            </Button>
            {query && (
              <Link href={`/consultoria/${slug}/planos-v2`}>
                <Button variant="ghost" size="md" className="font-semibold px-3 min-h-[42px]">
                  Limpar
                </Button>
              </Link>
            )}
          </form>
        </div>

        {/* Plan List */}
        {items.length === 0 ? (
          <div className="p-10 sm:p-12 text-center rounded-2xl sm:rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--surface)] space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] flex items-center justify-center mx-auto shadow-2xs">
              <MealPlanIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Nenhum plano alimentar encontrado
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {query
                  ? `Nenhum plano corresponde ao termo "${query}".`
                  : "Crie um plano alimentar para montar refeições, alimentos, porções e substituições."}
              </p>
            </div>
            <Link href={`/consultoria/${slug}/planos-v2/novo`}>
              <Button variant="primary" size="sm" className="font-semibold min-h-[44px]">
                <PlusIcon className="w-4 h-4 mr-1.5" />
                <span>Criar Primeiro Plano</span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((plan) => (
              <div
                key={plan.publicId}
                className="p-5 sm:p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] transition-all flex flex-col justify-between gap-4 depth-surface"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-base sm:text-lg text-[var(--text-primary)] leading-snug">
                      {plan.currentVersion?.title || "Plano sem título"}
                    </h3>
                    <Badge
                      variant={
                        plan.currentVersion?.status === "PUBLISHED"
                          ? "success"
                          : plan.currentVersion?.status === "DRAFT"
                          ? "warning"
                          : "neutral"
                      }
                      size="sm"
                    >
                      {plan.currentVersion?.status === "DRAFT"
                        ? `V${plan.currentVersion.versionNumber} · Rascunho`
                        : plan.currentVersion?.status === "PUBLISHED"
                        ? `V${plan.currentVersion.versionNumber} · Publicada`
                        : `V${plan.currentVersion?.versionNumber || 1} · Arquivada`}
                    </Badge>
                  </div>

                  {plan.currentVersion?.subtitle && (
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                      {plan.currentVersion.subtitle}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1 text-[11px] text-[var(--text-tertiary)] font-medium">
                    <span>
                      Atualizado em {new Date(plan.updatedAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-[var(--border-subtle)]">
                  <Link href={`/consultoria/${slug}/planos-v2/${plan.publicId}`}>
                    <Button variant="secondary" size="sm" className="font-semibold text-xs min-h-[38px] group">
                      <span>Abrir Editor</span>
                      <ChevronRightIcon className="w-3.5 h-3.5 ml-1 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-all" />
                    </Button>
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
              href={`/consultoria/${slug}/planos-v2?page=${page - 1}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
              className={page <= 1 ? "pointer-events-none opacity-40" : ""}
            >
              <Button variant="secondary" size="sm" disabled={page <= 1} className="min-h-[36px]">
                Anterior
              </Button>
            </Link>
            <span className="text-xs text-[var(--text-secondary)] font-medium px-2">
              Página {page} de {totalPages}
            </span>
            <Link
              href={`/consultoria/${slug}/planos-v2?page=${page + 1}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
              className={page >= totalPages ? "pointer-events-none opacity-40" : ""}
            >
              <Button variant="secondary" size="sm" disabled={page >= totalPages} className="min-h-[36px]">
                Próxima
              </Button>
            </Link>
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
