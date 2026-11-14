import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { getConsultancyFinanceSettings } from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { ChargeForm } from "@/components/finance/charge-form";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NewChargePage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const isStaff =
    context.roles.includes("CONSULTANCY_ADMIN") ||
    context.roles.includes("PERSONAL");

  if (!isStaff) {
    redirect(`/consultoria/${slug}`);
  }

  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);
  const settings = await getConsultancyFinanceSettings(context.consultancyId);

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
      viewModeState={effectiveState}
      themeVariant="trainer-refined"
      showDashboardWallpaper={true}
      maxWidth="wide"
    >
      <div className="w-full max-w-2xl mx-auto space-y-5 pb-16 font-sans">
        <div>
          <Link
            href={`/consultoria/${slug}/financeiro`}
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-[#526058] hover:text-[#102E23] transition-colors mb-2 min-h-[36px]"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Voltar ao Financeiro</span>
          </Link>
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-[#176B49] uppercase tracking-wider">
              Financeiro
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#102E23] tracking-tight">
              Emitir Nova Cobrança
            </h1>
            <p className="text-xs sm:text-sm text-[#526058]">
              Gere cobranças avulsas para seus alunos com recebimento por Pix ou cartão.
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#E5E8E2] rounded-3xl p-5 sm:p-7 shadow-xs">
          <ChargeForm slug={slug} hasFinanceSettings={Boolean(settings)} />
        </div>
      </div>
    </ConsultancyAppShell>
  );
}
