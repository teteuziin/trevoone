/**
 * TREVO ONE — TRAINING V2 RAW MEDIA UPLOAD ROUTE
 * POST /api/training-v2/media
 * Streams incoming raw binary request body directly to a private temporary file.
 * Validates magic bytes, counts bytes incrementally, generates randomized storage keys,
 * enforces tenant/role authorization, and executes compensation cleanup on database failure.
 */

import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { validateSameOrigin } from "@/lib/security/request-origin";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import {
  getMaxUploadSizeBytes,
  isSupportedMediaMime,
  isSupportedVideoMime,
} from "@/lib/training-v2/media-config";
import {
  MediaStorageError,
  streamUploadToTempFile,
  finalizeStorageFile,
  generateRandomStorageKey,
  cleanupPhysicalFile,
} from "@/lib/training-v2/media-storage";
import { registerMediaAsset } from "@/lib/training-v2/media-repository";
import type { MediaScope, MediaVisibility } from "@/lib/training-v2/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // 1. CSRF / Same-origin validation for mutating request
  const originCheck = validateSameOrigin(request);
  if (!originCheck.allowed) {
    return NextResponse.json(
      { error: originCheck.error || "Requisição não autorizada por política de mesma origem." },
      { status: 403 }
    );
  }

  // 2. Authenticate session
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // 3. Parse query parameters
  const { searchParams } = new URL(request.url);
  const requestedScope = searchParams.get("scope")?.toUpperCase() || null;
  const requestedVisibility = searchParams.get("visibility")?.toUpperCase() || null;
  const requestedMediaType = searchParams.get("mediaType")?.toUpperCase() || null;
  const consultancyParam = searchParams.get("consultancy") || null;

  // 4. Resolve trusted Training Access Context
  const ctx = await resolveTrainingAccessContext(consultancyParam);
  if (!ctx) {
    return NextResponse.json(
      { error: "Contexto de consultoria inválido ou não autorizado." },
      { status: 403 }
    );
  }

  // 5. Authorize upload permissions
  let effectiveScope: MediaScope = "CONSULTANCY";
  let effectiveVisibility: MediaVisibility = "CREATOR_ONLY";

  if (requestedScope === "GLOBAL") {
    if (!ctx.canManageGlobal) {
      return NextResponse.json(
        { error: "Apenas Administradores da Plataforma podem publicar mídias globais." },
        { status: 403 }
      );
    }
    effectiveScope = "GLOBAL";
    effectiveVisibility = "GLOBAL";
  } else {
    // Consultancy upload: requires coach or consultancy admin in active tenancy
    if (!ctx.canAuthorTraining || !ctx.consultancyId) {
      return NextResponse.json(
        { error: "Acesso negado: apenas Personal Trainers ou Administradores da consultoria podem enviar mídias." },
        { status: 403 }
      );
    }
    effectiveScope = "CONSULTANCY";
    effectiveVisibility = requestedVisibility === "CONSULTANCY" ? "CONSULTANCY" : "CREATOR_ONLY";
  }

  // 6. Validate Content-Type header
  const rawContentType = request.headers.get("content-type") || "";
  const declaredMime = rawContentType.split(";")[0]?.trim().toLowerCase();

  if (!declaredMime || !isSupportedMediaMime(declaredMime)) {
    return NextResponse.json(
      { error: "Formato de arquivo não suportado. Formatos aceitos: video/mp4, image/jpeg, image/png, image/webp." },
      { status: 415 }
    );
  }

  const detectedCategory: "VIDEO" | "IMAGE" = isSupportedVideoMime(declaredMime) ? "VIDEO" : "IMAGE";
  if (requestedMediaType && requestedMediaType !== detectedCategory) {
    return NextResponse.json(
      { error: `Tipo de mídia solicitado ('${requestedMediaType}') não corresponde ao Content-Type ('${declaredMime}').` },
      { status: 400 }
    );
  }

  // 7. Content-Length header pre-check
  const maxLimit = getMaxUploadSizeBytes(detectedCategory);
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const declaredLength = Number(contentLengthHeader);
    if (!isNaN(declaredLength) && declaredLength > maxLimit) {
      return NextResponse.json(
        { error: `O arquivo excede o limite máximo permitido de ${Math.round(maxLimit / (1024 * 1024))} MiB.` },
        { status: 413 }
      );
    }
  }

  // 8. Stream request body to temporary file with byte counting and magic-byte inspection
  if (!request.body) {
    return NextResponse.json({ error: "Corpo da requisição vazio." }, { status: 400 });
  }

  let finalStoragePath: string | null = null;

  try {
    const uploadResult = await streamUploadToTempFile(request.body, declaredMime, maxLimit);

    // 9. Generate randomized storage key and finalize physical file
    const storageKey = generateRandomStorageKey(uploadResult.mediaType, uploadResult.extension);
    finalStoragePath = await finalizeStorageFile(uploadResult.tempFilePath, storageKey);

    // 10. Register metadata in MySQL via repository layer
    const asset = await registerMediaAsset(ctx, {
      scope: effectiveScope,
      visibility: effectiveVisibility,
      mediaType: uploadResult.mediaType,
      storageProvider: "HOSTINGER_LOCAL",
      storageKey,
      mimeType: uploadResult.detectedMime,
      fileSizeBytes: uploadResult.sizeBytes,
    });

    // 11. Return safe metadata response (never exposing internal storage paths or keys)
    return NextResponse.json(
      {
        publicId: asset.publicId,
        mediaType: asset.mediaType,
        mimeType: asset.mimeType,
        fileSizeBytes: asset.fileSizeBytes,
        scope: asset.scope,
        visibility: asset.visibility,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    // Database compensation: delete finalized physical file if DB registration failed
    if (finalStoragePath) {
      await cleanupPhysicalFile(finalStoragePath);
    }

    if (error instanceof MediaStorageError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json(
      { error: "Erro interno no processamento do arquivo de mídia." },
      { status: 500 }
    );
  }
}
