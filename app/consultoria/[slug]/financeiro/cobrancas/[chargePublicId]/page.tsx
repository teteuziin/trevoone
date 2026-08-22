import React from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  getStudentChargeDetail,
  formatCentsToBrl,
} from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { FinanceStatusBadge } from "@/components/finance/finance-ui-badges";
import { ChargeCancelDialog } from "@/components/finance/charge-cancel-dialog";

type PageProps = {
  params: Promise<{
    slug: string;
    chargePublicId: string;
  }>;
};

function formatDatePtBr(isoDate: string | null): string {
  if (!isoDate) return "Não informado";
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function formatDateTimePtBr(isoDateTime: string | null): string {
  if (!isoDateTime) return "Não informado";
  try {
    const date = new Date(isoDateTime);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoDateTime;
  }
}

export default async function ChargeDetailPage({ params }: PageProps) {
  const { slug, chargePublicId } = await params;

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

  const charge = await getStudentChargeDetail({
    consultancyId: context.consultancyId,
    chargePublicId,
  });

  if (!charge) {
    notFound();
  }

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader
          backHref={`/consultoria/${slug}/financeiro`}
          backLabel="Voltar ao Financeiro"
          title={charge.title}
          eyebrow={`ALUNO: ${charge.studentName}`}
          actions={
            charge.canBeCanceled ? (
              <ChargeCancelDialog
                slug={slug}
                chargePublicId={charge.publicId}
                chargeTitle={charge.title}
              />
            ) : undefined
          }
        />

        {/* Status Alerts */}
        {charge.derivedStatus === "PAID" && (
          <Alert variant="success" title="Cobrança Quitada">
            <p className="text-xs">
              Esta cobrança foi totalmente liquidada via pagamento Pix confirmado.
            </p>
          </Alert>
        )}

        {charge.derivedStatus === "CANCELED" && (
          <Alert variant="info" title="Cobrança Cancelada">
            <p className="text-xs">
              Esta cobrança foi cancelada em {formatDateTimePtBr(charge.canceledAt)} por {charge.canceledByUserName || "Administrador"}.
              {charge.cancelReason && (
                <span className="block mt-1 font-medium italic">
                  Motivo: &quot;{charge.cancelReason}&quot;
                </span>
              )}
            </p>
          </Alert>
        )}

        {/* Charge Info Card */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
            <div>
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                Valor da Cobrança
              </span>
              <p className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
                {formatCentsToBrl(charge.amountCents)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <FinanceStatusBadge status={charge.derivedStatus} size="md" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-zinc-600">
            <div>
              <span className="text-zinc-500 block">Aluno Destinatário:</span>
              <strong className="text-zinc-900 font-semibold text-sm">{charge.studentName}</strong>
              <p className="text-[11px] text-zinc-500">{charge.studentEmail}</p>
            </div>

            <div>
              <span className="text-zinc-500 block">Data de Vencimento:</span>
              <strong className="text-zinc-900 font-semibold text-sm">{formatDatePtBr(charge.dueOn)}</strong>
            </div>

            <div>
              <span className="text-zinc-500 block">Período de Referência:</span>
              <span className="text-zinc-800 font-medium">
                {charge.referencePeriodStart && charge.referencePeriodEnd
                  ? `${formatDatePtBr(charge.referencePeriodStart)} a ${formatDatePtBr(charge.referencePeriodEnd)}`
                  : "Não informado"}
              </span>
            </div>

            <div>
              <span className="text-zinc-500 block">Bloqueio por Inadimplência:</span>
              <span className="text-zinc-800 font-medium">
                {charge.blocksAccess ? "Restringe acesso no atraso" : "Não restringe acesso"}
              </span>
            </div>

            <div>
              <span className="text-zinc-500 block">Emitida em:</span>
              <span className="text-zinc-800 font-medium">{formatDateTimePtBr(charge.createdAt)}</span>
            </div>

            <div>
              <span className="text-zinc-500 block">Emitida por:</span>
              <span className="text-zinc-800 font-medium">{charge.createdByUserName}</span>
            </div>
          </div>

          {charge.description && (
            <div className="pt-3 border-t border-zinc-100">
              <span className="text-xs font-semibold text-zinc-700 block mb-1">
                Observações de Emissão:
              </span>
              <p className="text-xs text-zinc-600 bg-zinc-50 p-3 rounded-xl border border-zinc-100 leading-relaxed">
                {charge.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </ConsultancyAppShell>
  );
}
