import crypto from "node:crypto";
import {
  encryptText,
  decryptText,
  isEncryptedText,
} from "../lib/security/encryption.ts";
import { getDbPool } from "../lib/db/mysql.ts";
import {
  saveMemberPayoutProfile,
  getMemberPayoutProfile,
  getRevealedPayoutProfileForAdmin,
  getAdminReferralsData,
  createAnonymousReferralAttribution,
  bindReferralAttributionToUser,
  recordReferralConversion,
  getOrCreateReferralCode,
  updateConsultancyReferralSettings,
} from "../lib/referrals/service.ts";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (!condition) {
    console.error("  [FAIL]: " + message);
    failedCount++;
    throw new Error("Assertion failed: " + message);
  } else {
    console.log("  [PASS]: " + message);
    passedCount++;
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("TREVO ONE — PIX ENCRYPTION AT REST TEST SUITE");
  console.log("==================================================");

  // -------------------------------------------------------------
  // PART 1: PURE ENCRYPTION UNIT TESTS
  // -------------------------------------------------------------
  console.log("\n--- PART 1: PURE ENCRYPTION / DECRYPTION LOGIC ---");

  const originalKey = process.env.TREVOONE_DATA_ENCRYPTION_KEY;
  const testPlaintext = "qa-teste-pix-123456@trevo.one";

  // 1. Roundtrip
  const encrypted1 = encryptText(testPlaintext);
  assert(isEncryptedText(encrypted1), "Encrypted text matches envelope version (v1:...)");
  const decrypted1 = decryptText(encrypted1);
  assert(decrypted1 === testPlaintext, "Encrypt then decrypt returns exact original plaintext");

  // 2. Random IV (different ciphertext on same plaintext)
  const encrypted2 = encryptText(testPlaintext);
  assert(encrypted1 !== encrypted2, "Same plaintext encrypts to different ciphertexts twice (random IV)");
  assert(decryptText(encrypted2) === testPlaintext, "Second ciphertext decrypts cleanly to original");

  // 3. Envelope format validation
  const parts = encrypted1.split(":");
  assert(parts.length === 4, "Envelope contains exactly 4 colon-delimited components (v1:iv:tag:data)");
  assert(parts[0] === "v1", "Envelope version is v1");
  const ivBuffer = Buffer.from(parts[1], "base64");
  const tagBuffer = Buffer.from(parts[2], "base64");
  assert(ivBuffer.length === 12, "IV is exactly 12 bytes");
  assert(tagBuffer.length === 16, "Auth tag is exactly 16 bytes");

  // 4. Tamper resistance (tampered ciphertext)
  const tamperedCiphertext = Buffer.from(parts[3], "base64");
  tamperedCiphertext[0] ^= 0xff; // flip bits
  const tamperedEnvelope = `v1:${parts[1]}:${parts[2]}:${tamperedCiphertext.toString("base64")}`;
  let tamperCaught = false;
  try {
    decryptText(tamperedEnvelope);
  } catch {
    tamperCaught = true;
  }
  assert(tamperCaught, "Tampered ciphertext fails authentication check");

  // 5. Tampered auth tag
  const tamperedTag = Buffer.from(parts[2], "base64");
  tamperedTag[0] ^= 0xff;
  const tamperedTagEnvelope = `v1:${parts[1]}:${tamperedTag.toString("base64")}:${parts[3]}`;
  let tagTamperCaught = false;
  try {
    decryptText(tamperedTagEnvelope);
  } catch {
    tagTamperCaught = true;
  }
  assert(tagTamperCaught, "Tampered authentication tag fails authentication check");

  // 6. Wrong key fails
  const wrongKey = crypto.randomBytes(32).toString("base64");
  process.env.TREVOONE_DATA_ENCRYPTION_KEY = wrongKey;
  let wrongKeyCaught = false;
  try {
    decryptText(encrypted1);
  } catch {
    wrongKeyCaught = true;
  }
  assert(wrongKeyCaught, "Decryption with wrong 256-bit key fails closed");

  // 7. Invalid key length fails closed
  process.env.TREVOONE_DATA_ENCRYPTION_KEY = crypto.randomBytes(16).toString("base64"); // 16 bytes instead of 32
  let badKeyLengthCaught = false;
  try {
    encryptText(testPlaintext);
  } catch {
    badKeyLengthCaught = true;
  }
  assert(badKeyLengthCaught, "Key with invalid byte length (16 bytes) fails closed");

  // Restore valid key
  process.env.TREVOONE_DATA_ENCRYPTION_KEY = originalKey;

  // 8. Backward compatibility with legacy plaintext
  const legacyPlaintext = "chave-legada-sem-criptografia@trevo.com";
  assert(decryptText(legacyPlaintext) === legacyPlaintext, "Legacy plaintext without v1: prefix returns as-is");

  // -------------------------------------------------------------
  // PART 2: DATABASE & REPOSITORY INTEGRATION TESTS
  // -------------------------------------------------------------
  console.log("\n--- PART 2: DATABASE STORAGE & PIX SERVICE TESTS ---");

  const pool = getDbPool();
  const conn = await pool.getConnection();

  const testTime = Date.now();
  const testConsultancySlug = `qa-pix-test-${testTime}`;
  const secConsultancySlug = `qa-pix-sec-${testTime}`;

  let testConsultancyId;
  let secConsultancyId;
  let adminUserId, adminMemberId;
  let referrerUserId, referrerMemberId;
  let secAdminUserId, secAdminMemberId;

  try {
    // Seed consultancies
    const [c1] = await conn.execute(
      "INSERT INTO consultancies (public_id, name, slug, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), `Consultoria PIX QA ${testTime}`, testConsultancySlug]
    );
    testConsultancyId = c1.insertId;

    const [c2] = await conn.execute(
      "INSERT INTO consultancies (public_id, name, slug, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), `Consultoria PIX Sec ${testTime}`, secConsultancySlug]
    );
    secConsultancyId = c2.insertId;

    // Admin user & member in c1
    const [uAdm] = await conn.execute(
      "INSERT INTO users (public_id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, 'hash', 'Admin PIX QA', 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), `admin-pix-${testTime}@qa.test`]
    );
    adminUserId = uAdm.insertId;
    const [cmAdm] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), testConsultancyId, adminUserId]
    );
    adminMemberId = cmAdm.insertId;
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'CONSULTANCY_ADMIN')", [adminMemberId]);

    // Referrer student in c1
    const [uRef] = await conn.execute(
      "INSERT INTO users (public_id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, 'hash', 'Aluno Referrer PIX', 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), `referrer-pix-${testTime}@qa.test`]
    );
    referrerUserId = uRef.insertId;
    const [cmRef] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), testConsultancyId, referrerUserId]
    );
    referrerMemberId = cmRef.insertId;
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'STUDENT')", [referrerMemberId]);

    // Admin in secondary consultancy (for cross-tenant tests)
    const [uSec] = await conn.execute(
      "INSERT INTO users (public_id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, 'hash', 'Sec Admin PIX', 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), `sec-admin-pix-${testTime}@qa.test`]
    );
    secAdminUserId = uSec.insertId;
    const [cmSec] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), secConsultancyId, secAdminUserId]
    );
    secAdminMemberId = cmSec.insertId;
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'CONSULTANCY_ADMIN')", [secAdminMemberId]);

    // 9. Save PIX profile
    const fakePixKey = "pix.seguro.qa@banco-falso.com.br";
    const saveRes = await saveMemberPayoutProfile(
      testConsultancyId,
      referrerMemberId,
      "EMAIL",
      fakePixKey,
      "Aluno Referrer QA"
    );
    assert(saveRes.success === true, "PIX profile saved successfully");

    // 10. Direct DB inspection: stored value must be ciphertext, NOT plaintext
    const [rawRows] = await conn.execute(
      "SELECT pix_key FROM member_payout_profiles WHERE consultancy_id = ? AND member_id = ?",
      [testConsultancyId, referrerMemberId]
    );
    const storedDbValue = rawRows[0].pix_key;
    assert(storedDbValue !== fakePixKey, "Raw database pix_key does NOT equal plaintext PIX key");
    assert(isEncryptedText(storedDbValue), "Raw database pix_key begins with versioned envelope (v1:...)");
    assert(!storedDbValue.includes(fakePixKey), "Raw database value contains no substring of plaintext PIX");

    // 11. Owner retrieval: returns decrypted original key
    const ownerProfile = await getMemberPayoutProfile(testConsultancyId, referrerMemberId);
    assert(ownerProfile !== null, "Owner profile retrieved");
    assert(ownerProfile.pixKey === fakePixKey, "Owner retrieves decrypted original PIX key");
    assert(ownerProfile.pixKeyMasked !== fakePixKey, "Owner profile also provides masked representation");

    // 12. Setup referral commission to verify admin list masking
    await updateConsultancyReferralSettings(
      testConsultancyId,
      true,
      "FIXED_AMOUNT",
      10.0,
      adminMemberId,
      adminUserId
    );
    const codeObj = await getOrCreateReferralCode(testConsultancyId, referrerMemberId);
    const anonAttr = await createAnonymousReferralAttribution(codeObj.code);
    assert(anonAttr.valid === true, "Anonymous referral attribution created");
    
    // Referred student
    const [uStud] = await conn.execute(
      "INSERT INTO users (public_id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, 'hash', 'Novo Aluno QA', 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), `novo-aluno-${testTime}@qa.test`]
    );
    const studUserId = uStud.insertId;
    const [cmStud] = await conn.execute(
      "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())",
      [crypto.randomUUID(), testConsultancyId, studUserId]
    );
    const studMemberId = cmStud.insertId;
    await conn.execute("INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'STUDENT')", [studMemberId]);

    const bindRes = await bindReferralAttributionToUser(anonAttr.token, studUserId, testConsultancyId);
    assert(bindRes.success === true, "Attribution bound to user");
    const convRes = await recordReferralConversion(testConsultancyId, studMemberId);
    assert(convRes.success === true && convRes.commissionCreated === true, "Referral conversion created commission");

    // 13. Admin list: returns only masked PIX, raw key strictly absent
    const adminData = await getAdminReferralsData(testConsultancyId);
    assert(adminData.commissions.length > 0, "Admin referral commission returned");
    const commItem = adminData.commissions[0];
    assert(commItem.pixMasked && commItem.pixMasked !== "Não cadastrado", "Admin commission list includes pixMasked");
    assert(commItem.pixMasked !== fakePixKey, "Admin commission list pixMasked is NOT the raw PIX key");
    assert(commItem.pixKey === undefined, "Admin commission list strictly omits raw pixKey property");

    // 14. Authorized Admin reveal: returns full decrypted key and logs audit event
    const revealRes = await getRevealedPayoutProfileForAdmin(
      testConsultancyId,
      referrerMemberId,
      adminMemberId,
      adminUserId
    );
    assert(revealRes.success === true, "Authorized admin reveal succeeds");
    assert(revealRes.pixKey === fakePixKey, "Revealed PIX key matches original decrypted plaintext");

    // 15. Audit log verification
    const [auditRows] = await conn.execute(
      "SELECT action, summary, metadata_json FROM consultancy_activity_events WHERE consultancy_id = ? AND action = 'REVEAL_PIX_PAYOUT_KEY' ORDER BY id DESC LIMIT 1",
      [testConsultancyId]
    );
    assert(auditRows.length > 0, "Audit event logged for PIX reveal");
    const auditMeta = JSON.stringify(auditRows[0].metadata_json || {});
    assert(!auditMeta.includes(fakePixKey), "Audit log metadata strictly omits plaintext PIX key");
    assert(auditRows[0].summary.includes("Chave PIX"), "Audit summary describes PIX key consultation");

    // 16. Cross-tenant reveal block
    const crossTenantRes = await getRevealedPayoutProfileForAdmin(
      secConsultancyId, // secondary consultancy
      referrerMemberId, // member of primary consultancy
      secAdminMemberId,
      secAdminUserId
    );
    assert(crossTenantRes.success === false, "Cross-tenant PIX reveal is strictly blocked");

    // 17. Unauthorized role reveal block (student cannot reveal)
    let nonAdminBlocked = false;
    try {
      const blockedRes = await getRevealedPayoutProfileForAdmin(
        testConsultancyId,
        referrerMemberId,
        studMemberId, // student membership
        studUserId
      );
      if (!blockedRes.success) nonAdminBlocked = true;
    } catch {
      nonAdminBlocked = true;
    }
    assert(nonAdminBlocked, "Non-admin member reveal is blocked");

  } finally {
    // Cleanup QA fixtures
    if (testConsultancyId && secConsultancyId) {
      await conn.execute("DELETE FROM consultancy_activity_events WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
      await conn.execute("DELETE FROM referral_commissions WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
      await conn.execute("DELETE FROM referral_attributions WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
      await conn.execute("DELETE FROM referral_codes WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
      await conn.execute("DELETE FROM consultancy_referral_settings WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
      await conn.execute("DELETE FROM member_payout_profiles WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
      await conn.execute("DELETE FROM consultancy_member_roles WHERE member_id IN (SELECT id FROM consultancy_members WHERE consultancy_id IN (?, ?))", [testConsultancyId, secConsultancyId]);
      await conn.execute("DELETE FROM consultancy_members WHERE consultancy_id IN (?, ?)", [testConsultancyId, secConsultancyId]);
      await conn.execute("DELETE FROM consultancies WHERE id IN (?, ?)", [testConsultancyId, secConsultancyId]);
      await conn.execute("DELETE FROM users WHERE email LIKE '%-pix-%@qa.test' OR email LIKE 'novo-aluno-%@qa.test'");
    }
    conn.release();
    await pool.end();
  }

  console.log("\n==================================================");
  console.log("PIX ENCRYPTION TEST RESULTS SUMMARY:");
  console.log("  PASSED: " + passedCount);
  console.log("  FAILED: " + failedCount);
  console.log("==================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
