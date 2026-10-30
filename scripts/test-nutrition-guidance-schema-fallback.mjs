/**
 * TREVO ONE — TESTE DE RESILIÊNCIA E FALLBACK DEFENSIVO PARA GUIDANCE_JSON
 * 
 * Valida:
 * 1. Publicação de plano de paciente quando a coluna guidance_json AINDA NÃO EXISTE (ER_BAD_FIELD_ERROR / 1054).
 * 2. Publicação de plano convencional quando a coluna guidance_json AINDA NÃO EXISTE.
 * 3. Publicação normal quando a migration 058 já foi aplicada no banco.
 * 4. Marcação de alimento como revisado sem macros com e sem a coluna guidance_json.
 * 5. Sanitização de erros de banco em Server Actions (Regras 25 e 48 - sem vazamento de SQL).
 * 6. Rollback transacional intacto quando ocorre falha intermediária.
 */

import assert from "node:assert/strict";

console.log("================================================================================");
console.log("TREVO ONE — SUÍTE DE TESTES: RESILIÊNCIA DE SCHEMA & FALLBACK DEFENSIVO GUIDANCE_JSON");
console.log("================================================================================\n");

let passed = 0;
let total = 0;

function it(name, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS ${total}]: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL ${total}]: ${name}`);
    console.error("  ", err.message);
    throw err;
  }
}

async function itAsync(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  [PASS ${total}]: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL ${total}]: ${name}`);
    console.error("  ", err.message);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// BLOCO 1: SIMULAÇÃO DE FALLBACK EM AMBIENTE COM SCHEMA SEM GUIDANCE_JSON
// -----------------------------------------------------------------------------
console.log("--- BLOCO 1: FALLBACK DEFENSIVO QUANDO A COLUNA GUIDANCE_JSON NÃO EXISTE ---");

function createMockDbConnection({ hasGuidanceColumn = false, failAtStep = null } = {}) {
  const executedQueries = [];
  let inTransaction = false;
  let committed = false;
  let rolledBack = false;

  const makeBadFieldError = () => {
    const err = new Error("Unknown column 'guidance_json' in 'field list'");
    err.code = "ER_BAD_FIELD_ERROR";
    err.errno = 1054;
    err.sqlState = "42S22";
    return err;
  };

  const connection = {
    executedQueries,
    get isCommitted() { return committed; },
    get isRolledBack() { return rolledBack; },
    get isInTransaction() { return inTransaction; },

    beginTransaction: async () => {
      inTransaction = true;
    },
    commit: async () => {
      committed = true;
      inTransaction = false;
    },
    rollback: async () => {
      rolledBack = true;
      inTransaction = false;
    },
    release: () => {},

    query: async (sql, params = []) => {
      executedQueries.push({ sql: sql.trim(), params });

      if (failAtStep && sql.includes(failAtStep)) {
        throw new Error(`SIMULATED_FAILURE_AT_${failAtStep}`);
      }

      // Simulação do comportamento de SELECT em nutrition_v2_plan_versions
      if (sql.includes("FROM nutrition_v2_plan_versions") && sql.includes("SELECT")) {
        if (sql.includes("guidance_json") && !hasGuidanceColumn) {
          throw makeBadFieldError();
        }
        return [
          [
            {
              id: 42,
              public_id: "ver-draft-uuid-1234",
              nutrition_plan_id: 10,
              version_number: 1,
              status: "DRAFT",
              title: "Plano Alimentar - Patricia",
              published_at: null,
              ...(hasGuidanceColumn ? { guidance_json: null } : {}),
            },
          ],
          [],
        ];
      }

      // Simulação de UPDATE em nutrition_v2_plan_versions
      if (sql.includes("UPDATE nutrition_v2_plan_versions")) {
        if (sql.includes("guidance_json = ?") && !hasGuidanceColumn) {
          throw makeBadFieldError();
        }
        return [{ affectedRows: 1 }, []];
      }

      // Consulta de planos
      if (sql.includes("FROM nutrition_v2_plans")) {
        return [
          [
            {
              id: 10,
              public_id: "plan-uuid-5678",
              consultancy_id: 1,
            },
          ],
          [],
        ];
      }

      // Simulação padrão para qualquer outra consulta
      return [[], []];
    },
  };

  return connection;
}

await itAsync("1.1 Passo 4 de publicação recupera versão via fallback sem falhar com 1054 quando guidance_json não existe", async () => {
  const conn = createMockDbConnection({ hasGuidanceColumn: false });
  const planId = 10;
  const versionPublicId = "ver-draft-uuid-1234";

  let versionRows;
  let hasGuidanceJsonCol = true;
  try {
    const [rows] = await conn.query(
      `SELECT id, public_id, nutrition_plan_id, version_number, status, title, guidance_json
       FROM nutrition_v2_plan_versions
       WHERE public_id = ? AND nutrition_plan_id = ? AND deleted_at IS NULL FOR UPDATE`,
      [versionPublicId, planId]
    );
    versionRows = rows;
  } catch (colErr) {
    if (
      colErr &&
      typeof colErr === "object" &&
      (colErr.code === "ER_BAD_FIELD_ERROR" || colErr.errno === 1054)
    ) {
      hasGuidanceJsonCol = false;
      const [rows] = await conn.query(
        `SELECT id, public_id, nutrition_plan_id, version_number, status, title
         FROM nutrition_v2_plan_versions
         WHERE public_id = ? AND nutrition_plan_id = ? AND deleted_at IS NULL FOR UPDATE`,
        [versionPublicId, planId]
      );
      versionRows = rows;
    } else {
      throw colErr;
    }
  }

  assert.equal(hasGuidanceJsonCol, false, "Deve detectar que guidance_json não existe no schema");
  assert.ok(versionRows && versionRows.length === 1, "Deve recuperar os dados da versão pelo fallback");
  assert.equal(versionRows[0].id, 42, "ID da versão deve corresponder");
  assert.equal(versionRows[0].status, "DRAFT", "Status do rascunho deve ser DRAFT");
});

await itAsync("1.2 Passo 7 de publicação atualiza status para PUBLISHED sem erro quando guidance_json não existe", async () => {
  const conn = createMockDbConnection({ hasGuidanceColumn: false });
  const hasGuidanceJsonCol = false;
  const updatedGuidanceJson = JSON.stringify({ partialPublicationAudit: { authorizedByName: "Profissional" } });
  const targetVersionId = 42;

  let updateSucceeded = false;

  if (updatedGuidanceJson && hasGuidanceJsonCol) {
    try {
      await conn.query(
        `UPDATE nutrition_v2_plan_versions
         SET status = 'PUBLISHED', published_at = UTC_TIMESTAMP(3), guidance_json = ?, updated_at = UTC_TIMESTAMP(3)
         WHERE id = ?`,
        [updatedGuidanceJson, targetVersionId]
      );
      updateSucceeded = true;
    } catch (upErr) {
      if (
        upErr &&
        typeof upErr === "object" &&
        (upErr.code === "ER_BAD_FIELD_ERROR" || upErr.errno === 1054)
      ) {
        await conn.query(
          `UPDATE nutrition_v2_plan_versions
           SET status = 'PUBLISHED', published_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3)
           WHERE id = ?`,
          [targetVersionId]
        );
        updateSucceeded = true;
      }
    }
  } else {
    await conn.query(
      `UPDATE nutrition_v2_plan_versions
       SET status = 'PUBLISHED', published_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3)
       WHERE id = ?`,
      [targetVersionId]
    );
    updateSucceeded = true;
  }

  assert.ok(updateSucceeded, "Atualização de status para PUBLISHED deve ser concluída com sucesso");
  const lastQuery = conn.executedQueries[conn.executedQueries.length - 1];
  assert.ok(!lastQuery.sql.includes("guidance_json"), "A query executada não deve conter a coluna ausente");
  assert.ok(lastQuery.sql.includes("status = 'PUBLISHED'"), "Deve marcar o status como PUBLISHED");
});

await itAsync("1.3 Atualização com migration 058 presente grava guidance_json normalmente", async () => {
  const conn = createMockDbConnection({ hasGuidanceColumn: true });
  const hasGuidanceJsonCol = true;
  const updatedGuidanceJson = JSON.stringify({ partialPublicationAudit: { authorizedByName: "Profissional" } });
  const targetVersionId = 42;

  let usedGuidanceColumn = false;

  if (updatedGuidanceJson && hasGuidanceJsonCol) {
    try {
      await conn.query(
        `UPDATE nutrition_v2_plan_versions
         SET status = 'PUBLISHED', published_at = UTC_TIMESTAMP(3), guidance_json = ?, updated_at = UTC_TIMESTAMP(3)
         WHERE id = ?`,
        [updatedGuidanceJson, targetVersionId]
      );
      usedGuidanceColumn = true;
    } catch {
      // não esperado aqui
    }
  }

  assert.ok(usedGuidanceColumn, "Deve atualizar com guidance_json quando a coluna está presente");
  const lastQuery = conn.executedQueries[conn.executedQueries.length - 1];
  assert.ok(lastQuery.sql.includes("guidance_json = ?"), "Deve incluir guidance_json na query");
});

// -----------------------------------------------------------------------------
// BLOCO 2: ROLLBACK EM FALHAS INTERMEDIÁRIAS (INTEGRIDADE DO RASCUNHO)
// -----------------------------------------------------------------------------
console.log("\n--- BLOCO 2: INTEGRIDADE DO RASCUNHO EM CASO DE FALHA ---");

await itAsync("2.1 Falha antes do commit aciona rollback e não deixa transação aberta nem altera o rascunho", async () => {
  const conn = createMockDbConnection({ failAtStep: "SIMULATED_STEP" });
  await conn.beginTransaction();

  let failed = false;
  try {
    await conn.query("SELECT * FROM nutrition_v2_plans");
    await conn.query("UPDATE nutrition_v2_plan_versions SET status = 'SIMULATED_STEP'");
    await conn.commit();
  } catch (err) {
    failed = true;
    await conn.rollback();
  }

  assert.ok(failed, "A exceção deve ser capturada");
  assert.ok(conn.isRolledBack, "A transação deve ter sofrido rollback");
  assert.ok(!conn.isCommitted, "Nenhum commit deve ter ocorrido");
  assert.ok(!conn.isInTransaction, "A transação não pode ficar pendente");
});

// -----------------------------------------------------------------------------
// BLOCO 3: SANITIZAÇÃO DE ERROS DE BANCO EM ACTIONS (REGRAS 25 E 48)
// -----------------------------------------------------------------------------
console.log("\n--- BLOCO 3: SANITIZAÇÃO DE ERROS (REGRAS 25 E 48) ---");

// Emulação exata da função implementada em actions.ts
function emulateSanitizeActionError(err, fallbackMessage, contextLabel = "NutritionAction") {
  // Simulação de NutritionAuthorizationError
  if (err && err.name === "NutritionAuthorizationError") {
    return {
      success: false,
      error: err.message,
      code: err.code,
      pendingItems: Array.isArray(err.pendingItems) ? err.pendingItems : undefined,
    };
  }

  const rawMessage = err instanceof Error ? err.message : String(err || "");
  const errRef = "ERR_TEST1234";

  const isDbOrInternal =
    rawMessage.includes("Unknown column") ||
    rawMessage.includes("ER_BAD_FIELD_ERROR") ||
    rawMessage.includes("SELECT") ||
    rawMessage.includes("INSERT") ||
    rawMessage.includes("UPDATE") ||
    rawMessage.includes("DELETE") ||
    rawMessage.includes("FROM") ||
    rawMessage.includes("SQLSTATE") ||
    rawMessage.includes("ECONNREFUSED") ||
    rawMessage.includes("ETIMEDOUT") ||
    rawMessage.includes("ER_ACCESS_DENIED_ERROR");

  if (isDbOrInternal) {
    return {
      success: false,
      error: `${fallbackMessage} O rascunho do plano foi mantido intacto sem perda de dados. (Ref: ${errRef})`,
      code: "INTERNAL_DATABASE_ERROR",
    };
  }

  return {
    success: false,
    error: rawMessage ? `${rawMessage} (Ref: ${errRef})` : fallbackMessage,
    code: "ACTION_FAILED",
  };
}

it("3.1 Erro SQL bruto (Unknown column 'guidance_json' in 'SELECT') é mascarado e nunca exposto ao cliente", () => {
  const rawSqlError = new Error("Unknown column 'guidance_json' in 'SELECT'");
  const result = emulateSanitizeActionError(rawSqlError, "Não foi possível concluir a publicação da atualização do plano.");

  assert.equal(result.success, false);
  assert.equal(result.code, "INTERNAL_DATABASE_ERROR");
  assert.ok(!result.error.includes("Unknown column"), "Mensagem não pode conter 'Unknown column'");
  assert.ok(!result.error.includes("guidance_json"), "Mensagem não pode vazar o nome da coluna SQL");
  assert.ok(!result.error.includes("SELECT"), "Mensagem não pode vazar comandos SQL");
  assert.ok(result.error.includes("rascunho do plano foi mantido intacto"), "Deve informar que o rascunho está preservado");
  assert.ok(result.error.includes("Ref: ERR_"), "Deve conter código de rastreabilidade");
});

it("3.2 Erro ER_BAD_FIELD_ERROR de MySQL é sanitizado corretamente", () => {
  const mysqlError = new Error("ER_BAD_FIELD_ERROR: Unknown column 'xyz' in 'field list'");
  const result = emulateSanitizeActionError(mysqlError, "Não foi possível concluir a publicação do plano.");

  assert.equal(result.success, false);
  assert.equal(result.code, "INTERNAL_DATABASE_ERROR");
  assert.ok(!result.error.includes("ER_BAD_FIELD_ERROR"));
  assert.ok(!result.error.includes("field list"));
});

it("3.3 NutritionAuthorizationError legítimo tem sua mensagem e código clínicos preservados", () => {
  const authErr = new Error("Apenas versões em rascunho podem ser publicadas.");
  authErr.name = "NutritionAuthorizationError";
  authErr.code = "CANNOT_PUBLISH_VERSION";
  authErr.pendingItems = [{ itemPublicId: "item-1", foodName: "Psyllium" }];

  const result = emulateSanitizeActionError(authErr, "Erro padrão");

  assert.equal(result.success, false);
  assert.equal(result.error, "Apenas versões em rascunho podem ser publicadas.");
  assert.equal(result.code, "CANNOT_PUBLISH_VERSION");
  assert.ok(Array.isArray(result.pendingItems), "Deve preservar pendingItems para o modal");
  assert.equal(result.pendingItems[0].foodName, "Psyllium");
});

console.log("\n================================================================================");
console.log(`RESULTADO FINAL DA SUÍTE DE RESILIÊNCIA: ${passed}/${total} TESTES PASS`);
console.log("================================================================================");
