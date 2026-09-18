"use server";

import fs from "node:fs/promises";
import { revalidatePath } from "next/cache";
import type { ResultSetHeader } from "mysql2/promise";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getDbConnection } from "@/lib/db/mysql";
import {
  detectReceiptFileType,
  getPrivateStorageRoot,
  resolveSafeStoragePath,
} from "@/lib/storage/private-files";

export type UpdateConsultancyPhotoResult = {
  success: boolean;
  error?: string;
  logoUrl?: string;
};

export async function updateConsultancyPhotoAction(
  slug: string,
  formData: FormData
): Promise<UpdateConsultancyPhotoResult> {
  // 1. Session authentication
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  if (!slug || typeof slug !== "string" || !slug.trim()) {
    return { success: false, error: "Consultoria não informada." };
  }

  // 2. Strict Tenant & Role Authorization: User MUST be CONSULTANCY_ADMIN for this consultancy
  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return {
      success: false,
      error: "Você não tem permissão para alterar as configurações desta consultoria.",
    };
  }

  // 3. Extract and validate file
  const file = formData.get("photo");
  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false, error: "Nenhum arquivo de imagem fornecido." };
  }

  // 4. Max size: 5 MiB
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "A imagem não pode ultrapassar 5 MB." };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 5. Binary magic bytes validation (Strictly JPEG, PNG, WEBP)
  const detection = detectReceiptFileType(buffer, file.type);
  if (!detection.valid || !detection.mimeType || detection.mimeType === "application/pdf") {
    return {
      success: false,
      error: "Formato de imagem inválido. Formatos aceitos: JPEG, PNG e WebP.",
    };
  }

  const extension = detection.extension || ".jpg";

  // 6. Write final adjusted image directly to persistent storage
  const storageRoot = getPrivateStorageRoot();
  const dirPath = resolveSafeStoragePath(storageRoot, "consultancy-logos");
  await fs.mkdir(dirPath, { recursive: true });

  const targetFilename = `${context.consultancyId}${extension}`;
  const targetPath = resolveSafeStoragePath(dirPath, targetFilename);

  // Write new file
  await fs.writeFile(targetPath, buffer);

  // Clean up any older file with different extension
  const otherExtensions = [".jpg", ".webp", ".png"].filter((e) => e !== extension);
  for (const otherExt of otherExtensions) {
    try {
      const oldPath = resolveSafeStoragePath(
        dirPath,
        `${context.consultancyId}${otherExt}`
      );
      await fs.unlink(oldPath);
    } catch {
      // Old file didn't exist, ignore
    }
  }

  // 7. Update database record: consultancies.logo_url (versioned with timestamp for browser cache invalidation)
  const newLogoUrl = `/api/consultancies/${slug}/logo?v=${Date.now()}`;
  let connection;
  try {
    connection = await getDbConnection();
    await connection.execute<ResultSetHeader>(
      `UPDATE consultancies SET logo_url = ? WHERE id = ?;`,
      [newLogoUrl, context.consultancyId]
    );

    revalidatePath(`/consultoria/${slug}`);
    revalidatePath("/selecionar-consultoria");

    return {
      success: true,
      logoUrl: newLogoUrl,
    };
  } catch {
    return {
      success: false,
      error: "Erro ao atualizar a foto da consultoria no banco de dados.",
    };
  } finally {
    if (connection) connection.release();
  }
}

export async function removeConsultancyPhotoAction(
  slug: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return {
      success: false,
      error: "Você não tem permissão para alterar as configurações desta consultoria.",
    };
  }

  const storageRoot = getPrivateStorageRoot();
  const dirPath = resolveSafeStoragePath(storageRoot, "consultancy-logos");
  for (const ext of [".jpg", ".webp", ".png"]) {
    try {
      const p = resolveSafeStoragePath(dirPath, `${context.consultancyId}${ext}`);
      await fs.unlink(p);
    } catch {
      // File not found, ignore
    }
  }

  let connection;
  try {
    connection = await getDbConnection();
    await connection.execute<ResultSetHeader>(
      `UPDATE consultancies SET logo_url = NULL WHERE id = ?;`,
      [context.consultancyId]
    );

    revalidatePath(`/consultoria/${slug}`);
    revalidatePath("/selecionar-consultoria");

    return { success: true };
  } catch {
    return { success: false, error: "Erro ao remover foto da consultoria." };
  } finally {
    if (connection) connection.release();
  }
}
