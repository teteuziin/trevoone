import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getConsultancyFinanceSettings } from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
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
          title="Nova cobrança"
          description="Emita uma nova cobrança manual via Pix para um aluno da consultoria."
          actions={
            <Link href={`/consultoria/${slug}/financeiro`}>
              <Button variant="outline" size="sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar
              </Button>
            </Link>
          }
        />

        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs">
          <ChargeForm slug={slug} hasFinanceSettings={Boolean(settings)} />
        </div>
      </div>
    </ConsultancyAppShell>
  );
}
