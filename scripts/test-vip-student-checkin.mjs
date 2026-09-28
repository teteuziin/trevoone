import {
  resolveDefaultPresentationMode,
  getAllowedViewModeOptions,
} from "../lib/consultancies/view-mode.ts";
import { getDbConnection } from "../lib/db/mysql.ts";
import { submitDailyCheckin, getTodayCheckin } from "../lib/checkins/service.ts";
import { evaluateStudentMonitoring } from "../lib/monitoring/evaluator.ts";

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
  console.log("TESTING VIP + STUDENT CHECK-IN & VIP DASHBOARD");
  console.log("==================================================");

  // 1. VIEW MODE AUDIT & MULTI-ROLE
  console.log("\n--- Phase 1: View Mode & Multi-Role Resolution ---");
  const studentOnlyMode = resolveDefaultPresentationMode(["STUDENT"]);
  assert(studentOnlyMode === "STUDENT", "Student only resolves to STUDENT default mode");

  const influencerOnlyMode = resolveDefaultPresentationMode(["INFLUENCER"]);
  assert(influencerOnlyMode === "INFLUENCER", "Influencer only resolves to INFLUENCER default mode");

  const vipStudentMode = resolveDefaultPresentationMode(["INFLUENCER", "STUDENT"]);
  assert(vipStudentMode === "STUDENT", "VIP + STUDENT prioritizes STUDENT default mode (STUDENT-first experience)");

  const personalMode = resolveDefaultPresentationMode(["PERSONAL"]);
  assert(personalMode === "PERSONAL", "PERSONAL default mode remains unchanged");

  const studentOptions = getAllowedViewModeOptions(["STUDENT"]);
  assert(studentOptions.some((o) => o.mode === "STUDENT"), "STUDENT only has STUDENT option");
  assert(!studentOptions.some((o) => o.mode === "INFLUENCER"), "STUDENT only does NOT have INFLUENCER option");

  const influencerOptions = getAllowedViewModeOptions(["INFLUENCER"]);
  assert(influencerOptions.some((o) => o.mode === "INFLUENCER"), "Pure INFLUENCER has INFLUENCER option");
  assert(!influencerOptions.some((o) => o.mode === "STUDENT"), "Pure INFLUENCER does NOT have STUDENT option");

  const vipStudentOptions = getAllowedViewModeOptions(["INFLUENCER", "STUDENT"]);
  assert(vipStudentOptions[0].mode === "STUDENT", "VIP + STUDENT has STUDENT as first option");
  assert(vipStudentOptions.some((o) => o.mode === "INFLUENCER"), "VIP + STUDENT has INFLUENCER option");
  assert(vipStudentOptions.some((o) => o.mode === "STUDENT"), "VIP + STUDENT has STUDENT option for switching");

  // 2. DATABASE INTEGRATION & RUNTIME CHECK-IN VALIDATION
  console.log("\n--- Phase 2: Runtime Check-In & Security Rules ---");
  const conn = await getDbConnection();
  try {
    const [cRows] = await conn.execute(
      "SELECT id, slug FROM consultancies WHERE status = 'ACTIVE' LIMIT 1;"
    );
    if (!cRows || cRows.length === 0) {
      console.log("No active consultancy in DB, skipping live DB checks.");
      return;
    }
    const testConsultancyId = Number(cRows[0].id);

    const [studentMembers] = await conn.execute(
      `SELECT cm.id as member_id, cm.user_id
       FROM consultancy_members cm
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ? AND cm.status = 'ACTIVE' AND cmr.role = 'STUDENT'
       LIMIT 1;`,
      [testConsultancyId]
    );

    if (studentMembers && studentMembers.length > 0) {
      const studentMemberId = Number(studentMembers[0].member_id);
      const studentUserId = Number(studentMembers[0].user_id);

      const checkinPayload = {
        trainingStatus: "TRAINED",
        dietStatus: "FOLLOWED",
        energyLevel: 5,
        difficultyLevel: "NONE",
        hasPain: false,
        notes: "Automated test check-in",
      };

      const res1 = await submitDailyCheckin(
        testConsultancyId,
        studentMemberId,
        studentUserId,
        checkinPayload
      );
      assert(res1.success === true, "STUDENT can submit check-in successfully");

      const today1 = await getTodayCheckin(testConsultancyId, studentMemberId);
      assert(today1 !== null, "Check-in of today is retrievable");
      assert(today1.energyLevel === 5, "Check-in energy level is 5");

      const updatePayload = {
        trainingStatus: "REST_DAY",
        dietStatus: "FOLLOWED",
        energyLevel: 4,
        difficultyLevel: "LOW",
        hasPain: false,
        notes: "Automated test check-in updated",
      };

      const res2 = await submitDailyCheckin(
        testConsultancyId,
        studentMemberId,
        studentUserId,
        updatePayload
      );
      assert(res2.success === true, "Same-day second check-in submission succeeds");

      const today2 = await getTodayCheckin(testConsultancyId, studentMemberId);
      assert(today2 !== null, "Updated check-in of today is retrievable");
      assert(today2.trainingStatus === "REST_DAY", "Check-in status updated to REST_DAY");
      assert(today2.energyLevel === 4, "Check-in energy level updated to 4");

      const radarResult = await evaluateStudentMonitoring(testConsultancyId, studentMemberId);
      assert(radarResult !== null && typeof radarResult === "object", "Student Radar evaluator triggered and evaluated successfully");

      const [nonStudentMembers] = await conn.execute(
        `SELECT cm.id as member_id, cm.user_id
         FROM consultancy_members cm
         WHERE cm.consultancy_id = ? AND cm.status = 'ACTIVE'
           AND cm.id NOT IN (
             SELECT member_id FROM consultancy_member_roles WHERE role = 'STUDENT'
           )
         LIMIT 1;`,
        [testConsultancyId]
      );

      if (nonStudentMembers && nonStudentMembers.length > 0) {
        const nonStudentMemberId = Number(nonStudentMembers[0].member_id);
        const nonStudentUserId = Number(nonStudentMembers[0].user_id);

        const resBlocked = await submitDailyCheckin(
          testConsultancyId,
          nonStudentMemberId,
          nonStudentUserId,
          checkinPayload
        );
        assert(resBlocked.success === false, "Non-student member is strictly blocked from submitting check-in");
      }
    }
  } finally {
    conn.release();
  }

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================");
  if (failedCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
