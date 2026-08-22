import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  getSubmittedPaymentReceiptsPage,
  formatCentsToBrl,
} from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    pagina?: string;
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

export default async function AdminPaymentReceiptsQueuePage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { pagina } = await searchParams;

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

  const currentPage = Math.max(1, parseInt(pagina || "1", 10) || 1);
  const result = await getSubmittedPaymentReceiptsPage({
    consultancyId: context.consultancyId,
    page: currentPage,
    pageSize: 20,
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
        {/* Header Principal */}
        <PageHeader
          backHref={`/consultoria/${slug}/financeiro`}
          backLabel="Voltar ao Financeiro"
          title="Fila de Comprovantes"
          eyebrow="ADMINISTRAÇÃO DA CONSULTORIA"
          description="Comprovantes de pagamento enviados pelos alunos aguardando análise e confirmação."
        />

        {result.receipts.length === 0 ? (
          <EmptyState
            title="Nenhum comprovante pendente"
            description="Todos os comprovantes de pagamento enviados pelos alunos já foram analisados."
          />
        ) : (
          <div className="space-y-3">
            {result.receipts.map((receipt) => (
              <div
                key={receipt.receiptPublicId}
                className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#00A859]/50 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-zinc-900 truncate">
                        {receipt.studentName}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Aguardando análise
                      </span>
                    </div>

                    <p className="text-xs text-zinc-600 font-medium truncate">
                      {receipt.chargeTitle} —{" "}
                      <strong className="text-zinc-900">{formatCentsToBrl(receipt.amountCents)}</strong>
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                      <span>Arquivo: <strong className="text-zinc-700 font-medium">{receipt.originalFileName}</strong> ({formatBytes(receipt.sizeBytes)})</span>
                      <span>Enviado em: <strong className="text-zinc-700 font-medium">{formatDateTime(receipt.submittedAt)}</strong></span>
                      <span>Vencimento: <strong className="text-zinc-700 font-medium">{formatDateBr(receipt.dueOn)}</strong></span>
                    </div>
                  </div>

                  <div className="pt-2 sm:pt-0 border-t border-zinc-100 sm:border-t-0 shrink-0">
                    <Link href={`/consultoria/${slug}/financeiro/comprovantes/${receipt.receiptPublicId}`}>
                      <Button variant="primary" size="sm">
                        Analisar Comprovante →
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {result.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 bg-white border border-zinc-200/90 rounded-2xl shadow-xs text-xs">
                <p className="text-zinc-500">
                  Página <span className="font-bold text-zinc-900">{result.page}</span> de{" "}
                  <span className="font-bold text-zinc-900">{result.totalPages}</span> ({result.total} comprovantes)
                </p>

                <div className="flex items-center gap-2">
                  {result.page > 1 && (
                    <Link href={`/consultoria/${slug}/financeiro/comprovantes?pagina=${result.page - 1}`}>
                      <Button variant="outline" size="sm">
                        Anterior
                      </Button>
                    </Link>
                  )}

                  {result.page < result.totalPages && (
                    <Link href={`/consultoria/${slug}/financeiro/comprovantes?pagina=${result.page + 1}`}>
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
