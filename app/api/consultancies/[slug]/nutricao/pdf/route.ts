import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import { getStudentAuthoritativeNutrition } from "@/lib/nutrition-v2/assignment-repository";
import { getPlanVersionTreeByPlanPublicId } from "@/lib/nutrition-v2/plan-repository";
import {
  presentNutritionPlan,
  presentNutritionPlanFromVersionTree,
  createSafePdfFilename,
  type PresentedNutritionPlan,
} from "@/lib/nutrition-v2/nutrition-plan-presentation";
import { generateNutritionPlanPdfBuffer } from "@/lib/nutrition-v2/generate-nutrition-pdf";
import { recordConsultancyActivity } from "@/lib/consultancies/activity-log";
import { getDbConnection } from "@/lib/db/mysql";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * GET: Securely generates and streams a nutrition plan as a vector A4 PDF.
 * Multi-role: Supports both Students (downloading active plan) and Nutritionists/Admins (exporting plan).
 */
export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { slug } = await context.params;

    const session = await getCurrentSession();
    if (!session) {
      return new NextResponse("Não autenticado.", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planPublicId = searchParams.get("planPublicId")?.trim();
    const isAttachment = searchParams.get("download") === "true";

    let presented: PresentedNutritionPlan | null = null;
    let auditConsultancyId: number | null = null;
    let auditMembershipId: number | null = null;
    let auditRole = "STUDENT";
    let auditResourcePublicId = "";
    let safeFilename = "Plano-Alimentar.pdf";

    // 1. If planPublicId is explicitly requested OR caller is a Professional
    const nutritionAccess = await resolveNutritionAccessContext(slug);
    const isProfessional = Boolean(
      nutritionAccess &&
        (nutritionAccess.hasRole("NUTRITIONIST") ||
          nutritionAccess.hasRole("CONSULTANCY_ADMIN") ||
          nutritionAccess.isPlatformAdmin)
    );

    if (planPublicId && isProfessional && nutritionAccess) {
      // Professional exporting a specific plan
      const tree = await getPlanVersionTreeByPlanPublicId(nutritionAccess, planPublicId);
      if (!tree) {
        return new NextResponse("Plano alimentar não encontrado.", { status: 404 });
      }

      auditConsultancyId = nutritionAccess.consultancyId;
      auditMembershipId = nutritionAccess.membershipId;
      auditRole = nutritionAccess.hasRole("CONSULTANCY_ADMIN") ? "CONSULTANCY_ADMIN" : "NUTRITIONIST";
      auditResourcePublicId = tree.plan.publicId;

      presented = presentNutritionPlanFromVersionTree(tree, {
        studentName: null,
        consultancyName: nutritionAccess.consultancySlug || "Consultoria",
        prescriberName: session.fullName,
      });

      safeFilename = createSafePdfFilename(tree.version.title || "Plano-Alimentar", tree.version.status === "DRAFT" ? "Rascunho" : "Geral");
    } else {
      // Default: Check student access to their active plan
      const studentAccess = await resolveStudentModuleAccess(session.userId, slug);
      if (studentAccess.allowed && studentAccess.context) {
        const v2Auth = await getStudentAuthoritativeNutrition(session.userId, slug);
        if (!v2Auth.activeAssignment) {
          return new NextResponse("Nenhum plano alimentar ativo encontrado para este aluno.", {
            status: 404,
          });
        }

        auditConsultancyId = studentAccess.context.consultancyId;
        auditMembershipId = studentAccess.context.membershipId;
        auditRole = "STUDENT";
        auditResourcePublicId = v2Auth.activeAssignment.plan.publicId;

        presented = presentNutritionPlan(v2Auth.activeAssignment, {
          studentName: session.fullName,
          consultancyName: studentAccess.context.consultancyName,
          consultancyLogoUrl: studentAccess.context.consultancyLogoUrl,
        });

        safeFilename = createSafePdfFilename("Plano-Alimentar", session.fullName);
      } else if (isProfessional && nutritionAccess) {
        // Professional accessed without planPublicId: find the latest plan in this consultancy
        const conn = await getDbConnection();
        let fallbackPlanPublicId: string | null = null;
        try {
          const [pRows] = await conn.query<RowDataPacket[]>(
            `SELECT public_id FROM nutrition_v2_plans
             WHERE consultancy_id = ? AND deleted_at IS NULL
             ORDER BY id DESC LIMIT 1`,
            [nutritionAccess.consultancyId]
          );
          if (pRows.length > 0) {
            fallbackPlanPublicId = String(pRows[0].public_id);
          }
        } finally {
          conn.release();
        }

        if (!fallbackPlanPublicId) {
          return new NextResponse("Nenhum plano alimentar cadastrado nesta consultoria.", { status: 404 });
        }

        const tree = await getPlanVersionTreeByPlanPublicId(nutritionAccess, fallbackPlanPublicId);
        if (!tree) {
          return new NextResponse("Plano alimentar não encontrado.", { status: 404 });
        }

        auditConsultancyId = nutritionAccess.consultancyId;
        auditMembershipId = nutritionAccess.membershipId;
        auditRole = nutritionAccess.hasRole("CONSULTANCY_ADMIN") ? "CONSULTANCY_ADMIN" : "NUTRITIONIST";
        auditResourcePublicId = tree.plan.publicId;

        presented = presentNutritionPlanFromVersionTree(tree, {
          studentName: null,
          consultancyName: nutritionAccess.consultancySlug || "Consultoria",
          prescriberName: session.fullName,
        });

        safeFilename = createSafePdfFilename(tree.version.title || "Plano-Alimentar", tree.version.status === "DRAFT" ? "Rascunho" : "Geral");
      } else {
        return new NextResponse("Acesso não autorizado ao módulo de nutrição.", { status: 403 });
      }
    }

    if (!presented) {
      return new NextResponse("Não foi possível montar a estrutura do plano para exportação.", { status: 500 });
    }

    const pdfBuffer = await generateNutritionPlanPdfBuffer(presented);

    if (auditConsultancyId) {
      await recordConsultancyActivity({
        consultancyId: auditConsultancyId,
        actorUserId: session.userId,
        actorMembershipId: auditMembershipId,
        actorRole: auditRole,
        action: "NUTRITION_PDF_DOWNLOADED",
        module: "NUTRITION",
        resourceType: "NUTRITION_PLAN",
        resourcePublicId: auditResourcePublicId,
        summary: `baixou o PDF do plano alimentar "${presented.title}"`,
        metadata: {
          planTitle: presented.title,
          planPublicId: auditResourcePublicId,
        },
      }).catch(() => {});
    }

    const dispositionType = isAttachment ? "attachment" : "inline";

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdfBuffer.length),
        "Content-Disposition": `${dispositionType}; filename="${safeFilename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    console.error("[NutritionPdfExportError] Falha crítica ao gerar PDF de nutrição:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new NextResponse(`Erro ao gerar o PDF de nutrição: ${msg}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
