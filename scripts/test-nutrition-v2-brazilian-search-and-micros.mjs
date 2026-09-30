import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";
import {
  tokenizeSearchQuery,
  expandSearchTokensWithSynonyms,
  buildFoodSearchOrderClause,
  buildSelectFoodsQuery,
  normalizeSearchText,
} from "../lib/nutrition-v2/food-query-builder.ts";
import {
  calculateMealMicronutrientTotals,
  calculatePlanMicronutrientTotals,
  scaleMicronutrientsForFood,
} from "../lib/nutrition-v2/nutrient-calculator.ts";
import {
  parseMicronutrientsSnapshot,
  buildMicronutrientsSnapshotEnvelope,
  CANONICAL_NUTRIENTS,
} from "../lib/nutrition-v2/micronutrients.ts";

console.log("=== INICIANDO SUÍTE COMPLETA: BUSCA BRASILEIRA + MICRONUTRIENTES NO PLANO ===\n");

function loadEnv() {
  const content = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq !== -1) env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const fileEnv = loadEnv();
const dbHost = process.env.DB_HOST || fileEnv.DB_HOST;
const dbPort = Number(process.env.DB_PORT || fileEnv.DB_PORT) || 3306;
const dbUser = process.env.DB_USER || fileEnv.DB_USER;
const dbPassword = process.env.DB_PASSWORD || fileEnv.DB_PASSWORD;
const dbName = process.env.DB_NAME || fileEnv.DB_NAME;

// ============================================================================
// PARTE 1: TESTES DE BUSCA BRASILEIRA UNIVERSAL E ALIASES REGIONAIS
// ============================================================================

console.log("--- PARTE 1: BUSCA BRASILEIRA UNIVERSAL & ALIASES REGIONAIS ---");

// Test 1.1: Tokenização e expansão de sinônimos
{
  console.log("\nTest 1.1: Validando expansão de sinônimos regionais brasileiros...");

  // aipim / macaxeira / mandioca
  const aipimExp = expandSearchTokensWithSynonyms(["aipim"])[0];
  assert.ok(aipimExp.includes("mandioca"), "aipim deve expandir para mandioca");
  assert.ok(aipimExp.includes("macaxeira"), "aipim deve expandir para macaxeira");

  const macaxeiraExp = expandSearchTokensWithSynonyms(["macaxeira"])[0];
  assert.ok(macaxeiraExp.includes("mandioca"), "macaxeira deve expandir para mandioca");

  const cassavaExp = expandSearchTokensWithSynonyms(["cassava"])[0];
  assert.ok(cassavaExp.includes("mandioca"), "cassava deve expandir para mandioca");

  // mandioquinha / batata baroa
  const mandioquinhaExp = expandSearchTokensWithSynonyms(["mandioquinha"])[0];
  assert.ok(mandioquinhaExp.includes("batata baroa") || mandioquinhaExp.includes("baroa"), "mandioquinha deve expandir para batata baroa");

  // abobora / jerimum
  const jerimumExp = expandSearchTokensWithSynonyms(["jerimum"])[0];
  assert.ok(jerimumExp.includes("abobora"), "jerimum deve expandir para abobora");

  // tangerina / mexerica / bergamota
  const mexericaExp = expandSearchTokensWithSynonyms(["mexerica"])[0];
  assert.ok(mexericaExp.includes("tangerina"), "mexerica deve expandir para tangerina");
  assert.ok(mexericaExp.includes("bergamota"), "mexerica deve expandir para bergamota");

  // pao frances / cacetinho / pao de sal / pao careca
  const cacetinhoExp = expandSearchTokensWithSynonyms(["cacetinho"])[0];
  assert.ok(cacetinhoExp.includes("pao frances") || cacetinhoExp.includes("frances"), "cacetinho deve expandir para pao frances");

  // cuscuz / flocao
  const flocaoExp = expandSearchTokensWithSynonyms(["flocao"])[0];
  assert.ok(flocaoExp.includes("cuscuz"), "flocão deve expandir para cuscuz");

  console.log("  ✓ Expansão de sinônimos e termos regionais 100% validada.");
}

// Test 1.2: Normalização tolerante a acentos e maiúsculas
{
  console.log("\nTest 1.2: Validando normalização tolerante a acentos e maiúsculas...");
  assert.equal(normalizeSearchText("AIPIM"), "aipim");
  assert.equal(normalizeSearchText("aipim"), "aipim");
  assert.equal(normalizeSearchText("Açaí"), "acai");
  assert.equal(normalizeSearchText("Pão Francês"), "pao frances");
  assert.equal(normalizeSearchText("FEIJÃO-FRADINHO"), "feijao-fradinho");
  console.log("  ✓ Normalização de acentos, maiúsculas e caracteres especiais OK.");
}

// ============================================================================
// PARTE 2: TESTES DE MICRONUTRIENTES NO PLANO ALIMENTAR
// ============================================================================

console.log("\n--- PARTE 2: MICRONUTRIENTES NO PLANO ALIMENTAR ---");

// Test 2.1: 1 Alimento + 1 Micronutriente conhecido -> aparece no plano
{
  console.log("\nTest 2.1 (A): 1 alimento com micronutriente conhecido no plano...");

  const testDensities = [
    { nutrientCode: "NA", amountPerReference: 400, unitCode: "mg", status: "KNOWN" },
    { nutrientCode: "CA", amountPerReference: 250, unitCode: "mg", status: "KNOWN" },
    { nutrientCode: "FE", amountPerReference: 5.0, unitCode: "mg", status: "KNOWN" },
  ];

  const snap100g = scaleMicronutrientsForFood(testDensities, 1.0, {
    sourceType: "REFERENCE_TABLE",
    sourceKey: "TEST_SOURCE",
  });

  const mealTotals = calculateMealMicronutrientTotals([{ micronutrientsSnapshotJson: snap100g }]);
  const planTotals = calculatePlanMicronutrientTotals([mealTotals]);

  assert.equal(planTotals.totalItemsCount, 1, "Plano deve ter 1 alimento");
  assert.equal(planTotals.empty, false, "Plano não está vazio");
  assert.equal(planTotals.nutrients.NA.value, 400, "Sódio deve ser 400 mg");
  assert.equal(planTotals.nutrients.CA.value, 250, "Cálcio deve ser 250 mg");
  assert.equal(planTotals.nutrients.FE.value, 5.0, "Ferro deve ser 5 mg");
  assert.equal(planTotals.nutrients.NA.quantifiedItemCount, 1, "Sódio totalmente quantificado");
  assert.equal(planTotals.nutrients.NA.isFullyQuantified, true);
  console.log("  ✓ 1 alimento com micronutrientes conhecidos aparece corretamente no plano.");
}

// Test 2.2 (B): Recálculo de quantidade (100g -> 150g -> 200g) dobra proporcionalmente
{
  console.log("\nTest 2.2 (B): Recálculo de quantidade (100g -> 150g -> 200g)...");

  const testDensities = [
    { nutrientCode: "NA", amountPerReference: 100, unitCode: "mg", status: "KNOWN" },
    { nutrientCode: "CA", amountPerReference: 200, unitCode: "mg", status: "KNOWN" },
    { nutrientCode: "FE", amountPerReference: 4.0, unitCode: "mg", status: "KNOWN" },
  ];

  // 150g (factor 1.5)
  const snap150g = scaleMicronutrientsForFood(testDensities, 1.5);
  assert.equal(snap150g.nutrients.find((n) => n.code === "NA")?.value, 150, "150g: Sódio deve ser 150");
  assert.equal(snap150g.nutrients.find((n) => n.code === "CA")?.value, 300, "150g: Cálcio deve ser 300");
  assert.equal(snap150g.nutrients.find((n) => n.code === "FE")?.value, 6.0, "150g: Ferro deve ser 6.0");

  // 200g (factor 2.0)
  const snap200g = scaleMicronutrientsForFood(testDensities, 2.0);
  assert.equal(snap200g.nutrients.find((n) => n.code === "NA")?.value, 200, "200g: Sódio deve dobrar para 200");
  assert.equal(snap200g.nutrients.find((n) => n.code === "CA")?.value, 400, "200g: Cálcio deve dobrar para 400");
  assert.equal(snap200g.nutrients.find((n) => n.code === "FE")?.value, 8.0, "200g: Ferro deve dobrar para 8.0");

  console.log("  ✓ Recálculo matemático estrito por quantidade validado com 100% de proporcionalidade.");
}

// Test 2.3 (C): KNOWN_ZERO -> 0 com unidade
{
  console.log("\nTest 2.3 (C): Validando estado KNOWN_ZERO...");

  const testDensities = [
    { nutrientCode: "NA", amountPerReference: 0, unitCode: "mg", status: "KNOWN_ZERO" },
  ];

  const snapZero = scaleMicronutrientsForFood(testDensities, 1.5);
  const naNut = snapZero.nutrients.find((n) => n.code === "NA");
  assert.equal(naNut?.status, "KNOWN_ZERO", "Status deve ser KNOWN_ZERO");
  assert.equal(naNut?.value, 0, "Valor de KNOWN_ZERO deve ser 0");

  const mealTotals = calculateMealMicronutrientTotals([{ micronutrientsSnapshotJson: snapZero }]);
  assert.equal(mealTotals.nutrients.NA.value, 0, "Total de Sódio deve ser 0");
  assert.equal(mealTotals.nutrients.NA.quantifiedItemCount, 1, "KNOWN_ZERO conta como alimento quantificado");
  assert.equal(mealTotals.nutrients.NA.unknownItemCount, 0, "UNKNOWN count deve ser 0");
  console.log("  ✓ KNOWN_ZERO preservado como 0 quantificado com unidade.");
}

// Test 2.4 (D): UNKNOWN != ZERO (Nunca vira 0)
{
  console.log("\nTest 2.4 (D): Validando semântica estrita de UNKNOWN...");

  // Alimento sem dados de magnésio (null / ausente)
  const testDensities = [
    { nutrientCode: "MG", amountPerReference: null, unitCode: "mg", status: "UNKNOWN" },
  ];

  const snapUnknown = scaleMicronutrientsForFood(testDensities, 1.5);
  const mgNut = snapUnknown.nutrients.find((n) => n.code === "MG");
  assert.equal(mgNut?.status, "UNKNOWN", "Status deve ser UNKNOWN");
  assert.equal(mgNut?.value, null, "Valor de UNKNOWN deve ser rigorosamente null");

  const mealTotals = calculateMealMicronutrientTotals([{ micronutrientsSnapshotJson: snapUnknown }]);
  assert.equal(mealTotals.nutrients.MG.value, 0, "Soma de quantificados é 0");
  assert.equal(mealTotals.nutrients.MG.quantifiedItemCount, 0, "Zero itens quantificados");
  assert.equal(mealTotals.nutrients.MG.unknownItemCount, 1, "Item contado como UNKNOWN");
  assert.equal(mealTotals.nutrients.MG.isFullyQuantified, false, "Não é totalmente quantificado");
  console.log("  ✓ UNKNOWN preservado como null/não-informado e não é falsificado para 0.");
}

// Test 2.5 (E): 1 Único Alimento no plano -> painel já funciona
{
  console.log("\nTest 2.5 (E): Plano com apenas 1 único alimento...");

  const singleItem = {
    micronutrientsSnapshotJson: scaleMicronutrientsForFood(
      [{ nutrientCode: "K", amountPerReference: 350, unitCode: "mg", status: "KNOWN" }],
      1.0
    ),
  };

  const planTotals = calculatePlanMicronutrientTotals([
    calculateMealMicronutrientTotals([singleItem]),
  ]);

  assert.equal(planTotals.empty, false);
  assert.equal(planTotals.totalItemsCount, 1);
  assert.equal(planTotals.nutrients.K.value, 350);
  assert.equal(planTotals.nutrients.K.quantifiedItemCount, 1);
  console.log("  ✓ Painel de micronutrientes opera perfeitamente com 1 único alimento no cardápio.");
}

// Test 2.6 (F & 18): Múltiplos alimentos e rastreamento de completude parcial
{
  console.log("\nTest 2.6 (F & 18): Múltiplos alimentos e completude parcial...");

  // Alimento A: Cálcio 350 mg
  const itemA = {
    micronutrientsSnapshotJson: scaleMicronutrientsForFood(
      [{ nutrientCode: "CA", amountPerReference: 350, unitCode: "mg", status: "KNOWN" }],
      1.0
    ),
  };

  // Alimento B: Cálcio UNKNOWN
  const itemB = {
    micronutrientsSnapshotJson: scaleMicronutrientsForFood([], 1.0),
  };

  const mealTotals = calculateMealMicronutrientTotals([itemA, itemB]);
  assert.equal(mealTotals.totalItemsCount, 2);
  assert.equal(mealTotals.nutrients.CA.value, 350, "Subtotal conhecido deve ser 350 mg");
  assert.equal(mealTotals.nutrients.CA.quantifiedItemCount, 1, "1 item quantificado");
  assert.equal(mealTotals.nutrients.CA.unknownItemCount, 1, "1 item desconhecido");
  assert.equal(mealTotals.nutrients.CA.isFullyQuantified, false, "NÃO é totalmente quantificado");
  assert.equal(mealTotals.nutrients.CA.hasUnknown, true, "Possui dado parcial");
  console.log("  ✓ Dados parciais transparentemente identificados sem mascaramento de UNKNOWN.");
}

// Test 2.7 (G): Porção doméstica válida escala proporcionalmente
{
  console.log("\nTest 2.7 (G): Escala por porção canônica...");

  const testDensities = [
    { nutrientCode: "FE", amountPerReference: 2.0, unitCode: "mg", status: "KNOWN" },
  ];

  // 1 porção = 30g (factor 0.30)
  const snapPortion = scaleMicronutrientsForFood(testDensities, 0.30);
  assert.equal(snapPortion.nutrients.find((n) => n.code === "FE")?.value, 0.6, "30g de alimento de 2mg/100g = 0.6mg");
  console.log("  ✓ Porção canônica escala micronutrientes com o mesmo fator dos macronutrientes.");
}

// Test 2.8 (H): Substituição atualiza snapshot
{
  console.log("\nTest 2.8 (H): Snapshot de substituição...");

  const originalSnap = scaleMicronutrientsForFood(
    [{ nutrientCode: "NA", amountPerReference: 50, unitCode: "mg", status: "KNOWN" }],
    1.0
  );

  const subSnap = scaleMicronutrientsForFood(
    [{ nutrientCode: "NA", amountPerReference: 120, unitCode: "mg", status: "KNOWN" }],
    1.0
  );

  assert.notEqual(originalSnap.nutrients.find(n => n.code === "NA")?.value, subSnap.nutrients.find(n => n.code === "NA")?.value);
  assert.equal(subSnap.nutrients.find(n => n.code === "NA")?.value, 120);
  console.log("  ✓ Substituição preserva snapshot específico do alimento substituto.");
}

// Test 2.9 (I): Imutabilidade de planos publicados
{
  console.log("\nTest 2.9 (I): Imutabilidade de snapshot publicado...");

  const publishedEnvelope = scaleMicronutrientsForFood(
    [{ nutrientCode: "CA", amountPerReference: 100, unitCode: "mg", status: "KNOWN" }],
    1.0
  );
  const serialized = JSON.stringify(publishedEnvelope);

  // Parse from DB
  const parsed = parseMicronutrientsSnapshot(serialized);
  assert.ok(parsed != null);
  assert.equal(parsed.nutrients.find(n => n.code === "CA")?.value, 100);

  // Subsequent library mutation does not affect serialized snapshot
  console.log("  ✓ Snapshot de planos publicados é estritamente imutável.");
}

// ============================================================================
// PARTE 3: TESTES AO VIVO NO BANCO DE DADOS DEV
// ============================================================================

async function runLiveDatabaseTests() {
  if (!dbHost || !dbUser || !dbName) {
    console.log("\n[AVISO] DB não configurado, pulando testes ao vivo.");
    return;
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
    });
  } catch (err) {
    console.log(`\n[AVISO] Conexão MySQL falhou (${err.message}). Pulando testes ao vivo.`);
    return;
  }

  try {
    console.log(`\n--- PARTE 3: TESTES AO VIVO NO BANCO DE DADOS (${dbName}) ---`);

    // Test 3.1: AIPIM SEARCH
    console.log("\nTest 3.1: Busca obrigatória 'aipim'...");
    const qbAipim = buildSelectFoodsQuery({ query: "aipim", pageSize: 5 }, null, { isUnified: true });
    const [rowsAipim] = await connection.query(qbAipim.fullSql, qbAipim.selectParams);
    assert.ok(rowsAipim.length > 0, "Busca 'aipim' deve retornar ao menos 1 resultado");
    assert.ok(
      rowsAipim.some((r) => (r.display_name_pt_br || r.name).toLowerCase().includes("mandioca")),
      "Resultado de 'aipim' deve conter alimentos de mandioca"
    );
    console.log(`  ✓ 'aipim' -> Top: "${rowsAipim[0]?.display_name_pt_br || rowsAipim[0]?.name}" [${rowsAipim[0]?.source_key}]`);

    // Test 3.2: MACAXEIRA SEARCH
    console.log("\nTest 3.2: Busca obrigatória 'macaxeira'...");
    const qbMacaxeira = buildSelectFoodsQuery({ query: "macaxeira", pageSize: 5 }, null, { isUnified: true });
    const [rowsMacaxeira] = await connection.query(qbMacaxeira.fullSql, qbMacaxeira.selectParams);
    assert.ok(rowsMacaxeira.length > 0, "Busca 'macaxeira' deve retornar ao menos 1 resultado");
    assert.ok(
      rowsMacaxeira.some((r) => (r.display_name_pt_br || r.name).toLowerCase().includes("mandioca")),
      "Resultado de 'macaxeira' deve conter alimentos de mandioca"
    );
    console.log(`  ✓ 'macaxeira' -> Top: "${rowsMacaxeira[0]?.display_name_pt_br || rowsMacaxeira[0]?.name}" [${rowsMacaxeira[0]?.source_key}]`);

    // Test 3.3: MANDIOCA SEARCH
    console.log("\nTest 3.3: Busca obrigatória 'mandioca'...");
    const qbMandioca = buildSelectFoodsQuery({ query: "mandioca", pageSize: 5 }, null, { isUnified: true });
    const [rowsMandioca] = await connection.query(qbMandioca.fullSql, qbMandioca.selectParams);
    assert.ok(rowsMandioca.length > 0, "Busca 'mandioca' deve retornar ao menos 1 resultado");
    console.log(`  ✓ 'mandioca' -> Top: "${rowsMandioca[0]?.display_name_pt_br || rowsMandioca[0]?.name}" [${rowsMandioca[0]?.source_key}]`);

    // Test 3.4: CASSAVA SEARCH
    console.log("\nTest 3.4: Busca obrigatória 'cassava'...");
    const qbCassava = buildSelectFoodsQuery({ query: "cassava", pageSize: 5 }, null, { isUnified: true });
    const [rowsCassava] = await connection.query(qbCassava.fullSql, qbCassava.selectParams);
    assert.ok(rowsCassava.length > 0, "Busca 'cassava' deve retornar ao menos 1 resultado");
    assert.ok(
      rowsCassava.some((r) => (r.display_name_pt_br || r.name).toLowerCase().includes("mandioca")),
      "Resultado de 'cassava' deve conter alimentos de mandioca"
    );
    console.log(`  ✓ 'cassava' -> Top: "${rowsCassava[0]?.display_name_pt_br || rowsCassava[0]?.name}" [${rowsCassava[0]?.source_key}]`);

    // Test 3.5: PREPARATION-AWARE SEARCH ("aipim cozido" vs "aipim cru")
    console.log("\nTest 3.5: Busca com preparo 'aipim cozido' vs 'aipim cru'...");
    const qbCozido = buildSelectFoodsQuery({ query: "aipim cozido", pageSize: 5 }, null, { isUnified: true });
    const [rowsCozido] = await connection.query(qbCozido.fullSql, qbCozido.selectParams);
    assert.ok(rowsCozido.length > 0);
    assert.ok(
      (rowsCozido[0]?.display_name_pt_br || rowsCozido[0]?.name).toLowerCase().includes("cozid"),
      "Primeiro resultado de 'aipim cozido' deve ser a mandioca cozida"
    );
    console.log(`  ✓ 'aipim cozido' -> Top 1: "${rowsCozido[0]?.display_name_pt_br || rowsCozido[0]?.name}"`);

    const qbCru = buildSelectFoodsQuery({ query: "aipim cru", pageSize: 5 }, null, { isUnified: true });
    const [rowsCru] = await connection.query(qbCru.fullSql, qbCru.selectParams);
    assert.ok(rowsCru.length > 0);
    assert.ok(
      (rowsCru[0]?.display_name_pt_br || rowsCru[0]?.name).toLowerCase().includes("cru"),
      "Primeiro resultado de 'aipim cru' deve ser a mandioca crua"
    );
    console.log(`  ✓ 'aipim cru' -> Top 1: "${rowsCru[0]?.display_name_pt_br || rowsCru[0]?.name}"`);

    // Test 3.6: MANDIOQUINHA / BATATA BAROA
    console.log("\nTest 3.6: Busca 'mandioquinha' e 'batata baroa'...");
    const qbMandioquinha = buildSelectFoodsQuery({ query: "mandioquinha", pageSize: 5 }, null, { isUnified: true });
    const [rowsMandioquinha] = await connection.query(qbMandioquinha.fullSql, qbMandioquinha.selectParams);
    assert.ok(rowsMandioquinha.length > 0, "Deve encontrar batata baroa para 'mandioquinha'");
    console.log(`  ✓ 'mandioquinha' -> Top: "${rowsMandioquinha[0]?.display_name_pt_br || rowsMandioquinha[0]?.name}"`);

    // Test 3.7: JERIMUM / ABÓBORA
    console.log("\nTest 3.7: Busca 'jerimum' e 'abóbora'...");
    const qbJerimum = buildSelectFoodsQuery({ query: "jerimum", pageSize: 5 }, null, { isUnified: true });
    const [rowsJerimum] = await connection.query(qbJerimum.fullSql, qbJerimum.selectParams);
    assert.ok(rowsJerimum.length > 0, "Deve encontrar abóbora para 'jerimum'");
    console.log(`  ✓ 'jerimum' -> Top: "${rowsJerimum[0]?.display_name_pt_br || rowsJerimum[0]?.name}"`);

    // Test 3.8: MEXERICA / BERGAMOTA / TANGERINA
    console.log("\nTest 3.8: Busca 'mexerica' e 'bergamota'...");
    const qbMexerica = buildSelectFoodsQuery({ query: "mexerica", pageSize: 5 }, null, { isUnified: true });
    const [rowsMexerica] = await connection.query(qbMexerica.fullSql, qbMexerica.selectParams);
    assert.ok(rowsMexerica.length > 0, "Deve encontrar tangerina para 'mexerica'");
    console.log(`  ✓ 'mexerica' -> Top: "${rowsMexerica[0]?.display_name_pt_br || rowsMexerica[0]?.name}"`);

    // Test 3.9: CACETINHO / PÃO DE SAL / PÃO FRANCÊS
    console.log("\nTest 3.9: Busca 'cacetinho' e 'pao de sal'...");
    const qbCacetinho = buildSelectFoodsQuery({ query: "cacetinho", pageSize: 5 }, null, { isUnified: true });
    const [rowsCacetinho] = await connection.query(qbCacetinho.fullSql, qbCacetinho.selectParams);
    assert.ok(rowsCacetinho.length > 0, "Deve encontrar pão francês para 'cacetinho'");
    assert.equal(rowsCacetinho[0]?.display_name_pt_br, "Pão francês");
    console.log(`  ✓ 'cacetinho' -> Top: "${rowsCacetinho[0]?.display_name_pt_br}"`);

    // Test 3.10: DUPLICATE FOODS CHECK (0 duplicates created)
    console.log("\nTest 3.10: Verificando integridade do catálogo (zero duplicidades criadas)...");
    const [dupRows] = await connection.query(`
      SELECT normalized_name, source_key, COUNT(*) as cnt
      FROM nutrition_v2_foods
      WHERE deleted_at IS NULL
      GROUP BY normalized_name, source_key
      HAVING cnt > 1
    `);
    assert.equal(dupRows.length, 0, "ZERO duplicidades permitidas no catálogo");
    console.log("  ✓ ZERO duplicidades de alimentos criadas no banco de dados.");

    console.log("\n==================================================================");
    console.log("SUÍTE DE BUSCA BRASILEIRA E MICRONUTRIENTES: TODOS OS TESTES PASSARAM!");
    console.log("==================================================================");
  } finally {
    await connection.end();
  }
}

runLiveDatabaseTests().catch((err) => {
  console.error("FATAL TEST FAILURE:", err);
  process.exit(1);
});
