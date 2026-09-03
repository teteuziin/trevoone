/**
 * TREVO ONE — TRAINING V2 MEDIA STREAMING & READ ROUTE
 * GET /api/training-v2/media/[publicId]
 * HEAD /api/training-v2/media/[publicId]
 * Serves private images and video streams after verifying C1 access authorization.
 * Supports HTTP 206 Partial Content byte ranges for video streaming.
 * Strictly avoids exposing server filesystem paths, storage keys, or database IDs.
 */

import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { authorizeMediaAssetAccess } from "@/lib/training-v2/media-repository";
import { resolveSafeTrainingMediaPath } from "@/lib/training-v2/media-storage";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    publicId: string;
  }>;
};

async function handleMediaRequest(request: Request, paramsPromise: Promise<{ publicId: string }>, isHead: boolean) {
  const { publicId } = await paramsPromise;

  if (!publicId || typeof publicId !== "string" || !publicId.trim()) {
    return new Response(null, { status: 404 });
  }

  // 1. Authenticate user session
  const session = await getCurrentSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Não autenticado." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { searchParams } = new URL(request.url);
  const assignmentPublicId = searchParams.get("assignmentPublicId") || undefined;
  const consultancyQuery = searchParams.get("consultancy") || null;

  // 2. Resolve consultancy identifier if not explicitly provided
  let consultancyIdentifier = consultancyQuery;
  if (!consultancyIdentifier) {
    let connection;
    try {
      connection = await getDbConnection();
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT c.public_id AS consultancy_public_id, ma.scope
         FROM media_assets ma
         LEFT JOIN consultancies c ON c.id = ma.consultancy_id
         WHERE ma.public_id = ? AND ma.deleted_at IS NULL
         LIMIT 1;`,
        [publicId]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        if (rows[0].consultancy_public_id) {
          consultancyIdentifier = String(rows[0].consultancy_public_id);
        } else if (rows[0].scope === "GLOBAL") {
          // Asset is GLOBAL: resolve user's primary professional consultancy if available
          const [userConsultancies] = await connection.execute<RowDataPacket[]>(
            `SELECT c.public_id
             FROM consultancy_members cm
             INNER JOIN consultancies c ON c.id = cm.consultancy_id
             INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
             WHERE cm.user_id = ? AND cm.status = 'ACTIVE' AND c.status = 'ACTIVE' AND c.deleted_at IS NULL
               AND cmr.role IN ('PERSONAL', 'CONSULTANCY_ADMIN')
             LIMIT 1;`,
            [session.userId]
          );
          if (Array.isArray(userConsultancies) && userConsultancies.length > 0) {
            consultancyIdentifier = String(userConsultancies[0].public_id);
          }
        }
      }
    } finally {
      if (connection) connection.release();
    }
  }

  // 3. Resolve trusted Training Access Context
  const ctx = await resolveTrainingAccessContext(consultancyIdentifier);
  if (!ctx) {
    return new Response(null, { status: 404 });
  }

  // 4. Authorize media access using C1 repository layer
  const authResult = await authorizeMediaAssetAccess(ctx, publicId, {
    assignmentPublicId,
  });

  if (!authResult.authorized || !authResult.mediaAsset || !authResult.storageKey) {
    // Non-enumerating safe rejection
    return new Response(null, { status: 404 });
  }

  // 5. Resolve safe physical file path under private storage root
  let physicalPath: string;
  try {
    physicalPath = resolveSafeTrainingMediaPath(authResult.storageKey);
  } catch {
    return new Response(null, { status: 404 });
  }

  // 6. Check physical file existence and metadata
  let fileStats;
  try {
    fileStats = await fs.stat(physicalPath);
  } catch {
    console.error("[TRAINING_V2] MEDIA_FILE_MISSING");
    return new Response(null, { status: 404 });
  }

  const totalSize = fileStats.size;
  const mimeType = authResult.mediaAsset.mimeType;
  const isVideo = authResult.mediaAsset.mediaType === "VIDEO";

  const standardHeaders: Record<string, string> = {
    "Content-Type": mimeType,
    "Content-Disposition": "inline",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };

  // 7. Image Delivery
  if (!isVideo) {
    standardHeaders["Content-Length"] = totalSize.toString();
    if (isHead) {
      return new Response(null, { status: 200, headers: standardHeaders });
    }

    const fileStream = createReadStream(physicalPath);
    const webStream = Readable.toWeb(fileStream) as ReadableStream<Uint8Array>;
    return new Response(webStream, { status: 200, headers: standardHeaders });
  }

  // 8. Video Delivery with HTTP Range (206 Partial Content) support
  standardHeaders["Accept-Ranges"] = "bytes";
  const rangeHeader = request.headers.get("range");

  // A. No Range header: serve full video
  if (!rangeHeader) {
    standardHeaders["Content-Length"] = totalSize.toString();
    if (isHead) {
      return new Response(null, { status: 200, headers: standardHeaders });
    }

    const fileStream = createReadStream(physicalPath);
    const webStream = Readable.toWeb(fileStream) as ReadableStream<Uint8Array>;
    return new Response(webStream, { status: 200, headers: standardHeaders });
  }

  // B. Range header present: parse single range
  if (!rangeHeader.startsWith("bytes=") || rangeHeader.includes(",")) {
    // Multi-range or invalid unit: return 416
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${totalSize}`,
        "Accept-Ranges": "bytes",
      },
    });
  }

  const rangeSpec = rangeHeader.slice("bytes=".length).trim();
  const parts = rangeSpec.split("-");
  if (parts.length !== 2) {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${totalSize}`,
        "Accept-Ranges": "bytes",
      },
    });
  }

  let start: number;
  let end: number;

  const [startStr, endStr] = parts;

  if (startStr === "") {
    // Suffix range: e.g. bytes=-500 (last 500 bytes)
    const suffixLength = Number(endStr);
    if (isNaN(suffixLength) || suffixLength <= 0) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${totalSize}` },
      });
    }
    start = Math.max(0, totalSize - suffixLength);
    end = totalSize - 1;
  } else if (endStr === "") {
    // Open-ended range: e.g. bytes=1000-
    start = Number(startStr);
    if (isNaN(start) || start < 0 || start >= totalSize) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${totalSize}` },
      });
    }
    end = totalSize - 1;
  } else {
    // Standard closed range: e.g. bytes=0-999
    start = Number(startStr);
    end = Number(endStr);
    if (isNaN(start) || isNaN(end) || start < 0 || start > end || start >= totalSize) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${totalSize}` },
      });
    }
    end = Math.min(end, totalSize - 1);
  }

  const chunkSize = end - start + 1;
  const rangeHeaders: Record<string, string> = {
    ...standardHeaders,
    "Content-Range": `bytes ${start}-${end}/${totalSize}`,
    "Content-Length": chunkSize.toString(),
  };

  if (isHead) {
    return new Response(null, { status: 206, headers: rangeHeaders });
  }

  const chunkStream = createReadStream(physicalPath, { start, end });
  const webStream = Readable.toWeb(chunkStream) as ReadableStream<Uint8Array>;
  return new Response(webStream, { status: 206, headers: rangeHeaders });
}

export async function GET(request: Request, context: RouteParams) {
  return handleMediaRequest(request, context.params, false);
}

export async function HEAD(request: Request, context: RouteParams) {
  return handleMediaRequest(request, context.params, true);
}
