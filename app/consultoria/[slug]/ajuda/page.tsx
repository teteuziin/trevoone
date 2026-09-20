import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { listConsultancySupportRecipients } from "@/lib/consultancies/support";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { HelpSupportHub } from "@/components/help/help-support-hub";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function HelpSupportPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?redirect=/consultoria/${slug}/ajuda`);
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);
  const recipients = await listConsultancySupportRecipients(context.consultancySlug, session.userId);

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      consultancyPublicId={context.consultancyPublicId}
      viewModeState={effectiveState}
    >
      <HelpSupportHub
        consultancySlug={context.consultancySlug}
        consultancyName={context.consultancyName}
        userRole={effectiveState.effectiveMode}
        recipients={recipients}
        currentUserFullName={session.fullName}
      />
    </ConsultancyAppShell>
  );
}
