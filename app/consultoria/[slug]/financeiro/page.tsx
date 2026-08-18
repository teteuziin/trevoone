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
  STATUS_LABELS,
  type StudentChargeDerivedStatus,
} from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function getStatusBadgeVariant(status: StudentChargeDerivedStatus): BadgeVariant {
  switch (status) {
    case "PAID":
      return "success";
    case "OVERDUE":
      return "danger";
    case "UNDER_REVIEW":
      return "warning";
    case "PENDING":
      return "neutral";
    case "CANCELED":
      return "neutral";
    default:
      return "neutral";
  }
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
          title="Financeiro"
          description="Controle de cobranças, recebimentos e configurações Pix da consultoria."
          actions={
            <div className="flex items-center gap-2">
              <Link href={`/consultoria/${slug}/financeiro?aba=${activeTab === "configuracoes" ? "cobrancas" : "configuracoes"}`}>
                <Button variant={activeTab === "configuracoes" ? "primary" : "outline"} size="sm">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Configurar Pix
                </Button>
              </Link>

              <Link href={`/consultoria/${slug}/financeiro/nova-cobranca`}>
                <Button variant="primary" size="sm">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Nova cobrança
                </Button>
              </Link>
            </div>
          }
        />

        {/* Callout de configuração Pix ausente */}
        {!settings && (
          <div className="p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/80 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-0.5">
              <p className="text-sm font-bold flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Chave Pix não configurada
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">
                Configure os dados Pix da consultoria para habilitar cobranças com restrição de acesso e pagamentos rápidos.
              </p>
            </div>
            <Link href={`/consultoria/${slug}/financeiro?aba=configuracoes`}>
              <Button variant="outline" size="sm" className="border-amber-300 text-amber-900 bg-white hover:bg-amber-100/50">
                Configurar Pix agora
              </Button>
            </Link>
          </div>
        )}

        {/* Dashboard Cards (4 métricas) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. A receber */}
          <div className="p-4 sm:p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-1">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">A receber</p>
            <p className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              {formatCentsToBrl(dashboard.toReceiveCents)}
            </p>
            <p className="text-[11px] text-zinc-400">Total em aberto</p>
          </div>

          {/* 2. Vencidos */}
          <div className="p-4 sm:p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-1">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Vencidos</p>
            <p className={`text-xl sm:text-2xl font-bold tracking-tight ${dashboard.overdueCount > 0 ? "text-red-600" : "text-zinc-900"}`}>
              {dashboard.overdueCount}
            </p>
            <p className="text-[11px] text-zinc-400">Cobranças em atraso</p>
          </div>

          {/* 3. Pagos no mês */}
          <div className="p-4 sm:p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-1">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pagos no mês</p>
            <p className="text-xl sm:text-2xl font-bold text-[#008f4c] tracking-tight">
              {formatCentsToBrl(dashboard.paidThisMonthCents)}
            </p>
            <p className="text-[11px] text-zinc-400">Recebimentos no mês</p>
          </div>

          {/* 4. Em análise */}
          <Link
            href={`/consultoria/${slug}/financeiro/comprovantes`}
            className="p-4 sm:p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-1 hover:border-emerald-300 hover:shadow-sm transition group block"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider group-hover:text-emerald-700 transition">
                Em análise
              </p>
              <svg className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className={`text-xl sm:text-2xl font-bold tracking-tight ${dashboard.underReviewCount > 0 ? "text-amber-600" : "text-zinc-900"}`}>
              {dashboard.underReviewCount}
            </p>
            <p className="text-[11px] text-zinc-400">Ver fila de comprovantes</p>
          </Link>
        </div>

        {/* Seção Alternável: Configurações Pix OU Lista de Cobranças */}
        {activeTab === "configuracoes" ? (
          <div className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Configurações Pix da Consultoria</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Defina a chave Pix que os alunos utilizarão para realizar os pagamentos das mensalidades.
                </p>
              </div>
              <Link href={`/consultoria/${slug}/financeiro`}>
                <Button variant="outline" size="sm">
                  Voltar para cobranças
                </Button>
              </Link>
            </div>

            <FinanceSettingsForm slug={slug} initialSettings={settings} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Barra de Filtros e Busca */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 border border-zinc-200 rounded-2xl shadow-xs">
              {/* Filtro por status (Tabs) */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {filterTabs.map((tab) => {
                  const isActive = currentStatusFilter === tab.key;
                  const targetHref =
                    tab.key === "ALL"
                      ? `/consultoria/${slug}/financeiro${q ? `?q=${encodeURIComponent(q)}` : ""}`
                      : `/consultoria/${slug}/financeiro?status=${tab.key.toLowerCase()}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

                  return (
                    <Link
                      key={tab.key}
                      href={targetHref}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        isActive
                          ? "bg-emerald-50 text-[#008f4c]"
                          : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </div>

              {/* Busca por texto */}
              <form method="GET" action={`/consultoria/${slug}/financeiro`} className="relative shrink-0 sm:w-64">
                {status && <input type="hidden" name="status" value={status} />}
                <input
                  type="text"
                  name="q"
                  defaultValue={q || ""}
                  placeholder="Buscar aluno ou título..."
                  className="w-full h-9 pl-8 pr-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <svg
                  className="w-3.5 h-3.5 absolute left-2.5 top-3 text-zinc-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </form>
            </div>

            {/* Listagem de Cobranças */}
            {chargesResult.charges.length === 0 ? (
              <div className="text-center py-12 px-4 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-3">
                <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <p className="text-sm font-bold text-zinc-900">
                    {q || status ? "Nenhuma cobrança encontrada neste filtro." : "Nenhuma cobrança criada ainda."}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {q || status
                      ? "Tente ajustar os termos de busca ou remover os filtros de situação."
                      : "Crie a primeira cobrança para seus alunos para gerenciar pagamentos por Pix."}
                  </p>
                </div>
                {!q && !status && (
                  <Link href={`/consultoria/${slug}/financeiro/nova-cobranca`}>
                    <Button variant="primary" size="sm">
                      Nova cobrança
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Visualização Desktop (Tabela limpa) */}
                <div className="hidden md:block bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/70 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Aluno</th>
                        <th className="py-3 px-4">Título</th>
                        <th className="py-3 px-4">Valor</th>
                        <th className="py-3 px-4">Vencimento</th>
                        <th className="py-3 px-4">Situação</th>
                        <th className="py-3 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-sm">
                      {chargesResult.charges.map((charge) => {
                        const [y, m, d] = charge.dueOn.split("-");
                        const formattedDate = `${d}/${m}/${y}`;

                        return (
                          <tr key={charge.publicId} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="py-3.5 px-4">
                              <p className="font-medium text-zinc-900">{charge.studentName}</p>
                              <p className="text-xs text-zinc-500">{charge.studentEmail}</p>
                            </td>
                            <td className="py-3.5 px-4 text-zinc-700 max-w-xs truncate">
                              {charge.title}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-zinc-900">
                              {formatCentsToBrl(charge.amountCents)}
                            </td>
                            <td className="py-3.5 px-4 text-zinc-600 text-xs">
                              {formattedDate}
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge variant={getStatusBadgeVariant(charge.derivedStatus)} size="sm">
                                {STATUS_LABELS[charge.derivedStatus] || charge.derivedStatus}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Link
                                href={`/consultoria/${slug}/financeiro/cobrancas/${charge.publicId}`}
                                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-2.5 py-1 rounded-md hover:bg-emerald-50 transition-colors inline-block"
                              >
                                Ver detalhes
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Visualização Mobile (Cards responsivos) */}
                <div className="md:hidden space-y-2.5">
                  {chargesResult.charges.map((charge) => {
                    const [y, m, d] = charge.dueOn.split("-");
                    const formattedDate = `${d}/${m}/${y}`;

                    return (
                      <Link
                        key={charge.publicId}
                        href={`/consultoria/${slug}/financeiro/cobrancas/${charge.publicId}`}
                        className="block bg-white border border-zinc-200 p-4 rounded-2xl shadow-xs hover:border-emerald-300 transition-colors space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-zinc-900 text-sm">{charge.studentName}</p>
                            <p className="text-xs text-zinc-500">{charge.title}</p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(charge.derivedStatus)} size="sm">
                            {STATUS_LABELS[charge.derivedStatus] || charge.derivedStatus}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs">
                          <span className="text-zinc-500">Vencimento: {formattedDate}</span>
                          <span className="font-bold text-zinc-900 text-sm">
                            {formatCentsToBrl(charge.amountCents)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Paginação */}
                {chargesResult.totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs text-xs">
                    <p className="text-zinc-500">
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
