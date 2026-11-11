/**
 * 🍀 TREVO ONE — TEST SUITE: FAIL-CLOSED TRAINING AI PILOT SECURITY GATE
 * 
 * Validates the strict security requirements for controlled AI rollout:
 * 1. Absent configuration -> BLOCKED (Fail-Closed).
 * 2. Empty or whitespace-only configuration -> BLOCKED.
 * 3. Asterisk/wildcard without explicit general release -> BLOCKED.
 * 4. Authorized account in whitelist -> ALLOWED.
 * 5. Unauthorized account -> BLOCKED.
 * 6. Case-insensitive email and publicId matching.
 * 7. Unauthenticated or malformed session -> BLOCKED.
 * 8. Explicit general release flag requirement (DESTINYAI_GENERAL_ACCESS_ENABLED="true").
 * 9. Protection across all 4 Server Actions.
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";

register(pathToFileURL(path.resolve("scripts/ts-loader.mjs")).href, import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("\n================================================================================");
console.log(" 🍀 TREVO ONE — AUDITORIA DE SEGURANÇA: LIBERAÇÃO PILOTO FAIL-CLOSED DA IA");
console.log("================================================================================\n");

// Dynamically import checkPilotAccess from lib/ai/pilot-access.ts
const pilotAccessModule = await import("../lib/ai/pilot-access.ts");
const { checkPilotAccess } = pilotAccessModule;

assert.strictEqual(typeof checkPilotAccess, "function", "checkPilotAccess deve ser uma função exportada");

let testsPassed = 0;
let testsTotal = 0;

function runTest(description, testFn) {
  testsTotal++;
  try {
    testFn();
    console.log(`  ✔ PASS [${testsTotal}]: ${description}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✖ FAIL [${testsTotal}]: ${description}`);
    console.error(err);
    process.exit(1);
  }
}

// Save initial environment
const originalPilotEmails = process.env.DESTINYAI_PILOT_EMAILS;
const originalGeneralAccess = process.env.DESTINYAI_GENERAL_ACCESS_ENABLED;

try {
  // TEST 1: Variável ausente (undefined) -> FAIL-CLOSED
  runTest("Variável ausente (DESTINYAI_PILOT_EMAILS=undefined): bloqueia qualquer usuário (FAIL-CLOSED)", () => {
    delete process.env.DESTINYAI_PILOT_EMAILS;
    delete process.env.DESTINYAI_GENERAL_ACCESS_ENABLED;

    const res = checkPilotAccess({ email: "personal@trevoone.com", userPublicId: "usr_123" });
    assert.strictEqual(res.allowed, false, "Deve ser bloqueado");
    assert.strictEqual(res.isPilotMode, true, "Deve estar em modo piloto");
    assert.ok(res.error?.includes("implan") || res.error?.includes("liberado"), "Mensagem de erro deve ser informativa");
  });

  // TEST 2: Variável vazia ("") -> FAIL-CLOSED
  runTest("Variável vazia (DESTINYAI_PILOT_EMAILS=''): bloqueia qualquer usuário", () => {
    process.env.DESTINYAI_PILOT_EMAILS = "";
    delete process.env.DESTINYAI_GENERAL_ACCESS_ENABLED;

    const res = checkPilotAccess({ email: "personal@trevoone.com" });
    assert.strictEqual(res.allowed, false, "Deve ser bloqueado");
    assert.strictEqual(res.isPilotMode, true);
  });

  // TEST 3: Variável com apenas espaços -> FAIL-CLOSED
  runTest("Variável apenas com espaços (DESTINYAI_PILOT_EMAILS='   '): bloqueia qualquer usuário", () => {
    process.env.DESTINYAI_PILOT_EMAILS = "    ";
    delete process.env.DESTINYAI_GENERAL_ACCESS_ENABLED;

    const res = checkPilotAccess({ email: "personal@trevoone.com" });
    assert.strictEqual(res.allowed, false, "Deve ser bloqueado");
    assert.strictEqual(res.isPilotMode, true);
  });

  // TEST 4: Tentativa de bypass com '*' sem flag explícita de liberação geral
  runTest("Tentativa de bypass com '*' sem DESTINYAI_GENERAL_ACCESS_ENABLED: bloqueia por segurança", () => {
    process.env.DESTINYAI_PILOT_EMAILS = "*";
    delete process.env.DESTINYAI_GENERAL_ACCESS_ENABLED;

    const res = checkPilotAccess({ email: "hacker@trevoone.com" });
    assert.strictEqual(res.allowed, false, "Wildcard '*' sozinho não pode burlar o modo piloto");
  });

  // TEST 5: Conta autorizada na lista de pilotos
  runTest("Conta autorizada (e-mail exato) na lista de pilotos: acesso PERMITIDO", () => {
    process.env.DESTINYAI_PILOT_EMAILS = "personal.autorizado@trevoone.com, teste@trevoone.com";
    delete process.env.DESTINYAI_GENERAL_ACCESS_ENABLED;

    const res = checkPilotAccess({ email: "personal.autorizado@trevoone.com", userPublicId: "usr_abc" });
    assert.strictEqual(res.allowed, true, "Conta cadastrada na whitelist deve ser permitida");
    assert.strictEqual(res.isPilotMode, true);
  });

  // TEST 6: Conta autorizada com variação de maiúsculas/minúsculas (case-insensitive)
  runTest("Conta autorizada com case diferente (PERSONAL.AUTORIZADO@TREVOONE.COM): acesso PERMITIDO", () => {
    process.env.DESTINYAI_PILOT_EMAILS = "personal.autorizado@trevoone.com";
    delete process.env.DESTINYAI_GENERAL_ACCESS_ENABLED;

    const res = checkPilotAccess({ email: "PERSONAL.AUTORIZADO@TREVOONE.COM" });
    assert.strictEqual(res.allowed, true, "Deve ser case-insensitive");
  });

  // TEST 7: Conta autorizada por userPublicId
  runTest("Conta autorizada identificada por userPublicId na lista: acesso PERMITIDO", () => {
    process.env.DESTINYAI_PILOT_EMAILS = "usr_piloto_seguro_999";
    delete process.env.DESTINYAI_GENERAL_ACCESS_ENABLED;

    const res = checkPilotAccess({ email: "outro@dominio.com", userPublicId: "usr_piloto_seguro_999" });
    assert.strictEqual(res.allowed, true, "Deve permitir correspondência por userPublicId");
  });

  // TEST 8: Conta NÃO autorizada (fora da lista de pilotos) -> BLOQUEADA
  runTest("Conta não autorizada (fora da whitelist): acesso BLOQUEADO com mensagem amigável", () => {
    process.env.DESTINYAI_PILOT_EMAILS = "personal.autorizado@trevoone.com";
    delete process.env.DESTINYAI_GENERAL_ACCESS_ENABLED;

    const res = checkPilotAccess({ email: "outro.personal@trevoone.com" });
    assert.strictEqual(res.allowed, false, "Conta não autorizada deve ser estritamente bloqueada");
    assert.ok(res.error?.includes("liberação controlada"), "Deve conter mensagem amigável para o profissional");
  });

  // TEST 9: Tentativa de acesso sem sessão ou com sessão nula -> BLOQUEADA
  runTest("Tentativa de acesso direto sem sessão válida (null/undefined): BLOQUEADO", () => {
    process.env.DESTINYAI_PILOT_EMAILS = "personal.autorizado@trevoone.com";
    delete process.env.DESTINYAI_GENERAL_ACCESS_ENABLED;

    const res1 = checkPilotAccess(null);
    assert.strictEqual(res1.allowed, false);

    const res2 = checkPilotAccess(undefined);
    assert.strictEqual(res2.allowed, false);

    const res3 = checkPilotAccess({ email: "" });
    assert.strictEqual(res3.allowed, false);
  });

  // TEST 10: Liberação geral explícita via DESTINYAI_GENERAL_ACCESS_ENABLED="true"
  runTest("Liberação geral explícita (DESTINYAI_GENERAL_ACCESS_ENABLED='true'): PERMITIDO para todos", () => {
    delete process.env.DESTINYAI_PILOT_EMAILS;
    process.env.DESTINYAI_GENERAL_ACCESS_ENABLED = "true";

    const res = checkPilotAccess({ email: "qualquer.personal@trevoone.com" });
    assert.strictEqual(res.allowed, true, "Com flag explícita, deve liberar acesso geral");
    assert.strictEqual(res.isPilotMode, false, "Não está mais em modo piloto restrito");
  });

  // TEST 11: Flag de liberação geral com valor 'false' ou inválido -> Retorna ao fail-closed
  runTest("Flag DESTINYAI_GENERAL_ACCESS_ENABLED='false': permanece estritamente em fail-closed", () => {
    delete process.env.DESTINYAI_PILOT_EMAILS;
    process.env.DESTINYAI_GENERAL_ACCESS_ENABLED = "false";

    const res = checkPilotAccess({ email: "qualquer.personal@trevoone.com" });
    assert.strictEqual(res.allowed, false, "Deve permanecer bloqueado se flag for 'false'");
  });

  // TEST 12: Auditoria estática de proteção em todas as 4 Server Actions
  runTest("Auditoria estática: todas as 4 Server Actions de Treino aplicam checkPilotAccess", () => {
    const aiActionsCode = fs.readFileSync(path.join(rootDir, "app/consultoria/[slug]/rotinas/ai-actions.ts"), "utf8");

    const requiredActions = [
      "generateFullWorkoutAiAction",
      "suggestExerciseAlternativeAiAction",
      "suggestBiSetPairAiAction",
      "adjustDivisionAiAction",
    ];

    for (const actionName of requiredActions) {
      assert.ok(aiActionsCode.includes(actionName), `Ação ${actionName} deve existir`);
      
      // Verify that checkPilotAccess is called in that action's scope
      const actionIdx = aiActionsCode.indexOf(`export async function ${actionName}`);
      assert.ok(actionIdx !== -1, `Declaração de ${actionName} não encontrada`);
      
      const actionBody = aiActionsCode.slice(actionIdx, actionIdx + 1200);
      assert.ok(
        actionBody.includes("checkPilotAccess(session)"),
        `Ação ${actionName} DEVE invocar checkPilotAccess(session)`
      );
      assert.ok(
        actionBody.includes("!pilotCheck.allowed"),
        `Ação ${actionName} DEVE abortar se !pilotCheck.allowed`
      );
    }
  });

} finally {
  // Restore original environment
  if (originalPilotEmails !== undefined) {
    process.env.DESTINYAI_PILOT_EMAILS = originalPilotEmails;
  } else {
    delete process.env.DESTINYAI_PILOT_EMAILS;
  }
  if (originalGeneralAccess !== undefined) {
    process.env.DESTINYAI_GENERAL_ACCESS_ENABLED = originalGeneralAccess;
  } else {
    delete process.env.DESTINYAI_GENERAL_ACCESS_ENABLED;
  }
}

console.log("\n================================================================================");
console.log(` RESULTADO: ${testsPassed}/${testsTotal} TESTES DE SEGURANÇA PILOTO APROVADOS!`);
console.log(" A liberação controlada é 100% FAIL-CLOSED por padrão.");
console.log("================================================================================\n");
