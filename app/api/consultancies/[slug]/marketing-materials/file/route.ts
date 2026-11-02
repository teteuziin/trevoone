import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getPrivateStorageRoot, resolveSafeStoragePath } from "@/lib/storage/private-files";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const consultancyContext = await resolveConsultancyContext(session.userId, slug);
    if (!consultancyContext) {
      return NextResponse.json({ error: "Acesso negado à consultoria." }, { status: 403 });
    }

    const key = request.nextUrl.searchParams.get("key");
    if (!key || typeof key !== "string" || !key.startsWith(`marketing-materials/${slug}/`)) {
      return NextResponse.json({ error: "Chave de arquivo inválida." }, { status: 400 });
    }

    const storageRoot = getPrivateStorageRoot();
    const safePath = resolveSafeStoragePath(storageRoot, key);

    try {
      await fs.access(safePath);
    } catch {
      return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(safePath);

    // Determine MIME
    let mimeType = "application/octet-stream";
    if (key.endsWith(".jpg") || key.endsWith(".jpeg")) mimeType = "image/jpeg";
    else if (key.endsWith(".png")) mimeType = "image/png";
    else if (key.endsWith(".webp")) mimeType = "image/webp";
    else if (key.endsWith(".pdf")) mimeType = "application/pdf";
    else if (key.endsWith(".mp4")) mimeType = "video/mp4";
    else if (key.endsWith(".webm")) mimeType = "video/webm";
    else if (key.endsWith(".mov")) mimeType = "video/quicktime";

    const isDownload = request.nextUrl.searchParams.get("download") === "1";
    const filename = key.split("/").pop() || "material";

    const headers = new Headers();
    headers.set("Content-Type", mimeType);
    headers.set("Content-Length", String(fileBuffer.length));
    headers.set(
      "Content-Disposition",
      `${isDownload ? "attachment" : "inline"}; filename="${filename}"`
    );
    headers.set("Cache-Control", "private, max-age=3600");

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao servir arquivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
