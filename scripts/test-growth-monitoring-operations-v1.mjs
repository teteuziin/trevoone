import mysql from "mysql2/promise";
import crypto from "node:crypto";
import {
  updateConsultancyReferralSettings,
  getConsultancyReferralSettings,
  getOrCreateReferralCode,
  validateReferralCode,
  createAnonymousReferralAttribution,
  bindReferralAttributionToUser,
  recordReferralConversion,
  saveMemberPayoutProfile,
  getMemberPayoutProfile,
  getRevealedPayoutProfileForAdmin,
  getAdminReferralsData,
  approveCommission,
  cancelCommission,
  markCommissionPaid,
  brlToCents,
  centsToBrl,
  percentToBasisPoints,
  calculatePercentageCommissionExact,
} from "../lib/referrals/service.ts";

import {
  submitDailyCheckin,
} from "../lib/checkins/service.ts";

import {
  recordMemberActivity,
  getMemberLastActive,
} from "../lib/monitoring/activity-tracker.ts";

import {
  evaluateStudentMonitoring,
} from "../lib/monitoring/evaluator.ts";

import {
  getProfessionalRadarData,
} from "../lib/monitoring/professional-radar.ts";

import {
} from "../lib/monitoring/admin-actions.ts";

import {
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
  console.log("STARTING GROWTH + MONITORING + OPERATIONS V1 HARDENING TESTS");
  console.log("==================================================");

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const conn = await pool.getConnection();

  // Tracking fixtures for cleanup
  const cleanupFixtures = {
    consultancyIds: [],
    userIds: [],
    memberIds: [],
    alertIds: [],
    commissionIds: [],
    attributionIds: [],
    codeIds: [],
  };

  try {
    // =============================================================
    // TEST 1: MONEY DOMAIN — NO JAVASCRIPT FLOATS
    // =============================================================
    console.log("\n--- TEST 1: MONEY DOMAIN & EXACT INTEGER ARITHMETIC ---");

    // 1.1 Exact cents representation
    assert(brlToCents(50.00) === BigInt(5000), "R$ 50,00 correctly converts to 5000 cents BigInt");
    assert(brlToCents("0.01") === BigInt(1), "R$ 0,01 converts to 1 cent BigInt");
    assert(brlToCents(0.01) === BigInt(1), "R$ 0,01 numeric converts to 1 cent BigInt without float error");
    assert(brlToCents("10.99") === BigInt(1099), "R$ 10,99 string converts to 1099 cents BigInt");
    assert(brlToCents(10.99) === BigInt(1099), "R$ 10,99 float converts to 1099 cents BigInt");
    assert(brlToCents(100.00) === BigInt(10000), "R$ 100,00 converts to 10000 cents BigInt");

    // 1.2 Formatting back to BRL string
    assert(centsToBrl(BigInt(1)) === "0.01", "1 cent formats to '0.01'");
    assert(centsToBrl(BigInt(1099)) === "10.99", "1099 cents formats to '10.99'");
    assert(centsToBrl(BigInt(5000)) === "50.00", "5000 cents formats to '50.00'");
    assert(centsToBrl(BigInt(10000)) === "100.00", "10000 cents formats to '100.00'");

    // 1.3 Exact basis points representation
    assert(percentToBasisPoints(1) === 100, "1% converts to 100 basis points");
    assert(percentToBasisPoints(10) === 1000, "10% converts to 1000 basis points");
    assert(percentToBasisPoints("10.5%") === 1050, "10.5% converts to 1050 basis points");
    assert(percentToBasisPoints(10.50) === 1050, "10.50 numeric converts to 1050 basis points");

    // 1.4 Exact percentage commission calculations
    // 10.50% on R$ 100.00 = R$ 10.50 = 1050 cents
    const comm1 = calculatePercentageCommissionExact(BigInt(10000), 1050);
    assert(comm1 === BigInt(1050), "10.50% of R$ 100,00 produces exact 1050 cents");
    assert(centsToBrl(comm1) === "10.50", "1050 cents formats to '10.50'");

    // 10% on R$ 250.00 = R$ 25.00 = 2500 cents
    const comm2 = calculatePercentageCommissionExact(BigInt(25000), 1000);
    assert(comm2 === BigInt(2500), "10% of R$ 250,00 produces exact 2500 cents");
    assert(centsToBrl(comm2) === "25.00", "2500 cents formats to '25.00'");

    // Rounding edge cases: 10.50% on R$ 10.99 (1099 cents) = 115.395 -> 115 cents = R$ 1.15
    const comm3 = calculatePercentageCommissionExact(BigInt(1099), 1050);
    assert(comm3 === BigInt(115), "10.50% of R$ 10,99 correctly rounds half-up to 115 cents");
    assert(centsToBrl(comm3) === "1.15", "115 cents formats to '1.15'");

    // =============================================================
    // TEST 2: FIXTURES SETUP
    // =============================================================
    console.log("\n--- SETTING UP ISOLATED TEST FIXTURES ---");

    const testSlug = "qa-growth-" + Date.now();
    const [cRes] = await conn.execute(
      "INSERT INTO consultancies (public_id, name, slug, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), "Consultoria QA Growth", testSlug]
    );
    const testConsultancyId = cRes.insertId;
    cleanupFixtures.consultancyIds.push(testConsultancyId);

    // Cross-tenant secondary consultancy
    const [c2Res] = await conn.execute(
      "INSERT INTO consultancies (public_id, name, slug, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), "Consultoria QA Secundária", testSlug + "-sec"]
    );
    const secConsultancyId = c2Res.insertId;
    cleanupFixtures.consultancyIds.push(secConsultancyId);

    // Admin
    const [uAdmin] = await conn.execute(
      "INSERT INTO users (public_id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, 'hash', 'Admin QA', 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), "admin-" + Date.now() + "@qa.test"]
    );
    const adminUserId = uAdmin.insertId;
    cleanupFixtures.userIds.push(adminUserId);

    const [cmAdmin] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), testConsultancyId, adminUserId]
    );
    const adminMemberId = cmAdmin.insertId;
    cleanupFixtures.memberIds.push(adminMemberId);
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'CONSULTANCY_ADMIN')", [adminMemberId]);

    // Student Referrer
    const [uStudent] = await conn.execute(
      "INSERT INTO users (public_id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, 'hash', 'Aluno Indicador QA', 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), "student-ref-" + Date.now() + "@qa.test"]
    );
    const studentUserId = uStudent.insertId;
    cleanupFixtures.userIds.push(studentUserId);

    const [cmStudent] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), testConsultancyId, studentUserId]
    );
    const studentMemberId = cmStudent.insertId;
    cleanupFixtures.memberIds.push(studentMemberId);
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'STUDENT')", [studentMemberId]);

    // Influencer / VIP Referrer
    const [uInfluencer] = await conn.execute(
      "INSERT INTO users (public_id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, 'hash', 'Influenciador VIP QA', 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), "vip-" + Date.now() + "@qa.test"]
    );
    const influencerUserId = uInfluencer.insertId;
    cleanupFixtures.userIds.push(influencerUserId);

    const [cmInfluencer] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), testConsultancyId, influencerUserId]
    );
    const influencerMemberId = cmInfluencer.insertId;
    cleanupFixtures.memberIds.push(influencerMemberId);
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'INFLUENCER')", [influencerMemberId]);

    // Distinct VIP role test member
    const [uVipRole] = await conn.execute(
      "INSERT INTO users (public_id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, 'hash', 'VIP Distinct QA', 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), "vipdistinct-" + Date.now() + "@qa.test"]
    );
    const vipRoleUserId = uVipRole.insertId;
    cleanupFixtures.userIds.push(vipRoleUserId);

    const [cmVipRole] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), testConsultancyId, vipRoleUserId]
    );
    const vipRoleMemberId = cmVipRole.insertId;
    cleanupFixtures.memberIds.push(vipRoleMemberId);
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'VIP')", [vipRoleMemberId]);

    // Personal Coach
    const [uPersonal] = await conn.execute(
      "INSERT INTO users (public_id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, 'hash', 'Personal Coach QA', 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), "personal-" + Date.now() + "@qa.test"]
    );
    const personalUserId = uPersonal.insertId;
    cleanupFixtures.userIds.push(personalUserId);

    const [cmPersonal] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), testConsultancyId, personalUserId]
    );
    const personalMemberId = cmPersonal.insertId;
    cleanupFixtures.memberIds.push(personalMemberId);
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'PERSONAL')", [personalMemberId]);

    // Referred Student 1
    const [uReferred1] = await conn.execute(
      "INSERT INTO users (public_id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, 'hash', 'Novo Aluno 1 QA', 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), "referred1-" + Date.now() + "@qa.test"]
    );
    const referred1UserId = uReferred1.insertId;
    cleanupFixtures.userIds.push(referred1UserId);

    const [cmReferred1] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), testConsultancyId, referred1UserId]
    );
    const referred1MemberId = cmReferred1.insertId;
    cleanupFixtures.memberIds.push(referred1MemberId);
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'STUDENT')", [referred1MemberId]);

    // Secondary consultancy member for cross-tenant test
    const [cmSec] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), secConsultancyId, referred1UserId]
    );
    const secMemberId = cmSec.insertId;
    cleanupFixtures.memberIds.push(secMemberId);
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'STUDENT')", [secMemberId]);

    console.log("Fixtures setup complete.");

    // =============================================================
    // TEST 3: SAFE DEFAULT (DISABLED BY DEFAULT) & VIP AUDIT
    // =============================================================
    console.log("\n--- TEST 3: SAFE DEFAULT & VIP ELIGIBILITY ---");

    // 3.1 Unconfigured consultancy has referral program DISABLED by default
    const unconfiguredSettings = await getConsultancyReferralSettings(testConsultancyId);
    assert(unconfiguredSettings.isEnabled === false, "Referral program is disabled by default when no settings row exists");

    // 3.2 Referral code validation fails when program is not enabled
    const studentCodeRes = await getOrCreateReferralCode(testConsultancyId, studentMemberId);
    assert(studentCodeRes.code && studentCodeRes.code.length >= 6, "Eligible student gets code");
    const validateBeforeEnabled = await validateReferralCode(studentCodeRes.code);
    assert(validateBeforeEnabled.valid === false, "Referral code resolves to valid=false when program is disabled");

    // 3.3 VIP / Influencer eligibility
    const influencerCodeRes = await getOrCreateReferralCode(testConsultancyId, influencerMemberId);
    assert(influencerCodeRes.code && influencerCodeRes.code.length >= 6, "Canonical INFLUENCER (label: Influenciador / VIP) obtains referral code");

    const vipDistinctCodeRes = await getOrCreateReferralCode(testConsultancyId, vipRoleMemberId);
    assert(vipDistinctCodeRes.code && vipDistinctCodeRes.code.length >= 6, "Distinct VIP role member obtains referral code");

    // Ineligible role (Personal only) cannot create code
    const personalCodeRes = await getOrCreateReferralCode(testConsultancyId, personalMemberId);
    assert(personalCodeRes.success === false, "Personal Coach cannot create referral code");

    // 3.4 Explicitly enable referral program for fixed R$ 50,00
    await updateConsultancyReferralSettings(testConsultancyId, true, "FIXED_AMOUNT", 50.00, adminMemberId, adminUserId);
    const enabledSettings = await getConsultancyReferralSettings(testConsultancyId);
    assert(enabledSettings.isEnabled === true, "Referral program successfully enabled by admin");
    assert(enabledSettings.commissionAmountCents === BigInt(5000), "Settings stores 5000 cents");

    const validateAfterEnabled = await validateReferralCode(studentCodeRes.code);
    assert(validateAfterEnabled.valid === true, "Referral code now resolves to valid=true after enabling program");

    // =============================================================
    // TEST 4: ANONYMOUS FIRST-TOUCH ATTRIBUTION & PERSISTENCE
    // =============================================================
    console.log("\n--- TEST 4: ANONYMOUS FIRST-TOUCH ATTRIBUTION ---");

    // 4.1 First visitor hits /r/[code]
    const attr1 = await createAnonymousReferralAttribution(studentCodeRes.code);
    assert(attr1.valid === true && attr1.token && attr1.token.length === 64, "Generated 64-character opaque visitor token");

    // Verify token itself is NOT in DB, only token SHA-256 hash
    const expectedHash = crypto.createHash("sha256").update(attr1.token).digest("hex");
    const [rawTokenRows] = await conn.execute(
      "SELECT id, visitor_token_hash FROM referral_attributions WHERE consultancy_id = ? AND visitor_token_hash = ?",
      [testConsultancyId, expectedHash]
    );
    assert(rawTokenRows.length === 1, "Only token SHA-256 hash is stored in DB");

    // 4.2 FIRST VALID REFERRAL WINS: second link visited with existing valid token does NOT overwrite
    const attr2 = await createAnonymousReferralAttribution(influencerCodeRes.code, attr1.token);
    assert(attr2.valid === true && attr2.token === attr1.token, "First-touch attribution is preserved; subsequent code does not overwrite");

    // 4.3 Binding to registered user
    const bindRes = await bindReferralAttributionToUser(attr1.token, referred1UserId);
    assert(bindRes.success === true && bindRes.boundCount === 1, "Attribution token securely bound to registered user ID");

    // =============================================================
    // TEST 5: MEMBERSHIP CONVERSION & FIXED COMMISSION
    // =============================================================
    console.log("\n--- TEST 5: FIXED COMMISSION CONVERSION & IMMUTABILITY ---");

    // 5.1 Convert referred student 1 to active student member
    const conv1 = await recordReferralConversion(testConsultancyId, referred1MemberId, referred1UserId);
    assert(conv1.success === true && conv1.commissionCreated === true, "Referral conversion successfully recorded commission");

    // 5.2 Idempotency: duplicate conversion call does not create duplicate commission
    const convDup = await recordReferralConversion(testConsultancyId, referred1MemberId, referred1UserId);
    assert(convDup.success === true && convDup.commissionCreated === false, "Duplicate conversion call is idempotent (no second commission)");

    // 5.3 Verify commission fields in DB (exact cents, safe decimal)
    const [commRows] = await conn.execute(
      "SELECT id, commission_type_snapshot, final_amount_cents, final_amount, status FROM referral_commissions WHERE consultancy_id = ? AND referred_member_id = ?",
      [testConsultancyId, referred1MemberId]
    );
    assert(commRows.length === 1, "Single commission record exists");
    const fixedComm = commRows[0];
    assert(fixedComm.status === "PENDING", "Initial status is PENDING");
    assert(fixedComm.commission_type_snapshot === "FIXED_AMOUNT", "Snapshot is FIXED_AMOUNT");
    assert(BigInt(fixedComm.final_amount_cents) === BigInt(5000), "Snapshot final_amount_cents is 5000 cents");
    assert(Number(fixedComm.final_amount) === 50.00, "Snapshot final_amount decimal is 50.00");

    // 5.4 Self-referral protection: student referring themselves is blocked
    const selfConv = await recordReferralConversion(testConsultancyId, studentMemberId, studentUserId, studentCodeRes.code);
    assert(selfConv.success === false, "Self-referral is strictly rejected");

    // 5.5 Cross-tenant protection: member converting in secondary consultancy with primary attribution is blocked
    const crossConv = await recordReferralConversion(secConsultancyId, secMemberId, referred1UserId);
    assert(crossConv.success === false, "Cross-tenant conversion is strictly rejected");

    // =============================================================
    // TEST 6: PERCENTAGE COMMISSION & REQUIRED LEGITIMATE BASE
    // =============================================================
    console.log("\n--- TEST 6: PERCENTAGE COMMISSION WORKFLOW ---");

    // Configure 10.50% percentage commission
    await updateConsultancyReferralSettings(testConsultancyId, true, "PERCENTAGE", 10.50, adminMemberId, adminUserId);

    // Create 2nd referred student
    const [uReferred2] = await conn.execute(
      "INSERT INTO users (public_id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, 'hash', 'Novo Aluno 2 QA', 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), "referred2-" + Date.now() + "@qa.test"]
    );
    const referred2UserId = uReferred2.insertId;
    cleanupFixtures.userIds.push(referred2UserId);

    const [cmReferred2] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), testConsultancyId, referred2UserId]
    );
    const referred2MemberId = cmReferred2.insertId;
    cleanupFixtures.memberIds.push(referred2MemberId);
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'STUDENT')", [referred2MemberId]);

    // Create attribution and convert for percentage
    const attrPerc = await createAnonymousReferralAttribution(influencerCodeRes.code);
    await bindReferralAttributionToUser(attrPerc.token, referred2UserId);
    const convPerc = await recordReferralConversion(testConsultancyId, referred2MemberId, referred2UserId);
    assert(convPerc.success === true && convPerc.commissionCreated === true, "Percentage conversion creates pending commission");

    // Inspect pending percentage commission in DB
    const [percCommRows] = await conn.execute(
      "SELECT id, status, commission_type_snapshot, rate_basis_points, base_amount_cents, final_amount_cents, final_amount FROM referral_commissions WHERE consultancy_id = ? AND referred_member_id = ?",
      [testConsultancyId, referred2MemberId]
    );
    const percComm = percCommRows[0];
    assert(percComm.status === "PENDING", "Percentage commission starts as PENDING");
    assert(percComm.commission_type_snapshot === "PERCENTAGE", "Snapshot is PERCENTAGE");
    assert(percComm.rate_basis_points === 1050, "Rate basis points is snapshotted to 1050 (10.50%)");
    assert(percComm.final_amount_cents === null, "final_amount_cents remains NULL until admin approves with base");
    assert(percComm.final_amount === null, "final_amount decimal remains NULL until admin approves with base");

    // Approving percentage commission WITHOUT base amount is REJECTED
    const approveNoBase = await approveCommission(testConsultancyId, percComm.id, adminMemberId, adminUserId);
    assert(approveNoBase.success === false, "Approving percentage commission without base amount is strictly rejected");

    // Approving with legitimate base of R$ 250,00 (25000 cents)
    // 10.50% of 25000 = (25000 * 1050 + 5000) / 10000 = 2625 cents = R$ 26,25
    const approveWithBase = await approveCommission(testConsultancyId, percComm.id, adminMemberId, adminUserId, BigInt(25000));
    assert(approveWithBase.success === true, "Approving percentage commission with legitimate base succeeds");

    const [percApprovedRows] = await conn.execute(
      "SELECT status, base_amount_cents, final_amount_cents, final_amount FROM referral_commissions WHERE id = ?",
      [percComm.id]
    );
    const percApproved = percApprovedRows[0];
    assert(percApproved.status === "APPROVED", "Status transitioned to APPROVED");
    assert(BigInt(percApproved.base_amount_cents) === BigInt(25000), "Base amount snapshotted as 25000 cents (R$ 250,00)");
    assert(BigInt(percApproved.final_amount_cents) === BigInt(2625), "Calculated final amount is exact 2625 cents (R$ 26,25)");
    assert(Number(percApproved.final_amount) === 26.25, "Formatted final amount is 26.25");

    // =============================================================
    // TEST 7: COMMISSION STATE MACHINE
    // =============================================================
    console.log("\n--- TEST 7: COMMISSION STATE MACHINE ---");

    // 7.1 PENDING -> PAID is STRICTLY REJECTED
    const payPendingDirect = await markCommissionPaid(testConsultancyId, fixedComm.id, adminMemberId, adminUserId);
    assert(payPendingDirect.success === false, "Direct PENDING -> PAID transition is strictly rejected");

    // 7.2 PENDING -> APPROVED
    const approveFixed = await approveCommission(testConsultancyId, fixedComm.id, adminMemberId, adminUserId);
    assert(approveFixed.success === true, "PENDING -> APPROVED succeeds for fixed commission");

    // 7.3 APPROVED -> PAID
    const payApproved = await markCommissionPaid(testConsultancyId, fixedComm.id, adminMemberId, adminUserId, "TXID-12345");
    assert(payApproved.success === true, "APPROVED -> PAID succeeds");

    // 7.4 PAID is terminal: modifying PAID commission is rejected
    const cancelPaid = await cancelCommission(testConsultancyId, fixedComm.id, adminMemberId, adminUserId, "Tentativa indevida");
    assert(cancelPaid.success === false, "PAID commission cannot be cancelled (terminal state)");

    const reApprovePaid = await approveCommission(testConsultancyId, fixedComm.id, adminMemberId, adminUserId);
    assert(reApprovePaid.success === false, "PAID commission cannot be approved again");

    // 7.5 CANCELLED is terminal: create a 3rd commission, cancel, and verify terminal
    const [uRef3] = await conn.execute(
      "INSERT INTO users (public_id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, 'hash', 'Dummy Referred QA', 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), "ref3-" + Date.now() + "@qa.test"]
    );
    cleanupFixtures.userIds.push(uRef3.insertId);
    const [cmReferred3] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), testConsultancyId, uRef3.insertId]
    );
    cleanupFixtures.memberIds.push(cmReferred3.insertId);
    const [codeRows] = await conn.execute("SELECT id FROM referral_codes WHERE consultancy_id = ? LIMIT 1", [testConsultancyId]);
    const refCodeId = codeRows[0].id;
    const [attr3] = await conn.execute(
      "INSERT INTO referral_attributions (public_id, consultancy_id, referral_code_id, referrer_member_id, referred_member_id, status) VALUES (?, ?, ?, ?, ?, 'CONVERTED')",
      [crypto.randomUUID(), testConsultancyId, refCodeId, studentMemberId, cmReferred3.insertId]
    );
    cleanupFixtures.attributionIds.push(attr3.insertId);
    const dummyCommPublicId = crypto.randomUUID();
    const [c3Res] = await conn.execute(
      `INSERT INTO referral_commissions (
         public_id, consultancy_id, attribution_id, referrer_member_id, referred_member_id,
         commission_type_snapshot, final_amount_cents, final_amount, currency, status
       ) VALUES (?, ?, ?, ?, ?, 'FIXED_AMOUNT', 5000, 50.00, 'BRL', 'PENDING')`,
      [dummyCommPublicId, testConsultancyId, attr3.insertId, studentMemberId, cmReferred3.insertId]
    );
    const dummyCommId = c3Res.insertId;

    const cancelRes = await cancelCommission(testConsultancyId, dummyCommId, adminMemberId, adminUserId, "Cancelamento legítimo");
    assert(cancelRes.success === true, "PENDING -> CANCELLED succeeds");

    const payCancelled = await markCommissionPaid(testConsultancyId, dummyCommId, adminMemberId, adminUserId);
    assert(payCancelled.success === false, "CANCELLED commission cannot be marked paid (terminal state)");

    // =============================================================
    // TEST 8: PIX SECURITY HARDENING
    // =============================================================
    console.log("\n--- TEST 8: PIX SECURITY & AUDITED REVEAL ---");

    // 8.1 Owner saves PIX profile
    const savePixRes = await saveMemberPayoutProfile(testConsultancyId, studentMemberId, "CPF", "123.456.789-00", "Aluno Indicador");
    assert(savePixRes.success === true, "Member can save PIX profile");

    // 8.2 Owner retrieves full key
    const ownerPix = await getMemberPayoutProfile(testConsultancyId, studentMemberId);
    assert(ownerPix.pixKey === "123.456.789-00", "Owner retrieves own full unmasked PIX key");
    assert(ownerPix.pixKeyMasked.includes("***"), "Owner profile provides masked representation");

    // 8.3 Admin list returns ONLY masked PIX (zero raw keys)
    const adminData = await getAdminReferralsData(testConsultancyId);
    const commWithPix = adminData.commissions.find(c => c.referrerMemberId === studentMemberId);
    assert(commWithPix && commWithPix.pixMasked.includes("***"), "Admin commission list contains only masked PIX");
    assert(!("pixKey" in commWithPix), "Admin commission list object strictly omits raw pixKey");

    // 8.4 Admin explicit reveal with audit log
    const revealRes = await getRevealedPayoutProfileForAdmin(testConsultancyId, studentMemberId, adminMemberId, adminUserId);
    assert(revealRes.success === true && revealRes.pixKey === "123.456.789-00", "Authorized Admin can explicitly reveal PIX key");

    // Verify audit record exists in consultancy_activity_events without raw key
    const [auditRows] = await conn.execute(
      `SELECT id, action, metadata_json FROM consultancy_activity_events
       WHERE consultancy_id = ? AND action = 'REVEAL_PIX_PAYOUT_KEY'
       ORDER BY created_at DESC LIMIT 1;`,
      [testConsultancyId]
    );
    assert(auditRows.length === 1, "PIX reveal operation generated audit log");
    const meta = typeof auditRows[0].metadata_json === "object" ? auditRows[0].metadata_json : JSON.parse(auditRows[0].metadata_json || "{}");
    assert(!JSON.stringify(meta).includes("123.456.789-00"), "Audit metadata does not expose raw PIX key");

    // 8.5 Cross-tenant reveal is blocked
    const crossTenantReveal = await getRevealedPayoutProfileForAdmin(secConsultancyId, studentMemberId, adminMemberId, adminUserId);
    assert(crossTenantReveal.success === false, "Cross-tenant PIX reveal is strictly blocked");

    // =============================================================
    // TEST 9: GLOBAL ACTIVITY TRACKING & THROTTLING
    // =============================================================
    console.log("\n--- TEST 9: ACTIVITY TRACKING & THROTTLING ---");

    await recordMemberActivity(testConsultancyId, studentMemberId);
    const act1 = await getMemberLastActive(testConsultancyId, studentMemberId);
    assert(act1 instanceof Date, "Member activity timestamp recorded in DB");

    // Immediate second call should be throttled (no DB write)
    await recordMemberActivity(testConsultancyId, studentMemberId);
    const act2 = await getMemberLastActive(testConsultancyId, studentMemberId);
    assert(act1.getTime() === act2.getTime(), "Repeated activity inside throttle window does not execute excess DB writes");

    // =============================================================
    // TEST 10: MONITORING & PROFESSIONAL RADAR ISOLATION
    // =============================================================
    console.log("\n--- TEST 10: MONITORING EVALUATION & PROFESSIONAL RADAR ---");

    // Create active workout assignment from personal to referred1
    const [wRes] = await conn.execute(
      "INSERT INTO workouts (public_id, consultancy_id, created_by_membership_id, title, status) VALUES (?, ?, ?, 'Treino QA', 'ACTIVE')",
      [crypto.randomUUID(), testConsultancyId, personalMemberId]
    );
    const [wvRes] = await conn.execute(
      "INSERT INTO workout_versions (public_id, workout_id, version_number, status, title, created_by_membership_id) VALUES (?, ?, 1, 'PUBLISHED', 'Treino QA v1', ?)",
      [crypto.randomUUID(), wRes.insertId, personalMemberId]
    );
    await conn.execute(
      "INSERT INTO workout_assignments (public_id, consultancy_id, workout_version_id, student_membership_id, assigned_by_membership_id, status, starts_on) VALUES (?, ?, ?, ?, ?, 'ACTIVE', CURDATE())",
      [crypto.randomUUID(), testConsultancyId, wvRes.insertId, referred1MemberId, personalMemberId]
    );

    // 10.1 Student records check-in with pain
    const checkinRes = await submitDailyCheckin(
      testConsultancyId,
      referred1MemberId,
      referred1UserId,
      {
        trainingStatus: "TRAINED",
        dietStatus: "FOLLOWED",
        energyLevel: 4,
        difficultyLevel: "HIGH",
        hasPain: true,
        notes: "Dor no joelho",
      }
    );
    assert(checkinRes.success, "Student checkin submitted successfully");

    // 10.2 Evaluate student monitoring
    const evalRes = await evaluateStudentMonitoring(testConsultancyId, referred1MemberId);
    assert(evalRes.state === "CRITICAL", "Pain reported triggers CRITICAL student radar state");
    assert(evalRes.alerts.some(a => a.alertType === "PAIN_REPORTED"), "PAIN_REPORTED alert generated");
    assert(evalRes.metrics.painReportedCount === 1, "Pain report reflected in student radar metrics");

    // Idempotency: re-evaluating produces same alert count (no duplicates)
    const evalRes2 = await evaluateStudentMonitoring(testConsultancyId, referred1MemberId);
    const painAlerts = evalRes2.alerts.filter(a => a.alertType === "PAIN_REPORTED");
    assert(painAlerts.length === 1, "Alert upsert is idempotent; no duplicate alerts for same fingerprint");

    // 10.3 Professional radar data
    const radarData = await getProfessionalRadarData(testConsultancyId);
    const personalItem = radarData.professionals.find(p => p.professionalMemberId === personalMemberId);
    assert(personalItem !== undefined, "Personal trainer appears in radar");
    assert(personalItem.status === "CRITICO", "Personal status reflects assigned student's critical alert");
    assert(personalItem.activeStudentsAssigned === 1, "Personal has exactly 1 assigned student");
    assert(personalItem.studentsCriticalCount === 1, "Personal has exactly 1 critical student");

    // 10.4 Professional student hub assignment boundary
    // Personal is assigned to referred1MemberId
    const [assignedRows] = await conn.execute(
      `SELECT 1 FROM (
         SELECT student_membership_id FROM workout_assignments
         WHERE consultancy_id = ? AND assigned_by_membership_id = ? AND status = 'ACTIVE' AND deleted_at IS NULL
       ) t WHERE student_membership_id = ? LIMIT 1;`,
      [testConsultancyId, personalMemberId, referred1MemberId]
    );
    assert(assignedRows.length === 1, "Assigned student is authorized for Personal viewing");

    // Personal is NOT assigned to referred2MemberId
    const [unassignedRows] = await conn.execute(
      `SELECT 1 FROM (
         SELECT student_membership_id FROM workout_assignments
         WHERE consultancy_id = ? AND assigned_by_membership_id = ? AND status = 'ACTIVE' AND deleted_at IS NULL
       ) t WHERE student_membership_id = ? LIMIT 1;`,
      [testConsultancyId, personalMemberId, referred2MemberId]
    );
    assert(unassignedRows.length === 0, "Unassigned student is blocked for Personal viewing");

    // Cross-tenant student isolation: testConsultancyId student cannot be resolved under secConsultancyId
    const [crossTenantRows] = await conn.execute(
      "SELECT id FROM consultancy_members WHERE id = ? AND consultancy_id = ?",
      [referred1MemberId, secConsultancyId]
    );
    assert(crossTenantRows.length === 0, "Cross-tenant student access strictly blocked");

    // =============================================================
    // TEST 11: CLEANUP ALL FIXTURES
    // =============================================================
    console.log("\n--- TEST 11: CLEANUP QA FIXTURES ---");

    await conn.execute("DELETE FROM consultancy_activity_events WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM consultancy_activity_events WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    const [delAlerts] = await conn.execute("DELETE FROM monitoring_alerts WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM professional_admin_actions WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    const [delCheckins] = await conn.execute("DELETE FROM daily_student_checkins WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM member_activity_tracking WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    const [delPayout] = await conn.execute("DELETE FROM member_payout_profiles WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    const [delCommissions] = await conn.execute("DELETE FROM referral_commissions WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    const [delAttributions] = await conn.execute("DELETE FROM referral_attributions WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    const [delCodes] = await conn.execute("DELETE FROM referral_codes WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM consultancy_referral_settings WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM workout_assignments WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM workout_versions WHERE workout_id IN (SELECT id FROM workouts WHERE consultancy_id IN (?, ?))", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM workouts WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    await conn.execute("DELETE FROM consultancy_member_roles WHERE member_id IN (SELECT id FROM consultancy_members WHERE consultancy_id IN (?, ?))", [
      testConsultancyId, secConsultancyId
    ]);
    const [delMembers] = await conn.execute("DELETE FROM consultancy_members WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    const [delConsultancies] = await conn.execute("DELETE FROM consultancies WHERE id IN (?, ?)", [testConsultancyId, secConsultancyId]);
    const [delUsers] = await conn.execute("DELETE FROM users WHERE email LIKE '%@qa.test'");

    console.log(`Cleanup summary:
      - Consultancies deleted: ${delConsultancies.affectedRows}
      - Members deleted: ${delMembers.affectedRows}
      - Users deleted: ${delUsers.affectedRows}
      - Commissions deleted: ${delCommissions.affectedRows}
      - Attributions deleted: ${delAttributions.affectedRows}
      - Codes deleted: ${delCodes.affectedRows}
      - Alerts deleted: ${delAlerts.affectedRows}
      - Check-ins deleted: ${delCheckins.affectedRows}
      - Payout profiles deleted: ${delPayout.affectedRows}`);
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
