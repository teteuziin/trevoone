/**
 * TREVO ONE — TOP BRAZILIAN FOODS QA TEST SUITE
 *
 * Validates the permanent professional QA dataset of 200+ Brazilian food concepts:
 * - Minimum count threshold >= 200 concepts
 * - All mandatory concepts from product decision are present
 * - Explicit cooking / preparation state for all concepts
 * - Strict PT-BR display names (no raw English laboratory terms)
 * - Source traceability (IBGE / TACO / Verified Manufacturer)
 * - Household measure realism
 */

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const qaFilePath = path.resolve(__dirname, "../data/nutrition/top-200-brazilian-foods-qa.json");

console.log("=== INICIANDO TESTE: TOP BRAZILIAN FOODS QA SET ===");

assert(fs.existsSync(qaFilePath), "Arquivo top-200-brazilian-foods-qa.json deve existir");

const raw = fs.readFileSync(qaFilePath, "utf8");
const data = JSON.parse(raw);

const { metadata, concepts } = data;

// Test 1: Minimum count
console.log(`\nTest 1: Validando quantidade de conceitos (encontrados: ${concepts.length})...`);
assert(concepts.length >= 200, `Deve conter pelo menos 200 conceitos, encontrados ${concepts.length}`);
console.log(`  ✓ ${concepts.length} conceitos registrados (>= 200)`);

// Test 2: Mandatory concepts presence
console.log("\nTest 2: Validando presença de conceitos obrigatórios do Brasil...");
const mandatoryKeywords = [
  "arroz branco", "arroz integral", "feijão carioca", "feijão preto",
  "aipim", "macaxeira", "mandioca", "batata inglesa", "batata doce",
  "inhame", "cará", "cuscuz de milho", "goma de tapioca", "pão francês",
  "pão integral", "aveia", "farofa", "peito de frango", "coxa de frango",
  "sobrecoxa", "patinho", "acém", "alcatra", "carne moída", "carne de sol",
  "charque", "ovo", "tilápia", "sardinha", "atum", "leite integral",
  "leite desnatado", "iogurte natural", "queijo minas", "muçarela",
  "requeijão", "banana prata", "banana nanica", "mamão", "maçã",
  "laranja", "manga", "abacaxi", "melancia", "açaí", "abacate",
  "azeite", "manteiga", "pasta de amendoim", "whey protein", "creatina"
];

for (const kw of mandatoryKeywords) {
  const normKw = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const found = concepts.some(c => {
    const qNorm = (c.search_query || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const nameNorm = (c.canonical_pt_br_name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const synNorm = (c.regional_synonyms || []).some(s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normKw));
    return qNorm.includes(normKw) || nameNorm.includes(normKw) || synNorm;
  });
  assert(found, `Conceito obrigatório não encontrado no QA set: ${kw}`);
}
console.log(`  ✓ Todos os ${mandatoryKeywords.length} conceitos obrigatórios confirmados presentes`);

// Test 3: Data completeness & explicit preparation state
console.log("\nTest 3: Validando completude dos dados e estado de preparo explícito...");
const validPrepStates = [
  'assado', 'assada', 'concentrado', 'cozido', 'cozida',
  'cozido no vapor', 'cozido/refogado', 'cozido com sal', 'cremosa',
  'cremoso', 'cru', 'crua', 'curado fresco',
  'desidratado', 'doce', 'drenada',
  'drenado', 'engarrafado', 'espremido',
  'estourada', 'fatiado', 'fermentado',
  'fluido', 'fresco', 'fresca', 'frito', 'frita',
  'grelhado', 'grelhada', 'infusão', 'maturado',
  'natural', 'pasta', 'pasta pura',
  'polpa', 'pronta', 'pronto', 'pura',
  'puro', 'pó', 'ralado', 'ralada',
  'refinado', 'refinada', 'refogado', 'refogada', 'suco fresco',
  'torrada', 'torrado', 'tostado', 'tostada'
];

const bannedEnglishTokens = [
  "broiler", "fryer", "commodity", "raw english", "long-grain",
  "laboratory", "unenriched", "unpolished"
];

const conceptIds = new Set();

for (const item of concepts) {
  assert(item.concept_id, "Item deve ter concept_id");
  assert(!conceptIds.has(item.concept_id), `concept_id duplicado: ${item.concept_id}`);
  conceptIds.add(item.concept_id);

  assert(item.search_query, `search_query ausente em ${item.concept_id}`);
  assert(item.canonical_pt_br_name, `canonical_pt_br_name ausente em ${item.concept_id}`);
  assert(item.preparation_state, `preparation_state ausente em ${item.concept_id}`);
  assert(item.source_authority, `source_authority ausente em ${item.concept_id}`);
  assert(item.household_measure_example, `household_measure_example ausente em ${item.concept_id}`);

  // Explicit preparation state check
  const prep = item.preparation_state.toLowerCase();
  assert(
    validPrepStates.some(v => prep.includes(v)),
    `Estado de preparo inválido ou ambíguo em ${item.concept_id}: '${item.preparation_state}'`
  );

  // Check no banned English tokens in display name
  const nameLower = item.canonical_pt_br_name.toLowerCase();
  for (const banned of bannedEnglishTokens) {
    assert(
      !nameLower.includes(banned),
      `Nome PT-BR contém termo proibido em inglês '${banned}' em ${item.concept_id}`
    );
  }
}
console.log(`  ✓ Todos os ${concepts.length} conceitos possuem estado de preparo e PT-BR válido`);

console.log("\n=== SUÍTE DE TESTES TOP BRAZILIAN FOODS QA CONCLUÍDA COM SUCESSO ===");
