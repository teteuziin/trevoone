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
import { NutritionWorkspaceNav } from "@/components/consultancies/nutrition-v2/nutrition-workspace-nav";

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
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
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
      <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
        {/* Workspace Navigation Bar */}
        <NutritionWorkspaceNav slug={slug} activeTab="prontuario" />

        {/* Header Cockpit */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
                Nutrição Clínica V2
              </span>
              <Badge variant="brand" size="sm">
                {patients.length} {patients.length === 1 ? "Paciente" : "Pacientes"}
              </Badge>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Prontuário dos Pacientes
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-2xl">
              Acompanhamento clínico, histórico antropométrico, gestação e cálculo de IMC por paciente.
            </p>
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

        {/* Patient Content */}
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
          <div className="space-y-4">
            {/* Desktop: Professional Data Table */}
            <div className="hidden md:block rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--surface-subtle)]/70 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    <th scope="col" className="py-3.5 px-5">Paciente</th>
                    <th scope="col" className="py-3.5 px-4">Condição</th>
                    <th scope="col" className="py-3.5 px-4">Anamnese</th>
                    <th scope="col" className="py-3.5 px-4">Última Pesagem</th>
                    <th scope="col" className="py-3.5 px-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {patients.map((p) => (
                    <tr
                      key={p.studentPublicId}
                      className="hover:bg-[var(--surface-subtle)]/50 transition-colors group"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center font-bold text-xs shrink-0">
                            {p.fullName ? p.fullName.charAt(0).toUpperCase() : "P"}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-sm text-[var(--text-primary)] block truncate">
                              {p.fullName || "Paciente sem nome"}
                            </span>
                            <span className="text-xs text-[var(--text-tertiary)] block truncate">
                              {p.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {p.pregnancyStatus === "PREGNANT" ? (
                          <Badge variant="brand" size="sm">Gestante</Badge>
                        ) : p.pregnancyStatus === "POSTPARTUM" ? (
                          <Badge variant="warning" size="sm">Pós-Parto</Badge>
                        ) : (
                          <span className="text-xs text-[var(--text-tertiary)]">Geral</span>
                        )}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {p.hasOnboarding ? (
                          <Badge variant="success" size="sm">Respondida</Badge>
                        ) : (
                          <span className="text-xs text-[var(--text-tertiary)]">Pendente</span>
                        )}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {p.lastRecordedWeightKg !== null ? (
                          <div>
                            <span className="font-semibold text-xs text-[var(--text-primary)]">
                              {p.lastRecordedWeightKg} kg
                            </span>
                            <p className="text-[10px] text-[var(--text-tertiary)]">
                              {p.lastMeasuredDate ? new Date(p.lastMeasuredDate).toLocaleDateString("pt-BR") : "Registrado"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-tertiary)]">Sem medição</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/consultoria/${slug}/planos-v2/prontuario/${p.studentPublicId}`}>
                            <Button variant="secondary" size="sm" className="font-semibold text-xs min-h-[34px]">
                              <span>Prontuário</span>
                              <ChevronRightIcon className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: Clean Data Cards */}
            <div className="grid md:hidden gap-3">
              {patients.map((p) => (
                <div
                  key={p.studentPublicId}
                  className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center font-bold text-xs shrink-0">
                        {p.fullName ? p.fullName.charAt(0).toUpperCase() : "P"}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-[var(--text-primary)] block truncate">
                          {p.fullName || "Paciente sem nome"}
                        </span>
                        <span className="text-xs text-[var(--text-tertiary)] block truncate">
                          {p.email}
                        </span>
                      </div>
                    </div>
                    {p.pregnancyStatus === "PREGNANT" && (
                      <Badge variant="brand" size="sm">Gestante</Badge>
                    )}
                    {p.pregnancyStatus === "POSTPARTUM" && (
                      <Badge variant="warning" size="sm">Pós-Parto</Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    <div>
                      <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-medium">Último Peso</span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {p.lastRecordedWeightKg !== null ? `${p.lastRecordedWeightKg} kg` : "Não registrado"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-medium">Anamnese</span>
                      <span className="font-medium text-[var(--text-secondary)]">
                        {p.hasOnboarding ? "Respondida" : "Pendente"}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/consultoria/${slug}/planos-v2/prontuario/${p.studentPublicId}`}
                    className="block pt-1"
                  >
                    <Button variant="secondary" size="sm" fullWidth className="font-semibold text-xs min-h-[38px] justify-center">
                      <span>Acessar Prontuário</span>
                      <ChevronRightIcon className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
