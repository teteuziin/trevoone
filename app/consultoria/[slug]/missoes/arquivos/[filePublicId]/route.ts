import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getMissionFileForDownload } from "@/lib/consultancies/missions";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string; filePublicId: string }> }
): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return new NextResponse("Não autenticado", { status: 401 });
  }

  const { slug, filePublicId } = await context.params;
  const consultancyContext = await resolveConsultancyContext(session.userId, slug);
  if (!consultancyContext) {
    return new NextResponse("Consultoria não encontrada", { status: 404 });
  }

  const isConsultancyAdmin = consultancyContext.roles.includes("CONSULTANCY_ADMIN");
  const isInfluencer = consultancyContext.roles.includes("INFLUENCER");

  if (!isConsultancyAdmin && !isInfluencer) {
    return new NextResponse("Acesso não autorizado", { status: 403 });
  }

  const result = await getMissionFileForDownload({
    consultancyId: consultancyContext.consultancyId,
    actorUserId: session.userId,
    actorMembershipId: consultancyContext.membershipId,
    isConsultancyAdmin,
    filePublicId,
  });

  if (!result.success || !result.buffer || !result.mimeType) {
    const status = result.statusCode || 404;
    return new NextResponse(result.error || "Arquivo não encontrado", { status });
  }

  const safeFileName = result.fileName || "arquivo";
  const asciiFileName = safeFileName.replace(/[^\x20-\x7E]/g, "_");

  return new NextResponse(result.buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": result.mimeType,
      "Content-Disposition": `inline; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(safeFileName)}`,
      "Content-Length": String(result.buffer.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
