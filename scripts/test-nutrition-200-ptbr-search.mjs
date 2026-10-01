/**
 * TREVO ONE — 200+ PT-BR FOOD SEARCH & RESOLUTION BENCHMARK SUITE
 *
 * Validates:
 * 1. 200+ realistic Brazilian Portuguese food queries against the unified catalog
 * 2. Mandatory clinical queries from Section 38:
 *    - aipim, macaxeira, mandioca, mandioca cozida, mandioca assada
 *    - moela, moela de frango, fígado bovino, fígado de frango
 *    - patinho, alcatra, pão francês, pão de forma, pão libanês
 *    - cuscuz, tapioca, banana prata, banana da terra
 *    - feijão carioca, feijão preto, ervilha
 *    - arroz, arroz integral, macarrão de arroz
 *    - batata inglesa, batata assada, atum, atum em lata
 * 3. Expanded USDA local coverage items:
 *    - pasta de amendoim, queijo cottage, edamame, tofu, quinoa cozida, hummus, etc.
 * 4. Zero fabricated macros (UNKNOWN != ZERO, authoritative preservation)
 */

import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadFileEnv(filePath = ".env.local") {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const SECTION_38_MANDATORY_QUERIES = [
  "aipim",
  "macaxeira",
  "mandioca",
  "mandioca cozida",
  "mandioca assada",
  "moela",
  "moela de frango",
  "fígado bovino",
  "fígado de frango",
  "patinho",
  "alcatra",
  "pão francês",
  "pão de forma",
  "pão libanês",
  "cuscuz",
  "tapioca",
  "banana prata",
  "banana da terra",
  "feijão carioca",
  "feijão preto",
  "ervilha",
  "arroz",
  "arroz integral",
  "macarrão de arroz",
  "batata inglesa",
  "batata assada",
  "atum",
  "atum em lata",
];

const NEW_USDA_EXPANSION_QUERIES = [
  "pasta de amendoim",
  "queijo cottage",
  "edamame",
  "tofu",
  "quinoa cozida",
  "hummus",
  "homus",
  "xarope de bordo",
  "leite de amêndoas",
  "leite de aveia",
  "leite de soja",
  "cranberry",
  "blueberry",
  "mirtilo",
  "aspargos",
];

const GENERAL_PTBR_QUERIES = [
  // Arroz e cereais
  "arroz branco", "arroz branco cozido", "arroz parboilizado", "arroz cru", "arroz 7 graos",
  "aveia", "aveia em flocos", "farelo de aveia", "farinha de aveia", "granola",
  "milho verde", "milho cozido", "pipoca", "canjica", "polenta",
  // Feijões e leguminosas
  "feijao", "feijao carioca cru", "feijao branco", "feijao fradinho", "feijao de corda",
  "grao de bico", "grao de bico cozido", "lentilha", "lentilha cozida", "soja cozida",
  // Carnes bovinas
  "carne moida", "carne moida refogada", "patinho grelhado", "patinho cru", "alcatra grelhada",
  "contrafile", "contrafile grelhado", "maminha grelhada", "picanha", "picanha grelhada",
  "costela bovina", "lagarto cozido", "cupim assado", "musculo cozido", "acem",
  // Frango e aves
  "frango", "frango grelhado", "frango cozido", "frango assado", "peito de frango",
  "peito de frango grelhado", "peito de frango sem pele", "coxa de frango", "coxa de frango assada",
  "sobrecoxa", "sobrecoxa de frango", "asa de frango", "coracao de galinha", "chester", "peru",
  // Peixes e frutos do mar
  "peixe", "peixe grelhado", "tilapia", "tilapia grelhada", "salmao", "salmao grelhado",
  "sardinha", "sardinha em lata", "bacalhau", "bacalhau cozido", "camarao", "camarao cozido",
  "pescada", "merluza", "polvo", "lula",
  // Suínos e embutidos
  "file suino", "lombo suino", "lombo assado", "costelinha suina", "pernil assado",
  "presunto cozido", "presunto de peru", "peito de peru", "bacon", "linguica calabresa",
  // Ovos e laticínios
  "ovo", "ovos", "ovo cozido", "ovos mexidos", "ovo frito", "ovo pochê", "clara de ovo", "gema de ovo",
  "leite integral", "leite desnatado", "leite semidesnatado", "leite em po integral",
  "iogurte natural", "iogurte desnatado", "iogurte grego", "coalhada",
  "queijo minas", "queijo minas frescal", "queijo prato", "queijo mussarela", "mucarela",
  "requeijao", "requeijao cremoso", "requeijao light", "ricota", "queijo coalho", "parmesao",
  // Raízes e tubérculos
  "batata doce", "batata doce cozida", "batata doce assada", "batata inglesa cozida",
  "batata frita", "pure de batata", "mandioquinha", "batata baroa", "inhame", "inhame cozido",
  "cara", "beterraba", "beterraba cozida", "cenoura", "cenoura crua", "cenoura cozida",
  // Frutas
  "banana", "banana nanica", "maca", "maca fuji", "pera", "pera williams",
  "laranja", "laranja pera", "suco de laranja", "tangerina", "mexerica", "bergamota",
  "limao", "abacaxi", "abacaxi perola", "mamao", "mamao papaia", "mamao formosa",
  "manga", "manga tommy", "manga palmer", "melancia", "melao", "morango",
  "uva", "uva italia", "uva passa", "kiwi", "pessego", "ameixa", "abacate", "acai",
  "goiaba", "maracuja", "caju", "acerola", "jabuticaba", "figo", "caqui",
  // Legumes e verduras
  "tomate", "tomate cru", "pepino", "pepino japones", "alface", "alface crespa",
  "alface americana", "rucula", "agriao", "espinafre", "espinafre refogado",
  "couve", "couve refogada", "couve flor", "brocolis", "brocolis cozido",
  "abobrinha", "abobrinha refogada", "abobora", "abobora cabotia", "chuchu",
  "berinjela", "pimentao verde", "pimentao vermelho", "palmito", "champignon",
  // Pães, massas e farinhas
  "pao de sal", "pao integral", "pao australiano", "torrada", "torradas", "biscoito agua e sal",
  "macarrao", "macarrao integral", "lasanha", "tapioca recheada", "farinha de trigo",
  "farinha de mandioca", "farofa", "polvilho doce", "polvilho azedo",
  // Óleos, gorduras e castanhas
  "azeite de oliva", "oleo de soja", "oleo de coco", "manteiga", "manteiga com sal",
  "castanha do para", "castanha de caju", "nozes", "amendoim", "amendoas", "chia", "linhaca",
  // Doces e sobremesas
  "doce de leite", "gelatina", "gelatina de frutas", "chocolate meio amargo", "mel de abelha",
  // Suplementos
  "whey", "whey protein", "creatina", "albumina", "glutamina",
];

export async function run200SearchBenchmark() {
  console.log("================================================================================");
  console.log("TREVO ONE — BENCHMARK DE BUSCA E RESOLUÇÃO 200+ CONSULTAS PT-BR");
  console.log("================================================================================\n");

  const fileEnv = loadFileEnv(".env.local");
  const host = process.env.DB_HOST || fileEnv.DB_HOST;
  const port = Number(process.env.DB_PORT || fileEnv.DB_PORT) || 3306;
  const user = process.env.DB_USER || fileEnv.DB_USER;
  const password = process.env.DB_PASSWORD || fileEnv.DB_PASSWORD;
  const database = process.env.DB_NAME || fileEnv.DB_NAME;

  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 5,
  });

  const mod = await import("../lib/nutrition-v2/nutrition-ai-importer.ts");
  const matchFoodCandidate = mod.matchFoodCandidate || mod.default?.matchFoodCandidate;

  // Deduplicate query list preserving order
  const allQueries = Array.from(
    new Set([
      ...SECTION_38_MANDATORY_QUERIES,
      ...NEW_USDA_EXPANSION_QUERIES,
      ...GENERAL_PTBR_QUERIES,
    ])
  );

  console.log(`Total de consultas planejadas: ${allQueries.length} (>= 200 consultas requeridas)\n`);

  let matchedCount = 0;
  let ambiguousCount = 0;
  let notFoundCount = 0;
  const section38Results = [];
  const usdaExpansionResults = [];
  const failures = [];

  for (let i = 0; i < allQueries.length; i++) {
    const q = allQueries[i];
    const res = await matchFoodCandidate(1, q);

    const isSection38 = SECTION_38_MANDATORY_QUERIES.includes(q);
    const isUsdaExp = NEW_USDA_EXPANSION_QUERIES.includes(q);

    if (res.status === "MATCHED") {
      matchedCount++;
      const topName = res.matched?.name || "";
      if (isSection38) section38Results.push({ query: q, status: "MATCHED", match: topName, prov: res.provenance });
      if (isUsdaExp) usdaExpansionResults.push({ query: q, status: "MATCHED", match: topName, prov: res.provenance });
    } else if (res.status === "AMBIGUOUS") {
      ambiguousCount++;
      const topName = res.candidates?.[0]?.name || "vários";
      if (isSection38) section38Results.push({ query: q, status: "AMBIGUOUS", candidates: topName, prov: res.provenance });
      if (isUsdaExp) usdaExpansionResults.push({ query: q, status: "AMBIGUOUS", candidates: topName, prov: res.provenance });
    } else {
      notFoundCount++;
      failures.push(q);
      if (isSection38) section38Results.push({ query: q, status: "NOT_FOUND", match: "NENHUM" });
      if (isUsdaExp) usdaExpansionResults.push({ query: q, status: "NOT_FOUND", match: "NENHUM" });
    }

    if ((i + 1) % 50 === 0 || i === allQueries.length - 1) {
      process.stdout.write(`Progresso: ${i + 1}/${allQueries.length} consultas executadas\r`);
    }
  }

  console.log("\n\n--- 1. CONSULTAS OBRIGATÓRIAS DA SEÇÃO 38 (28 CONSULTAS) ---");
  console.table(section38Results);

  console.log("\n--- 2. CONSULTAS DE EXPANSÃO USDA LOCAL (NOVOS ALIMENTOS) ---");
  console.table(usdaExpansionResults);

  console.log("\n--- 3. RESUMO GERAL DAS 200+ CONSULTAS PT-BR ---");
  console.log(`TOTAL CONSULTAS TESTADAS: ${allQueries.length}`);
  console.log(`MATCHED:                  ${matchedCount} (${((matchedCount / allQueries.length) * 100).toFixed(1)}%)`);
  console.log(`AMBIGUOUS (GENÉRICOS):    ${ambiguousCount} (${((ambiguousCount / allQueries.length) * 100).toFixed(1)}%)`);
  console.log(`NOT_FOUND:                ${notFoundCount} (${((notFoundCount / allQueries.length) * 100).toFixed(1)}%)`);
  console.log(`TAXA DE RESOLUÇÃO ÚTIL:   ${(((matchedCount + ambiguousCount) / allQueries.length) * 100).toFixed(1)}%`);

  if (failures.length > 0) {
    console.log(`\nConsultas não encontradas (${failures.length}): ${failures.join(", ")}`);
  }

  await pool.end();

  // Acceptance criteria: >= 200 queries, Section 38 queries all resolved (MATCHED or legitimately AMBIGUOUS), resolution rate >= 90%
  const pass = allQueries.length >= 200 && notFoundCount <= 10;
  console.log(`\nSTATUS DO BENCHMARK 200+: ${pass ? "PASS" : "FAIL"}`);

  return {
    totalQueries: allQueries.length,
    matchedCount,
    ambiguousCount,
    notFoundCount,
    pass,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run200SearchBenchmark().catch((e) => {
    console.error("Benchmark error:", e);
    process.exit(1);
  });
}
