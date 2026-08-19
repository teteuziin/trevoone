import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getConsultancyLocalDate } from "@/lib/consultancies/timezone";
import { listEligibleInfluencers } from "@/lib/consultancies/missions";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { MissionCreateForm } from "./mission-form";

export const dynamic = "force-dynamic";

export default async function NewAdminMissionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const { slug } = await params;
  const consultancyContext = await resolveConsultancyContext(session.userId, slug);
  if (!consultancyContext) {
    redirect("/selecionar-consultoria");
  }

  if (!consultancyContext.roles.includes("CONSULTANCY_ADMIN")) {
    redirect(`/consultoria/${slug}`);
  }

  const influencers = await listEligibleInfluencers(consultancyContext.consultancyId);

  // Calculate default due date (today + 7 days in consultancy's canonical timezone)
  const todayLocal = getConsultancyLocalDate(consultancyContext.consultancyTimezone);
  const now = new Date();
  now.setDate(now.getDate() + 7);
  const defaultDueDate = getConsultancyLocalDate(consultancyContext.consultancyTimezone, now) || todayLocal;

  return (
    <ConsultancyAppShell
      consultancyName={consultancyContext.consultancyName}
      consultancySlug={slug}
      consultancyLogoUrl={consultancyContext.consultancyLogoUrl}
      roles={consultancyContext.roles}
    >
      <div className="space-y-6 max-w-3xl mx-auto pb-12">
        <div>
          <Link
            href={`/consultoria/${slug}/missoes/gestao`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors mb-3"
          >
            ← Voltar para Gestão de Missões
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            Nova Missão
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Defina os objetivos, orientações e prazo de entrega para o influenciador ou parceiro VIP.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm">
          <MissionCreateForm
            slug={slug}
            timezone={consultancyContext.consultancyTimezone}
            influencers={influencers}
            defaultDate={defaultDueDate}
          />
        </div>
      </div>
    </ConsultancyAppShell>
  );
}
