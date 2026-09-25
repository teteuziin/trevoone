import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import { listPatientsForConsultancy } from "@/lib/nutrition-v2/patient-record-repository";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProntuarioIndexPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
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

function UserIcon({ className = "w-5 h-5" }: { className?: string }) {
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
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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

export default async function ProntuarioIndexPage({
  params,
  searchParams,
}: ProntuarioIndexPageProps) {
  const { slug } = await params;
  const { q: query } = await searchParams;

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?returnUrl=/consultoria/${slug}/planos-v2/prontuario`);
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  const ctx = await resolveNutritionAccessContext(slug);
  if (!ctx || !ctx.canAuthorNutrition || !ctx.consultancyId) {
    notFound();
  }

  const patients = await listPatientsForConsultancy(ctx.consultancyId, query);

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
                Nutrição Clínica V2
              </span>
              <Badge variant="brand" size="sm">
                Prontuários
              </Badge>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Prontuário dos Pacientes
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-xl">
              Histórico clínico, rastreamento antropométrico, dados de gestação e integração segura com anamnese.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <Link href={`/consultoria/${slug}/planos-v2`} className="shrink-0">
              <Button variant="secondary" size="md" className="font-bold min-h-[44px]">
                Voltar aos Planos
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 sm:p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs">
          <form method="GET" action={`/consultoria/${slug}/planos-v2/prontuario`} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
              <input
                type="search"
                name="q"
                defaultValue={query || ""}
                placeholder="Buscar por nome ou e-mail do paciente..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
              />
            </div>
            <Button type="submit" variant="secondary" size="md" className="font-semibold px-4 min-h-[42px]">
              Buscar
            </Button>
            {query && (
              <Link href={`/consultoria/${slug}/planos-v2/prontuario`}>
                <Button variant="ghost" size="md" className="font-semibold px-3 min-h-[42px]">
                  Limpar
                </Button>
              </Link>
            )}
          </form>
        </div>

        {/* Patient List */}
        {patients.length === 0 ? (
          <div className="p-10 sm:p-12 text-center rounded-2xl sm:rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--surface)] space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] flex items-center justify-center mx-auto shadow-2xs">
              <UserIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Nenhum paciente encontrado
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {query
                  ? `Nenhum paciente corresponde ao termo "${query}".`
                  : "Não há alunos ativos vinculados a esta consultoria no momento."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {patients.map((p) => {
              return (
                <Link
                  key={p.studentPublicId}
                  href={`/consultoria/${slug}/planos-v2/prontuario/${p.studentPublicId}`}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-subtle)] transition-all shadow-xs gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center shrink-0 font-bold text-sm">
                      {p.fullName ? p.fullName.charAt(0).toUpperCase() : "P"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                          {p.fullName || "Paciente sem nome"}
                        </span>
                        {p.pregnancyStatus === "PREGNANT" && (
                          <Badge variant="brand" size="sm">
                            Gestante
                          </Badge>
                        )}
                        {p.pregnancyStatus === "POSTPARTUM" && (
                          <Badge variant="warning" size="sm">
                            Pós-Parto
                          </Badge>
                        )}
                        {p.hasOnboarding && (
                          <Badge variant="neutral" size="sm">
                            Anamnese vinculada
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">
                        {p.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-subtle)]">
                    <div className="text-left sm:text-right">
                      {p.lastRecordedWeightKg !== null ? (
                        <div>
                          <span className="text-xs font-semibold text-[var(--text-primary)]">
                            {p.lastRecordedWeightKg} kg
                          </span>
                          <p className="text-[10px] text-[var(--text-tertiary)]">
                            {p.lastMeasuredDate || "Última pesagem"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-tertiary)]">
                          Sem pesagem
                        </span>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:bg-[var(--brand-soft)] transition-colors">
                      <ChevronRightIcon className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
