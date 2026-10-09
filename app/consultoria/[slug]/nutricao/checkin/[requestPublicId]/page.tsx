import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { StudentCheckinForm } from "@/components/consultancies/nutrition-v2/student-checkin-form";
import type { CheckinRequestDto, PersistedCheckinRequestStatus } from "@/lib/nutrition-v2/checkin-types";
import { deriveCheckinRequestState } from "@/lib/nutrition-v2/checkin-types";

type PageProps = {
  params: Promise<{
    slug: string;
    requestPublicId: string;
  }>;
};

async function getCheckinRequestForStudent(
  consultancyId: number,
  studentMembershipId: number,
  requestPublicId: string
): Promise<CheckinRequestDto | null> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT r.*, u.full_name AS student_name, cm.public_id AS student_public_id,
              resp.public_id AS response_public_id, resp.id AS response_id
       FROM nutrition_v2_checkin_requests r
       JOIN consultancy_members cm ON cm.id = r.student_membership_id
       JOIN users u ON u.id = cm.user_id
       LEFT JOIN nutrition_v2_checkins resp ON resp.request_id = r.id
       WHERE r.public_id = ?
         AND r.consultancy_id = ?
         AND r.student_membership_id = ?
       LIMIT 1;`,
      [requestPublicId, consultancyId, studentMembershipId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    const status = row.status as PersistedCheckinRequestStatus;
    const dueAt = row.due_at
      ? typeof row.due_at === "string"
        ? row.due_at
        : new Date(row.due_at).toISOString()
      : null;

    return {
      id: Number(row.id),
      publicId: String(row.public_id),
      consultancyId: Number(row.consultancy_id),
      studentMembershipId: Number(row.student_membership_id),
      studentName: row.student_name ? String(row.student_name) : undefined,
      studentPublicId: row.student_public_id ? String(row.student_public_id) : undefined,
      requestedByMembershipId: Number(row.requested_by_membership_id),
      status,
      derivedState: deriveCheckinRequestState(status, dueAt),
      requestedAt: row.requested_at
        ? typeof row.requested_at === "string"
          ? row.requested_at
          : new Date(row.requested_at).toISOString()
        : new Date().toISOString(),
      dueAt,
      canceledAt: row.canceled_at
        ? typeof row.canceled_at === "string"
          ? row.canceled_at
          : new Date(row.canceled_at).toISOString()
        : null,
      canceledByMembershipId: row.canceled_by_membership_id ? Number(row.canceled_by_membership_id) : null,
      createdAt: row.created_at
        ? typeof row.created_at === "string"
          ? row.created_at
          : new Date(row.created_at).toISOString()
        : new Date().toISOString(),
      updatedAt: row.updated_at
        ? typeof row.updated_at === "string"
          ? row.updated_at
          : new Date(row.updated_at).toISOString()
        : new Date().toISOString(),
      hasResponse: Boolean(row.response_id),
      responsePublicId: row.response_public_id ? String(row.response_public_id) : null,
    };
  } finally {
    connection.release();
  }
}

export default async function StudentCheckinPage({ params }: PageProps) {
  const { slug, requestPublicId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const access = await resolveStudentModuleAccess(session.userId, slug);
  if (access.reason === "UNAUTHENTICATED") {
    redirect("/login");
  }
  if (access.reason === "INVALID_CONTEXT" || !access.context) {
    redirect("/selecionar-consultoria");
  }
  if (access.reason === "NOT_STUDENT") {
    redirect(`/consultoria/${access.context.consultancySlug}`);
  }
  if (access.reason === "FINANCIALLY_RESTRICTED") {
    redirect(`/consultoria/${access.context.consultancySlug}/pagamentos/regularizar`);
  }

  const request = await getCheckinRequestForStudent(
    access.context.consultancyId,
    access.context.membershipId,
    requestPublicId
  );

  if (!request) {
    notFound();
  }

  return (
    <ConsultancyAppShell
      consultancyName={access.context.consultancyName}
      consultancySlug={access.context.consultancySlug}
      consultancyLogoUrl={access.context.consultancyLogoUrl}
      roles={access.context.roles}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
      consultancyPublicId={access.context.consultancyPublicId}
      activeRole="STUDENT"
    >
      <div className="w-full max-w-2xl mx-auto space-y-4 py-2 sm:py-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/consultoria/${slug}`}
            className="inline-flex items-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            ← Voltar ao painel
          </Link>
        </div>

        <StudentCheckinForm slug={slug} request={request} />
      </div>
    </ConsultancyAppShell>
  );
}
