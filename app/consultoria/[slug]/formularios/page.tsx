import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { CustomFormsHub } from "@/components/consultancies/custom-forms/custom-forms-hub";
import { listFormTemplates, listFormRequests } from "@/lib/consultancies/custom-forms";
import { getDbConnection } from "@/lib/db/mysql";
import type { RowDataPacket } from "mysql2/promise";

interface FormulariosPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export default async function FormulariosPage({ params }: FormulariosPageProps) {
  const { slug } = await params;
  const session = await getCurrentSession();

  if (!session) {
    redirect(`/login?redirect=/consultoria/${slug}/formularios`);
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    notFound();
  }

  const isConsultancyAdmin = context.roles.includes("CONSULTANCY_ADMIN");
  const isPersonal = context.roles.includes("PERSONAL");
  const isNutritionist = context.roles.includes("NUTRITIONIST");
  const isProfessional = isPersonal || isNutritionist;
  const isStudent = context.roles.includes("STUDENT") || context.roles.includes("INFLUENCER");

  // 1. Fetch templates
  const templates = await listFormTemplates(session.userId, slug);

  // 2. Fetch requests
  const requests = await listFormRequests(session.userId, slug);

  // 3. If professional or admin, fetch active students in consultancy
  let studentOptions: { publicId: string; name: string; email: string }[] = [];
  if (isConsultancyAdmin || isProfessional) {
    const connection = await getDbConnection();
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT cm.public_id, u.name, u.email
         FROM consultancy_members cm
         JOIN users u ON u.id = cm.user_id
         JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
         WHERE cm.consultancy_id = ? AND cm.status = 'ACTIVE'
           AND cmr.role IN ('STUDENT', 'INFLUENCER')
         GROUP BY cm.public_id, u.name, u.email
         ORDER BY u.name ASC;`,
        [context.consultancyId]
      );

      studentOptions = rows.map((r) => ({
        publicId: String(r.public_id),
        name: String(r.name),
        email: String(r.email),
      }));
    } finally {
      connection.release();
    }
  }

  return (
    <ConsultancyAppShell
      consultancySlug={slug}
      consultancyName={context.consultancyName}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <CustomFormsHub
        consultancySlug={slug}
        isConsultancyAdmin={isConsultancyAdmin}
        isProfessional={isProfessional}
        isStudent={isStudent}
        initialTemplates={templates}
        initialRequests={requests}
        studentOptions={studentOptions}
      />
    </ConsultancyAppShell>
  );
}
