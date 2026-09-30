import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { getWorkoutWithDraft, getWorkoutVersionTree } from "@/lib/training-v2/workout-repository";
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
    workoutPublicId: string;
  }>;
}

/**
 * GET: Generates and streams a workout/routine as a vector A4 PDF
 * for an authorized Personal Trainer or Consultancy Admin. Supports draft versions.
 */
export async function GET(request: Request, context: RouteContext) {
  const { slug, workoutPublicId } = await context.params;

  const session = await getCurrentSession();
  if (!session) {
    return new NextResponse("Não autenticado.", { status: 401 });
  }

  const access = await resolveTrainingAccessContext(slug);
  if (!access || !access.consultancyId) {
    return new NextResponse("Acesso não autorizado a esta consultoria.", { status: 403 });
  }

  if (!access.canAuthorTraining && !access.canManageConsultancy && !access.isPlatformAdmin) {
    return new NextResponse("Apenas personal trainers e administradores podem emitir este PDF.", {
      status: 403,
    });
  }

  // 1. Fetch workout root & draft
  const root = await getWorkoutWithDraft(access, workoutPublicId);
  if (!root) {
    return new NextResponse("Ficha de treino não encontrada.", { status: 404 });
  }

  const versionToRender = root.draftVersion;
  if (!versionToRender) {
    return new NextResponse("Versão de treino não encontrada.", { status: 404 });
  }

  // Fetch complete version tree with blocks, items and sets
  const versionTree = await getWorkoutVersionTree(access, versionToRender.publicId);
  if (!versionTree) {
    return new NextResponse("Erro ao carregar estrutura do treino.", { status: 500 });
  }

  const tz = access.consultancySlug || "America/Sao_Paulo";
  const nowFormatted = formatConsultancyDateTime(tz, new Date());
  const isDraft = versionTree.status === "DRAFT";

  const presented: PresentedTrainingPlan = {
    title: versionTree.title || root.workout.title,
    subtitle: versionTree.subtitle || root.workout.subtitle,
    objective: versionTree.objective || root.workout.objective,
    personalTrainerName: session.fullName,
    consultancyName: access.consultancySlug || "Consultoria",
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

  const pdfBuffer = await generateTrainingPlanPdfBuffer(presented);

  await recordConsultancyActivity({
    consultancyId: access.consultancyId,
    actorUserId: session.userId,
    actorMembershipId: access.membershipId,
    actorRole: access.canManageConsultancy ? "CONSULTANCY_ADMIN" : "PERSONAL",
    action: "TRAINING_PDF_DOWNLOADED",
    module: "PERSONAL",
    resourceType: "WORKOUT",
    resourcePublicId: workoutPublicId,
    summary: `baixou o PDF da ficha "${root.workout.title}"`,
    metadata: {
      workoutTitle: root.workout.title,
      workoutPublicId,
      isDraft,
    },
  });

  const { searchParams } = new URL(request.url);
  const isAttachment = searchParams.get("download") === "true";
  const safeFilename = createSafeTrainingPdfFilename("treino", root.workout.title);
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
