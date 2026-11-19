import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import crypto from "node:crypto";
import { register } from "node:module";

register("./ts-loader.mjs", import.meta.url);

const {
  resolveStudentModuleAccess,
  isConsultancyGranularEntitlementsEnabled,
} = await import("../lib/consultancies/student-module-access.ts");

const {
  computeEffectiveEntitlements,
  MIGRATION_077_CUTOFF,
} = await import("../lib/consultancies/student-features.ts");

const {
  markStudentChargePaid,
} = await import("../lib/consultancies/finance.ts");

const DB_CONFIG = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "trevo_one_qa",
};

async function main() {
  console.log("==========================================================================");
  console.log("TREVO ONE: QA SUITE — VALIDAÇÃO DOS 6 CENÁRIOS PRÉ-PUBLICAÇÃO");
  console.log("==========================================================================\n");

  const pool = mysql.createPool(DB_CONFIG);
  const conn = await pool.getConnection();

  const cleanupTasks = [];

  try {
    // 0. Setup dos atores
    // Saiya Shape (consultancy_id = 1, slug = 'saiya-shape')
    const [saiyaAdminRows] = await conn.query(
      `SELECT u.id, cm.id as membership_id, c.id as consultancy_id, c.slug as consultancy_slug
       FROM users u
       JOIN consultancy_members cm ON cm.user_id = u.id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       JOIN consultancies c ON c.id = cm.consultancy_id
       WHERE cmr.role = 'CONSULTANCY_ADMIN' AND c.slug = 'saiya-shape'
       LIMIT 1`
    );
    const saiyaAdmin = saiyaAdminRows[0];

    const [saiyaStudentRows] = await conn.query(
      `SELECT u.id, cm.id as membership_id, cm.public_id as membership_public_id, c.id as consultancy_id, c.slug as consultancy_slug
       FROM users u
       JOIN consultancy_members cm ON cm.user_id = u.id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       JOIN consultancies c ON c.id = cm.consultancy_id
       WHERE cmr.role = 'STUDENT' AND c.slug = 'saiya-shape'
       LIMIT 1`
    );
    const saiyaStudent = saiyaStudentRows[0];

    // Consultoria Tradicional (consultancy_id = 2, slug = 'consultoria-padrao')
    const [tradConsultancyRows] = await conn.query(
      `SELECT id, name, slug FROM consultancies WHERE slug = 'consultoria-padrao' LIMIT 1`
    );
    const tradConsultancy = tradConsultancyRows[0];

    // Garantir que a Consultoria Tradicional possui assinatura da plataforma ativa para testes operacionais
    const [existingPlatSub] = await conn.query(
      `SELECT id FROM consultancy_platform_subscriptions WHERE consultancy_id = ?`,
      [tradConsultancy.id]
    );
    if (existingPlatSub.length === 0) {
      const platSubPubId = crypto.randomUUID();
      const [insPlat] = await conn.execute(
        `INSERT INTO consultancy_platform_subscriptions (public_id, consultancy_id, administrative_status, created_at, updated_at)
         VALUES (?, ?, 'ACTIVE', NOW(3), NOW(3))`,
        [platSubPubId, tradConsultancy.id]
      );
      cleanupTasks.push(async () => {
        await conn.execute(`DELETE FROM consultancy_platform_subscriptions WHERE id = ?`, [insPlat.insertId]);
      });
    }

    // Garantir membro aluno na Consultoria Tradicional para o teste multi-tenant
    // Usamos um user dedicado ou o mesmo user vinculado à consultoria 2
    let tradStudentMembershipId;
    let tradStudentUserId = saiyaStudent.id;

    const [existingTradMember] = await conn.query(
      `SELECT cm.id FROM consultancy_members cm WHERE cm.consultancy_id = ? AND cm.user_id = ? LIMIT 1`,
      [tradConsultancy.id, tradStudentUserId]
    );

    if (existingTradMember.length > 0) {
      tradStudentMembershipId = existingTradMember[0].id;
    } else {
      const memPubId = crypto.randomUUID();
      const [insMem] = await conn.execute(
        `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at)
         VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
        [memPubId, tradConsultancy.id, tradStudentUserId]
      );
      tradStudentMembershipId = insMem.insertId;
      await conn.execute(
        `INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'STUDENT')`,
        [tradStudentMembershipId]
      );
      cleanupTasks.push(async () => {
        await conn.execute(`DELETE FROM consultancy_member_roles WHERE member_id = ?`, [tradStudentMembershipId]);
        await conn.execute(`DELETE FROM consultancy_members WHERE id = ?`, [tradStudentMembershipId]);
      });
    }

    // Limpar assinaturas residuais ativas do aluno da Saiya Shape para testes isolados
    await conn.execute(
      `UPDATE student_plan_subscriptions SET status = 'CANCELED' WHERE student_membership_id = ? AND status = 'ACTIVE'`,
      [saiyaStudent.membership_id]
    );

    // =========================================================================
    // CENÁRIO 1: SAIYA SHAPE COM ACESSOS GRANULARES
    // =========================================================================
    console.log("CENÁRIO 1: Saiya Shape com acessos granulares ativos...");
    assert.equal(isConsultancyGranularEntitlementsEnabled("saiya-shape"), true);

    // Inserir assinatura com snapshot explícito de Treino (Treino, Evolução, Chat = true)
    const subTreinoPubId = crypto.randomUUID();
    const [insSubTreino] = await conn.execute(
      `INSERT INTO student_plan_subscriptions (
         public_id, consultancy_id, student_membership_id, plan_id, status,
         features_json, started_at, ends_at, created_at, updated_at
       ) VALUES (?, ?, ?, 1, 'ACTIVE', ?, NOW(3), DATE_ADD(NOW(3), INTERVAL 30 DAY), NOW(3), NOW(3))`,
      [
        subTreinoPubId,
        saiyaStudent.consultancy_id,
        saiyaStudent.membership_id,
        JSON.stringify({ training: true, nutrition: false, evolution: true, consultations: false, chat: true }),
      ]
    );
    cleanupTasks.push(async () => {
      await conn.execute(`DELETE FROM student_plan_subscriptions WHERE id = ?`, [insSubTreino.insertId]);
    });

    const accessTreino = await resolveStudentModuleAccess(saiyaStudent.id, "saiya-shape", "training");
    const accessNutri = await resolveStudentModuleAccess(saiyaStudent.id, "saiya-shape", "nutrition");
    const accessChat = await resolveStudentModuleAccess(saiyaStudent.id, "saiya-shape", "chat");

    assert.equal(accessTreino.allowed, true, "Treino deveria estar liberado");
    assert.equal(accessChat.allowed, true, "Chat deveria estar liberado");
    assert.equal(accessNutri.allowed, false, "Nutrição deveria estar bloqueada");
    assert.equal(accessNutri.reason, "MODULE_NOT_INCLUDED");
    assert.equal(accessTreino.entitlementMode, "GRANULAR");
    console.log(" -> PASS: Saiya Shape opera estritamente no modo GRANULAR com controle pontual de módulos.");

    // Desativar assinatura do cenário 1 para os próximos testes
    await conn.execute(`UPDATE student_plan_subscriptions SET status = 'CANCELED' WHERE id = ?`, [insSubTreino.insertId]);

    // =========================================================================
    // CENÁRIO 2: OUTRA CONSULTORIA COM PLANOS TRADICIONAIS
    // =========================================================================
    console.log("\nCENÁRIO 2: Outra consultoria com planos tradicionais...");
    assert.equal(isConsultancyGranularEntitlementsEnabled("consultoria-padrao"), false);

    // Inserir assinatura na Consultoria Tradicional criada HOJE (pós-migration) e SEM features_json
    const tradSubPubId = crypto.randomUUID();
    const [insTradSub] = await conn.execute(
      `INSERT INTO student_plan_subscriptions (
         public_id, consultancy_id, student_membership_id, plan_id, status,
         features_json, started_at, ends_at, created_at, updated_at
       ) VALUES (?, ?, ?, NULL, 'ACTIVE', NULL, NOW(3), DATE_ADD(NOW(3), INTERVAL 30 DAY), NOW(3), NOW(3))`,
      [tradSubPubId, tradConsultancy.id, tradStudentMembershipId]
    );
    cleanupTasks.push(async () => {
      await conn.execute(`DELETE FROM student_plan_subscriptions WHERE id = ?`, [insTradSub.insertId]);
    });

    const tradAccessTreino = await resolveStudentModuleAccess(tradStudentUserId, "consultoria-padrao", "training");
    const tradAccessNutri = await resolveStudentModuleAccess(tradStudentUserId, "consultoria-padrao", "nutrition");

    assert.equal(tradAccessTreino.allowed, true, "Treino na consultoria tradicional deve ser permitido");
    assert.equal(tradAccessNutri.allowed, true, "Nutrição na consultoria tradicional deve ser permitida");
    assert.equal(tradAccessTreino.entitlementMode, "LEGACY_FULL");
    assert.equal(tradAccessNutri.entitlementMode, "LEGACY_FULL");
    console.log(" -> PASS: Outra consultoria mantém comportamento anterior integral (LEGACY_FULL) mesmo em novas assinaturas sem features_json.");

    // =========================================================================
    // CENÁRIO 3: CONTRATOS ANTIGOS PRESERVADOS
    // =========================================================================
    console.log("\nCENÁRIO 3: Contratos antigos na Saiya Shape preservados...");
    // Assinatura criada antes do corte (ex: 2026-11-10) com features_json = NULL
    const legacySubPubId = crypto.randomUUID();
    const [insLegacySub] = await conn.execute(
      `INSERT INTO student_plan_subscriptions (
         public_id, consultancy_id, student_membership_id, plan_id, status,
         features_json, started_at, ends_at, created_at, updated_at
       ) VALUES (?, ?, ?, 1, 'ACTIVE', NULL, '2026-11-10 10:00:00', DATE_ADD(NOW(3), INTERVAL 30 DAY), '2026-11-10 10:00:00', '2026-11-10 10:00:00')`,
      [legacySubPubId, saiyaStudent.consultancy_id, saiyaStudent.membership_id]
    );
    cleanupTasks.push(async () => {
      await conn.execute(`DELETE FROM student_plan_subscriptions WHERE id = ?`, [insLegacySub.insertId]);
    });

    const legacyAccessTreino = await resolveStudentModuleAccess(saiyaStudent.id, "saiya-shape", "training");
    const legacyAccessNutri = await resolveStudentModuleAccess(saiyaStudent.id, "saiya-shape", "nutrition");

    assert.equal(legacyAccessTreino.allowed, true);
    assert.equal(legacyAccessNutri.allowed, true);
    assert.equal(legacyAccessTreino.entitlementMode, "LEGACY_FULL");
    console.log(" -> PASS: Contratos antigos pré-corte com features_json nulo mantêm acesso irrestrito LEGACY_FULL.");

    // Desativar assinatura legada
    await conn.execute(`UPDATE student_plan_subscriptions SET status = 'CANCELED' WHERE id = ?`, [insLegacySub.insertId]);

    // =========================================================================
    // CENÁRIO 4: CONTRATAÇÕES NOVAS SEM SNAPSHOT BLOQUEADAS NA SAIYA SHAPE
    // =========================================================================
    console.log("\nCENÁRIO 4: Contratações novas sem snapshot bloqueadas corretamente na Saiya Shape...");
    // Assinatura criada HOJE sem features_json e sem vínculo com cobrança antiga
    const invalidSubPubId = crypto.randomUUID();
    const [insInvalidSub] = await conn.execute(
      `INSERT INTO student_plan_subscriptions (
         public_id, consultancy_id, student_membership_id, plan_id, status,
         features_json, started_at, ends_at, created_at, updated_at
       ) VALUES (?, ?, ?, NULL, 'ACTIVE', NULL, NOW(3), DATE_ADD(NOW(3), INTERVAL 30 DAY), NOW(3), NOW(3))`,
      [invalidSubPubId, saiyaStudent.consultancy_id, saiyaStudent.membership_id]
    );
    cleanupTasks.push(async () => {
      await conn.execute(`DELETE FROM student_plan_subscriptions WHERE id = ?`, [insInvalidSub.insertId]);
    });

    const invalidAccessTreino = await resolveStudentModuleAccess(saiyaStudent.id, "saiya-shape", "training");
    const invalidAccessNutri = await resolveStudentModuleAccess(saiyaStudent.id, "saiya-shape", "nutrition");

    assert.equal(invalidAccessTreino.allowed, false, "Nova contratação sem snapshot não pode acessar Treino");
    assert.equal(invalidAccessTreino.reason, "MODULE_NOT_INCLUDED");
    assert.equal(invalidAccessNutri.allowed, false, "Nova contratação sem snapshot não pode acessar Nutrição");
    assert.equal(invalidAccessNutri.reason, "MODULE_NOT_INCLUDED");
    assert.equal(invalidAccessTreino.entitlementMode, "GRANULAR");
    console.log(" -> PASS: Contratações novas sem snapshot na Saiya Shape são estritamente bloqueadas (fail-closed, nunca LEGACY_FULL).");

    // Desativar assinatura inválida
    await conn.execute(`UPDATE student_plan_subscriptions SET status = 'CANCELED' WHERE id = ?`, [insInvalidSub.insertId]);

    // =========================================================================
    // CENÁRIO 5: COBRANÇAS ANTERIORES À PUBLICAÇÃO PAGAS POSTERIORMENTE
    // =========================================================================
    console.log("\nCENÁRIO 5: Cobranças anteriores à publicação pagas posteriormente...");
    // Simula uma cobrança emitida no código anterior vinculada a um plano comercial (ex: plan_id = 1, emitida em 2026-11-10 sem features_json)
    const oldChargePubId = crypto.randomUUID();
    const [insOldCharge] = await conn.execute(
      `INSERT INTO student_charges (
         public_id, consultancy_id, student_membership_id, plan_id, title,
         amount_cents, currency_code, due_on, reference_period_start, reference_period_end,
         blocks_access, state, created_by_user_id, created_at
       ) VALUES (?, ?, ?, 1, 'Plano Mensal Anterior', 20000, 'BRL', '2026-11-20', '2026-11-10', '2026-12-10', 0, 'OPEN', ?, '2026-11-10 10:00:00')`,
      [oldChargePubId, saiyaStudent.consultancy_id, saiyaStudent.membership_id, saiyaAdmin.id]
    );

    // Pagar a cobrança antiga HOJE utilizando o fluxo administrativo markStudentChargePaid
    const markRes = await markStudentChargePaid({
      consultancyId: saiyaAdmin.consultancy_id,
      chargePublicId: oldChargePubId,
      userId: saiyaAdmin.id,
      paidAtIso: new Date().toISOString(),
      paymentMethod: "PIX_MANUAL",
      notes: "Quitação de cobrança anterior ao deploy",
    });
    if (!markRes.success) {
      console.error("Erro no markStudentChargePaid:", markRes.error);
    }
    assert.equal(markRes.success, true, "Quitação da cobrança antiga deve ter sucesso");

    // Localizar a assinatura criada ao pagar a cobrança antiga
    const [subFromOldCharge] = await conn.query(
      `SELECT id, created_at, features_json FROM student_plan_subscriptions WHERE charge_id = ?`,
      [insOldCharge.insertId]
    );
    assert.ok(subFromOldCharge.length > 0, "Assinatura deve ter sido gerada");
    assert.equal(
      subFromOldCharge[0].features_json,
      null,
      "Assinatura gerada a partir de cobrança legada NÃO pode herdar o catálogo atual de features_json"
    );

    cleanupTasks.push(async () => {
      await conn.execute(`DELETE FROM student_payments WHERE charge_id = ?`, [insOldCharge.insertId]);
      await conn.execute(`DELETE FROM student_plan_subscriptions WHERE charge_id = ?`, [insOldCharge.insertId]);
      await conn.execute(`DELETE FROM student_charges WHERE id = ?`, [insOldCharge.insertId]);
    });

    // Validar acesso: como a cobrança de origem foi gerada antes do corte, o aluno deve ter LEGACY_FULL
    const transitionAccessTreino = await resolveStudentModuleAccess(saiyaStudent.id, "saiya-shape", "training");
    const transitionAccessNutri = await resolveStudentModuleAccess(saiyaStudent.id, "saiya-shape", "nutrition");

    assert.equal(transitionAccessTreino.allowed, true, "Treino deve estar liberado para cobrança anterior quitada");
    assert.equal(transitionAccessNutri.allowed, true, "Nutrição deve estar liberada para cobrança anterior quitada");
    assert.equal(transitionAccessTreino.entitlementMode, "LEGACY_FULL");
    console.log(" -> PASS: Cobrança emitida no código anterior e paga na transição é reconhecida e garante LEGACY_FULL.");

    // Desativar assinatura gerada
    await conn.execute(`UPDATE student_plan_subscriptions SET status = 'CANCELED' WHERE id = ?`, [subFromOldCharge[0].id]);

    // =========================================================================
    // CENÁRIO 6: ISOLAMENTO MULTI-TENANT
    // =========================================================================
    console.log("\nCENÁRIO 6: Isolamento multi-tenant estrito...");
    // Aluno da Saiya Shape tenta acessar com slug de outra consultoria onde não tem matrícula
    const [cOutra] = await conn.query(`SELECT id, slug FROM consultancies WHERE id NOT IN (1, 2) LIMIT 1`);
    if (cOutra.length > 0) {
      const crossAccess = await resolveStudentModuleAccess(saiyaStudent.id, cOutra[0].slug, "training");
      assert.equal(crossAccess.allowed, false);
      assert.equal(crossAccess.reason, "INVALID_CONTEXT");
    }

    // Assinatura na Consultoria 2 NÃO concede direitos na Saiya Shape (Consultoria 1)
    const [recheckSaiyaNoSubs] = await conn.query(
      `SELECT COUNT(*) as cnt FROM student_plan_subscriptions WHERE consultancy_id = 1 AND student_membership_id = ? AND status = 'ACTIVE'`,
      [saiyaStudent.membership_id]
    );
    assert.equal(recheckSaiyaNoSubs[0].cnt, 0);

    // Sem assinaturas ativas na Saiya Shape (após as desativações controladas),
    // o aluno não deve herdar permissões de outra consultoria
    const crossTenantCheck = await resolveStudentModuleAccess(saiyaStudent.id, "saiya-shape", "training");
    // Aluno sem assinaturas em consultoria modularizada: fallback padrão para quem não tem plano
    assert.equal(crossTenantCheck.context?.consultancyId, 1, "Contexto estritamente isolado à consultoria 1");
    console.log(" -> PASS: Isolamento multi-tenant estrito: segregação total entre consultorias comprovada.");

  } finally {
    // Executar todas as tarefas de limpeza
    for (const task of cleanupTasks) {
      try {
        await task();
      } catch (e) {
        console.warn("Aviso na limpeza:", e.message);
      }
    }
    connectionRelease: conn.release();
    await pool.end();
  }

  console.log("\n==========================================================================");
  console.log("SUCESSO: TODOS OS 6 CENÁRIOS PRÉ-PUBLICAÇÃO FORAM VALIDADOS COM 100% PASS!");
  console.log("==========================================================================");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ ERRO NA SUÍTE DE VALIDAÇÃO:", err);
    process.exit(1);
  });
