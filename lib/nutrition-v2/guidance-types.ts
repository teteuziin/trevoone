/**
 * TREVO ONE — NUTRITION V2 STRUCTURED CLINICAL GUIDANCE
 * Pure domain model, validators and presentation helpers for:
 * 1. Recomendações (General recommendations, lifestyle, hydration, nutrition guidelines)
 * 2. Suplementação (Prescribed nutritional supplements)
 * 3. Fitoterápicos (Prescribed phytotherapeutics & botanicals)
 *
 * Rules:
 * - Pure clinical prescription written by the qualified professional.
 * - Strict separation from patient-reported anamnese/prontuário history.
 * - All categories and detailed fields are optional: no clinical defaults, no auto-prescriptions.
 * - Empty categories do not generate empty sections in patient view or PDF.
 * - Internal team notes are strictly segregated and NEVER leaked to student/PDF.
 */

export interface PlanRecommendationItem {
  id: string;
  title?: string | null;
  text: string;
  sortOrder: number;
}

export interface PlanPrescriptionItem {
  id: string;
  name: string; // Nome do produto ou princípio ativo
  presentation?: string | null; // Apresentação / concentração (ex: "Cápsula", "Extrato seco 500mg", "Pó")
  dosage?: string | null; // Quantidade ou dose (ex: "1", "5", "1 scoop")
  unit?: string | null; // Unidade (ex: "cápsula", "g", "ml", "gotas")
  route?: string | null; // Via ou modo de uso (ex: "Via oral", "Diluído em água")
  frequency?: string | null; // Frequência ou horários (ex: "1x ao dia pela manhã", "Em jejum", "30 min antes do treino")
  duration?: string | null; // Duração ou datas (ex: "Uso contínuo", "Por 30 dias", "Até a próxima consulta")
  notes?: string | null; // Observações adicionais / texto livre complementar
  sortOrder: number;
}

export interface PlanStructuredGuidance {
  schemaVersion: 1;
  recommendations: PlanRecommendationItem[];
  supplements: PlanPrescriptionItem[];
  phytotherapeutics: PlanPrescriptionItem[];
}

export interface PresentedPrescriptionItem {
  id: string;
  name: string;
  presentation: string | null;
  dosage: string | null;
  unit: string | null;
  doseFormatted: string | null;
  route: string | null;
  frequency: string | null;
  duration: string | null;
  notes: string | null;
}

export interface PresentedGuidance {
  hasAny: boolean;
  hasRecommendations: boolean;
  hasSupplements: boolean;
  hasPhytotherapeutics: boolean;
  recommendations: Array<{
    id: string;
    title: string | null;
    text: string;
  }>;
  supplements: PresentedPrescriptionItem[];
  phytotherapeutics: PresentedPrescriptionItem[];
}

export function createEmptyStructuredGuidance(): PlanStructuredGuidance {
  return {
    schemaVersion: 1,
    recommendations: [],
    supplements: [],
    phytotherapeutics: [],
  };
}

export function sanitizeGuidanceText(val: string | null | undefined): string {
  if (!val) return "";
  // Strip control characters and dangerous HTML script tags while preserving newlines and accents
  return String(val)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export function formatPrescriptionItemDose(
  dosage: string | null | undefined,
  unit: string | null | undefined
): string | null {
  const d = dosage ? dosage.trim() : "";
  const u = unit ? unit.trim() : "";
  if (!d && !u) return null;
  if (d && u) return `${d} ${u}`;
  return d || u || null;
}

export function parseStructuredGuidance(
  raw: unknown,
  legacyGeneralGuidance?: string | null
): PlanStructuredGuidance {
  if (raw != null) {
    let parsed: unknown = raw;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }

    if (parsed && typeof parsed === "object" && "schemaVersion" in parsed) {
      const p = parsed as Partial<PlanStructuredGuidance>;
      const recommendations: PlanRecommendationItem[] = [];
      const supplements: PlanPrescriptionItem[] = [];
      const phytotherapeutics: PlanPrescriptionItem[] = [];

      if (Array.isArray(p.recommendations)) {
        for (let i = 0; i < p.recommendations.length; i++) {
          const item = p.recommendations[i] as unknown as Record<string, unknown> | null | undefined;
          if (item && typeof item === "object" && typeof item.text === "string" && item.text.trim()) {
            recommendations.push({
              id: String(item.id || `rec-${i + 1}`),
              title: item.title && typeof item.title === "string" ? sanitizeGuidanceText(item.title) : null,
              text: sanitizeGuidanceText(item.text),
              sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : i,
            });
          }
        }
      }

      const parsePrescriptionList = (list: unknown, prefix: string): PlanPrescriptionItem[] => {
        const result: PlanPrescriptionItem[] = [];
        if (!Array.isArray(list)) return result;
        for (let i = 0; i < list.length; i++) {
          const item = list[i] as unknown as Record<string, unknown> | null | undefined;
          if (item && typeof item === "object" && typeof item.name === "string" && item.name.trim()) {
            result.push({
              id: String(item.id || `${prefix}-${i + 1}`),
              name: sanitizeGuidanceText(item.name),
              presentation: typeof item.presentation === "string" ? sanitizeGuidanceText(item.presentation) : null,
              dosage: typeof item.dosage === "string" ? sanitizeGuidanceText(item.dosage) : null,
              unit: typeof item.unit === "string" ? sanitizeGuidanceText(item.unit) : null,
              route: typeof item.route === "string" ? sanitizeGuidanceText(item.route) : null,
              frequency: typeof item.frequency === "string" ? sanitizeGuidanceText(item.frequency) : null,
              duration: typeof item.duration === "string" ? sanitizeGuidanceText(item.duration) : null,
              notes: typeof item.notes === "string" ? sanitizeGuidanceText(item.notes) : null,
              sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : i,
            });
          }
        }
        return result;
      };

      supplements.push(...parsePrescriptionList(p.supplements, "sup"));
      phytotherapeutics.push(...parsePrescriptionList(p.phytotherapeutics, "fito"));

      recommendations.sort((a, b) => a.sortOrder - b.sortOrder);
      supplements.sort((a, b) => a.sortOrder - b.sortOrder);
      phytotherapeutics.sort((a, b) => a.sortOrder - b.sortOrder);

      return {
        schemaVersion: 1,
        recommendations,
        supplements,
        phytotherapeutics,
      };
    }
  }

  // Graceful fallback for legacy plans with general_guidance plain text
  if (legacyGeneralGuidance && legacyGeneralGuidance.trim()) {
    return parseTextIntoStructuredGuidance(legacyGeneralGuidance);
  }

  return createEmptyStructuredGuidance();
}

/**
 * Parses free text (from plan notes, Word docx import, or legacy guidance)
 * into cleanly separated recommendations, supplements, and phytotherapeutics blocks.
 */
export function parseTextIntoStructuredGuidance(text?: string | null): PlanStructuredGuidance {
  if (!text || !text.trim()) {
    return createEmptyStructuredGuidance();
  }

  const raw = text.replace(/\r\n/g, "\n").trim();
  const paragraphs = raw.split(/\n\s*\n+/);

  const recommendations: PlanRecommendationItem[] = [];
  const supplements: PlanPrescriptionItem[] = [];
  const phytotherapeutics: PlanPrescriptionItem[] = [];

  let currentSectionTitle: string | null = null;
  let currentSectionLines: string[] = [];

  const isHeaderLine = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^[•\-\*·]/.test(trimmed)) return false;
    if (trimmed.length > 70) return false;
    if (/^(sugest[oõ]es[,:\s]+sucos|sucos\b|suplementa[cç][aã]o|fitoter[aá]picos|orienta[cç][oõ]es|hidrata[cç][aã]o|recomenda[cç][oõ]es|ch[aá]s\b)/i.test(trimmed)) {
      return true;
    }
    return false;
  };

  const flushSection = (title: string | null, lines: string[]) => {
    const content = lines.join("\n").trim();
    if (!content && !title) return;

    const lowerTitle = (title || "").toLowerCase();
    if (/suplementa/i.test(lowerTitle)) {
      supplements.push({
        id: `sup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: sanitizeGuidanceText(title || "Suplementação recomendada"),
        notes: sanitizeGuidanceText(content),
        sortOrder: supplements.length,
      });
    } else if (/fitoter/i.test(lowerTitle)) {
      phytotherapeutics.push({
        id: `fito-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: sanitizeGuidanceText(title || "Fitoterápicos recomendados"),
        notes: sanitizeGuidanceText(content),
        sortOrder: phytotherapeutics.length,
      });
    } else {
      recommendations.push({
        id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: sanitizeGuidanceText(title || "Orientações Gerais"),
        text: sanitizeGuidanceText(content || title || ""),
        sortOrder: recommendations.length,
      });
    }
  };

  for (const para of paragraphs) {
    const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const firstLine = lines[0];
    if (isHeaderLine(firstLine)) {
      if (currentSectionTitle || currentSectionLines.length > 0) {
        flushSection(currentSectionTitle, currentSectionLines);
        currentSectionLines = [];
      }
      currentSectionTitle = firstLine;
      currentSectionLines = lines.slice(1);
    } else if (currentSectionTitle) {
      currentSectionLines.push(...lines);
    } else {
      currentSectionTitle = "Orientações Gerais";
      currentSectionLines = lines;
    }
  }

  if (currentSectionTitle || currentSectionLines.length > 0) {
    flushSection(currentSectionTitle, currentSectionLines);
  }

  return {
    schemaVersion: 1,
    recommendations,
    supplements,
    phytotherapeutics,
  };
}

export function hasAnyGuidanceContent(guidance: PlanStructuredGuidance | null | undefined): boolean {
  if (!guidance) return false;
  return (
    (Array.isArray(guidance.recommendations) && guidance.recommendations.length > 0) ||
    (Array.isArray(guidance.supplements) && guidance.supplements.length > 0) ||
    (Array.isArray(guidance.phytotherapeutics) && guidance.phytotherapeutics.length > 0)
  );
}

export function summarizeGuidanceToText(guidance: PlanStructuredGuidance): string | null {
  const sections: string[] = [];

  if (guidance.recommendations.length > 0) {
    const lines: string[] = ["[RECOMENDAÇÕES]"];
    for (const r of guidance.recommendations) {
      if (r.title) lines.push(`• ${r.title}: ${r.text}`);
      else lines.push(`• ${r.text}`);
    }
    sections.push(lines.join("\n"));
  }

  if (guidance.supplements.length > 0) {
    const lines: string[] = ["[SUPLEMENTAÇÃO]"];
    for (const s of guidance.supplements) {
      const parts = [s.name];
      if (s.presentation) parts.push(`(${s.presentation})`);
      const dose = formatPrescriptionItemDose(s.dosage, s.unit);
      if (dose) parts.push(`- Dose: ${dose}`);
      if (s.frequency) parts.push(`- ${s.frequency}`);
      if (s.route) parts.push(`- Via: ${s.route}`);
      if (s.duration) parts.push(`- Duração: ${s.duration}`);
      if (s.notes) parts.push(`- Obs: ${s.notes}`);
      lines.push(`• ${parts.join(" ")}`);
    }
    sections.push(lines.join("\n"));
  }

  if (guidance.phytotherapeutics.length > 0) {
    const lines: string[] = ["[FITOTERÁPICOS]"];
    for (const f of guidance.phytotherapeutics) {
      const parts = [f.name];
      if (f.presentation) parts.push(`(${f.presentation})`);
      const dose = formatPrescriptionItemDose(f.dosage, f.unit);
      if (dose) parts.push(`- Dose: ${dose}`);
      if (f.frequency) parts.push(`- ${f.frequency}`);
      if (f.route) parts.push(`- Via: ${f.route}`);
      if (f.duration) parts.push(`- Duração: ${f.duration}`);
      if (f.notes) parts.push(`- Obs: ${f.notes}`);
      lines.push(`• ${parts.join(" ")}`);
    }
    sections.push(lines.join("\n"));
  }

  return sections.length > 0 ? sections.join("\n\n") : null;
}

export function presentStructuredGuidance(guidance: PlanStructuredGuidance): PresentedGuidance {
  const hasRecommendations = guidance.recommendations.length > 0;
  const hasSupplements = guidance.supplements.length > 0;
  const hasPhytotherapeutics = guidance.phytotherapeutics.length > 0;
  const hasAny = hasRecommendations || hasSupplements || hasPhytotherapeutics;

  const mapPrescription = (items: PlanPrescriptionItem[]): PresentedPrescriptionItem[] => {
    return items.map((it) => ({
      id: it.id,
      name: it.name,
      presentation: it.presentation || null,
      dosage: it.dosage || null,
      unit: it.unit || null,
      doseFormatted: formatPrescriptionItemDose(it.dosage, it.unit),
      route: it.route || null,
      frequency: it.frequency || null,
      duration: it.duration || null,
      notes: it.notes || null,
    }));
  };

  return {
    hasAny,
    hasRecommendations,
    hasSupplements,
    hasPhytotherapeutics,
    recommendations: guidance.recommendations.map((r) => ({
      id: r.id,
      title: r.title || null,
      text: r.text,
    })),
    supplements: mapPrescription(guidance.supplements),
    phytotherapeutics: mapPrescription(guidance.phytotherapeutics),
  };
}
