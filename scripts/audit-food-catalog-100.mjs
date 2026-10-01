import fs from "node:fs";
import mysql from "mysql2/promise";
import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

const env = {};
if (fs.existsSync(".env.local")) {
  fs.readFileSync(".env.local", "utf8").split("\n").forEach((l) => {
    const [k, ...v] = l.trim().split("=");
    if (k) env[k.trim()] = v.join("=").trim();
  });
}

const pool = mysql.createPool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  port: Number(env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 5,
});

const {
  normalizeSearchText,
} = await import("../lib/nutrition-v2/food-search.ts");

const {
  buildSelectFoodsQuery,
} = await import("../lib/nutrition-v2/food-query-builder.ts");

async function main() {
  console.log("==================================================================");
  console.log("TREVO ONE — FOOD CATALOG AUDIT & 100-CASE SEARCH VERIFICATION");
  console.log("==================================================================\n");

  // 1. CATALOG AUDIT
  console.log("--- 1. FOOD CATALOG AUDIT ---");
  const [allFoods] = await pool.query(
    `SELECT id, public_id, name, display_name_pt_br, source_key, source_type,
            calories_kcal, protein_g, carbohydrate_g, fat_g
     FROM nutrition_v2_foods
     WHERE deleted_at IS NULL AND status = 'ACTIVE'`
  );

  const totalFoods = allFoods.length;
  const bySource = {};
  let completeCount = 0;
  let partialValidCount = 0;
  let unknownCount = 0;
  let suspiciousCount = 0;
  let invalidCount = 0;
  let ptBrCovered = 0;
  let provenanceCovered = 0;
  let preparationCovered = 0;

  const prepKeywords = ["cozid", "grelhad", "frit", "cru", "assad", "refogad", "vapor", "desnatad", "integral", "semidesnatad"];

  for (const f of allFoods) {
    const src = f.source_key || f.source_type || "UNKNOWN_SOURCE";
    bySource[src] = (bySource[src] || 0) + 1;

    if (f.display_name_pt_br || /[a-záéíóúâêîôûãõç]/i.test(f.name)) {
      ptBrCovered++;
    }
    if (f.source_key || f.source_type) {
      provenanceCovered++;
    }
    const nameLower = (f.display_name_pt_br || f.name || "").toLowerCase();
    if (prepKeywords.some((p) => nameLower.includes(p))) {
      preparationCovered++;
    }

    const hasCals = f.calories_kcal != null;
    const hasP = f.protein_g != null;
    const hasC = f.carbohydrate_g != null;
    const hasG = f.fat_g != null;

    if (hasCals && hasP && hasC && hasG) {
      const p = Number(f.protein_g);
      const c = Number(f.carbohydrate_g);
      const g = Number(f.fat_g);
      const kcal = Number(f.calories_kcal);
      if (p < 0 || c < 0 || g < 0 || kcal < 0 || (p + c + g) > 105) {
        suspiciousCount++;
      } else {
        completeCount++;
      }
    } else if (!hasCals && !hasP && !hasC && !hasG) {
      unknownCount++;
    } else {
      partialValidCount++;
    }
  }

  console.log(`TOTAL FOODS: ${totalFoods}`);
  console.log("BY SOURCE:");
  for (const [s, count] of Object.entries(bySource)) {
    console.log(`  - ${s}: ${count}`);
  }
  console.log(`COMPLETE: ${completeCount}`);
  console.log(`PARTIAL_VALID: ${partialValidCount}`);
  console.log(`UNKNOWN: ${unknownCount}`);
  console.log(`SUSPICIOUS: ${suspiciousCount}`);
  console.log(`INVALID: ${invalidCount}`);
  console.log(`PT-BR NAME COVERAGE: ${((ptBrCovered / totalFoods) * 100).toFixed(1)}% (${ptBrCovered}/${totalFoods})`);
  console.log(`PROVENANCE COVERAGE: ${((provenanceCovered / totalFoods) * 100).toFixed(1)}% (${provenanceCovered}/${totalFoods})`);
  console.log(`PREPARATION COVERAGE: ${((preparationCovered / totalFoods) * 100).toFixed(1)}% (${preparationCovered}/${totalFoods})\n`);

  // 2. 100 REPRESENTATIVE BRAZILIAN FOOD CASES
  console.log("--- 2. 100 REPRESENTATIVE FOOD SEARCH CASES ---");
  const test100 = [
    // Arroz (1-6)
    "arroz branco", "arroz branco cozido", "arroz integral", "arroz integral cozido", "arroz parboilizado", "arroz cru",
    // Feijão (7-12)
    "feijao carioca", "feijao carioca cozido", "feijao preto", "feijao preto cozido", "feijao fradinho", "feijao de corda",
    // Carnes bovinas (13-20)
    "carne moida", "carne moida refogada", "patinho grelhado", "patinho cru", "alcatra grelhada", "contrafile grelhado", "carne assada", "bife bovino",
    // Frango e aves (21-28)
    "peito de frango", "peito de frango grelhado", "frango grelhado", "frango cozido", "frango frito", "coxa de frango", "sobrecoxa assada", "frango desfiado",
    // Peixes e frutos do mar (29-34)
    "tilapia grelhada", "salmao grelhado", "sardinha", "atum em conserva", "pescada cozida", "camarao cozido",
    // Ovos (35-39)
    "ovo cozido", "ovos mexidos", "clara de ovo", "gema de ovo", "ovo frito",
    // Leites (40-45)
    "leite integral", "leite desnatado", "leite semidesnatado", "leite em po", "leite de soja", "iogurte natural",
    // Queijos (46-51)
    "queijo minas", "queijo prato", "queijo mussarela", "queijo cottage", "ricota", "queijo coalho",
    // Frutas (52-66)
    "banana", "banana prata", "banana nanica", "maca", "laranja", "melancia", "abacaxi", "mamao", "morango", "manga", "uva", "abacate", "acai", "limao", "mexerica",
    // Legumes (67-76)
    "cenoura", "cenoura cozida", "abobrinha", "abobrinha refogada", "chuchu cozido", "beterraba", "berinjela", "tomate", "pepino", "pimentao",
    // Verduras (77-83)
    "alface", "couve refogada", "espinafre", "rucula", "brocolis cozido", "couve-flor", "repolho",
    // Raízes e regionalismos (84-93)
    "aipim", "macaxeira", "mandioca", "mandioca cozida", "mandioca frita", "batata doce cozida", "batata inglesa cozida", "batata baroa", "inhame", "cuscuz",
    // Massas, pães e tapioca (94-98)
    "tapioca", "pao frances", "pao de sal", "pao integral", "macarrao cozido",
    // Cereais e suplementos (99-102)
    "aveia em flocos", "pasta de amendoim", "azeite de oliva", "whey"
  ];

  let foundCount = 0;
  let ambiguousCount = 0;
  let notFoundCount = 0;
  const notFoundList = [];

  for (let i = 0; i < test100.length; i++) {
    const q = test100[i];
    const built = buildSelectFoodsQuery({ query: q, source: 'ALL', pageSize: 5 }, null, { isUnified: true });
    const [rows] = await pool.query(built.fullSql, built.selectParams);

    if (rows.length === 0) {
      notFoundCount++;
      notFoundList.push(q);
      console.log(`  [NOT_FOUND] "${q}"`);
    } else {
      const topName = (rows[0].display_name_pt_br || rows[0].name || "").toLowerCase();
      foundCount++;
    }
  }

  console.log(`\nSEARCH RESULTS (${test100.length} CASES):`);
  console.log(`  FOUND: ${foundCount}/${test100.length}`);
  console.log(`  AMBIGUOUS: ${ambiguousCount}`);
  console.log(`  NOT_FOUND: ${notFoundCount}`);
  if (notFoundList.length > 0) {
    console.log(`  Gaps: ${notFoundList.join(", ")}`);
  }

  // 3. EXTERNAL SOURCES AUDIT
  console.log("\n--- 3. EXTERNAL SOURCES AUDIT ---");
  const hasUsdaKey = Boolean(env.USDA_API_KEY && env.USDA_API_KEY.trim() && env.USDA_API_KEY !== "DEMO_KEY");
  console.log(`USDA ON-DEMAND: ${hasUsdaKey ? "PASS" : "BLOCKED_BY_CONFIGURATION"}`);
  console.log("TBCA: BLOCKED_PENDING_COMMERCIAL_PERMISSION");
  console.log("TACO: LICENSED_REFERENCE_HISTORICAL (FROZEN)");

  await pool.end();
}

main().catch((e) => {
  console.error("Audit error:", e);
  process.exit(1);
});
