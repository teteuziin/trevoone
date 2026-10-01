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

  const { searchParams } = new URL(request.url);
  const requestedRole = searchParams.get("role")?.toUpperCase();

  let role: string;
  if (
    requestedRole &&
    ((consultancyCtx.roles as readonly string[]).includes(requestedRole) || consultancyCtx.roles.includes("CONSULTANCY_ADMIN"))
  ) {
    role = requestedRole;
  } else if (consultancyCtx.roles.includes("NUTRITIONIST") && !consultancyCtx.roles.includes("PERSONAL")) {
    role = "NUTRITIONIST";
  } else if (consultancyCtx.roles.includes("PERSONAL")) {
    role = "PERSONAL";
  } else if (consultancyCtx.roles.includes("CONSULTANCY_ADMIN")) {
    role = "CONSULTANCY_ADMIN";
  } else {
    role = consultancyCtx.roles[0] || "STUDENT";
  }

  const quotaInfo = await getMemberEffectiveAiQuota({
    consultancyId: consultancyCtx.consultancyId,
    memberId: consultancyCtx.membershipId,
    userId: session.userId,
    role,
  });

  return NextResponse.json({
    success: true,
    quota: quotaInfo,
    effectiveDailyLimit: quotaInfo.memberLimit,
    memberUsedToday: quotaInfo.memberUsedToday,
    consultancyUsedToday: quotaInfo.consultancyUsedToday,
    effectiveDailyRemaining: quotaInfo.effectiveRemaining,
    canImport: quotaInfo.canImport,
  });
}
