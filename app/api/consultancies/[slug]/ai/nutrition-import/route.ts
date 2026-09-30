import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import { processNutritionAiImport } from "@/lib/nutrition-v2/nutrition-ai-importer";
import type { DocumentInput } from "@/lib/ai/openai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_TEXT_LENGTH_CHARS = 100 * 1024; // 100K characters

const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".md", ".docx"];

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
      "Apenas nutricionistas e administradores podem importar planos alimentares com IA.",
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const pastedText = (formData.get("text") as string | null) || "";
    const targetPatientMembershipIdRaw = formData.get("targetPatientMembershipId") as string | null;
    const idempotencyKey = (formData.get("idempotencyKey") as string | null) || undefined;

    let targetPatientMembershipId: number | null = null;
    if (targetPatientMembershipIdRaw && !isNaN(Number(targetPatientMembershipIdRaw))) {
      targetPatientMembershipId = Number(targetPatientMembershipIdRaw);
    }

    let docInput: DocumentInput;

    if (file && file.size > 0) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: "Arquivo muito grande. O limite máximo é de 15MB." },
          { status: 400 }
        );
      }

      const lowerName = file.name.toLowerCase();
      const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
      if (!hasAllowedExt) {
        return NextResponse.json(
          { success: false, error: "Formato de arquivo não suportado. Use PDF, TXT, MD ou DOCX." },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      docInput = {
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        buffer,
      };
    } else if (pastedText.trim().length > 0) {
      if (pastedText.length > MAX_TEXT_LENGTH_CHARS) {
        return NextResponse.json(
          { success: false, error: "Texto muito longo para processamento." },
          { status: 400 }
        );
      }

      docInput = {
        filename: "texto-colado.txt",
        mimeType: "text/plain",
        text: pastedText.trim(),
      };
    } else {
      return NextResponse.json(
        { success: false, error: "Envie um arquivo (PDF, TXT, MD, DOCX) ou cole o texto do plano." },
        { status: 400 }
      );
    }

    const proposal = await processNutritionAiImport({
      consultancyId: access.consultancyId,
      memberId: access.membershipId || 0,
      userId: session.userId,
      role: isAdmin ? "CONSULTANCY_ADMIN" : "NUTRITIONIST",
      input: docInput,
      targetPatientMembershipId,
      idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      proposal,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao processar importação com IA." },
      { status: 400 }
    );
  }
}
