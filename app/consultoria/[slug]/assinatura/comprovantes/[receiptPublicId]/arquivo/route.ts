import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { getPlatformReceiptFileForDownload } from "@/lib/platform-admin/billing";

export async function GET(request: Request, context: { params: Promise<{ slug: string; receiptPublicId: string }> }) {
  const { slug, receiptPublicId } = await context.params;

  const session = await getCurrentSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Não autenticado." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [{ isPlatformAdmin }, consultancyContext] = await Promise.all([
    getPlatformAdminAccess(session.userId),
    resolveConsultancyContext(session.userId, slug),
  ]);

  const result = await getPlatformReceiptFileForDownload({
    actorUserId: session.userId,
    actorMembershipId: consultancyContext?.membershipId,
    isPlatformAdmin,
    filePublicId: receiptPublicId,
    consultancySlug: slug,
  });

  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }

  const safeFileName = (result.fileName || "comprovante").replace(/["\r\n\\]/g, "_");

  return new Response(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": result.mimeType,
      "Content-Length": String(result.buffer.length),
      "Content-Disposition": `inline; filename="${safeFileName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
