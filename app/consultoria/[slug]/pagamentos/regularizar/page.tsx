import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  getStudentFinancialAccessState,
  formatCentsToBrl,
} from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatDateBr(isoDateStr: string): string {
  if (!isoDateStr || !isoDateStr.includes("-")) return isoDateStr;
  const [y, m, d] = isoDateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default async function StudentRegularizationPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?redirect=/consultoria/${slug}/pagamentos/regularizar`);
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  if (!context.roles.includes("STUDENT")) {
    redirect(`/consultoria/${slug}`);
  }

  const financialStatus = await getStudentFinancialAccessState({
    consultancyId: context.consultancyId,
    studentMembershipId: context.membershipId,
  });

  // Se não está restrito, redireciona para a visão geral da consultoria (sem tela de bloqueio obsoleta)
  if (!financialStatus.isRestricted || !financialStatus.blockingCharge) {
    redirect(`/consultoria/${slug}`);
  }

  const { blockingCharge, overdueChargeCount } = financialStatus;

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Principal */}
        <PageHeader
          title="Acesso Temporariamente Restrito"
          description="Existe uma cobrança vencida que precisa ser regularizada para continuar usando os recursos da consultoria."
        />

        {/* Card Principal de Regularização */}
        <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6">
            {/* Ícone e Aviso */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    Pendência Financeira
                  </span>
                  {overdueChargeCount > 1 && (
                    <span className="text-xs text-zinc-500 font-medium">
                      ({overdueChargeCount} cobranças vencidas)
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-zinc-900">
                  Regularize seu pagamento para liberar seu acesso
                </h2>
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                  Para retomar o acesso aos módulos de treinos, nutrição e progresso na consultoria{" "}
                  <span className="font-semibold text-zinc-800">{context.consultancyName}</span>, efetue o pagamento da cobrança pendente abaixo via Pix.
                </p>
              </div>
            </div>

            {/* Detalhes da Cobrança Bloqueante */}
            <div className="p-5 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Cobrança pendente</p>
                  <p className="text-base font-bold text-zinc-900">{blockingCharge.title}</p>
                </div>

                <div className="sm:text-right">
                  <p className="text-xs text-zinc-500 font-medium">Valor</p>
                  <p className="text-lg font-extrabold text-zinc-900">
                    {formatCentsToBrl(blockingCharge.amountCents)}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between text-xs text-zinc-600">
                <span>Vencimento:</span>
                <span className="font-semibold text-red-600">
                  {formatDateBr(blockingCharge.dueOn)} (Vencida)
                </span>
              </div>
            </div>

            {/* Alerta de Comprovante em Análise se houver */}
            {blockingCharge.hasSubmittedReceipt && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="space-y-0.5 text-xs text-blue-800">
                  <p className="font-semibold">Comprovante em análise</p>
                  <p className="text-blue-700">
                    Se você já enviou o comprovante, a liberação acontece após a confirmação do pagamento pela consultoria.
                  </p>
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href={`/consultoria/${slug}/pagamentos/${blockingCharge.publicId}`}
                className="inline-flex items-center justify-center w-full sm:w-auto flex-1 h-12 px-6 bg-[var(--brand-strong)] hover:bg-[var(--brand)] active:bg-[var(--brand-active)] text-white text-sm font-semibold rounded-xl shadow-xs transition-colors focus-visible:outline-[var(--brand)] select-none"
              >
                Ver cobrança e regularizar
              </Link>

              <Link
                href={`/consultoria/${slug}/pagamentos`}
                className="inline-flex items-center justify-center w-full sm:w-auto h-12 px-5 bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 text-sm font-semibold rounded-xl border border-zinc-300 shadow-xs transition-colors focus-visible:outline-[var(--brand)] select-none"
              >
                Histórico de pagamentos
              </Link>
            </div>
          </div>
        </div>

        {/* Links de navegação alternativa / escape */}
        <div className="text-center pt-2">
          <Link
            href="/selecionar-consultoria"
            className="text-xs text-zinc-500 hover:text-zinc-800 underline underline-offset-4 transition-colors"
          >
            Acessar outra consultoria
          </Link>
        </div>
      </div>
    </ConsultancyAppShell>
  );
}
