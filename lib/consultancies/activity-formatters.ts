export type ConsultancyActivityModule =
  | "AUTH"
  | "MEMBERS"
  | "STUDENT"
  | "PERSONAL"
  | "NUTRITION"
  | "FORMS"
  | "CONSULTATIONS"
  | "FILES"
  | "AI"
  | "ADMIN";

export interface ActivityFilterOptions {
  actorMembershipId?: number | bigint;
  actorUserId?: number | bigint;
  actorRole?: string;
  module?: string;
  action?: string;
  subjectMembershipId?: number | bigint;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface ActivityEventRow {
  id: number;
  public_id: string;
  consultancy_id: number;
  actor_membership_id: number | null;
  actor_user_id: number;
  actor_role: string;
  action: string;
  module: string;
  resource_type: string;
  resource_public_id: string | null;
  subject_membership_id: number | null;
  summary: string;
  metadata_json: Record<string, unknown> | null | any;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
  subject_name: string | null;
  subject_email: string | null;
}

export function formatActivityEventNaturalSentence(event: ActivityEventRow): {
  actor: string;
  verbPhrase: string;
  fullSentence: string;
} {
  const actor = event.actor_name?.trim() || "Usuário";
  const subject = event.subject_name?.trim() || "";
  const meta =
    typeof event.metadata_json === "object" && event.metadata_json !== null
      ? (event.metadata_json as Record<string, any>)
      : {};

  let verbPhrase = event.summary;

  switch (event.action) {
    case "AI_TRAINING_IMPORT_STARTED":
      verbPhrase = `iniciou a importação com IA do treino a partir do arquivo "${meta.filename || "de treino"}"`;
      break;
    case "AI_TRAINING_IMPORT_COMPLETED":
      verbPhrase = `concluiu a leitura com IA do arquivo "${meta.filename || "de treino"}"`;
      break;
    case "AI_TRAINING_IMPORT_CONFIRMED":
      verbPhrase = `importou com IA a ficha "${meta.workoutTitle || "Treino"}"${subject ? ` para ${subject}` : ""}`;
      break;
    case "AI_TRAINING_IMPORT_FAILED":
      verbPhrase = `tentou importar o arquivo "${meta.filename || "de treino"}" com IA, mas ocorreu uma falha`;
      break;

    case "AI_NUTRITION_IMPORT_STARTED":
      verbPhrase = `iniciou a importação com IA do plano alimentar a partir do arquivo "${meta.filename || "de nutrição"}"`;
      break;
    case "AI_NUTRITION_IMPORT_COMPLETED":
      verbPhrase = `concluiu a leitura com IA do arquivo "${meta.filename || "de nutrição"}"`;
      break;
    case "AI_NUTRITION_IMPORT_CONFIRMED":
      verbPhrase = `importou com IA o plano alimentar "${meta.planTitle || "Plano"}"${subject ? ` para ${subject}` : ""}`;
      break;
    case "AI_NUTRITION_IMPORT_FAILED":
      verbPhrase = `tentou importar o arquivo "${meta.filename || "de nutrição"}" com IA, mas ocorreu uma falha`;
      break;

    case "TRAINING_PLAN_CREATED":
      verbPhrase = `criou a ficha de treino "${meta.workoutTitle || meta.title || "Treino"}"${subject ? ` para ${subject}` : ""}`;
      break;
    case "TRAINING_PLAN_UPDATED":
      verbPhrase = `atualizou a ficha de treino "${meta.workoutTitle || meta.title || "Treino"}"`;
      break;
    case "TRAINING_PLAN_DUPLICATED":
      verbPhrase = `duplicou a ficha de treino "${meta.workoutTitle || meta.title || "Treino"}"`;
      break;
    case "TRAINING_PLAN_PUBLISHED":
      verbPhrase = `publicou a ficha de treino "${meta.workoutTitle || meta.title || "Treino"}"`;
      break;
    case "TRAINING_PLAN_ASSIGNED":
      verbPhrase = `atribuiu a ficha de treino "${meta.workoutTitle || meta.title || "Treino"}" para ${subject || "um aluno"}`;
      break;
    case "TRAINING_PLAN_ARCHIVED":
      verbPhrase = `arquivou a ficha de treino "${meta.workoutTitle || meta.title || "Treino"}"`;
      break;
    case "TRAINING_PDF_DOWNLOADED":
      verbPhrase =
        subject && subject !== actor
          ? `baixou o PDF da ficha de treino de ${subject}`
          : `baixou o PDF da ficha de treino "${meta.workoutTitle || "Treino"}"`;
      break;

    case "NUTRITION_PLAN_CREATED":
      verbPhrase = `criou o plano alimentar "${meta.planTitle || meta.title || "Plano"}"${subject ? ` para ${subject}` : ""}`;
      break;
    case "NUTRITION_PLAN_UPDATED":
      verbPhrase = `atualizou o plano alimentar "${meta.planTitle || meta.title || "Plano"}"`;
      break;
    case "NUTRITION_PLAN_DUPLICATED":
      verbPhrase = `duplicou o plano alimentar "${meta.planTitle || meta.title || "Plano"}"`;
      break;
    case "NUTRITION_PLAN_PUBLISHED":
      verbPhrase = `publicou o plano alimentar "${meta.planTitle || meta.title || "Plano"}"`;
      break;
    case "NUTRITION_PLAN_ASSIGNED":
      verbPhrase = `atribuiu o plano alimentar "${meta.planTitle || meta.title || "Plano"}" para ${subject || "um paciente"}`;
      break;
    case "NUTRITION_PLAN_ARCHIVED":
      verbPhrase = `arquivou o plano alimentar "${meta.planTitle || meta.title || "Plano"}"`;
      break;
    case "NUTRITION_PDF_DOWNLOADED":
      verbPhrase =
        subject && subject !== actor
          ? `baixou o PDF do plano alimentar de ${subject}`
          : `baixou o PDF do plano alimentar "${meta.planTitle || "Plano"}"`;
      break;

    case "STUDENT_WORKOUT_STARTED":
      verbPhrase = `iniciou a execução do treino "${meta.workoutTitle || "Treino"}"`;
      break;
    case "STUDENT_WORKOUT_COMPLETED":
      verbPhrase = `concluiu o treino "${meta.workoutTitle || "Treino"}"`;
      break;
    case "STUDENT_CHECKIN_CREATED":
      verbPhrase = `enviou um check-in de acompanhamento`;
      break;

    case "MEMBER_ADDED":
      verbPhrase = `adicionou ${subject || "um novo membro"} à consultoria`;
      break;
    case "MEMBER_ROLE_CHANGED":
      verbPhrase = `alterou a função de ${subject || "membro"}`;
      break;
    case "MEMBER_REMOVED":
      verbPhrase = `removeu ${subject || "membro"} da consultoria`;
      break;

    case "AI_LIMIT_CHANGED":
      verbPhrase = `alterou o limite diário de IA da consultoria para ${meta.dailyLimit ?? "novo valor"}`;
      break;
    case "AI_MEMBER_LIMIT_CHANGED":
      verbPhrase = `configurou o limite diário de IA de ${subject || "membro"} para ${meta.dailyLimit ?? "novo valor"}`;
      break;

    default:
      verbPhrase = event.summary;
      break;
  }

  const fullSentence = `${actor} ${verbPhrase}.`;
  return { actor, verbPhrase, fullSentence };
}
