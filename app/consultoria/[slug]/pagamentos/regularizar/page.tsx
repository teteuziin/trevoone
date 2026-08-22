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
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

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

  // Se não está restrito, redireciona para a visão geral da consultoria
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
          eyebrow="FINANCEIRO"
          title="Acesso Temporariamente Restrito"
          description="Existe uma cobrança vencida que precisa ser regularizada para continuar acessando os recursos da consultoria."
        />

        {/* Notice Alert */}
        <Alert variant="warning" title="Pendência Financeira Detectada">
          <p className="text-xs">
            {overdueChargeCount > 1
              ? `Você possui ${overdueChargeCount} cobranças vencidas em sua conta.`
              : "Existe 1 mensalidade pendente de quitação."}{" "}
            Efetue o pagamento e envie o comprovante para reativar seu acesso.
          </p>
        </Alert>

        {/* Blocking Charge Card */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0 text-amber-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            <div className="space-y-1 min-w-0">
              <h2 className="text-base font-bold text-zinc-900 truncate">
                {blockingCharge.title}
              </h2>
              <p className="text-xs text-zinc-500">
                Vencimento em <strong className="text-zinc-800 font-semibold">{formatDateBr(blockingCharge.dueOn)}</strong>
              </p>
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-500 font-medium block">Valor para Regularização</span>
              <p className="text-2xl font-bold text-zinc-900 tracking-tight">
                {formatCentsToBrl(blockingCharge.amountCents)}
              </p>
            </div>

            <Link href={`/consultoria/${slug}/pagamentos/${blockingCharge.publicId}`}>
              <Button variant="primary" size="md">
                Efetuar Pagamento
              </Button>
            </Link>
          </div>

          <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
            <span>Dúvidas ou problemas com o pagamento?</span>
            <Link
              href={`/consultoria/${slug}/pagamentos`}
              className="text-[#00A859] hover:underline font-semibold"
            >
              Ver todas as minhas mensalidades →
            </Link>
          </div>
        </div>
      </div>
    </ConsultancyAppShell>
  );
}
