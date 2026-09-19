import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import { getStudentAuthoritativeNutrition } from "@/lib/nutrition-v2/assignment-repository";
import { getDbConnection } from "@/lib/db/mysql";
import { assertProfessionalStudentRelationship } from "@/lib/consultancies/photo-evaluations";
import {
  presentNutritionPlan,
  createSafePdfFilename,
} from "@/lib/nutrition-v2/nutrition-plan-presentation";
import { generateNutritionPlanPdfBuffer } from "@/lib/nutrition-v2/generate-nutrition-pdf";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    slug: string;
    studentPublicId: string;
  }>;
}

/**
 * GET: Securely generates and streams a target student's active nutrition plan as a vector A4 PDF
 * for an authorized Nutritionist or Consultancy Admin.
 *
 * Strict RBAC:
 * - Caller must be CONSULTANCY_ADMIN or NUTRITIONIST with an active professional relationship.
 * - Personal trainers without nutrition authorization are strictly blocked.
 * - Former or unlinked professionals are blocked.
 * - Target student must belong to the same tenancy.
 */
export async function GET(request: Request, context: RouteContext) {
  const { slug, studentPublicId } = await context.params;

  const session = await getCurrentSession();
  if (!session) {
    return new NextResponse("Não autenticado.", { status: 401 });
  }

  // 1. Authorize professional tenancy access
  const accessContext = await resolveNutritionAccessContext(slug);
  if (!accessContext || !accessContext.consultancyId) {
    return new NextResponse("Acesso não autorizado a esta consultoria.", { status: 403 });
  }

  const isAdmin = accessContext.hasRole("CONSULTANCY_ADMIN");
  const isNutritionist = accessContext.hasRole("NUTRITIONIST");

  if (!isAdmin && !isNutritionist) {
    return new NextResponse(
      "Apenas nutricionistas e administradores da consultoria podem emitir o PDF de alunos.",
      { status: 403 }
    );
  }

  let connection;
  try {
    connection = await getDbConnection();

    // 2. Resolve target student membership in this tenancy
    const [studentRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id AS membership_id, cm.user_id, cm.public_id, u.full_name, u.email,
              c.name AS consultancy_name, c.logo_url AS consultancy_logo_url
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN consultancies c ON c.id = cm.consultancy_id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.public_id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND cmr.role IN ('STUDENT', 'INFLUENCER')
       LIMIT 1;`,
      [studentPublicId.trim(), accessContext.consultancyId]
    );

    if (!Array.isArray(studentRows) || studentRows.length === 0) {
      return new NextResponse("Aluno não encontrado ou inativo nesta consultoria.", {
        status: 404,
      });
    }

    const studentRow = studentRows[0];
    const studentMembershipId = Number(studentRow.membership_id);
    const studentUserId = Number(studentRow.user_id);
    const studentName = String(studentRow.full_name);
    const consultancyName = String(studentRow.consultancy_name || accessContext.consultancySlug || "Consultoria");
    const consultancyLogoUrl = studentRow.consultancy_logo_url ? String(studentRow.consultancy_logo_url) : null;

    // 3. Strict RBAC: Non-admin professionals MUST possess an active, current professional relationship
    if (!isAdmin) {
      const hasRelationship = await assertProfessionalStudentRelationship(connection, {
        consultancyId: accessContext.consultancyId,
        studentMembershipId,
        professionalUserId: session.userId,
      });

      if (!hasRelationship) {
        return new NextResponse(
          "Você não possui vínculo profissional ativo com este aluno.",
          { status: 403 }
        );
      }
    }

    // 4. Fetch authoritative active nutrition assignment for the target student
    const v2Auth = await getStudentAuthoritativeNutrition(studentUserId, slug);
    if (!v2Auth.activeAssignment) {
      return new NextResponse("O aluno não possui um plano alimentar ativo no momento.", {
        status: 404,
      });
    }

    // 5. Map to pure presentation structure
    const presented = presentNutritionPlan(v2Auth.activeAssignment, {
      studentName,
      consultancyName,
      consultancyLogoUrl,
      prescriberName: v2Auth.activeAssignment.prescriberName || session.fullName,
    });

    // 6. Generate vector PDF buffer
    const pdfBuffer = await generateNutritionPlanPdfBuffer(presented);

    // 7. Content-Disposition
    const { searchParams } = new URL(request.url);
    const isAttachment = searchParams.get("download") === "true";
    const safeFilename = createSafePdfFilename("Plano-Alimentar", studentName);
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
  } finally {
    if (connection) connection.release();
  }
}
