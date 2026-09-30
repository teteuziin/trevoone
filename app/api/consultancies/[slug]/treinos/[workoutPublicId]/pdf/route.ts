import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { getWorkoutVersionTree } from "@/lib/training-v2/workout-repository";
import { getStudentWorkoutView } from "@/lib/training-v2/assignment-repository";
import { getDbConnection } from "@/lib/db/mysql";
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
    workoutPublicId: string;
  }>;
}

/**
 * GET: Generates and streams a workout or assignment as a vector A4 PDF.
 * Robust multi-role resolution: Supports Personal Trainer, Consultancy Admin, and Student.
 * Resolves both Workout Roots (draft or published) and Assignments.
 */
export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { slug, workoutPublicId } = await context.params;

    const session = await getCurrentSession();
    if (!session) {
      return new NextResponse("Não autenticado.", { status: 401 });
    }

    const access = await resolveTrainingAccessContext(slug);
    if (!access || !access.consultancyId) {
      return new NextResponse("Acesso não autorizado a esta consultoria.", { status: 403 });
    }

    const isCoachOrAdmin = Boolean(
      access.canAuthorTraining || access.canManageConsultancy || access.isPlatformAdmin
    );

    const conn = await getDbConnection();
    let assignmentRow: RowDataPacket | null = null;
    let workoutRow: RowDataPacket | null = null;

    try {
      // 1. Check if workoutPublicId is an assignmentPublicId
      const [aRows] = await conn.query<RowDataPacket[]>(
        `SELECT wa.id, wa.public_id, wa.student_membership_id, wa.workout_id,
                u.full_name AS student_name, c.name AS consultancy_name,
                COALESCE(c.timezone, 'America/Sao_Paulo') AS timezone,
                DATE_FORMAT(wa.starts_on, '%Y-%m-%d') AS starts_on
         FROM workout_assignments wa
         INNER JOIN consultancies c ON c.id = wa.consultancy_id
         INNER JOIN consultancy_members cm ON cm.id = wa.student_membership_id
         INNER JOIN users u ON u.id = cm.user_id
         WHERE wa.public_id = ? AND wa.consultancy_id = ? AND wa.deleted_at IS NULL
         LIMIT 1`,
        [workoutPublicId, access.consultancyId]
      );

      if (aRows.length > 0) {
        assignmentRow = aRows[0];
      } else {
        // 2. Check if workoutPublicId is a workout root
        const [wRows] = await conn.query<RowDataPacket[]>(
          `SELECT w.id, w.public_id, w.title, w.subtitle, w.objective, w.created_by_membership_id,
                  c.name AS consultancy_name, COALESCE(c.timezone, 'America/Sao_Paulo') AS timezone
           FROM workouts w
           INNER JOIN consultancies c ON c.id = w.consultancy_id
           WHERE w.public_id = ? AND w.consultancy_id = ? AND w.deleted_at IS NULL
           LIMIT 1`,
          [workoutPublicId, access.consultancyId]
        );

        if (wRows.length > 0) {
          workoutRow = wRows[0];
        }
      }
    } finally {
      conn.release();
    }

    let presented: PresentedTrainingPlan | null = null;
    let auditResourcePublicId = workoutPublicId;
    let fileTitle = "treino";

    if (assignmentRow) {
      // Security check for assignment
      const studentMembershipId = Number(assignmentRow.student_membership_id);
      const isOwner = access.membershipId && access.membershipId === studentMembershipId;

      if (!isOwner && !isCoachOrAdmin) {
        return new NextResponse("Acesso não autorizado a este treino atribuído.", { status: 403 });
      }

      const workoutView = await getStudentWorkoutView(access, String(assignmentRow.public_id));
      if (!workoutView) {
        return new NextResponse("Conteúdo do treino não encontrado.", { status: 404 });
      }

      const tz = String(assignmentRow.timezone);
      const nowFormatted = formatConsultancyDateTime(tz, new Date());
      auditResourcePublicId = workoutView.assignmentPublicId;
      fileTitle = assignmentRow.student_name ? `${workoutView.title}-${assignmentRow.student_name}` : workoutView.title;

      presented = {
        title: workoutView.title,
        subtitle: workoutView.subtitle,
        objective: workoutView.objective,
        studentName: String(assignmentRow.student_name),
        personalTrainerName: session.fullName,
        consultancyName: String(assignmentRow.consultancy_name),
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
            };
          }),
        })),
      };
    } else if (workoutRow) {
      if (!isCoachOrAdmin) {
        // If caller is student, verify if active assignment exists for this workout
        const conn2 = await getDbConnection();
        let studentWaPublicId: string | null = null;
        try {
          const [checkRows] = await conn2.query<RowDataPacket[]>(
            `SELECT wa.public_id FROM workout_assignments wa
             WHERE wa.workout_id = ? AND wa.student_membership_id = ? AND wa.status = 'ACTIVE' AND wa.deleted_at IS NULL
             ORDER BY wa.id DESC LIMIT 1`,
            [workoutRow.id, access.membershipId]
          );
          if (checkRows.length > 0) {
            studentWaPublicId = String(checkRows[0].public_id);
          }
        } finally {
          conn2.release();
        }

        if (!studentWaPublicId) {
          return new NextResponse("Este treino não está atribuído ao seu usuário.", { status: 403 });
        }

        const workoutView = await getStudentWorkoutView(access, studentWaPublicId);
        if (!workoutView) {
          return new NextResponse("Treino não encontrado.", { status: 404 });
        }

        const tz = String(workoutRow.timezone);
        const nowFormatted = formatConsultancyDateTime(tz, new Date());
        auditResourcePublicId = studentWaPublicId;
        fileTitle = workoutView.title;

        presented = {
          title: workoutView.title,
          subtitle: workoutView.subtitle,
          objective: workoutView.objective,
          studentName: session.fullName,
          personalTrainerName: "Personal Trainer",
          consultancyName: String(workoutRow.consultancy_name),
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
              };
            }),
          })),
        };
      } else {
        // Coach / Admin: find active DRAFT or latest PUBLISHED version
        const conn3 = await getDbConnection();
        let targetVersionPublicId: string | null = null;
        let isDraft = false;
        try {
          const [vRows] = await conn3.query<RowDataPacket[]>(
            `SELECT public_id, status FROM workout_versions
             WHERE workout_id = ?
             ORDER BY (status = 'DRAFT') DESC, version_number DESC
             LIMIT 1`,
            [workoutRow.id]
          );
          if (vRows.length > 0) {
            targetVersionPublicId = String(vRows[0].public_id);
            isDraft = vRows[0].status === "DRAFT";
          }
        } finally {
          conn3.release();
        }

        if (!targetVersionPublicId) {
          return new NextResponse("Nenhuma versão de treino encontrada para este cadastro.", { status: 404 });
        }

        const versionTree = await getWorkoutVersionTree(access, targetVersionPublicId);
        if (!versionTree) {
          return new NextResponse("Erro ao carregar estrutura do treino.", { status: 500 });
        }

        const tz = String(workoutRow.timezone);
        const nowFormatted = formatConsultancyDateTime(tz, new Date());
        fileTitle = versionTree.title || String(workoutRow.title);

        presented = {
          title: versionTree.title || String(workoutRow.title),
          subtitle: versionTree.subtitle || workoutRow.subtitle,
          objective: versionTree.objective || workoutRow.objective,
          personalTrainerName: session.fullName,
          consultancyName: String(workoutRow.consultancy_name),
          generationDateFormatted: nowFormatted,
          notes: versionTree.notes,
          isDraft,
          versionNumber: versionTree.versionNumber,
          blocks: (versionTree.blocks || []).map((b) => ({
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
              };
            }),
          })),
        };
      }
    } else {
      return new NextResponse("Treino não encontrado nesta consultoria.", { status: 404 });
    }

    if (!presented) {
      return new NextResponse("Não foi possível montar a estrutura do treino para exportação.", { status: 500 });
    }

    const pdfBuffer = await generateTrainingPlanPdfBuffer(presented);

    // Audit download
    await recordConsultancyActivity({
      consultancyId: access.consultancyId,
      actorUserId: session.userId,
      actorMembershipId: access.membershipId,
      actorRole: access.canManageConsultancy ? "CONSULTANCY_ADMIN" : access.canAuthorTraining ? "PERSONAL" : "STUDENT",
      action: "TRAINING_PDF_DOWNLOADED",
      module: "PERSONAL",
      resourceType: "WORKOUT",
      resourcePublicId: auditResourcePublicId,
      summary: `baixou o PDF do treino "${presented.title}"`,
      metadata: {
        workoutTitle: presented.title,
        auditResourcePublicId,
        isDraft: presented.isDraft,
      },
    }).catch(() => {});

    const { searchParams } = new URL(request.url);
    const isAttachment = searchParams.get("download") === "true";
    const safeFilename = createSafeTrainingPdfFilename("treino", fileTitle);
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
    console.error("[WorkoutPdfExportError] Falha crítica ao gerar PDF de treino:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new NextResponse(`Erro ao gerar o PDF do treino: ${msg}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
