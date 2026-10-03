import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { getStudentWorkoutView, listAssignmentsForStudent } from "@/lib/training-v2/assignment-repository";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * GET: Securely generates and streams the authenticated Student's active workout as a vector A4 PDF.
 * Strict RBAC: Student identity inferred directly from session. No cross-tenant access.
 */
export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;

  const session = await getCurrentSession();
  if (!session) {
    return new NextResponse("Não autenticado.", { status: 401 });
  }

  const access = await resolveStudentModuleAccess(session.userId, slug);
  if (!access.allowed || !access.context) {
    return new NextResponse("Acesso não autorizado ao módulo de treino.", { status: 403 });
  }

  const trainingCtx = await resolveTrainingAccessContext(slug);
  if (!trainingCtx || !trainingCtx.membershipId) {
    return new NextResponse("Membro de treino não encontrado.", { status: 404 });
  }

  // 1. Fetch student's active assignments
  const studentAssignments = await listAssignmentsForStudent(trainingCtx, "ACTIVE");
  const activeAssignment = studentAssignments[0];

  if (!activeAssignment) {
    return new NextResponse("Nenhum treino ativo encontrado para este aluno.", { status: 404 });
  }

  // 2. Fetch full workout view
  const workoutView = await getStudentWorkoutView(trainingCtx, activeAssignment.publicId);
  if (!workoutView) {
    return new NextResponse("Treino não encontrado.", { status: 404 });
  }

  const tz = access.context.consultancyTimezone || "America/Sao_Paulo";
  const nowFormatted = formatConsultancyDateTime(tz, new Date());

  // 3. Map to PresentedTrainingPlan
  const presented: PresentedTrainingPlan = {
    title: workoutView.title,
    subtitle: workoutView.subtitle,
    objective: workoutView.objective,
    studentName: session.fullName,
    personalTrainerName: "Personal Trainer",
    consultancyName: access.context.consultancyName,
    startsOnFormatted: workoutView.startsOn,
    generationDateFormatted: nowFormatted,
    notes: workoutView.notesForStudent,
    isDraft: false,
    versionNumber: workoutView.versionNumber,
    blocks: workoutView.blocks.map((b) => {
      const combMap = new Map((b.combinations || []).map((c) => [c.publicId, c]));
      return {
        name: b.title || "Geral",
        instructions: b.instructions,
        exercises: (b.items || []).map((item) => {
          const setsSummary = formatExerciseSetsSummary(item.sets || []);
          const comb = item.combinationPublicId ? combMap.get(item.combinationPublicId) : undefined;
          return {
            name: item.exerciseNameSnapshot,
            muscleGroup: item.muscleGroupSnapshot,
            equipment: item.equipmentSnapshot,
            notes: item.notes,
            summaryString: setsSummary.summaryString,
            setsDetail: setsSummary.setsDetail,
            combinationId: item.combinationPublicId || null,
            combinationType: comb?.combinationType || item.combinationType || null,
            combinationTitle: comb?.title || null,
            combinationRestSeconds: comb?.restAfterSeconds ?? null,
            isCustomExercise: !!item.isCustomExercise,
          };
        }),
      };
    }),
  };

  // 4. Generate vector PDF
  const pdfBuffer = await generateTrainingPlanPdfBuffer(presented);

  // 5. Audit activity event
  await recordConsultancyActivity({
    consultancyId: access.context.consultancyId,
    actorUserId: session.userId,
    actorMembershipId: trainingCtx.membershipId,
    actorRole: "STUDENT",
    action: "TRAINING_PDF_DOWNLOADED",
    module: "PERSONAL",
    resourceType: "WORKOUT",
    resourcePublicId: workoutView.assignmentPublicId,
    summary: `baixou o PDF do próprio treino "${workoutView.title}"`,
    metadata: {
      workoutTitle: workoutView.title,
      assignmentPublicId: workoutView.assignmentPublicId,
    },
  });

  const { searchParams } = new URL(request.url);
  const isAttachment = searchParams.get("download") === "true";
  const safeFilename = createSafeTrainingPdfFilename("treino", session.fullName);
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
