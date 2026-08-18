import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  getStudentChargeDetail,
  formatCentsToBrl,
  STATUS_LABELS,
  type StudentChargeDerivedStatus,
} from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
          title={charge.title}
          description={`Cobrança emitida para o aluno ${charge.studentName}`}
          actions={
            <div className="flex items-center gap-2">
              <Link href={`/consultoria/${slug}/financeiro`}>
                <Button variant="outline" size="sm">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Voltar
                </Button>
              </Link>

              {charge.canBeCanceled && (
                <ChargeCancelDialog
                  slug={slug}
                  chargePublicId={charge.publicId}
                  chargeTitle={charge.title}
                />
              )}
            </div>
          }
        />

        {/* Card Principal de Resumo */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-100">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Valor da cobrança</p>
              <p className="text-3xl font-extrabold text-zinc-900 tracking-tight mt-1">
                {formatCentsToBrl(charge.amountCents)}
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1.5">
              <Badge variant={getStatusBadgeVariant(charge.derivedStatus)} size="md">
                {STATUS_LABELS[charge.derivedStatus] || charge.derivedStatus}
              </Badge>
              <span className="text-xs text-zinc-500">
                Vencimento: <strong className="text-zinc-800">{formatDatePtBr(charge.dueOn)}</strong>
              </span>
            </div>
          </div>

          {/* Grid de Informações Detalhadas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            {/* Aluno */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Aluno</p>
              <p className="font-semibold text-zinc-900">{charge.studentName}</p>
              <p className="text-xs text-zinc-500">{charge.studentEmail}</p>
            </div>

            {/* Bloqueio de Acesso */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Restrição de Acesso</p>
              <p className="font-medium text-zinc-800">
                {charge.blocksAccess ? "Sim (restringe acesso em caso de atraso)" : "Não (cobrança informativa/avulsa)"}
              </p>
            </div>

            {/* Período de Referência */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Período de Referência</p>
              <p className="font-medium text-zinc-800">
                {charge.referencePeriodStart && charge.referencePeriodEnd
                  ? `${formatDatePtBr(charge.referencePeriodStart)} até ${formatDatePtBr(charge.referencePeriodEnd)}`
                  : "Não especificado"}
              </p>
            </div>

            {/* Emitida por / Em */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Emissão</p>
              <p className="font-medium text-zinc-800">{charge.createdByUserName}</p>
              <p className="text-xs text-zinc-500">{formatDateTimePtBr(charge.createdAt)}</p>
            </div>
          </div>

          {/* Descrição opcional */}
          {charge.description && (
            <div className="pt-4 border-t border-zinc-100 space-y-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Descrição / Observações</p>
              <p className="text-sm text-zinc-700 leading-relaxed bg-zinc-50 p-3.5 rounded-xl border border-zinc-150">
                {charge.description}
              </p>
            </div>
          )}

          {/* Dados de Cancelamento se estiver cancelada */}
          {charge.state === "CANCELED" && (
            <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 text-sm space-y-2">
              <div className="flex items-center gap-2 text-red-800 font-bold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Cobrança Cancelada
              </div>
              <p className="text-xs text-red-700">
                Cancelada por <strong>{charge.canceledByUserName || "Administrador"}</strong> em {formatDateTimePtBr(charge.canceledAt)}.
              </p>
              {charge.cancelReason && (
                <p className="text-xs text-red-700">
                  Motivo: <em>&ldquo;{charge.cancelReason}&rdquo;</em>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </ConsultancyAppShell>
  );
}
