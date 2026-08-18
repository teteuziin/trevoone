import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getPaymentReceiptReviewDetail } from "@/lib/consultancies/finance";
import {
  readVerifiedPrivateFile,
  sanitizeOriginalFileName,
} from "@/lib/storage/private-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{
    slug: string;
    receiptPublicId: string;
  }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const { slug, receiptPublicId } = await params;

  // 1. Authenticate session
  const session = await getCurrentSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Sessão expirada. Faça login novamente." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Authorize consultancy and CONSULTANCY_ADMIN role
  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return new Response(
      JSON.stringify({
        error: "Apenas administradores da consultoria podem visualizar comprovantes de pagamento.",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 3. Resolve receipt under current consultancy
  const receipt = await getPaymentReceiptReviewDetail({
    consultancyId: context.consultancyId,
    receiptPublicId,
  });

  if (!receipt) {
    return new Response(JSON.stringify({ error: "Comprovante não encontrado nesta consultoria." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. Read and strictly verify file integrity from private storage
  const readResult = await readVerifiedPrivateFile({
    fileStorageKey: receipt.fileStorageKey,
    expectedSizeBytes: receipt.sizeBytes,
    expectedFileSha256: receipt.fileSha256,
    expectedMimeType: receipt.mimeType,
  });

  if (!readResult.success || !readResult.buffer) {
    const status = readResult.code === "NOT_FOUND" ? 404 : 500;
    return new Response(
      JSON.stringify({
        error:
          readResult.code === "NOT_FOUND"
            ? "O arquivo do comprovante não foi encontrado no armazenamento."
            : "O arquivo do comprovante apresentou falha de integridade ao ser verificado.",
      }),
      {
        status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 5. Build safe headers
  const safeFilename = sanitizeOriginalFileName(receipt.originalFileName);
  const encodedFilename = encodeURIComponent(safeFilename);
  const mimeType = readResult.mimeType || receipt.mimeType;

  return new Response(new Uint8Array(readResult.buffer), {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${safeFilename.replace(/"/g, "")}"; filename*=UTF-8''${encodedFilename}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Content-Length": String(readResult.buffer.length),
    },
  });
}
