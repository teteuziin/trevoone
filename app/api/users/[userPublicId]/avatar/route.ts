import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import type { RowDataPacket } from "mysql2/promise";
import { getCurrentSession } from "@/lib/auth/session";
import { getDbConnection } from "@/lib/db/mysql";
import { getPrivateStorageRoot, resolveSafeStoragePath } from "@/lib/storage/private-files";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{
    userPublicId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getCurrentSession();
  if (!session) {
    return new NextResponse(null, { status: 401 });
  }

  const { userPublicId } = await params;
  if (!userPublicId || typeof userPublicId !== "string" || userPublicId.trim().length < 10) {
    return new NextResponse(null, { status: 400 });
  }

  let connection;
  try {
    connection = await getDbConnection();

    // Query user profile by user public_id
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT up.profile_photo_storage_key, up.profile_photo_mime, up.profile_photo_updated_at
       FROM users u
       JOIN user_profiles up ON up.user_id = u.id
       WHERE u.public_id = ? AND u.deleted_at IS NULL
       LIMIT 1;`,
      [userPublicId.trim()]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return new NextResponse(null, { status: 404 });
    }

    const row = rows[0];
    const storageKey = row.profile_photo_storage_key ? String(row.profile_photo_storage_key) : null;
    const mimeType = row.profile_photo_mime ? String(row.profile_photo_mime) : "image/jpeg";

    if (!storageKey) {
      return new NextResponse(null, { status: 404 });
    }

    const storageRoot = getPrivateStorageRoot();
    const targetPath = resolveSafeStoragePath(storageRoot, storageKey);
    const buffer = await fs.readFile(targetPath);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  } finally {
    if (connection) connection.release();
  }
}
