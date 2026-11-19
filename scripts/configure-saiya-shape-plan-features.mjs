import assert from "node:assert/strict";
import mysql from "mysql2/promise";

const DB_CONFIG = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "trevo_one_qa",
};

// Guardrail: must NEVER run against production database
if (DB_CONFIG.database !== "trevo_one_qa" && !DB_CONFIG.database.includes("qa") && !DB_CONFIG.database.includes("test")) {
  console.error("❌ ERRO: Este script deve ser executado exclusivamente em ambiente local/QA!");
  process.exit(1);
}

export const SAIYA_SHAPE_EXPECTED_PLANS = [
  // Categoria 1: Treino (Ids 1 a 5)
  {
    id: 1,
    public_id: "9c891165-e104-11f1-996d-74563cf280c7",
    name: "Treino — Mensal",
    duration_months: 1,
    duration_days: 30,
    amount_cents: 20000,
    category: "TREINO",
    features: { training: true, nutrition: false, evolution: true, consultations: false, chat: true },
  },
  {
    id: 2,
    public_id: "9c89907e-e104-11f1-996d-74563cf280c7",
    name: "Treino — Bimestral",
    duration_months: 2,
    duration_days: 60,
    amount_cents: 30000,
    category: "TREINO",
    features: { training: true, nutrition: false, evolution: true, consultations: false, chat: true },
  },
  {
    id: 3,
    public_id: "9c89d541-e104-11f1-996d-74563cf280c7",
    name: "Treino — Trimestral",
    duration_months: 3,
    duration_days: 90,
    amount_cents: 50000,
    category: "TREINO",
    features: { training: true, nutrition: false, evolution: true, consultations: false, chat: true },
  },
  {
    id: 4,
    public_id: "9c8a13d0-e104-11f1-996d-74563cf280c7",
    name: "Treino — Semestral",
    duration_months: 6,
    duration_days: 180,
    amount_cents: 80000,
    category: "TREINO",
    features: { training: true, nutrition: false, evolution: true, consultations: false, chat: true },
  },
  {
    id: 5,
    public_id: "9c8a5270-e104-11f1-996d-74563cf280c7",
    name: "Treino — Anual",
    duration_months: 12,
    duration_days: 365,
    amount_cents: 170000,
    category: "TREINO",
    features: { training: true, nutrition: false, evolution: true, consultations: false, chat: true },
  },

  // Categoria 2: Nutrição (Ids 6 a 10)
  {
    id: 6,
    public_id: "9c8a9034-e104-11f1-996d-74563cf280c7",
    name: "Nutrição — Mensal",
    duration_months: 1,
    duration_days: 30,
    amount_cents: 20000,
    category: "NUTRICAO",
    features: { training: false, nutrition: true, evolution: false, consultations: false, chat: true },
  },
  {
    id: 7,
    public_id: "9c8ae0f5-e104-11f1-996d-74563cf280c7",
    name: "Nutrição — Bimestral",
    duration_months: 2,
    duration_days: 60,
    amount_cents: 30000,
    category: "NUTRICAO",
    features: { training: false, nutrition: true, evolution: false, consultations: false, chat: true },
  },
  {
    id: 8,
    public_id: "9c8b44a3-e104-11f1-996d-74563cf280c7",
    name: "Nutrição — Trimestral",
    duration_months: 3,
    duration_days: 90,
    amount_cents: 50000,
    category: "NUTRICAO",
    features: { training: false, nutrition: true, evolution: false, consultations: false, chat: true },
  },
  {
    id: 9,
    public_id: "9c8b8798-e104-11f1-996d-74563cf280c7",
    name: "Nutrição — Semestral",
    duration_months: 6,
    duration_days: 180,
    amount_cents: 80000,
    category: "NUTRICAO",
    features: { training: false, nutrition: true, evolution: false, consultations: false, chat: true },
  },
  {
    id: 10,
    public_id: "9c8bc4ca-e104-11f1-996d-74563cf280c7",
    name: "Nutrição — Anual",
    duration_months: 12,
    duration_days: 365,
    amount_cents: 170000,
    category: "NUTRICAO",
    features: { training: false, nutrition: true, evolution: false, consultations: false, chat: true },
  },

  // Categoria 3: Consultoria Completa (Ids 11 a 15)
  {
    id: 11,
    public_id: "9c8c0164-e104-11f1-996d-74563cf280c7",
    name: "Consultoria Completa — Mensal",
    duration_months: 1,
    duration_days: 30,
    amount_cents: 35000,
    category: "COMPLETA",
    features: { training: true, nutrition: true, evolution: true, consultations: false, chat: true },
  },
  {
    id: 12,
    public_id: "9c8c4490-e104-11f1-996d-74563cf280c7",
    name: "Consultoria Completa — Bimestral",
    duration_months: 2,
    duration_days: 60,
    amount_cents: 55000,
    category: "COMPLETA",
    features: { training: true, nutrition: true, evolution: true, consultations: false, chat: true },
  },
  {
    id: 13,
    public_id: "9c8c8ab3-e104-11f1-996d-74563cf280c7",
    name: "Consultoria Completa — Trimestral",
    duration_months: 3,
    duration_days: 90,
    amount_cents: 85000,
    category: "COMPLETA",
    features: { training: true, nutrition: true, evolution: true, consultations: false, chat: true },
  },
  {
    id: 14,
    public_id: "9c8cfb91-e104-11f1-996d-74563cf280c7",
    name: "Consultoria Completa — Semestral",
    duration_months: 6,
    duration_days: 180,
    amount_cents: 135000,
    category: "COMPLETA",
    features: { training: true, nutrition: true, evolution: true, consultations: false, chat: true },
  },
  {
    id: 15,
    public_id: "9c8d642d-e104-11f1-996d-74563cf280c7",
    name: "Consultoria Completa — Anual",
    duration_months: 12,
    duration_days: 365,
    amount_cents: 280000,
    category: "COMPLETA",
    features: { training: true, nutrition: true, evolution: true, consultations: false, chat: true },
  },
];

export async function configureSaiyaShapePlanFeatures(pool) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    console.log("1. Validando contagem e integridade do catálogo da Saiya Shape (consultancy_id = 1)...");
    const [countRows] = await connection.query(
      "SELECT COUNT(*) AS total FROM consultancy_plans WHERE consultancy_id = 1"
    );
    const total = Number(countRows[0].total);
    if (total !== 15) {
      throw new Error(`Contagem de planos divergente: esperado exatamente 15, encontrado ${total}`);
    }

    // 2. Pré-validação estrita de cada um dos 15 planos antes de qualquer modificação
    console.log("2. Pré-validando cada um dos 15 registros comerciais (preço, nome, duração, identificador)...");
    for (const expected of SAIYA_SHAPE_EXPECTED_PLANS) {
      const [rows] = await connection.query(
        "SELECT * FROM consultancy_plans WHERE consultancy_id = 1 AND id = ? AND public_id = ?",
        [expected.id, expected.public_id]
      );
      if (rows.length === 0) {
        throw new Error(`Plano id=${expected.id} (public_id=${expected.public_id}) não encontrado.`);
      }
      const actual = rows[0];
      assert.equal(actual.name, expected.name, `Nome divergente no plano ${expected.id}`);
      assert.equal(Number(actual.amount_cents), expected.amount_cents, `Preço divergente no plano ${expected.id}`);
      assert.equal(Number(actual.duration_months), expected.duration_months, `Duração em meses divergente no plano ${expected.id}`);
      assert.equal(Number(actual.duration_days), expected.duration_days, `Duração em dias divergente no plano ${expected.id}`);
      assert.equal(actual.status, "ACTIVE", `Status não-ACTIVE no plano ${expected.id}`);
    }
    console.log(" -> Todos os 15 planos validados com 100% de conformidade.");

    // 3. Atualização controlada e idempotente de features_json
    console.log("3. Aplicando matriz de permissões modular features_json...");
    let updatedCount = 0;
    for (const expected of SAIYA_SHAPE_EXPECTED_PLANS) {
      const featuresJsonStr = JSON.stringify(expected.features);
      const [updateResult] = await connection.execute(
        "UPDATE consultancy_plans SET features_json = ?, updated_at = NOW(3) WHERE consultancy_id = 1 AND id = ? AND public_id = ?",
        [featuresJsonStr, expected.id, expected.public_id]
      );
      if (updateResult.affectedRows > 0) {
        updatedCount++;
      }
    }

    await connection.commit();
    console.log(` -> Matriz aplicada com sucesso (${updatedCount} registros alterados/revalidados).`);

    // 4. Pós-validação confirmatória
    console.log("4. Pós-validando catálogo após gravação...");
    const [finalRows] = await connection.query(
      "SELECT id, public_id, name, amount_cents, duration_months, features_json FROM consultancy_plans WHERE consultancy_id = 1 ORDER BY id"
    );
    for (let i = 0; i < 15; i++) {
      const actual = finalRows[i];
      const expected = SAIYA_SHAPE_EXPECTED_PLANS[i];
      assert.equal(actual.id, expected.id);
      assert.equal(actual.public_id, expected.public_id);
      assert.equal(actual.name, expected.name);
      assert.equal(Number(actual.amount_cents), expected.amount_cents);

      const parsedFeatures = typeof actual.features_json === "string" ? JSON.parse(actual.features_json) : actual.features_json;
      assert.deepEqual(parsedFeatures, expected.features, `features_json incorreto no plano ${expected.id}`);
    }

    console.log(" -> Pós-validação concluída: catálogo 100% íntegro e congelado.");
    return { success: true, count: 15 };
  } catch (err) {
    await connection.rollback();
    console.error("❌ FALHA NA CONFIGURAÇÃO DOS PLANOS:", err.message);
    throw err;
  } finally {
    connection.release();
  }
}

async function main() {
  console.log("==========================================================================");
  console.log("TREVO ONE: CONFIGURAÇÃO CONTROLADA DOS 15 PLANOS DA SAIYA SHAPE (ETAPA 6)");
  console.log("==========================================================================\n");

  const pool = mysql.createPool(DB_CONFIG);
  try {
    await configureSaiyaShapePlanFeatures(pool);
    console.log("\n==========================================================================");
    console.log("SUCESSO: OS 15 PLANOS COMERCIAIS FORAM CONFIGURADOS COM A MATRIZ OFICIAL!");
    console.log("==========================================================================");
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith("configure-saiya-shape-plan-features.mjs")) {
  main().catch(() => process.exit(1));
}
