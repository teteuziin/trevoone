import mysql from "mysql2/promise";
import crypto from "node:crypto";
import {
  updateConsultancyReferralSettings,
  getOrCreateReferralCode,
  validateReferralCode,
  recordReferralConversion,
  maskPixKey,
  saveMemberPayoutProfile,
  getMemberPayoutProfile,
  getRevealedPayoutProfileForAdmin,
  getAdminReferralsData,
  approveCommission,
  cancelCommission,
  markCommissionPaid,
} from "../lib/referrals/service.ts";

import {
  submitDailyCheckin,
  getTodayCheckin,
} from "../lib/checkins/service.ts";

import {
  recordMemberActivity,
  getMemberLastActive,
} from "../lib/monitoring/activity-tracker.ts";

import {
  evaluateStudentMonitoring,
  resolveAlert,
} from "../lib/monitoring/evaluator.ts";

import {
  getProfessionalRadarData,
} from "../lib/monitoring/professional-radar.ts";

import {
  createProfessionalAdminAction,
  resolveProfessionalAdminAction,
  isProfessionalAssignmentPaused,
  listProfessionalAdminActions,
} from "../lib/monitoring/admin-actions.ts";

import {
  generateSupervisorSummary,
} from "../lib/monitoring/supervisor-summary.ts";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (!condition) {
    console.error("  [FAIL]: " + message);
    failedCount++;
    throw new Error(message);
  } else {
    console.log("  [PASS]: " + message);
    passedCount++;
  }
}

async function run() {
  console.log("==================================================");
  console.log("STARTING GROWTH + MONITORING + OPERATIONS V1 TESTS");
  console.log("==================================================");

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const conn = await pool.getConnection();

  try {
    console.log("\n--- SETTING UP ISOLATED TEST FIXTURES ---");
    
    // Create test consultancy
    const testSlug = "test-growth-" + Date.now();
    const [cRes] = await conn.execute(
      "INSERT INTO consultancies (public_id, name, slug, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), "Consultoria Teste Growth", testSlug]
    );
    const testConsultancyId = cRes.insertId;

    // Create a secondary consultancy for cross-tenant testing
    const [c2Res] = await conn.execute(
      "INSERT INTO consultancies (public_id, name, slug, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), "Consultoria Secundária", testSlug + "-sec"]
    );
    const secConsultancyId = c2Res.insertId;

    // Create Admin User & Member
    const [uAdmin] = await conn.execute(
      "INSERT INTO users (public_id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, 'hash', 'Admin Teste', 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), "admin-" + Date.now() + "@test.com"]
    );
    const adminUserId = uAdmin.insertId;
    const [cmAdmin] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), testConsultancyId, adminUserId]
    );
    const adminMemberId = cmAdmin.insertId;
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'CONSULTANCY_ADMIN')", [adminMemberId]);

    // Create Student Referrer User & Member
    const [uStudent] = await conn.execute(
      "INSERT INTO users (public_id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, 'hash', 'Aluno Indicador', 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), "student-ref-" + Date.now() + "@test.com"]
    );
    const studentUserId = uStudent.insertId;
    const [cmStudent] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), testConsultancyId, studentUserId]
    );
    const studentMemberId = cmStudent.insertId;
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'STUDENT')", [studentMemberId]);

    // Create Influencer Referrer User & Member
    const [uInfluencer] = await conn.execute(
      "INSERT INTO users (public_id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, 'hash', 'Influenciador VIP', 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), "influencer-" + Date.now() + "@test.com"]
    );
    const influencerUserId = uInfluencer.insertId;
    const [cmInfluencer] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), testConsultancyId, influencerUserId]
    );
    const influencerMemberId = cmInfluencer.insertId;
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'INFLUENCER')", [influencerMemberId]);

    // Create Professional Personal User & Member
    const [uPersonal] = await conn.execute(
      "INSERT INTO users (public_id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, 'hash', 'Personal Coach', 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), "personal-" + Date.now() + "@test.com"]
    );
    const personalUserId = uPersonal.insertId;
    const [cmPersonal] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), testConsultancyId, personalUserId]
    );
    const personalMemberId = cmPersonal.insertId;
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'PERSONAL')", [personalMemberId]);

    // Create Referred New Student User & Member
    const [uReferred] = await conn.execute(
      "INSERT INTO users (public_id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, 'hash', 'Novo Aluno Indicado', 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), "referred-" + Date.now() + "@test.com"]
    );
    const referredUserId = uReferred.insertId;
    const [cmReferred] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), testConsultancyId, referredUserId]
    );
    const referredMemberId = cmReferred.insertId;
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'STUDENT')", [referredMemberId]);

    // Secondary consultancy member for cross-tenant tests
    const [cmSec] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), secConsultancyId, referredUserId]
    );
    const secMemberId = cmSec.insertId;
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'STUDENT')", [secMemberId]);

    console.log("Fixtures created successfully.");

    // =============================================================
    // TEST 1: REFERRAL CODES & VALIDATION
    // =============================================================
    console.log("\n--- TEST 1: REFERRAL CODES & ELIGIBILITY ---");
    
    // 1.1 STUDENT referral code creation
    const studentCodeResult = await getOrCreateReferralCode(testConsultancyId, studentMemberId);
    assert(studentCodeResult.code && studentCodeResult.code.length >= 6, "Student gets valid non-empty referral code: " + studentCodeResult.code);
    
    // 1.2 Idempotency: same member gets same code
    const studentCodeResult2 = await getOrCreateReferralCode(testConsultancyId, studentMemberId);
    assert(studentCodeResult.code === studentCodeResult2.code, "Referral code generation is idempotent for same membership");

    // 1.3 INFLUENCER referral code creation
    const influencerCodeResult = await getOrCreateReferralCode(testConsultancyId, influencerMemberId);
    assert(influencerCodeResult.code && influencerCodeResult.code !== studentCodeResult.code, "Influencer gets distinct valid referral code");

    // 1.4 Ineligible member (PERSONAL only) cannot create referral code
    const personalCodeResult = await getOrCreateReferralCode(testConsultancyId, personalMemberId);
    assert(personalCodeResult.success === false && !personalCodeResult.code, "Ineligible role (PERSONAL only) cannot create referral code");

    // 1.5 Resolving referral code
    const resolved = await validateReferralCode(studentCodeResult.code);
    assert(resolved.valid === true && resolved.consultancyId === testConsultancyId, "Public /r/[code] resolves to correct consultancy");
    assert(resolved.referrerMemberId === studentMemberId, "Resolves to correct referrer membership");

    // 1.6 Invalid code resolution
    const invalidResolve = await validateReferralCode("INVALID999");
    assert(invalidResolve.valid === false, "Invalid referral code resolves to valid=false");

    // =============================================================
    // TEST 2: CONVERSION, ATTRIBUTION & SELF-REFERRAL BLOCKING
    // =============================================================
    console.log("\n--- TEST 2: CONVERSIONS & PROTECTIONS ---");

    // 2.1 Self-referral protection
    const selfConversion = await recordReferralConversion(
      testConsultancyId,
      studentMemberId,
      studentUserId, // same user as referrer
      studentCodeResult.code
    );
    assert(selfConversion.success === false && selfConversion.error.includes("Auto-indicação"), "Self-referral is strictly rejected");

    // 2.2 Cross-tenant conversion protection
    const crossTenantConversion = await recordReferralConversion(
      secConsultancyId, // Different consultancy
      secMemberId,
      referredUserId,
      studentCodeResult.code // code from testConsultancyId
    );
    assert(crossTenantConversion.success === false, "Cross-tenant conversion is strictly blocked");

    // 2.3 Valid conversion
    const validConversion = await recordReferralConversion(
      testConsultancyId,
      referredMemberId,
      referredUserId,
      studentCodeResult.code
    );
    assert(validConversion.success === true, "Valid referral conversion succeeds");
    assert(validConversion.commissionCreated === true, "Conversion creates commission");

    // 2.4 Duplicate conversion does not duplicate commission (Idempotency)
    const duplicateConversion = await recordReferralConversion(
      testConsultancyId,
      referredMemberId,
      referredUserId,
      studentCodeResult.code
    );
    assert(duplicateConversion.success === true, "Repeated conversion call succeeds idempotently");
    assert(duplicateConversion.commissionCreated === false, "Duplicate conversion does not duplicate commission row");

    // =============================================================
    // TEST 3: COMMISSIONS & IMMUTABLE SNAPSHOTS
    // =============================================================
    console.log("\n--- TEST 3: COMMISSIONS & IMMUTABLE SNAPSHOTS ---");

    // 3.1 Initial snapshot check (default 50.00 FIXED_AMOUNT)
    const adminData = await getAdminReferralsData(testConsultancyId);
    const comm = adminData.commissions.find(c => c.referrerMemberId === studentMemberId);
    assert(comm !== undefined, "Commission is listed in consultancy admin");
    assert(comm.status === "PENDING", "Initial commission status is PENDING");
    assert(Number(comm.amount) === 50.00, "Commission final amount matches default rule: R$ 50,00");

    // 3.2 Update consultancy settings (e.g., change to R$ 100.00)
    await updateConsultancyReferralSettings(
      testConsultancyId,
      adminMemberId,
      adminUserId,
      { commissionAmount: 100.00, commissionType: "FIXED_AMOUNT" }
    );

    // 3.3 Verify existing commission snapshot was NOT changed
    const adminDataAfterUpdate = await getAdminReferralsData(testConsultancyId);
    const commAfterUpdate = adminDataAfterUpdate.commissions.find(c => c.id === comm.id);
    assert(Number(commAfterUpdate.amount) === 50.00, "Historical commission snapshot remains immutable after settings change");

    // 3.4 Commission state transitions: PENDING -> APPROVED
    const approveRes = await approveCommission(testConsultancyId, comm.id, adminMemberId, adminUserId);
    assert(approveRes.success === true, "Admin approves commission");

    // 3.5 Commission state transitions: APPROVED -> PAID
    const payRes = await markCommissionPaid(testConsultancyId, comm.id, adminMemberId, adminUserId, "Pago via chave PIX");
    assert(payRes.success === true, "Admin marks commission as paid with note");

    // 3.6 Commission cancellation test with reason
    const [uRef2] = await conn.execute(
      "INSERT INTO users (public_id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, 'hash', 'Aluno 2', 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), "aluno2-" + Date.now() + "@test.com"]
    );
    const [cmRef2] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), testConsultancyId, uRef2.insertId]
    );
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'STUDENT')", [cmRef2.insertId]);
    
    await recordReferralConversion(testConsultancyId, cmRef2.insertId, uRef2.insertId, studentCodeResult.code);
    const adminData2 = await getAdminReferralsData(testConsultancyId);
    const comm2 = adminData2.commissions.find(c => c.studentName === "Aluno 2");
    assert(comm2 !== undefined, "Second commission found for cancellation test");
    const cancelRes = await cancelCommission(testConsultancyId, comm2.id, adminMemberId, adminUserId, "Cancelado por reembolso");
    assert(cancelRes.success === true, "Admin cancels commission with reason");

    // =============================================================
    // TEST 4: PIX PAYOUT PROFILE & MASKED ACCESS
    // =============================================================
    console.log("\n--- TEST 4: PIX PAYOUT PROFILE & MASKED ACCESS ---");

    // 4.1 Masked PIX utility unit tests
    assert(maskPixKey("CPF", "12345678909") === "***.***.789-09", "CPF masking hides sensitive digits");
    assert(maskPixKey("EMAIL", "contato@trevoone.com.br") === "c***@trevoone.com.br", "Email masking hides handle");
    assert(maskPixKey("PHONE", "11988887777") === "***-****-7777", "Phone masking hides middle digits");
    assert(maskPixKey("RANDOM_KEY", "123e4567-e89b-12d3-a456-426614174000").includes("***"), "Random key masking hides central chars");

    // 4.2 Save PIX profile for student
    const savePixRes = await saveMemberPayoutProfile(
      testConsultancyId,
      studentMemberId,
      "EMAIL",
      "aluno.trevo@teste.com",
      "Aluno Indicador Silva"
    );
    assert(savePixRes.success === true, "Student saves own PIX payout profile");

    // 4.3 Retrieve masked profile
    const profile = await getMemberPayoutProfile(testConsultancyId, studentMemberId);
    assert(profile !== null, "Profile retrieved");
    assert(profile.pixKeyMasked.includes("***"), "Masked key provided: " + profile.pixKeyMasked);
    assert(profile.pixKey === "aluno.trevo@teste.com", "Owner can access their own raw key");

    // 4.4 Authorized admin reveals full PIX with audit trail
    const revealRes = await getRevealedPayoutProfileForAdmin(testConsultancyId, studentMemberId, adminMemberId, adminUserId);
    assert(revealRes.success === true, "Admin successfully reveals full PIX for payment");
    assert(revealRes.pixKey === "aluno.trevo@teste.com", "Revealed PIX matches exact original");

    // 4.5 Unauthorized cross-tenant reveal is blocked
    const crossReveal = await getRevealedPayoutProfileForAdmin(secConsultancyId, studentMemberId, adminMemberId, adminUserId);
    assert(crossReveal.success === false, "Cross-tenant PIX reveal is strictly blocked");

    // =============================================================
    // TEST 5: DAILY STUDENT CHECK-IN
    // =============================================================
    console.log("\n--- TEST 5: DAILY STUDENT CHECK-IN ---");

    // 5.1 Student submits valid check-in
    const checkinRes = await submitDailyCheckin(
      testConsultancyId,
      studentMemberId,
      studentUserId,
      {
        trainingStatus: "TRAINED",
        dietStatus: "FOLLOWED",
        energyLevel: 4,
        difficultyLevel: "LOW",
        hasPain: false,
        notes: "Treino ótimo!",
      }
    );
    assert(checkinRes.success === true, "Student submits valid daily check-in");

    // 5.2 Update same day's check-in (upsert idempotency)
    const checkinUpdateRes = await submitDailyCheckin(
      testConsultancyId,
      studentMemberId,
      studentUserId,
      {
        trainingStatus: "TRAINED",
        dietStatus: "PARTIAL",
        energyLevel: 3,
        difficultyLevel: "MEDIUM",
        hasPain: true,
        difficultyReasons: ["dor"],
        notes: "Senti leve desconforto no joelho ao final.",
      }
    );
    assert(checkinUpdateRes.success === true, "Student can update same day check-in");

    // 5.3 Verify today's check-in reflects update
    const todayCheckin = await getTodayCheckin(testConsultancyId, studentMemberId);
    assert(todayCheckin !== null, "Today check-in retrieved");
    assert(todayCheckin.hasPain === true, "Pain report preserved");
    assert(todayCheckin.energyLevel === 3, "Updated energy level preserved");

    // 5.4 Invalid energy level rejected
    const invalidEnergy = await submitDailyCheckin(
      testConsultancyId,
      studentMemberId,
      studentUserId,
      {
        trainingStatus: "TRAINED",
        dietStatus: "FOLLOWED",
        energyLevel: 6, // Invalid > 5
        difficultyLevel: "NONE",
        hasPain: false,
      }
    );
    assert(invalidEnergy.success === false, "Invalid energy level (>5) rejected");

    // 5.5 Cross-tenant check-in rejected
    const crossCheckin = await submitDailyCheckin(
      secConsultancyId,
      studentMemberId,
      studentUserId,
      {
        trainingStatus: "TRAINED",
        dietStatus: "FOLLOWED",
        energyLevel: 4,
        difficultyLevel: "LOW",
        hasPain: false,
      }
    );
    assert(crossCheckin.success === false, "Cross-tenant student check-in blocked");

    // =============================================================
    // TEST 6: ACTIVITY TRACKER (LOW-WRITE THROTTLING)
    // =============================================================
    console.log("\n--- TEST 6: ACTIVITY TRACKER (LOW-WRITE THROTTLING) ---");

    // 6.1 Record activity
    await recordMemberActivity(testConsultancyId, studentMemberId);
    const lastActive1 = await getMemberLastActive(testConsultancyId, studentMemberId);
    assert(lastActive1 !== null, "Activity recorded for member");

    // 6.2 Low-write: Immediate second call does not re-write to DB if within 10 minutes
    await recordMemberActivity(testConsultancyId, studentMemberId);
    const lastActive2 = await getMemberLastActive(testConsultancyId, studentMemberId);
    assert(lastActive1.getTime() === lastActive2.getTime(), "Throttled activity tracker avoids redundant DB writes");

    // =============================================================
    // TEST 7: STUDENT MONITORING EVALUATOR & RADAR
    // =============================================================
    console.log("\n--- TEST 7: STUDENT MONITORING EVALUATOR & RADAR ---");

    // 7.1 Evaluate student monitoring when pain is reported
    const evalRes = await evaluateStudentMonitoring(testConsultancyId, studentMemberId);
    assert(evalRes.state === "CRITICAL", "Student with pain report flagged as CRITICAL status");
    assert(evalRes.alerts.length >= 1, "Pain report generated monitoring alert");

    // 7.2 Idempotent evaluator: repeated evaluation of same condition does NOT create duplicate alert
    const evalRes2 = await evaluateStudentMonitoring(testConsultancyId, studentMemberId);
    assert(evalRes2.alerts.length === evalRes.alerts.length, "Idempotent alert fingerprinting prevents duplicate alerts");

    // 7.3 Resolve alert
    const painAlert = evalRes.alerts.find(a => a.subjectMemberId === studentMemberId);
    assert(painAlert !== undefined, "Pain alert found");
    
    const resolveAlertRes = await resolveAlert(
      testConsultancyId,
      painAlert.id,
      adminMemberId,
      adminUserId,
      "Orientado a repousar e procurar fisioterapeuta"
    );
    assert(resolveAlertRes.success === true, "Alert manually resolved with notes");

    // =============================================================
    // TEST 8: PROFESSIONAL RADAR & ADMIN MANUAL ACTIONS
    // =============================================================
    console.log("\n--- TEST 8: PROFESSIONAL RADAR & ADMIN MANUAL ACTIONS ---");

    // 8.1 Professional radar data
    const radarData = await getProfessionalRadarData(testConsultancyId);
    assert(Array.isArray(radarData.professionals), "Professional radar returns array of professionals");
    const personalItem = radarData.professionals.find(p => p.professionalMemberId === personalMemberId);
    assert(personalItem !== undefined, "Target personal coach found in radar");
    assert(["EM_DIA", "ATENCAO", "CRITICO"].includes(personalItem.status), "Explainable operational status assigned");

    // 8.2 Admin manual action: PAUSE_NEW_ASSIGNMENTS
    const pauseActionRes = await createProfessionalAdminAction(
      testConsultancyId,
      personalMemberId,
      adminMemberId,
      adminUserId,
      "PAUSE_NEW_ASSIGNMENTS",
      "Pausado temporariamente para alinhamento de conduta"
    );
    assert(pauseActionRes.success === true, "Admin successfully creates PAUSE_NEW_ASSIGNMENTS action");

    // 8.3 Verify isProfessionalAssignmentPaused returns true
    const isPaused = await isProfessionalAssignmentPaused(testConsultancyId, personalMemberId);
    assert(isPaused === true, "Professional assignment paused check returns true");

    // 8.4 Resolve the action
    const actions = await listProfessionalAdminActions(testConsultancyId);
    const activePause = actions.find(a => a.actionType === "PAUSE_NEW_ASSIGNMENTS" && a.status === "ACTIVE");
    assert(activePause !== undefined, "Active pause action retrieved in ledger");
    const resolveActionRes = await resolveProfessionalAdminAction(
      testConsultancyId,
      activePause.id,
      adminMemberId,
      adminUserId,
      "Alinhamento concluído com sucesso"
    );
    assert(resolveActionRes.success === true, "Admin resolves pause action");

    // 8.5 Verify isProfessionalAssignmentPaused is now false
    const isPausedAfterResolve = await isProfessionalAssignmentPaused(testConsultancyId, personalMemberId);
    assert(isPausedAfterResolve === false, "Professional assignment is no longer paused after resolution");

    // =============================================================
    // TEST 9: SUPERVISOR TREVO DAILY SUMMARY
    // =============================================================
    console.log("\n--- TEST 9: SUPERVISOR TREVO DAILY SUMMARY ---");

    // 9.1 Generate supervisor summary
    const summary = await generateSupervisorSummary(testConsultancyId);
    assert(summary && summary.narrative && summary.narrative.length > 20, "Supervisor summary generated: " + summary.narrative);
    assert(typeof summary.facts.studentsNeedingAttention === "number", "Summary includes deterministic studentsNeedingAttention metric");
    assert(typeof summary.facts.studentsCritical === "number", "Summary includes deterministic studentsCritical metric");

    // =============================================================
    // TEST 10: CLEANUP FIXTURES
    // =============================================================
    console.log("\n--- TEST 10: CLEANUP FIXTURES ---");
    await conn.execute("DELETE FROM consultancy_activity_events WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM monitoring_alerts WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM professional_admin_actions WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM daily_student_checkins WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM member_activity_tracking WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM member_payout_profiles WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM referral_commissions WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM referral_attributions WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM referral_codes WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM consultancy_referral_settings WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM consultancy_member_roles WHERE member_id IN (?, ?, ?, ?, ?, ?, ?)", [
      adminMemberId, studentMemberId, influencerMemberId, personalMemberId, referredMemberId, secMemberId, cmRef2.insertId
    ]);
    await conn.execute("DELETE FROM consultancy_members WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM consultancies WHERE id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM users WHERE id IN (?, ?, ?, ?, ?, ?)", [
      adminUserId, studentUserId, influencerUserId, personalUserId, referredUserId, uRef2.insertId
    ]);
    console.log("Cleanup completed successfully.");

  } catch (err) {
    console.error("Test execution encountered an error:", err);
    failedCount++;
  } finally {
    conn.release();
    await pool.end();
  }

  console.log("\n==================================================");
  console.log("TEST RESULTS SUMMARY:");
  console.log("  PASSED: " + passedCount);
  console.log("  FAILED: " + failedCount);
  console.log("==================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
