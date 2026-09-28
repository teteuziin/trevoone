import mysql from "mysql2/promise";
import crypto from "node:crypto";
import {
  recordConsultancyActivity,
  listConsultancyActivityEvents,
  getConsultancyActivityEventDetail,
  sanitizeMetadata,
} from "../lib/consultancies/activity-log.ts";

async function main() {
  console.log("==================================================");
  console.log("TEST: CONSULTANCY ACTIVITY CENTER (WORKSTREAM A)");
  console.log("==================================================");

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [dbRows] = await pool.query("SELECT DATABASE() AS db;");
  const currentDb = dbRows[0].db;
  console.log(`[1] Connected to DB: ${currentDb}`);
  if (currentDb !== "u406031981_trevoone_dev") {
    throw new Error(`Safety violation: expected dev database, got ${currentDb}`);
  }

  // 1. Setup two test consultancies to verify tenancy isolation
  const suffix = Date.now().toString().slice(-6);
  const slugA = `test-act-a-${suffix}`;
  const slugB = `test-act-b-${suffix}`;

  const [cResA] = await pool.query(
    "INSERT INTO consultancies (public_id, name, slug, status) VALUES (?, ?, ?, 'ACTIVE')",
    [crypto.randomUUID(), `Consultoria A ${suffix}`, slugA]
  );
  const consultancyIdA = cResA.insertId;

  const [cResB] = await pool.query(
    "INSERT INTO consultancies (public_id, name, slug, status) VALUES (?, ?, ?, 'ACTIVE')",
    [crypto.randomUUID(), `Consultoria B ${suffix}`, slugB]
  );
  const consultancyIdB = cResB.insertId;

  // Create test users
  const [uResAdmin] = await pool.query(
    "INSERT INTO users (public_id, email, password_hash, full_name, status) VALUES (?, ?, 'hash', ?, 'ACTIVE')",
    [crypto.randomUUID(), `admin-${suffix}@test.com`, `Admin User ${suffix}`]
  );
  const adminUserId = uResAdmin.insertId;

  const [uResPersonal] = await pool.query(
    "INSERT INTO users (public_id, email, password_hash, full_name, status) VALUES (?, ?, 'hash', ?, 'ACTIVE')",
    [crypto.randomUUID(), `personal-${suffix}@test.com`, `Personal User ${suffix}`]
  );
  const personalUserId = uResPersonal.insertId;

  const [uResNutritionist] = await pool.query(
    "INSERT INTO users (public_id, email, password_hash, full_name, status) VALUES (?, ?, 'hash', ?, 'ACTIVE')",
    [crypto.randomUUID(), `nutri-${suffix}@test.com`, `Nutri User ${suffix}`]
  );
  const nutriUserId = uResNutritionist.insertId;

  const [uResStudent] = await pool.query(
    "INSERT INTO users (public_id, email, password_hash, full_name, status) VALUES (?, ?, 'hash', ?, 'ACTIVE')",
    [crypto.randomUUID(), `student-${suffix}@test.com`, `Student User ${suffix}`]
  );
  const studentUserId = uResStudent.insertId;

  // Create membership for student in Consultancy A
  const [cmStudent] = await pool.query(
    "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status) VALUES (?, ?, ?, 'ACTIVE')",
    [crypto.randomUUID(), consultancyIdA, studentUserId]
  );
  const studentMembershipId = cmStudent.insertId;

  console.log(`[2] Seeded tenancy test data: Consultancy A (${consultancyIdA}), Consultancy B (${consultancyIdB})`);

  // =========================================================================
  // TEST: ZERO SECRETS & SENSITIVE HEALTH DATA SANITIZATION
  // =========================================================================
  console.log("[3] Testing metadata sanitization (secrets & clinical data)...");
  const rawMetadataWithSecrets = {
    workoutName: "Treino Hipertrofia A",
    password: "SuperSecretPassword123!",
    api_key: "sk-proj-1234567890abcdef",
    sessionToken: "jwt-token-sample-123",
    authToken: "Bearer xyz",
    cookie: "session_id=12345",
    safeDetail: "3 séries de agachamento",
    responses_json: {
      has_heart_issue: true,
      cardiac_symptoms: "chest pain during cardio",
    },
  };

  const sanitized = sanitizeMetadata(rawMetadataWithSecrets);
  console.log("Sanitized result:", JSON.stringify(sanitized));

  if ("password" in sanitized || "api_key" in sanitized || "sessionToken" in sanitized || "authToken" in sanitized || "cookie" in sanitized) {
    throw new Error("FAIL: Secrets were not scrubbed from metadata!");
  }
  if (sanitized.responses_json !== "[REDACTED_CLINICAL_PAYLOAD]") {
    throw new Error(`FAIL: Clinical health payload was not redacted: ${JSON.stringify(sanitized.responses_json)}`);
  }
  if (sanitized.workoutName !== "Treino Hipertrofia A" || sanitized.safeDetail !== "3 séries de agachamento") {
    throw new Error("FAIL: Safe metadata fields were incorrectly lost!");
  }
  console.log("PASS: Secrets and sensitive clinical payloads correctly redacted.");

  // =========================================================================
  // TEST: EVENT RECORDING IN CONSULTANCY A
  // =========================================================================
  console.log("[4] Testing activity event recording across core modules...");

  // 1. Workout created by Personal
  const workoutEventPublicId = await recordConsultancyActivity({
    consultancyId: consultancyIdA,
    actorUserId: personalUserId,
    actorRole: "PERSONAL",
    action: "WORKOUT_CREATED",
    module: "PERSONAL",
    resourceType: "workout",
    resourcePublicId: crypto.randomUUID(),
    subjectMembershipId: studentMembershipId,
    summary: 'Treino "Peito e Tríceps" criado',
    metadata: { ...rawMetadataWithSecrets },
  });
  if (!workoutEventPublicId) throw new Error("FAIL: Failed to record WORKOUT_CREATED");

  // 2. Nutrition plan created by Nutritionist
  const nutriEventPublicId = await recordConsultancyActivity({
    consultancyId: consultancyIdA,
    actorUserId: nutriUserId,
    actorRole: "NUTRITIONIST",
    action: "NUTRITION_PLAN_CREATED",
    module: "NUTRITION",
    resourceType: "nutrition_plan",
    resourcePublicId: crypto.randomUUID(),
    subjectMembershipId: studentMembershipId,
    summary: 'Plano Alimentar "Cutting 2200kcal" criado',
    metadata: { calories_target: 2200, meals_count: 5 },
  });
  if (!nutriEventPublicId) throw new Error("FAIL: Failed to record NUTRITION_PLAN_CREATED");

  // 3. Form requested by Admin
  const formEventPublicId = await recordConsultancyActivity({
    consultancyId: consultancyIdA,
    actorUserId: adminUserId,
    actorRole: "CONSULTANCY_ADMIN",
    action: "CUSTOM_FORM_REQUESTED",
    module: "FORMS",
    resourceType: "form_request",
    resourcePublicId: crypto.randomUUID(),
    subjectMembershipId: studentMembershipId,
    summary: 'Formulário "Check-in Semanal" solicitado',
    metadata: { templateTitle: "Check-in Semanal" },
  });
  if (!formEventPublicId) throw new Error("FAIL: Failed to record CUSTOM_FORM_REQUESTED");

  // 4. Form submitted by Student
  const studentSubmitEventId = await recordConsultancyActivity({
    consultancyId: consultancyIdA,
    actorUserId: studentUserId,
    actorRole: "STUDENT",
    action: "CUSTOM_FORM_SUBMITTED",
    module: "FORMS",
    resourceType: "form_request",
    resourcePublicId: crypto.randomUUID(),
    subjectMembershipId: studentMembershipId,
    summary: 'Respostas do formulário "Check-in Semanal" enviadas pelo aluno',
    metadata: { responses_json: { weight: 75.5 } },
  });
  if (!studentSubmitEventId) throw new Error("FAIL: Failed to record CUSTOM_FORM_SUBMITTED");

  // 5. AI Import Contract events
  const aiEventPublicId = await recordConsultancyActivity({
    consultancyId: consultancyIdA,
    actorUserId: personalUserId,
    actorRole: "PERSONAL",
    action: "AI_IMPORT_COMPLETED",
    module: "AI",
    resourceType: "workout_import",
    resourcePublicId: crypto.randomUUID(),
    summary: "Importação de treino via IA concluída",
    metadata: { pages: 2, extracted_exercises: 8, confidence: "HIGH" },
  });
  if (!aiEventPublicId) throw new Error("FAIL: Failed to record AI_IMPORT_COMPLETED");

  console.log("PASS: Successfully recorded events for PERSONAL, NUTRITION, FORMS, STUDENT, and AI.");

  // =========================================================================
  // TEST: EVENT RECORDING IN CONSULTANCY B (TENANCY CHECK)
  // =========================================================================
  console.log("[5] Testing tenancy boundary with Consultancy B...");

  const eventInB = await recordConsultancyActivity({
    consultancyId: consultancyIdB,
    actorUserId: adminUserId,
    actorRole: "CONSULTANCY_ADMIN",
    action: "CONSULTANCY_INVITATION_CREATED",
    module: "MEMBERS",
    resourceType: "invitation",
    resourcePublicId: crypto.randomUUID(),
    summary: "Convite criado na consultoria B",
    metadata: { email: "invited-b@test.com" },
  });

  // Query events for Consultancy A
  const { events: eventsA, total: totalA } = await listConsultancyActivityEvents(consultancyIdA);
  console.log(`Consultancy A returned ${eventsA.length} events (total: ${totalA})`);

  // Verify none of Consultancy B's events appear in Consultancy A
  const leakFound = eventsA.some((e) => e.consultancy_id === Number(consultancyIdB) || e.public_id === eventInB);
  if (leakFound) {
    throw new Error("SECURITY VIOLATION: Cross-tenant event leaked into Consultancy A!");
  }

  // Verify direct detail query blocked across tenants
  const crossTenantDetail = await getConsultancyActivityEventDetail(consultancyIdA, eventInB);
  if (crossTenantDetail !== null) {
    throw new Error("SECURITY VIOLATION: getConsultancyActivityEventDetail permitted cross-tenant access!");
  }
  console.log("PASS: Tenancy isolation strictly enforced. Cross-tenant access BLOCKED.");

  // =========================================================================
  // TEST: FILTERING AND SEARCH
  // =========================================================================
  console.log("[6] Testing filters and search...");

  // Module filter
  const { events: personalEvents } = await listConsultancyActivityEvents(consultancyIdA, { module: "PERSONAL" });
  if (personalEvents.length === 0 || personalEvents.some((e) => e.module !== "PERSONAL")) {
    throw new Error("FAIL: Module filter returned incorrect events!");
  }

  // Role filter
  const { events: nutriEvents } = await listConsultancyActivityEvents(consultancyIdA, { actorRole: "NUTRITIONIST" });
  if (nutriEvents.length === 0 || nutriEvents.some((e) => e.actor_role !== "NUTRITIONIST")) {
    throw new Error("FAIL: Actor role filter returned incorrect events!");
  }

  // Search filter
  const { events: searchEvents } = await listConsultancyActivityEvents(consultancyIdA, { search: "Cutting" });
  if (searchEvents.length === 0 || !searchEvents[0].summary.includes("Cutting")) {
    throw new Error("FAIL: Search filter did not find expected summary!");
  }

  // Subject membership filter
  const { events: studentSubjectEvents } = await listConsultancyActivityEvents(consultancyIdA, {
    subjectMembershipId: studentMembershipId,
  });
  if (studentSubjectEvents.length === 0 || studentSubjectEvents.some((e) => Number(e.subject_membership_id) !== Number(studentMembershipId))) {
    throw new Error("FAIL: Subject membership filter returned incorrect events!");
  }
  console.log("PASS: All filter dimensions (module, role, search, subject) function correctly.");

  // Cleanup test data
  await pool.query("DELETE FROM consultancy_activity_events WHERE consultancy_id IN (?, ?)", [consultancyIdA, consultancyIdB]);
  await pool.query("DELETE FROM consultancy_members WHERE consultancy_id IN (?, ?)", [consultancyIdA, consultancyIdB]);
  await pool.query("DELETE FROM consultancies WHERE id IN (?, ?)", [consultancyIdA, consultancyIdB]);
  await pool.query("DELETE FROM users WHERE id IN (?, ?, ?, ?)", [adminUserId, personalUserId, nutriUserId, studentUserId]);

  await pool.end();
  console.log("==================================================");
  console.log("ALL TESTS PASSED FOR WORKSTREAM A!");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
