import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { confirmTrainingAiImport } from "@/lib/training-v2/training-ai-importer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;

  const session = await getCurrentSession();
  if (!session) {
    return new NextResponse("Não autenticado.", { status: 401 });
  }

  const access = await resolveTrainingAccessContext(slug);
  if (!access || !access.consultancyId) {
    return new NextResponse("Acesso não autorizado a esta consultoria.", { status: 403 });
  }

  if (!access.canAuthorTraining && !access.canManageConsultancy && !access.isPlatformAdmin) {
    return new NextResponse("Apenas personal trainers e administradores podem confirmar a importação.", {
      status: 403,
    });
  }

  try {
    const body = await request.json();
    const {
      jobPublicId,
      targetStudentMembershipId,
      confirmedTitle,
      confirmedCategories,
    } = body;

    if (!jobPublicId || !confirmedCategories || !Array.isArray(confirmedCategories)) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos para confirmação da importação." },
        { status: 400 }
      );
    }

    const result = await confirmTrainingAiImport({
      consultancyId: access.consultancyId,
      memberId: access.membershipId!,
      userId: session.userId,
      role: access.canManageConsultancy ? "CONSULTANCY_ADMIN" : "PERSONAL",
      jobPublicId,
      targetStudentMembershipId: targetStudentMembershipId ? Number(targetStudentMembershipId) : null,
      confirmedTitle,
      confirmedCategories,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao confirmar importação de treino.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
