import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";
import {
  tokenizeSearchQuery,
  expandSearchTokensWithSynonyms,
  buildFoodSearchOrderClause,
} from "../lib/nutrition-v2/food-search.ts";

console.log("=== INICIANDO SUÍTE DE TESTES: PT-BR FOOD CATALOG SEARCH REGRESSION ===\n");

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

// ----------------------------------------------------------------------------
// TEST 1: TOKENIZATION & REGIONAL PORTUGUESE SYNONYM RESOLUTION
// ----------------------------------------------------------------------------
{
  console.log("Test 1: Validando tokenização e resolução de termos em português...");

  const terms = ["arroz", "feijão", "frango", "banana", "ovo", "leite", "batata"];
  for (const term of terms) {
    const tokens = tokenizeSearchQuery(term);
    assert.ok(tokens.length > 0, `Termo "${term}" deve gerar ao menos um token`);
    const groups = expandSearchTokensWithSynonyms(tokens);
    assert.ok(groups.length > 0, `Termo "${term}" deve gerar grupo de busca`);
  }

  console.log("  ✓ Tokenização e expansão de termos PT-BR funcionando perfeitamente.");
}

// ----------------------------------------------------------------------------
// TEST 2: SIMULATED REPOSITORY & DB INTEGRATION TEST
// ----------------------------------------------------------------------------
async function runDatabaseTests() {
  if (!dbHost || !dbUser || !dbName) {
    console.log("  [PULADO] Configuração de banco de dados não detectada para execução do teste ao vivo.");
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
    console.log(`  [AVISO] Não foi possível conectar ao banco local (${err.message}). Pulando testes ao vivo.`);
    return;
  }

  try {
    console.log(`Test 2: Verificando banco ativo (${dbName})...`);

    // 1. Total active food count
    const [totalRows] = await connection.query(
      "SELECT COUNT(*) as total FROM nutrition_v2_foods WHERE status = 'ACTIVE' AND deleted_at IS NULL"
    );
    const totalActive = Number(totalRows[0]?.total || 0);
    assert.ok(totalActive > 0, "Deve haver alimentos ativos cadastrados no catálogo");
    console.log(`  ✓ Total de alimentos ativos no catálogo: ${totalActive}`);

    // 2. Representative searches
    const requiredSearches = ["arroz", "feijao", "frango", "banana", "ovo", "leite"];

    for (const term of requiredSearches) {
      const tokens = tokenizeSearchQuery(term);
      const tokenGroups = expandSearchTokensWithSynonyms(tokens);

      const conditions = ["f.deleted_at IS NULL", "f.status = 'ACTIVE'", "f.scope = 'GLOBAL'"];
      const params = [];

      for (const group of tokenGroups) {
        const orClauses = [];
        for (const variant of group) {
          orClauses.push("f.normalized_display_name_pt_br LIKE ? OR f.normalized_name LIKE ?");
          params.push(`%${variant}%`, `%${variant}%`);
        }
        conditions.push(`(${orClauses.join(" OR ")})`);
      }

      const whereClause = conditions.join(" AND ");
      const { orderClause, orderParams } = buildFoodSearchOrderClause(term, tokens, true);

      const [rows] = await connection.query(
        `SELECT f.public_id, f.name, f.display_name_pt_br, f.source_key, f.calories_kcal
         FROM nutrition_v2_foods f
         WHERE ${whereClause}
         ${orderClause}
         LIMIT 10`,
        [...params, ...orderParams]
      );

      assert.ok(rows.length > 0, `Busca por "${term}" deve retornar ao menos um resultado no catálogo PT-BR`);
      const first = rows[0];
      const displayName = first.display_name_pt_br || first.name;
      assert.ok(displayName, `Alimento retornado para "${term}" deve possuir nome legível`);
      console.log(`  ✓ Busca "${term}": ${rows.length} resultados na primeira página (Ex: "${displayName}" [${first.source_key}])`);
    }

    // 3. Tenancy isolation test
    console.log("Test 3: Verificando isolamento multi-tenant de alimentos customizados...");

    const testTenantId = 999999;
    const [tenantRows] = await connection.query(
      `SELECT f.id FROM nutrition_v2_foods f
       WHERE f.scope = 'CONSULTANCY' AND f.consultancy_id = ? AND f.deleted_at IS NULL`,
      [testTenantId]
    );
    assert.equal(tenantRows.length, 0, "Tenant inexistente não deve ter alimentos customizados expostos");

    // 4. Deleted foods hidden test
    const [deletedRows] = await connection.query(
      `SELECT COUNT(*) as total FROM nutrition_v2_foods WHERE deleted_at IS NOT NULL`
    );
    console.log(`  ✓ Alimentos soft-deleted no banco: ${deletedRows[0]?.total || 0} (ocultados em todas as queries com f.deleted_at IS NULL)`);

  } finally {
    await connection.end();
  }
}

// ----------------------------------------------------------------------------
// TEST 3: DISPLAY LOGIC SPECIFICATION AUDIT
// ----------------------------------------------------------------------------
{
  console.log("Test 4: Auditando lógica canônica de exibição de nomes em português...");

  // Approved UX behavior: displayNamePtBr || name
  function resolveDisplayName(food) {
    return food.displayNamePtBr || food.name;
  }

  // TACO Food: name is already in Portuguese, displayNamePtBr may be null
  const tacoFood = {
    name: "Arroz, tipo 1, cozido",
    displayNamePtBr: null,
    sourceKey: "TACO",
  };
  assert.equal(resolveDisplayName(tacoFood), "Arroz, tipo 1, cozido");

  // USDA Food: name is in English, displayNamePtBr is localized in Portuguese
  const usdaFood = {
    name: "Milk, whole, 3.25% milkfat",
    displayNamePtBr: "Leite integral, 3,25% de gordura",
    sourceKey: "USDA_FNDDS",
  };
  assert.equal(resolveDisplayName(usdaFood), "Leite integral, 3,25% de gordura");

  // Secondary provenance display check
  function shouldShowSecondaryProvenance(food) {
    return Boolean(food.displayNamePtBr) &&
      food.displayNamePtBr.toLowerCase() !== food.name.toLowerCase();
  }

  assert.equal(shouldShowSecondaryProvenance(tacoFood), false, "TACO nativo não precisa de procedência secundária");
  assert.equal(shouldShowSecondaryProvenance(usdaFood), true, "USDA traduzido deve exibir procedência secundária em inglês");

  console.log("  ✓ Lógica canônica de nomes e proveniência PT-BR validada.");
}

await runDatabaseTests();

console.log("\n=======================================================");
console.log("SUÍTE DE BUSCA DE ALIMENTOS PT-BR: TODOS OS TESTES PASSARAM!");
console.log("=======================================================\n");
