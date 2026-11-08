import assert from "node:assert/strict";
import crypto from "node:crypto";
import { getDbConnection } from "../lib/db/mysql.ts";
import {
  updateBlockTitleInDraft,
  batchUpdateBlockTitlesInDraft,
  getWorkoutVersionTree,
} from "../lib/training-v2/workout-repository.ts";

async function run() {
  console.log("=== TREVOONE TEST SUITE: MULTI-BLOCK DIVISÕES E MÍDIAS ===");
  const pool = await getDbConnection();

  try {
    // 1. Fetch a draft version
    const [draftVersions] = await pool.query(`
      SELECT wv.id, wv.public_id, w.id AS workout_id, w.consultancy_id
      FROM workout_versions wv
      JOIN workouts w ON w.id = wv.workout_id
      WHERE wv.status = 'DRAFT'
      LIMIT 1
    `);

    if (draftVersions.length === 0) {
      console.log("No draft versions found in DB. Test skipped.");
      return;
    }

    const version = draftVersions[0];
    const fakeCtx = {
      consultancyId: Number(version.consultancy_id),
      membershipId: 1,
      canManageConsultancy: true,
      roles: ["PERSONAL", "CONSULTANCY_ADMIN"],
      canAuthorTraining: true,
    };

    // Create 3 temporary blocks in this draft to test multi-block batch updates
    const block1PublicId = crypto.randomUUID();
    const block2PublicId = crypto.randomUUID();
    const block3PublicId = crypto.randomUUID();

    const [b1] = await pool.query(
      `INSERT INTO workout_blocks (public_id, workout_version_id, block_type, title, sort_order) VALUES (?, ?, 'REGULAR', 'Treino A', 100);`,
      [block1PublicId, version.id]
    );
    const [b2] = await pool.query(
      `INSERT INTO workout_blocks (public_id, workout_version_id, block_type, title, sort_order) VALUES (?, ?, 'REGULAR', 'Treino B', 101);`,
      [block2PublicId, version.id]
    );
    const [b3] = await pool.query(
      `INSERT INTO workout_blocks (public_id, workout_version_id, block_type, title, sort_order) VALUES (?, ?, 'REGULAR', 'Treino C', 102);`,
      [block3PublicId, version.id]
    );

    const testBlockIds = [b1.insertId, b2.insertId, b3.insertId];
    console.log(`Created 3 test blocks: IDs [${testBlockIds.join(", ")}]`);

    try {
      // TEST 1: Batch Rename with Non-consecutive Weekdays (Seg / Qua / Sex)
      console.log("\n[TEST 1] Applying Weekdays format (Segunda-feira, Quarta-feira, Sexta-feira)...");
      const weekdayUpdates = [
        { blockPublicId: block1PublicId, title: "Segunda-feira" },
        { blockPublicId: block2PublicId, title: "Quarta-feira" },
        { blockPublicId: block3PublicId, title: "Sexta-feira" },
      ];

      const batchResult = await batchUpdateBlockTitlesInDraft(fakeCtx, weekdayUpdates);
      assert(batchResult.length >= 3, "Batch result must contain updated blocks");

      const [rows] = await pool.query(
        `SELECT public_id, title FROM workout_blocks WHERE id IN (?, ?, ?) ORDER BY sort_order ASC;`,
        testBlockIds
      );
      assert.equal(rows[0].title, "Segunda-feira");
      assert.equal(rows[1].title, "Quarta-feira");
      assert.equal(rows[2].title, "Sexta-feira");
      console.log("✔ MySQL verified: Seg / Qua / Sex persisted accurately in database!");

      // TEST 2: Batch Rename with Custom Muscle Groups (Push / Pull / Legs)
      console.log("\n[TEST 2] Applying Muscle Groups (Push / Pull / Legs)...");
      const customUpdates = [
        { blockPublicId: block1PublicId, title: "Peito e Tríceps" },
        { blockPublicId: block2PublicId, title: "Costas e Bíceps" },
        { blockPublicId: block3PublicId, title: "Posterior de Coxa e Glúteos" },
      ];

      await batchUpdateBlockTitlesInDraft(fakeCtx, customUpdates);

      // Verify via tree
      const tree = await getWorkoutVersionTree(fakeCtx, version.public_id);
      const t1 = tree.blocks.find((b) => b.publicId === block1PublicId);
      const t2 = tree.blocks.find((b) => b.publicId === block2PublicId);
      const t3 = tree.blocks.find((b) => b.publicId === block3PublicId);

      assert.equal(t1.title, "Peito e Tríceps");
      assert.equal(t2.title, "Costas e Bíceps");
      assert.equal(t3.title, "Posterior de Coxa e Glúteos");
      console.log("✔ Tree verified: Custom muscle group titles returned in getWorkoutVersionTree!");

      // TEST 3: Single Rename with long title
      console.log("\n[TEST 3] Single rename on Block 1 with long 2-line title...");
      const longTitle = "Treino de Membros Superiores — Hipertrofia";
      const singleRes = await updateBlockTitleInDraft(fakeCtx, block1PublicId, longTitle);
      assert.equal(singleRes.title, longTitle);
      console.log("✔ Single rename verified:", singleRes.title);
    } finally {
      // Clean up test blocks
      await pool.query(`DELETE FROM workout_blocks WHERE id IN (?, ?, ?);`, testBlockIds);
      console.log("\nCleaned up test blocks from DB.");
    }

    console.log("\n=== ALL MULTI-BLOCK DIVISIONS TESTS PASSED (100%) ===");
    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  } finally {
    pool.release();
  }
}

run();
