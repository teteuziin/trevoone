import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import type { RowDataPacket } from "mysql2/promise";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { getDbPool } from "@/lib/db/mysql";
import { getPrivateStorageRoot, resolveSafeStoragePath } from "@/lib/storage/private-files";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{
    slug: string;
    attachmentPublicId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getCurrentSession();
  if (!session) {
    return new NextResponse(null, { status: 401 });
  }

  const { slug, attachmentPublicId } = await params;
  if (!slug || !attachmentPublicId) {
    return new NextResponse(null, { status: 400 });
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    return new NextResponse(null, { status: 403 });
  }

  const pool = getDbPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      cm.attachment_url,
      cm.attachment_name,
      cm.attachment_mime_type,
      cc.consultancy_id,
      cm_stud.user_id AS student_user_id,
      cm_prof.user_id AS professional_user_id
     FROM chat_messages cm
     INNER JOIN chat_consultations cc ON cc.id = cm.consultation_id
     INNER JOIN consultancy_members cm_stud ON cm_stud.id = cc.student_membership_id
     INNER JOIN consultancy_members cm_prof ON cm_prof.id = cc.professional_membership_id
     WHERE cm.public_id = ? AND cc.consultancy_id = ?
     LIMIT 1;`,
    [attachmentPublicId, context.consultancyId]
  );

  if (!rows || rows.length === 0) {
    return new NextResponse(null, { status: 404 });
  }

  const msg = rows[0];

  // RBAC: Must be the student, the professional, or consultancy admin
  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);
  const isAuthorized =
    Number(session.userId) === Number(msg.student_user_id) ||
    Number(session.userId) === Number(msg.professional_user_id) ||
    context.roles.includes("CONSULTANCY_ADMIN") ||
    isPlatformAdmin;

  if (!isAuthorized) {
    return new NextResponse(null, { status: 403 });
  }

  const storageKey = msg.attachment_url ? String(msg.attachment_url) : null;
  if (!storageKey) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const storageRoot = getPrivateStorageRoot();
    const targetPath = resolveSafeStoragePath(storageRoot, storageKey);
    const buffer = await fs.readFile(targetPath);

    const mimeType = msg.attachment_mime_type || "application/octet-stream";
    const filename = msg.attachment_name || "anexo";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[Chat Attachment Route] Error serving file:", err);
    return new NextResponse(null, { status: 404 });
  }
}
