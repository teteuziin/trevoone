import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { getStudentAuthoritativeNutrition } from "@/lib/nutrition-v2/assignment-repository";
import {
  presentNutritionPlan,
  createSafePdfFilename,
} from "@/lib/nutrition-v2/nutrition-plan-presentation";
import { generateNutritionPlanPdfBuffer } from "@/lib/nutrition-v2/generate-nutrition-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * GET: Securely generates and streams the authenticated Student's active nutrition plan as a vector A4 PDF.
 * Strict RBAC: The student identity is inferred directly from the session. No user ID parameter can be forged.
 */
export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;

  const session = await getCurrentSession();
  if (!session) {
    return new NextResponse("Não autenticado.", { status: 401 });
  }

  // 1. Authorize student module access
  const access = await resolveStudentModuleAccess(session.userId, slug);
  if (!access.allowed || !access.context) {
    return new NextResponse("Acesso não autorizado ao módulo de nutrição.", { status: 403 });
  }

  // 2. Fetch authoritative active nutrition assignment
  const v2Auth = await getStudentAuthoritativeNutrition(session.userId, slug);
  if (!v2Auth.activeAssignment) {
    return new NextResponse("Nenhum plano alimentar ativo encontrado para este aluno.", {
      status: 404,
    });
  }

  // 3. Map to pure presentation structure
  const presented = presentNutritionPlan(v2Auth.activeAssignment, {
    studentName: session.fullName,
    consultancyName: access.context.consultancyName,
    consultancyLogoUrl: access.context.consultancyLogoUrl,
  });

  // 4. Generate PDF buffer server-side
  const pdfBuffer = await generateNutritionPlanPdfBuffer(presented);

  // 5. Build Content-Disposition
  const { searchParams } = new URL(request.url);
  const isAttachment = searchParams.get("download") === "true";
  const safeFilename = createSafePdfFilename("Plano-Alimentar", session.fullName);
  const dispositionType = isAttachment ? "attachment" : "inline";

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${dispositionType}; filename="${safeFilename}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
