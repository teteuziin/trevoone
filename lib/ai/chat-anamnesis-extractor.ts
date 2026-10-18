import { isOpenAiConfigured, getOpenAiClient } from "./openai-client";

export interface ExtractedAnamnesisField {
  key: string;
  label: string;
  value: string;
  sourceMessagePublicId: string | null;
  sourceQuote?: string | null;
  senderRole?: string | null;
  isNotReported: boolean;
}

export interface ExtractedAnamnesisSection {
  category: string;
  label: string;
  fields: ExtractedAnamnesisField[];
}

export interface ExtractedAnamnesisProposal {
  consultationPublicId: string;
  lastExtractedMessageId: string | null;
  extractedAt: string;
  sections: ExtractedAnamnesisSection[];
  summary: string;
}

export interface ChatMessageForExtraction {
  publicId: string;
  senderRole: string;
  senderName: string;
  content: string | null;
  messageType: string;
  createdAt: string;
}

const CANONICAL_ANAMNESIS_STRUCTURE: Array<{
  category: string;
  label: string;
  fields: Array<{ key: string; label: string; keywords: string[] }>;
}> = [
  {
    category: "GOALS",
    label: "Objetivos & Disponibilidade",
    fields: [
      { key: "main_goal", label: "Objetivo Principal", keywords: ["objetivo", "meta", "hipertrofia", "emagrecer", "emagrecimento", "definir", "saúde", "condicionamento"] },
      { key: "weekly_frequency", label: "Frequência Semanal Pretendida", keywords: ["vezes na semana", "dias por semana", "frequência", "3x", "4x", "5x", "segunda a sexta"] },
      { key: "session_duration", label: "Tempo Disponível por Sessão", keywords: ["minutos", "hora", "tempo para treinar", "tempo disponível", "45 min", "1 hora"] },
    ],
  },
  {
    category: "HEALTH_INJURIES",
    label: "Histórico Clínico & Lesões",
    fields: [
      { key: "injuries_pain", label: "Dores ou Lesões Articulares", keywords: ["lesão", "dor", "joelho", "ombro", "coluna", "lombar", "hérnia", "tendinite", "cirurgia"] },
      { key: "chronic_conditions", label: "Patologias / Condições Crônicas", keywords: ["pressão", "hipertensão", "diabetes", "cardíaco", "asma", "tireoide"] },
      { key: "medications", label: "Medicamentos em Uso", keywords: ["remédio", "medicamento", "tomo", "uso contínuo"] },
    ],
  },
  {
    category: "LIFESTYLE",
    label: "Rotina & Estilo de Vida",
    fields: [
      { key: "profession_routine", label: "Profissão & Rotina Diária", keywords: ["trabalho", "profissão", "fico sentado", "em pé", "rotina corrida"] },
      { key: "sleep_quality", label: "Sono & Descanso", keywords: ["sono", "durmo", "horas de sono", "insônia", "acordo cansado"] },
      { key: "water_intake", label: "Consumo de Água", keywords: ["litros de água", "bebo água", "garrafa", "hidratação"] },
      { key: "stress_level", label: "Nível de Estresse", keywords: ["estresse", "ansiedade", "ansioso", "estressado", "tranquilo"] },
    ],
  },
  {
    category: "NUTRITION",
    label: "Alimentação & Restrições",
    fields: [
      { key: "food_restrictions", label: "Restrições / Alergias Alimentares", keywords: ["alergia", "intolerância", "lactose", "glúten", "não como", "vegetariano", "vegano"] },
      { key: "food_dislikes", label: "Alimentos que Rejeita", keywords: ["não gosto", "odeio", "evito", "não desce"] },
      { key: "supplements", label: "Suplementação Atual", keywords: ["suplemento", "creatina", "whey", "vitamina", "ômega 3"] },
      { key: "meal_routine", label: "Rotina de Refeições", keywords: ["refeições por dia", "como fora", "marmita", "café da manhã", "almoço", "jantar"] },
    ],
  },
];

/**
 * Deterministic fallback extractor: inspects message texts for clinical keywords
 * and preserves exact message citations without ever inventing unmentioned data.
 */
function extractDeterministically(
  consultationPublicId: string,
  messages: ChatMessageForExtraction[]
): ExtractedAnamnesisProposal {
  const sections: ExtractedAnamnesisSection[] = CANONICAL_ANAMNESIS_STRUCTURE.map((sec) => {
    const fields: ExtractedAnamnesisField[] = sec.fields.map((fDef) => {
      // Find the most recent message that mentions any of the keywords
      let matchedMsg: ChatMessageForExtraction | null = null;
      let matchedSnippet = "";

      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (!msg.content || typeof msg.content !== "string") continue;
        const lower = msg.content.toLowerCase();

        for (const kw of fDef.keywords) {
          if (lower.includes(kw)) {
            matchedMsg = msg;
            // Extract snippet containing keyword
            const kwIdx = lower.indexOf(kw);
            const start = Math.max(0, kwIdx - 30);
            const end = Math.min(msg.content.length, kwIdx + kw.length + 50);
            matchedSnippet = msg.content.substring(start, end).trim();
            break;
          }
        }
        if (matchedMsg) break;
      }

      if (matchedMsg && matchedSnippet) {
        return {
          key: fDef.key,
          label: fDef.label,
          value: (matchedMsg.content || "").trim(),
          sourceMessagePublicId: matchedMsg.publicId,
          sourceQuote: matchedSnippet,
          senderRole: matchedMsg.senderRole,
          isNotReported: false,
        };
      }

      return {
        key: fDef.key,
        label: fDef.label,
        value: "Não informado",
        sourceMessagePublicId: null,
        sourceQuote: null,
        senderRole: null,
        isNotReported: true,
      };
    });

    return {
      category: sec.category,
      label: sec.label,
      fields,
    };
  });

  const reportedCount = sections.reduce(
    (acc, s) => acc + s.fields.filter((f) => !f.isNotReported).length,
    0
  );

  const lastExtractedMessageId = messages.length > 0 ? messages[messages.length - 1].publicId : null;

  return {
    consultationPublicId,
    lastExtractedMessageId,
    extractedAt: new Date().toISOString(),
    sections,
    summary:
      reportedCount > 0
        ? `${reportedCount} parâmetro(s) clínico(s) identificado(s) na conversa.`
        : "Nenhum dado clínico relevante foi informado nas mensagens até o momento.",
  };
}

/**
 * Extracts structured anamnesis proposal from conversation messages.
 * Uses OpenAI Structured Outputs when available, with strict grounding and zero-hallucination rules.
 * Strictly references sourceMessagePublicId for full traceability.
 */
export async function extractAnamnesisFromChat(
  consultationPublicId: string,
  messages: ChatMessageForExtraction[]
): Promise<ExtractedAnamnesisProposal> {
  if (!messages || messages.length === 0) {
    return extractDeterministically(consultationPublicId, []);
  }

  if (!isOpenAiConfigured()) {
    return extractDeterministically(consultationPublicId, messages);
  }

  try {
    const client = getOpenAiClient();

    const formattedMessages = messages
      .filter((m) => m.content && m.content.trim().length > 0)
      .map((m) => `[ID: ${m.publicId}] [${m.senderRole} (${m.senderName})]: ${m.content}`)
      .join("\n\n");

    if (!formattedMessages.trim()) {
      return extractDeterministically(consultationPublicId, messages);
    }

    const systemPrompt = `Você é o assistente clínico do TREVO ONE encarregado de organizar informações de anamnese a partir de conversas entre profissional de saúde e aluno/paciente.
Sua função é identificar DADOS REAIS informados pelos participantes e organizá-los na estrutura canônica.

REGRAS DE CONDUTA ABSOLUTA:
1. FIDELIDADE AOS FATOS: Extraia SOMENTE informações que foram explicitamente mencionadas nas mensagens.
2. NUNCA INVENTE OU SUPONHA: Se uma informação não foi dita (ex: o aluno não mencionou cirurgias), preencha o valor como "Não informado" com sourceMessagePublicId: null e isNotReported: true.
3. RASTREABILIDADE TOTAL: Para cada campo preenchido com dados reais, informe OBRIGATORIAMENTE o ID exato da mensagem (sourceMessagePublicId) e uma citação curta exata (sourceQuote).
4. Responda em Português do Brasil com clareza clínica.`;

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_IMPORT_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Analise as mensagens abaixo e extraia a proposta de anamnese:\n\n${formattedMessages}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "anamnesis_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    label: { type: "string" },
                    fields: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          key: { type: "string" },
                          label: { type: "string" },
                          value: { type: "string" },
                          sourceMessagePublicId: { type: ["string", "null"] },
                          sourceQuote: { type: ["string", "null"] },
                          isNotReported: { type: "boolean" },
                        },
                        required: ["key", "label", "value", "sourceMessagePublicId", "sourceQuote", "isNotReported"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["category", "label", "fields"],
                  additionalProperties: false,
                },
              },
            },
            required: ["summary", "sections"],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.1,
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    const lastExtractedMessageId = messages[messages.length - 1]?.publicId || null;

    if (parsed.sections && Array.isArray(parsed.sections)) {
      return {
        consultationPublicId,
        lastExtractedMessageId,
        extractedAt: new Date().toISOString(),
        sections: parsed.sections,
        summary: parsed.summary || "Proposta de anamnese organizada pela IA.",
      };
    }

    return extractDeterministically(consultationPublicId, messages);
  } catch (err) {
    console.warn("[AI Anamnesis Extractor] Fallback to deterministic parser:", err);
    return extractDeterministically(consultationPublicId, messages);
  }
}
