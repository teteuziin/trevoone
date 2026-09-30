import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { getCurrentSession } from "@/lib/auth/session";
import { getDbConnection } from "@/lib/db/mysql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    publicId: string;
  }>;
}

export async function GET(request: Request, context: RouteParams) {
  const { publicId } = await context.params;

  if (!publicId || typeof publicId !== "string" || !publicId.trim()) {
    return NextResponse.json({ ok: false, error: "ID inválido." }, { status: 400 });
  }

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });
  }

  const db = await getDbConnection();
  try {
    // 1. Fetch exercise
    const [exRows] = await db.query<RowDataPacket[]>(
      `SELECT
        e.id, e.public_id, e.scope, e.consultancy_id, e.visibility,
        e.name, e.description, e.instructions, e.muscle_group_primary, e.equipment
       FROM exercises e
       WHERE e.public_id = ? AND e.status = 'PUBLISHED' AND e.deleted_at IS NULL
       LIMIT 1;`,
      [publicId]
    );

    if (!exRows || exRows.length === 0) {
      return NextResponse.json({ ok: false, error: "Exercício não encontrado." }, { status: 404 });
    }

    const ex = exRows[0];

    // 2. Tenancy check: GLOBAL or member of consultancy
    if (ex.scope === "CONSULTANCY" && ex.consultancy_id) {
      const [memRows] = await db.query<RowDataPacket[]>(
        `SELECT id FROM consultancy_members
         WHERE user_id = ? AND consultancy_id = ? AND status = 'ACTIVE' LIMIT 1;`,
        [session.userId, ex.consultancy_id]
      );
      if (!memRows || memRows.length === 0) {
        return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
      }
    }

    // 3. Fetch media
    const [mediaRows] = await db.query<RowDataPacket[]>(
      `SELECT
        em.role, em.sort_order,
        ma.public_id AS media_public_id, ma.media_type, ma.mime_type, ma.scope AS media_scope, ma.consultancy_id AS media_consultancy_id
       FROM exercise_media em
       INNER JOIN media_assets ma ON ma.id = em.media_asset_id
       WHERE em.exercise_id = ? AND ma.deleted_at IS NULL
       ORDER BY em.sort_order ASC;`,
      [ex.id]
    );

    // Filter media tenancy
    const media = [];
    for (const m of mediaRows || []) {
      if (m.media_scope === "GLOBAL") {
        media.push({
          role: m.role,
          sortOrder: m.sort_order,
          mediaAsset: {
            publicId: m.media_public_id,
            mediaType: m.media_type,
            mimeType: m.mime_type,
          },
        });
      } else if (m.media_consultancy_id && ex.consultancy_id === m.media_consultancy_id) {
        media.push({
          role: m.role,
          sortOrder: m.sort_order,
          mediaAsset: {
            publicId: m.media_public_id,
            mediaType: m.media_type,
            mimeType: m.mime_type,
          },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      exercise: {
        publicId: ex.public_id,
        name: ex.name,
        instructions: ex.instructions,
        muscleGroupPrimary: ex.muscle_group_primary,
        equipment: ex.equipment,
        media,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro no servidor.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    db.release();
  }
}
