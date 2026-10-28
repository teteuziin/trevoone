import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getStudentVerifiedReceiptFile } from "@/lib/consultancies/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{
    slug: string;
    chargePublicId: string;
  }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const { slug, chargePublicId } = await params;

  // 1. Authenticate active session
  const session = await getCurrentSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Sessão expirada. Faça login novamente." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Authorize consultancy and STUDENT or INFLUENCER (VIP) role
  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || (!context.roles.includes("STUDENT") && !context.roles.includes("INFLUENCER"))) {
    return new Response(
      JSON.stringify({
        error: "Apenas alunos vinculados a esta consultoria podem consultar seus próprios comprovantes.",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 3. Resolve student's own verified receipt file with strict multi-tenant and IDOR guarantees
  const result = await getStudentVerifiedReceiptFile({
    consultancyId: context.consultancyId,
    studentMembershipId: context.membershipId,
    chargePublicId,
  });

  if (!result.success || !result.buffer) {
    const status = result.code === "NOT_FOUND" ? 404 : 500;
    return new Response(
      JSON.stringify({
        error: result.error || "Arquivo de comprovante não encontrado.",
      }),
      {
        status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const safeFileName = (result.originalFileName || "comprovante").replace(/["\r\n\\]/g, "_");
  const isPdf = result.mimeType === "application/pdf";
  const isImage = result.mimeType?.startsWith("image/");
  const disposition = isPdf || isImage ? "inline" : "attachment";

  return new Response(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": result.mimeType || "application/octet-stream",
      "Content-Length": String(result.buffer.length),
      "Content-Disposition": `${disposition}; filename="${safeFileName}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
