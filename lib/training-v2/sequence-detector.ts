/**
 * TREVO ONE — Training V2 Sequence Detector
 * Intelligent domain service to detect multi-movement exercise sequences in textual strings.
 * 
 * Rules:
 * 1. High confidence separators: +, →, ->, >>, "seguido de", "depois", "logo após".
 * 2. Medium confidence separators: /, comma (3+ items or qualifiers), "e" (only with explicit sequence signals).
 * 3. Never split normal exercise names (e.g., "Elevação lateral e controle escapular", "Supino reto, pegada aberta").
 * 4. Extracts auxiliary prescription hints (reps, duration, qualifiers) without altering main prescriptions.
 * 5. Preserves raw original text snapshot.
 */

export type DetectedMovementHint = {
  reps?: string | number | null;
  repsText?: string | null;
  duration?: string | number | null;
  durationText?: string | null;
  qualifiers?: string[];
};

export type DetectedMovement = {
  order: number;
  rawText: string;
  normalizedName: string;
  prescriptionHint?: DetectedMovementHint;
};

export type DetectedSequenceResult = {
  detected: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  rawText: string;
  separatorUsed?: string | null;
  qualifiers?: string[];
  movements: DetectedMovement[];
};

// Known qualifiers indicating intensity or continuous execution
const SEQUENCE_QUALIFIER_REGEX = /\b(non[\s-]?stop|sem\s+descanso|sem\s+pausa|sem\s+intervalo|em\s+circuito|direto|em\s+supers[ée]rie)\b/gi;

// Known common exercise variations/accessories that should NOT be split as separate movements
const NON_EXERCISE_TERMS = new Set([
  "controle escapular",
  "pegada aberta",
  "pegada fechada",
  "pegada pronada",
  "pegada supinada",
  "pegada neutra",
  "barra livre",
  "com halteres",
  "com halter",
  "na maquina",
  "na máquina",
  "no smith",
  "no banco",
  "inclinado",
  "declinado",
  "unilateral",
  "bilateral",
]);

/**
 * Extracts reps and duration hints from a raw movement fragment.
 * Examples:
 * - "10 Flexões" -> { repsText: "10", normalized: "Flexões" }
 * - "10 Burpees" -> { repsText: "10", normalized: "Burpees" }
 * - "30s Prancha" -> { durationText: "30s", normalized: "Prancha" }
 * - "Prancha 45 seg" -> { durationText: "45 seg", normalized: "Prancha" }
 */
export function extractMovementHints(rawFragment: string): {
  normalizedName: string;
  hint?: DetectedMovementHint;
} {
  let text = rawFragment.trim();
  const qualifiers: string[] = [];

  // 1. Extract qualifiers (e.g. NON STOP)
  text = text.replace(SEQUENCE_QUALIFIER_REGEX, (match) => {
    qualifiers.push(match.trim().toUpperCase());
    return "";
  }).trim();

  // Clean trailing/leading punctuation
  text = text.replace(/^[,\-\–\—\.\:\;]+|[,\-\–\—\.\:\;]+$/g, "").trim();

  let repsText: string | null = null;
  let durationText: string | null = null;

  // 2. Duration prefix: e.g. "30s Prancha", "45 seg prancha", "1 min prancha"
  const durationPrefixMatch = text.match(/^(\d+(?:[.,]\d+)?\s*(?:s|seg|segs|segundos|min|mins|minutos))\s+(.+)$/i);
  if (durationPrefixMatch) {
    durationText = durationPrefixMatch[1].trim();
    text = durationPrefixMatch[2].trim();
  } else {
    // Duration suffix: e.g. "Prancha 30s", "Prancha 45 seg"
    const durationSuffixMatch = text.match(/^(.+?)\s+(\d+(?:[.,]\d+)?\s*(?:s|seg|segs|segundos|min|mins|minutos))$/i);
    if (durationSuffixMatch) {
      durationText = durationSuffixMatch[2].trim();
      text = durationSuffixMatch[1].trim();
    }
  }

  // 3. Reps prefix: e.g. "10 Flexões", "10x flexões", "12 reps agachamento"
  if (!durationText) {
    const repsPrefixMatch = text.match(/^(\d+)\s*(?:reps?|repeti[çc][õo]es|x)?\s+(.+)$/i);
    if (repsPrefixMatch) {
      repsText = repsPrefixMatch[1].trim();
      text = repsPrefixMatch[2].trim();
    } else {
      // Reps suffix: e.g. "Flexões 10 reps", "Flexões 10x"
      const repsSuffixMatch = text.match(/^(.+?)\s+(\d+)\s*(?:reps?|repeti[çc][õo]es|x)$/i);
      if (repsSuffixMatch) {
        repsText = repsSuffixMatch[2].trim();
        text = repsSuffixMatch[1].trim();
      }
    }
  }

  // Final cleanup of normalized name
  const normalizedName = text.replace(/\s+/g, " ").trim();

  const hint: DetectedMovementHint | undefined =
    repsText || durationText || qualifiers.length > 0
      ? {
          repsText,
          durationText,
          qualifiers: qualifiers.length > 0 ? qualifiers : undefined,
        }
      : undefined;

  return {
    normalizedName,
    hint,
  };
}

/**
 * Detects whether a string represents an exercise sequence and splits it into structured movements.
 */
export function detectExerciseSequenceFromText(inputText: string | null | undefined): DetectedSequenceResult {
  if (!inputText || typeof inputText !== "string") {
    return { detected: false, confidence: "LOW", rawText: "", movements: [] };
  }

  const rawText = inputText.trim();
  if (rawText.length < 3) {
    return { detected: false, confidence: "LOW", rawText, movements: [] };
  }

  // Extract global qualifiers from raw text
  const globalQualifiers: string[] = [];
  rawText.replace(SEQUENCE_QUALIFIER_REGEX, (match) => {
    globalQualifiers.push(match.trim().toUpperCase());
    return "";
  });

  // =========================================================================
  // 1. HIGH CONFIDENCE SEPARATORS
  // =========================================================================

  // Separator: Plus (+)
  if (rawText.includes("+")) {
    const rawParts = rawText.split("+");
    const parsedMovements = parseRawParts(rawParts);
    if (parsedMovements.length >= 2) {
      return {
        detected: true,
        confidence: "HIGH",
        rawText,
        separatorUsed: "+",
        qualifiers: globalQualifiers.length > 0 ? globalQualifiers : undefined,
        movements: parsedMovements,
      };
    }
  }

  // Separator: Arrows (→, ->, >>)
  if (rawText.includes("→") || rawText.includes("->") || rawText.includes(">>")) {
    const rawParts = rawText.split(/(?:→|->|>>)/);
    const parsedMovements = parseRawParts(rawParts);
    if (parsedMovements.length >= 2) {
      return {
        detected: true,
        confidence: "HIGH",
        rawText,
        separatorUsed: "→",
        qualifiers: globalQualifiers.length > 0 ? globalQualifiers : undefined,
        movements: parsedMovements,
      };
    }
  }

  // Separator: Portuguese phrases ("seguido de", "seguida de", "logo após", "depois de", "depois")
  const phraseRegex = /\b(?:seguido\s+de|seguida\s+de|logo\s+ap[óo]s|depois\s+de|depois)\b/gi;
  if (phraseRegex.test(rawText)) {
    // Reset regex lastIndex
    phraseRegex.lastIndex = 0;
    // Also handle trailing " e " after a phrase: e.g. "Abdominal reto seguido de abdominal infra e prancha"
    const splitRegex = /\b(?:seguido\s+de|seguida\s+de|logo\s+ap[óo]s|depois\s+de|depois|\be\b)/gi;
    const rawParts = rawText.split(splitRegex);
    const parsedMovements = parseRawParts(rawParts);
    if (parsedMovements.length >= 2) {
      return {
        detected: true,
        confidence: "HIGH",
        rawText,
        separatorUsed: "phrase",
        qualifiers: globalQualifiers.length > 0 ? globalQualifiers : undefined,
        movements: parsedMovements,
      };
    }
  }

  // =========================================================================
  // 2. MEDIUM CONFIDENCE SEPARATORS
  // =========================================================================

  // Separator: Slash (/)
  if (rawText.includes("/")) {
    const rawParts = rawText.split("/");
    const parsedMovements = parseRawParts(rawParts);
    // Avoid splitting simple alternates like "Barra / Halteres", "10/12 reps"
    const isAlternateEquipment = parsedMovements.every((m) =>
      NON_EXERCISE_TERMS.has(m.normalizedName.toLowerCase()) ||
      m.normalizedName.toLowerCase() === "barra" ||
      m.normalizedName.toLowerCase() === "halteres" ||
      m.normalizedName.toLowerCase() === "halter"
    );
    if (parsedMovements.length >= 2 && !isAlternateEquipment) {
      return {
        detected: true,
        confidence: "MEDIUM",
        rawText,
        separatorUsed: "/",
        qualifiers: globalQualifiers.length > 0 ? globalQualifiers : undefined,
        movements: parsedMovements,
      };
    }
  }

  // Separator: Comma (,)
  // Rule: Comma only splits if:
  // - 3 or more parts (e.g. "Reto, Infra, Prancha")
  // - OR 2 parts WITH a sequence qualifier (e.g. "Reto, Infra NON STOP")
  // - Never splits 2-part exercise variations like "Supino reto, pegada aberta" or "Agachamento, barra livre"
  if (rawText.includes(",")) {
    // Check if combined with " e " at the end (e.g. "Reto, infra e prancha")
    const commaParts = rawText.split(/,|\be\b/i);
    const parsedMovements = parseRawParts(commaParts);

    if (parsedMovements.length >= 3) {
      return {
        detected: true,
        confidence: "HIGH",
        rawText,
        separatorUsed: ",",
        qualifiers: globalQualifiers.length > 0 ? globalQualifiers : undefined,
        movements: parsedMovements,
      };
    }

    if (parsedMovements.length === 2) {
      const secondPartLower = parsedMovements[1].normalizedName.toLowerCase();
      // If 2nd part is a known accessory/variation, it is NOT a sequence
      if (NON_EXERCISE_TERMS.has(secondPartLower)) {
        return {
          detected: false,
          confidence: "LOW",
          rawText,
          movements: [{ order: 1, rawText, normalizedName: rawText }],
        };
      }
      // If there's an explicit qualifier like NON STOP
      if (globalQualifiers.length > 0) {
        return {
          detected: true,
          confidence: "MEDIUM",
          rawText,
          separatorUsed: ",",
          qualifiers: globalQualifiers,
          movements: parsedMovements,
        };
      }
    }
  }

  // Separator: " e " ALONE (e.g. "10 Flexões e 10 Burpees")
  // Rule: "e" ALONE is ambiguous (e.g. "Elevação lateral e controle escapular" must NOT split).
  // Only split if both sides have explicit numbers/reps/duration or other sequence hints.
  const andMatch = rawText.match(/^(.+?)\s+\be\b\s+(.+)$/i);
  if (andMatch) {
    const leftRaw = andMatch[1].trim();
    const rightRaw = andMatch[2].trim();
    const leftParsed = extractMovementHints(leftRaw);
    const rightParsed = extractMovementHints(rightRaw);

    const leftHasHint = Boolean(leftParsed.hint?.repsText || leftParsed.hint?.durationText);
    const rightHasHint = Boolean(rightParsed.hint?.repsText || rightParsed.hint?.durationText);

    const rightLower = rightParsed.normalizedName.toLowerCase();
    const isRightAccessory = NON_EXERCISE_TERMS.has(rightLower);

    // Only accept if not an accessory AND either both sides have prescription hints or qualifiers exist
    if (!isRightAccessory && (leftHasHint || rightHasHint || globalQualifiers.length > 0)) {
      return {
        detected: true,
        confidence: "MEDIUM",
        rawText,
        separatorUsed: "e",
        qualifiers: globalQualifiers.length > 0 ? globalQualifiers : undefined,
        movements: [
          {
            order: 1,
            rawText: leftRaw,
            normalizedName: leftParsed.normalizedName,
            prescriptionHint: leftParsed.hint,
          },
          {
            order: 2,
            rawText: rightRaw,
            normalizedName: rightParsed.normalizedName,
            prescriptionHint: rightParsed.hint,
          },
        ],
      };
    }
  }

  // No sequence detected: preserve original input as single movement
  return {
    detected: false,
    confidence: "LOW",
    rawText,
    movements: [
      {
        order: 1,
        rawText,
        normalizedName: rawText,
      },
    ],
  };
}

/**
 * Internal helper to parse an array of raw text fragments into valid DetectedMovement objects.
 */
function parseRawParts(rawParts: string[]): DetectedMovement[] {
  const result: DetectedMovement[] = [];
  let order = 1;

  for (const part of rawParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const { normalizedName, hint } = extractMovementHints(trimmed);
    if (normalizedName.length >= 2) {
      result.push({
        order,
        rawText: trimmed,
        normalizedName,
        prescriptionHint: hint,
      });
      order++;
    }
  }

  return result;
}
