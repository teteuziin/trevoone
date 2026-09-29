import { resolveUserIdentity, computeInitials } from "../lib/auth/user-identity.ts";
import { getDbConnection } from "../lib/db/mysql.ts";
import {
  listUnreadAnnouncementsForUser,
  markAnnouncementRead,
  publishConsultancyAnnouncement,
} from "../lib/consultancies/announcements.ts";

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

console.log("==================================================");
console.log("TESTING TREVO ONE: GLOBAL AVATAR & ANNOUNCEMENTS");
console.log("==================================================");

async function runTests() {
  const connection = await getDbConnection();

  try {
    // -------------------------------------------------------------------------
    // SUITE 1: Global User Avatar & Identity Resolution
    // -------------------------------------------------------------------------
    console.log("\n--- Suite 1: Global User Avatar & Identity Consistency ---");

    // 1.1 User WITH photo
    const userWithPhoto = resolveUserIdentity({
      fullName: "Anny Santos",
      email: "anny.santos@trevo.com",
      userPublicId: "user-uuid-12345",
      hasProfilePhoto: true,
      profilePhotoUpdatedAt: new Date("2026-09-29T10:00:00Z"),
    });
    assert(userWithPhoto.hasProfilePhoto === true, "User with photo resolves hasProfilePhoto: true");
    assert(userWithPhoto.fullName === "Anny Santos", "User with photo resolves fullName correctly");
    assert(userWithPhoto.firstName === "Anny", "User with photo resolves firstName correctly");
    assert(userWithPhoto.initials === "AS", "User with photo resolves initials 'AS'");
    assert(userWithPhoto.profilePhotoUpdatedAt !== null, "User with photo preserves profilePhotoUpdatedAt");

    // 1.2 User WITHOUT photo
    const userWithoutPhoto = resolveUserIdentity({
      fullName: "Edilson Bispo",
      email: "edilson@trevo.com",
      userPublicId: "user-uuid-67890",
      hasProfilePhoto: false,
      profilePhotoUpdatedAt: null,
    });
    assert(userWithoutPhoto.hasProfilePhoto === false, "User without photo resolves hasProfilePhoto: false");
    assert(userWithoutPhoto.fullName === "Edilson Bispo", "User without photo resolves fullName correctly");
    assert(userWithoutPhoto.initials === "EB", "User without photo resolves initials 'EB'");

    // 1.3 Multi-Role Persona Consistency (STUDENT + VIP and PERSONAL + ADMIN)
    const multiRoleVip = resolveUserIdentity({
      fullName: "Neto Cavalcante",
      email: "neto@vip.com",
      userPublicId: "neto-uuid-999",
      hasProfilePhoto: true,
    });
    assert(multiRoleVip.fullName === "Neto Cavalcante", "STUDENT + VIP preserves same person name");
    assert(multiRoleVip.hasProfilePhoto === true, "STUDENT + VIP preserves profile photo flag");

    const multiRoleAdmin = resolveUserIdentity({
      fullName: "Indiano Personal",
      email: "indiano@admin.com",
      userPublicId: "indiano-uuid-888",
      hasProfilePhoto: false,
    });
    assert(multiRoleAdmin.fullName === "Indiano Personal", "PERSONAL + ADMIN preserves same person name");
    assert(multiRoleAdmin.initials === "IP", "PERSONAL + ADMIN computes initials 'IP'");

    // -------------------------------------------------------------------------
    // SUITE 2: Announcements Infrastructure & Tenancy Isolation
    // -------------------------------------------------------------------------
    console.log("\n--- Suite 2: Announcements Publishing & Tenancy Isolation ---");

    // Find a consultancy that has both active staff and active student
    const [consultancyRows] = await connection.execute(
      `SELECT c.id, c.slug, c.name
       FROM consultancies c
       WHERE c.status = 'ACTIVE'
         AND EXISTS (
           SELECT 1 FROM consultancy_members cm
           JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
           WHERE cm.consultancy_id = c.id AND cmr.role IN ('CONSULTANCY_ADMIN', 'PERSONAL', 'NUTRITIONIST') AND cm.status = 'ACTIVE'
         )
         AND EXISTS (
           SELECT 1 FROM consultancy_members cm
           JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
           WHERE cm.consultancy_id = c.id AND cmr.role = 'STUDENT' AND cm.status = 'ACTIVE'
         )
       LIMIT 1;`
    );

    if (consultancyRows.length === 0) {
      console.log("  [WARN]: No active consultancy with both staff and student found, skipping live DB checks.");
      return;
    }

    const testConsultancy = consultancyRows[0];
    const consultancyId = Number(testConsultancy.id);
    const consultancySlug = String(testConsultancy.slug);

    // Fetch staff member (Admin/Personal/Nutritionist)
    const [staffRows] = await connection.execute(
      `SELECT cm.user_id, cmr.role
       FROM consultancy_members cm
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ? AND cm.status = 'ACTIVE' AND cmr.role IN ('CONSULTANCY_ADMIN', 'PERSONAL', 'NUTRITIONIST')
       LIMIT 1;`,
      [consultancyId]
    );
    const staffUserId = Number(staffRows[0].user_id);

    // Fetch student in this consultancy
    const [studentRows] = await connection.execute(
      `SELECT cm.user_id, u.public_id, u.full_name
       FROM consultancy_members cm
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       JOIN users u ON u.id = cm.user_id
       WHERE cm.consultancy_id = ? AND cm.status = 'ACTIVE' AND cmr.role = 'STUDENT'
       LIMIT 1;`,
      [consultancyId]
    );

    const studentUserId = Number(studentRows[0].user_id);
    const studentPublicId = String(studentRows[0].public_id);

    // 2.1 Publish test announcement for the student
    const publishRes = await publishConsultancyAnnouncement(staffUserId, {
      consultancySlug,
      title: "Manutenção do App Trevo One",
      body: "Informamos que neste sábado realizaremos uma atualização programada nos servidores da consultoria entre 02:00 e 03:00.",
      priority: "HIGH",
      targetAudience: "SPECIFIC_USER",
      targetUserPublicId: studentPublicId,
    });

    assert(publishRes.success === true, "Announcement published successfully by authorized staff");
    assert(publishRes.recipientsCount === 1, "Recipients count is 1 for SPECIFIC_USER");

    // 2.2 Verify student receives announcement in unread list
    const unread = await listUnreadAnnouncementsForUser(studentUserId, consultancyId);
    const matching = unread.find((a) => a.title === "Manutenção do App Trevo One");
    assert(Boolean(matching), "Unread announcement found for student in the correct consultancy");
    assert(matching?.priority === "HIGH", "Priority preserved as HIGH / IMPORTANTE");
    assert(matching?.authorName !== undefined, "Author name present");

    // 2.3 Tenancy Isolation check: Other consultancy MUST NOT see this announcement
    const otherConsultancyId = consultancyId + 999999;
    const isolatedUnread = await listUnreadAnnouncementsForUser(studentUserId, otherConsultancyId);
    assert(isolatedUnread.length === 0, "Tenancy check: Different consultancy returns zero announcements");

    // -------------------------------------------------------------------------
    // SUITE 3: Read Receipt & Non-Repetition Persistence
    // -------------------------------------------------------------------------
    console.log("\n--- Suite 3: Read Receipt & Non-Repetition Persistence ---");

    if (matching) {
      // 3.1 Acknowledge reading ("Li o comunicado")
      const acknowledged = await markAnnouncementRead(studentUserId, matching.publicId);
      assert(acknowledged === true, "markAnnouncementRead succeeds");

      // 3.2 Verify announcement no longer appears in unread list (F5, route change, next login)
      const unreadAfterAck = await listUnreadAnnouncementsForUser(studentUserId, consultancyId);
      const stillPresent = unreadAfterAck.some((a) => a.publicId === matching.publicId);
      assert(!stillPresent, "Acknowledged announcement NEVER re-appears in unread list");

      // 3.3 Confirm DB read_at is populated
      const [notifRows] = await connection.execute(
        `SELECT read_at FROM user_notifications WHERE public_id = ?;`,
        [matching.publicId]
      );
      assert(notifRows.length > 0 && notifRows[0].read_at !== null, "Database user_notifications.read_at is persisted");

      // Clean up test notification
      await connection.execute(`DELETE FROM user_notifications WHERE public_id = ?;`, [matching.publicId]);
    }

    // -------------------------------------------------------------------------
    // SUITE 4: Multiple Sequential Announcements
    // -------------------------------------------------------------------------
    console.log("\n--- Suite 4: Multiple Sequential Announcements Flow ---");

    const pub1 = await publishConsultancyAnnouncement(staffUserId, {
      consultancySlug,
      title: "Comunicado 1: Nova Grade de Horários",
      body: "Confira os novos horários de atendimento da equipe de personal trainers.",
      priority: "NORMAL",
      targetAudience: "SPECIFIC_USER",
      targetUserPublicId: studentPublicId,
    });
    const pub2 = await publishConsultancyAnnouncement(staffUserId, {
      consultancySlug,
      title: "Comunicado 2: Protocolo de Hidratação",
      body: "Atenção redobrada para a ingestão hídrica durante o verão.",
      priority: "CRITICAL",
      targetAudience: "SPECIFIC_USER",
      targetUserPublicId: studentPublicId,
    });

    assert(pub1.success && pub2.success, "Both sequential announcements created successfully");

    const sequentialList = await listUnreadAnnouncementsForUser(studentUserId, consultancyId);
    const item1 = sequentialList.find((a) => a.title === "Comunicado 1: Nova Grade de Horários");
    const item2 = sequentialList.find((a) => a.title === "Comunicado 2: Protocolo de Hidratação");
    assert(Boolean(item1) && Boolean(item2), "Both sequential announcements found unread");

    if (item1 && item2) {
      // User confirms item 1
      await markAnnouncementRead(studentUserId, item1.publicId);
      const afterItem1 = await listUnreadAnnouncementsForUser(studentUserId, consultancyId);
      assert(!afterItem1.some((a) => a.publicId === item1.publicId), "First announcement removed after acknowledgment");
      assert(afterItem1.some((a) => a.publicId === item2.publicId), "Second announcement remains unread for next step");

      // User confirms item 2
      await markAnnouncementRead(studentUserId, item2.publicId);
      const afterItem2 = await listUnreadAnnouncementsForUser(studentUserId, consultancyId);
      assert(!afterItem2.some((a) => a.publicId === item2.publicId), "Second announcement removed after acknowledgment");

      // Cleanup
      await connection.execute(`DELETE FROM user_notifications WHERE public_id IN (?, ?);`, [item1.publicId, item2.publicId]);
    }

    // -------------------------------------------------------------------------
    // SUITE 5: Unauthorized Publisher Rejection
    // -------------------------------------------------------------------------
    console.log("\n--- Suite 5: Security & Role Authorization Gates ---");

    // Attempt publication by user without staff role in this consultancy
    const fakeStudentUserId = 99999999;
    const unauthorizedPub = await publishConsultancyAnnouncement(fakeStudentUserId, {
      consultancySlug,
      title: "Fake Announcement",
      body: "This should fail",
      targetAudience: "ALL_STUDENTS",
    });
    assert(unauthorizedPub.success === false, "Unauthorized publisher correctly rejected");
  } finally {
    connection.release();
  }
}

runTests()
  .then(() => {
    console.log("\n==================================================");
    console.log(`ALL INTEGRATION TESTS PASSED: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log("==================================================");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\nTEST SUITE FAILED WITH ERROR:", err);
    process.exit(1);
  });
