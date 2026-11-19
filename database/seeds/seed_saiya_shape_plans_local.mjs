import mysql from "mysql2/promise";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword, verifyPassword } from "../../lib/auth/password.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. CARREGAR .env.local E VALIDAR ISOLAMENTO RÍGIDO
async function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", "..", ".env.local");
  const envContent = await fs.readFile(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const OFFICIAL_15_PLANS = [
  // Treino
  { name: "Treino — Mensal", months: 1, days: 30, cycle: "MONTHLY", amountCents: 20000, installments: 1 },
  { name: "Treino — Bimestral", months: 2, days: 60, cycle: "CUSTOM", amountCents: 30000, installments: 2 },
  { name: "Treino — Trimestral", months: 3, days: 90, cycle: "QUARTERLY", amountCents: 50000, installments: 3 },
  { name: "Treino — Semestral", months: 6, days: 180, cycle: "SEMIANNUALLY", amountCents: 80000, installments: 6 },
  { name: "Treino — Anual", months: 12, days: 365, cycle: "YEARLY", amountCents: 170000, installments: 12 },
  // Nutrição
  { name: "Nutrição — Mensal", months: 1, days: 30, cycle: "MONTHLY", amountCents: 20000, installments: 1 },
  { name: "Nutrição — Bimestral", months: 2, days: 60, cycle: "CUSTOM", amountCents: 30000, installments: 2 },
  { name: "Nutrição — Trimestral", months: 3, days: 90, cycle: "QUARTERLY", amountCents: 50000, installments: 3 },
  { name: "Nutrição — Semestral", months: 6, days: 180, cycle: "SEMIANNUALLY", amountCents: 80000, installments: 6 },
  { name: "Nutrição — Anual", months: 12, days: 365, cycle: "YEARLY", amountCents: 170000, installments: 12 },
  // Consultoria Completa
  { name: "Consultoria Completa — Mensal", months: 1, days: 30, cycle: "MONTHLY", amountCents: 35000, installments: 1 },
  { name: "Consultoria Completa — Bimestral", months: 2, days: 60, cycle: "CUSTOM", amountCents: 55000, installments: 2 },
  { name: "Consultoria Completa — Trimestral", months: 3, days: 90, cycle: "QUARTERLY", amountCents: 85000, installments: 3 },
  { name: "Consultoria Completa — Semestral", months: 6, days: 180, cycle: "SEMIANNUALLY", amountCents: 135000, installments: 6 },
  { name: "Consultoria Completa — Anual", months: 12, days: 365, cycle: "YEARLY", amountCents: 280000, installments: 12 },
];

async function main() {
  console.log("=== INICIANDO SEED LOCAL DOS 15 PLANOS E USUÁRIOS FICTÍCIOS ===");

  await loadEnvLocal();

  // GUARD DE SEGURANÇA
  assert.equal(process.env.DB_HOST, "127.0.0.1", "DB_HOST deve ser 127.0.0.1");
  assert.equal(process.env.DB_NAME, "trevo_one_qa", "DB_NAME deve ser trevo_one_qa");
  assert.ok(!process.env.DB_HOST.includes("hstgr.io"), "Proibido conectar na Hostinger!");
  assert.equal(process.env.INFINITEPAY_ENVIRONMENT, "SIMULATION", "INFINITEPAY_ENVIRONMENT deve ser SIMULATION");
  assert.equal(process.env.INFINITEPAY_PILOT_CONSULTANCY_ID, "1", "INFINITEPAY_PILOT_CONSULTANCY_ID deve ser 1");

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log("[PASS] Conectado exclusivamente ao banco local trevo_one_qa");

  // 1. CONFIRMAR CONSULTORIA 1 (Saiya Shape)
  const [consultancies] = await conn.query("SELECT id, slug, name FROM consultancies WHERE id = 1 AND slug = 'saiya-shape'");
  assert.equal(consultancies.length, 1, "Consultoria local id=1 com slug saiya-shape não encontrada!");
  console.log(`[PASS] Consultoria confirmada: [ID ${consultancies[0].id}] ${consultancies[0].name} (${consultancies[0].slug})`);

  // 2. CONFIGURAR SENHAS E VÍNCULOS DOS USUÁRIOS FICTÍCIOS
  const TEST_PASSWORD = "Trevo@123456";
  const validScryptHash = await hashPassword(TEST_PASSWORD);
  const isHashValid = await verifyPassword(TEST_PASSWORD, validScryptHash);
  assert.ok(isHashValid, "Falha na geração do hash scrypt");

  // Atualizar senha dos 3 usuários fictícios para permitir autenticação local
  await conn.query(
    "UPDATE users SET password_hash = ?, status = 'ACTIVE' WHERE email IN ('admin@trevoone-test.local', 'treinador.teste@trevoone.com', 'aluno.teste@trevoone.com')",
    [validScryptHash]
  );
  console.log(`[PASS] Senhas scrypt atualizadas para os 3 usuários de teste (Senha: ${TEST_PASSWORD})`);

  // Garantir que admin (user_id = 1) tem vínculo de membro na consultoria 1 com role CONSULTANCY_ADMIN
  const [adminUser] = await conn.query("SELECT id FROM users WHERE email = 'admin@trevoone-test.local'");
  assert.equal(adminUser.length, 1, "Usuário admin@trevoone-test.local não encontrado");
  const adminUserId = adminUser[0].id;

  const [adminMember] = await conn.query("SELECT id FROM consultancy_members WHERE consultancy_id = 1 AND user_id = ?", [adminUserId]);
  let adminMemberId;
  if (adminMember.length === 0) {
    const [insMember] = await conn.query(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (UUID(), 1, ?, 'ACTIVE', NOW(3), NOW(3))",
      [adminUserId]
    );
    adminMemberId = insMember.insertId;
    console.log(`[PASS] Membro admin criado para user_id=${adminUserId} (member_id=${adminMemberId})`);
  } else {
    adminMemberId = adminMember[0].id;
    await conn.query("UPDATE consultancy_members SET status = 'ACTIVE' WHERE id = ?", [adminMemberId]);
    console.log(`[PASS] Membro admin existente verificado (member_id=${adminMemberId})`);
  }

  const [adminRole] = await conn.query(
    "SELECT id FROM consultancy_member_roles WHERE member_id = ? AND role = 'CONSULTANCY_ADMIN'",
    [adminMemberId]
  );
  if (adminRole.length === 0) {
    await conn.query("INSERT INTO consultancy_member_roles (member_id, role, created_at) VALUES (?, 'CONSULTANCY_ADMIN', NOW(3))", [adminMemberId]);
    console.log("[PASS] Papel CONSULTANCY_ADMIN atribuído ao admin");
  } else {
    console.log("[PASS] Papel CONSULTANCY_ADMIN já atribuído");
  }

  // Verificar treinador e aluno
  const [personalMember] = await conn.query(`
    SELECT cm.id, cm.status, cmr.role 
    FROM consultancy_members cm 
    JOIN users u ON u.id = cm.user_id 
    JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id 
    WHERE cm.consultancy_id = 1 AND u.email = 'treinador.teste@trevoone.com' AND cmr.role = 'PERSONAL'
  `);
  assert.equal(personalMember.length, 1, "Treinador não vinculado corretamente");
  console.log(`[PASS] Treinador confirmado: member_id=${personalMember[0].id}, role=${personalMember[0].role}`);

  const [studentMember] = await conn.query(`
    SELECT cm.id, cm.status, cmr.role 
    FROM consultancy_members cm 
    JOIN users u ON u.id = cm.user_id 
    JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id 
    WHERE cm.consultancy_id = 1 AND u.email = 'aluno.teste@trevoone.com' AND cmr.role = 'STUDENT'
  `);
  assert.equal(studentMember.length, 1, "Aluno não vinculado corretamente");
  console.log(`[PASS] Aluno confirmado: member_id=${studentMember[0].id}, role=${studentMember[0].role}`);

  // 3. CADASTRO DOS 15 PLANOS COMERCIAIS OFICIAIS (CONSULTANCY_ID = 1)
  console.log("\n--- CADASTRANDO OS 15 PLANOS OFICIAIS DA SAIYA SHAPE (ID 1) ---");

  for (const p of OFFICIAL_15_PLANS) {
    const [existing] = await conn.query(
      "SELECT id FROM consultancy_plans WHERE consultancy_id = 1 AND name = ?",
      [p.name]
    );

    if (existing.length === 0) {
      await conn.query(`
        INSERT INTO consultancy_plans (
          public_id,
          consultancy_id,
          name,
          description,
          amount_cents,
          currency_code,
          duration_days,
          duration_months,
          billing_cycle,
          assured_installments,
          is_available_for_purchase,
          payment_methods,
          status,
          created_by_user_id,
          created_at,
          updated_at
        ) VALUES (
          UUID(),
          1,
          ?,
          ?,
          ?,
          'BRL',
          ?,
          ?,
          ?,
          ?,
          1,
          'PIX_AND_CARD',
          'ACTIVE',
          ?,
          NOW(3),
          NOW(3)
        )
      `, [p.name, `Plano oficial ${p.name}`, p.amountCents, p.days, p.months, p.cycle, p.installments, adminUserId]);
      console.log(`[INSERIDO] ${p.name}: R$ ${(p.amountCents / 100).toFixed(2)} (${p.amountCents} centavos)`);
    } else {
      await conn.query(`
        UPDATE consultancy_plans SET
          amount_cents = ?,
          duration_days = ?,
          duration_months = ?,
          billing_cycle = ?,
          assured_installments = ?,
          status = 'ACTIVE',
          is_available_for_purchase = 1,
          updated_at = NOW(3)
        WHERE id = ? AND consultancy_id = 1
      `, [p.amountCents, p.days, p.months, p.cycle, p.installments, existing[0].id]);
      console.log(`[ATUALIZADO] ${p.name}: R$ ${(p.amountCents / 100).toFixed(2)} (${p.amountCents} centavos)`);
    }
  }

  // 4. CONFIGURAÇÃO DE FINANCE_SETTINGS PARA SAIYA SHAPE LOCAL
  const [finSettings] = await conn.query("SELECT id FROM consultancy_finance_settings WHERE consultancy_id = 1");
  if (finSettings.length === 0) {
    await conn.query(`
      INSERT INTO consultancy_finance_settings (
        public_id,
        consultancy_id,
        infinitepay_handle,
        infinitepay_api_key,
        infinitepay_enabled,
        infinitepay_environment,
        created_by_user_id,
        updated_by_user_id,
        created_at,
        updated_at
      ) VALUES (
        UUID(),
        1,
        '$saiyashape',
        'sim_key_local',
        1,
        'SIMULATION',
        ?,
        ?,
        NOW(3),
        NOW(3)
      )
    `, [adminUserId, adminUserId]);
    console.log("[PASS] consultancy_finance_settings inserido para consultoria 1");
  } else {
    await conn.query(`
      UPDATE consultancy_finance_settings SET
        infinitepay_handle = '$saiyashape',
        infinitepay_api_key = 'sim_key_local',
        infinitepay_enabled = 1,
        infinitepay_environment = 'SIMULATION',
        updated_by_user_id = ?,
        updated_at = NOW(3)
      WHERE consultancy_id = 1
    `, [adminUserId]);
    console.log("[PASS] consultancy_finance_settings atualizado para consultoria 1");
  }

  // 5. AUDITORIA FINAL RÍGIDA DOS PLANOS (ITEM 5 DA SOLICITAÇÃO)
  console.log("\n--- VERIFICAÇÕES FINAIS (AUDITORIA RIGOROSA) ---");

  // 5.1 Contagem de planos e nomes únicos
  const [plansCount] = await conn.query("SELECT COUNT(*) as total, COUNT(DISTINCT name) as unique_names, SUM(amount_cents) as total_cents FROM consultancy_plans WHERE consultancy_id = 1");
  assert.equal(Number(plansCount[0].total), 15, `Esperado 15 planos, encontrado: ${plansCount[0].total}`);
  assert.equal(Number(plansCount[0].unique_names), 15, `Esperado 15 nomes únicos, encontrado: ${plansCount[0].unique_names}`);
  assert.equal(Number(plansCount[0].total_cents), 1290000, `Esperado 1290000 centavos, encontrado: ${plansCount[0].total_cents}`);
  console.log(`[PASS] 15 planos com 15 nomes únicos confirmados. Soma: ${plansCount[0].total_cents} centavos (R$ 12.900,00)`);

  // 5.2 Validação individual de cada plano
  const [plansList] = await conn.query("SELECT id, name, amount_cents, duration_months, duration_days, billing_cycle, status FROM consultancy_plans WHERE consultancy_id = 1 ORDER BY id ASC");
  for (const expected of OFFICIAL_15_PLANS) {
    const found = plansList.find(p => p.name === expected.name);
    assert.ok(found, `Plano '${expected.name}' não encontrado!`);
    assert.equal(found.amount_cents, expected.amountCents, `Preço incorreto em '${expected.name}': ${found.amount_cents} != ${expected.amountCents}`);
    assert.equal(found.duration_months, expected.months, `Duração em meses incorreta em '${expected.name}'`);
    assert.equal(found.duration_days, expected.days, `Duração em dias incorreta em '${expected.name}'`);
    assert.equal(found.billing_cycle, expected.cycle, `Ciclo incorreto em '${expected.name}'`);
    assert.equal(found.status, "ACTIVE", `Status não ACTIVE em '${expected.name}'`);
    console.log(`  ✓ ${found.name}: R$ ${(found.amount_cents / 100).toFixed(2)} | ${found.billing_cycle} | ${found.duration_months} meses | ${found.status}`);
  }

  // 5.3 Garantir que nenhuma outra consultoria recebeu planos
  const [otherPlans] = await conn.query("SELECT COUNT(*) as cnt FROM consultancy_plans WHERE consultancy_id != 1");
  assert.equal(Number(otherPlans[0].cnt), 0, "Planos vazaram para outra consultoria!");
  console.log("[PASS] Isolamento absoluto de tenant: 0 planos em outras consultorias");

  // 5.4 Teste de autenticação dos 3 usuários com as novas credenciais
  const [usersToAuth] = await conn.query("SELECT email, password_hash FROM users WHERE email IN ('admin@trevoone-test.local', 'treinador.teste@trevoone.com', 'aluno.teste@trevoone.com')");
  for (const u of usersToAuth) {
    const verified = await verifyPassword(TEST_PASSWORD, u.password_hash);
    assert.ok(verified, `Falha de autenticação para ${u.email}`);
    console.log(`[PASS] Autenticação local confirmada para: ${u.email}`);
  }

  await conn.end();
  console.log("\n=== SEED LOCAL CONCLUÍDO COM 100% DE SUCESSO ===");
}

main().catch(err => {
  console.error("ERRO NO SEED LOCAL:", err);
  process.exit(1);
});
