/**
 * TREVO ONE — CANONICAL BRAZILIAN FOOD PORTIONS REGISTRY
 *
 * Primary Technical References:
 * 1. IBGE / POF (Pesquisa de Orçamentos Familiares) — Tabela de Medidas Referenciais
 *    para Alimentos Consumidos no Brasil.
 * 2. Pinheiro, A.B.V. et al. — Tabela para Avaliação de Consumo Alimentar em Medidas Caseiras (USP / Atheneu).
 * 3. NEPA / UNICAMP — Tabela Brasileira de Composição de Alimentos (TACO 4ª edição).
 *
 * Rules:
 * - Strict preparation state distinction (e.g. Arroz cru != Arroz cozido; Carne crua != Grelhada).
 * - Exact physical equivalences without guessing or unit conflation (ml != g).
 * - Deterministic, repeatable public IDs for lazy persistence into nutrition_v2_food_portions.
 */

import crypto from "node:crypto";
import { normalizeSearchText } from "./food-search";

export interface CanonicalFoodPortionDef {
  label: string;
  amount: number; // in reference units (G or ML)
  notes?: string;
}

export interface CanonicalPortionRule {
  id: string;
  matcher: (normName: string, category?: string | null, prepState?: string | null) => boolean;
  portions: CanonicalFoodPortionDef[];
}

export const CANONICAL_FOOD_PORTIONS_RULES: CanonicalPortionRule[] = [
  // -------------------------------------------------------------------------
  // 1. ARROZ CRU (Arroz polido, tipo 1, tipo 2, integral - CRU)
  // Ref: IBGE/POF & Pinheiro et al. (xícara de chá 200g, copo 165g, colher sopa 20g)
  // -------------------------------------------------------------------------
  {
    id: "arroz-cru",
    matcher: (norm, cat, prep) => {
      if (!norm.includes("arroz") || norm.includes("macarrao") || norm.includes("farinha") || norm.includes("leite de arroz")) return false;
      return prep === "Cru" || /\b(cru|crua)\b/.test(norm);
    },
    portions: [
      { label: "Xícara de chá", amount: 200, notes: "Equivalência IBGE/Pinheiro para arroz cru" },
      { label: "Copo americano", amount: 165, notes: "Equivalência IBGE/Pinheiro para arroz cru" },
      { label: "Colher de sopa", amount: 20, notes: "Equivalência IBGE/Pinheiro para arroz cru" },
    ],
  },

  // -------------------------------------------------------------------------
  // 2. ARROZ COZIDO / PREPARADO (Arroz branco, tipo 1, tipo 2, parboilizado, integral - COZIDO)
  // Ref: TACO/IBGE/Pinheiro (colher de servir cheia 50g, rasa 35g, colher sopa 25g, xícara 160g)
  // -------------------------------------------------------------------------
  {
    id: "arroz-cozido",
    matcher: (norm, cat, prep) => {
      if (!norm.includes("arroz") || norm.includes("macarrao") || norm.includes("farinha") || norm.includes("leite de arroz")) return false;
      if (prep === "Cru" || /\b(cru|crua)\b/.test(norm)) return false;
      return true; // default preparation for rice in meals is cooked
    },
    portions: [
      { label: "Colher de servir cheia", amount: 50, notes: "Equivalência TACO/IBGE/Pinheiro" },
      { label: "Colher de servir rasa", amount: 35, notes: "Equivalência Pinheiro" },
      { label: "Colher de sopa cheia", amount: 25, notes: "Equivalência Pinheiro" },
      { label: "Escumadeira / Pegador", amount: 60, notes: "Equivalência Pinheiro" },
      { label: "Xícara de chá", amount: 160, notes: "Equivalência Pinheiro" },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. FEIJÃO COZIDO COM CALDO (Carioca, preto, fradinho, branco, mulatinho)
  // Ref: IBGE/Pinheiro (concha média 130g, pequena 85g, grande 180g, colher sopa 20g)
  // -------------------------------------------------------------------------
  {
    id: "feijao-cozido",
    matcher: (norm, cat, prep) => {
      if (!norm.includes("feijao")) return false;
      return prep !== "Cru" && !/\b(cru|crua)\b/.test(norm);
    },
    portions: [
      { label: "Concha média", amount: 130, notes: "Equivalência IBGE/Pinheiro (grãos + caldo)" },
      { label: "Concha pequena", amount: 85, notes: "Equivalência Pinheiro" },
      { label: "Concha grande", amount: 180, notes: "Equivalência Pinheiro" },
      { label: "Colher de sopa cheia", amount: 20, notes: "Equivalência Pinheiro" },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. FEIJÃO CRU
  // -------------------------------------------------------------------------
  {
    id: "feijao-cru",
    matcher: (norm, cat, prep) => {
      if (!norm.includes("feijao")) return false;
      return prep === "Cru" || /\b(cru|crua)\b/.test(norm);
    },
    portions: [
      { label: "Xícara de chá", amount: 180, notes: "Equivalência Pinheiro" },
      { label: "Colher de sopa", amount: 18, notes: "Equivalência Pinheiro" },
    ],
  },

  // -------------------------------------------------------------------------
  // 5. AVEIA (Flocos finos, médios, grossos, farinha)
  // -------------------------------------------------------------------------
  {
    id: "aveia",
    matcher: (norm) => norm.includes("aveia"),
    portions: [
      { label: "Colher de sopa cheia", amount: 15, notes: "Equivalência Pinheiro" },
      { label: "Colher de sobremesa", amount: 8, notes: "Equivalência Pinheiro" },
      { label: "Xícara de chá", amount: 80, notes: "Equivalência Pinheiro" },
    ],
  },

  // -------------------------------------------------------------------------
  // 6. AZEITE DE OLIVA E ÓLEOS VEGETAIS (Soja, milho, girassol, canola)
  // Ref: Pinheiro (colher sopa 13ml/12g, sobremesa 8ml/7g, chá 5ml/4.5g)
  // -------------------------------------------------------------------------
  {
    id: "oleos-azeites",
    matcher: (norm) =>
      norm.includes("azeite") ||
      (norm.includes("oleo") &&
        (norm.includes("soja") || norm.includes("girassol") || norm.includes("milho") || norm.includes("canola") || norm.includes("oliva"))),
    portions: [
      { label: "Colher de sopa", amount: 13, notes: "Equivalência Pinheiro (13 ml / ~12 g)" },
      { label: "Colher de sobremesa", amount: 8, notes: "Equivalência Pinheiro (8 ml / ~7 g)" },
      { label: "Colher de chá", amount: 5, notes: "Equivalência Pinheiro (5 ml / ~4.5 g)" },
    ],
  },

  // -------------------------------------------------------------------------
  // 7. OVOS DE GALINHA (Inteiro cozido, frito, mexido, cru)
  // Ref: TACO/IBGE (unidade média 50g, grande 60g, pequena 45g)
  // -------------------------------------------------------------------------
  {
    id: "ovos-galinha",
    matcher: (norm) =>
      norm.includes("ovo") &&
      (norm.includes("galinha") || norm.includes("cozido") || norm.includes("frito") || norm.includes("mexido") || norm.includes("poche") || norm.includes("cru")) &&
      !norm.includes("codorna") && !norm.includes("avestruz"),
    portions: [
      { label: "Unidade média", amount: 50, notes: "Equivalência padrão TACO/IBGE" },
      { label: "Unidade grande", amount: 60, notes: "Equivalência padrão IBGE" },
      { label: "Unidade pequena", amount: 45, notes: "Equivalência padrão IBGE" },
      { label: "Clara de ovo", amount: 35, notes: "Equivalência padrão TACO" },
      { label: "Gema de ovo", amount: 15, notes: "Equivalência padrão TACO" },
    ],
  },

  // -------------------------------------------------------------------------
  // 8. PÃO FRANCÊS / PÃO DE SAL
  // Ref: IBGE/POF/ABIP (unidade 50g)
  // -------------------------------------------------------------------------
  {
    id: "pao-frances",
    matcher: (norm) =>
      norm.includes("pao frances") || norm.includes("pao de sal") || norm.includes("cacetinho") || norm === "pao, frances",
    portions: [
      { label: "Unidade", amount: 50, notes: "Equivalência oficial IBGE/ABIP" },
      { label: "Metade (1/2 unidade)", amount: 25, notes: "Equivalência oficial" },
    ],
  },

  // -------------------------------------------------------------------------
  // 9. PÃO DE FORMA (Branco, integral, multigrãos)
  // Ref: IBGE/POF (fatia 25g)
  // -------------------------------------------------------------------------
  {
    id: "pao-de-forma",
    matcher: (norm) => norm.includes("pao de forma") || norm.includes("pao fatiado"),
    portions: [
      { label: "Fatia", amount: 25, notes: "Equivalência oficial IBGE/POF" },
      { label: "2 Fatias (sanduíche)", amount: 50, notes: "Equivalência sanduíche" },
    ],
  },

  // -------------------------------------------------------------------------
  // 10. BANANA (Prata, nanica, maçã, ouro, terra)
  // Ref: Pinheiro/IBGE (sem casca: média 70g, grande 90g, pequena 50g)
  // -------------------------------------------------------------------------
  {
    id: "banana",
    matcher: (norm) =>
      norm.includes("banana") &&
      !norm.includes("frita") && !norm.includes("doce") && !norm.includes("farofa") && !norm.includes("farinha"),
    portions: [
      { label: "Unidade média", amount: 70, notes: "Equivalência Pinheiro (sem casca)" },
      { label: "Unidade grande", amount: 90, notes: "Equivalência Pinheiro (sem casca)" },
      { label: "Unidade pequena", amount: 50, notes: "Equivalência Pinheiro (sem casca)" },
    ],
  },

  // -------------------------------------------------------------------------
  // 11. MAÇÃ (Fuji, gala, verde)
  // Ref: Pinheiro/IBGE (média 130g, pequena 90g, grande 180g)
  // -------------------------------------------------------------------------
  {
    id: "maca",
    matcher: (norm) => norm.includes("maca") && !norm.includes("torta") && !norm.includes("doce") && !norm.includes("vinagre"),
    portions: [
      { label: "Unidade média", amount: 130, notes: "Equivalência Pinheiro/IBGE" },
      { label: "Unidade pequena", amount: 90, notes: "Equivalência Pinheiro" },
      { label: "Unidade grande", amount: 180, notes: "Equivalência Pinheiro" },
    ],
  },

  // -------------------------------------------------------------------------
  // 12. LARANJA (Pêra, baía, lima)
  // -------------------------------------------------------------------------
  {
    id: "laranja",
    matcher: (norm) => norm.includes("laranja") && !norm.includes("suco") && !norm.includes("doce") && !norm.includes("geleia"),
    portions: [
      { label: "Unidade média", amount: 130, notes: "Equivalência Pinheiro (sem casca)" },
      { label: "Unidade pequena", amount: 90, notes: "Equivalência Pinheiro (sem casca)" },
      { label: "Unidade grande", amount: 180, notes: "Equivalência Pinheiro (sem casca)" },
    ],
  },

  // -------------------------------------------------------------------------
  // 13. PEITO DE FRANGO COZIDO / GRELHADO / ASSADO / DESFIADO
  // Ref: Pinheiro (filé médio 100g, pequeno 70g, grande 150g, colher sopa desfiado 20g)
  // -------------------------------------------------------------------------
  {
    id: "frango-cozido",
    matcher: (norm, cat, prep) => {
      if (!norm.includes("frango") || !norm.includes("peito")) return false;
      return prep !== "Cru" && !/\b(cru|crua)\b/.test(norm);
    },
    portions: [
      { label: "Filé médio", amount: 100, notes: "Equivalência Pinheiro" },
      { label: "Filé pequeno", amount: 70, notes: "Equivalência Pinheiro" },
      { label: "Filé grande", amount: 150, notes: "Equivalência Pinheiro" },
      { label: "Pedaço médio", amount: 100, notes: "Equivalência Pinheiro" },
      { label: "Colher de sopa cheia (desfiado)", amount: 20, notes: "Equivalência Pinheiro" },
    ],
  },

  // -------------------------------------------------------------------------
  // 14. PEITO DE FRANGO CRU
  // -------------------------------------------------------------------------
  {
    id: "frango-cru",
    matcher: (norm, cat, prep) => {
      if (!norm.includes("frango") || !norm.includes("peito")) return false;
      return prep === "Cru" || /\b(cru|crua)\b/.test(norm);
    },
    portions: [
      { label: "Filé médio cru", amount: 130, notes: "Rendimento pré-preparo (~100g após cocção)" },
      { label: "Filé pequeno cru", amount: 90, notes: "Rendimento pré-preparo (~70g após cocção)" },
      { label: "Filé grande cru", amount: 195, notes: "Rendimento pré-preparo (~150g após cocção)" },
    ],
  },

  // -------------------------------------------------------------------------
  // 15. CARNE BOVINA GRELHADA / COZIDA / ASSADA (Bifes magros)
  // -------------------------------------------------------------------------
  {
    id: "carne-bovina-cozida",
    matcher: (norm, cat, prep) => {
      const isBeef =
        norm.includes("carne bovina") || norm.includes("alcatra") || norm.includes("patinho") ||
        norm.includes("contrafile") || norm.includes("mignon") || norm.includes("coxao mole") ||
        norm.includes("bife bovino");
      if (!isBeef || norm.includes("moida")) return false;
      return prep !== "Cru" && !/\b(cru|crua)\b/.test(norm);
    },
    portions: [
      { label: "Bife médio", amount: 100, notes: "Equivalência Pinheiro" },
      { label: "Bife pequeno", amount: 70, notes: "Equivalência Pinheiro" },
      { label: "Bife grande", amount: 150, notes: "Equivalência Pinheiro" },
      { label: "Pedaço médio", amount: 100, notes: "Equivalência Pinheiro" },
    ],
  },

  // -------------------------------------------------------------------------
  // 16. CARNE MOÍDA REFOGADA / COZIDA
  // -------------------------------------------------------------------------
  {
    id: "carne-moida",
    matcher: (norm, cat, prep) => {
      if (!norm.includes("carne") || !norm.includes("moida")) return false;
      return prep !== "Cru" && !/\b(cru|crua)\b/.test(norm);
    },
    portions: [
      { label: "Colher de servir cheia", amount: 50, notes: "Equivalência Pinheiro" },
      { label: "Colher de sopa cheia", amount: 25, notes: "Equivalência Pinheiro" },
      { label: "Pegador", amount: 60, notes: "Equivalência Pinheiro" },
    ],
  },

  // -------------------------------------------------------------------------
  // 17. LEITE FLUIDO (Integral, desnatado, semidesnatado)
  // -------------------------------------------------------------------------
  {
    id: "leite-fluido",
    matcher: (norm) =>
      norm.startsWith("leite") &&
      (norm.includes("vaca") || norm.includes("integral") || norm.includes("desnatado") || norm.includes("semidesnatado")) &&
      !norm.includes("po") && !norm.includes("condensado"),
    portions: [
      { label: "Copo americano", amount: 200, notes: "Equivalência Pinheiro (200 ml)" },
      { label: "Xícara de chá", amount: 160, notes: "Equivalência Pinheiro (160 ml)" },
      { label: "Caneca", amount: 250, notes: "Equivalência Pinheiro (250 ml)" },
    ],
  },

  // -------------------------------------------------------------------------
  // 18. IOGURTE (Natural, grego, desnatado)
  // -------------------------------------------------------------------------
  {
    id: "iogurte",
    matcher: (norm) => norm.includes("iogurte") && !norm.includes("po"),
    portions: [
      { label: "Pote / Unidade", amount: 170, notes: "Equivalência padrão de pote comercial" },
      { label: "Pote pequeno", amount: 100, notes: "Equivalência padrão iogurte grego" },
      { label: "Colher de sopa", amount: 20, notes: "Equivalência Pinheiro" },
    ],
  },

  // -------------------------------------------------------------------------
  // 19. QUEIJO FATIADO (Muçarela, prato, minas)
  // -------------------------------------------------------------------------
  {
    id: "queijo-fatiado",
    matcher: (norm) =>
      norm.includes("queijo") &&
      (norm.includes("mussarela") || norm.includes("mucarela") || norm.includes("prato") || norm.includes("minas")),
    portions: [
      { label: "Fatia média", amount: 30, notes: "Equivalência Pinheiro" },
      { label: "Fatia fina", amount: 15, notes: "Equivalência Pinheiro" },
      { label: "Pedaço pequeno", amount: 30, notes: "Equivalência Pinheiro" },
    ],
  },

  // -------------------------------------------------------------------------
  // 20. BATATA DOCE COZIDA
  // -------------------------------------------------------------------------
  {
    id: "batata-doce",
    matcher: (norm, cat, prep) => norm.includes("batata doce") && prep !== "Cru" && !/\b(cru|crua)\b/.test(norm),
    portions: [
      { label: "Unidade média", amount: 150, notes: "Equivalência Pinheiro" },
      { label: "Pedaço médio", amount: 75, notes: "Equivalência Pinheiro" },
      { label: "Fatia média", amount: 40, notes: "Equivalência Pinheiro" },
    ],
  },

  // -------------------------------------------------------------------------
  // 21. BATATA INGLESA COZIDA
  // -------------------------------------------------------------------------
  {
    id: "batata-inglesa",
    matcher: (norm, cat, prep) =>
      norm.includes("batata") && (norm.includes("inglesa") || norm.includes("cozida")) && !norm.includes("doce") && prep !== "Cru" && !/\b(cru|crua)\b/.test(norm),
    portions: [
      { label: "Unidade média", amount: 140, notes: "Equivalência Pinheiro" },
      { label: "Colher de servir cheia", amount: 60, notes: "Equivalência Pinheiro" },
      { label: "Pedaço médio", amount: 70, notes: "Equivalência Pinheiro" },
    ],
  },

  // -------------------------------------------------------------------------
  // 22. CAFÉ INFUSIONADO (Bebida pronta)
  // -------------------------------------------------------------------------
  {
    id: "cafe-bebida",
    matcher: (norm) =>
      norm.includes("cafe") &&
      (norm.includes("infusao") || norm.includes("bebida") || norm.includes("coado")) &&
      !norm.includes("po") && !norm.includes("grao"),
    portions: [
      { label: "Xícara de café", amount: 50, notes: "Equivalência Pinheiro (50 ml)" },
      { label: "Xícara de chá", amount: 150, notes: "Equivalência Pinheiro (150 ml)" },
      { label: "Caneca", amount: 240, notes: "Equivalência Pinheiro (240 ml)" },
    ],
  },

  // -------------------------------------------------------------------------
  // 23. AÇÚCAR (Cristal, refinado, mascavo)
  // -------------------------------------------------------------------------
  {
    id: "acucar",
    matcher: (norm) => norm.includes("acucar"),
    portions: [
      { label: "Colher de sopa cheia", amount: 15, notes: "Equivalência Pinheiro" },
      { label: "Colher de sobremesa", amount: 10, notes: "Equivalência Pinheiro" },
      { label: "Colher de chá rasa", amount: 5, notes: "Equivalência Pinheiro" },
    ],
  },

  // -------------------------------------------------------------------------
  // 24. MANTEIGA E MARGARINA
  // -------------------------------------------------------------------------
  {
    id: "manteiga-margarina",
    matcher: (norm) => norm.includes("manteiga") || norm.includes("margarina"),
    portions: [
      { label: "Colher de sopa rasa", amount: 10, notes: "Equivalência Pinheiro" },
      { label: "Colher de chá", amount: 5, notes: "Equivalência Pinheiro" },
      { label: "Ponta de faca", amount: 5, notes: "Equivalência Pinheiro" },
    ],
  },
];

/**
 * Deterministically generates an RFC-4122 compliant UUID v4 format string
 * from foodId and portion label to guarantee idempotent persistence and
 * identical publicId across requests.
 */
export function generateDeterministicPortionPublicId(foodId: number | bigint, label: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(`trevo:canonical_portion:${foodId}:${label.trim().toLowerCase()}`)
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Resolves standard Brazilian household measures for a food according to its
 * canonical name, category, and preparation state.
 * Returns empty array if no verified official measures exist for this exact item.
 */
export function resolveCanonicalPortionsForFood(params: {
  name: string;
  displayName?: string | null;
  category?: string | null;
  preparationState?: string | null;
  referenceUnitCode?: string | null;
}): CanonicalFoodPortionDef[] {
  const combined = `${params.displayName || ""} ${params.name}`.trim();
  const norm = normalizeSearchText(combined);

  for (const rule of CANONICAL_FOOD_PORTIONS_RULES) {
    if (rule.matcher(norm, params.category, params.preparationState)) {
      return rule.portions;
    }
  }

  return [];
}

/**
 * Checks if a portion exists or can be canonically resolved for a food.
 * If canonical, lazily inserts it into nutrition_v2_food_portions and returns the portion info.
 */
export async function resolveAndEnsureCanonicalPortion(
  connection: { query: (sql: string, params: unknown[]) => Promise<unknown> },
  food: { [key: string]: unknown },
  portionPublicIdOrLabel: string
): Promise<{
  publicId: string;
  label: string;
  equivalentReferenceAmount: number;
  notes?: string | null;
} | null> {
  const foodId = food.id != null ? Number(food.id) : 0;
  const foodName = food.name != null ? String(food.name) : "";
  const displayName = food.display_name_pt_br != null ? String(food.display_name_pt_br) : null;
  const category = food.category != null ? String(food.category) : null;
  const refUnit = food.reference_unit_code != null ? String(food.reference_unit_code) : "G";

  const canonicals = resolveCanonicalPortionsForFood({
    name: foodName,
    displayName,
    category,
    referenceUnitCode: refUnit,
  });

  const target = portionPublicIdOrLabel.trim().toLowerCase();
  for (let i = 0; i < canonicals.length; i++) {
    const c = canonicals[i];
    const detPublicId = generateDeterministicPortionPublicId(foodId, c.label);
    if (detPublicId.toLowerCase() === target || c.label.toLowerCase() === target) {
      // Attempt idempotent insert into DB
      try {
        await connection.query(
          `INSERT INTO nutrition_v2_food_portions
           (public_id, food_id, label, equivalent_reference_amount, sort_order, status, scope, consultancy_id, created_by_user_id, notes)
           VALUES (?, ?, ?, ?, ?, 'ACTIVE', 'GLOBAL', NULL, NULL, ?)
           ON DUPLICATE KEY UPDATE status = 'ACTIVE'`,
          [detPublicId, foodId, c.label, c.amount, i, c.notes || null]
        );
      } catch {
        // Silently continue if DB insert fails
      }
      return {
        publicId: detPublicId,
        label: c.label,
        equivalentReferenceAmount: c.amount,
        notes: c.notes,
      };
    }
  }

  return null;
}

