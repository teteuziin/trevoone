import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getMealTrackingPhotoStream } from "@/lib/nutrition-v2/meal-tracking-storage";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    slug: string;
    logPublicId: string;
  }>;
}

/**
 * GET: Streams an authenticated, private meal tracking photo.
 * Security & Privacy:
 * - Patient owner: ALLOW
 * - Authorized consultancy nutritionist/admin: ALLOW
 * - Unauthenticated / Cross-tenant / Other patient: 401 / 403 / 404
 * - Cache-Control: private, max-age=3600
 * - X-Content-Type-Options: nosniff
 */
export async function GET(request: Request, context: RouteParams) {
  const { slug, logPublicId } = await context.params;

  const session = await getCurrentSession();
  if (!session) {
    return new NextResponse(
      JSON.stringify({ error: "Sessão expirada. Faça login novamente." }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const result = await getMealTrackingPhotoStream({
    userId: session.userId,
    consultancySlug: slug,
    logPublicId,
  });

  if (!result.success) {
    return new NextResponse(
      JSON.stringify({ error: result.error || "Acesso negado à imagem." }),
      {
        status: result.statusCode || 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": result.mimeType || "image/jpeg",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
