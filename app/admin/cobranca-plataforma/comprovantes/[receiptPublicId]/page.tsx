import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { getDbConnection } from "@/lib/db/mysql";
import type { RowDataPacket } from "mysql2/promise";
import {
  formatBrlCents,
  formatIsoDateToBr,
} from "@/lib/platform-admin/billing";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { reviewPlatformReceiptAction } from "../../actions";

type PageProps = {
  params: Promise<{
    receiptPublicId: string;
  }>;
};

function getReceiptBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "SUBMITTED":
      return "warning";
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "danger";
    default:
      return "neutral";
  }
}

function getReceiptLabel(status: string): string {
  switch (status) {
    case "SUBMITTED":
      return "Aguardando Análise";
    case "APPROVED":
      return "Aprovado";
    case "REJECTED":
      return "Rejeitado";
    default:
      return status;
  }
}

export default async function PlatformReceiptReviewPage({ params }: PageProps) {
  const { receiptPublicId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);
  if (!isPlatformAdmin) {
    redirect("/selecionar-consultoria");
  }

  let connection;
  let receiptData = null;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cpr.id,
        cpr.public_id,
        cpr.file_name,
        cpr.file_size_bytes,
        cpr.mime_type,
        cpr.status,
        cpr.rejection_reason,
        cpr.created_at,
        cpr.reviewed_at,
        c.public_id AS consultancy_public_id,
        c.name AS consultancy_name,
        c.slug AS consultancy_slug,
        cpc.public_id AS charge_public_id,
        cpc.title AS charge_title,
        cpc.amount_cents AS charge_amount_cents,
        DATE_FORMAT(cpc.due_on, '%Y-%m-%d') AS charge_due_on,
        u_sub.full_name AS submitter_name,
        u_rev.full_name AS reviewer_name
       FROM consultancy_platform_receipts cpr
       INNER JOIN consultancies c ON c.id = cpr.consultancy_id
       INNER JOIN consultancy_platform_charges cpc ON cpc.id = cpr.charge_id
       INNER JOIN users u_sub ON u_sub.id = cpr.submitted_by_user_id
       LEFT JOIN users u_rev ON u_rev.id = cpr.reviewed_by_user_id
       WHERE cpr.public_id = ?
       LIMIT 1;`,
      [receiptPublicId]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      receiptData = rows[0];
    }
  } finally {
    if (connection) connection.release();
  }

  if (!receiptData) {
    redirect("/admin/cobranca-plataforma");
  }

  const fileUrl = `/consultoria/${receiptData.consultancy_slug}/assinatura/comprovantes/${receiptPublicId}/arquivo`;

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin/cobranca-plataforma">
            <Button variant="outline" size="sm">
              ← Voltar para Cobrança
            </Button>
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                  Avaliação de Comprovante Pix
                </h1>
                <Badge variant={getReceiptBadgeVariant(receiptData.status)} size="md">
                  {getReceiptLabel(receiptData.status)}
                </Badge>
              </div>
              <p className="text-xs text-zinc-500">
                Consultoria: <strong className="text-zinc-900 font-semibold">{receiptData.consultancy_name}</strong> ({receiptData.consultancy_slug})
              </p>
            </div>
          </div>

          {/* Detalhes da Cobrança */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1">
              <span className="text-zinc-500 font-medium block">Cobrança</span>
              <p className="text-sm font-bold text-zinc-900">{receiptData.charge_title}</p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1">
              <span className="text-zinc-500 font-medium block">Valor da Fatura</span>
              <p className="text-sm font-bold text-zinc-900">
                {formatBrlCents(Number(receiptData.charge_amount_cents))}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1">
              <span className="text-zinc-500 font-medium block">Vencimento</span>
              <p className="text-sm font-bold text-zinc-900">
                {formatIsoDateToBr(String(receiptData.charge_due_on))}
              </p>
            </div>
          </div>

          {/* Detalhes do Arquivo */}
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                  Arquivo enviado
                </span>
                <p className="text-sm font-mono font-bold text-zinc-900 truncate">{receiptData.file_name}</p>
                <p className="text-zinc-500 text-[11px]">
                  Tamanho: {(Number(receiptData.file_size_bytes) / 1024).toFixed(1)} KB • Tipo: {receiptData.mime_type} • Enviado por: {receiptData.submitter_name}
                </p>
              </div>

              <Link
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <Button variant="secondary" size="sm">
                  <span>Abrir Comprovante</span>
                  <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>

          {/* Ações de Avaliação (Apenas se SUBMITTED) */}
          {receiptData.status === "SUBMITTED" ? (
            <div className="pt-4 border-t border-zinc-100 space-y-4">
              <h2 className="text-sm font-bold text-zinc-900">Decisão de Análise</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Aprovar */}
                <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1 text-xs">
                    <h3 className="text-sm font-bold text-emerald-950">Aprovar Comprovante</h3>
                    <p className="text-emerald-800 leading-relaxed">
                      Confirma o recebimento Pix, quita a fatura e restabelece automaticamente o acesso da consultoria se estiver em atraso.
                    </p>
                  </div>

                  <form
                    action={async () => {
                      "use server";
                      await reviewPlatformReceiptAction({
                        receiptPublicId,
                        decision: "APPROVED",
                        consultancyPublicId: receiptData.consultancy_public_id,
                      });
                      redirect(`/admin/cobranca-plataforma/consultorias/${receiptData.consultancy_public_id}`);
                    }}
                  >
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="w-full bg-[#00A859] hover:bg-[#008f4c]"
                    >
                      ✓ Confirmar Aprovação e Quitação
                    </Button>
                  </form>
                </div>

                {/* Rejeitar */}
                <div className="p-5 rounded-2xl border border-red-200 bg-red-50/40 space-y-3">
                  <div className="space-y-1 text-xs">
                    <h3 className="text-sm font-bold text-red-950">Rejeitar Comprovante</h3>
                    <p className="text-red-800 leading-relaxed">
                      Informe o motivo da rejeição para que a consultoria possa enviar um novo comprovante correto.
                    </p>
                  </div>

                  <form
                    action={async (formData) => {
                      "use server";
                      const reason = String(formData.get("reason") || "");
                      await reviewPlatformReceiptAction({
                        receiptPublicId,
                        decision: "REJECTED",
                        rejectionReason: reason,
                        consultancyPublicId: receiptData.consultancy_public_id,
                      });
                      redirect(`/admin/cobranca-plataforma/consultorias/${receiptData.consultancy_public_id}`);
                    }}
                    className="space-y-3"
                  >
                    <input
                      type="text"
                      name="reason"
                      placeholder="Motivo da rejeição (ex: valor divergente, comprovante ilegível)"
                      required
                      className="w-full h-9 px-3 rounded-xl border border-red-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                    <Button
                      type="submit"
                      variant="danger"
                      size="sm"
                      className="w-full"
                    >
                      Rejeitar Comprovante
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <Alert
              variant={receiptData.status === "APPROVED" ? "success" : "danger"}
              title={`Comprovante ${receiptData.status === "APPROVED" ? "Aprovado" : "Rejeitado"}`}
            >
              <p className="text-xs">
                Avaliado por <strong className="font-bold">{receiptData.reviewer_name || "Administrador"}</strong> em{" "}
                {formatIsoDateToBr(receiptData.reviewed_at ? new Date(receiptData.reviewed_at).toISOString().slice(0, 10) : "")}.
              </p>
              {receiptData.rejection_reason && (
                <p className="text-xs font-semibold mt-1">
                  Motivo da rejeição: &quot;{receiptData.rejection_reason}&quot;
                </p>
              )}
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
