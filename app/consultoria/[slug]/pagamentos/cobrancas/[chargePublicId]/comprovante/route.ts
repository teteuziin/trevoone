import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  getStudentChargePaymentDetail,
  submitStudentPaymentReceipt,
} from "@/lib/consultancies/finance";
import {
  validateReceiptBuffer,
  writePrivateFile,
  deletePrivateFile,
  MAX_RECEIPT_FILE_SIZE_BYTES,
  type WritePrivateFileResult,
} from "@/lib/storage/private-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RECEIPT_REQUEST_BODY_BYTES = 6 * 1024 * 1024; // 6,291,456 bytes (6 MiB early multipart limit)

type RouteProps = {
  params: Promise<{
    slug: string;
    chargePublicId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const { slug, chargePublicId } = await params;

  // 1. Same-origin defense
  const originHeader = request.headers.get("origin");
  if (originHeader) {
    try {
      const requestUrl = new URL(request.url);
      if (originHeader !== requestUrl.origin) {
        return new Response(
          JSON.stringify({ error: "Requisição não autorizada por política de mesma origem." }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ error: "Origem da requisição inválida." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 2. Early Content-Length validation (rejects obviously oversized requests before auth/prechecks and formData parsing)
  const rawContentLength = request.headers.get("content-length");
  if (rawContentLength !== null) {
    const trimmedContentLength = rawContentLength.trim();
    if (!trimmedContentLength || !/^[0-9]+$/.test(trimmedContentLength)) {
      return new Response(
        JSON.stringify({ error: "Tamanho do corpo da requisição inválido." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const declaredLength = BigInt(trimmedContentLength);
      if (declaredLength > BigInt(MAX_RECEIPT_REQUEST_BODY_BYTES)) {
        return new Response(
          JSON.stringify({ error: "O tamanho da requisição excede o limite máximo permitido de 6 MB." }),
          { status: 413, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ error: "Tamanho do corpo da requisição inválido." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 3. Revalidate authenticated session
  const session = await getCurrentSession();
  if (!session) {
    return new Response(
      JSON.stringify({ error: "Sessão expirada. Faça login novamente." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // 3. Revalidate consultancy context & STUDENT role
  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("STUDENT")) {
    return new Response(
      JSON.stringify({ error: "Apenas alunos vinculados a esta consultoria podem enviar comprovantes." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4. Precheck charge state before executing file I/O
  const chargePrecheck = await getStudentChargePaymentDetail({
    consultancyId: context.consultancyId,
    studentMembershipId: context.membershipId,
    chargePublicId,
  });

  if (!chargePrecheck) {
    return new Response(
      JSON.stringify({ error: "Cobrança não encontrada para este aluno." }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  if (chargePrecheck.state === "CANCELED") {
    return new Response(
      JSON.stringify({ error: "Esta cobrança se encontra cancelada." }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }

  if (chargePrecheck.isPaid) {
    return new Response(
      JSON.stringify({ error: "Esta cobrança já foi confirmada como paga." }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }

  if (chargePrecheck.hasSubmittedReceipt) {
    return new Response(
      JSON.stringify({ error: "Já existe um comprovante em análise para esta cobrança." }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!chargePrecheck.pixSettings) {
    return new Response(
      JSON.stringify({ error: "A consultoria ainda não configurou as informações de pagamento Pix." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 5. Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(
      JSON.stringify({ error: "Formato de formulário de upload inválido." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const fileEntry = formData.get("file") || formData.get("comprovante");
  if (!fileEntry || !(fileEntry instanceof Blob)) {
    return new Response(
      JSON.stringify({ error: "Nenhum arquivo de comprovante selecionado." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const fileName = typeof (fileEntry as File).name === "string" ? (fileEntry as File).name : "comprovante";
  const clientMime = fileEntry.type || "";

  let buffer: Buffer;
  try {
    const arrayBuffer = await fileEntry.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch {
    return new Response(
      JSON.stringify({ error: "Não foi possível ler o arquivo enviado." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 6. Validate binary buffer magic bytes and size
  const validation = validateReceiptBuffer(buffer, clientMime);
  if (!validation.valid || !validation.mimeType || !validation.extension) {
    const httpStatus = buffer.length > MAX_RECEIPT_FILE_SIZE_BYTES ? 413 : 415;
    return new Response(
      JSON.stringify({ error: validation.error || "Formato de arquivo não suportado." }),
      { status: httpStatus, headers: { "Content-Type": "application/json" } }
    );
  }

  // 7. Write file to private storage outside of DB transaction
  let writeResult: WritePrivateFileResult;
  try {
    writeResult = await writePrivateFile({
      buffer,
      extension: validation.extension,
      originalFileName: fileName,
    });
  } catch (storageError) {
    console.error("Erro ao salvar arquivo privado de comprovante:", storageError instanceof Error ? storageError.message : "Erro desconhecido");
    return new Response(
      JSON.stringify({ error: "Armazenamento temporariamente indisponível. Tente novamente mais tarde." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // 8. Transactional receipt insertion in MySQL under row lock
  try {
    const submitResult = await submitStudentPaymentReceipt({
      consultancyId: context.consultancyId,
      studentMembershipId: context.membershipId,
      userId: session.userId,
      chargePublicId,
      fileStorageKey: writeResult.fileStorageKey,
      originalFileName: writeResult.originalFileName,
      mimeType: validation.mimeType,
      sizeBytes: writeResult.sizeBytes,
      fileSha256: writeResult.fileSha256,
    });

    if (!submitResult.success) {
      // Compensate: delete the orphan private file safely
      await deletePrivateFile(writeResult.fileStorageKey);

      const httpStatus =
        submitResult.code === "NOT_FOUND"
          ? 404
          : submitResult.code === "ALREADY_SUBMITTED" ||
            submitResult.code === "ALREADY_PAID" ||
            submitResult.code === "CHARGE_CANCELED"
          ? 409
          : 400;

      return new Response(
        JSON.stringify({ error: submitResult.error || "Não foi possível registrar o comprovante." }),
        { status: httpStatus, headers: { "Content-Type": "application/json" } }
      );
    }

    // 9. Success response (never leaks internal BIGINTs, storage paths, or hashes)
    return new Response(
      JSON.stringify({
        ok: true,
        receiptPublicId: submitResult.receiptPublicId,
        status: "UNDER_REVIEW",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    // Compensate on unexpected exception
    await deletePrivateFile(writeResult.fileStorageKey);
    console.error("Erro inesperado na submissão do comprovante:", err instanceof Error ? err.message : "Erro desconhecido");
    return new Response(
      JSON.stringify({ error: "Ocorreu um erro interno ao processar seu comprovante." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
