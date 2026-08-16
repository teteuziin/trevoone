import mysql from "mysql2/promise";
import ExcelJS from "exceljs";
import fs from "node:fs/promises";
import crypto from "node:crypto";

const EXPECTED_SOURCE_SHA256 = "a66b8ec528daeabc63bc2b015fc9bd8c6d76b941c2fc0ed93a4311d449302d14";
const EXPECTED_SHEET_NAME = "CMVCol taco3";
const SOURCE_KEY = "TACO";
const SOURCE_LABEL = "Tabela Brasileira de Composição de Alimentos - TACO / NEPA-UNICAMP";
const SOURCE_VERSION = "4ª edição revisada e ampliada (2011)";
const SOURCE_REFERENCE = `NEPA/UNICAMP - TACO 4ª edição (2011) [SHA-256: ${EXPECTED_SOURCE_SHA256}]`;

const KNOWN_CATEGORIES = new Set([
  "Cereais e derivados",
  "Verduras, hortaliças e derivados",
  "Frutas e derivados",
  "Gorduras e óleos",
  "Pescados e frutos do mar",
  "Carnes e derivados",
  "Leite e derivados",
  "Bebidas (alcoólicas e não alcoólicas)",
  "Ovos e derivados",
  "Produtos açucarados",
  "Miscelâneas",
  "Outros alimentos industrializados",
  "Alimentos preparados",
  "Leguminosas e derivados",
  "Nozes e sementes"
]);

function normalizeSearchText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseArgs(argv) {
  let sourceFile = null;
  let consultancySlug = null;
  let isApply = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--source-file=")) {
      sourceFile = arg.slice("--source-file=".length);
    } else if (arg === "--source-file" && i + 1 < argv.length) {
      sourceFile = argv[++i];
    } else if (arg.startsWith("--consultancy-slug=")) {
      consultancySlug = arg.slice("--consultancy-slug=".length);
    } else if (arg === "--consultancy-slug" && i + 1 < argv.length) {
      consultancySlug = argv[++i];
    } else if (arg === "--apply") {
      isApply = true;
    } else {
      console.error(`ERRO: Argumento desconhecido ou inválido: '${arg}'`);
      process.exit(1);
    }
  }

  if (!sourceFile || !sourceFile.trim()) {
    console.error("ERRO: Parâmetro obrigatório '--source-file <caminho>' ausente.");
    process.exit(1);
  }

  if (!consultancySlug || !consultancySlug.trim()) {
    console.error("ERRO: Parâmetro obrigatório '--consultancy-slug <slug>' ausente.");
    process.exit(1);
  }

  return {
    sourceFile: sourceFile.trim(),
    consultancySlug: consultancySlug.trim().toLowerCase(),
    isApply,
  };
}

function validateEnvironment() {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

  if (DB_NAME === "u406031981_trevoone" || DB_USER === "u406031981_trevoadmin") {
    console.error("PRODUÇÃO DETECTADA — EXECUÇÃO ABORTADA.");
    process.exit(1);
  }

  if (
    DB_NAME !== "u406031981_trevoone_dev" ||
    DB_USER !== "u406031981_trevodev" ||
    DB_HOST !== "srv1595.hstgr.io"
  ) {
    console.error("ERRO: Este script de importação é restrito exclusivamente ao ambiente DEV (u406031981_trevoone_dev).");
    process.exit(1);
  }

  if (!DB_HOST || !DB_NAME || !DB_USER || DB_PASSWORD === undefined || DB_PASSWORD === "") {
    console.error("ERRO: Variáveis de ambiente de banco de dados não configuradas corretamente.");
    process.exit(1);
  }

  const port = Number(DB_PORT) || 3306;

  return {
    host: DB_HOST,
    port,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
  };
}

function getCellValue(cell) {
  if (!cell || cell.value === null || cell.value === undefined) return null;
  let val = cell.value;
  if (typeof val === "object" && val !== null && val.result !== undefined) {
    val = val.result;
  }
  if (typeof val === "string") {
    val = val.trim();
    if (val === "") return null;
  }
  return val;
}

function parseMacro(rawVal, macroType) {
  if (rawVal === null || rawVal === undefined) {
    return { ok: false, reason: "NOT_REQUESTED", raw: rawVal };
  }

  if (typeof rawVal === "string") {
    const s = rawVal.trim();
    if (s === "Tr" || s === "tr" || s.toLowerCase() === "tr") {
      return { ok: false, reason: "TRACE_VALUE", raw: rawVal };
    }
    if (s === "NA" || s === "na" || s === "N/A" || s === "n/a") {
      return { ok: false, reason: "NOT_APPLICABLE", raw: rawVal };
    }
    if (s === "*") {
      return { ok: false, reason: "UNDER_REVIEW", raw: rawVal };
    }
    if (s === "") {
      return { ok: false, reason: "NOT_REQUESTED", raw: rawVal };
    }
    const num = Number(s.replace(",", "."));
    if (isNaN(num) || !Number.isFinite(num)) {
      return { ok: false, reason: "INVALID_NUMERIC", raw: rawVal };
    }
    rawVal = num;
  }

  if (typeof rawVal === "number") {
    if (!Number.isFinite(rawVal) || isNaN(rawVal)) {
      return { ok: false, reason: "INVALID_NUMERIC", raw: rawVal };
    }

    if (macroType === "energy") {
      const rounded = Math.round(rawVal);
      if (rounded < 0) {
        return { ok: false, reason: "NEGATIVE_VALUE", raw: rawVal };
      }
      return { ok: true, value: rounded, raw: rawVal, wasNegativeArtifact: false };
    } else {
      let rounded = Math.round(rawVal * 10) / 10;
      let wasNegativeArtifact = false;
      if (Object.is(rounded, -0) || rounded === 0) {
        rounded = 0;
        if (rawVal < 0) {
          wasNegativeArtifact = true;
        }
      }
      if (rounded < 0) {
        return { ok: false, reason: "NEGATIVE_VALUE", raw: rawVal };
      }
      return { ok: true, value: rounded, raw: rawVal, wasNegativeArtifact };
    }
  }

  return { ok: false, reason: "INVALID_NUMERIC", raw: rawVal };
}

async function parseTacoWorkbook(filePath) {
  let fileBuffer;
  try {
    fileBuffer = await fs.readFile(filePath);
  } catch (err) {
    console.error(`ERRO: Falha ao ler o arquivo fonte '${filePath}':`, err.message);
    process.exit(1);
  }

  const computedHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  if (computedHash !== EXPECTED_SOURCE_SHA256) {
    console.error("ERRO DE INTEGRIDADE DA FONTE TACO");
    console.error(`Hash esperado: ${EXPECTED_SOURCE_SHA256}`);
    console.error(`Hash obtido:   ${computedHash}`);
    console.error("A importação foi abortada.");
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  const sheet = workbook.getWorksheet(EXPECTED_SHEET_NAME);
  if (!sheet) {
    console.error(`ERRO: Worksheet '${EXPECTED_SHEET_NAME}' não encontrada no arquivo Excel.`);
    process.exit(1);
  }

  // Header verification
  const r2c1 = String(getCellValue(sheet.getCell(2, 1)) || "");
  const r3c1 = String(getCellValue(sheet.getCell(3, 1)) || "");
  const r3c2 = String(getCellValue(sheet.getCell(3, 2)) || "");
  const r2c4 = String(getCellValue(sheet.getCell(2, 4)) || "");
  const r3c4 = String(getCellValue(sheet.getCell(3, 4)) || "");
  const r2c6 = String(getCellValue(sheet.getCell(2, 6)) || "");
  const r2c7 = String(getCellValue(sheet.getCell(2, 7)) || "");
  const r3c9 = String(getCellValue(sheet.getCell(3, 9)) || "");

  if (
    !r2c1.includes("Número") ||
    !r3c1.includes("Alimento") ||
    !r3c2.includes("Descrição") ||
    !r2c4.includes("Energia") ||
    !r3c4.includes("kcal") ||
    !r2c6.includes("Proteína") ||
    !r2c7.includes("Lipídeos") ||
    !r3c9.includes("(g)")
  ) {
    console.error("ERRO: Estrutura de cabeçalho da planilha não corresponde ao padrão esperado da TACO.");
    process.exit(1);
  }

  let currentCategory = null;
  const accepted = [];
  const rejected = [];
  const negativeArtifacts = [];

  for (let r = 4; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const col1 = getCellValue(row.getCell(1));
    const col2 = getCellValue(row.getCell(2));

    if (!col1 && !col2) continue;

    if (typeof col1 === "string" && isNaN(Number(col1))) {
      if (KNOWN_CATEGORIES.has(col1) || KNOWN_CATEGORIES.has(col2)) {
        currentCategory = KNOWN_CATEGORIES.has(col1) ? col1 : col2;
      }
      continue;
    }

    const foodIdNum = typeof col1 === "number" ? col1 : Number(col1);
    if (!isNaN(foodIdNum) && Number.isInteger(foodIdNum) && foodIdNum >= 1 && foodIdNum <= 1000) {
      const name = typeof col2 === "string" ? col2.replace(/\s+/g, " ").trim() : String(col2).trim();

      const rawKcal = getCellValue(row.getCell(4));
      const rawProtein = getCellValue(row.getCell(6));
      const rawFat = getCellValue(row.getCell(7));
      const rawCarb = getCellValue(row.getCell(9));

      const resKcal = parseMacro(rawKcal, "energy");
      const resProtein = parseMacro(rawProtein, "protein");
      const resFat = parseMacro(rawFat, "fat");
      const resCarb = parseMacro(rawCarb, "carb");

      const isAllOk = resKcal.ok && resProtein.ok && resFat.ok && resCarb.ok;

      if (resCarb.wasNegativeArtifact || resProtein.wasNegativeArtifact || resFat.wasNegativeArtifact) {
        negativeArtifacts.push({
          id: foodIdNum,
          name,
          rawCarb,
          rawProtein,
          rawFat,
        });
      }

      if (isAllOk) {
        accepted.push({
          externalCode: String(foodIdNum),
          numericId: foodIdNum,
          name,
          normalizedName: normalizeSearchText(name),
          category: currentCategory,
          referenceAmount: 100.00,
          referenceUnit: "G",
          caloriesKcal: resKcal.value,
          proteinG: resProtein.value,
          fatG: resFat.value,
          carbohydrateG: resCarb.value,
        });
      } else {
        const reasons = [];
        if (!resKcal.ok) reasons.push({ field: "calories_kcal", reason: resKcal.reason, raw: resKcal.raw });
        if (!resProtein.ok) reasons.push({ field: "protein_g", reason: resProtein.reason, raw: resProtein.raw });
        if (!resFat.ok) reasons.push({ field: "fat_g", reason: resFat.reason, raw: resFat.raw });
        if (!resCarb.ok) reasons.push({ field: "carbohydrate_g", reason: resCarb.reason, raw: resCarb.raw });
        rejected.push({
          externalCode: String(foodIdNum),
          numericId: foodIdNum,
          name,
          reasons,
        });
      }
    }
  }

  const totalFoods = accepted.length + rejected.length;
  if (totalFoods !== 597) {
    console.error(`ERRO: Total de alimentos na planilha (${totalFoods}) difere do esperado (597).`);
    process.exit(1);
  }

  if (accepted.length !== 548 || rejected.length !== 49) {
    console.error(`ERRO: Contagens de validação (${accepted.length} aceitos / ${rejected.length} rejeitados) diferem do esperado (548/49).`);
    process.exit(1);
  }

  const expectedArtifactIds = new Set([288, 322, 337, 400]);
  const actualArtifactIds = new Set(negativeArtifacts.map(n => n.id));
  const artifactIdsMatch =
    negativeArtifacts.length === 4 &&
    Array.from(expectedArtifactIds).every(id => actualArtifactIds.has(id));

  if (!artifactIdsMatch) {
    console.error("ERRO: Alimentos com artefatos negativos de carboidrato diferem do perfil aprovado (288, 322, 337, 400).");
    process.exit(1);
  }

  return {
    computedHash,
    accepted,
    rejected,
    negativeArtifacts,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dbConfig = validateEnvironment();

  console.log("=== TREVO ONE — IMPORTADOR TACO AUDITÁVEL ===");
  console.log("Modo:", args.isApply ? "APPLY (Escrita no banco de dados)" : "DRY RUN (Simulação segura / 0 writes)");
  console.log("Arquivo fonte:", args.sourceFile);
  console.log("Consultoria alvo:", args.consultancySlug);

  const parsed = await parseTacoWorkbook(args.sourceFile);

  let pool = null;
  let connection = null;

  try {
    pool = mysql.createPool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
      enableKeepAlive: true,
    });

    connection = await pool.getConnection();
    await connection.query("SET SESSION time_zone = '+00:00';");

    // Resolve consultancy
    const [consultancyRows] = await connection.execute(
      `SELECT id, public_id, name, slug, status, deleted_at
       FROM consultancies
       WHERE slug = ?
         AND deleted_at IS NULL
       LIMIT 1;`,
      [args.consultancySlug]
    );

    if (!Array.isArray(consultancyRows) || consultancyRows.length === 0) {
      console.error(`ERRO: Consultoria com slug '${args.consultancySlug}' não encontrada.`);
      process.exit(1);
    }

    const consultancy = consultancyRows[0];
    const consultancyId = Number(consultancy.id);

    // Fetch existing TACO foods for this consultancy
    const [existingRows] = await connection.execute(
      `SELECT
        id,
        public_id,
        name,
        normalized_name,
        category,
        reference_amount,
        reference_unit,
        calories_kcal,
        protein_g,
        carbohydrate_g,
        fat_g,
        status,
        source_type,
        source_key,
        source_label,
        source_external_code,
        source_version,
        source_reference,
        source_imported_at,
        created_by_user_id
       FROM nutrition_foods
       WHERE consultancy_id = ?
         AND source_key = 'TACO'
         AND deleted_at IS NULL;`,
      [consultancyId]
    );

    const existingMap = new Map();
    for (const r of existingRows) {
      existingMap.set(String(r.source_external_code), r);
    }

    const planInserts = [];
    const planUpdates = [];
    const planUnchanged = [];

    for (const food of parsed.accepted) {
      const existing = existingMap.get(food.externalCode);
      if (!existing) {
        planInserts.push(food);
      } else {
        // Compare source-controlled fields
        const isSame =
          existing.name === food.name &&
          existing.normalized_name === food.normalizedName &&
          (existing.category || null) === (food.category || null) &&
          Number(existing.reference_amount) === Number(food.referenceAmount) &&
          existing.reference_unit === food.referenceUnit &&
          Number(existing.calories_kcal) === Number(food.caloriesKcal) &&
          Number(existing.protein_g) === Number(food.proteinG) &&
          Number(existing.carbohydrate_g) === Number(food.carbohydrateG) &&
          Number(existing.fat_g) === Number(food.fatG) &&
          existing.source_type === "EXTERNAL" &&
          existing.source_key === SOURCE_KEY &&
          existing.source_label === SOURCE_LABEL &&
          existing.source_version === SOURCE_VERSION &&
          existing.source_reference === SOURCE_REFERENCE;

        if (isSame) {
          planUnchanged.push(food);
        } else {
          planUpdates.push({ food, existingId: existing.id });
        }
      }
    }

    console.log("\n--- RELATÓRIO ESTRUTURADO DA FONTE ---");
    console.log("Fonte:              TACO / NEPA-UNICAMP (4ª edição revisada e ampliada, 2011)");
    console.log(`SHA-256 verificado: ${parsed.computedHash}`);
    console.log(`Worksheet:          ${EXPECTED_SHEET_NAME}`);
    console.log(`Total na fonte:     597 alimentos`);
    console.log(`Aceitos (V1):       ${parsed.accepted.length}`);
    console.log(`Rejeitados (V1):    ${parsed.rejected.length}`);
    console.log(`Artefatos carboidrato normalizados para 0,0: 4 (IDs: ${parsed.negativeArtifacts.map(n => n.id).join(", ")})`);

    console.log("\n--- PLANO DE EXECUÇÃO NO BANCO ---");
    console.log(`Banco de dados:     ${dbConfig.database} (DEVELOPMENT)`);
    console.log(`Consultoria:        ${consultancy.name} (${consultancy.slug})`);
    console.log(`Alimentos TACO existentes: ${existingRows.length}`);
    console.log(`INSERTS planejados: ${planInserts.length}`);
    console.log(`UPDATES planejados: ${planUpdates.length}`);
    console.log(`UNCHANGED:          ${planUnchanged.length}`);

    if (!args.isApply) {
      console.log("\n=== DRY RUN CONCLUÍDO COM SUCESSO ===");
      console.log("Writes executados no banco: 0");
      console.log("Para aplicar as inserções/atualizações, execute novamente com o parâmetro --apply.");
      return;
    }

    // APPLY EXECUTION
    console.log("\n=== INICIANDO TRANSAÇÃO DE IMPORTAÇÃO (--apply) ===");
    await connection.beginTransaction();

    // Lock consultancy row during maintenance import
    await connection.execute(
      "SELECT id FROM consultancies WHERE id = ? FOR UPDATE;",
      [consultancyId]
    );

    const importTimestamp = new Date();

    // Insert new foods
    const insertSql = `
      INSERT INTO nutrition_foods (
        public_id,
        consultancy_id,
        name,
        normalized_name,
        category,
        reference_amount,
        reference_unit,
        calories_kcal,
        protein_g,
        carbohydrate_g,
        fat_g,
        status,
        source_type,
        source_key,
        source_label,
        source_external_code,
        source_version,
        source_reference,
        source_imported_at,
        created_by_user_id,
        created_at,
        updated_at,
        deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'EXTERNAL', ?, ?, ?, ?, ?, ?, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), NULL);
    `;

    for (const food of planInserts) {
      const publicId = crypto.randomUUID();
      await connection.execute(insertSql, [
        publicId,
        consultancyId,
        food.name,
        food.normalizedName,
        food.category,
        food.referenceAmount,
        food.referenceUnit,
        food.caloriesKcal,
        food.proteinG,
        food.carbohydrateG,
        food.fatG,
        SOURCE_KEY,
        SOURCE_LABEL,
        food.externalCode,
        SOURCE_VERSION,
        SOURCE_REFERENCE,
        importTimestamp,
      ]);
    }

    // Update existing foods if any
    const updateSql = `
      UPDATE nutrition_foods
      SET
        name = ?,
        normalized_name = ?,
        category = ?,
        reference_amount = ?,
        reference_unit = ?,
        calories_kcal = ?,
        protein_g = ?,
        carbohydrate_g = ?,
        fat_g = ?,
        source_type = 'EXTERNAL',
        source_key = ?,
        source_label = ?,
        source_version = ?,
        source_reference = ?,
        source_imported_at = ?,
        updated_at = CURRENT_TIMESTAMP(3)
      WHERE consultancy_id = ?
        AND source_key = ?
        AND source_external_code = ?
        AND deleted_at IS NULL;
    `;

    for (const item of planUpdates) {
      const food = item.food;
      await connection.execute(updateSql, [
        food.name,
        food.normalizedName,
        food.category,
        food.referenceAmount,
        food.referenceUnit,
        food.caloriesKcal,
        food.proteinG,
        food.carbohydrateG,
        food.fatG,
        SOURCE_KEY,
        SOURCE_LABEL,
        SOURCE_VERSION,
        SOURCE_REFERENCE,
        importTimestamp,
        consultancyId,
        SOURCE_KEY,
        food.externalCode,
      ]);
    }

    await connection.commit();

    console.log("=== TRANSAÇÃO CONFIRMADA COM SUCESSO ===");
    console.log(`Novos alimentos inseridos:     ${planInserts.length}`);
    console.log(`Alimentos existentes atualizados: ${planUpdates.length}`);
    console.log(`Alimentos inalterados:          ${planUnchanged.length}`);
    console.log(`Alimentos rejeitados da fonte:  ${parsed.rejected.length}`);
    console.log(`Timestamp de importação UTC:    ${importTimestamp.toISOString()}`);
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
        console.error("Transação revertida (ROLLBACK executado).");
      } catch (rollbackErr) {
        console.error("Erro no rollback:", rollbackErr.message);
      }
    }
    console.error("ERRO DURANTE A IMPORTAÇÃO:", err.message);
    process.exit(1);
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch {}
    }
    if (pool) {
      try {
        await pool.end();
      } catch {}
    }
  }
}

main().catch(err => {
  console.error("FATAL ERROR:", err.message);
  process.exit(1);
});
