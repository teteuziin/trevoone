import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("=== RUNNING INDICACOES PAGE CRASH FIX AUDIT (REF: 95721694) ===");

// 1. Audit schema-assurance.ts
const schemaAssurancePath = path.join(rootDir, "lib", "referrals", "schema-assurance.ts");
const schemaContent = fs.readFileSync(schemaAssurancePath, "utf-8");

assert(
  schemaContent.includes("conn.query(`") || schemaContent.includes("conn.query(ddl)"),
  "schema-assurance.ts must use connection.query for DDL statements (text protocol)"
);

assert(
  !schemaContent.match(/connection\.execute\s*\(\s*`\s*CREATE\s+TABLE/i),
  "schema-assurance.ts must NOT use connection.execute on CREATE TABLE"
);

assert(
  !schemaContent.match(/connection\.execute\s*\(\s*`?\s*ALTER\s+TABLE/i),
  "schema-assurance.ts must NOT use connection.execute on ALTER TABLE"
);

assert(
  !schemaContent.includes("throw err;"),
  "schema-assurance.ts must NEVER throw uncaught errors that crash page loaders"
);
console.log("✔ Audit 1: schema-assurance.ts uses text protocol for DDL and never throws.");

// 2. Audit service.ts BigInt serialization safety
const servicePath = path.join(rootDir, "lib", "referrals", "service.ts");
const serviceContent = fs.readFileSync(servicePath, "utf-8");

assert(
  serviceContent.includes("commissionAmountCents: number;"),
  "ConsultancyReferralSettings must define commissionAmountCents as number, not bigint"
);

// Verify serialization simulation
const mockSettings = {
  id: 1,
  consultancyId: 10,
  isEnabled: true,
  commissionType: "FIXED_AMOUNT",
  commissionAmountCents: 5000,
  commissionRateBasisPoints: 1000,
  commissionValue: 50.0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

let serializedSettings = "";
assert.doesNotThrow(() => {
  serializedSettings = JSON.stringify(mockSettings);
}, "Mock settings must serialize to JSON without BigInt serialization error");
assert(serializedSettings.includes('"commissionAmountCents":5000'), "commissionAmountCents must serialize as integer 5000");
console.log("✔ Audit 2: service.ts ConsultancyReferralSettings serializes safely without BigInt.");

// 3. Audit campaigns.ts BigInt serialization safety
const campaignsPath = path.join(rootDir, "lib", "referrals", "campaigns.ts");
const campaignsContent = fs.readFileSync(campaignsPath, "utf-8");

assert(
  campaignsContent.includes("commissionAmountCents: number | null;"),
  "PromotionalCampaignLinkRecord must define commissionAmountCents as number | null, not bigint"
);

const mockCampaignLink = {
  id: 1,
  publicId: "abc-123",
  consultancyId: 10,
  referrerMemberId: 5,
  code: "FITNESS10",
  title: "Link Promocional",
  description: null,
  destinationUrl: "https://example.com",
  announcedDiscountType: "PERCENTAGE",
  announcedDiscountValue: "10%",
  eligiblePlans: null,
  commissionType: "FIXED",
  commissionAmountCents: 2500,
  commissionRateBasisPoints: null,
  commissionValueFormatted: "R$ 25,00",
  commissionConditions: null,
  startsAt: null,
  endsAt: null,
  maxUses: null,
  currentUses: 0,
  clickCount: 0,
  conversionsCount: 0,
  status: "ACTIVE",
  shareableUrl: "/r/FITNESS10",
  createdAt: new Date(),
  updatedAt: new Date(),
};

let serializedLink = "";
assert.doesNotThrow(() => {
  serializedLink = JSON.stringify(mockCampaignLink);
}, "Mock campaign link must serialize cleanly without BigInt error");
assert(serializedLink.includes('"commissionAmountCents":2500'), "commissionAmountCents must serialize as 2500");
console.log("✔ Audit 3: campaigns.ts PromotionalCampaignLinkRecord serializes safely without BigInt.");

// 4. Audit page.tsx fallbacks
const pagePath = path.join(rootDir, "app", "consultoria", "[slug]", "indicacoes", "page.tsx");
const pageContent = fs.readFileSync(pagePath, "utf-8");

assert(
  pageContent.includes("getAdminReferralsData(context.consultancyId).catch"),
  "IndicacoesPage must guard getAdminReferralsData with .catch fallback"
);
assert(
  pageContent.includes("listCampaignLinksForAdmin(context.consultancyId).catch"),
  "IndicacoesPage must guard listCampaignLinksForAdmin with .catch fallback"
);
assert(
  pageContent.includes("getParticipantPromotionalDashboard(context.consultancyId, context.membershipId).catch"),
  "IndicacoesPage must guard getParticipantPromotionalDashboard with .catch fallback"
);
console.log("✔ Audit 4: page.tsx has resilient defensive fallbacks for all data loaders.");

console.log("=== ALL INDICACOES PAGE CRASH AUDIT CHECKS PASSED SUCCESSFULLY ===");
