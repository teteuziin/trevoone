import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultationJoinAccess } from "@/lib/consultancies/consultations";
import { fetchTemporaryIceServers } from "@/lib/consultancies/turn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{
    slug: string;
    consultationPublicId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "UNAUTHENTICATED", message: "Não autenticado." },
      { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const { slug, consultationPublicId } = await params;

  // 1. Authorize exact participant and join window
  const access = await resolveConsultationJoinAccess(session.userId, slug, consultationPublicId);
  if (!access.allowed) {
    const status =
      access.reason === "UNAUTHENTICATED"
        ? 401
        : access.reason === "CONSULTATION_FORBIDDEN" || access.reason === "STUDENT_BILLING_BLOCKED"
        ? 403
        : access.reason === "CONSULTATION_NOT_FOUND" || access.reason === "INVALID_CONTEXT"
        ? 404
        : 400;

    return NextResponse.json(
      {
        success: false,
        error: access.reason,
        message: "Acesso não autorizado para obtenção de servidores de mídia.",
      },
      { status, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  // 2. Fetch temporary TURN credentials and ICE configuration (server-controlled TTL)
  const res = await fetchTemporaryIceServers(
    access.consultation.publicId,
    access.consultation.scheduledEndAt
  );

  if (!res.success) {
    const status =
      res.error === "TURN_NOT_CONFIGURED" || res.error === "TURN_PROVIDER_NOT_CONFIGURED"
        ? 503
        : res.error === "TURN_PROVIDER_UNAVAILABLE" || res.error === "TURN_AUTHORIZATION_DENIED"
        ? 502
        : res.error === "TURN_PROVIDER_TIMEOUT"
        ? 504
        : res.error === "TURN_CONFIG_INVALID"
        ? 500
        : res.error === "JOIN_WINDOW_CLOSED"
        ? 400
        : 400;

    return NextResponse.json(res, {
      status,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }

  return NextResponse.json(res, {
    status: 200,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
