/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * BASE BRASIL V1 — PERMANENT SEARCH DISCOVERY & RANKING REGRESSION SUITE
 *
 * Verifies exact mandatory test contracts:
 * 1. "Growth" -> Growth products only in top relevant branded matches
 * 2. "Growth whey" -> Growth whey products
 * 3. "Growth creatina" -> Growth creatine
 * 4. "whey" -> may include generic + branded whey
 * 5. "creatina" -> may include branded creatine + other valid creatine records
 * 6. "goma de tapioca" -> hydrated tapioca gum first
 * 7. "tapioca" -> broader tapioca results allowed
 * 8. "batata inglesa" -> correct potato foods (not batata doce)
 * 9. "batata doce" -> sweet potato, not batata inglesa
 */

import mysql from "mysql2/promise";
import {
  tokenizeSearchQuery,
  expandSearchTokensWithSynonyms,
  buildFoodSearchOrderClause,
} from "../lib/nutrition-v2/food-search.ts";

async function run() {
  console.log("=== INICIANDO SUÍTE DE TESTES: BASE BRASIL V1 SEARCH & RANKING ===");

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const connection = await pool.getConnection();

  try {
    const [dbRows] = await connection.query("SELECT DATABASE() AS db_name");
    console.log(`✓ Conectado ao banco: ${dbRows[0].db_name}`);

    async function searchFoods(query) {
      const tokens = tokenizeSearchQuery(query);
      const tokenGroups = expandSearchTokensWithSynonyms(tokens);
      const { orderClause, orderParams } = buildFoodSearchOrderClause(query, tokens, true);

      const targetCol = "COALESCE(f.normalized_display_name_pt_br, f.normalized_name)";
      const conditions = ["f.deleted_at IS NULL", "f.status = 'ACTIVE'"];
      const params = [];

      for (const group of tokenGroups) {
        const groupClauses = group.map(() => `(${targetCol} LIKE ? OR f.normalized_name LIKE ? OR f.brand LIKE ?)`);
        conditions.push(`(${groupClauses.join(" OR ")})`);
        for (const term of group) {
          params.push(`%${term}%`, `%${term}%`, `%${term}%`);
        }
      }

      const sql = `
        SELECT f.id, f.name, f.display_name_pt_br, f.brand, f.product_line,
               f.flavor_or_variant, f.source_type, f.source_key, f.calories_kcal,
               f.protein_g, f.carbohydrate_g, f.fat_g
        FROM nutrition_v2_foods f
        WHERE ${conditions.join(" AND ")}
        ${orderClause}
        LIMIT 10
      `;

      const [rows] = await connection.query(sql, [...params, ...orderParams]);
      return rows;
    }

    // 1. Basic Staples & Regional roots
    console.log("\nTest 1: Validando descoberta e ranking de alimentos básicos brasileiros...");

    const arrozResults = await searchFoods("arroz");
    if (arrozResults.length === 0) throw new Error("Busca 'arroz' não retornou resultados.");
    const topArroz = arrozResults[0].display_name_pt_br || arrozResults[0].name;
    if (!topArroz.toLowerCase().includes("arroz") || topArroz.toLowerCase().includes("preto")) {
      throw new Error(`Ranking de arroz inesperado: ${topArroz}`);
    }
    console.log(`  ✓ 'arroz' prioriza alimento básico: ${topArroz}`);

    const feijaoResults = await searchFoods("feijão");
    const feijaoSemAcento = await searchFoods("feijao");
    if (feijaoResults.length !== feijaoSemAcento.length) {
      throw new Error("Busca por feijão e feijao divergem em contagem.");
    }
    console.log(`  ✓ 'feijão' e 'feijao' são simétricos e retornam ${feijaoResults.length} registros`);

    const aipimResults = await searchFoods("aipim");
    const mandiocaResults = await searchFoods("mandioca");
    const macaxeiraResults = await searchFoods("macaxeira");
    if (aipimResults.length === 0 || mandiocaResults.length === 0 || macaxeiraResults.length === 0) {
      throw new Error("Sinônimos de mandioca/aipim/macaxeira falharam.");
    }
    console.log("  ✓ Raízes 'aipim', 'mandioca', 'macaxeira' descobrem com sucesso as preparações");

    // 2. Specific potato queries ("batata doce" vs "batata inglesa")
    console.log("\nTest 2: Validando especificidade de batata inglesa vs batata doce...");

    const batataDoce = await searchFoods("batata doce");
    if (batataDoce.length === 0) throw new Error("Busca 'batata doce' não encontrou registros.");
    const topBatataDoce = batataDoce[0].display_name_pt_br || batataDoce[0].name;
    if (!topBatataDoce.toLowerCase().includes("batata, doce") && !topBatataDoce.toLowerCase().includes("batata doce")) {
      throw new Error(`Ranking batata doce falhou: ${topBatataDoce}`);
    }
    // Negative assertion: top results must NOT contain batata inglesa
    for (const b of batataDoce.slice(0, 3)) {
      const name = (b.display_name_pt_br || b.name).toLowerCase();
      if (name.includes("inglesa")) {
        throw new Error(`Batata doce retornou batata inglesa indevidamente: ${name}`);
      }
    }
    console.log(`  ✓ 'batata doce' prioriza batata doce in natura: ${topBatataDoce}`);

    const batataInglesa = await searchFoods("batata inglesa");
    if (batataInglesa.length === 0) {
      throw new Error("Busca 'batata inglesa' não encontrou registros.");
    }
    // Must prioritize actual potato records relevant to batata inglesa, not batata doce
    const topInglesa = batataInglesa[0].display_name_pt_br || batataInglesa[0].name;
    if (!topInglesa.toLowerCase().includes("inglesa") && !topInglesa.toLowerCase().includes("russet")) {
      throw new Error(`Ranking batata inglesa inesperado: ${topInglesa}`);
    }
    for (const b of batataInglesa) {
      const name = (b.display_name_pt_br || b.name).toLowerCase();
      if (name.includes("doce")) {
        throw new Error(`Batata inglesa retornou batata doce indevidamente: ${name}`);
      }
    }
    console.log(`  ✓ 'batata inglesa' localiza ${batataInglesa.length} preparações específicas (sem contaminação por batata doce)`);

    const cuscuz = await searchFoods("cuscuz");
    const topCuscuz = cuscuz[0].display_name_pt_br || cuscuz[0].name;
    if (!topCuscuz.toLowerCase().includes("milho")) {
      throw new Error(`Cuscuz de milho deveria liderar sobre trigo: ${topCuscuz}`);
    }
    console.log(`  ✓ 'cuscuz' prioriza cuscuz brasileiro de milho: ${topCuscuz}`);

    // 3. Tapioca specificity: "goma de tapioca" vs "tapioca"
    console.log("\nTest 3: Validando especificidade de goma de tapioca vs tapioca ampla...");

    const tapioca = await searchFoods("tapioca");
    if (tapioca.length === 0) throw new Error("Busca 'tapioca' não localizou itens.");
    console.log(`  ✓ 'tapioca' permite resultados amplos: ${tapioca.length} itens encontrados (inclui preparações com manteiga/pudim)`);

    const gomaTapioca = await searchFoods("goma de tapioca");
    if (gomaTapioca.length === 0) {
      throw new Error("Busca 'goma de tapioca' não localizou itens.");
    }
    const topGoma = gomaTapioca[0];
    if (!topGoma.display_name_pt_br?.includes("Goma de Mandioca Hidratada") && !topGoma.name?.includes("Goma de Mandioca Hidratada")) {
      throw new Error(`'goma de tapioca' deveria priorizar goma hidratada. Encontrado: ${topGoma.display_name_pt_br || topGoma.name}`);
    }
    // Negative assertion: goma de tapioca must not treat tapioca com manteiga, tapioca granulada, generic polvilho as equivalent
    for (const g of gomaTapioca) {
      const name = (g.display_name_pt_br || g.name).toLowerCase();
      if (name.includes("manteiga")) {
        throw new Error(`'goma de tapioca' tratou tapioca com manteiga como equivalente!`);
      }
    }
    console.log(`  ✓ 'goma de tapioca' prioriza goma hidratada pura: ${topGoma.display_name_pt_br}`);

    // 4. Branded Supplements (Growth specificity, whey, creatina)
    console.log("\nTest 4: Validando busca e ranking de suplementos e marca Growth...");

    // Query: "Growth" -> Growth products ONLY in top matches
    const growthResults = await searchFoods("Growth");
    if (growthResults.length === 0) {
      throw new Error("Busca 'Growth' não retornou nenhum produto.");
    }
    for (const g of growthResults) {
      if (g.brand !== "Growth Supplements" && !(g.display_name_pt_br || g.name).toLowerCase().includes("growth")) {
        throw new Error(`Busca 'Growth' retornou produto não-Growth: ${g.display_name_pt_br || g.name} (brand: ${g.brand})`);
      }
    }
    console.log(`  ✓ 'Growth' retornou exclusivamente produtos oficiais da marca: ${growthResults.length} itens`);

    // Query: "Growth whey" -> Growth whey products (no Creatine, no non-Growth)
    const growthWhey = await searchFoods("Growth whey");
    if (growthWhey.length === 0) throw new Error("Busca 'Growth whey' não retornou resultados.");
    for (const gw of growthWhey) {
      if (gw.brand !== "Growth Supplements") {
        throw new Error(`'Growth whey' retornou marca não-Growth: ${gw.brand}`);
      }
      if (!gw.product_line.toLowerCase().includes("whey")) {
        throw new Error(`'Growth whey' retornou produto não-whey: ${gw.product_line}`);
      }
    }
    console.log(`  ✓ 'Growth whey' retornou apenas wheys da Growth: ${growthWhey.length} itens`);

    // Query: "Growth creatina" -> Growth creatine only
    const growthCreatina = await searchFoods("Growth creatina");
    if (growthCreatina.length === 0) throw new Error("Busca 'Growth creatina' não retornou resultados.");
    const topCreatina = growthCreatina[0];
    if (topCreatina.brand !== "Growth Supplements" || !topCreatina.product_line.toLowerCase().includes("creatina")) {
      throw new Error(`'Growth creatina' falhou em retornar Creatina da Growth: ${topCreatina.display_name_pt_br}`);
    }
    console.log(`  ✓ 'Growth creatina' retorna Creatina Monohidratada 100% Pura: ${topCreatina.display_name_pt_br}`);

    // Query: "whey" -> may include generic + branded whey
    const genericWhey = await searchFoods("whey");
    if (genericWhey.length === 0) throw new Error("Busca 'whey' não retornou itens.");
    const hasBrandedWhey = genericWhey.some((w) => w.brand === "Growth Supplements");
    const hasGenericWhey = genericWhey.some((w) => !w.brand);
    if (!hasBrandedWhey || !hasGenericWhey) {
      throw new Error(`Busca 'whey' deve permitir genéricos e branded. Encontrado: branded=${hasBrandedWhey}, genérico=${hasGenericWhey}`);
    }
    console.log(`  ✓ 'whey' inclui genéricos (soro de leite) e branded (Growth): ${genericWhey.length} itens`);

    // Query: "creatina" -> may include branded creatine + other valid creatine records
    const creatinaResults = await searchFoods("creatina");
    if (creatinaResults.length === 0) {
      throw new Error("Busca 'creatina' não retornou nenhum registro.");
    }
    const hasGrowthInCreatina = creatinaResults.some((c) => c.brand === "Growth Supplements");
    if (!hasGrowthInCreatina) {
      throw new Error("Creatina da Growth não apareceu nos resultados de creatina.");
    }
    console.log(`  ✓ 'creatina' localiza Creatina Monohidratada 100% Pura`);

    // 5. Negative assertions / Honest reporting of uncataloged items
    console.log("\nTest 5: Validando integridade contra dados falsos ou não verificados...");
    const carneDeSol = await searchFoods("carne de sol");
    const fakeMatches = carneDeSol.filter((c) => (c.display_name_pt_br || c.name).toLowerCase().includes("charque"));
    if (fakeMatches.length > 0) {
      throw new Error("Alerta de equivalência incorreta: carne de sol colapsou para charque!");
    }
    console.log("  ✓ 'carne de sol' não colapsa indevidamente para 'charque' (preservação estrita)");

    console.log("\n=======================================================");
    console.log("BASE BRASIL V1 SEARCH REGRESSION: TODOS OS TESTES PASSARAM!");
    console.log("=======================================================\n");
  } finally {
    connection.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
