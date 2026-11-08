import mysql from "mysql2/promise";
import crypto from "node:crypto";

const dbConfig = {
  host: "127.0.0.1",
  port: 3306,
  user: "trevo_qa",
  password: "trevo_one_qa_pass",
  database: "trevo_one_qa",
};

export async function seedQaData() {
  const pool = mysql.createPool(dbConfig);

  console.log("--- 1. Consultoria Saiya Shape ---");
  let [cRows] = await pool.query(
    "SELECT id, public_id, slug FROM consultancies WHERE slug = 'saiya-shape' LIMIT 1;"
  );
  let consultancyId;
  let consultancyPublicId;
  if (cRows.length === 0) {
    consultancyPublicId = crypto.randomUUID();
    const [ins] = await pool.query(
      "INSERT INTO consultancies (public_id, name, slug, status, created_at, updated_at) VALUES (?, 'Saiya Shape Consultoria', 'saiya-shape', 'ACTIVE', NOW(3), NOW(3));",
      [consultancyPublicId]
    );
    consultancyId = ins.insertId;
  } else {
    consultancyId = cRows[0].id;
    consultancyPublicId = cRows[0].public_id;
  }

  console.log("--- 2. Treinador / Admin User ---");
  let [tRows] = await pool.query(
    "SELECT id, public_id FROM users WHERE email = 'treinador.teste@trevoone.com' LIMIT 1;"
  );
  let trainerUserId;
  let trainerPublicId;
  if (tRows.length === 0) {
    trainerPublicId = crypto.randomUUID();
    const [uIns] = await pool.query(
      "INSERT INTO users (public_id, full_name, email, password_hash, status, created_at, updated_at) VALUES (?, 'Carlos Personal', 'treinador.teste@trevoone.com', 'dummy_hash', 'ACTIVE', NOW(3), NOW(3));",
      [trainerPublicId]
    );
    trainerUserId = uIns.insertId;
  } else {
    trainerUserId = tRows[0].id;
    trainerPublicId = tRows[0].public_id;
  }

  // Membro do treinador
  let [tmRows] = await pool.query(
    "SELECT id, public_id FROM consultancy_members WHERE consultancy_id = ? AND user_id = ? LIMIT 1;",
    [consultancyId, trainerUserId]
  );
  let trainerMemberId;
  let trainerMemberPublicId;
  if (tmRows.length === 0) {
    trainerMemberPublicId = crypto.randomUUID();
    const [ins] = await pool.query(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3));",
      [trainerMemberPublicId, consultancyId, trainerUserId]
    );
    trainerMemberId = ins.insertId;
  } else {
    trainerMemberId = tmRows[0].id;
    trainerMemberPublicId = tmRows[0].public_id;
  }

  await pool.query(
    "INSERT IGNORE INTO consultancy_member_roles (member_id, role, created_at) VALUES (?, 'PERSONAL', NOW(3)), (?, 'CONSULTANCY_ADMIN', NOW(3));",
    [trainerMemberId, trainerMemberId]
  );

  console.log("--- 3. Aluno Teste ---");
  let [sRows] = await pool.query(
    "SELECT id, public_id FROM users WHERE email = 'aluno.teste@trevoone.com' LIMIT 1;"
  );
  let studentUserId;
  if (sRows.length === 0) {
    const [uIns] = await pool.query(
      "INSERT INTO users (public_id, full_name, email, password_hash, status, created_at, updated_at) VALUES (UUID(), 'Rodrigo Aluno Teste', 'aluno.teste@trevoone.com', 'dummy_hash', 'ACTIVE', NOW(3), NOW(3));"
    );
    studentUserId = uIns.insertId;
  } else {
    studentUserId = sRows[0].id;
  }

  let [smRows] = await pool.query(
    "SELECT id, public_id FROM consultancy_members WHERE consultancy_id = ? AND user_id = ? LIMIT 1;",
    [consultancyId, studentUserId]
  );
  let studentMemberId;
  let studentMemberPublicId;
  if (smRows.length === 0) {
    studentMemberPublicId = crypto.randomUUID();
    const [ins] = await pool.query(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3));",
      [studentMemberPublicId, consultancyId, studentUserId]
    );
    studentMemberId = ins.insertId;
  } else {
    studentMemberId = smRows[0].id;
    studentMemberPublicId = smRows[0].public_id;
  }

  await pool.query(
    "INSERT IGNORE INTO consultancy_member_roles (member_id, role, created_at) VALUES (?, 'STUDENT', NOW(3));",
    [studentMemberId]
  );

  console.log("--- 4. Sessão de Autenticação Real ---");
  const rawSessionToken = crypto.randomBytes(32).toString("hex");
  const sessionTokenHash = crypto.createHash("sha256").update(rawSessionToken).digest("hex");
  await pool.query(
    "INSERT INTO auth_sessions (user_id, token_hash, remember_me, expires_at, created_at) VALUES (?, ?, 1, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 2 DAY), UTC_TIMESTAMP(3));",
    [trainerUserId, sessionTokenHash]
  );

  console.log("--- 5. Seed de 18 Exercícios no Catálogo Global ---");
  const exercises = [
    { name: "Supino reto com barra", muscle: "Peito", equip: "Barra" },
    { name: "Supino inclinado com halteres", muscle: "Peito", equip: "Halteres" },
    { name: "Crucifixo com halteres", muscle: "Peito", equip: "Halteres" },
    { name: "Tríceps testa na polia", muscle: "Tríceps", equip: "Polia" },
    { name: "Tríceps corda", muscle: "Tríceps", equip: "Polia" },
    { name: "Puxada frontal", muscle: "Costas", equip: "Polia" },
    { name: "Remada curvada com barra", muscle: "Costas", equip: "Barra" },
    { name: "Rosca direta com barra", muscle: "Bíceps", equip: "Barra" },
    { name: "Rosca martelo com halteres", muscle: "Bíceps", equip: "Halteres" },
    { name: "Agachamento livre com barra", muscle: "Quadríceps", equip: "Barra" },
    { name: "Leg press 45°", muscle: "Quadríceps", equip: "Máquina" },
    { name: "Cadeira extensora", muscle: "Quadríceps", equip: "Máquina" },
    { name: "Mesa flexora", muscle: "Posterior", equip: "Máquina" },
    { name: "Elevação lateral com halteres", muscle: "Ombros", equip: "Halteres" },
    { name: "Desenvolvimento com halteres", muscle: "Ombros", equip: "Halteres" },
    { name: "Panturrilha em pé", muscle: "Panturrilha", equip: "Máquina" },
    { name: "Abdominal supra no solo", muscle: "Abdômen", equip: "Peso corporal" },
    { name: "Elevação pélvica com barra", muscle: "Glúteos", equip: "Barra" },
  ];

  for (const ex of exercises) {
    const [existing] = await pool.query("SELECT id FROM exercises WHERE name = ? LIMIT 1;", [ex.name]);
    if (existing.length === 0) {
      const norm = ex.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      await pool.query(
        "INSERT INTO exercises (public_id, scope, consultancy_id, created_by_user_id, name, normalized_name, muscle_group_primary, equipment, status, created_at, updated_at) VALUES (UUID(), 'GLOBAL', NULL, ?, ?, ?, ?, ?, 'PUBLISHED', NOW(3), NOW(3));",
        [trainerUserId, ex.name, norm, ex.muscle, ex.equip]
      );
    }
  }

  console.log("--- 6. Ficha Modelo Existente para Testes de Templates ---");
  const [tmplRows] = await pool.query(
    "SELECT id, public_id FROM workouts WHERE consultancy_id = ? AND is_template = 1 LIMIT 1;",
    [consultancyId]
  );
  let templatePublicId;
  if (tmplRows.length === 0) {
    templatePublicId = crypto.randomUUID();
    const [wIns] = await pool.query(
      `INSERT INTO workouts (public_id, consultancy_id, created_by_membership_id, title, is_template, status, created_at, updated_at)
       VALUES (?, ?, ?, 'Modelo Padrão Hipertrofia AB', 1, 'PUBLISHED', NOW(3), NOW(3));`,
      [templatePublicId, consultancyId, trainerMemberId]
    );
    const tmplWorkoutId = wIns.insertId;

    const [vIns] = await pool.query(
      `INSERT INTO workout_versions (public_id, workout_id, version_number, title, status, created_by_membership_id, created_at, updated_at)
       VALUES (UUID(), ?, 1, 'Modelo Padrão Hipertrofia AB', 'PUBLISHED', ?, NOW(3), NOW(3));`,
      [tmplWorkoutId, trainerMemberId]
    );
    const tmplVersionId = vIns.insertId;

    const [bIns] = await pool.query(
      `INSERT INTO workout_blocks (public_id, workout_version_id, title, sort_order, block_type, created_at, updated_at)
       VALUES (UUID(), ?, 'Divisão A • Superior', 1, 'REGULAR', NOW(3), NOW(3));`,
      [tmplVersionId]
    );
    const blockAId = bIns.insertId;

    // Get an exercise
    const [supinoRow] = await pool.query("SELECT id FROM exercises WHERE name LIKE '%Supino reto%' LIMIT 1;");
    if (supinoRow.length > 0) {
      const [itIns] = await pool.query(
        `INSERT INTO workout_block_items (public_id, block_id, exercise_id, exercise_name_snapshot, muscle_group_snapshot, sort_order, created_at, updated_at)
         VALUES (UUID(), ?, ?, 'Supino reto com barra', 'Peito', 1, NOW(3), NOW(3));`,
        [blockAId, supinoRow[0].id]
      );
      await pool.query(
        `INSERT INTO workout_item_prescriptions (item_id, set_number, set_type, target_reps, target_load_kg, target_rest_seconds)
         VALUES (?, 1, 'NORMAL', 10, 80, 60), (?, 2, 'NORMAL', 10, 80, 60), (?, 3, 'NORMAL', 10, 80, 60);`,
        [itIns.insertId, itIns.insertId, itIns.insertId]
      );
    }
  } else {
    templatePublicId = tmplRows[0].public_id;
  }

  await pool.end();

  return {
    consultancySlug: "saiya-shape",
    consultancyPublicId,
    trainerUserId,
    trainerMemberPublicId,
    studentMemberPublicId,
    rawSessionToken,
    templatePublicId,
  };
}

if (process.argv[1]?.endsWith("seed-editor-4-qa-data.mjs")) {
  seedQaData()
    .then((res) => {
      console.log("QA Fixtures Ready:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
