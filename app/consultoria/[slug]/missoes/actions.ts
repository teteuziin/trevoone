"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  MAX_MISSION_EARLY_REQUEST_BYTES,
  startMission,
  submitMission,
  type SubmissionFileInput,
} from "@/lib/consultancies/missions";

export type MissionActionState = {
  success: boolean;
  error?: string;
};

export async function startMissionAction(
  slug: string,
  missionPublicId: string
): Promise<MissionActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const consultancyContext = await resolveConsultancyContext(session.userId, slug);
  if (!consultancyContext) {
    return { success: false, error: "Consultoria não encontrada." };
  }

  if (!consultancyContext.roles.includes("INFLUENCER")) {
    return { success: false, error: "Acesso restrito a participantes com perfil de Influenciador / VIP." };
  }

  const result = await startMission({
    consultancyId: consultancyContext.consultancyId,
    membershipId: consultancyContext.membershipId,
    actorUserId: session.userId,
    missionPublicId,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/missoes`);
    revalidatePath(`/consultoria/${slug}/missoes/${missionPublicId}`);
  }

  return result;
}

export async function submitMissionAction(
  slug: string,
  missionPublicId: string,
  _prevState: MissionActionState | null,
  formData: FormData
): Promise<MissionActionState> {
  // 1. Early Content-Length guard
  const reqHeaders = await headers();
  const rawContentLength = reqHeaders.get("content-length");
  if (rawContentLength !== null) {
    const trimmedCl = rawContentLength.trim();
    if (!/^\d+$/.test(trimmedCl)) {
      return { success: false, error: "Requisição inválida (Content-Length malformado)." };
    }
    const parsedCl = BigInt(trimmedCl);
    if (parsedCl > BigInt(MAX_MISSION_EARLY_REQUEST_BYTES)) {
      return {
        success: false,
        error: "O tamanho da requisição excede o limite máximo permitido de 22 MB.",
      };
    }
  }

  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const consultancyContext = await resolveConsultancyContext(session.userId, slug);
  if (!consultancyContext) {
    return { success: false, error: "Consultoria não encontrada." };
  }

  if (!consultancyContext.roles.includes("INFLUENCER")) {
    return { success: false, error: "Acesso restrito a participantes com perfil de Influenciador / VIP." };
  }

  const notes = String(formData.get("notes") || "");
  const rawLinks = formData.getAll("links").map(String);
  const singleLinksField = String(formData.get("links_text") || "");
  
  // Aggregate links from either multiple inputs or a multiline text area
  const combinedLinks = [
    ...rawLinks,
    ...singleLinksField.split("\n").map((l) => l.trim()),
  ].filter((l) => l.length > 0);

  // Extract files
  const fileEntries = formData.getAll("files");
  const files: SubmissionFileInput[] = [];

  for (const entry of fileEntries) {
    if (entry instanceof File && entry.size > 0) {
      const buffer = Buffer.from(await entry.arrayBuffer());
      files.push({
        buffer,
        fileName: entry.name,
        clientMime: entry.type,
      });
    }
  }

  const result = await submitMission({
    consultancyId: consultancyContext.consultancyId,
    membershipId: consultancyContext.membershipId,
    actorUserId: session.userId,
    missionPublicId,
    notes,
    links: combinedLinks,
    files,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/missoes`);
    revalidatePath(`/consultoria/${slug}/missoes/${missionPublicId}`);
  }

  return result;
}
