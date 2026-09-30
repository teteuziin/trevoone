import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { getConsultancyAiSettings } from "@/lib/ai/quotas";
import { getDbConnection } from "@/lib/db/mysql";
import { ConsultancyAiSettingsView } from "@/components/consultancies/settings/consultancy-ai-settings-view";
import type { RowDataPacket } from "mysql2/promise";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ConsultancyAiSettingsPage({ params }: PageProps) {
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

  const settings = await getConsultancyAiSettings(context.consultancyId);

  // Fetch team members eligible for individual overrides (Personal or Nutritionist)
  let availableMembers: Array<{
    membershipId: number;
    fullName: string;
    email: string;
    role: string;
  }> = [];

  const conn = await getDbConnection();
  try {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT
        cm.id AS membership_id,
        u.full_name,
        u.email,
        cmr.role
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND cmr.role IN ('PERSONAL', 'NUTRITIONIST')
       ORDER BY u.full_name ASC`,
      [context.consultancyId]
    );

    availableMembers = rows.map((r) => ({
      membershipId: Number(r.membership_id),
      fullName: String(r.full_name),
      email: String(r.email),
      role: String(r.role),
    }));
  } finally {
    conn.release();
  }

  return (
    <ConsultancyAppShell
      consultancySlug={slug}
      consultancyName={context.consultancyName}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
    >
      <ConsultancyAiSettingsView
        consultancySlug={slug}
        consultancyQuota={settings.consultancyQuota}
        initialRoleLimits={settings.roleLimits}
        initialMemberOverrides={settings.memberOverrides}
        availableMembers={availableMembers}
      />
    </ConsultancyAppShell>
  );
}
