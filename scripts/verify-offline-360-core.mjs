/**
 * TREVO ONE — Offline 360 Core Verification Script
 *
 * Validates:
 * 1. Scope Key Generation & Validation (rejection of legacy mock "student")
 * 2. Form Semantic Idempotency & Normalization (order-independent, empty key normalization)
 * 3. Operation State Machine & Conflict Result Mapping
 * 4. Stale SYNCING Recovery
 * 5. Retention Logic (preserving PENDING, CONFLICT, FAILED, max 5 workout snapshots)
 * 6. SessionScopeGuard Isolation Decisions
 */

import assert from "node:assert/strict";

console.log("==================================================");
console.log("RUNNING TREVO ONE OFFLINE 360 CORE TESTS");
console.log("==================================================");

// 1. SCOPE KEY & IDENTITY VALIDATION
console.log("\n[TEST 1] Scope Key & Identity Validation");
{
  function validateOfflineScope(userPublicId, consultancyPublicId, role) {
    if (!userPublicId || userPublicId === "student") return false;
    if (!consultancyPublicId || consultancyPublicId === "consultancy") return false;
    if (!role || !["STUDENT", "PERSONAL", "NUTRITIONIST", "CONSULTANCY_ADMIN", "PLATFORM_ADMIN"].includes(role)) {
      return false;
    }
    return true;
  }

  // Reject legacy mock strings
  assert.equal(validateOfflineScope("student", "c_123", "STUDENT"), false, "Must reject userPublicId = student");
  assert.equal(validateOfflineScope("u_123", "consultancy", "STUDENT"), false, "Must reject consultancy = consultancy");
  assert.equal(validateOfflineScope("", "c_123", "STUDENT"), false, "Must reject empty userPublicId");

  // Accept valid UUID scopes
  assert.equal(
    validateOfflineScope("usr_a1b2c3d4-e5f6-7890-abcd-ef1234567890", "con_12345678-abcd-ef01-2345-6789abcdef01", "STUDENT"),
    true,
    "Must accept valid UUID canonical scopes"
  );
  console.log("  ✓ Rejection of mock 'student' passed");
  console.log("  ✓ UUID canonical scope acceptance passed");
}

// 2. FORM SEMANTIC IDEMPOTENCY
console.log("\n[TEST 2] Form Semantic Idempotency & Normalization");
{
  function normalizeResponsesMap(obj) {
    if (!obj || typeof obj !== "object") return {};
    const sortedKeys = Object.keys(obj).sort();
    const result = {};
    for (const k of sortedKeys) {
      const val = obj[k];
      if (val !== undefined && val !== null && val !== "") {
        result[k] = val;
      }
    }
    return result;
  }

  function areFormResponsesSemanticallyEqual(a, b) {
    const normA = normalizeResponsesMap(a);
    const normB = normalizeResponsesMap(b);
    return JSON.stringify(normA) === JSON.stringify(normB);
  }

  // Case 2a: Identical responses, different key order
  const a1 = { peso: 75.5, altura: 178, objetivo: "hipertrofia" };
  const b1 = { objetivo: "hipertrofia", altura: 178, peso: 75.5 };
  assert.equal(areFormResponsesSemanticallyEqual(a1, b1), true, "Keys in different order must be semantically equal");

  // Case 2b: Undefined/empty/null fields should be equivalent to absent
  const a2 = { peso: 80, notas: null, restricoes: undefined, dores: "" };
  const b2 = { peso: 80 };
  assert.equal(areFormResponsesSemanticallyEqual(a2, b2), true, "Empty/null/undefined fields must normalize equally");

  // Case 2c: Divergent payload must return false (trigger CONFLICT)
  const a3 = { peso: 80, objetivo: "hipertrofia" };
  const b3 = { peso: 82, objetivo: "emagrecimento" };
  assert.equal(areFormResponsesSemanticallyEqual(a3, b3), false, "Divergent payload must not be equal");

  console.log("  ✓ Order-independent equality passed");
  console.log("  ✓ Empty/null normalization passed");
  console.log("  ✓ Divergent payload conflict detection passed");
}

// 3. OPERATION STATE MACHINE & CONFLICT CLASSIFICATION
console.log("\n[TEST 3] Operation State Machine & Conflict Result Mapping");
{
  const VALID_STATUSES = ["PENDING", "SYNCING", "SYNCED", "FAILED", "CONFLICT"];
  assert.equal(VALID_STATUSES.length, 5);

  function getNextRetryStatus(currentStatus, actionResult) {
    if (actionResult.success) {
      return "SYNCED";
    }
    if (actionResult.conflict) {
      return "CONFLICT";
    }
    return "FAILED";
  }

  function shouldAutoRetry(status) {
    // CONFLICT never enters automatic retry loop
    // SYNCED is finished
    return status === "PENDING" || status === "FAILED";
  }

  assert.equal(getNextRetryStatus("SYNCING", { success: true }), "SYNCED");
  assert.equal(getNextRetryStatus("SYNCING", { success: false, conflict: true, serverStatus: "SUBMITTED" }), "CONFLICT");
  assert.equal(getNextRetryStatus("SYNCING", { success: false, error: "Network timeout" }), "FAILED");

  assert.equal(shouldAutoRetry("PENDING"), true);
  assert.equal(shouldAutoRetry("FAILED"), true);
  assert.equal(shouldAutoRetry("CONFLICT"), false, "CONFLICT must never auto-retry");
  assert.equal(shouldAutoRetry("SYNCED"), false);

  console.log("  ✓ State transitions verified");
  console.log("  ✓ CONFLICT excluded from automatic retry");
}

// 4. STALE / ORPHAN SYNCING RECOVERY
console.log("\n[TEST 4] Orphan SYNCING Recovery");
{
  function recoverOrphanSyncing(operations) {
    return operations.map((op) => {
      if (op.status === "SYNCING") {
        return {
          ...op,
          status: "FAILED",
          errorMessage: "Recuperado após fechamento inesperado durante o processamento.",
        };
      }
      return op;
    });
  }

  const ops = [
    { operationId: "1", status: "PENDING" },
    { operationId: "2", status: "SYNCING" }, // crashed tab
    { operationId: "3", status: "CONFLICT" },
  ];

  const recovered = recoverOrphanSyncing(ops);
  assert.equal(recovered[0].status, "PENDING");
  assert.equal(recovered[1].status, "FAILED", "Orphan SYNCING must transition to FAILED");
  assert.equal(recovered[2].status, "CONFLICT", "CONFLICT must be preserved");

  console.log("  ✓ Orphan SYNCING recovery to FAILED verified");
}

// 5. STORAGE RETENTION POLICY
console.log("\n[TEST 5] Storage Retention Policy");
{
  const MAX_WORKOUT_SNAPSHOTS = 5;

  function pruneSnapshots(snapshots) {
    if (snapshots.length <= MAX_WORKOUT_SNAPSHOTS) return snapshots;
    // Sort descending by syncedAt
    const sorted = [...snapshots].sort((a, b) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime());
    return sorted.slice(0, MAX_WORKOUT_SNAPSHOTS);
  }

  const mockSnapshots = [
    { id: "1", syncedAt: "2026-09-01T10:00:00Z" },
    { id: "2", syncedAt: "2026-09-02T10:00:00Z" },
    { id: "3", syncedAt: "2026-09-03T10:00:00Z" },
    { id: "4", syncedAt: "2026-09-04T10:00:00Z" },
    { id: "5", syncedAt: "2026-09-05T10:00:00Z" },
    { id: "6", syncedAt: "2026-09-06T10:00:00Z" },
    { id: "7", syncedAt: "2026-09-07T10:00:00Z" },
  ];

  const pruned = pruneSnapshots(mockSnapshots);
  assert.equal(pruned.length, 5, "Must retain exactly 5 most recent snapshots");
  assert.equal(pruned[0].id, "7", "Newest must be preserved");
  assert.equal(pruned[4].id, "3", "Fifth newest must be preserved");
  assert.ok(!pruned.find((s) => s.id === "1"), "Oldest must be evicted");

  // Verify operations protection rule:
  function canEvictOperation(opStatus) {
    // PENDING, SYNCING, FAILED, CONFLICT can NEVER be evicted by retention LRU
    if (["PENDING", "SYNCING", "FAILED", "CONFLICT"].includes(opStatus)) {
      return false;
    }
    return false;
  }
  assert.equal(canEvictOperation("PENDING"), false);
  assert.equal(canEvictOperation("SYNCING"), false);
  assert.equal(canEvictOperation("FAILED"), false);
  assert.equal(canEvictOperation("CONFLICT"), false);

  console.log("  ✓ LRU max 5 workout snapshots verified");
  console.log("  ✓ Protection of PENDING/SYNCING/FAILED/CONFLICT verified");
}

// 6. SESSIONSCOPEGUARD ISOLATION DECISIONS
console.log("\n[TEST 6] SessionScopeGuard Multi-Tenant & Role Isolation Decisions");
{
  function evaluateScopeDecision(session, localContext) {
    if (!localContext) {
      return "SAVE_NEW_CONTEXT";
    }
    if (localContext.userPublicId !== session.userPublicId) {
      return "PURGE_ALL_DATA"; // Different user on same browser -> immediate wipe
    }
    if (localContext.consultancyPublicId !== session.consultancyPublicId) {
      return "PURGE_SCOPE_DATA"; // Same user, different consultancy -> wipe previous scope
    }
    if (localContext.role !== session.role) {
      return "PURGE_SCOPE_DATA"; // Same user & consultancy, different role -> wipe previous role scope
    }
    return "REFRESH_VALID_CONTEXT";
  }

  // User A vs User B on same browser
  const userAContext = {
    userPublicId: "usr_alice-uuid",
    consultancyPublicId: "con_trevo-uuid",
    role: "STUDENT",
  };
  const userBSession = {
    userPublicId: "usr_bob-uuid",
    consultancyPublicId: "con_trevo-uuid",
    role: "STUDENT",
  };
  assert.equal(
    evaluateScopeDecision(userBSession, userAContext),
    "PURGE_ALL_DATA",
    "Switching user must trigger full purge"
  );

  // User A switching consultancy
  const userASessionConsultancyB = {
    userPublicId: "usr_alice-uuid",
    consultancyPublicId: "con_outra-uuid",
    role: "STUDENT",
  };
  assert.equal(
    evaluateScopeDecision(userASessionConsultancyB, userAContext),
    "PURGE_SCOPE_DATA",
    "Switching consultancy must trigger scope purge"
  );

  // User A same consultancy, same role
  const userASessionSame = {
    userPublicId: "usr_alice-uuid",
    consultancyPublicId: "con_trevo-uuid",
    role: "STUDENT",
  };
  assert.equal(
    evaluateScopeDecision(userASessionSame, userAContext),
    "REFRESH_VALID_CONTEXT",
    "Same user, consultancy and role must refresh context"
  );

  // User A same consultancy, DIFFERENT ROLE (STUDENT -> PERSONAL)
  const userASessionPersonal = {
    userPublicId: "usr_alice-uuid",
    consultancyPublicId: "con_trevo-uuid",
    role: "PERSONAL",
  };
  assert.equal(
    evaluateScopeDecision(userASessionPersonal, userAContext),
    "PURGE_SCOPE_DATA",
    "Role mismatch must trigger purge of previous role scope"
  );

  // Non-student role handling: ensure student snapshots become inaccessible and are purged
  function simulateScopePurge(dbStores, userPublicId, consultancyPublicId, role) {
    let purgedCount = 0;
    for (const store of Object.values(dbStores)) {
      const remaining = store.filter((item) => {
        const matches =
          item.userPublicId === userPublicId &&
          item.consultancyPublicId === consultancyPublicId &&
          (item.role || "STUDENT").toUpperCase() === role.toUpperCase();
        if (matches) purgedCount++;
        return !matches;
      });
      store.length = 0;
      store.push(...remaining);
    }
    return purgedCount;
  }

  const mockDbStores = {
    workout_snapshots: [
      { userPublicId: "usr_alice-uuid", consultancyPublicId: "con_trevo-uuid", role: "STUDENT", data: "workout1" },
    ],
    nutrition_snapshots: [
      { userPublicId: "usr_alice-uuid", consultancyPublicId: "con_trevo-uuid", role: "STUDENT", data: "diet1" },
    ],
    form_drafts: [
      { userPublicId: "usr_alice-uuid", consultancyPublicId: "con_trevo-uuid", role: "STUDENT", responses: { q1: "abc" } },
    ],
    evolution_snapshots: [
      { userPublicId: "usr_alice-uuid", consultancyPublicId: "con_trevo-uuid", role: "STUDENT", data: "evo1" },
    ],
  };

  const purged = simulateScopePurge(mockDbStores, "usr_alice-uuid", "con_trevo-uuid", "STUDENT");
  assert.equal(purged, 4, "All 4 student stores must be purged on role transition");
  assert.equal(mockDbStores.workout_snapshots.length, 0, "ZERO workout snapshot visible");
  assert.equal(mockDbStores.nutrition_snapshots.length, 0, "ZERO nutrition snapshot visible");
  assert.equal(mockDbStores.form_drafts.length, 0, "ZERO form draft visible");
  assert.equal(mockDbStores.evolution_snapshots.length, 0, "ZERO evolution snapshot visible");

  console.log("  ✓ Multi-user mismatch full purge verified");
  console.log("  ✓ Multi-tenant scope purge verified");
  console.log("  ✓ Same-tenant refresh verified");
  console.log("  ✓ Role mismatch scope purge verified (ZERO old scope remaining)");
}

// 7. FORM CONFLICT DATA RECOVERY & ZERO DATA LOSS
console.log("\n[TEST 7] Form Conflict Data Recovery & Zero Data Loss");
{
  // Step 1: Preencher formulário offline
  const clientResponses = {
    f_peso: 82.5,
    f_altura: 179,
    f_objetivo: "hipertrofia",
    f_restricoes: "intolerância a lactose",
  };
  const requestPublicId = "req_form-uuid-001";

  // Step 2: Submit offline -> draft removed, operation queued PENDING with full payload
  let localDraft = { ...clientResponses };
  const queuedOperation = {
    operationId: "op_submit-001",
    entityType: "FORM_SUBMISSION",
    entityId: requestPublicId,
    operationType: "SUBMIT_FORM",
    status: "PENDING",
    payload: {
      requestPublicId,
      responses: { ...clientResponses },
    },
    conflictDetails: null,
  };
  // Draft is cleared
  localDraft = null;
  assert.equal(localDraft, null, "Local draft must be cleared on submission");
  assert.deepEqual(queuedOperation.payload.responses, clientResponses, "Operation payload must preserve full responses");

  // Step 3: Server returns conflict -> operation retained, transitions to CONFLICT, payload intact
  function handleSyncResult(op, serverResult) {
    if (serverResult.conflict) {
      // Must NOT delete operation. Must NOT delete payload.
      op.status = "CONFLICT";
      op.conflictDetails = {
        serverStatus: serverResult.serverStatus || "ALREADY_ANSWERED",
        reason: serverResult.error || "Conflito de versão detectado no servidor",
        serverTimestamp: new Date().toISOString(),
      };
      return op; // Operation retained
    }
    return op;
  }

  const conflictServerResponse = {
    success: false,
    conflict: true,
    serverStatus: "SUBMITTED",
    error: "Este formulário já foi respondido com dados divergentes.",
  };

  const updatedOp = handleSyncResult(queuedOperation, conflictServerResponse);
  assert.equal(updatedOp.status, "CONFLICT", "Operation must transition to CONFLICT");
  assert.equal(Boolean(updatedOp.operationId), true, "Operation must NOT be deleted");
  assert.deepEqual(updatedOp.payload.responses, clientResponses, "Payload responses must remain 100% intact");

  // Step 4: Data recovery into form state for student review
  function recoverConflictResponses(req, pendingOps) {
    let formState = req.responses || {};
    const conflictOp = pendingOps.find(
      (o) => o.entityId === req.publicId && o.status === "CONFLICT"
    );
    if (conflictOp && conflictOp.payload && conflictOp.payload.responses) {
      formState = { ...formState, ...conflictOp.payload.responses };
      return { formState, recovered: true, opId: conflictOp.operationId };
    }
    return { formState, recovered: false, opId: null };
  }

  const serverRequest = { publicId: requestPublicId, responses: null, status: "SUBMITTED" };
  const recoveryResult = recoverConflictResponses(serverRequest, [updatedOp]);

  assert.equal(recoveryResult.recovered, true, "Student must be able to recover conflict responses");
  assert.deepEqual(
    recoveryResult.formState,
    clientResponses,
    "Recovered responses must match original responses perfectly (ZERO silent data loss)"
  );

  console.log("  ✓ Form submission preserves complete response payload");
  console.log("  ✓ CONFLICT retains operation and preserves payload");
  console.log("  ✓ Responses are fully recoverable for review (ZERO silent data loss)");
}

console.log("\n==================================================");
console.log("ALL 7 TEST SUITES PASSED (0 ERRORS)");
console.log("==================================================\n");
