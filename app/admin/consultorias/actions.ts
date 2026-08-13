"use server";

import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { createConsultancyWithInitialAdmin } from "@/lib/platform-admin/consultancies";

export type CreateConsultancyFormState = {
  success: boolean;
  error?: string;
  field?: "name" | "slug" | "initialAdminEmail";
};

export async function createConsultancyAction(
  _prevState: CreateConsultancyFormState | null,
  formData: FormData
): Promise<CreateConsultancyFormState> {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);

  if (!isPlatformAdmin) {
    redirect("/selecionar-consultoria");
  }

  const name = String(formData.get("name") || "");
  const slug = String(formData.get("slug") || "");
  const initialAdminEmail = String(formData.get("initialAdminEmail") || "");

  const result = await createConsultancyWithInitialAdmin({
    actorUserId: session.userId,
    name,
    slug,
    initialAdminEmail,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      field: result.field,
    };
  }

  redirect("/admin/consultorias");
}
