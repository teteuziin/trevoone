import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getConsultancyFinanceSettings } from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
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

  if (!context.roles.includes("CONSULTANCY_ADMIN")) {
    redirect(`/consultoria/${slug}`);
  }

  const settings = await getConsultancyFinanceSettings(context.consultancyId);

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
        <PageHeader
          backHref={`/consultoria/${slug}/financeiro`}
          backLabel="Voltar ao Financeiro"
          title="Emitir Nova Cobrança"
          eyebrow="FINANCEIRO"
        />

        <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs">
          <ChargeForm slug={slug} hasFinanceSettings={Boolean(settings)} />
        </div>
      </div>
    </ConsultancyAppShell>
  );
}
