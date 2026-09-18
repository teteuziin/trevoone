import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { getPrivateStorageRoot, resolveSafeStoragePath } from "@/lib/storage/private-files";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  if (!slug || typeof slug !== "string") {
    return new NextResponse(null, { status: 400 });
  }

  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status FROM consultancies WHERE slug = ? AND deleted_at IS NULL LIMIT 1;`,
      [slug]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return new NextResponse(null, { status: 404 });
    }

    const consultancyId = Number(rows[0].id);

    // Look for stored consultancy logo (webp, jpg, png)
    const storageRoot = getPrivateStorageRoot();
    const extensions = [".jpg", ".webp", ".png"];
    let foundBuffer: Buffer | null = null;
    let foundMime = "image/jpeg";

    for (const ext of extensions) {
      try {
        const storageKey = path.join("consultancy-logos", `${consultancyId}${ext}`);
        const safePath = resolveSafeStoragePath(storageRoot, storageKey);
        const buffer = await fs.readFile(safePath);
        foundBuffer = buffer;
        foundMime = ext === ".webp" ? "image/webp" : ext === ".png" ? "image/png" : "image/jpeg";
        break;
      } catch {
        // Continue to check other extensions
      }
    }

    if (!foundBuffer) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(new Uint8Array(foundBuffer), {
      status: 200,
      headers: {
        "Content-Type": foundMime,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
