import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { validateSameOrigin } from "@/lib/security/request-origin";
import {
  publishSignalingMessage,
  pollSignalingMessages,
  type SignalingMessageType,
} from "@/lib/consultancies/signaling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{
    slug: string;
    consultationPublicId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const originCheck = validateSameOrigin(request);
  if (!originCheck.allowed) {
    return NextResponse.json(
      { success: false, error: "FORBIDDEN_ORIGIN", message: originCheck.error || "Origem inválida." },
      { status: 403, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "UNAUTHENTICATED", message: "Não autenticado." },
      { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const { slug, consultationPublicId } = await params;

  let body: {
    sessionPublicId?: string;
    clientMessageId?: string;
    type?: SignalingMessageType;
    payload?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "SIGNALING_INVALID_BODY", message: "Corpo da requisição inválido." },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  if (!body.sessionPublicId || !body.clientMessageId || !body.type) {
    return NextResponse.json(
      { success: false, error: "SIGNALING_INVALID_PARAMETERS", message: "Parâmetros obrigatórios ausentes." },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const res = await publishSignalingMessage(
    session.userId,
    slug,
    consultationPublicId,
    {
      sessionPublicId: body.sessionPublicId,
      clientMessageId: body.clientMessageId,
      type: body.type,
      payload: body.payload ?? {},
    }
  );

  if (!res.success) {
    const status =
      res.error === "UNAUTHENTICATED"
        ? 401
        : res.error === "CONSULTATION_FORBIDDEN" || res.error === "SIGNALING_FORBIDDEN" || res.error === "STUDENT_BILLING_BLOCKED" || res.error === "SIGNALING_INVALID_ROLE"
        ? 403
        : res.error === "CONSULTATION_NOT_FOUND" || res.error === "SIGNALING_SESSION_NOT_FOUND" || res.error === "INVALID_CONTEXT"
        ? 404
        : res.error === "SIGNALING_PAYLOAD_TOO_LARGE"
        ? 413
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

export async function GET(request: Request, { params }: RouteProps) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "UNAUTHENTICATED", message: "Não autenticado." },
      { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const { slug, consultationPublicId } = await params;
  const { searchParams } = new URL(request.url);

  const sessionPublicId = searchParams.get("session") || searchParams.get("sessionPublicId") || "";
  const afterCursor = searchParams.get("after") || searchParams.get("afterCursor") || undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;

  if (!sessionPublicId) {
    return NextResponse.json(
      { success: false, error: "SIGNALING_INVALID_SESSION", message: "Identificador de sessão obrigatório." },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const res = await pollSignalingMessages(
    session.userId,
    slug,
    consultationPublicId,
    sessionPublicId,
    afterCursor,
    limit
  );

  if (!res.success) {
    const status =
      res.error === "UNAUTHENTICATED"
        ? 401
        : res.error === "CONSULTATION_FORBIDDEN" || res.error === "SIGNALING_FORBIDDEN" || res.error === "STUDENT_BILLING_BLOCKED"
        ? 403
        : res.error === "CONSULTATION_NOT_FOUND" || res.error === "SIGNALING_SESSION_NOT_FOUND" || res.error === "INVALID_CONTEXT"
        ? 404
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
