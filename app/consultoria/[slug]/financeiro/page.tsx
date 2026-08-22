import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  getConsultancyFinanceSettings,
  getConsultancyFinanceDashboard,
  listConsultancyCharges,
  formatCentsToBrl,
} from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FinanceStatusBadge } from "@/components/finance/finance-ui-badges";
import { FinanceSettingsForm } from "@/components/finance/finance-settings-form";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    aba?: string;
  }>;
};

function formatDateBr(isoDateStr: string): string {
  if (!isoDateStr || !isoDateStr.includes("-")) return isoDateStr;
  const [y, m, d] = isoDateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default async function ConsultancyFinancePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { q, status, page, aba } = await searchParams;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  if (!context.roles.includes("CONSULTANCY_ADMIN")) {
    redirect(`/consultoria/${slug}`);
  }

  const [settings, dashboard, chargesResult] = await Promise.all([
    getConsultancyFinanceSettings(context.consultancyId),
    getConsultancyFinanceDashboard(context.consultancyId),
    listConsultancyCharges({
      consultancyId: context.consultancyId,
      statusFilter: status,
      query: q,
      page: page ? parseInt(page, 10) : 1,
    }),
  ]);

  const activeTab = aba === "configuracoes" ? "configuracoes" : "cobrancas";
  const currentStatusFilter = (status || "ALL").toUpperCase();

  const filterTabs = [
    { key: "ALL", label: "Todas" },
    { key: "PENDING", label: "Pendentes" },
    { key: "OVERDUE", label: "Vencidas" },
    { key: "UNDER_REVIEW", label: "Em análise" },
    { key: "PAID", label: "Pagas" },
    { key: "CANCELED", label: "Canceladas" },
  ];

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="space-y-6">
        {/* Header Principal */}
        <PageHeader
          eyebrow="ADMINISTRAÇÃO DA CONSULTORIA"
          title="Gestão Financeira"
          description="Controle de cobranças dos alunos, análise de comprovantes Pix e configurações de recebimento."
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/consultoria/${slug}/financeiro?aba=${activeTab === "configuracoes" ? "cobrancas" : "configuracoes"}`}>
                <Button variant={activeTab === "configuracoes" ? "primary" : "outline"} size="sm">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Configurações Pix
                </Button>
              </Link>

              <Link href={`/consultoria/${slug}/financeiro/nova-cobranca`}>
                <Button variant="primary" size="sm">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Nova Cobrança
                </Button>
              </Link>
            </div>
          }
        />

        {/* Warning Banner se não tiver Pix cadastrado */}
        {!settings && activeTab !== "configuracoes" && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-bold">Chave Pix da consultoria não cadastrada</p>
              <p className="text-amber-800">
                Cadastre a chave Pix para que seus alunos possam realizar transferências e enviar comprovantes.
              </p>
            </div>
            <Link href={`/consultoria/${slug}/financeiro?aba=configuracoes`}>
              <Button variant="outline" size="sm" className="shrink-0 bg-white">
                Cadastrar Chave Pix
              </Button>
            </Link>
          </div>
        )}

        {/* Pending Receipts Alert Banner */}
        {dashboard.underReviewCount > 0 && activeTab !== "configuracoes" && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#00A859] flex items-center justify-center shrink-0 font-bold">
                {dashboard.underReviewCount}
              </div>
              <div>
                <p className="font-bold text-sm text-emerald-950">
                  {dashboard.underReviewCount === 1
                    ? "1 comprovante aguardando sua análise"
                    : `${dashboard.underReviewCount} comprovantes aguardando sua análise`}
                </p>
                <p className="text-emerald-800">
                  Revise e confirme os pagamentos para liberar automaticamente o acesso dos alunos.
                </p>
              </div>
            </div>
            <Link href={`/consultoria/${slug}/financeiro/comprovantes`}>
              <Button variant="primary" size="sm" className="shrink-0">
                Ver Fila de Comprovantes →
              </Button>
            </Link>
          </div>
        )}

        {/* Operational KPI Grid */}
        {activeTab === "cobrancas" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                A Receber
              </span>
              <p className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                {formatCentsToBrl(dashboard.toReceiveCents)}
              </p>
            </div>

            <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Recebido Este Mês
              </span>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 tracking-tight">
                {formatCentsToBrl(dashboard.paidThisMonthCents)}
              </p>
            </div>

            <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Cobranças Vencidas
              </span>
              <p className="text-xl sm:text-2xl font-bold text-red-600 tracking-tight">
                {dashboard.overdueCount}
              </p>
            </div>
          </div>
        )}

        {/* Main Tab Content */}
        {activeTab === "configuracoes" ? (
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs max-w-3xl">
            <div className="mb-5 pb-4 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Configurações Financeiras</h2>
                <p className="text-xs text-zinc-500">
                  Defina a chave Pix oficial e o fuso horário para vencimento das mensalidades.
                </p>
              </div>
              <Link href={`/consultoria/${slug}/financeiro?aba=cobrancas`}>
                <Button variant="outline" size="sm">
                  Voltar às Cobranças
                </Button>
              </Link>
            </div>
            <FinanceSettingsForm slug={slug} initialSettings={settings} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filter Tabs & Search Bar */}
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {filterTabs.map((tab) => {
                  const isActive = currentStatusFilter === tab.key;
                  const href =
                    tab.key === "ALL"
                      ? `/consultoria/${slug}/financeiro${q ? `?q=${encodeURIComponent(q)}` : ""}`
                      : `/consultoria/${slug}/financeiro?status=${tab.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

                  return (
                    <Link
                      key={tab.key}
                      href={href}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        isActive
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </div>

              {/* Search Form */}
              <form method="GET" action={`/consultoria/${slug}/financeiro`} className="flex items-center gap-2">
                {status && <input type="hidden" name="status" value={status} />}
                <div className="relative flex-1">
                  <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="text"
                    name="q"
                    defaultValue={q || ""}
                    placeholder="Buscar aluno ou título da cobrança..."
                    className="w-full h-9 pl-9 pr-3 text-xs bg-zinc-50 border border-zinc-200/90 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#00A859]"
                  />
                </div>
                <Button type="submit" variant="outline" size="sm">
                  Buscar
                </Button>
              </form>
            </div>

            {/* Charges List / Empty State */}
            {chargesResult.charges.length === 0 ? (
              <EmptyState
                title="Nenhuma cobrança encontrada"
                description={
                  q
                    ? `Nenhum resultado para "${q}". Tente buscar por outro termo.`
                    : "Não há cobranças cadastradas para o filtro selecionado."
                }
              />
            ) : (
              <div className="space-y-2.5">
                {chargesResult.charges.map((charge) => {
                  return (
                    <Link
                      key={charge.publicId}
                      href={`/consultoria/${slug}/financeiro/cobrancas/${charge.publicId}`}
                      className="block bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs hover:border-[#00A859]/50 hover:shadow-sm transition-all group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-zinc-900 group-hover:text-[#00A859] transition-colors truncate max-w-[240px]">
                              {charge.studentName}
                            </span>
                            <FinanceStatusBadge status={charge.derivedStatus} size="sm" />
                          </div>

                          <p className="text-xs text-zinc-600 font-medium truncate">
                            {charge.title}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                            <span>
                              Vencimento: <strong className="text-zinc-800 font-semibold">{formatDateBr(charge.dueOn)}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-zinc-100 sm:border-t-0 shrink-0">
                          <span className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
                            {formatCentsToBrl(charge.amountCents)}
                          </span>

                          <span className="inline-flex items-center text-xs font-semibold text-[#00A859] group-hover:text-[#008f4c]">
                            <span>Detalhes</span>
                            <svg className="w-4 h-4 ml-0.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {/* Pagination */}
                {chargesResult.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white border border-zinc-200/90 rounded-2xl shadow-xs text-xs">
                    <p className="text-zinc-500 text-center sm:text-left">
                      Página <span className="font-bold text-zinc-900">{chargesResult.page}</span> de{" "}
                      <span className="font-bold text-zinc-900">{chargesResult.totalPages}</span> ({chargesResult.total} cobranças)
                    </p>

                    <div className="flex items-center gap-2">
                      {chargesResult.page > 1 && (
                        <Link
                          href={`/consultoria/${slug}/financeiro?page=${chargesResult.page - 1}${status ? `&status=${status}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                        >
                          <Button variant="outline" size="sm">
                            Anterior
                          </Button>
                        </Link>
                      )}

                      {chargesResult.page < chargesResult.totalPages && (
                        <Link
                          href={`/consultoria/${slug}/financeiro?page=${chargesResult.page + 1}${status ? `&status=${status}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                        >
                          <Button variant="outline" size="sm">
                            Próxima
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
