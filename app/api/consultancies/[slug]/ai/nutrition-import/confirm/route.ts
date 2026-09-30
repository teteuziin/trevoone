import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import { confirmNutritionAiImport } from "@/lib/nutrition-v2/nutrition-ai-importer";

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

  const access = await resolveNutritionAccessContext(slug);
  if (!access || !access.consultancyId) {
    return new NextResponse("Acesso não autorizado a esta consultoria.", { status: 403 });
  }

  const isAdmin = access.hasRole("CONSULTANCY_ADMIN");
  const isNutritionist = access.hasRole("NUTRITIONIST");

  if (!isAdmin && !isNutritionist) {
    return new NextResponse(
      "Apenas nutricionistas e administradores podem confirmar a importação de planos alimentares.",
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      jobPublicId,
      targetPatientMembershipId,
      confirmedTitle,
      confirmedMeals,
    } = body;

    if (!jobPublicId || !confirmedMeals || !Array.isArray(confirmedMeals)) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos para confirmação da importação." },
        { status: 400 }
      );
    }

    const result = await confirmNutritionAiImport({
      consultancyId: access.consultancyId,
      memberId: access.membershipId || 0,
      userId: session.userId,
      role: isAdmin ? "CONSULTANCY_ADMIN" : "NUTRITIONIST",
      jobPublicId,
      targetPatientMembershipId: targetPatientMembershipId ? Number(targetPatientMembershipId) : null,
      confirmedTitle,
      confirmedMeals,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao confirmar importação de nutrição.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
