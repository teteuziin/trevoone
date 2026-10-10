import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getFollowupPhotoStream } from "@/lib/nutrition-v2/followup-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    slug: string;
    eventPublicId: string;
  }>;
}

/**
 * GET: Streams an authenticated, private meal photo with strict security headers.
 * Access rules:
 * - Student owner: ALLOW
 * - Authorized professionals: ALLOW
 * - Cross-tenant or unauthorized student: DENY
 */
export async function GET(request: Request, context: RouteParams) {
  const { slug, eventPublicId } = await context.params;

  const session = await getCurrentSession();
  if (!session) {
    return new NextResponse(JSON.stringify({ error: "Sessão expirada. Faça login novamente." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await getFollowupPhotoStream({
    userId: session.userId,
    consultancySlug: slug,
    eventPublicId,
  });

  if (!result.success || !result.buffer) {
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
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
