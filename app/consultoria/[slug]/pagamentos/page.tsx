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
      userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
      consultancyPublicId={context.consultancyPublicId}
      activeRole="STUDENT"
    >
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <PageHeader
          eyebrow="FINANCEIRO"
          title="Minhas Mensalidades"
          description="Acompanhe suas cobranças, consulte a chave Pix da consultoria e envie comprovantes de pagamento."
        />

        {/* View Tabs */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl max-w-xs shadow-xs">
          <Link
            href={`/consultoria/${slug}/pagamentos?view=pending`}
            className={`flex-1 text-center min-h-[44px] flex items-center justify-center py-2 px-3.5 rounded-lg text-xs font-semibold transition-all border ${
              activeView === "pending"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs border-zinc-200 dark:border-zinc-700 font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border-transparent"
            }`}
          >
            Pendências
          </Link>
          <Link
            href={`/consultoria/${slug}/pagamentos?view=history`}
            className={`flex-1 text-center min-h-[44px] flex items-center justify-center py-2 px-3.5 rounded-lg text-xs font-semibold transition-all border ${
              activeView === "history"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs border-zinc-200 dark:border-zinc-700 font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border-transparent"
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
                  className="block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all group relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                        <h2 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors break-words">
                          {charge.title}
                        </h2>
                        <FinanceStatusBadge status={charge.derivedStatus} size="sm" />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 pl-0 sm:pl-10.5">
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>
                            Vencimento: <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{formattedDueDate}</strong>
                          </span>
                        </span>
                        {formattedPeriod && (
                          <span className="inline-flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>
                              Período: <span className="text-zinc-700 dark:text-zinc-300 font-medium">{formattedPeriod}</span>
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t border-zinc-200 dark:border-zinc-800 sm:border-t-0 shrink-0">
                      <span className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">
                        {formatCentsToBrl(charge.amountCents)}
                      </span>

                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                        <span>Ver detalhes</span>
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm text-xs">
                <p className="text-zinc-600 dark:text-zinc-400 text-center sm:text-left">
                  Página <span className="font-bold text-zinc-900 dark:text-zinc-100">{result.page}</span> de{" "}
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{result.totalPages}</span> ({result.total} cobranças)
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
