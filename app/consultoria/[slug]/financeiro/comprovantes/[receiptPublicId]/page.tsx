import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  getPaymentReceiptReviewDetail,
  formatCentsToBrl,
  STATUS_LABELS,
} from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ReceiptReviewActions } from "@/components/finance/receipt-review-actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
    receiptPublicId: string;
  }>;
};

function formatDateBr(isoDateStr: string): string {
  if (!isoDateStr || !isoDateStr.includes("-")) return isoDateStr;
  const [y, m, d] = isoDateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  } catch {
    return isoString;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminPaymentReceiptDetailPage({ params }: PageProps) {
  const { slug, receiptPublicId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    notFound();
  }

  if (!context.roles.includes("CONSULTANCY_ADMIN")) {
    redirect(`/consultoria/${slug}`);
  }

  const receipt = await getPaymentReceiptReviewDetail({
    consultancyId: context.consultancyId,
    receiptPublicId,
  });

  if (!receipt) {
    notFound();
  }

  const fileUrl = `/consultoria/${slug}/financeiro/comprovantes/${receipt.receiptPublicId}/arquivo`;
  const isImage = receipt.mimeType.startsWith("image/");
  const isPdf = receipt.mimeType === "application/pdf";

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Principal */}
        <PageHeader
          title="Revisão de Comprovante"
          description="Verifique as informações do pagamento e o arquivo do comprovante antes de aprovar ou rejeitar."
          actions={
            <Link href={`/consultoria/${slug}/financeiro/comprovantes`}>
              <Button variant="outline" size="sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar à fila
              </Button>
            </Link>
          }
        />

        {/* Resumo da Cobrança e Aluno */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card: Dados do Aluno e Cobrança */}
          <div className="p-5 sm:p-6 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Dados da Cobrança
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-zinc-500">Aluno</p>
                <p className="text-sm font-bold text-zinc-900">{receipt.studentName}</p>
                <p className="text-xs text-zinc-500">{receipt.studentEmail}</p>
              </div>

              <div className="pt-2 border-t border-zinc-100">
                <p className="text-xs text-zinc-500">Cobrança</p>
                <p className="text-sm font-semibold text-zinc-900">{receipt.chargeTitle}</p>
                {receipt.chargeDescription && (
                  <p className="text-xs text-zinc-500 mt-0.5">{receipt.chargeDescription}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100">
                <div>
                  <p className="text-xs text-zinc-500">Valor</p>
                  <p className="text-base font-bold text-zinc-900">
                    {formatCentsToBrl(receipt.amountCents)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Vencimento</p>
                  <p className="text-sm font-medium text-zinc-900">
                    {formatDateBr(receipt.dueOn)}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500">Status atual da cobrança</p>
                  <p className="text-xs font-bold text-zinc-900">
                    {STATUS_LABELS[receipt.chargeDerivedStatus]}
                  </p>
                </div>
                <Link
                  href={`/consultoria/${slug}/financeiro/cobrancas/${receipt.chargePublicId}`}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  Ver cobrança →
                </Link>
              </div>
            </div>
          </div>

          {/* Card: Dados do Envio do Comprovante */}
          <div className="p-5 sm:p-6 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Dados do Comprovante
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-zinc-500">Status da revisão</p>
                <div className="mt-1">
                  {receipt.receiptStatus === "SUBMITTED" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Em análise
                    </span>
                  )}
                  {receipt.receiptStatus === "APPROVED" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-[#008f4c] border border-emerald-200">
                      Aprovado
                    </span>
                  )}
                  {receipt.receiptStatus === "REJECTED" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                      Rejeitado
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100">
                <p className="text-xs text-zinc-500">Data de envio</p>
                <p className="text-xs font-semibold text-zinc-900">
                  {formatDateTime(receipt.submittedAt)}
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-100">
                <p className="text-xs text-zinc-500">Arquivo enviado</p>
                <p className="text-xs font-semibold text-zinc-900 truncate">
                  {receipt.originalFileName}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Tipo: {receipt.mimeType} • Tamanho: {formatBytes(receipt.sizeBytes)}
                </p>
              </div>

              {receipt.reviewedAt && (
                <div className="pt-2 border-t border-zinc-100 space-y-1">
                  <p className="text-xs text-zinc-500">Revisado em</p>
                  <p className="text-xs font-semibold text-zinc-900">
                    {formatDateTime(receipt.reviewedAt)}
                    {receipt.reviewerName && ` por ${receipt.reviewerName}`}
                  </p>
                  {receipt.rejectionReason && (
                    <div className="p-2.5 bg-red-50/70 border border-red-200 rounded-xl text-xs text-red-800 mt-2">
                      <span className="font-semibold">Motivo informado:</span> {receipt.rejectionReason}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Visualização do Arquivo */}
        <div className="p-5 sm:p-6 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Arquivo do Comprovante</h2>
              <p className="text-xs text-zinc-500">
                Visualização segura do documento enviado pelo aluno.
              </p>
            </div>

            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition shadow-xs"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Abrir arquivo em nova aba
            </a>
          </div>

          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-center min-h-[220px]">
            {isImage ? (
              <div className="max-w-md w-full text-center space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileUrl}
                  alt="Comprovante de pagamento"
                  className="max-h-80 w-auto mx-auto rounded-lg border border-zinc-200 object-contain shadow-xs bg-white"
                />
                <p className="text-[11px] text-zinc-400">
                  Clique no botão acima para abrir em tela cheia se necessário.
                </p>
              </div>
            ) : isPdf ? (
              <div className="text-center space-y-3 py-6">
                <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">Documento PDF</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {receipt.originalFileName} ({formatBytes(receipt.sizeBytes)})
                  </p>
                </div>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition"
                >
                  Abrir PDF
                </a>
              </div>
            ) : (
              <div className="text-center space-y-2 py-6">
                <p className="text-xs text-zinc-600">Arquivo disponível para download seguro</p>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition"
                >
                  Baixar arquivo
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Card de Ações de Revisão */}
        <div className="p-5 sm:p-6 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-zinc-900">Decisão da Consultoria</h2>
          <p className="text-xs text-zinc-500">
            Ao aprovar, o pagamento é registrado no sistema com o valor exato da cobrança. Ao rejeitar, o aluno é notificado sobre o motivo e pode reenviar.
          </p>

          <ReceiptReviewActions
            slug={slug}
            receiptPublicId={receipt.receiptPublicId}
            studentName={receipt.studentName}
            chargeTitle={receipt.chargeTitle}
            formattedAmount={formatCentsToBrl(receipt.amountCents)}
            receiptStatus={receipt.receiptStatus}
          />
        </div>
      </div>
    </ConsultancyAppShell>
  );
}
