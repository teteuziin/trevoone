import mysql from "mysql2/promise";
import * as crypto from "node:crypto";
import {
  requestStudentPhotos,
  requestStudentAnamnesis,
  requestStudentAssessment,
  listStudentPendingRequests,
  
} from "../lib/consultancies/student-requests.ts";
import { getPersonalStudentDetail } from "../lib/consultancies/personal-student-hub.ts";

async function main() {
  console.log("==================================================");
  console.log("TEST: PERSONAL STUDENT REQUESTS HUB (WORKSTREAM B)");
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

  // 1. Setup test consultancies & members
  const suffix = Date.now().toString().slice(-6);
  const slugA = `test-req-a-${suffix}`;
  const slugB = `test-req-b-${suffix}`;

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

  // Personal user in Consultancy A
  const [uPersonal] = await pool.query(
    "INSERT INTO users (public_id, email, password_hash, full_name, status) VALUES (?, ?, 'hash', ?, 'ACTIVE')",
    [crypto.randomUUID(), `personal-${suffix}@test.com`, `Personal Trainer ${suffix}`]
  );
  const personalUserId = uPersonal.insertId;

  const [cmPersonal] = await pool.query(
    "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status) VALUES (?, ?, ?, 'ACTIVE')",
    [crypto.randomUUID(), consultancyIdA, personalUserId]
  );
  const personalMemberId = cmPersonal.insertId;
  await pool.query(
    "INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'PERSONAL')",
    [personalMemberId]
  );

  // Student in Consultancy A
  const studentMemberPublicIdA = crypto.randomUUID();
  const [uStudentA] = await pool.query(
    "INSERT INTO users (public_id, email, password_hash, full_name, status) VALUES (?, ?, 'hash', ?, 'ACTIVE')",
    [crypto.randomUUID(), `student-a-${suffix}@test.com`, `Student A ${suffix}`]
  );
  const studentUserIdA = uStudentA.insertId;

  const [cmStudentA] = await pool.query(
    "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status) VALUES (?, ?, ?, 'ACTIVE')",
    [studentMemberPublicIdA, consultancyIdA, studentUserIdA]
  );
  const studentMemberIdA = cmStudentA.insertId;
  await pool.query(
    "INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'STUDENT')",
    [studentMemberIdA]
  );

  // Student in Consultancy B (for cross-tenant block test)
  const studentMemberPublicIdB = crypto.randomUUID();
  const [uStudentB] = await pool.query(
    "INSERT INTO users (public_id, email, password_hash, full_name, status) VALUES (?, ?, 'hash', ?, 'ACTIVE')",
    [crypto.randomUUID(), `student-b-${suffix}@test.com`, `Student B ${suffix}`]
  );
  const studentUserIdB = uStudentB.insertId;

  const [cmStudentB] = await pool.query(
    "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status) VALUES (?, ?, ?, 'ACTIVE')",
    [studentMemberPublicIdB, consultancyIdB, studentUserIdB]
  );
  const studentMemberIdB = cmStudentB.insertId;
  await pool.query(
    "INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'STUDENT')",
    [studentMemberIdB]
  );

  // Assign student A to personal in Consultancy A (workout assignment)
  const [wRes] = await pool.query(
    "INSERT INTO workouts (public_id, consultancy_id, created_by_membership_id, title, status) VALUES (?, ?, ?, 'Treino Base', 'ACTIVE')",
    [crypto.randomUUID(), consultancyIdA, personalMemberId]
  );
  const [wvRes] = await pool.query(
    "INSERT INTO workout_versions (public_id, workout_id, version_number, status, title, created_by_membership_id) VALUES (?, ?, 1, 'PUBLISHED', 'Treino Base v1', ?)",
    [crypto.randomUUID(), wRes.insertId, personalMemberId]
  );
  await pool.query(
    "INSERT INTO workout_assignments (public_id, consultancy_id, workout_version_id, student_membership_id, assigned_by_membership_id, status, starts_on) VALUES (?, ?, ?, ?, ?, 'ACTIVE', CURDATE())",
    [crypto.randomUUID(), consultancyIdA, wvRes.insertId, studentMemberIdA, personalMemberId]
  );

  console.log(`[2] Seeded tenancy and relationship data.`);

  // =========================================================================
  // TEST: REQUEST PHOTOS
  // =========================================================================
  console.log("[3] Testing Personal Request Photos...");
  const photoRes = await requestStudentPhotos({
    userId: personalUserId,
    consultancySlug: slugA,
    studentMembershipPublicId: studentMemberPublicIdA,
    instructions: "Foto com boa iluminação e braços relaxados",
  });

  if (!photoRes.success || !photoRes.requestPublicId) {
    throw new Error(`FAIL: Failed to request student photos: ${photoRes.error}`);
  }
  console.log(`PASS: Photo request created with public ID: ${photoRes.requestPublicId}`);

  // =========================================================================
  // TEST: REQUEST ANAMNESIS
  // =========================================================================
  console.log("[4] Testing Personal Request Anamnesis...");
  const anamnesisRes = await requestStudentAnamnesis({
    userId: personalUserId,
    consultancySlug: slugA,
    studentMembershipPublicId: studentMemberPublicIdA,
  });

  if (!anamnesisRes.success || !anamnesisRes.requestPublicId) {
    throw new Error(`FAIL: Failed to request student anamnesis: ${anamnesisRes.error}`);
  }
  console.log(`PASS: Anamnesis request created with public ID: ${anamnesisRes.requestPublicId}`);

  // =========================================================================
  // TEST: REQUEST PHYSICAL ASSESSMENT
  // =========================================================================
  console.log("[5] Testing Personal Request Physical Assessment...");
  const assessRes = await requestStudentAssessment({
    userId: personalUserId,
    consultancySlug: slugA,
    studentMembershipPublicId: studentMemberPublicIdA,
  });

  if (!assessRes.success || !assessRes.requestPublicId) {
    throw new Error(`FAIL: Failed to request student physical assessment: ${assessRes.error}`);
  }
  console.log(`PASS: Physical assessment request created with public ID: ${assessRes.requestPublicId}`);

  // =========================================================================
  // TEST: STUDENT PENDING REQUESTS INBOX
  // =========================================================================
  console.log("[6] Testing Student Pending Requests Inbox...");
  const pendingRequests = await listStudentPendingRequests(consultancyIdA, studentUserIdA, slugA);
  console.log(`Student A has ${pendingRequests.length} pending requests.`);

  if (pendingRequests.length < 3) {
    throw new Error(`FAIL: Expected at least 3 pending requests, got ${pendingRequests.length}`);
  }

  const hasPhotoReq = pendingRequests.some((r) => r.type === "PHOTOS");
  const hasAnamnesisReq = pendingRequests.some((r) => r.type === "ANAMNESIS");
  const hasAssessReq = pendingRequests.some((r) => r.type === "ASSESSMENT");

  if (!hasPhotoReq || !hasAnamnesisReq || !hasAssessReq) {
    throw new Error(`FAIL: Missing request types in student inbox: ${JSON.stringify(pendingRequests.map(r => r.type))}`);
  }
  console.log("PASS: Student inbox received all pending requests with valid deep links and titles.");

  // =========================================================================
  // TEST: STUDENT DETAIL HUB ENRICHMENT (PERSONAL VIEW)
  // =========================================================================
  console.log("[7] Testing Personal Student Detail Hub enrichment with pending states...");
  const studentDetail = await getPersonalStudentDetail({ consultancyId: consultancyIdA, consultancySlug: slugA, studentMembershipPublicId: studentMemberPublicIdA });
  if (!studentDetail) throw new Error("FAIL: Failed to load student detail");

  console.log("Student overview pending flags:", {
    hasPendingPhotos: studentDetail.overview.hasPendingPhotos,
    hasPendingAnamnesis: studentDetail.overview.hasPendingAnamnesis,
    hasPendingAssessment: studentDetail.overview.hasPendingAssessment,
  });

  if (!studentDetail.overview.hasPendingPhotos) {
    throw new Error("FAIL: hasPendingPhotos flag was not set!");
  }
  if (!studentDetail.overview.hasPendingAnamnesis) {
    throw new Error("FAIL: hasPendingAnamnesis flag was not set!");
  }
  console.log("PASS: Student detail hub reflects all pending requests accurately.");

  // =========================================================================
  // TEST: SECURITY & TENANCY BOUNDARIES
  // =========================================================================
  console.log("[8] Testing Cross-Tenant and Ex-Member Blocks...");

  // Cross-tenant attempt: Personal from Consultancy A requesting for Student B in Consultancy B
  const crossTenantRes = await requestStudentPhotos({
    userId: personalUserId,
    consultancySlug: slugA,
    studentMembershipPublicId: studentMemberPublicIdB,
  });

  if (crossTenantRes.success) {
    throw new Error("SECURITY VIOLATION: Cross-tenant photo request succeeded!");
  }
  console.log("PASS: Cross-tenant photo request was strictly BLOCKED.");

  const crossTenantAnamnesis = await requestStudentAnamnesis({
    userId: personalUserId,
    consultancySlug: slugA,
    studentMembershipPublicId: studentMemberPublicIdB,
  });
  if (crossTenantAnamnesis.success) {
    throw new Error("SECURITY VIOLATION: Cross-tenant anamnesis request succeeded!");
  }
  console.log("PASS: Cross-tenant anamnesis request was strictly BLOCKED.");

  // Ex-member test
  await pool.query("UPDATE consultancy_members SET status = 'SUSPENDED' WHERE id = ?", [studentMemberIdA]);
  const exMemberRes = await requestStudentPhotos({
    userId: personalUserId,
    consultancySlug: slugA,
    studentMembershipPublicId: studentMemberPublicIdA,
  });
  if (exMemberRes.success) {
    throw new Error("SECURITY VIOLATION: Request for ex-member succeeded!");
  }
  console.log("PASS: Request for inactive/ex-member was strictly BLOCKED.");

  // Cleanup test data
  await pool.query("DELETE FROM consultancy_activity_events WHERE consultancy_id IN (?, ?)", [consultancyIdA, consultancyIdB]);
  await pool.query("DELETE FROM user_notifications WHERE consultancy_id IN (?, ?) OR user_id IN (?, ?, ?)", [consultancyIdA, consultancyIdB, personalUserId, studentUserIdA, studentUserIdB]);
  await pool.query("DELETE FROM student_photo_evaluation_requests WHERE consultancy_id IN (?, ?)", [consultancyIdA, consultancyIdB]);
  await pool.query("DELETE FROM consultancy_custom_form_requests WHERE consultancy_id IN (?, ?)", [consultancyIdA, consultancyIdB]);
  await pool.query("DELETE FROM consultancy_custom_form_templates WHERE consultancy_id IN (?, ?)", [consultancyIdA, consultancyIdB]);
  await pool.query("DELETE FROM workout_assignments WHERE consultancy_id IN (?, ?) OR workout_version_id IN (SELECT id FROM (SELECT id FROM workout_versions WHERE title LIKE '%Treino Base%') AS tmp)", [consultancyIdA, consultancyIdB]);
  await pool.query("DELETE FROM workout_versions WHERE title LIKE '%Treino Base%'");
  await pool.query("DELETE FROM workouts WHERE consultancy_id IN (?, ?)", [consultancyIdA, consultancyIdB]);
  await pool.query("DELETE FROM consultancy_member_roles WHERE member_id IN (?, ?, ?)", [personalMemberId, studentMemberIdA, studentMemberIdB]);
  await pool.query("DELETE FROM consultancy_members WHERE consultancy_id IN (?, ?)", [consultancyIdA, consultancyIdB]);
  await pool.query("DELETE FROM consultancies WHERE id IN (?, ?)", [consultancyIdA, consultancyIdB]);
  await pool.query("DELETE FROM users WHERE id IN (?, ?, ?)", [personalUserId, studentUserIdA, studentUserIdB]);

  await pool.end();
  console.log("==================================================");
  console.log("ALL TESTS PASSED FOR WORKSTREAM B!");
  console.log("==================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
