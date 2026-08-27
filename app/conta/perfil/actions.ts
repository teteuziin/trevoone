"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import {
  updateMyUsername,
  uploadMyProfilePhoto,
  removeMyProfilePhoto,
  type UpdateUsernameResult,
  type UploadPhotoResult,
  type RemovePhotoResult,
} from "@/lib/account/user-profile";

export async function updateUsernameAction(
  username: string
): Promise<UpdateUsernameResult> {
  const session = await getCurrentSession();
  if (!session) {
    return {
      success: false,
      error: "Sessão expirada. Faça login novamente.",
    };
  }

  const result = await updateMyUsername(session.userId, username);
  if (result.success) {
    revalidatePath("/conta/perfil");
    revalidatePath("/conta/seguranca");
    revalidatePath("/");
  }

  return result;
}

export async function uploadProfilePhotoAction(
  formData: FormData
): Promise<UploadPhotoResult> {
  const session = await getCurrentSession();
  if (!session) {
    return {
      success: false,
      error: "Sessão expirada. Faça login novamente.",
    };
  }

  const file = formData.get("photo");
  if (!file || !(file instanceof File) || file.size === 0) {
    return {
      success: false,
      error: "Nenhum arquivo de imagem selecionado.",
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadMyProfilePhoto(
      session.userId,
      buffer,
      file.type
    );

    if (result.success) {
      revalidatePath("/conta/perfil");
      revalidatePath("/conta/seguranca");
      revalidatePath("/");
    }

    return result;
  } catch {
    return {
      success: false,
      error: "Falha ao processar o arquivo de imagem.",
    };
  }
}

export async function removeProfilePhotoAction(): Promise<RemovePhotoResult> {
  const session = await getCurrentSession();
  if (!session) {
    return {
      success: false,
      error: "Sessão expirada. Faça login novamente.",
    };
  }

  const result = await removeMyProfilePhoto(session.userId);
  if (result.success) {
    revalidatePath("/conta/perfil");
    revalidatePath("/conta/seguranca");
    revalidatePath("/");
  }

  return result;
}
