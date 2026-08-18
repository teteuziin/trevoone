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
          title="Fila de Comprovantes"
          description="Comprovantes de pagamento enviados pelos alunos aguardando análise e confirmação."
          actions={
            <Link href={`/consultoria/${slug}/financeiro`}>
              <Button variant="outline" size="sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar ao Financeiro
              </Button>
            </Link>
          }
        />

        {/* Lista de Comprovantes */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Aguardando análise ({result.total})
              </span>
            </div>
          </div>

          {result.receipts.length === 0 ? (
            <div className="p-8 sm:p-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 mx-auto flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-zinc-900">Tudo em dia!</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Não há comprovantes aguardando análise no momento. Novos envios aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {result.receipts.map((item) => (
                <div
                  key={item.receiptPublicId}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/70 transition"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-zinc-900 truncate">
                        {item.studentName}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Em análise
                      </span>
                    </div>

                    <p className="text-xs text-zinc-600 font-medium truncate">
                      {item.chargeTitle} •{" "}
                      <span className="text-zinc-900 font-bold">
                        {formatCentsToBrl(item.amountCents)}
                      </span>
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                      <span>Vencimento: {formatDateBr(item.dueOn)}</span>
                      <span>•</span>
                      <span>Enviado em: {formatDateTime(item.submittedAt)}</span>
                      <span>•</span>
                      <span>{item.originalFileName} ({formatBytes(item.sizeBytes)})</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <Link
                      href={`/consultoria/${slug}/financeiro/comprovantes/${item.receiptPublicId}`}
                    >
                      <Button variant="primary" size="sm" className="w-full sm:w-auto">
                        Analisar
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginação */}
          {result.totalPages > 1 && (
            <div className="p-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <p className="text-xs text-zinc-500">
                Página <span className="font-semibold text-zinc-900">{result.page}</span> de{" "}
                <span className="font-semibold text-zinc-900">{result.totalPages}</span> ({result.total} comprovantes)
              </p>

              <div className="flex items-center gap-2">
                {result.page > 1 && (
                  <Link
                    href={`/consultoria/${slug}/financeiro/comprovantes?pagina=${result.page - 1}`}
                  >
                    <Button variant="outline" size="sm">
                      Anterior
                    </Button>
                  </Link>
                )}
                {result.page < result.totalPages && (
                  <Link
                    href={`/consultoria/${slug}/financeiro/comprovantes?pagina=${result.page + 1}`}
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
      </div>
    </ConsultancyAppShell>
  );
}
