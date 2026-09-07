import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function computeLogicalDatasetHash(foods) {
  const sorted = [...foods].sort(
    (a, b) => Number(a.source_external_code) - Number(b.source_external_code)
  );
  const lines = sorted.map((f) =>
    [
      f.source_uid,
      f.source_external_code,
      f.name,
      f.category ?? "",
      Number(f.reference_amount).toFixed(2),
      f.reference_unit_code,
      f.calories_kcal != null ? Number(f.calories_kcal).toFixed(2) : "NULL",
      f.protein_g != null ? Number(f.protein_g).toFixed(2) : "NULL",
      f.carbohydrate_g != null ? Number(f.carbohydrate_g).toFixed(2) : "NULL",
      f.fat_g != null ? Number(f.fat_g).toFixed(2) : "NULL",
    ].join("|")
  );
  return crypto.createHash("sha256").update(lines.join("\n"), "utf8").digest("hex");
}

export function validateDataset(datasetPath) {
  const resolvedPath = datasetPath || path.resolve(__dirname, "../data/nutrition/taco-2011.json");
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Arquivo de dataset não encontrado: ${resolvedPath}`);
  }

  const rawBytes = fs.readFileSync(resolvedPath);
  const fileSha256 = crypto.createHash("sha256").update(rawBytes).digest("hex");
  const rawText = rawBytes.toString("utf8");

  let data;
  try {
    data = JSON.parse(rawText);
  } catch (err) {
    throw new Error(`JSON inválido em ${resolvedPath}: ${err.message}`);
  }

  const { metadata, foods } = data;
  if (!metadata || typeof metadata !== "object") {
    throw new Error("Campo 'metadata' ausente ou inválido no dataset.");
  }
  if (!Array.isArray(foods)) {
    throw new Error("Campo 'foods' deve ser um array.");
  }

  if (metadata.row_count !== 548) {
    throw new Error(`metadata.row_count esperado 548, obtido: ${metadata.row_count}`);
  }
  if (foods.length !== 548) {
    throw new Error(`Array foods esperado com 548 itens, obtido: ${foods.length}`);
  }

  const uidSet = new Set();
  const codeSet = new Set();
  let prevCodeNum = 0;

  for (let i = 0; i < foods.length; i++) {
    const f = foods[i];
    if (!f.name || typeof f.name !== "string" || !f.name.trim()) {
      throw new Error(`Alimento #${i} possui nome vazio ou inválido.`);
    }
    if (!f.source_external_code || typeof f.source_external_code !== "string") {
      throw new Error(`Alimento #${i} (${f.name}) possui source_external_code inválido.`);
    }

    const codeNum = Number(f.source_external_code);
    if (!Number.isInteger(codeNum) || codeNum <= 0) {
      throw new Error(`Alimento #${i} possui código não-inteiro positivo: ${f.source_external_code}`);
    }
    if (codeNum <= prevCodeNum) {
      throw new Error(`Ordenação não-estrita em #${i}: ${codeNum} após ${prevCodeNum}`);
    }
    prevCodeNum = codeNum;

    if (!f.source_uid || typeof f.source_uid !== "string" || !f.source_uid.startsWith("TACO:")) {
      throw new Error(`Alimento #${i} (${f.name}) possui source_uid com formato inesperado: ${f.source_uid}`);
    }

    if (uidSet.has(f.source_uid)) {
      throw new Error(`source_uid duplicado encontrado: ${f.source_uid}`);
    }
    uidSet.add(f.source_uid);

    if (codeSet.has(f.source_external_code)) {
      throw new Error(`source_external_code duplicado encontrado: ${f.source_external_code}`);
    }
    codeSet.add(f.source_external_code);

    if (Number(f.reference_amount) <= 0) {
      throw new Error(`Alimento #${i} possui reference_amount <= 0.`);
    }
    if (f.reference_unit_code !== "G") {
      throw new Error(`Alimento #${i} possui reference_unit_code diferente de 'G': ${f.reference_unit_code}`);
    }

    const macros = ["calories_kcal", "protein_g", "carbohydrate_g", "fat_g"];
    for (const m of macros) {
      if (f[m] != null) {
        const val = Number(f[m]);
        if (isNaN(val) || val < 0) {
          throw new Error(`Alimento #${i} (${f.name}) possui macro negativo ou NaN em ${m}: ${f[m]}`);
        }
      }
    }
  }

  const computedLogicalSha256 = computeLogicalDatasetHash(foods);
  if (computedLogicalSha256 !== metadata.logical_dataset_sha256) {
    throw new Error(
      `Divergência no hash lógico do dataset! Esperado: ${metadata.logical_dataset_sha256}, Calculado: ${computedLogicalSha256}`
    );
  }

  return {
    rowCount: foods.length,
    distinctUids: uidSet.size,
    distinctCodes: codeSet.size,
    logicalDatasetSha256: computedLogicalSha256,
    fileSha256,
    historicalSourceSha256: metadata.historical_source_sha256,
  };
}

async function run() {
  console.log("=== TREVO ONE — VALIDAÇÃO CANÔNICA DO DATASET TACO 2011 ===");
  try {
    const result = validateDataset();
    console.log(`- Registros validados:        ${result.rowCount}`);
    console.log(`- source_uid únicos:          ${result.distinctUids}`);
    console.log(`- Códigos externos únicos:    ${result.distinctCodes}`);
    console.log(`- Hash lógico do dataset:     ${result.logicalDatasetSha256}`);
    console.log(`- Hash SHA256 do arquivo:     ${result.fileSha256}`);
    console.log(`- Hash fonte histórica:       ${result.historicalSourceSha256}`);
    console.log("\nRESULTADO: DATASET CANÔNICO VÁLIDO (PASS)");
  } catch (err) {
    console.error(`\nFALHA NA VALIDAÇÃO DO DATASET: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
