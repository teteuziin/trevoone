import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { prepareSignalingSession } from "@/lib/consultancies/signaling";

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

  let action: "PREPARE" | "RESET" = "PREPARE";
  try {
    const body = await request.json();
    if (body?.action === "RESET") {
      action = "RESET";
    }
  } catch {
    // Default to PREPARE if no body is passed
  }

  const res = await prepareSignalingSession(
    session.userId,
    slug,
    consultationPublicId,
    action
  );

  if (!res.success) {
    const status =
      res.error === "UNAUTHENTICATED"
        ? 401
        : res.error === "CONSULTATION_FORBIDDEN" || res.error === "SIGNALING_FORBIDDEN" || res.error === "STUDENT_BILLING_BLOCKED"
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
