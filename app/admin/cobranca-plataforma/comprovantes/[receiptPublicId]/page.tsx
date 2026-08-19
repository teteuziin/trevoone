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
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { Badge } from "@/components/ui/badge";
import { reviewPlatformReceiptAction } from "../../actions";

type PageProps = {
  params: Promise<{
    receiptPublicId: string;
  }>;
};

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
    <main className="min-h-svh w-full bg-zinc-50 text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
      <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/admin" className="w-[110px] sm:w-[130px] shrink-0">
              <TrevoOneLogo priority size={130} />
            </Link>
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              |
            </span>
            <Link
              href="/admin/cobranca-plataforma"
              className="hidden sm:inline-block text-xs font-medium text-zinc-600 hover:text-zinc-900"
            >
              Cobrança da Plataforma
            </Link>
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              /
            </span>
            <span className="hidden sm:inline-block text-xs font-medium text-zinc-900">
              Avaliar Comprovante
            </span>
          </div>

          <Link
            href="/admin/cobranca-plataforma"
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
          >
            ← Voltar
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-zinc-900">
                  Avaliação de comprovante Pix
                </h1>
                <Badge
                  variant={
                    receiptData.status === "SUBMITTED"
                      ? "warning"
                      : receiptData.status === "APPROVED"
                      ? "brand"
                      : "danger"
                  }
                >
                  {receiptData.status === "SUBMITTED"
                    ? "Aguardando Análise"
                    : receiptData.status === "APPROVED"
                    ? "Aprovado"
                    : "Rejeitado"}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-zinc-600">
                Consultoria: <strong>{receiptData.consultancy_name}</strong> ({receiptData.consultancy_slug})
              </p>
            </div>
          </div>

          {/* Detalhes da Cobrança */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
              <span className="text-xs text-zinc-500 font-medium">Cobrança</span>
              <p className="text-sm font-semibold text-zinc-900">{receiptData.charge_title}</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
              <span className="text-xs text-zinc-500 font-medium">Valor da Fatura</span>
              <p className="text-sm font-bold text-zinc-900">
                {formatBrlCents(Number(receiptData.charge_amount_cents))}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
              <span className="text-xs text-zinc-500 font-medium">Vencimento</span>
              <p className="text-sm font-semibold text-zinc-900">
                {formatIsoDateToBr(String(receiptData.charge_due_on))}
              </p>
            </div>
          </div>

          {/* Detalhes do Arquivo */}
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-zinc-700">Arquivo enviado:</span>
                <p className="text-sm font-mono text-zinc-900">{receiptData.file_name}</p>
                <p className="text-xs text-zinc-500">
                  Tamanho: {(Number(receiptData.file_size_bytes) / 1024).toFixed(1)} KB • Tipo: {receiptData.mime_type} • Enviado por: {receiptData.submitter_name}
                </p>
              </div>

              <Link
                href={fileUrl}
                target="_blank"
                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white transition-colors shrink-0"
              >
                Abrir Comprovante ↗
              </Link>
            </div>
          </div>

          {/* Ações de Avaliação (Apenas se SUBMITTED) */}
          {receiptData.status === "SUBMITTED" ? (
            <div className="pt-4 border-t border-zinc-100 space-y-6">
              <h2 className="text-sm font-semibold text-zinc-900">Decisão de análise</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Aprovar */}
                <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-emerald-900">Aprovar comprovante</h3>
                    <p className="text-xs text-emerald-800 leading-relaxed">
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
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#00A859] hover:bg-[#008f4c] text-white transition-colors"
                    >
                      ✓ Confirmar Aprovação e Quitação
                    </button>
                  </form>
                </div>

                {/* Rejeitar */}
                <div className="p-5 rounded-xl border border-red-200 bg-red-50/40 space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-red-900">Rejeitar comprovante</h3>
                    <p className="text-xs text-red-800 leading-relaxed">
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
                    className="space-y-2"
                  >
                    <input
                      type="text"
                      name="reason"
                      placeholder="Motivo da rejeição (ex: valor divergente, comprovante ilegível)"
                      required
                      className="w-full h-9 px-3 rounded-lg border border-red-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <button
                      type="submit"
                      className="w-full py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
                    >
                      Rejeitar Comprovante
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 text-xs text-zinc-600">
              <p>
                Avaliado por <strong>{receiptData.reviewer_name || "Administrador"}</strong> em{" "}
                {formatIsoDateToBr(receiptData.reviewed_at ? new Date(receiptData.reviewed_at).toISOString().slice(0, 10) : "")}.
              </p>
              {receiptData.rejection_reason && (
                <p className="text-red-700 mt-1">
                  Motivo da rejeição: {receiptData.rejection_reason}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
