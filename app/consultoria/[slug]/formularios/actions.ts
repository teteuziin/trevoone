"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import {
  createConsultancyForm,
  updateConsultancyForm,
  publishConsultancyForm,
  archiveConsultancyForm,
  assignFormToStudents,
  submitFormResponses,
  reviewFormAssignment,
  type CreateConsultancyFormInput,
  type UpdateConsultancyFormInput,
  type AssignFormInput,
  type ReviewFormAssignmentInput,
} from "@/lib/consultancies/forms";

function sanitizeFormActionError(err: unknown, defaultMessage: string): string {
  if (err instanceof Error && err.message) {
    const msg = err.message;
    const isTechnicalSqlError =
      /SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|ER_|SQL|column|table|database|syntax|deadlock|foreign key|constraint|handshake|packet|ECONNREFUSED|PROTOCOL_/i.test(
        msg
      );
    if (!isTechnicalSqlError && msg.trim().length > 0 && msg.length < 250) {
      return msg;
    }
  }
  return defaultMessage;
}

export async function createFormAction(
  slug: string,
  input: CreateConsultancyFormInput
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Sessão expirada. Faça login novamente." };
    }

    const context = await resolveConsultancyContext(session.userId, slug);
    if (!context) {
      return { success: false, error: "Consultoria não encontrada." };
    }

    const viewMode = await resolveEffectiveViewMode(slug, context.roles);
    const isStaff =
      viewMode.effectiveMode === "ADMIN" ||
      viewMode.effectiveMode === "PERSONAL" ||
      viewMode.effectiveMode === "NUTRITIONIST" ||
      context.roles.some((r) =>
        ["CONSULTANCY_ADMIN", "PLATFORM_ADMIN", "PERSONAL", "NUTRITIONIST"].includes(r)
      );

    if (!isStaff) {
      return { success: false, error: "Permissão negada para criar formulários." };
    }

    const form = await createConsultancyForm(slug, session.userId, input);
    revalidatePath(`/consultoria/${slug}/formularios`);
    return { success: true, form };
  } catch (err: unknown) {
    console.error("[createFormAction] Error:", err);
    return {
      success: false,
      error: sanitizeFormActionError(err, "Não foi possível criar o formulário. Tente novamente."),
    };
  }
}

export async function updateFormAction(
  slug: string,
  formPublicId: string,
  input: UpdateConsultancyFormInput
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Sessão expirada. Faça login novamente." };
    }

    const context = await resolveConsultancyContext(session.userId, slug);
    if (!context) {
      return { success: false, error: "Consultoria não encontrada." };
    }

    const form = await updateConsultancyForm(slug, session.userId, formPublicId, input);
    revalidatePath(`/consultoria/${slug}/formularios`);
    return { success: true, form };
  } catch (err: unknown) {
    console.error("[updateFormAction] Error:", err);
    return {
      success: false,
      error: sanitizeFormActionError(err, "Não foi possível atualizar o formulário. Tente novamente."),
    };
  }
}

export async function publishFormAction(slug: string, formPublicId: string) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Sessão expirada. Faça login novamente." };
    }

    const form = await publishConsultancyForm(slug, session.userId, formPublicId);
    revalidatePath(`/consultoria/${slug}/formularios`);
    return { success: true, form };
  } catch (err: unknown) {
    console.error("[publishFormAction] Error:", err);
    return {
      success: false,
      error: sanitizeFormActionError(err, "Não foi possível publicar o formulário. Tente novamente."),
    };
  }
}

export async function archiveFormAction(slug: string, formPublicId: string) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Sessão expirada. Faça login novamente." };
    }

    const form = await archiveConsultancyForm(slug, session.userId, formPublicId);
    revalidatePath(`/consultoria/${slug}/formularios`);
    return { success: true, form };
  } catch (err: unknown) {
    console.error("[archiveFormAction] Error:", err);
    return {
      success: false,
      error: sanitizeFormActionError(err, "Não foi possível arquivar o formulário. Tente novamente."),
    };
  }
}

export async function assignFormAction(slug: string, input: AssignFormInput) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Sessão expirada. Faça login novamente." };
    }

    const result = await assignFormToStudents(slug, session.userId, input);
    revalidatePath(`/consultoria/${slug}/formularios`);

    if (!result.success && result.error) {
      return {
        ...result,
        error: sanitizeFormActionError(new Error(result.error), "Não foi possível atribuir o formulário. Tente novamente."),
      };
    }

    return result;
  } catch (err: unknown) {
    console.error("\n======================================================");
    console.error("[assignFormAction] CRITICAL ERROR CAUGHT! FULL STACK TRACE:");
    console.error(err instanceof Error ? err.stack : err);
    console.error("======================================================\n");
    return {
      success: false,
      error: sanitizeFormActionError(err, "Não foi possível atribuir o formulário. Tente novamente."),
    };
  }
}

export async function submitFormResponsesAction(
  slug: string,
  assignmentPublicId: string,
  responses: Record<string, unknown>
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Sessão expirada. Faça login novamente." };
    }

    const result = await submitFormResponses(
      slug,
      session.userId,
      assignmentPublicId,
      responses
    );
    revalidatePath(`/consultoria/${slug}/formularios`);

    if (!result.success && result.error) {
      return {
        ...result,
        error: sanitizeFormActionError(new Error(result.error), "Não foi possível enviar as respostas. Tente novamente."),
      };
    }

    return result;
  } catch (err: unknown) {
    console.error("[submitFormResponsesAction] Error:", err);
    return {
      success: false,
      error: sanitizeFormActionError(err, "Não foi possível enviar as respostas do formulário. Tente novamente."),
    };
  }
}

export async function reviewFormAssignmentAction(
  slug: string,
  assignmentPublicId: string,
  input: ReviewFormAssignmentInput
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Sessão expirada. Faça login novamente." };
    }

    const result = await reviewFormAssignment(
      slug,
      session.userId,
      assignmentPublicId,
      input
    );
    revalidatePath(`/consultoria/${slug}/formularios`);

    if (!result.success && result.error) {
      return {
        ...result,
        error: sanitizeFormActionError(new Error(result.error), "Não foi possível revisar o formulário. Tente novamente."),
      };
    }

    return result;
  } catch (err: unknown) {
    console.error("[reviewFormAssignmentAction] Error:", err);
    return {
      success: false,
      error: sanitizeFormActionError(err, "Não foi possível revisar o formulário. Tente novamente."),
    };
  }
}
