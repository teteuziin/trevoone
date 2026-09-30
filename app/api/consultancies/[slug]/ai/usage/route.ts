import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getMemberEffectiveAiQuota } from "@/lib/ai/quotas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;

  const session = await getCurrentSession();
  if (!session) {
    return new NextResponse("Não autenticado.", { status: 401 });
  }

  const consultancyCtx = await resolveConsultancyContext(session.userId, slug);
  if (!consultancyCtx) {
    return new NextResponse("Acesso não autorizado a esta consultoria.", { status: 403 });
  }

  const role = consultancyCtx.roles.includes("CONSULTANCY_ADMIN")
    ? "CONSULTANCY_ADMIN"
    : consultancyCtx.roles.includes("NUTRITIONIST")
    ? "NUTRITIONIST"
    : "PERSONAL";

  const quotaInfo = await getMemberEffectiveAiQuota({
    consultancyId: consultancyCtx.consultancyId,
    memberId: consultancyCtx.membershipId,
    userId: session.userId,
    role,
  });

  return NextResponse.json({
    success: true,
    quota: quotaInfo,
  });
}
