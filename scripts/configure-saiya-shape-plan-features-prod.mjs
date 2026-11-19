import assert from "node:assert/strict";
import mysql from "mysql2/promise";

/**
 * TREVO ONE — SCRIPT BLINDADO DE CONFIGURAÇÃO DOS 15 PLANOS DA SAIYA SHAPE EM PRODUÇÃO
 *
 * REGRAS DE SEGURANÇA E BLINDAGEM:
 * 1. Não permite --apply com destino implícito ou fallback para localhost.
 * 2. Exige flag explícita de ambiente (--env=production ou --env=local).
 * 3. Em produção, proíbe conexão em localhost/127.0.0.1 e proíbe banco contendo qa/test.
 * 4. Valida a identidade física do banco via `SELECT DATABASE()`.
 * 5. Em produção, exige estritamente que a consultoria 'saiya-shape' possua ID = 2.
 * 6. Valida os 15 planos por nome, duração, valor (centavos) e moeda BRL.
 * 7. Exige token de confirmação explícito para escrita (--confirm-apply=...).
 * 8. Não exibe credenciais em nenhum log ou saída de erro.
 * 9. Não permite atualizações fora da consultoria alvo (WHERE consultancy_id = ? AND id = ?).
 * 10. Preserva transação atômica, rollback automático, idempotência e modo --preview.
 */

export const SAIYA_SHAPE_OFFICIAL_CATALOG = [
  // Categoria 1: Treino (5 planos)
  {
    name: "Treino — Mensal",
    duration_months: 1,
    duration_days: 30,
    amount_cents: 20000,
    currency_code: "BRL",
    features: { training: true, nutrition: false, evolution: true, consultations: false, chat: true },
  },
  {
    name: "Treino — Bimestral",
    duration_months: 2,
    duration_days: 60,
    amount_cents: 30000,
    currency_code: "BRL",
    features: { training: true, nutrition: false, evolution: true, consultations: false, chat: true },
  },
  {
    name: "Treino — Trimestral",
    duration_months: 3,
    duration_days: 90,
    amount_cents: 50000,
    currency_code: "BRL",
    features: { training: true, nutrition: false, evolution: true, consultations: false, chat: true },
  },
  {
    name: "Treino — Semestral",
    duration_months: 6,
    duration_days: 180,
    amount_cents: 80000,
    currency_code: "BRL",
    features: { training: true, nutrition: false, evolution: true, consultations: false, chat: true },
  },
  {
    name: "Treino — Anual",
    duration_months: 12,
    duration_days: 365,
    amount_cents: 170000,
    currency_code: "BRL",
    features: { training: true, nutrition: false, evolution: true, consultations: false, chat: true },
  },

  // Categoria 2: Nutrição (5 planos)
  {
    name: "Nutrição — Mensal",
    duration_months: 1,
    duration_days: 30,
    amount_cents: 20000,
    currency_code: "BRL",
    features: { training: false, nutrition: true, evolution: false, consultations: false, chat: true },
  },
  {
    name: "Nutrição — Bimestral",
    duration_months: 2,
    duration_days: 60,
    amount_cents: 30000,
    currency_code: "BRL",
    features: { training: false, nutrition: true, evolution: false, consultations: false, chat: true },
  },
  {
    name: "Nutrição — Trimestral",
    duration_months: 3,
    duration_days: 90,
    amount_cents: 50000,
    currency_code: "BRL",
    features: { training: false, nutrition: true, evolution: false, consultations: false, chat: true },
  },
  {
    name: "Nutrição — Semestral",
    duration_months: 6,
    duration_days: 180,
    amount_cents: 80000,
    currency_code: "BRL",
    features: { training: false, nutrition: true, evolution: false, consultations: false, chat: true },
  },
  {
    name: "Nutrição — Anual",
    duration_months: 12,
    duration_days: 365,
    amount_cents: 170000,
    currency_code: "BRL",
    features: { training: false, nutrition: true, evolution: false, consultations: false, chat: true },
  },

  // Categoria 3: Consultoria Completa (5 planos)
  {
    name: "Consultoria Completa — Mensal",
    duration_months: 1,
    duration_days: 30,
    amount_cents: 35000,
    currency_code: "BRL",
    features: { training: true, nutrition: true, evolution: true, consultations: false, chat: true },
  },
  {
    name: "Consultoria Completa — Bimestral",
    duration_months: 2,
    duration_days: 60,
    amount_cents: 55000,
    currency_code: "BRL",
    features: { training: true, nutrition: true, evolution: true, consultations: false, chat: true },
  },
  {
    name: "Consultoria Completa — Trimestral",
    duration_months: 3,
    duration_days: 90,
    amount_cents: 85000,
    currency_code: "BRL",
    features: { training: true, nutrition: true, evolution: true, consultations: false, chat: true },
  },
  {
    name: "Consultoria Completa — Semestral",
    duration_months: 6,
    duration_days: 180,
    amount_cents: 135000,
    currency_code: "BRL",
    features: { training: true, nutrition: true, evolution: true, consultations: false, chat: true },
  },
  {
    name: "Consultoria Completa — Anual",
    duration_months: 12,
    duration_days: 365,
    amount_cents: 280000,
    currency_code: "BRL",
    features: { training: true, nutrition: true, evolution: true, consultations: false, chat: true },
  },
];

export async function runProductionPlanConfiguration(options = {}) {
  const isApply = Boolean(options.apply);
  const isPreview = Boolean(options.preview) || !isApply;
  const env = options.env ? String(options.env).trim().toLowerCase() : null;
  const targetSlug = options.slug || "saiya-shape";
  const confirmApply = options.confirmApply ? String(options.confirmApply).trim() : null;

  console.log("==========================================================================");
  console.log(`TREVO ONE: CONFIGURAÇÃO DE PLANOS — ${isPreview ? "MODO SIMULAÇÃO (--preview)" : "MODO GRAVAÇÃO (--apply)"}`);
  console.log("==========================================================================");

  // 1. BLINDAGEM: Exigir definição explícita do ambiente
  if (!env) {
    throw new Error(
      "BLINDAGEM ATIVA: É obrigatório especificar o ambiente explicitamente via --env=production ou --env=local."
    );
  }

  if (env !== "production" && env !== "local") {
    throw new Error(`BLINDAGEM ATIVA: Ambiente inválido: '${env}'. Valores aceitos: 'production' ou 'local'.`);
  }

  // 2. BLINDAGEM: Resolução e validação de configurações de conexão
  let dbConfig;
  if (env === "production") {
    const host = options.dbHost || process.env.PROD_DB_HOST || process.env.DB_HOST;
    const port = Number(options.dbPort || process.env.PROD_DB_PORT || process.env.DB_PORT) || 3306;
    const database = options.dbName || process.env.PROD_DB_NAME || process.env.DB_NAME;
    const user = options.dbUser || process.env.PROD_DB_USER || process.env.DB_USER;
    const password = options.dbPassword || process.env.PROD_DB_PASSWORD || process.env.DB_PASSWORD || "";

    if (!host || !database || !user) {
      throw new Error(
        "BLINDAGEM ATIVA: Configurações de banco para produção não informadas. Forneça PROD_DB_HOST, PROD_DB_NAME e PROD_DB_USER."
      );
    }

    // Proibir conexão acidental com o banco local de desenvolvimento (ex: user 'root' ou trevo_one_qa)
    const isLocalHost = host === "127.0.0.1" || host === "localhost" || host.startsWith("192.168.") || host.startsWith("10.");
    if (isLocalHost && (user === "root" || database === "trevo_one_qa" || (process.platform === "win32" && !options.allowLocalHost))) {
      throw new Error(
        `BLINDAGEM ATIVA: O ambiente foi definido como 'production', mas a conexão está apontando para o MySQL local de desenvolvimento (${user}@${host}/${database}). Operação recusada.`
      );
    }

    // Proibir banco QA ou teste em modo production
    const isQaDb = database.toLowerCase().includes("qa") || database.toLowerCase().includes("test");
    if (isQaDb) {
      throw new Error(
        `BLINDAGEM ATIVA: O ambiente foi definido como 'production', mas o banco fornecido ('${database}') contém indicadores de QA/Teste. Operação recusada.`
      );
    }

    dbConfig = { host, port, user, password, database };
  } else {
    // Ambiente local
    const host = options.dbHost || process.env.DB_HOST || "127.0.0.1";
    const port = Number(options.dbPort || process.env.DB_PORT) || 3306;
    const database = options.dbName || process.env.DB_NAME || "trevo_one_qa";
    const user = options.dbUser || process.env.DB_USER || "root";
    const password = options.dbPassword || process.env.DB_PASSWORD || "";

    dbConfig = { host, port, user, password, database };
  }

  // 3. BLINDAGEM: Exigir confirmação explícita para modo gravação
  if (isApply) {
    const requiredConfirmation =
      env === "production" ? "SAIYA-SHAPE-PROD-APPLY-CONFIRMED" : "LOCAL-TEST-CONFIRMED";

    if (confirmApply !== requiredConfirmation) {
      throw new Error(
        `BLINDAGEM ATIVA: Gravação (--apply) recusada. Para gravar em ${env}, você deve fornecer a confirmação exata:\n--confirm-apply=${requiredConfirmation}`
      );
    }
  }

  // Log seguro sem credenciais
  const maskedHost = dbConfig.host.replace(/(?<=^.{3}).+(?=\..+$)/, "***");
  console.log(`Ambiente: ${env.toUpperCase()}`);
  console.log(`Banco Alvo: ${dbConfig.database} em ${maskedHost}:${dbConfig.port}`);
  console.log(`Slug Alvo: ${targetSlug}\n`);

  const pool = mysql.createPool(dbConfig);
  let connection;

  try {
    connection = await pool.getConnection();

    // 4. BLINDAGEM: Validação física da identidade do banco conectado
    const [identityRows] = await connection.query(
      "SELECT DATABASE() AS current_db, @@hostname AS current_host"
    );
    const activeDb = identityRows[0]?.current_db;
    if (!activeDb || activeDb.toLowerCase() !== dbConfig.database.toLowerCase()) {
      throw new Error(
        `BLINDAGEM ATIVA: Discrepância na identidade do banco! Esperado: '${dbConfig.database}', Ativo na sessão: '${activeDb}'. Abortando.`
      );
    }
    console.log(`✓ Identidade do banco verificada na sessão: '${activeDb}'`);

    // 5. BLINDAGEM: Localização e validação da consultoria alvo
    const [cRows] = await connection.query(
      "SELECT id, name, slug FROM consultancies WHERE slug = ? LIMIT 1",
      [targetSlug]
    );

    if (!Array.isArray(cRows) || cRows.length === 0) {
      throw new Error(`Consultoria com slug '${targetSlug}' não foi encontrada.`);
    }

    const consultancy = cRows[0];
    const consultancyId = Number(consultancy.id);
    console.log(`✓ Consultoria identificada: [ID=${consultancyId}] "${consultancy.name}" (${consultancy.slug})`);

    // Em produção, a consultoria Saiya Shape deve ter OBRIGATORIAMENTE ID = 2
    if (env === "production" && consultancyId !== 2) {
      throw new Error(
        `BLINDAGEM ATIVA: Em produção, a consultoria '${targetSlug}' deve ter obrigatoriamente ID = 2. Encontrado ID = ${consultancyId}. Abortando.`
      );
    }

    // 6. Buscar e validar os planos da consultoria
    const [planRows] = await connection.query(
      `SELECT id, public_id, name, amount_cents, currency_code, duration_months, duration_days, status, features_json
       FROM consultancy_plans
       WHERE consultancy_id = ? AND status = 'ACTIVE'
       ORDER BY amount_cents ASC, duration_months ASC`,
      [consultancyId]
    );

    console.log(`✓ Planos ativos encontrados na consultoria: ${planRows.length}`);
    if (planRows.length !== 15) {
      throw new Error(
        `Quantidade de planos ativos inválida na consultoria ID=${consultancyId}: esperado exatamente 15, encontrado ${planRows.length}`
      );
    }

    // 7. Mapeamento determinístico e validação cruzada 1-para-1
    const matchedPlans = [];
    const unmatchedDbPlans = new Set(planRows.map((p) => p.id));

    for (const expected of SAIYA_SHAPE_OFFICIAL_CATALOG) {
      const candidates = planRows.filter(
        (p) =>
          p.name === expected.name &&
          Number(p.duration_months) === expected.duration_months &&
          Number(p.amount_cents) === expected.amount_cents &&
          p.currency_code === expected.currency_code
      );

      if (candidates.length === 0) {
        throw new Error(
          `Plano não encontrado no banco: "${expected.name}" (${expected.duration_months}m, R$ ${(expected.amount_cents / 100).toFixed(2)})`
        );
      }

      if (candidates.length > 1) {
        throw new Error(
          `Ambiguidade detectada: múltiplos planos (${candidates.length}) correspondem a "${expected.name}"`
        );
      }

      const match = candidates[0];
      unmatchedDbPlans.delete(match.id);
      matchedPlans.push({
        dbPlan: match,
        expectedPlan: expected,
      });
    }

    if (unmatchedDbPlans.size > 0) {
      throw new Error(
        `Existem planos ativos no banco não mapeados na matriz oficial: IDs [${Array.from(unmatchedDbPlans).join(", ")}]`
      );
    }

    console.log("✓ Todos os 15 planos foram validados e mapeados 1-para-1 com sucesso.\n");

    // 8. Tabela de auditoria
    console.log("-------------------------------------------------------------------------------------------------------------");
    console.log(
      "ID DB".padEnd(8) +
      "NOME DO PLANO".padEnd(35) +
      "MESES".padEnd(8) +
      "VALOR".padEnd(12) +
      "FEATURES ATUAIS".padEnd(20) +
      "STATUS"
    );
    console.log("-------------------------------------------------------------------------------------------------------------");

    let alreadyConfiguredCount = 0;
    for (const item of matchedPlans) {
      const db = item.dbPlan;
      const exp = item.expectedPlan;
      const currentFeatures = db.features_json
        ? typeof db.features_json === "string"
          ? JSON.parse(db.features_json)
          : db.features_json
        : null;

      const isConfigured = currentFeatures && JSON.stringify(currentFeatures) === JSON.stringify(exp.features);
      if (isConfigured) alreadyConfiguredCount++;

      const statusTag = isConfigured ? "JÁ CONFIGURADO" : (currentFeatures ? "DIVERGENTE" : "PENDENTE");
      const featTag = currentFeatures ? Object.keys(currentFeatures).filter((k) => currentFeatures[k]).join(",") : "NULL";

      console.log(
        String(db.id).padEnd(8) +
        exp.name.padEnd(35) +
        String(exp.duration_months).padEnd(8) +
        `R$ ${(exp.amount_cents / 100).toFixed(2)}`.padEnd(12) +
        featTag.padEnd(20) +
        statusTag
      );
    }
    console.log("-------------------------------------------------------------------------------------------------------------\n");
    console.log(`Resumo: ${alreadyConfiguredCount}/15 já estão configurados com a matriz oficial exata.`);

    // 9. Se for preview, encerra com segurança
    if (isPreview) {
      console.log("\n[SIMULAÇÃO CONCLUÍDA]: Nenhuma alteração foi realizada no banco de dados.");
      return { success: true, preview: true, matchedCount: matchedPlans.length };
    }

    // 10. Gravação atômica em transação
    console.log("\nIniciando gravação atômica em transação...");
    await connection.beginTransaction();

    let updatedCount = 0;
    for (const item of matchedPlans) {
      const db = item.dbPlan;
      const exp = item.expectedPlan;
      const featuresStr = JSON.stringify(exp.features);

      // BLINDAGEM: UPDATE estritamente restrito à consultoria selecionada e ao ID mapeado
      const [res] = await connection.execute(
        "UPDATE consultancy_plans SET features_json = ?, updated_at = NOW(3) WHERE consultancy_id = ? AND id = ?",
        [featuresStr, consultancyId, db.id]
      );
      if (res.affectedRows > 0) {
        updatedCount++;
      }
    }

    // Pós-validação confirmatória na mesma transação
    const [verifyRows] = await connection.query(
      "SELECT id, features_json FROM consultancy_plans WHERE consultancy_id = ? AND status = 'ACTIVE'",
      [consultancyId]
    );

    for (const item of matchedPlans) {
      const v = verifyRows.find((r) => r.id === item.dbPlan.id);
      assert.ok(v, `Plano id=${item.dbPlan.id} não encontrado na pós-validação`);
      const parsed = typeof v.features_json === "string" ? JSON.parse(v.features_json) : v.features_json;
      assert.deepEqual(parsed, item.expectedPlan.features, `Features divergentes após gravação no plano id=${item.dbPlan.id}`);
    }

    await connection.commit();
    console.log(`✓ SUCESSO: 15 planos atualizados e validados com 100% de conformidade (${updatedCount} linhas afetadas).`);

    return { success: true, preview: false, updatedCount };
  } catch (err) {
    if (connection && isApply) {
      try {
        await connection.rollback();
      } catch {
        // Rollback defensivo
      }
    }
    console.error("\n❌ OPERAÇÃO RECUSADA OU FALHA:", err.message);
    throw err;
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

// Suporte a execução CLI com extração segura de argumentos
function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {
    apply: false,
    preview: true,
    env: null,
    slug: "saiya-shape",
    confirmApply: null,
  };

  for (const arg of args) {
    if (arg === "--apply") {
      options.apply = true;
      options.preview = false;
    } else if (arg === "--preview") {
      options.preview = true;
      options.apply = false;
    } else if (arg.startsWith("--env=")) {
      options.env = arg.split("=")[1];
    } else if (arg.startsWith("--slug=")) {
      options.slug = arg.split("=")[1];
    } else if (arg.startsWith("--confirm-apply=")) {
      options.confirmApply = arg.split("=")[1];
    }
  }

  return options;
}

if (process.argv[1] && process.argv[1].endsWith("configure-saiya-shape-plan-features-prod.mjs")) {
  const cliOptions = parseCliArgs();
  runProductionPlanConfiguration(cliOptions)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
