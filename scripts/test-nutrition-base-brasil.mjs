/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * BASE BRASIL V1 — PERMANENT SEARCH DISCOVERY & RANKING REGRESSION SUITE
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
        const groupClauses = group.map(() => `(${targetCol} LIKE ? OR f.normalized_name LIKE ?)`);
        conditions.push(`(${groupClauses.join(" OR ")})`);
        for (const term of group) {
          params.push(`%${term}%`, `%${term}%`);
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
    console.log(`  ✓ Raízes 'aipim', 'mandioca', 'macaxeira' descobrem com sucesso as preparações`);

    const batataDoce = await searchFoods("batata doce");
    const topBatataDoce = batataDoce[0].display_name_pt_br || batataDoce[0].name;
    if (!topBatataDoce.toLowerCase().includes("batata, doce")) {
      throw new Error(`Ranking batata doce falhou: ${topBatataDoce}`);
    }
    console.log(`  ✓ 'batata doce' prioriza batata doce in natura: ${topBatataDoce}`);

    const batataInglesa = await searchFoods("batata inglesa");
    if (batataInglesa.length === 0) {
      throw new Error("Busca 'batata inglesa' não encontrou registros.");
    }
    console.log(`  ✓ 'batata inglesa' localiza ${batataInglesa.length} preparações`);

    const cuscuz = await searchFoods("cuscuz");
    const topCuscuz = cuscuz[0].display_name_pt_br || cuscuz[0].name;
    if (!topCuscuz.toLowerCase().includes("milho")) {
      throw new Error(`Cuscuz de milho deveria liderar sobre trigo: ${topCuscuz}`);
    }
    console.log(`  ✓ 'cuscuz' prioriza cuscuz brasileiro de milho: ${topCuscuz}`);

    const tapioca = await searchFoods("tapioca");
    const gomaTapioca = await searchFoods("goma de tapioca");
    if (gomaTapioca.length === 0) {
      throw new Error("Busca 'goma de tapioca' não localizou itens.");
    }
    console.log(`  ✓ 'goma de tapioca' encontra o item verificado: ${gomaTapioca[0].display_name_pt_br}`);

    // 2. Verified Branded Supplements (Growth)
    console.log("\nTest 2: Validando busca e ranking de produtos Growth Supplements...");

    const growthResults = await searchFoods("Growth");
    if (growthResults.length < 7) {
      throw new Error(`Esperado pelo menos 7 produtos Growth, encontrado: ${growthResults.length}`);
    }
    console.log(`  ✓ 'Growth' retornou ${growthResults.length} produtos oficiais da marca`);

    const wheyGrowth = await searchFoods("whey Growth");
    if (wheyGrowth.length === 0 || !wheyGrowth[0].brand?.includes("Growth")) {
      throw new Error("Busca 'whey Growth' falhou em priorizar produtos Growth.");
    }
    console.log(`  ✓ 'whey Growth' prioriza: ${wheyGrowth[0].display_name_pt_br}`);

    const creatinaResults = await searchFoods("creatina");
    if (creatinaResults.length === 0) {
      throw new Error("Busca 'creatina' não retornou nenhum registro.");
    }
    const hasGrowthCreatina = creatinaResults.some((c) => c.display_name_pt_br?.includes("Growth"));
    if (!hasGrowthCreatina) {
      throw new Error("Creatina da Growth não apareceu nos resultados de creatina.");
    }
    console.log(`  ✓ 'creatina' localiza Creatina Monohidratada 100% Pura`);

    // 3. Negative assertions / Honest reporting of uncataloged items
    console.log("\nTest 3: Validando integridade contra dados falsos ou não verificados...");
    const carneDeSol = await searchFoods("carne de sol");
    // Carne de sol não deve retornar charque como se fossem idênticos
    const fakeMatches = carneDeSol.filter((c) => (c.display_name_pt_br || c.name).toLowerCase().includes("charque"));
    if (fakeMatches.length > 0) {
      throw new Error("Alerta de equivalência incorreta: carne de sol colapsou para charque!");
    }
    console.log(`  ✓ 'carne de sol' não colapsa indevidamente para 'charque' (preservação estrita)`);

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
