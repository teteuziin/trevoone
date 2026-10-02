import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { getStudentWorkoutView, listAssignmentsForProfessional } from "@/lib/training-v2/assignment-repository";
import { getDbConnection } from "@/lib/db/mysql";
import { assertProfessionalStudentRelationship } from "@/lib/consultancies/photo-evaluations";
import {
  generateTrainingPlanPdfBuffer,
  createSafeTrainingPdfFilename,
} from "@/lib/training-v2/generate-training-pdf";
import {
  formatExerciseSetsSummary,
  type PresentedTrainingPlan,
} from "@/lib/training-v2/server-training-pdf-document";
import { recordConsultancyActivity } from "@/lib/consultancies/activity-log";
import { formatConsultancyDateTime } from "@/lib/consultancies/timezone";
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
 * GET: Generates and streams a target student's active workout as a vector A4 PDF
 * for an authorized Personal Trainer or Consultancy Admin.
 */
export async function GET(request: Request, context: RouteContext) {
  const { slug, studentPublicId } = await context.params;

  const session = await getCurrentSession();
  if (!session) {
    return new NextResponse("Não autenticado.", { status: 401 });
  }

  const access = await resolveTrainingAccessContext(slug);
  if (!access || !access.consultancyId) {
    return new NextResponse("Acesso não autorizado a esta consultoria.", { status: 403 });
  }

  const isAdmin = access.canManageConsultancy || access.isPlatformAdmin;
  const isPersonal = access.canAuthorTraining;

  if (!isAdmin && !isPersonal) {
    return new NextResponse(
      "Apenas personal trainers e administradores podem emitir o PDF de treino de alunos.",
      { status: 403 }
    );
  }

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Resolve student membership in this consultancy
    const [studentRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id AS membership_id, cm.user_id, cm.public_id, u.full_name,
              c.name AS consultancy_name, COALESCE(c.timezone, 'America/Sao_Paulo') AS timezone
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN consultancies c ON c.id = cm.consultancy_id
       WHERE cm.public_id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE' LIMIT 1`,
      [studentPublicId.trim(), access.consultancyId]
    );

    if (!studentRows || studentRows.length === 0) {
      return new NextResponse("Aluno não encontrado nesta consultoria.", { status: 404 });
    }

    const studentRow = studentRows[0];
    const studentMembershipId = Number(studentRow.membership_id);
    const studentName = String(studentRow.full_name);
    const consultancyName = String(studentRow.consultancy_name);
    const timeZone = String(studentRow.timezone);

    // 2. Relationship check for non-admin
    if (!isAdmin) {
      const hasRel = await assertProfessionalStudentRelationship(connection, {
        consultancyId: access.consultancyId,
        studentMembershipId,
        professionalUserId: session.userId,
      });

      if (!hasRel) {
        return new NextResponse("Você não possui vínculo profissional ativo com este aluno.", {
          status: 403,
        });
      }
    }

    // 3. Find active assignment
    const assignmentsRes = await listAssignmentsForProfessional(access, {
      studentMembershipPublicId: studentPublicId.trim(),
      status: "ACTIVE",
    });
    const active = assignmentsRes.items[0];

    if (!active) {
      return new NextResponse("O aluno não possui ficha de treino ativa no momento.", {
        status: 404,
      });
    }

    // 4. Fetch workout view
    const workoutView = await getStudentWorkoutView(access, active.assignmentPublicId);
    if (!workoutView) {
      return new NextResponse("Treino não encontrado.", { status: 404 });
    }

    const nowFormatted = formatConsultancyDateTime(timeZone, new Date());

    const presented: PresentedTrainingPlan = {
      title: workoutView.title,
      subtitle: workoutView.subtitle,
      objective: workoutView.objective,
      studentName,
      personalTrainerName: session.fullName,
      consultancyName,
      startsOnFormatted: workoutView.startsOn,
      generationDateFormatted: nowFormatted,
      notes: workoutView.notesForStudent,
      isDraft: false,
      versionNumber: workoutView.versionNumber,
      blocks: workoutView.blocks.map((b) => ({
        name: b.title || "Geral",
        instructions: b.instructions,
        exercises: (b.items || []).map((item) => {
          const setsSummary = formatExerciseSetsSummary(item.sets || []);
          return {
            name: item.exerciseNameSnapshot,
            muscleGroup: item.muscleGroupSnapshot,
            equipment: item.equipmentSnapshot,
            notes: item.notes,
            summaryString: setsSummary.summaryString,
            setsDetail: setsSummary.setsDetail,
            combinationType: item.combinationType || null,
            isCustomExercise: !!item.isCustomExercise,
          };
        }),
      })),
    };

    const pdfBuffer = await generateTrainingPlanPdfBuffer(presented);

    await recordConsultancyActivity({
      consultancyId: access.consultancyId,
      actorUserId: session.userId,
      actorMembershipId: access.membershipId,
      actorRole: isAdmin ? "CONSULTANCY_ADMIN" : "PERSONAL",
      action: "TRAINING_PDF_DOWNLOADED",
      module: "PERSONAL",
      resourceType: "WORKOUT",
      resourcePublicId: workoutView.assignmentPublicId,
      subjectMembershipId: studentMembershipId,
      summary: `baixou o PDF da ficha de treino de ${studentName}`,
      metadata: {
        studentName,
        workoutTitle: workoutView.title,
        assignmentPublicId: workoutView.assignmentPublicId,
      },
    });

    const { searchParams } = new URL(request.url);
    const isAttachment = searchParams.get("download") === "true";
    const safeFilename = createSafeTrainingPdfFilename("treino", studentName);
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
