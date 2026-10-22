import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const {
  createEmptyStructuredGuidance,
  parseStructuredGuidance,
  sanitizeGuidanceText,
  formatPrescriptionItemDose,
  summarizeGuidanceToText,
  presentStructuredGuidance,
  hasAnyGuidanceContent,
} = await import("../lib/nutrition-v2/guidance-types.ts");

const {
  presentNutritionPlanFromVersionTree,
} = await import("../lib/nutrition-v2/nutrition-plan-presentation.ts");

const {
  assertCanAuthorNutrition,
  NutritionAuthorizationError,
} = await import("../lib/nutrition-v2/access.ts");

console.log("=== INICIANDO TESTES: ETAPA 7 — ORIENTAÇÕES NUTRICIONAIS ORGANIZADAS ===");

// TEST 1: Migration 058 Integrity
{
  const migrationPath = path.join(process.cwd(), "database", "migrations", "058_nutrition_v2_plan_versions_structured_guidance.sql");
  assert.ok(fs.existsSync(migrationPath), "Migration 058 deve existir no diretório de migrations");
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.ok(sql.includes("ALTER TABLE `nutrition_v2_plan_versions`"), "Deve alterar a tabela nutrition_v2_plan_versions");
  assert.ok(sql.includes("ADD COLUMN `guidance_json` JSON NULL DEFAULT NULL"), "Deve adicionar a coluna guidance_json do tipo JSON");
  assert.ok(sql.includes("AFTER `general_guidance`"), "Deve posicionar após general_guidance");
  console.log("✓ Teste 1: Migration 058 verificada com sucesso.");
}

// TEST 2: Pure Domain Model & Parsing
{
  const empty = createEmptyStructuredGuidance();
  assert.equal(empty.schemaVersion, 1);
  assert.deepEqual(empty.recommendations, []);
  assert.deepEqual(empty.supplements, []);
  assert.deepEqual(empty.phytotherapeutics, []);
  assert.equal(hasAnyGuidanceContent(empty), false);

  // Parse legacy string fallback
  const legacyParsed = parseStructuredGuidance(null, "Beba 3 litros de água por dia.");
  assert.equal(legacyParsed.recommendations.length, 1);
  assert.equal(legacyParsed.recommendations[0].title, "Orientações Gerais");
  assert.equal(legacyParsed.recommendations[0].text, "Beba 3 litros de água por dia.");
  assert.equal(legacyParsed.supplements.length, 0);
  assert.equal(legacyParsed.phytotherapeutics.length, 0);
  assert.equal(hasAnyGuidanceContent(legacyParsed), true);

  // Parse structured JSON
  const structuredJson = JSON.stringify({
    schemaVersion: 1,
    recommendations: [
      { id: "r1", title: "Sono", text: "Dormir pelo menos 8 horas.", sortOrder: 0 }
    ],
    supplements: [
      {
        id: "s1",
        name: "Creatina Creapure",
        presentation: "Pó 100% puro",
        dosage: "5",
        unit: "g",
        route: "Via oral",
        frequency: "Após o treino",
        duration: "Uso contínuo",
        notes: "Tomar com água ou suco de uva",
        sortOrder: 0,
      }
    ],
    phytotherapeutics: [
      {
        id: "f1",
        name: "Ashwagandha (Withania somnifera)",
        presentation: "Extrato padronizado 5% withanolídeos",
        dosage: "300",
        unit: "mg",
        route: "Via oral",
        frequency: "1 cápsula 1h antes de dormir",
        duration: "Por 60 dias",
        notes: "Interromper se houver desconforto gástrico",
        sortOrder: 0,
      }
    ]
  });

  const parsed = parseStructuredGuidance(structuredJson);
  assert.equal(parsed.recommendations.length, 1);
  assert.equal(parsed.supplements.length, 1);
  assert.equal(parsed.phytotherapeutics.length, 1);
  assert.equal(parsed.supplements[0].name, "Creatina Creapure");
  assert.equal(parsed.phytotherapeutics[0].name, "Ashwagandha (Withania somnifera)");
  assert.equal(hasAnyGuidanceContent(parsed), true);
  console.log("✓ Teste 2: Parser e estrutura de dados de orientações validados.");
}

// TEST 3: Sanitization of HTML/Script tags
{
  const unsafe = "<script>alert('xss')</script><b>Orientações</b> normais";
  const sanitized = sanitizeGuidanceText(unsafe);
  assert.ok(!sanitized.includes("<script>"), "Tags <script> devem ser eliminadas");
  assert.ok(!sanitized.includes("<b>"), "Tags HTML devem ser removidas");
  assert.ok(sanitized.includes("Orientações normais"), "Texto limpo deve ser preservado");
  console.log("✓ Teste 3: Sanitização de scripts e tags HTML validada.");
}

// TEST 4: Dosage formatting
{
  assert.equal(formatPrescriptionItemDose("5", "g"), "5 g");
  assert.equal(formatPrescriptionItemDose("1 scoop", ""), "1 scoop");
  assert.equal(formatPrescriptionItemDose("", "cápsula"), "cápsula");
  assert.equal(formatPrescriptionItemDose(null, null), null);
  console.log("✓ Teste 4: Formatação de dosagens validada.");
}

// TEST 5: Text summarization (backward compatibility with plain text readers)
{
  const guidance = {
    schemaVersion: 1,
    recommendations: [{ id: "1", title: "Água", text: "3L/dia", sortOrder: 0 }],
    supplements: [{ id: "2", name: "Whey Protein", presentation: "Isolado", dosage: "30", unit: "g", route: "Oral", frequency: "Pós treino", duration: "Diário", notes: "Com água gelada", sortOrder: 0 }],
    phytotherapeutics: [{ id: "3", name: "Chá Verde", presentation: "Extrato seco 500mg", dosage: "1", unit: "cápsula", route: "Oral", frequency: "Manhã", duration: "30 dias", notes: null, sortOrder: 0 }]
  };
  const summary = summarizeGuidanceToText(guidance);
  assert.ok(summary.includes("[RECOMENDAÇÕES]"));
  assert.ok(summary.includes("Água: 3L/dia"));
  assert.ok(summary.includes("[SUPLEMENTAÇÃO]"));
  assert.ok(summary.includes("Whey Protein"));
  assert.ok(summary.includes("[FITOTERÁPICOS]"));
  assert.ok(summary.includes("Chá Verde"));
  console.log("✓ Teste 5: Sumarização legível de texto validada.");
}

// TEST 6: Presentation Mapping & Empty Category Suppression
{
  // Scenario A: All categories empty -> hasAny = false, no blocks
  const emptyGuidance = createEmptyStructuredGuidance();
  const presentedEmpty = presentStructuredGuidance(emptyGuidance);
  assert.equal(presentedEmpty.hasAny, false);
  assert.equal(presentedEmpty.hasRecommendations, false);
  assert.equal(presentedEmpty.hasSupplements, false);
  assert.equal(presentedEmpty.hasPhytotherapeutics, false);

  // Scenario B: Only supplements prescribed
  const onlySupplements = {
    schemaVersion: 1,
    recommendations: [],
    supplements: [{ id: "s1", name: "Omega 3", presentation: "Cápsulas 1000mg", dosage: "2", unit: "cápsulas", route: "Via oral", frequency: "Com almoço", duration: null, notes: null, sortOrder: 0 }],
    phytotherapeutics: []
  };
  const presentedOnlySup = presentStructuredGuidance(onlySupplements);
  assert.equal(presentedOnlySup.hasAny, true);
  assert.equal(presentedOnlySup.hasRecommendations, false, "Recomendações vazias não devem gerar bloco");
  assert.equal(presentedOnlySup.hasSupplements, true, "Suplementação presente deve gerar bloco");
  assert.equal(presentedOnlySup.hasPhytotherapeutics, false, "Fitoterápicos vazios não devem gerar bloco");
  assert.equal(presentedOnlySup.supplements[0].doseFormatted, "2 cápsulas");
  console.log("✓ Teste 6: Supressão estrita de categorias vazias validada.");
}

// TEST 7: Strict Segregation of Internal Team Notes (Privacy Guard)
{
  const mockTree = {
    plan: { publicId: "plan-123" },
    version: {
      title: "Plano Hipertrofia",
      subtitle: "Fase 1",
      objective: "Ganho de massa magra",
      generalGuidance: "Manter hidratação",
      notes: "CONFIDENCIAL: Paciente tem histórico de má adesão a dietas anteriores.",
      guidanceJson: {
        schemaVersion: 1,
        recommendations: [{ id: "1", title: "Descanso", text: "8 horas de sono", sortOrder: 0 }],
        supplements: [],
        phytotherapeutics: []
      }
    },
    meals: [],
    dailyTotals: { calories: 2000, protein: 150, carbohydrate: 250, fat: 50, isPartial: false },
  };

  const presented = presentNutritionPlanFromVersionTree(mockTree, {
    consultancyName: "Consultoria Premium",
  });

  // CRITICAL CHECK: Internal notes MUST NEVER appear in student view or PDF presentation
  assert.equal(presented.notesForStudent, null, "Notas internas (version.notes) NUNCA podem ser expostas ao aluno");
  assert.ok(presented.guidance, "Guidance estruturado deve ser apresentado");
  assert.equal(presented.guidance.hasRecommendations, true);
  assert.equal(presented.guidance.hasSupplements, false);
  assert.equal(presented.guidance.hasPhytotherapeutics, false);
  console.log("✓ Teste 7: Segregação absoluta de notas clínicas internas (confidenciais) validada.");
}

// TEST 8: Clinical Authorship Authorization Guard
{
  // A consultancy admin WITHOUT NUTRITIONIST role must NOT be able to author clinical prescriptions
  const adminOnlyCtx = {
    userId: 1,
    membershipId: 10,
    consultancyId: 100,
    roles: ["CONSULTANCY_ADMIN"],
    isPlatformAdmin: false,
    canViewNutrition: true,
    canAuthorNutrition: false,
  };

  assert.throws(
    () => assertCanAuthorNutrition(adminOnlyCtx),
    (err) => {
      return err instanceof NutritionAuthorizationError && err.code === "UNAUTHORIZED_NUTRITION_AUTHOR";
    },
    "Administrador sem papel de NUTRICIONISTA não pode emitir prescrição clínica nutricional"
  );

  // A qualified nutritionist CAN author
  const nutritionistCtx = {
    userId: 2,
    membershipId: 20,
    consultancyId: 100,
    roles: ["NUTRITIONIST"],
    isPlatformAdmin: false,
    canViewNutrition: true,
    canAuthorNutrition: true,
  };

  assert.doesNotThrow(() => assertCanAuthorNutrition(nutritionistCtx));
  console.log("✓ Teste 8: Barreira estrita de autorização de autoria clínica (RBAC) validada.");
}

console.log("\n=== TODOS OS 8 TESTES DA ETAPA 7 PASSARAM COM SUCESSO! ===");
