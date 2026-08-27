import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import {
  startConsultationCall,
  endConsultationCall,
} from "@/lib/consultancies/consultations";

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

  let body: { action?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "INVALID_BODY", message: "Corpo da requisição inválido." },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  if (body.action !== "START" && body.action !== "END") {
    return NextResponse.json(
      { success: false, error: "INVALID_ACTION", message: "Ação inválida. Use START ou END." },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const res =
    body.action === "START"
      ? await startConsultationCall(session.userId, slug, consultationPublicId)
      : await endConsultationCall(session.userId, slug, consultationPublicId);

  if (!res.success) {
    const status =
      res.error === "UNAUTHENTICATED"
        ? 401
        : res.error === "CONSULTATION_FORBIDDEN" || res.error === "STUDENT_BILLING_BLOCKED"
        ? 403
        : res.error === "CONSULTATION_NOT_FOUND" || res.error === "INVALID_CONTEXT"
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
