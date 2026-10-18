/**
 * TREVO ONE — Training AI Text Analyzer
 * 
 * Intelligent parser that extracts workout parameters from natural language descriptions
 * without inventing unmentioned values.
 */

export interface ParsedWorkoutInterpretation {
  objective: string | null;
  level: string | null;
  split: string | null;
  daysPerWeek: number | null;
  durationMinutes: number | null;
  equipment: string | null;
  focusMuscles: string | null;
  restrictions: string | null;
  hasContradiction: boolean;
  contradictionReason?: string;
  isComplete: boolean;
  missingFields: Array<"frequency" | "duration" | "equipment">;
  clarificationQuestion?: string;
}

export function analyzeWorkoutDescription(text: string): ParsedWorkoutInterpretation {
  const lower = text.toLowerCase();

  // 1. Contradiction Detection
  let hasContradiction = false;
  let contradictionReason: string | undefined;

  const mentionsEveryday = /todo\s*dia|diariamente|todos\s*os\s*dias/i.test(lower);
  const mentionsTwoOrThreeDays = /\b(?:2|3|duas|tr[êe]s)\s*(?:dias|vezes|x)\b/i.test(lower);
  if (mentionsEveryday && mentionsTwoOrThreeDays) {
    hasContradiction = true;
    contradictionReason = "Identifiquei uma contradição sobre os dias de treino (mencionado todo dia e poucos dias).";
  }

  // 2. Frequency / Days per week
  let daysPerWeek: number | null = null;
  let split: string | null = null;

  const daysMatch = lower.match(/\b([1-7])\s*(?:dias|vezes|x|sess[õo]es)(?:\s*(?:por\s*semana|na\s*semana|semanais))?\b/i);
  if (daysMatch) {
    daysPerWeek = parseInt(daysMatch[1], 10);
    if (daysPerWeek === 1) split = "Treino Único";
  } else if (/\b(?:1|um)\s*(?:treino|dia)\b|\btreino\s*[uú]nico\b|\bapenas\s*um\s*treino\b|\bsomente\s*um\s*treino\b|\bsess[aã]o\s*[uú]nica\b/i.test(lower)) {
    daysPerWeek = 1;
    split = "Treino Único";
  } else if (/segunda\s*a\s*sexta/i.test(lower)) {
    daysPerWeek = 5;
  } else if (/segunda\s*a\s*s[aá]bado/i.test(lower)) {
    daysPerWeek = 6;
  } else if (/segunda|ter[çc]a|quarta|quinta|sexta/i.test(lower) && !/todo\s*dia/i.test(lower)) {
    const daysFound = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"].filter((d) =>
      lower.includes(d)
    );
    if (daysFound.length >= 2) daysPerWeek = daysFound.length;
  } else if (/\babcde\b/i.test(lower)) {
    daysPerWeek = 5;
    split = "ABCDE (Músculo isolado por dia)";
  } else if (/\babcd\b/i.test(lower)) {
    daysPerWeek = 4;
    split = "ABCD (Peito e Tríceps, Costas e Bíceps, Pernas, Ombros)";
  } else if (/\babc\b/i.test(lower) || /push\s*pull\s*legs/i.test(lower)) {
    daysPerWeek = 3;
    split = "ABC (Push / Pull / Legs)";
  } else if (/upper\s*\/?\s*lower/i.test(lower)) {
    daysPerWeek = 4;
    split = "Upper / Lower (Membros Superiores / Membros Inferiores)";
  } else if (/full\s*body|corpo\s*inteiro/i.test(lower)) {
    daysPerWeek = 3;
    split = "Full Body (Corpo Inteiro)";
  }

  // 3. Duration / Time per session
  let durationMinutes: number | null = null;
  const durationMatch = lower.match(/(?:at[ée]\s*)?(\d{2,3})\s*(?:min|minutos)\b/i);
  if (durationMatch) {
    durationMinutes = parseInt(durationMatch[1], 10);
  } else if (/\b1\s*(?:h|hora)\b/i.test(lower)) {
    durationMinutes = 60;
  } else if (/\b45\s*(?:a|-)\s*50\s*min/i.test(lower)) {
    durationMinutes = 50;
  } else if (/\b50\s*(?:a|-)\s*60\s*min/i.test(lower)) {
    durationMinutes = 60;
  }

  // 4. Objective
  let objective: string | null = null;
  if (/hipertrofia|massa\s*muscular|ganho\s*de\s*massa/i.test(lower)) {
    objective = "Hipertrofia e Ganho de Massa Muscular";
  } else if (/emagrecimento|defini[çc][ãa]o|perder\s*peso|queimar\s*gordura/i.test(lower)) {
    objective = "Emagrecimento e Definição";
  } else if (/for[çc]a|pot[êe]ncia|powerlifting/i.test(lower)) {
    objective = "Força e Potência Muscular";
  } else if (/condicionamento|resist[êe]ncia|cardio/i.test(lower)) {
    objective = "Condicionamento Geral e Resistência";
  } else if (/reabilita[çc][ãa]o|postura|funcional|postural/i.test(lower)) {
    objective = "Reabilitação, Postura e Funcional";
  }

  // 5. Level (only when informed!)
  let level: string | null = null;
  if (/\biniciante\b/i.test(lower)) {
    level = "Iniciante";
  } else if (/\bintermedi[aá]rio\b/i.test(lower)) {
    level = "Intermediário";
  } else if (/\bavan[çc]ado\b/i.test(lower)) {
    level = "Avançado";
  }

  // 6. Equipment
  let equipment: string | null = null;
  if (/academia\s*completa|aparelhos|m[aá]quinas|polias/i.test(lower)) {
    equipment = "Academia Completa (Aparelhos, Polias, Barras e Halteres)";
  } else if (/apenas\s*halteres|somente\s*halteres|pesos\s*livres|halteres\s*e\s*barras/i.test(lower)) {
    equipment = "Halteres e Barras Livres";
  } else if (/peso\s*corporal|calistenia/i.test(lower)) {
    equipment = "Peso Corporal / Calistenia";
  } else if (/em\s*casa|treino\s*em\s*casa|el[aá]sticos/i.test(lower)) {
    equipment = "Treino em Casa / Elásticos e Acessórios";
  }

  // 7. Focus / Preferences
  let focusMuscles: string | null = null;
  const focusMatch = text.match(/(?:priorizar|foco\s*em|ênfase\s*em|dar\s*ênfase\s*(?:a|em))\s*([^.,\n]+)/i);
  if (focusMatch) {
    focusMuscles = focusMatch[1].trim();
  }

  // 8. Restrictions / Health
  let restrictions: string | null = null;
  const restrictionMatch = text.match(/(?:evitar|les[ãa]o\s*(?:no|na|de)?|dor\s*(?:no|na)?|h[ée]rnia|cuidado\s*com|sem\s*impacto)\s*([^.,\n]+)/i);
  if (restrictionMatch) {
    restrictions = restrictionMatch[0].trim();
  }

  // 9. Missing essential checks
  const missingFields: Array<"frequency" | "duration" | "equipment"> = [];
  if (daysPerWeek === null) missingFields.push("frequency");
  if (durationMinutes === null) missingFields.push("duration");
  if (equipment === null) missingFields.push("equipment");

  // Formulate 1 short natural clarification question if needed
  let clarificationQuestion: string | undefined;
  if (hasContradiction) {
    clarificationQuestion = "Identifiquei uma contradição sobre os dias disponíveis na descrição. Quantos dias por semana serão de fato?";
  } else if (missingFields.length === 3) {
    clarificationQuestion = "Quantos dias por semana, quanto tempo por sessão e quais equipamentos você prefere?";
  } else if (missingFields.includes("frequency") && missingFields.includes("duration")) {
    clarificationQuestion = "Quantos dias por semana e quanto tempo por sessão?";
  } else if (missingFields.includes("frequency") && missingFields.includes("equipment")) {
    clarificationQuestion = "Quantos dias por semana serão e quais equipamentos estão disponíveis?";
  } else if (missingFields.includes("duration") && missingFields.includes("equipment")) {
    clarificationQuestion = "Quanto tempo por sessão e quais equipamentos estarão disponíveis?";
  } else if (missingFields.includes("frequency")) {
    clarificationQuestion = "Quantos dias por semana você planeja para este treino?";
  } else if (missingFields.includes("duration")) {
    clarificationQuestion = "Qual é a duração prevista para cada sessão de treino (ex: 45 min, 50 min)?";
  } else if (missingFields.includes("equipment")) {
    clarificationQuestion = "Quais equipamentos estarão disponíveis (ex: academia completa, halteres ou em casa)?";
  }

  const isComplete = missingFields.length === 0 && !hasContradiction;

  return {
    objective,
    level,
    split,
    daysPerWeek,
    durationMinutes,
    equipment,
    focusMuscles,
    restrictions,
    hasContradiction,
    contradictionReason,
    isComplete,
    missingFields,
    clarificationQuestion,
  };
}
