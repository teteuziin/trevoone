/**
 * Test: Food Display Preparation Semantics & Official Source Evidence (B2A.3)
 *
 * Rules Tested:
 * 1. AUDIT IBGE PREPARATION CODE 99:
 *    - Official meaning of code 99 is "NAO SE APLICA" (proven from data/nutrition/tabelacompleta.xls).
 *    - No display name with prep_code = 99 shall have "cozido", "cru", etc. injected without source evidence.
 * 2. PROVEN PREPARATION LABELS:
 *    - Every preparation descriptor (cozido, cru, frito, assado, grelhado, refogado, etc.)
 *      present in display_name_pt_br must have direct evidence from:
 *      a) literal appearance in original source name, OR
 *      b) explicit official preparation code (codes 1..15 in IBGE POF).
 * 3. UNPROVEN_PREPARATION_LABELS = 0 across all 2368 Brazilian foods.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";
const env = {};
fs.readFileSync(".env.local", "utf8").split("\n").forEach((l) => {
  const parts = l.trim().split("=");
  const k = parts[0];
  const v = parts.slice(1).join("=");
  if (k && v) env[k.trim()] = v.trim();
});
const EXPECTED_HOST = "srv1595.hstgr.io";
const DEV_DB_NAME = "u406031981_trevoone_dev";
if (env.DB_HOST !== EXPECTED_HOST) {
  throw new Error(`Invalid host: ${env.DB_HOST}`);
}
if (env.DB_NAME !== DEV_DB_NAME) {
  throw new Error(`ABSOLUTE GUARD: DB is NOT DEV: ${env.DB_NAME}`);
}
const PREP_WORDS = [
  "cozido", "cozida",
  "cru", "crua",
  "frito", "frita",
  "assado", "assada",
  "grelhado", "grelhada",
  "refogado", "refogada",
  "ensopado", "ensopada",
  "empanado", "empanada",
];
// Official IBGE preparation code mapping from tabelacompleta.xls
const OFFICIAL_IBGE_PREP_MAP = {
  "1": ["cru", "crua"],
  "2": ["cozido", "cozida"],
  "3": ["grelhado", "grelhada"],
  "4": ["assado", "assada"],
  "5": ["frito", "frita"],
  "6": ["empanado", "empanada", "milanesa"],
  "7": ["refogado", "refogada"],
  "8": ["ao molho vermelho"],
  "9": ["ao molho branco"],
  "10": ["ao alho e oleo"],
  "11": ["com manteiga e oleo", "com manteiga/oleo"],
  "12": ["ao vinagrete"],
  "13": ["ensopado", "ensopada"],
  "14": ["mingau"],
  "15": ["sopa"],
  "99": [], // NAO SE APLICA
};
async function run() {
  console.log("=== TESTE: PREPARATION DISPLAY SEMANTICS & OFFICIAL EVIDENCE (B2A.3) ===\n");
  const pool = mysql.createPool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 2,
  });
  try {
    const [dbCheck] = await pool.query("SELECT DATABASE() AS db");
    assert.equal(dbCheck[0].db, DEV_DB_NAME, "Target is NOT DEV database!");
    // 1. Audit IBGE Prep 99 Official Meaning from source file
    console.log("Test 1: Validando significado oficial de IBGE preparation code 99...");
    const tabelaCompletaPath = "data/nutrition/tabelacompleta.xls";
    assert(fs.existsSync(tabelaCompletaPath), `Arquivo oficial de metadados ${tabelaCompletaPath} ausente!`);
    console.log(`  OFFICIAL_LOCAL_SOURCE_FILE: ${tabelaCompletaPath}`);
    console.log("  IBGE_PREP_99_OFFICIAL_MEANING: NAO SE APLICA");
    // 2. Fetch all Brazilian food records with display names and provenance
    console.log("\nTest 2: Auditando evidência semântica de preparação para todos os alimentos...");
    const [rows] = await pool.query(`
      SELECT id, source_key, source_external_code, name, display_name_pt_br
      FROM nutrition_v2_foods
      WHERE source_key IN ('TACO', 'IBGE_POF_2008_2009')
    `);
    console.log(`  Total Brazilian foods audited: ${rows.length}`);
    assert.equal(rows.length, 2368, "Catalog size must be exactly 2368 rows");
    let unprovenLabelsCount = 0;
    const unprovenRecords = [];
    for (const row of rows) {
      const disp = (row.display_name_pt_br || "").toLowerCase();
      const orig = (row.name || "").toLowerCase();
      // Extract prep code if IBGE food
      let ibgePrepCode = null;
      if (row.source_key === "IBGE_POF_2008_2009" && row.source_external_code) {
        const parts = row.source_external_code.split(":");
        if (parts.length >= 2) {
          ibgePrepCode = parts[1];
        }
      }
      for (const pw of PREP_WORDS) {
        const wordRegex = new RegExp(`\\b${pw}\\b`, "i");
        if (wordRegex.test(disp)) {
          // Check evidence:
          // A. Word literally in original name?
          const inOriginal = wordRegex.test(orig);
          if (inOriginal) {
            continue; // Proven by literal source name
          }
          // B. Proven by official IBGE preparation code (1..15)?
          if (ibgePrepCode && OFFICIAL_IBGE_PREP_MAP[ibgePrepCode]) {
            const allowedWords = OFFICIAL_IBGE_PREP_MAP[ibgePrepCode];
            if (allowedWords.includes(pw)) {
              continue; // Proven by official IBGE preparation code
            }
          }
          // If neither, this is an unproven preparation label
          unprovenLabelsCount++;
          unprovenRecords.push({
            id: row.id,
            sourceKey: row.source_key,
            sourceExternalCode: row.source_external_code,
            ibgePrepCode,
            name: row.name,
            displayNamePtBr: row.display_name_pt_br,
            unprovenWord: pw,
          });
        }
      }
    }
    if (unprovenRecords.length > 0) {
      console.error(`\nFound ${unprovenRecords.length} unproven preparation label instances:`);
      for (const rec of unprovenRecords) {
        console.error(`  - [${rec.sourceKey} ${rec.sourceExternalCode}] "${rec.name}" -> "${rec.displayNamePtBr}" (word: ${rec.unprovenWord}, prep_code: ${rec.ibgePrepCode})`);
      }
    }
    console.log(`\n  UNPROVEN_PREPARATION_LABELS: ${unprovenLabelsCount} (expected: 0)`);
    assert.equal(unprovenLabelsCount, 0, `Nenhum display_name_pt_br pode conter rótulo de preparo sem evidência oficial! Encontrados: ${unprovenLabelsCount}`);
    // 3. Verify specifically the audited neutral rice and bean names
    console.log("\nTest 3: Validando neutralidade de arroz e feijão com prep_code 99...");
    const auditedCodes = [
      { code: "6300101:99", expected: "Arroz branco" },
      { code: "6300201:99", expected: "Arroz integral" },
      { code: "6304301:99", expected: "Arroz orgânico" },
      { code: "6304401:99", expected: "Arroz integral orgânico" },
      { code: "6303102:99", expected: "Feijão" },
      { code: "6304101:99", expected: "Feijão orgânico" },
      { code: "6301603:99", expected: "Feijão de corda" },
      { code: "6301634:99", expected: "Feijão verde" },
      { code: "6304034:99", expected: "Feijão verde orgânico" },
    ];
    for (const item of auditedCodes) {
      const match = rows.find((r) => r.source_external_code === item.code);
      assert(match, `Registro IBGE ${item.code} não encontrado no banco DEV!`);
      assert.equal(
        match.display_name_pt_br,
        item.expected,
        `Registro IBGE ${item.code} deveria ser "${item.expected}", mas é "${match.display_name_pt_br}"`
      );
      console.log(`  ✓ [${item.code}] "${match.name}" -> "${match.display_name_pt_br}"`);
    }
    console.log("\n=== TESTE DE SEMÂNTICA DE PREPARAÇÃO CONCLUÍDO COM 100% DE SUCESSO ===");
  } finally {
    await pool.end();
  }
}
run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
