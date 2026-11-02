import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { saveMarketingMaterialFile, MAX_MARKETING_FILE_SIZE_BYTES } from "@/lib/referrals/marketing-storage";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const consultancyContext = await resolveConsultancyContext(session.userId, slug);
    if (!consultancyContext || !consultancyContext.roles.includes("CONSULTANCY_ADMIN")) {
      return NextResponse.json(
        { error: "Apenas administradores podem fazer upload de materiais de divulgação." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    if (file.size > MAX_MARKETING_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "O arquivo excede o limite máximo permitido de 25 MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const originalFileName = typeof (file as { name?: unknown }).name === "string"
      ? (file as { name: string }).name
      : "arquivo";

    const saved = await saveMarketingMaterialFile({
      consultancySlug: slug,
      buffer,
      originalFileName,
    });

    const fileUrl = `/api/consultancies/${slug}/marketing-materials/file?key=${encodeURIComponent(
      saved.fileStorageKey
    )}`;

    return NextResponse.json({
      success: true,
      fileUrl,
      storageKey: saved.fileStorageKey,
      fileSizeBytes: saved.fileSizeBytes,
      mimeType: saved.mimeType,
      originalFileName: saved.originalFileName,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno ao processar upload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
