import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getDbConnection } from "@/lib/db/mysql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;

  const session = await getCurrentSession();
  if (!session) {
    return new NextResponse("Não autenticado.", { status: 401 });
  }

  const consultancyCtx = await resolveConsultancyContext(session.userId, slug);
  if (!consultancyCtx) {
    return new NextResponse("Acesso não autorizado a esta consultoria.", { status: 403 });
  }

  const isStaff =
    consultancyCtx.roles.includes("CONSULTANCY_ADMIN") ||
    consultancyCtx.roles.includes("PERSONAL") ||
    consultancyCtx.roles.includes("NUTRITIONIST");

  if (!isStaff) {
    return new NextResponse("Acesso restrito a profissionais e administradores.", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q")?.trim() || "";

  const db = await getDbConnection();
  try {
    let sql = `
      SELECT
        cm.id AS membership_id,
        cm.public_id AS membership_public_id,
        u.full_name,
        u.email
      FROM consultancy_members cm
      INNER JOIN users u ON u.id = cm.user_id
      INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role IN ('STUDENT', 'INFLUENCER')
      WHERE cm.consultancy_id = ?
        AND cm.status = 'ACTIVE'
        AND u.deleted_at IS NULL
    `;
    const paramsArr: (string | number | bigint)[] = [consultancyCtx.consultancyId];

    if (search) {
      sql += ` AND (u.full_name LIKE ? OR u.email LIKE ?)`;
      paramsArr.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY u.full_name ASC LIMIT 100;`;

    const [rows] = await db.query<RowDataPacket[]>(sql, paramsArr);

    const students = (rows || []).map((r) => ({
      membershipId: Number(r.membership_id),
      membershipPublicId: String(r.membership_public_id),
      name: String(r.full_name),
      email: String(r.email),
    }));

    return NextResponse.json({
      success: true,
      students,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao listar alunos.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  } finally {
    db.release();
  }
}
