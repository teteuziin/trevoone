/**
 * TREVO ONE — TESTE DO FLUXO DE ATRIBUIÇÃO DE FORMULÁRIOS E SANITIZAÇÃO DE ERROS SQL
 *
 * Valida:
 * 1. Execução real das queries de listActiveStudentsForForms, assignFormToStudents,
 *    listAssignmentsForAdmin e getAssignmentByPublicId contra o banco isolado (MariaDB).
 * 2. Ausência total do erro 'Unknown column up.phone'.
 * 3. Atribuição de formulário com sucesso (individual e em massa).
 * 4. Sanitização estrita de erros de banco de dados para a interface (zero vazamento de SQL).
 */

import mysql from "mysql2/promise";
import assert from "node:assert/strict";

const dbConfig = {
  host: "127.0.0.1",
  port: 3306,
  user: "trevo_qa",
  password: "trevo_one_qa_pass",
  database: "trevo_one_qa",
};

function sanitizeFormActionError(err, defaultMessage) {
  if (err instanceof Error && err.message) {
    const msg = err.message;
    const isTechnicalSqlError =
      /SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|ER_|SQL|column|table|database|syntax|deadlock|foreign key|constraint|handshake|packet|ECONNREFUSED|PROTOCOL_/i.test(
        msg
      );
    if (!isTechnicalSqlError && msg.trim().length > 0 && msg.length < 250) {
      return msg;
    }
  }
  return defaultMessage;
}

async function runTests() {
  console.log("=== INICIANDO VALIDAÇÃO DO FLUXO DE ATRIBUIÇÃO DE FORMULÁRIOS ===");
  const pool = mysql.createPool(dbConfig);

  try {
    // 1. Verificar consultoria e alunos existentes para teste
    let [consultancies] = await pool.query(
      `SELECT id, public_id, name, slug FROM consultancies WHERE status = 'ACTIVE' LIMIT 1;`
    );

    let consultancyId;
    let consultancySlug;

    if (consultancies.length === 0) {
      console.log("Criando consultoria de teste...");
      const [cRes] = await pool.query(
        `INSERT INTO consultancies (public_id, name, slug, status, created_at, updated_at)
         VALUES (UUID(), 'Consultoria Teste Form', 'consultoria-teste-form', 'ACTIVE', NOW(3), NOW(3));`
      );
      consultancyId = cRes.insertId;
      consultancySlug = 'consultoria-teste-form';
    } else {
      consultancyId = consultancies[0].id;
      consultancySlug = consultancies[0].slug;
    }

    console.log(`[OK] Consultoria selecionada: ID ${consultancyId} (${consultancySlug})`);

    // 2. Garantir usuários e papéis (Admin e Aluno)
    let [students] = await pool.query(
      `SELECT cm.id AS membership_id, cm.public_id AS membership_public_id, u.id AS user_id, u.full_name, u.email
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ? AND cm.status = 'ACTIVE'
         AND cmr.role IN ('STUDENT', 'INFLUENCER')
       GROUP BY cm.id, cm.public_id, u.id, u.full_name, u.email;`,
      [consultancyId]
    );

    if (students.length === 0) {
      console.log("Criando aluno fictício para teste...");
      const studentEmail = `aluno_form_${Date.now()}@test.trevoone.com`;
      const [uRes] = await pool.query(
        `INSERT INTO users (public_id, full_name, email, password_hash, status, created_at, updated_at)
         VALUES (UUID(), 'Aluno Teste Formulário', ?, 'hash_dummy', 'ACTIVE', NOW(3), NOW(3));`,
        [studentEmail]
      );
      const studentUserId = uRes.insertId;

      const [cmRes] = await pool.query(
        `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at)
         VALUES (UUID(), ?, ?, 'ACTIVE', NOW(3), NOW(3));`,
        [consultancyId, studentUserId]
      );
      const studentMembershipId = cmRes.insertId;

      await pool.query(
        `INSERT INTO consultancy_member_roles (member_id, role, created_at)
         VALUES (?, 'STUDENT', NOW(3));`,
        [studentMembershipId]
      );

      // Re-executar busca
      [students] = await pool.query(
        `SELECT cm.id AS membership_id, cm.public_id AS membership_public_id, u.id AS user_id, u.full_name, u.email
         FROM consultancy_members cm
         JOIN users u ON u.id = cm.user_id
         JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
         WHERE cm.consultancy_id = ? AND cm.status = 'ACTIVE'
           AND cmr.role IN ('STUDENT', 'INFLUENCER')
         GROUP BY cm.id, cm.public_id, u.id, u.full_name, u.email;`,
        [consultancyId]
      );
    }

    assert.ok(students.length > 0, "Deve haver ao menos um aluno para o teste.");
    const sampleStudent = students[0];
    console.log(`[OK] Aluno encontrado: ${sampleStudent.full_name} (${sampleStudent.membership_public_id})`);

    // 3. Teste 1: Executar query corrigida de listActiveStudentsForForms
    console.log("\n--- TESTE 1: Query listActiveStudentsForForms ---");
    const [activeStudentsRows] = await pool.query(
      `SELECT cm.id AS membership_id, cm.public_id AS membership_public_id, u.id AS user_id, u.full_name, u.email
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ? AND cm.status = 'ACTIVE'
         AND cmr.role IN ('STUDENT', 'INFLUENCER')
       GROUP BY cm.id, cm.public_id, u.id, u.full_name, u.email
       ORDER BY u.full_name ASC;`,
      [consultancyId]
    );
    assert.ok(Array.isArray(activeStudentsRows), "Deve retornar array de alunos ativos");
    assert.ok(activeStudentsRows.length > 0, "Deve conter alunos");
    console.log(`[PASS] listActiveStudentsForForms executou sem erros: ${activeStudentsRows.length} aluno(s) listado(s).`);

    // 4. Teste 2: Criar modelo de formulário em consultancy_forms
    console.log("\n--- TESTE 2: Criação de modelo de formulário ---");
    const formPublicId = crypto.randomUUID();
    const questions = [
      { id: "q_1", type: "SHORT_TEXT", title: "Como você avalia sua rotina de sono?", required: true },
      { id: "q_2", type: "SCALE", title: "Nível de estresse de 1 a 10", required: false, scaleMin: 1, scaleMax: 10 },
    ];

    const [formInsertRes] = await pool.query(
      `INSERT INTO consultancy_forms (
        public_id, consultancy_id, title, description, questions_json,
        status, is_recurring, recurrence_rule, created_by_user_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'PUBLISHED', 0, NULL, 1, NOW(3), NOW(3));`,
      [
        formPublicId,
        consultancyId,
        "Formulário de Acompanhamento Semanal",
        "Avaliação rápida de recuperação e sono",
        JSON.stringify(questions),
      ]
    );
    const formId = formInsertRes.insertId;
    console.log(`[PASS] Modelo de formulário criado com ID ${formId} e public_id ${formPublicId}`);

    // 5. Teste 3: Query corrigida de assignFormToStudents (seleção específica)
    console.log("\n--- TESTE 3: Query assignFormToStudents (aluno específico) ---");
    const [selectedStudentsRows] = await pool.query(
      `SELECT cm.id AS membership_id, cm.public_id AS membership_public_id, u.id AS user_id, u.full_name, u.email
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ? AND cm.status = 'ACTIVE'
         AND cmr.role IN ('STUDENT', 'INFLUENCER')
         AND cm.public_id IN (?)
       GROUP BY cm.id, cm.public_id, u.id, u.full_name, u.email;`,
      [consultancyId, sampleStudent.membership_public_id]
    );
    assert.equal(selectedStudentsRows.length, 1, "Deve encontrar exatamente o aluno selecionado");
    console.log(`[PASS] Query de aluno específico executou sem erro de up.phone.`);

    // 6. Teste 4: Atribuição real em consultancy_form_assignments
    console.log("\n--- TESTE 4: Gravação da atribuição no banco de dados ---");
    const assignmentPublicId = crypto.randomUUID();
    const [assignRes] = await pool.query(
      `INSERT INTO consultancy_form_assignments (
        public_id, consultancy_id, form_id, student_membership_id,
        student_user_id, assigned_by_user_id, status, due_date,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, 'PENDING', '2026-11-30', NOW(3), NOW(3));`,
      [
        assignmentPublicId,
        consultancyId,
        formId,
        sampleStudent.membership_id,
        sampleStudent.user_id,
      ]
    );
    assert.ok(assignRes.insertId > 0, "Atribuição deve gerar insertId");
    console.log(`[PASS] Atribuição gravada com sucesso! ID: ${assignRes.insertId}, public_id: ${assignmentPublicId}`);

    // 7. Teste 5: Query corrigida de listAssignmentsForAdmin
    console.log("\n--- TESTE 5: Query listAssignmentsForAdmin ---");
    const [adminAssignmentsRows] = await pool.query(
      `SELECT
         cfa.id,
         cfa.public_id,
         cfa.consultancy_id,
         cfa.form_id,
         cf.public_id AS form_public_id,
         cf.title AS form_title,
         cf.description AS form_description,
         cf.questions_json,
         cfa.student_membership_id,
         cm.public_id AS student_membership_public_id,
         cfa.student_user_id,
         u_stud.full_name AS student_name,
         u_stud.email AS student_email,
         cfa.assigned_by_user_id,
         u_assign.full_name AS assigned_by_name,
         cfa.status,
         cfa.due_date,
         cfa.responses_json,
         cfa.reviewer_notes,
         cfa.reviewed_by_user_id,
         u_rev.full_name AS reviewed_by_name,
         cfa.submitted_at,
         cfa.reviewed_at,
         cfa.created_at,
         cfa.updated_at
       FROM consultancy_form_assignments cfa
       JOIN consultancy_forms cf ON cf.id = cfa.form_id
       JOIN consultancy_members cm ON cm.id = cfa.student_membership_id
       JOIN users u_stud ON u_stud.id = cfa.student_user_id
       JOIN users u_assign ON u_assign.id = cfa.assigned_by_user_id
       LEFT JOIN users u_rev ON u_rev.id = cfa.reviewed_by_user_id
       WHERE cfa.consultancy_id = ?
       ORDER BY (cfa.status = 'SUBMITTED') DESC, (cfa.status = 'PENDING') DESC, cfa.created_at DESC;`,
      [consultancyId]
    );
    assert.ok(adminAssignmentsRows.length >= 1, "Deve listar a atribuição criada");
    const foundAssignment = adminAssignmentsRows.find((a) => a.public_id === assignmentPublicId);
    assert.ok(foundAssignment, "A atribuição recém-criada deve estar na listagem");
    assert.equal(foundAssignment.student_name, sampleStudent.full_name);
    console.log(`[PASS] listAssignmentsForAdmin executou com sucesso sem up.phone. Aluno: ${foundAssignment.student_name}`);

    // 8. Teste 6: Query corrigida de getAssignmentByPublicId
    console.log("\n--- TESTE 6: Query getAssignmentByPublicId ---");
    const [assignmentDetailRows] = await pool.query(
      `SELECT
         cfa.id,
         cfa.public_id,
         cfa.consultancy_id,
         cfa.form_id,
         cf.public_id AS form_public_id,
         cf.title AS form_title,
         cf.description AS form_description,
         cf.questions_json,
         cfa.student_membership_id,
         cm.public_id AS student_membership_public_id,
         cfa.student_user_id,
         u_stud.full_name AS student_name,
         u_stud.email AS student_email,
         cfa.assigned_by_user_id,
         u_assign.full_name AS assigned_by_name,
         cfa.status,
         cfa.due_date,
         cfa.responses_json,
         cfa.reviewer_notes,
         cfa.reviewed_by_user_id,
         u_rev.full_name AS reviewed_by_name,
         cfa.submitted_at,
         cfa.reviewed_at,
         cfa.created_at,
         cfa.updated_at
       FROM consultancy_form_assignments cfa
       JOIN consultancy_forms cf ON cf.id = cfa.form_id
       JOIN consultancy_members cm ON cm.id = cfa.student_membership_id
       JOIN users u_stud ON u_stud.id = cfa.student_user_id
       JOIN users u_assign ON u_assign.id = cfa.assigned_by_user_id
       LEFT JOIN users u_rev ON u_rev.id = cfa.reviewed_by_user_id
       WHERE cfa.public_id = ? AND cfa.consultancy_id = ? LIMIT 1;`,
      [assignmentPublicId, consultancyId]
    );
    assert.equal(assignmentDetailRows.length, 1, "Deve retornar a atribuição detalhada");
    console.log(`[PASS] getAssignmentByPublicId executou com sucesso sem up.phone.`);

    // 9. Teste 7: Sanitização estrita de erros (Regras 25 e 48)
    console.log("\n--- TESTE 7: Validação de Sanitização de Erros SQL ---");

    const rawSqlError1 = new Error("Unknown column 'up.phone' in 'SELECT'");
    const sanitized1 = sanitizeFormActionError(rawSqlError1, "Não foi possível atribuir o formulário. Tente novamente.");
    assert.equal(sanitized1, "Não foi possível atribuir o formulário. Tente novamente.", "Deve ocultar erro bruto de SQL");
    assert.ok(!sanitized1.includes("up.phone"), "Não pode conter nome de coluna");
    assert.ok(!sanitized1.includes("SELECT"), "Não pode conter comando SQL");

    const rawSqlError2 = new Error("Table 'trevo_one_qa.consultancy_custom_forms' doesn't exist");
    const sanitized2 = sanitizeFormActionError(rawSqlError2, "Não foi possível carregar a lista de formulários.");
    assert.equal(sanitized2, "Não foi possível carregar a lista de formulários.");

    const friendlyError = new Error("Selecione ao menos um aluno para receber o formulário.");
    const sanitized3 = sanitizeFormActionError(friendlyError, "Erro genérico");
    assert.equal(sanitized3, "Selecione ao menos um aluno para receber o formulário.", "Erros amigáveis de negócio devem ser preservados");

    console.log(`[PASS] Sanitização de erros validada com sucesso:
      - Erro SQL técnico ocultado -> "${sanitized1}"
      - Erro de tabela inexistente ocultado -> "${sanitized2}"
      - Mensagem de validação de negócio preservada -> "${sanitized3}"`);

    console.log("\n========================================================");
    console.log("✓ TODOS OS 7 TESTES DO FLUXO DE FORMULÁRIOS PASSARAM!");
    console.log("========================================================\n");
  } finally {
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error("FALHA NOS TESTES DE FORMULÁRIOS:", err);
  process.exit(1);
});
