import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  getPaymentReceiptReviewDetail,
  formatCentsToBrl,
} from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ReceiptStatusBadge } from "@/components/finance/finance-ui-badges";
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
          backHref={`/consultoria/${slug}/financeiro/comprovantes`}
          backLabel="Voltar à fila de comprovantes"
          title="Análise de Comprovante"
          eyebrow={`ALUNO: ${receipt.studentName}`}
          description="Confira as informações do pagamento e o arquivo do comprovante antes de aprovar ou rejeitar."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Column: File Preview */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-3 text-xs">
                <span className="font-semibold text-zinc-800 truncate">
                  {receipt.originalFileName}
                </span>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-[#00A859] hover:underline font-semibold shrink-0"
                >
                  <span>Abrir em nova aba</span>
                  <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              </div>

              <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl overflow-hidden min-h-[300px] flex items-center justify-center">
                {isImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={fileUrl}
                    alt={`Comprovante de ${receipt.studentName}`}
                    className="max-h-[500px] w-auto object-contain mx-auto rounded"
                  />
                ) : isPdf ? (
                  <iframe
                    src={fileUrl}
                    title={`Comprovante de ${receipt.studentName}`}
                    className="w-full h-[500px] rounded border-0"
                  />
                ) : (
                  <div className="p-8 text-center space-y-3">
                    <p className="text-xs text-zinc-500">Visualização direta indisponível para este tipo de arquivo.</p>
                    <a href={fileUrl} download={receipt.originalFileName}>
                      <Button variant="outline" size="sm">
                        Baixar Arquivo ({formatBytes(receipt.sizeBytes)})
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Column: Data & Decision Actions */}
          <div className="lg:col-span-5 space-y-4">
            {/* Metadata Card */}
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Status do Envio
                </span>
                <ReceiptStatusBadge status={receipt.receiptStatus} size="sm" />
              </div>

              <div className="space-y-3 text-xs text-zinc-600">
                <div>
                  <span className="text-zinc-500 block">Aluno:</span>
                  <strong className="text-zinc-900 font-semibold text-sm">{receipt.studentName}</strong>
                  <p className="text-[11px] text-zinc-500">{receipt.studentEmail}</p>
                </div>

                <div>
                  <span className="text-zinc-500 block">Cobrança Vinculada:</span>
                  <strong className="text-zinc-900 font-semibold">{receipt.chargeTitle}</strong>
                </div>

                <div>
                  <span className="text-zinc-500 block">Valor a Liquidar:</span>
                  <strong className="text-zinc-900 font-bold text-base text-[#00A859]">
                    {formatCentsToBrl(receipt.amountCents)}
                  </strong>
                </div>

                <div>
                  <span className="text-zinc-500 block">Vencimento da Cobrança:</span>
                  <span className="text-zinc-800 font-medium">{formatDateBr(receipt.dueOn)}</span>
                </div>

                <div>
                  <span className="text-zinc-500 block">Enviado em:</span>
                  <span className="text-zinc-800 font-medium">{formatDateTime(receipt.submittedAt)}</span>
                </div>

                {receipt.reviewedAt && (
                  <div>
                    <span className="text-zinc-500 block">Analisado em:</span>
                    <span className="text-zinc-800 font-medium">
                      {formatDateTime(receipt.reviewedAt)} por {receipt.reviewerName || "Administrador"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Decision Actions Component */}
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs">
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
        </div>
      </div>
    </ConsultancyAppShell>
  );
}
