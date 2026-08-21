import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getConsultancyLocalDate } from "@/lib/consultancies/timezone";
import { listEligibleInfluencers } from "@/lib/consultancies/missions";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
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
        <PageHeader
          backHref={`/consultoria/${slug}/missoes/gestao`}
          backLabel="Voltar para Gestão de Missões"
          eyebrow="GESTÃO DE MISSÕES"
          title="Nova Missão"
          description="Defina os objetivos, orientações e prazo de entrega para o influenciador ou parceiro VIP."
        />

        <Surface variant="default" padding="lg">
          <MissionCreateForm
            slug={slug}
            timezone={consultancyContext.consultancyTimezone}
            influencers={influencers}
            defaultDate={defaultDueDate}
          />
        </Surface>
      </div>
    </ConsultancyAppShell>
  );
}
