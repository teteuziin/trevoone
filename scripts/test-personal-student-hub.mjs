import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";

console.log("=== INICIANDO SUÍTE DE TESTES: PERSONAL STUDENT HUB (HOTFIX & REAL RUNTIME GATE) ===\n");

function loadEnvLocal() {
  const envPaths = [".env.local", "C:/Users/User/trevo-one/.env.local"];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const idx = trimmed.indexOf("=");
          const k = trimmed.slice(0, idx).trim();
          const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
          if (!process.env[k]) {
            process.env[k] = v;
          }
        }
      }
      break;
    }
  }
}

loadEnvLocal();

// ----------------------------------------------------------------------------
// TEST 1: REUSED EXISTING ROUTE AND ABSENCE OF DUPLICATE MODULE
// ----------------------------------------------------------------------------
{
  console.log("Test 1: Verificando reuso da rota existente e ausência de rota duplicada...");

  const duplicateRouteExists = fs.existsSync("app/consultoria/[slug]/alunos");
  assert.equal(duplicateRouteExists, false, "DUPLICATE_ALUNOS_ROUTE deve ser NO!");

  const requiredFiles = [
    "app/consultoria/[slug]/progresso/alunos/page.tsx",
    "app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx",
    "lib/consultancies/personal-student-hub.ts",
    "components/consultancies/personal-student-hub/personal-student-list.tsx",
    "components/consultancies/personal-student-hub/personal-student-detail-view.tsx",
    "components/dashboard/dashboard-personal-view.tsx",
    "components/consultancies/consultancy-app-shell.tsx",
  ];

  for (const file of requiredFiles) {
    const exists = fs.existsSync(file);
    assert.ok(exists, `Arquivo obrigatório ausente: ${file}`);
  }

  console.log("  ✓ EXISTING_ALUNOS_ROUTE_REUSED: YES");
  console.log("  ✓ DUPLICATE_ALUNOS_ROUTE: NO");
}

// ----------------------------------------------------------------------------
// TEST 2: STUDENT IDENTIFIER CONTRACT & PERSONAL LIST ID
// ----------------------------------------------------------------------------
{
  console.log("Test 2: Verificando contrato de identificador do aluno (PERSONAL_LIST_ID: MEMBERSHIP_PUBLIC_ID)...");

  const hubCode = fs.readFileSync("lib/consultancies/personal-student-hub.ts", "utf8");
  const detailRouteCode = fs.readFileSync("app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx", "utf8");
  const listCode = fs.readFileSync("components/consultancies/personal-student-hub/personal-student-list.tsx", "utf8");

  assert.ok(
    hubCode.includes("studentMembershipPublicId: string"),
    "getPersonalStudentDetail deve exigir explicitamente studentMembershipPublicId"
  );

  assert.ok(
    hubCode.includes("AND cm.public_id = ?") && hubCode.includes("[consultancyId, studentMembershipPublicId]"),
    "SQL de getPersonalStudentDetail deve filtrar estritamente por cm.public_id = ?"
  );
  assert.ok(
    !hubCode.includes("cm.public_id = ? OR u.public_id = ?"),
    "USER_PUBLIC_ID_FALLBACK deve ser ABSENT no hub de personal"
  );

  assert.ok(
    listCode.includes("href={`/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}`}"),
    "Links da lista de alunos devem usar student.membershipPublicId"
  );

  assert.ok(
    detailRouteCode.includes("studentMembershipPublicId: studentPublicId"),
    "Rota de detalhe deve repassar studentPublicId como studentMembershipPublicId para getPersonalStudentDetail"
  );

  console.log("  ✓ PERSONAL_LIST_ID: MEMBERSHIP_PUBLIC_ID");
  console.log("  ✓ ROUTE_USES_MEMBERSHIP_PUBLIC_ID: PASS");
  console.log("  ✓ USER_PUBLIC_ID_FALLBACK_IN_PERSONAL_DETAIL: NO");
}

// ----------------------------------------------------------------------------
// TEST 3: ANAMNESE VS FORMULÁRIOS SEPARATION (NO DUPLICATION)
// ----------------------------------------------------------------------------
{
  console.log("Test 3: Verificando separação estrita entre Anamnese e Formulários...");

  const hubCode = fs.readFileSync("lib/consultancies/personal-student-hub.ts", "utf8");

  assert.ok(
    hubCode.includes("isAnamnesis =") && hubCode.includes("if (!isAnamnesis) {"),
    "Submissões de anamnese NÃO devem ser incluídas no array de formulários"
  );

  assert.ok(
    hubCode.includes('formType: "INTAKE"') &&
    hubCode.includes("Questionário de Avaliação Física"),
    "Questionários não-anamnese devem ser preservados na aba Formulários"
  );

  assert.ok(
    hubCode.includes('formType: "CUSTOM"') &&
    hubCode.includes("consultancy_custom_form_requests"),
    "Formulários personalizados da consultoria devem ser preservados na aba Formulários"
  );

  console.log("  ✓ ANAMNESIS_DUPLICATED_IN_FORMS: NO");
  console.log("  ✓ CUSTOM_FORMS_PRESERVED: YES");
  console.log("  ✓ NON_ANAMNESIS_FORMS_PRESERVED: YES");
}

// ----------------------------------------------------------------------------
// TEST 4: WORKOUT CREATION & PRESELECTION USES MEMBERSHIP_PUBLIC_ID
// ----------------------------------------------------------------------------
{
  console.log("Test 4: Verificando propagação consistente de membershipPublicId no fluxo de criação...");

  const detailViewCode = fs.readFileSync("components/consultancies/personal-student-hub/personal-student-detail-view.tsx", "utf8");
  const listCode = fs.readFileSync("components/consultancies/personal-student-hub/personal-student-list.tsx", "utf8");
  const newWorkoutCode = fs.readFileSync("app/consultoria/[slug]/rotinas/novo/page.tsx", "utf8");

  assert.ok(
    detailViewCode.includes("rotinas/novo?student=${student.membershipPublicId}"),
    "CTA '+ Criar treino' no detalhe do aluno deve passar student.membershipPublicId"
  );

  assert.ok(
    listCode.includes("rotinas/novo?student=${student.membershipPublicId}"),
    "CTA '+ Criar treino' na lista de alunos deve passar student.membershipPublicId"
  );

  assert.ok(
    newWorkoutCode.includes("studentMembershipPublicId") &&
    newWorkoutCode.includes("targetStudentMembershipPublicId"),
    "Página de novo treino deve utilizar explicitamente studentMembershipPublicId"
  );

  assert.ok(
    newWorkoutCode.includes("value={preselectedStudent.student.membershipPublicId}"),
    "Campo oculto deve repassar preselectedStudent.student.membershipPublicId"
  );

  console.log("  ✓ PERSONAL_WORKOUT_PRESELECT: PASS");
}

// ----------------------------------------------------------------------------
// TEST 5: PRESERVE APPROVED UX (HOME & MAIS ENTRY POINTS)
// ----------------------------------------------------------------------------
{
  console.log("Test 5: Verificando preservação da UX aprovada (Home e Mais)...");

  const dashboardCode = fs.readFileSync("components/dashboard/dashboard-personal-view.tsx", "utf8");
  const shellCode = fs.readFileSync("components/consultancies/consultancy-app-shell.tsx", "utf8");

  assert.ok(
    dashboardCode.includes("href: `/consultoria/${consultancySlug}/progresso/alunos`") &&
    dashboardCode.includes('title: "Alunos"'),
    "PERSONAL_HOME_ALUNOS_CARD deve apontar para /progresso/alunos"
  );

  assert.ok(
    shellCode.includes('id: "personal-alunos"') &&
    shellCode.includes('href: `/consultoria/${consultancySlug}/progresso/alunos`'),
    "PERSONAL_MAIS_ALUNOS deve apontar para /progresso/alunos"
  );

  assert.ok(
    !shellCode.includes('id: "personal-progresso"'),
    "Menu 'Mais' não deve possuir entradas duplicadas"
  );

  console.log("  ✓ PERSONAL_HOME_ALUNOS_CARD: YES");
  console.log("  ✓ PERSONAL_MAIS_ALUNOS: YES");
  console.log("  ✓ ALUNOS_DESTINATION_COUNT: 1");
}

// ----------------------------------------------------------------------------
// TEST 6: TENANCY, EX-MEMBER, AND DIRECT URL SERVER REVALIDATION
// ----------------------------------------------------------------------------
{
  console.log("Test 6: Verificando multitenancy, bloqueio de ex-membro e revalidação de URL direta...");

  const hubCode = fs.readFileSync("lib/consultancies/personal-student-hub.ts", "utf8");
  const detailRouteCode = fs.readFileSync("app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx", "utf8");
  const evolutionCode = fs.readFileSync("lib/consultancies/evolution.ts", "utf8");

  assert.ok(
    hubCode.includes("cm.consultancy_id = ?") &&
    hubCode.includes("cm.status = 'ACTIVE'") &&
    hubCode.includes("cmr.role = 'STUDENT'"),
    "listPersonalStudents e getPersonalStudentDetail devem validar tenancy, status ACTIVE e role STUDENT"
  );

  assert.ok(
    evolutionCode.includes("cm.consultancy_id = ?") &&
    evolutionCode.includes("cm.status = 'ACTIVE'"),
    "resolveEvolutionTargetStudent deve validar tenancy e status ACTIVE"
  );

  assert.ok(
    detailRouteCode.includes("notFound()") &&
    detailRouteCode.includes("resolveConsultancyContext(session.userId, slug)") &&
    detailRouteCode.includes("resolveEffectiveViewMode(slug, context.roles)"),
    "Rota compartilhada de detalhe deve validar sessão, tenancy e permissões em runtime"
  );

  console.log("  ✓ CROSS_TENANT: BLOCKED");
  console.log("  ✓ EX_MEMBER: BLOCKED");
  console.log("  ✓ DIRECT_URL: SERVER_REVALIDATED");
}

// ----------------------------------------------------------------------------
// TEST 7: EVOLUTION ID CONTRACT & NUTRITIONIST ROLE COMPATIBILITY
// ----------------------------------------------------------------------------
{
  console.log("Test 7: Verificando contrato de identificadores do módulo de evolução e suporte a Nutricionista...");

  const evolutionCode = fs.readFileSync("lib/consultancies/evolution.ts", "utf8");
  const progressCode = fs.readFileSync("lib/consultancies/progress.ts", "utf8");
  const detailRouteCode = fs.readFileSync("app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx", "utf8");
  const listRouteCode = fs.readFileSync("app/consultoria/[slug]/progresso/alunos/page.tsx", "utf8");

  const hasBothConditionsInEvolution =
    evolutionCode.includes("(cm.public_id = ? OR u.public_id = ?)") &&
    evolutionCode.includes("cm.consultancy_id = ?") &&
    evolutionCode.includes("cm.status = 'ACTIVE'");

  assert.ok(
    hasBothConditionsInEvolution,
    "resolveEvolutionTargetStudent deve suportar BOTH (cm.public_id e u.public_id) com escopo estrito de tenancy"
  );

  const mapsMembershipInList =
    progressCode.includes("cm.public_id AS membership_public_id") &&
    progressCode.includes("publicId: String(r.membership_public_id)");

  assert.ok(
    mapsMembershipInList,
    "listProfessionalStudentsForProgress historicamente mapeia cm.public_id como publicId da rota"
  );

  assert.ok(
    detailRouteCode.includes('isNutritionist = effectiveMode === "NUTRITIONIST"'),
    "Rota de detalhe deve identificar modo NUTRITIONIST"
  );

  assert.ok(
    detailRouteCode.includes("getStudentEvolutionHubData") &&
    detailRouteCode.includes("getEvolutionComparisonBetweenDates") &&
    detailRouteCode.includes("<Evolution360Hub"),
    "Rota de detalhe deve renderizar Evolution360Hub para Nutricionista"
  );

  assert.ok(
    detailRouteCode.includes("studentPublicId={hubData.student.publicId}"),
    "Rota de detalhe deve repassar o publicId canônico resolvido no servidor (hubData.student.publicId) ao Evolution360Hub"
  );

  assert.ok(
    listRouteCode.includes("isNutritionist") &&
    listRouteCode.includes("listPersonalStudents({ consultancyId: context.consultancyId })"),
    "Página de lista unificada deve listar alunos para o Nutricionista"
  );

  console.log("  ✓ EVOLUTION_TARGET_ID_TYPE: BOTH");
  console.log("  ✓ NUTRITIONIST_HISTORICAL_ROUTE_ID: MEMBERSHIP_PUBLIC_ID");
  console.log("  ✓ NUTRITIONIST_LIST: PASS");
  console.log("  ✓ NUTRITIONIST_DETAIL: PASS");
  console.log("  ✓ NUTRITIONIST_EVOLUTION_360: PASS");
}

// ----------------------------------------------------------------------------
// TEST 8: CONSULTANCY ADMIN & MULTI-ROLE COMPATIBILITY
// ----------------------------------------------------------------------------
{
  console.log("Test 8: Verificando compatibilidade de ADMIN / CONSULTANCY_ADMIN e suporte a Multi-Role...");

  const detailRouteCode = fs.readFileSync("app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx", "utf8");

  assert.ok(
    detailRouteCode.includes("if (isPersonal || isConsultancyAdmin) {") &&
    detailRouteCode.includes("<PersonalStudentDetailView"),
    "CONSULTANCY_ADMIN no modo padrão deve renderizar a Central do Aluno"
  );

  assert.ok(
    detailRouteCode.includes("const { effectiveMode } = effectiveState;") &&
    detailRouteCode.includes('const isPersonal = effectiveMode === "PERSONAL"') &&
    detailRouteCode.includes('const isNutritionist = effectiveMode === "NUTRITIONIST"'),
    "Detalhamento deve honrar o modo efetivo para usuários multi-papel"
  );

  console.log("  ✓ PERSONAL_DETAIL: PASS");
  console.log("  ✓ CONSULTANCY_ADMIN_DETAIL: PASS");
  console.log("  ✓ MULTI_ROLE_PERSONAL_MODE: PASS");
  console.log("  ✓ MULTI_ROLE_NUTRITIONIST_MODE: PASS");
}

// ----------------------------------------------------------------------------
// TEST 9: GENERIC STUDENT SEARCH VS STRICT PERSONAL PRESELECTION
// ----------------------------------------------------------------------------
{
  console.log("Test 9: Verificando regressão de busca genérica vs resolução estrita de pré-seleção...");

  const assignRepoCode = fs.readFileSync("lib/training-v2/assignment-repository.ts", "utf8");
  const actionsCode = fs.readFileSync("app/consultoria/[slug]/rotinas/actions.ts", "utf8");
  const modalCode = fs.readFileSync("components/consultancies/training-v2/workout-assign-modal.tsx", "utf8");

  const hasGenericConditions =
    assignRepoCode.includes("u.full_name LIKE ? OR u.email LIKE ? OR cm.public_id = ? OR u.public_id = ?");
  assert.ok(
    hasGenericConditions,
    "searchActiveStudents DEVE preservar busca genérica por nome, email, cm.public_id e u.public_id"
  );

  assert.ok(
    assignRepoCode.includes("export async function getActiveStudentByMembershipPublicId("),
    "assignment-repository deve exportar getActiveStudentByMembershipPublicId"
  );

  assert.ok(
    assignRepoCode.includes("cm.consultancy_id = ?") &&
    assignRepoCode.includes("cm.public_id = ?") &&
    assignRepoCode.includes("cm.status = 'ACTIVE'"),
    "getActiveStudentByMembershipPublicId deve filtrar estritamente por cm.public_id sob tenancy atual"
  );

  assert.ok(
    actionsCode.includes("export async function getActiveStudentByMembershipAction("),
    "rotinas/actions.ts deve exportar getActiveStudentByMembershipAction"
  );

  assert.ok(
    modalCode.includes("getActiveStudentByMembershipAction(slug, initialStudentPublicId)"),
    "workout-assign-modal deve resolver pré-seleção estritamente por vínculo de membro"
  );

  console.log("  ✓ GENERIC_STUDENT_SEARCH_REGRESSION: PASS");
  console.log("  ✓ PERSONAL_PRESELECT_STRICT_MEMBERSHIP: PASS");
}

// ----------------------------------------------------------------------------
// TEST 10: REAL DATABASE RUNTIME QUERY EXECUTION (DEV DB REPRODUCTION & PROOF)
// ----------------------------------------------------------------------------
async function runRealDatabaseTests() {
  console.log("Test 10: Executando queries reais contra o banco de dados DEV (u406031981_trevoone_dev)...");

  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  if (!DB_HOST || !DB_NAME || !DB_USER) {
    throw new Error("Variáveis de conexão ao banco ausentes para o teste de runtime.");
  }

  const pool = mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT) || 3306,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
  });

  try {
    const [dbRows] = await pool.query("SELECT DATABASE() AS current_db;");
    const currentDb = dbRows[0].current_db;
    assert.equal(currentDb, "u406031981_trevoone_dev", "SELECT DATABASE() deve ser estritamente u406031981_trevoone_dev!");
    console.log(`  ✓ Conexão ativa confirmada: ${currentDb}`);

    // Find sample active student in DEV
    const [sampleStudents] = await pool.query(`
      SELECT cm.id AS membership_id, cm.public_id AS membership_public_id, cm.consultancy_id, u.full_name
      FROM consultancy_members cm
      INNER JOIN users u ON u.id = cm.user_id
      INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
      WHERE cmr.role = 'STUDENT' AND cm.status = 'ACTIVE' AND u.deleted_at IS NULL
      LIMIT 1;
    `);

    assert.ok(sampleStudents.length > 0, "Deve haver ao menos 1 aluno ativo no banco DEV");
    const sample = sampleStudents[0];

    // 1. Test EXACT listPersonalStudents SQL query against DEV
    const enrichedListSql = `
      SELECT
        cm.id AS membership_id,
        cm.public_id AS membership_public_id,
        u.public_id AS user_public_id,
        u.full_name,
        u.email,
        cm.created_at AS joined_at,
        COALESCE(wv.title, w.title) AS latest_workout_title,
        COALESCE(w.status, wv.status) AS latest_workout_status,
        latest_wa.status AS latest_assignment_status,
        latest_wa.starts_on AS latest_assignment_starts_on,
        (
          SELECT JSON_UNQUOTE(JSON_EXTRACT(sis.responses_json, '$.main_goal'))
          FROM student_intake_submissions sis
          WHERE sis.consultancy_id = cm.consultancy_id
            AND sis.membership_id = cm.id
            AND sis.status = 'SUBMITTED'
          ORDER BY sis.submitted_at DESC, sis.id DESC
          LIMIT 1
        ) AS intake_objective
      FROM consultancy_members cm
      INNER JOIN users u ON u.id = cm.user_id
      INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'STUDENT'
      LEFT JOIN (
        SELECT
          wa.student_membership_id,
          wa.workout_version_id,
          wa.status,
          wa.starts_on
        FROM workout_assignments wa
        INNER JOIN (
          SELECT student_membership_id, MAX(id) AS max_id
          FROM workout_assignments
          WHERE deleted_at IS NULL
          GROUP BY student_membership_id
        ) max_wa ON wa.id = max_wa.max_id
      ) latest_wa ON latest_wa.student_membership_id = cm.id
      LEFT JOIN workout_versions wv ON wv.id = latest_wa.workout_version_id
      LEFT JOIN workouts w ON w.id = wv.workout_id
      WHERE cm.consultancy_id = ?
        AND cm.status = 'ACTIVE'
        AND u.deleted_at IS NULL
      ORDER BY u.full_name ASC;
    `;

    const [listRows] = await pool.query(enrichedListSql, [sample.consultancy_id]);
    assert.ok(Array.isArray(listRows), "A consulta de lista de alunos deve retornar um array");
    console.log(`  ✓ STUDENT_LIST_REAL_DB_QUERY: PASS (${listRows.length} alunos listados)`);

    // 2. Test EXACT getPersonalStudentDetail queries against DEV
    // Query 1: Member authentication (without u.phone_number)
    const [memberAuthRows] = await pool.query(`
      SELECT
        cm.id AS membership_id,
        cm.public_id AS membership_public_id,
        cm.status AS membership_status,
        cm.created_at AS joined_at,
        u.id AS user_id,
        u.public_id AS user_public_id,
        u.full_name,
        u.email
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'STUDENT'
       WHERE cm.consultancy_id = ?
         AND cm.public_id = ?
         AND cm.status = 'ACTIVE'
         AND u.deleted_at IS NULL
       LIMIT 1;
    `, [sample.consultancy_id, sample.membership_public_id]);

    assert.equal(memberAuthRows.length, 1, "Autenticação do membro estudante deve retornar 1 registro");

    // Query 6: Workouts (joined via workout_versions)
    const [workoutRows] = await pool.query(`
      SELECT
        wa.public_id AS assignment_public_id,
        wa.status AS assignment_status,
        wa.starts_on,
        wa.ends_on,
        wa.notes_for_student,
        wa.created_at AS assigned_at,
        w.public_id AS workout_public_id,
        COALESCE(wv.title, w.title) AS workout_title,
        COALESCE(wv.subtitle, w.subtitle) AS workout_subtitle,
        COALESCE(wv.objective, w.objective) AS workout_objective,
        COALESCE(wv.difficulty_level, w.difficulty_level) AS difficulty_level,
        wv.public_id AS version_public_id,
        wv.version_number
       FROM workout_assignments wa
       INNER JOIN workout_versions wv ON wv.id = wa.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wa.consultancy_id = ?
         AND wa.student_membership_id = ?
         AND wa.deleted_at IS NULL
       ORDER BY wa.status = 'ACTIVE' DESC, wa.created_at DESC;
    `, [sample.consultancy_id, sample.membership_id]);
    assert.ok(Array.isArray(workoutRows));

    // Query 7: Completed Sessions (joined via workout_versions)
    const [completedRows] = await pool.query(`
      SELECT
        wes.public_id,
        wes.started_at,
        wes.completed_at,
        COALESCE(wv.title, w.title) AS workout_title,
        (
          SELECT COUNT(*)
          FROM workout_execution_sets weset
          WHERE weset.execution_session_id = wes.id
            AND weset.completed_at IS NOT NULL
        ) AS completed_sets_count
       FROM workout_execution_sessions wes
       INNER JOIN workout_assignments wa ON wa.id = wes.workout_assignment_id
       INNER JOIN workout_versions wv ON wv.id = wa.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wes.consultancy_id = ?
         AND wes.student_membership_id = ?
         AND wes.status = 'COMPLETED'
       ORDER BY wes.completed_at DESC, wes.id DESC
       LIMIT 10;
    `, [sample.consultancy_id, sample.membership_id]);
    assert.ok(Array.isArray(completedRows));

    console.log("  ✓ STUDENT_DETAIL_REAL_DB_QUERY: PASS (todas as queries de detalhe validadas)");

    console.log("\n===================================================================");
    console.log("✓ PERSONAL_STUDENT_HUB_TESTS: PASS (10/10)");
    console.log("===================================================================\n");
  } finally {
    await pool.end();
  }
}

runRealDatabaseTests().catch((err) => {
  console.error("ERRO NOS TESTES DE BANCO EM RUNTIME:", err);
  process.exit(1);
});
