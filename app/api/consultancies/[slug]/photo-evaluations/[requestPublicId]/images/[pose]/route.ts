import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import {
  getPhotoEvaluationImageBuffer,
  savePhotoEvaluationPoseImage,
  MAX_EVALUATION_PHOTO_SIZE_BYTES,
  EVALUATION_POSES,
  type PhotoEvaluationPose,
} from "@/lib/consultancies/photo-evaluations";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    slug: string;
    requestPublicId: string;
    pose: string;
  }>;
}

/**
 * GET: Securely streams the authenticated evaluation image with strict private headers.
 */
export async function GET(request: Request, context: RouteParams) {
  const { slug, requestPublicId, pose } = await context.params;

  const session = await getCurrentSession();
  if (!session) {
    return new NextResponse(null, { status: 401 });
  }

  const normalizedPose = pose.toUpperCase() as PhotoEvaluationPose;
  if (!EVALUATION_POSES.includes(normalizedPose)) {
    return new NextResponse(null, { status: 400 });
  }

  const result = await getPhotoEvaluationImageBuffer({
    userId: session.userId,
    consultancySlug: slug,
    requestPublicId,
    pose: normalizedPose,
  });

  if (!result.success || !result.buffer) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": result.mimeType || "image/jpeg",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}

/**
 * POST: Handles photo upload / replacement for a specific pose with up to 10MB payload.
 */
export async function POST(request: Request, context: RouteParams) {
  const { slug, requestPublicId, pose } = await context.params;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Sessão expirada ou não autenticado." }, { status: 401 });
  }

  const normalizedPose = pose.toUpperCase() as PhotoEvaluationPose;
  if (!EVALUATION_POSES.includes(normalizedPose)) {
    return NextResponse.json({ error: "Pose inválida." }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    if (file.size > MAX_EVALUATION_PHOTO_SIZE_BYTES) {
      return NextResponse.json(
        { error: "O arquivo excede o limite máximo permitido de 10 MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await savePhotoEvaluationPoseImage({
      userId: session.userId,
      consultancySlug: slug,
      requestPublicId,
      pose: normalizedPose,
      buffer,
      clientMimeType: file.type,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, image: result.image });
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao processar o upload da imagem." },
      { status: 500 }
    );
  }
}
