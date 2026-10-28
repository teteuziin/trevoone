import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import {
  getStudentFinancialAccessState,
  formatCentsToBrl,
} from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
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

  const isAuthorized = context.roles.includes("STUDENT") || context.roles.includes("INFLUENCER");
  if (!isAuthorized) {
    redirect(`/consultoria/${slug}`);
  }

  const viewModeState = await resolveEffectiveViewMode(slug, context.roles);

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
      userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
      consultancyPublicId={context.consultancyPublicId}
      activeRole="STUDENT"
      viewModeState={viewModeState}
      showDashboardWallpaper={true}
    >
      <div className="max-w-2xl mx-auto space-y-6 pb-12">
        {/* Header Principal Sólido Executivo */}
        <div className="w-full">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#151619] border border-[#303238] shadow-sm text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-[11px] sm:text-xs text-[#8E95A2] font-semibold tracking-wide uppercase">
                    Acompanhamento do Aluno · {context.consultancyName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Acesso Restrito
                  </span>
                </div>

                <div className="flex items-baseline gap-3 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Acesso Temporariamente Restrito
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/consultoria/${slug}`}
                  className="px-4 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] text-[#E5E7EB] hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
                >
                  <span>←</span>
                  <span>Voltar ao painel</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Notice Alert */}
        <Alert variant="warning" title="Pendência Financeira Detectada">
          <p className="text-xs">
            {overdueChargeCount > 1
              ? `Você possui ${overdueChargeCount} cobranças vencidas em sua conta.`
              : "Existe 1 mensalidade pendente de quitação."}{" "}
            Efetue o pagamento e envie o comprovante Pix para reativar seu acesso imediato.
          </p>
        </Alert>

        {/* Blocking Charge Card */}
        <div className="bg-white dark:bg-[#151619] rounded-2xl border border-zinc-200 dark:border-[#303238] shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            <div className="space-y-1 min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white truncate">
                {blockingCharge.title}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-[#8E95A2]">
                Vencimento em <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">{formatDateBr(blockingCharge.dueOn)}</strong>
              </p>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-zinc-500 dark:text-[#8E95A2] font-medium block">Valor para Regularização</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tabular-nums tracking-tight">
                {formatCentsToBrl(blockingCharge.amountCents)}
              </p>
            </div>

            <Link
              href={`/consultoria/${slug}/pagamentos/${blockingCharge.publicId}`}
              className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white min-h-[44px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Ver pagamento e regularizar</span>
              <span>→</span>
            </Link>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-[#303238] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 dark:text-[#8E95A2]">
            <span>Dúvidas ou problemas com o pagamento?</span>
            <Link
              href={`/consultoria/${slug}/pagamentos`}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              Ver todas as minhas cobranças →
            </Link>
          </div>
        </div>
      </div>
    </ConsultancyAppShell>
  );
}
