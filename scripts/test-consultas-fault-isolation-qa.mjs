/**
 * TREVO ONE — CONSULTAS FAULT ISOLATION & TREVO CHAT REGRESSION QA SUITE
 * 
 * Verifies:
 * 1. Database schema column integrity (u.full_name vs invalid u.name)
 * 2. Fault isolation between Videochamada and Trevo Chat (chat failure cannot crash Consultas)
 * 3. Non-masking invariant (chat failure is NOT masked as empty list [])
 * 4. Tab switching and retry behavior
 * 5. Tenancy isolation in chat queries
 * 6. Migration 051 integrity and idempotent self-healing schema creation
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

console.log("==================================================");
console.log("TREVO ONE — CONSULTAS FAULT ISOLATION QA SUITE");
console.log("==================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

// ----------------------------------------------------------------------------
// 1. Column Integrity in users table
// ----------------------------------------------------------------------------
runTest("1. Invariant: users table defines full_name and does not define a 'name' column", () => {
  const schemaPath = path.join(ROOT, "database", "migrations", "001_initial_schema.sql");
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");

  assert.match(schemaContent, /full_name\s+VARCHAR/i, "users table must define full_name");
  assert.doesNotMatch(schemaContent, /`name`\s+VARCHAR/i, "users table must not define name column");
});

runTest("2. Invariant: lib/consultancies/trevo-chat.ts queries u.full_name, never u.name", () => {
  const chatFile = path.join(ROOT, "lib", "consultancies", "trevo-chat.ts");
  const chatContent = fs.readFileSync(chatFile, "utf-8");

  // Must not have u.name, u_stud.name, u_prof.name in SQL queries
  assert.doesNotMatch(chatContent, /u\.name(?!\w)/i, "trevo-chat.ts must not contain 'u.name'");
  assert.doesNotMatch(chatContent, /u_stud\.name(?!\w)/i, "trevo-chat.ts must not contain 'u_stud.name'");
  assert.doesNotMatch(chatContent, /u_prof\.name(?!\w)/i, "trevo-chat.ts must not contain 'u_prof.name'");

  // Must contain u.full_name, u_stud.full_name, u_prof.full_name
  assert.match(chatContent, /u_stud\.full_name AS student_name/i, "Must alias u_stud.full_name AS student_name");
  assert.match(chatContent, /u_prof\.full_name AS professional_name/i, "Must alias u_prof.full_name AS professional_name");
  assert.match(chatContent, /u\.full_name AS sender_name/i, "Must alias u.full_name AS sender_name");
  assert.match(chatContent, /COALESCE\(u\.full_name,\s*'Aluno'\)/i, "Must COALESCE u.full_name in listActiveStudentsForChat");
});

// ----------------------------------------------------------------------------
// 2. Fault Isolation in Consultas Page
// ----------------------------------------------------------------------------
runTest("3. Fault Isolation: ConsultasPage catches chat loading errors in student view without throwing", () => {
  const pageFile = path.join(ROOT, "app", "consultoria", "[slug]", "consultas", "page.tsx");
  const pageContent = fs.readFileSync(pageFile, "utf-8");

  assert.match(pageContent, /try\s*\{\s*chatConsultations\s*=\s*await\s*listChatConsultationsForStudent/, "Student chat query must be in try/catch");
  assert.match(pageContent, /chatError\s*=\s*"Não foi possível carregar as conversas do Trevo Chat no momento."/, "Must set chatError on failure");
  assert.match(pageContent, /chatError=\{chatError\}/, "Must pass chatError to ConsultationsTabbedContainer");
});

runTest("4. Fault Isolation: ConsultasPage catches chat loading errors in professional view without throwing", () => {
  const pageFile = path.join(ROOT, "app", "consultoria", "[slug]", "consultas", "page.tsx");
  const pageContent = fs.readFileSync(pageFile, "utf-8");

  assert.match(pageContent, /try\s*\{\s*const\s*\[consultationsRes,\s*studentsRes\]\s*=\s*await\s*Promise\.all/, "Professional chat & students queries must be in try/catch");
  assert.match(pageContent, /console\.error\("\[Trevo Chat\] Falha não bloqueante ao carregar conversas do profissional:"/, "Must log non-blocking error");
});

runTest("5. Non-Masking Invariant: ConsultationsTabbedContainer does NOT mask chat failure as empty list", () => {
  const tabContainerFile = path.join(ROOT, "components", "consultancies", "consultations-tabbed-container.tsx");
  const tabContent = fs.readFileSync(tabContainerFile, "utf-8");

  assert.match(tabContent, /chatError\s*\?/, "Must check chatError conditionally");
  assert.match(tabContent, /Trevo Chat temporariamente indisponível/, "Must render dedicated error header");
  assert.match(tabContent, /Tentar novamente/, "Must provide retry button");
  assert.match(tabContent, /Acessar Videochamada/, "Must provide alternative access button to working video");
});

runTest("6. Navigation Preservation: If chat has an error, default tab smoothly routes to video", () => {
  const tabContainerFile = path.join(ROOT, "components", "consultancies", "consultations-tabbed-container.tsx");
  const tabContent = fs.readFileSync(tabContainerFile, "utf-8");

  assert.match(tabContent, /urlTab === "video"\s*\?\s*"video"\s*:\s*urlTab === "chat"\s*\?\s*"chat"\s*:\s*chatError\s*\?\s*"video"/,
    "When chatError is present and URL has no explicit tab, tab must default to 'video'");
});

// ----------------------------------------------------------------------------
// 3. Tenancy & RBAC Isolation
// ----------------------------------------------------------------------------
runTest("7. Tenancy Isolation: Chat consultations strictly segregated by tenancy in repository", () => {
  const chatFile = path.join(ROOT, "lib", "consultancies", "trevo-chat.ts");
  const chatContent = fs.readFileSync(chatFile, "utf-8");

  assert.match(chatContent, /WHERE cc\.consultancy_id = \? AND cc\.professional_membership_id = \?/, "Professional chat query must enforce tenancy and membership");
  assert.match(chatContent, /WHERE cc\.consultancy_id = \? AND cc\.student_membership_id = \?/, "Student chat query must enforce tenancy and membership");
  assert.match(chatContent, /WHERE cc\.consultancy_id = \? AND cc\.public_id = \?/, "Find by public_id must strictly enforce consultancy_id");
});

runTest("8. Migration 051: Defines idempotent DDL for chat_consultations and chat_messages", () => {
  const migFile = path.join(ROOT, "database", "migrations", "051_trevo_chat_and_anamnesis.sql");
  const migContent = fs.readFileSync(migFile, "utf-8");

  assert.match(migContent, /CREATE TABLE IF NOT EXISTS `chat_consultations`/i, "Must use CREATE TABLE IF NOT EXISTS for chat_consultations");
  assert.match(migContent, /CREATE TABLE IF NOT EXISTS `chat_messages`/i, "Must use CREATE TABLE IF NOT EXISTS for chat_messages");
  assert.match(migContent, /REFERENCES `consultancy_custom_form_requests`/i, "Foreign key must reference consultancy_custom_form_requests");
});

runTest("9. Self-Healing Schema: ensureChatTablesExist executes idempotent DDL on ER_NO_SUCH_TABLE", () => {
  const chatFile = path.join(ROOT, "lib", "consultancies", "trevo-chat.ts");
  const chatContent = fs.readFileSync(chatFile, "utf-8");

  assert.match(chatContent, /export async function ensureChatTablesExist/, "Must export ensureChatTablesExist");
  assert.match(chatContent, /executeWithAutoSchema/, "Must provide auto-schema executor");
  assert.match(chatContent, /ER_NO_SUCH_TABLE/, "Must detect missing table error");
});

console.log("\n==================================================");
console.log(`TEST SUITE FINISHED: ${passed}/${passed + failed} PASS`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}
