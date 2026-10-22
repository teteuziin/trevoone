/**
-- TREVO ONE — NUTRITION V2 PRE-QUESTIONNAIRE CANONICAL CATALOG
-- Pre-configured clinical questions mapped directly to the 16 Patient General Record fields.
-- Allows the nutritionist to select questions, toggle required flags, and review prior to sending.
*/

import type { PreQuestionnaireQuestionConfig } from "./pre-questionnaire-types";

export const CANONICAL_PRE_QUESTIONNAIRE_QUESTIONS: PreQuestionnaireQuestionConfig[] = [
  // 1. OBJETIVO & DEMANDA CLÍNICA
  {
    id: "mainObjective",
    targetRecordField: "mainObjective",
    category: "OBJETIVO",
    title: "Qual é o seu objetivo principal com a nutrição?",
    description: "Descreva suas metas principais (ex: emagrecimento, hipertrofia, saúde intestinal, disposição, longevidade).",
    fieldType: "TEXTAREA",
    placeholder: "Ex: Perder gordura corporal, melhorar disposição nos treinos e regular o intestino...",
    required: true,
  },
  {
    id: "followUpReason",
    targetRecordField: "followUpReason",
    category: "OBJETIVO",
    title: "O que motivou você a buscar acompanhamento nutricional agora?",
    description: "Conte sobre sua fase atual, eventos recentes ou expectativas para a consulta.",
    fieldType: "TEXTAREA",
    placeholder: "Ex: Sinto que meus exames poderiam melhorar e preciso de disciplina com as refeições...",
    required: false,
  },

  // 2. PATOLOGIAS & HISTÓRICO FAMILIAR
  {
    id: "diagnosedConditions",
    targetRecordField: "diagnosedConditions",
    category: "HISTORICO_MEDICO",
    title: "Você possui alguma condição de saúde ou patologia diagnosticada?",
    description: "Relate condições conhecidas (ex: gastrite, refluxo, hipotireoidismo, diabetes, hipertensão, esteatose).",
    fieldType: "TEXTAREA",
    placeholder: "Ex: Refluxo gastroesofágico leve e hipotireoidismo controlado com medicação...",
    required: false,
    clinicalNotice: "Informação autorrelatada pelo paciente. Não configura diagnóstico médico sem laudo clínico.",
  },
  {
    id: "familyHistory",
    targetRecordField: "familyHistory",
    category: "HISTORICO_MEDICO",
    title: "Há histórico de doenças relevantes na sua família próxima?",
    description: "Pais, irmãos ou avós com histórico de diabetes, doenças cardiovasculares, dislipidemias, câncer, etc.",
    fieldType: "TEXTAREA",
    placeholder: "Ex: Mãe com diabetes tipo 2 e pai com hipertensão arterial...",
    required: false,
  },
  {
    id: "previousSurgeries",
    targetRecordField: "previousSurgeries",
    category: "HISTORICO_MEDICO",
    title: "Já realizou cirurgias ou procedimentos médicos relevantes?",
    description: "Informe cirurgias abdominais, bariátrica, vesícula ou procedimentos cirúrgicos prévios.",
    fieldType: "TEXT",
    placeholder: "Ex: Apendicectomia em 2018; ou Nenhuma cirurgia prévia.",
    required: false,
  },

  // 3. MEDICAMENTOS & SUPLEMENTOS HABITUAIS
  {
    id: "currentMedications",
    targetRecordField: "currentMedications",
    category: "MEDICAMENTOS_SUPLEMENTOS",
    title: "Quais medicamentos de uso contínuo ou frequente você utiliza?",
    description: "Informe nome e dosagem se souber. Isso ajuda a avaliar interações com alimentos e nutrientes.",
    fieldType: "TEXTAREA",
    placeholder: "Ex: Levotiroxina 50mcg em jejum, anticoncepcional oral...",
    required: false,
    clinicalNotice: "Registra os medicamentos habituais prévios do paciente, distintos das prescrições do plano.",
  },
  {
    id: "supplements",
    targetRecordField: "supplements",
    category: "MEDICAMENTOS_SUPLEMENTOS",
    title: "Você já toma suplementos ou vitaminas habitualmente?",
    description: "Creatina, whey protein, ômega 3, vitamina D, multivitamínicos, manipulados...",
    fieldType: "TEXTAREA",
    placeholder: "Ex: Creatina 5g ao acordar e Vitamina D 2000 UI...",
    required: false,
    clinicalNotice: "Registra o uso habitual do paciente, sem misturar com a prescrição do plano.",
  },

  // 4. HIDRATAÇÃO, SONO & ROTINA
  {
    id: "hydrationNotes",
    targetRecordField: "hydrationNotes",
    category: "HABITOS_ROTINA",
    title: "Qual a sua média diária de ingestão de água pura?",
    description: "Aproximadamente quantos litros ou copos de água você bebe por dia (desconsiderando sucos/café).",
    fieldType: "TEXT",
    placeholder: "Ex: Cerca de 2 litros por dia (tenho garrafinha de 500ml)...",
    required: false,
  },
  {
    id: "sleepNotes",
    targetRecordField: "sleepNotes",
    category: "HABITOS_ROTINA",
    title: "Como é a qualidade do seu sono e sua rotina de descanso?",
    description: "Horário de dormir e acordar, horas de sono, se acorda descansado ou se acorda durante a noite.",
    fieldType: "TEXTAREA",
    placeholder: "Ex: Durmo por volta das 23h30 e acordo às 07h. Acordo 1 vez à noite...",
    required: false,
  },
  {
    id: "bowelHabit",
    targetRecordField: "bowelHabit",
    category: "HABITOS_ROTINA",
    title: "Como é o funcionamento do seu intestino?",
    description: "Frequência e características do hábito intestinal.",
    fieldType: "RADIO",
    options: [
      { value: "REGULAR_DAILY", label: "Regular / Diário (1 a 2 vezes ao dia)" },
      { value: "CONSTIPATION", label: "Constipado / Preso (a cada 2 a 4 dias ou mais)" },
      { value: "SOFT_OR_DIARRHEA", label: "Fezes amolecidas ou episódios frequentes de diarreia" },
      { value: "VARIABLE", label: "Variável / Alternado (dias preso, dias solto)" },
      { value: "PREFER_NOT_TO_ANSWER", label: "Prefiro não responder", isNeutralOrNegative: true },
    ],
    required: false,
  },
  {
    id: "gastrointestinalNotes",
    targetRecordField: "gastrointestinalNotes",
    category: "HABITOS_ROTINA",
    title: "Sente desconfortos digestivos frequentes?",
    description: "Azia, queimação, refluxo, gases, distensão abdominal, empachamento pós-refeição.",
    fieldType: "TEXT",
    placeholder: "Ex: Costumo sentir distensão e estufamento após o almoço...",
    required: false,
  },
  {
    id: "smokingStatus",
    targetRecordField: "smokingStatus",
    category: "HABITOS_ROTINA",
    title: "Sobre tabagismo:",
    description: "Uso de cigarros tradicionais, cigarros eletrônicos (vape) ou narguilé.",
    fieldType: "RADIO",
    options: [
      { value: "NON_SMOKER", label: "Não fumo (não fumante)" },
      { value: "SMOKER", label: "Fumante ativo" },
      { value: "FORMER_SMOKER", label: "Ex-fumante" },
      { value: "PREFER_NOT_TO_ANSWER", label: "Prefiro não responder", isNeutralOrNegative: true },
    ],
    required: false,
  },
  {
    id: "alcoholNotes",
    targetRecordField: "alcoholNotes",
    category: "HABITOS_ROTINA",
    title: "Consumo de bebidas alcoólicas:",
    description: "Frequência usual e tipos de bebidas (cerveja, vinho, destilados).",
    fieldType: "TEXT",
    placeholder: "Ex: Socialmente aos finais de semana (2 taças de vinho ou 3 cervejas); ou Não consumo.",
    required: false,
  },
  {
    id: "workStudyRoutine",
    targetRecordField: "workStudyRoutine",
    category: "HABITOS_ROTINA",
    title: "Como é sua rotina de trabalho ou estudo?",
    description: "Horários, trabalho em pé ou sentado, turnos noturnos, tempo de deslocamento.",
    fieldType: "TEXTAREA",
    placeholder: "Ex: Trabalho em home office das 09h às 18h, fico a maior parte do tempo sentado...",
    required: false,
  },

  // 5. PREFERÊNCIAS & RESTRIÇÕES ALIMENTARES
  {
    id: "foodPreferences",
    targetRecordField: "foodPreferences",
    category: "PREFERENCIAS_ALIMENTARES",
    title: "Quais alimentos você mais gosta e não gostaria que faltassem?",
    description: "Frutas, fontes de proteína, tipos de carboidrato ou preparações preferidas.",
    fieldType: "TEXTAREA",
    placeholder: "Ex: Adoro ovos, banana, aveia, frango grelhado, arroz com feijão, café preto...",
    required: false,
  },
  {
    id: "dislikedFoods",
    targetRecordField: "dislikedFoods",
    category: "PREFERENCIAS_ALIMENTARES",
    title: "Quais alimentos você NÃO gosta, rejeita ou tem aversão?",
    description: "Alimentos que você prefere que o profissional evite prescrever no seu cardápio.",
    fieldType: "TEXTAREA",
    placeholder: "Ex: Não gosto de quiabo, fígado, beterraba, sardinha e mamão...",
    required: false,
  },
  {
    id: "allergies",
    targetRecordField: "allergies",
    category: "PREFERENCIAS_ALIMENTARES",
    title: "Você possui ALERGIAS alimentares conhecidas?",
    description: "Alergias mediadas imunologicamente (ex: alergia a proteína do leite de vaca, frutos do mar, castanhas, amendoim, ovo).",
    fieldType: "TEXTAREA",
    placeholder: "Ex: Alergia grave a camarão e frutos do mar; ou Nenhuma alergia conhecida.",
    required: false,
    clinicalNotice: "Alergias alimentares são separadas estritamente de intolerâncias.",
  },
  {
    id: "foodIntolerances",
    targetRecordField: "foodIntolerances",
    category: "PREFERENCIAS_ALIMENTARES",
    title: "Você possui INTOLERÂNCIAS ou sensibilidades alimentares?",
    description: "Dificuldades digestivas ou intolerâncias enzimáticas (ex: intolerância à lactose, sensibilidade a glúten não celíaca, FODMAPs).",
    fieldType: "TEXTAREA",
    placeholder: "Ex: Intolerância moderada a lactose (leite puro causa desconforto); ou Nenhuma intolerância.",
    required: false,
    clinicalNotice: "Intolerâncias alimentares mantidas de forma isolada das alergias no prontuário.",
  },

  // 6. SAÚDE FEMININA & GESTAÇÃO
  {
    id: "pregnancyStatus",
    targetRecordField: null,
    category: "SAUDE_FEMININA",
    title: "Você está gestante ou em período pós-parto?",
    description: "Aplicável a pacientes do sexo biológico feminino.",
    fieldType: "RADIO",
    options: [
      { value: "NOT_PREGNANT", label: "Não estou gestante" },
      { value: "PREGNANT", label: "Estou gestante" },
      { value: "POSTPARTUM", label: "Pós-parto / Amamentando" },
      { value: "NOT_APPLICABLE", label: "Não se aplica", isNeutralOrNegative: true },
    ],
    biologicalSexRestriction: "FEMALE",
    required: false,
  },
  {
    id: "gestationalWeeks",
    targetRecordField: null,
    category: "SAUDE_FEMININA",
    title: "Quantas semanas de gestação você está no momento?",
    description: "Informe o número aproximado de semanas gestacionais na data atual.",
    fieldType: "NUMBER",
    placeholder: "Ex: 16",
    conditionalOn: {
      parentQuestionId: "pregnancyStatus",
      expectedValues: ["PREGNANT"],
    },
    biologicalSexRestriction: "FEMALE",
    required: false,
  },
];

export function getQuestionsCatalogForStudent(biologicalSex?: string | null): PreQuestionnaireQuestionConfig[] {
  const isMale = biologicalSex === "MALE" || biologicalSex === "M";
  if (isMale) {
    return CANONICAL_PRE_QUESTIONNAIRE_QUESTIONS.filter(
      (q) => q.biologicalSexRestriction !== "FEMALE"
    );
  }
  return CANONICAL_PRE_QUESTIONNAIRE_QUESTIONS;
}

export function findCanonicalQuestionById(id: string): PreQuestionnaireQuestionConfig | undefined {
  return CANONICAL_PRE_QUESTIONNAIRE_QUESTIONS.find((q) => q.id === id);
}

export function getQuestionsByCategory(category: string): PreQuestionnaireQuestionConfig[] {
  return CANONICAL_PRE_QUESTIONNAIRE_QUESTIONS.filter((q) => q.category === category);
}
