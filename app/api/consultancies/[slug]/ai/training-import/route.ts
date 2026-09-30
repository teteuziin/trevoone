import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { processTrainingAiImport } from "@/lib/training-v2/training-ai-importer";
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

  const access = await resolveTrainingAccessContext(slug);
  if (!access || !access.consultancyId) {
    return new NextResponse("Acesso não autorizado a esta consultoria.", { status: 403 });
  }

  if (!access.canAuthorTraining && !access.canManageConsultancy && !access.isPlatformAdmin) {
    return new NextResponse("Apenas personal trainers e administradores podem importar treinos com IA.", {
      status: 403,
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const pastedText = (formData.get("text") as string | null) || "";
    const targetStudentMembershipIdRaw = formData.get("targetStudentMembershipId") as string | null;
    const idempotencyKey = (formData.get("idempotencyKey") as string | null) || undefined;

    let targetStudentMembershipId: number | null = null;
    if (targetStudentMembershipIdRaw && !isNaN(Number(targetStudentMembershipIdRaw))) {
      targetStudentMembershipId = Number(targetStudentMembershipIdRaw);
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
        { success: false, error: "Envie um arquivo (PDF, TXT, MD, DOCX) ou cole o texto do treino." },
        { status: 400 }
      );
    }

    const proposal = await processTrainingAiImport({
      consultancyId: access.consultancyId,
      memberId: access.membershipId!,
      userId: session.userId,
      role: access.canManageConsultancy ? "CONSULTANCY_ADMIN" : "PERSONAL",
      input: docInput,
      targetStudentMembershipId,
      idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      proposal,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao processar importação com IA.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
