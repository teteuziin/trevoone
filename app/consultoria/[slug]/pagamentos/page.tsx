import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  getStudentChargesPage,
  formatCentsToBrl,
} from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FinanceStatusBadge } from "@/components/finance/finance-ui-badges";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    view?: string;
    page?: string;
  }>;
};

function formatDateBr(isoDateStr: string): string {
  if (!isoDateStr || !isoDateStr.includes("-")) return isoDateStr;
  const [y, m, d] = isoDateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default async function StudentPaymentsPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { view, page } = await searchParams;

  // 1. Session revalidation
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  // 2. Context revalidation
  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  // 3. STUDENT role guard
  if (!context.roles.includes("STUDENT")) {
    redirect(`/consultoria/${slug}`);
  }

  const activeView: "pending" | "history" = view === "history" ? "history" : "pending";
  const parsedPage = page ? Math.max(1, parseInt(page, 10)) : 1;

  const result = await getStudentChargesPage({
    consultancyId: context.consultancyId,
    studentMembershipId: context.membershipId,
    view: activeView,
    page: parsedPage,
  });

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
        {/* Header */}
        <PageHeader
          eyebrow="FINANCEIRO"
          title="Minhas Mensalidades"
          description="Acompanhe suas cobranças, consulte a chave Pix da consultoria e envie comprovantes de pagamento."
        />

        {/* View Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100/80 border border-zinc-200/80 rounded-xl max-w-xs">
          <Link
            href={`/consultoria/${slug}/pagamentos?view=pending`}
            className={`flex-1 text-center py-2 px-3.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === "pending"
                ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/60"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Pendências
          </Link>
          <Link
            href={`/consultoria/${slug}/pagamentos?view=history`}
            className={`flex-1 text-center py-2 px-3.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === "history"
                ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/60"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Histórico
          </Link>
        </div>

        {/* Charges List */}
        {result.charges.length === 0 ? (
          <EmptyState
            title={activeView === "pending" ? "Tudo em dia!" : "Nenhum histórico disponível"}
            description={
              activeView === "pending"
                ? "Você não possui pagamentos pendentes no momento."
                : "Suas cobranças quitadas ou canceladas serão listadas aqui."
            }
          />
        ) : (
          <div className="space-y-3">
            {result.charges.map((charge) => {
              const formattedDueDate = formatDateBr(charge.dueOn);
              const hasPeriod = charge.referencePeriodStart && charge.referencePeriodEnd;
              const formattedPeriod = hasPeriod
                ? `${formatDateBr(charge.referencePeriodStart!)} a ${formatDateBr(charge.referencePeriodEnd!)}`
                : null;

              return (
                <Link
                  key={charge.publicId}
                  href={`/consultoria/${slug}/pagamentos/${charge.publicId}`}
                  className="block bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#00A859]/50 hover:shadow-sm transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold text-sm sm:text-base text-zinc-900 group-hover:text-[#00A859] transition-colors break-words">
                          {charge.title}
                        </h2>
                        <FinanceStatusBadge status={charge.derivedStatus} size="sm" />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span>
                          Vencimento: <strong className="text-zinc-800 font-semibold">{formattedDueDate}</strong>
                        </span>
                        {formattedPeriod && (
                          <span>
                            Período: <span className="text-zinc-700 font-medium">{formattedPeriod}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t border-zinc-100 sm:border-t-0 shrink-0">
                      <span className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
                        {formatCentsToBrl(charge.amountCents)}
                      </span>

                      <span className="inline-flex items-center text-xs font-semibold text-[#00A859] group-hover:text-[#008f4c]">
                        <span>Ver detalhes</span>
                        <svg className="w-4 h-4 ml-0.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Pagination */}
            {result.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white border border-zinc-200/90 rounded-2xl shadow-xs text-xs">
                <p className="text-zinc-500 text-center sm:text-left">
                  Página <span className="font-bold text-zinc-900">{result.page}</span> de{" "}
                  <span className="font-bold text-zinc-900">{result.totalPages}</span> ({result.total} cobranças)
                </p>

                <div className="flex items-center gap-2">
                  {result.page > 1 && (
                    <Link
                      href={`/consultoria/${slug}/pagamentos?view=${activeView}&page=${result.page - 1}`}
                    >
                      <Button variant="outline" size="sm">
                        Anterior
                      </Button>
                    </Link>
                  )}

                  {result.page < result.totalPages && (
                    <Link
                      href={`/consultoria/${slug}/pagamentos?view=${activeView}&page=${result.page + 1}`}
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
    </ConsultancyAppShell>
  );
}
