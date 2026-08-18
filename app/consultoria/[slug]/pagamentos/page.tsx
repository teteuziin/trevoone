import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  getStudentChargesPage,
  formatCentsToBrl,
  STATUS_LABELS,
  type StudentChargeDerivedStatus,
} from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    view?: string;
    page?: string;
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
          title="Pagamentos"
          description="Acompanhe suas mensalidades, consulte a chave Pix e envie comprovantes de pagamento."
        />

        {/* View Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl max-w-xs">
          <Link
            href={`/consultoria/${slug}/pagamentos?view=pending`}
            className={`flex-1 text-center py-2 px-3.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === "pending"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Pendências
          </Link>
          <Link
            href={`/consultoria/${slug}/pagamentos?view=history`}
            className={`flex-1 text-center py-2 px-3.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === "history"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Histórico
          </Link>
        </div>

        {/* Charges List */}
        {result.charges.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#00A859] flex items-center justify-center mx-auto">
              {activeView === "pending" ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h2 className="text-base font-bold text-zinc-900">
                {activeView === "pending" ? "Tudo em dia" : "Nenhum histórico disponível"}
              </h2>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {activeView === "pending"
                  ? "Você não possui pagamentos pendentes no momento."
                  : "Suas cobranças quitadas ou canceladas serão listadas aqui."}
              </p>
            </div>
          </div>
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
                  className="block bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-emerald-400 hover:shadow-sm transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold text-sm sm:text-base text-zinc-900 group-hover:text-emerald-700 transition-colors">
                          {charge.title}
                        </h2>
                        <Badge variant={getStatusBadgeVariant(charge.derivedStatus)} size="sm">
                          {STATUS_LABELS[charge.derivedStatus] || charge.derivedStatus}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span>
                          Vencimento: <strong className="text-zinc-700 font-medium">{formattedDueDate}</strong>
                        </span>
                        {formattedPeriod && (
                          <span>
                            Período: <span className="text-zinc-700 font-medium">{formattedPeriod}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-zinc-100 sm:border-t-0">
                      <span className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
                        {formatCentsToBrl(charge.amountCents)}
                      </span>

                      <span className="inline-flex items-center text-xs font-semibold text-emerald-600 group-hover:text-emerald-700">
                        <span>Ver detalhes</span>
                        <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs text-xs">
                <p className="text-zinc-500">
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
