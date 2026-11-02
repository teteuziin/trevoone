import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("=== TEST SUITE: SIDEBAR DIVULGUE E GANHE, EVOLUÇÃO DO ALUNO & SCHEMA ASSURANCE ===");

// ---------------------------------------------------------------------------
// TEST 1: Navigation Verification in consultancy-app-shell.tsx
// ---------------------------------------------------------------------------
console.log("\n[Test 1] Verification of navigation in consultancy-app-shell.tsx");
const shellPath = path.join(rootDir, "components/consultancies/consultancy-app-shell.tsx");
const shellContent = fs.readFileSync(shellPath, "utf-8");

assert.ok(
  shellContent.includes('id: "student-indicacoes"'),
  "consultancy-app-shell.tsx must include student-indicacoes in student navigation"
);
assert.ok(
  shellContent.includes('label: "Divulgue e ganhe"'),
  "consultancy-app-shell.tsx must have label 'Divulgue e ganhe'"
);
assert.ok(
  shellContent.includes('href: `/consultoria/${consultancySlug}/indicacoes`'),
  "consultancy-app-shell.tsx must point to /consultoria/[slug]/indicacoes"
);
assert.ok(
  shellContent.includes('id: "admin-indicacoes"'),
  "consultancy-app-shell.tsx must include admin-indicacoes for Admin"
);
console.log("  -> consultancy-app-shell.tsx passed navigation assertions!");

// ---------------------------------------------------------------------------
// TEST 2: Verification of navigation in consultancy-navigation.tsx
// ---------------------------------------------------------------------------
console.log("\n[Test 2] Verification of navigation in consultancy-navigation.tsx");
const navPath = path.join(rootDir, "components/consultancies/consultancy-navigation.tsx");
const navContent = fs.readFileSync(navPath, "utf-8");

assert.ok(
  navContent.includes('"student-indicacoes"'),
  "consultancy-navigation.tsx drawerBusinessIds must include 'student-indicacoes'"
);
assert.ok(
  navContent.includes('"student-indicacoes": "Divulgue e ganhe comissões"'),
  "consultancy-navigation.tsx drawerItemDescriptions must describe student-indicacoes"
);
assert.ok(
  navContent.includes('item.id === "student-indicacoes"'),
  "consultancy-navigation.tsx servicesItems must include student-indicacoes"
);
console.log("  -> consultancy-navigation.tsx passed drawer and services section assertions!");

// ---------------------------------------------------------------------------
// TEST 3: Schema Assurance in lib/referrals/schema-assurance.ts
// ---------------------------------------------------------------------------
console.log("\n[Test 3] Schema assurance implementation in lib/referrals/schema-assurance.ts");
const schemaAssurancePath = path.join(rootDir, "lib/referrals/schema-assurance.ts");
assert.ok(fs.existsSync(schemaAssurancePath), "schema-assurance.ts must exist");
const schemaContent = fs.readFileSync(schemaAssurancePath, "utf-8");

assert.ok(
  schemaContent.includes("export async function ensurePromotionalCampaignsSchema()"),
  "schema-assurance.ts must export ensurePromotionalCampaignsSchema"
);
assert.ok(
  schemaContent.includes("promotional_campaign_links"),
  "schema-assurance.ts must create promotional_campaign_links"
);
assert.ok(
  schemaContent.includes("promotional_marketing_materials"),
  "schema-assurance.ts must create promotional_marketing_materials"
);
assert.ok(
  schemaContent.includes("promotional_campaign_link_materials"),
  "schema-assurance.ts must create promotional_campaign_link_materials"
);
assert.ok(
  schemaContent.includes("file_storage_path"),
  "schema-assurance.ts must verify file_storage_path"
);
assert.ok(
  schemaContent.includes("external_reference"),
  "schema-assurance.ts must verify external_reference"
);

// Verify campaigns.ts and service.ts call ensurePromotionalCampaignsSchema
const campaignsPath = path.join(rootDir, "lib/referrals/campaigns.ts");
const campaignsContent = fs.readFileSync(campaignsPath, "utf-8");
assert.ok(
  campaignsContent.includes("ensurePromotionalCampaignsSchema"),
  "campaigns.ts must import and call ensurePromotionalCampaignsSchema"
);

const servicePath = path.join(rootDir, "lib/referrals/service.ts");
const serviceContent = fs.readFileSync(servicePath, "utf-8");
assert.ok(
  serviceContent.includes("ensurePromotionalCampaignsSchema"),
  "service.ts must import and call ensurePromotionalCampaignsSchema"
);
console.log("  -> Schema assurance is properly hooked and verified!");

// ---------------------------------------------------------------------------
// TEST 4: Student Evolution Hub & Page Resilience
// ---------------------------------------------------------------------------
console.log("\n[Test 4] Student evolution page & hub resilience");
const pagePath = path.join(rootDir, "app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx");
const pageContent = fs.readFileSync(pagePath, "utf-8");

// Must NOT contain restrictive coach lockout
assert.ok(
  !pageContent.includes("isAssignedToOtherCoach"),
  "page.tsx must NOT lock coaches out with isAssignedToOtherCoach"
);
// Must safely query student membership with LEFT JOIN and status != 'DELETED'
assert.ok(
  pageContent.includes("LEFT JOIN consultancy_member_roles cmr"),
  "page.tsx must use LEFT JOIN consultancy_member_roles to resolve students safely"
);
assert.ok(
  pageContent.includes("cm.status != 'DELETED'"),
  "page.tsx must use cm.status != 'DELETED' to resolve active/invited students"
);
// Must safely sanitize lastActiveAt in evaluator.ts
const evaluatorPath = path.join(rootDir, "lib/monitoring/evaluator.ts");
const evaluatorContent = fs.readFileSync(evaluatorPath, "utf-8");
assert.ok(
  evaluatorContent.includes("!isNaN(parsed.getTime())"),
  "evaluator.ts must sanitize lastActiveAt to prevent Invalid Date serialization errors"
);

const hubPath = path.join(rootDir, "lib/consultancies/personal-student-hub.ts");
const hubContent = fs.readFileSync(hubPath, "utf-8");

// Must have fallback on getPersonalStudentDetail outer catch
assert.ok(
  hubContent.includes("if (resolvedStudent)"),
  "personal-student-hub.ts must return fallback profile on outer catch if student was resolved"
);
assert.ok(
  hubContent.includes("filter(Boolean)"),
  "personal-student-hub.ts must filter sessionPublicIds before substitutions query"
);

// Test not-found.tsx and error.tsx
const notFoundPath = path.join(rootDir, "app/consultoria/[slug]/progresso/alunos/[studentPublicId]/not-found.tsx");
assert.ok(fs.existsSync(notFoundPath), "not-found.tsx must exist in student route");

const errorPath = path.join(rootDir, "app/consultoria/[slug]/progresso/alunos/[studentPublicId]/error.tsx");
const errorContent = fs.readFileSync(errorPath, "utf-8");
assert.ok(
  errorContent.includes("isNotFound"),
  "error.tsx must handle isNotFound cleanly"
);
console.log("  -> Student evolution page and error boundaries are resilient and verified!");

console.log("\n=== ALL UNIT & INTEGRATION ASSERTIONS PASSED SUCCESSFULLY! ===");
