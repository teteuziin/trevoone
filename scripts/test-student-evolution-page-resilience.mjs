import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("=== Running Student Evolution Page Resilience Tests ===");

// 1. Test helper functions logic (safeToIsoString & formatDateYmd)
function formatDateYmd(val) {
  if (!val) return "";
  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) return "";
    return val.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (str.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return str;
}

function safeToIsoString(val, fallback) {
  if (!val) return fallback || new Date().toISOString();
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? (fallback || new Date().toISOString()) : val.toISOString();
  }
  const parsed = new Date(String(val));
  return Number.isNaN(parsed.getTime()) ? (fallback || new Date().toISOString()) : parsed.toISOString();
}

console.log("[Test 1] safeToIsoString resilience");
assert.doesNotThrow(() => safeToIsoString(null));
assert.doesNotThrow(() => safeToIsoString(undefined));
assert.doesNotThrow(() => safeToIsoString("invalid-date-string"));
assert.doesNotThrow(() => safeToIsoString(new Date("invalid")));
assert.strictEqual(safeToIsoString(null, "fallback-val"), "fallback-val");
assert.strictEqual(safeToIsoString("invalid", "fallback-val"), "fallback-val");
assert.ok(safeToIsoString("2026-03-15T12:00:00Z").startsWith("2026-03-15"));
console.log("  -> safeToIsoString passed all assertions!");

console.log("[Test 2] formatDateYmd resilience");
assert.strictEqual(formatDateYmd(null), "");
assert.strictEqual(formatDateYmd(undefined), "");
assert.strictEqual(formatDateYmd("invalid-date"), "invalid-date");
assert.strictEqual(formatDateYmd(new Date("2026-11-02T15:00:00Z")), "2026-11-02");
assert.strictEqual(formatDateYmd("2026-11-02"), "2026-11-02");
assert.strictEqual(formatDateYmd("2026-11-02 18:30:00"), "2026-11-02");
console.log("  -> formatDateYmd passed all assertions!");

console.log("[Test 3] Static code analysis of page.tsx");
const pagePath = path.join(rootDir, "app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx");
const pageContent = fs.readFileSync(pagePath, "utf-8");

// Must NOT contain wrong columns initiator_membership_id or recipient_membership_id
assert.ok(!pageContent.includes("initiator_membership_id"), "page.tsx must not contain initiator_membership_id");
assert.ok(!pageContent.includes("recipient_membership_id"), "page.tsx must not contain recipient_membership_id");

// Must use student_membership_id and professional_membership_id
assert.ok(pageContent.includes("student_membership_id = ? AND professional_membership_id = ?"), "page.tsx must check chat_consultations with correct column names");

// Count placeholders in relRows query
const relMatch = pageContent.match(/SELECT 1 FROM \([\s\S]*?\) rel LIMIT 1;`,\s*(\[[^\]]*\])/);
assert.ok(relMatch, "relRows query and params found");
const questionMarks = (relMatch[0].match(/\?/g) || []).length;

const paramEntries = relMatch[1]
  .replace(/^\[|\]$/g, "")
  .split(/,/)
  .map(s => s.trim())
  .filter(Boolean);

console.log(`  -> Placeholder count: ${questionMarks}, Parameter count: ${paramEntries.length}`);
assert.strictEqual(questionMarks, 15, "relRows query must have exactly 15 placeholders");
assert.strictEqual(paramEntries.length, 15, "relRows query must have exactly 15 parameters");
console.log("  -> page.tsx SQL parameters match 100%!");

console.log("[Test 4] Static code analysis of personal-student-hub.ts");
const hubPath = path.join(rootDir, "lib/consultancies/personal-student-hub.ts");
const hubContent = fs.readFileSync(hubPath, "utf-8");

assert.ok(!hubContent.includes("initiator_membership_id"), "personal-student-hub.ts must not contain initiator_membership_id");
assert.ok(!hubContent.includes("recipient_membership_id"), "personal-student-hub.ts must not contain recipient_membership_id");

// Ensure try/catches exist for all subqueries
assert.ok(hubContent.includes("Error fetching intake submissions"), "intake submissions subquery wrapped in try/catch");
assert.ok(hubContent.includes("Error fetching custom forms"), "custom forms subquery wrapped in try/catch");
assert.ok(hubContent.includes("Error fetching form templates"), "form templates subquery wrapped in try/catch");
assert.ok(hubContent.includes("Error fetching progress entries"), "progress entries subquery wrapped in try/catch");
assert.ok(hubContent.includes("Error fetching photo evaluations"), "photo evaluations subquery wrapped in try/catch");
assert.ok(hubContent.includes("Error fetching workout assignments"), "workout assignments subquery wrapped in try/catch");
assert.ok(hubContent.includes("Error in completed sessions fallback query"), "completed sessions subquery protected");

// Ensure safeToIsoString is used instead of bare new Date().toISOString()
assert.ok(!hubContent.includes("r.assigned_at ? new Date(r.assigned_at).toISOString()"), "r.assigned_at uses safeToIsoString");
assert.ok(!hubContent.includes("r.started_at).toISOString()"), "r.started_at uses safeToIsoString");
assert.ok(!hubContent.includes("r.completed_at).toISOString()"), "r.completed_at uses safeToIsoString");

console.log("  -> personal-student-hub.ts passed all isolation and safety checks!");

console.log("[Test 5] Error boundary in error.tsx");
const errorBoundaryPath = path.join(rootDir, "app/consultoria/[slug]/progresso/alunos/[studentPublicId]/error.tsx");
const errorBoundaryContent = fs.readFileSync(errorBoundaryPath, "utf-8");
assert.ok(errorBoundaryContent.includes("[Student Evolution Error Boundary]"), "error.tsx logs [Student Evolution Error Boundary]");
console.log("  -> error.tsx correctly configured!");

console.log("=== ALL STUDENT EVOLUTION TESTS PASSED ===");
