/**
 * TREVO ONE: QA SUITE — VALIDAÇÃO DOS CENÁRIOS DE INTEGRIDADE DO MIGRADOR
 *
 * Testa exaustivamente:
 * 1. Checksums legítimos (SHA-256 padrão) -> PASS
 * 2. Checksums históricos especiais autorizados (051 e 052 com 'runtime_bootstrapped') -> PASS (auditado)
 * 3. Checksum especial não autorizado (053 com 'runtime_bootstrapped') -> REJEITADO (FAIL com exit code 1)
 * 4. Checksum divergente/alterado em migration regular -> REJEITADO (FAIL com exit code 1)
 * 5. Isolamento estrito de --only=077 (ignora 070 a 076 sem executá-las) -> PASS
 * 6. Modo de simulação (--preview) com ZERO gravações no banco -> PASS
 */

import mysql from "mysql2/promise";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";

const execAsync = promisify(exec);

async function runCommand(cmd) {
  try {
    const { stdout, stderr } = await execAsync(cmd, { env: process.env });
    return { code: 0, stdout, stderr };
  } catch (err) {
    return {
      code: err.code || 1,
      stdout: err.stdout || "",
      stderr: err.stderr || err.message,
    };
  }
}

async function main() {
  console.log("==========================================================================");
  console.log("TREVO ONE: QA SUITE — VALIDAÇÃO DE INTEGRIDADE E CENÁRIOS DO MIGRADOR");
  console.log("==========================================================================");

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "trevo_one_qa",
  });

  // Salvar backup em memória de schema_migrations para restauração perfeita ao final
  const [originalMigrations] = await conn.query(
    "SELECT migration, checksum, applied_at FROM schema_migrations ORDER BY migration ASC;"
  );
  console.log(`✓ Backup em memória do banco local carregado (${originalMigrations.length} registros).`);

  async function restoreOriginalState() {
    await conn.query("TRUNCATE TABLE schema_migrations;");
    for (const r of originalMigrations) {
      await conn.query(
        "INSERT INTO schema_migrations (migration, checksum, applied_at) VALUES (?, ?, ?);",
        [r.migration, r.checksum, r.applied_at]
      );
    }
  }

  try {
    // -------------------------------------------------------------------------
    // CENÁRIO 1: Checksum Legítimo (SHA-256 padrão em todas)
    // -------------------------------------------------------------------------
    console.log("\n[CENÁRIO 1] Testando validação com checksums legítimos padrão...");
    const res1 = await runCommand("node scripts/migrate-db.mjs --preview");
    assert.equal(res1.code, 0, "Migrador em modo preview deve retornar código 0 com checksums válidos");
    assert.ok(res1.stdout.includes("SIMULAÇÃO CONCLUÍDA COM SUCESSO"), "Deve concluir simulação");
    console.log(" -> PASS: Checksums SHA-256 padrão validados com 100% de sucesso.");

    // -------------------------------------------------------------------------
    // CENÁRIO 2: Histórico Especial Autorizado (051 e 052 como 'runtime_bootstrapped')
    // -------------------------------------------------------------------------
    console.log("\n[CENÁRIO 2] Testando exceção autorizada para 051 e 052 ('runtime_bootstrapped')...");
    await conn.query(
      "UPDATE schema_migrations SET checksum = 'runtime_bootstrapped' WHERE migration IN ('051_trevo_chat_and_anamnesis.sql', '052_trevo_chat_bilateral_appointments.sql');"
    );

    const res2 = await runCommand("node scripts/migrate-db.mjs --preview");
    assert.equal(res2.code, 0, "Exceção autorizada deve passar com código 0");
    assert.ok(
      res2.stdout.includes("2 registro(s) com checksum histórico especial autorizado"),
      "Deve auditar e listar exatamente 2 exceções autorizadas"
    );
    assert.ok(
      res2.stdout.includes("051_trevo_chat_and_anamnesis.sql [runtime_bootstrapped]") &&
      res2.stdout.includes("052_trevo_chat_bilateral_appointments.sql [runtime_bootstrapped]"),
      "Deve citar explicitamente 051 e 052"
    );
    console.log(" -> PASS: Exceção auditável restrita a 051 e 052 aceita e documentada no log.");

    // -------------------------------------------------------------------------
    // CENÁRIO 3: Histórico Especial NÃO Autorizado (053 como 'runtime_bootstrapped')
    // -------------------------------------------------------------------------
    console.log("\n[CENÁRIO 3] Testando rejeição de 'runtime_bootstrapped' em migration não autorizada (053)...");
    await conn.query(
      "UPDATE schema_migrations SET checksum = 'runtime_bootstrapped' WHERE migration = '053_exercise_aliases_and_search.sql';"
    );

    const res3 = await runCommand("node scripts/migrate-db.mjs --preview");
    assert.equal(res3.code, 1, "Migrador DEVE abortar com código 1 para migration não autorizada");
    assert.ok(
      res3.stderr.includes("ERRO DE INTEGRIDADE DE MIGRATION") || res3.stdout.includes("ERRO DE INTEGRIDADE DE MIGRATION"),
      "Deve emitir erro de integridade de migration"
    );
    assert.ok(
      res3.stderr.includes("053_exercise_aliases_and_search.sql") || res3.stdout.includes("053_exercise_aliases_and_search.sql"),
      "Deve apontar especificamente a migration 053 como inválida"
    );
    console.log(" -> PASS: 'runtime_bootstrapped' em arquivo não autorizado (053) foi estritamente rejeitado.");

    // Reverter 053
    await restoreOriginalState();

    // -------------------------------------------------------------------------
    // CENÁRIO 4: Checksum Divergente/Adulterado em migration regular (001 com hash falso)
    // -------------------------------------------------------------------------
    console.log("\n[CENÁRIO 4] Testando rejeição de hash divergente/adulterado em migration regular (001)...");
    await conn.query(
      "UPDATE schema_migrations SET checksum = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' WHERE migration = '001_initial_schema.sql';"
    );

    const res4 = await runCommand("node scripts/migrate-db.mjs --preview");
    assert.equal(res4.code, 1, "Migrador DEVE abortar com código 1 para hash divergente");
    assert.ok(
      res4.stderr.includes("ERRO DE INTEGRIDADE DE MIGRATION") || res4.stdout.includes("ERRO DE INTEGRIDADE DE MIGRATION"),
      "Deve emitir erro de integridade de migration"
    );
    assert.ok(
      res4.stderr.includes("001_initial_schema.sql") || res4.stdout.includes("001_initial_schema.sql"),
      "Deve apontar a migration 001 como divergente"
    );
    console.log(" -> PASS: Checksum adulterado na migration 001 foi estritamente bloqueado.");

    // Reverter 001
    await restoreOriginalState();

    // -------------------------------------------------------------------------
    // CENÁRIO 5: Isolamento de --only=077 (ignora 070 a 076 sem executá-las)
    // -------------------------------------------------------------------------
    console.log("\n[CENÁRIO 5] Testando isolamento estrito de --only=077 (com 070 a 076 ausentes)...");
    // Simula estado de produção: 051 e 052 com runtime_bootstrapped, e 070 a 077 NÃO registradas
    await conn.query(
      "UPDATE schema_migrations SET checksum = 'runtime_bootstrapped' WHERE migration IN ('051_trevo_chat_and_anamnesis.sql', '052_trevo_chat_bilateral_appointments.sql');"
    );
    await conn.query(
      "DELETE FROM schema_migrations WHERE migration >= '070_trevo_chat_user_visibility.sql';"
    );

    const res5 = await runCommand(
      "node scripts/migrate-db.mjs --preview --only=077_custom_charges_and_plan_features.sql"
    );
    assert.equal(res5.code, 0, "Simulação da 077 isolada deve ter sucesso");
    assert.ok(
      res5.stdout.includes("[Modo Seletivo]: Executando exclusivamente a migration '077_custom_charges_and_plan_features.sql'"),
      "Deve confirmar execução exclusiva da 077"
    );
    assert.ok(
      res5.stdout.includes("[Isolamento]: 7 migration(s) intermediária(s) ausente(s) no histórico NÃO serão executadas"),
      "Deve confirmar isolamento das 7 migrations intermediárias (070 a 076)"
    );
    assert.ok(
      res5.stdout.includes("Pré-requisitos estruturais da migration 077 validados"),
      "Deve validar pré-requisitos estruturais da 077"
    );
    assert.ok(
      res5.stdout.includes("NENHUMA ALTERAÇÃO FOI REALIZADA NO BANCO DE DADOS"),
      "Modo preview não deve fazer alterações"
    );

    // Conferir se nenhuma migration foi inserida em schema_migrations
    const [checkDb] = await conn.query("SELECT COUNT(*) AS total FROM schema_migrations WHERE migration >= '070';");
    assert.equal(Number(checkDb[0].total), 0, "Modo preview NÃO deve gravar em schema_migrations");
    console.log(" -> PASS: Isolamento estrito de --only=077 comprovado. Zero execuções de 070 a 076.");

    // -------------------------------------------------------------------------
    // CENÁRIO 6: Pré-requisitos da 077 (Falha segura se houver assinaturas órfãs)
    // -------------------------------------------------------------------------
    console.log("\n[CENÁRIO 6] Testando falha segura de pré-requisito se existirem órfãos...");
    // Inserir temporariamente uma assinatura com charge_id inexistente (órfão) desativando FK checks na conexão de teste
    await conn.query("SET FOREIGN_KEY_CHECKS = 0;");
    const [insDummy] = await conn.query(
      `INSERT INTO student_plan_subscriptions (
         public_id, consultancy_id, student_membership_id, plan_id, charge_id, status, started_at, created_at, updated_at
       ) VALUES (UUID(), 1, 1, 1, 999999999, 'ACTIVE', NOW(), NOW(), NOW());`
    );
    await conn.query("SET FOREIGN_KEY_CHECKS = 1;");

    const res6 = await runCommand(
      "node scripts/migrate-db.mjs --preview --only=077_custom_charges_and_plan_features.sql"
    );
    assert.equal(res6.code, 1, "Migrador DEVE abortar se existirem assinaturas órfãs");
    assert.ok(
      res6.stderr.includes("charge_id órfão") || res6.stdout.includes("charge_id órfão"),
      "Deve reportar violação por charge_id órfão"
    );
    console.log(" -> PASS: Falha segura ativada: detectou assinatura órfã e impediu que a FK falhasse no MySQL.");

    // Limpar dummy
    await conn.query("SET FOREIGN_KEY_CHECKS = 0;");
    await conn.query("DELETE FROM student_plan_subscriptions WHERE id = ?;", [insDummy.insertId]);
    await conn.query("SET FOREIGN_KEY_CHECKS = 1;");

    console.log("\n==========================================================================");
    console.log("SUCESSO: TODOS OS 6 CENÁRIOS DE INTEGRIDADE DO MIGRADOR PASSARAM COM 100%!");
    console.log("==========================================================================");
  } finally {
    await restoreOriginalState();
    console.log("✓ Estado original da tabela schema_migrations restaurado integralmente no banco local.");
    await conn.end();
  }
}

main().catch((err) => {
  console.error("ERRO FATAL NA SUÍTE DE TESTES:", err);
  process.exit(1);
});
