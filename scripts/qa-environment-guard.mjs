/**
 * TREVO ONE — QA ENVIRONMENT GUARD
 * 
 * Protects against accidental mutating operations on production database.
 * Detects database environment classification (PRODUCTION, QA, LOCAL, TEST)
 * without exposing sensitive credentials.
 */

import fs from "node:fs";
import path from "node:path";

let cachedClassification = null;

export function getDatabaseClassification() {
  if (cachedClassification) {
    return cachedClassification;
  }

  // 1. Explicit override via QA environment variable
  if (process.env.TREVO_QA_ENV === "test" || process.env.NODE_ENV === "test") {
    cachedClassification = {
      name: "trevo-one-qa",
      classification: "TEST",
      isProduction: false,
      reason: "Explicit test environment variable set",
    };
    return cachedClassification;
  }

  // 2. Read DB_HOST and DB_NAME exclusively from process.env (passed via node --env-file)
  const dbHost = process.env.DB_HOST || "";
  const dbName = process.env.DB_NAME || "";


  const hostLower = (dbHost || "").toLowerCase();
  const nameLower = (dbName || "").toLowerCase();

  const isLocal =
    hostLower === "localhost" ||
    hostLower === "127.0.0.1" ||
    hostLower.includes("local") ||
    hostLower.includes("docker") ||
    hostLower === "";

  const isTestSchema =
    nameLower.includes("test") ||
    nameLower.includes("qa") ||
    nameLower.includes("sandbox") ||
    hostLower.includes("test");

  const isProdHost =
    hostLower.includes("hostinger") ||
    hostLower.includes("trevoone") ||
    hostLower.includes("srv") ||
    hostLower.includes("185.") ||
    (!isLocal && !isTestSchema);

  if (isProdHost) {
    cachedClassification = {
      name: "trevo-one",
      classification: "PRODUCTION",
      isProduction: true,
      reason: "Hostinger / remote production database host detected",
    };
  } else if (isTestSchema) {
    cachedClassification = {
      name: "trevo-one-qa",
      classification: "QA",
      isProduction: false,
      reason: "Dedicated QA / Test database schema detected",
    };
  } else {
    cachedClassification = {
      name: "trevo-one-local",
      classification: "LOCAL",
      isProduction: false,
      reason: "Local MySQL database detected",
    };
  }

  return cachedClassification;
}

export function isProductionDatabase() {
  return getDatabaseClassification().isProduction;
}

export function printEnvironmentBanner() {
  const env = getDatabaseClassification();
  console.log("==================================================");
  console.log("TREVO ONE — ENVIRONMENT CLASSIFICATION GUARD");
  console.log("==================================================");
  console.log(`Environment Name:        ${env.name}`);
  console.log(`Database Classification: ${env.classification}`);
  if (env.isProduction) {
    console.log(`[PROD GUARD ACTIVE]      MUTATING TESTS ON PRODUCTION DB ARE STRICTLY REFUSED.`);
  } else {
    console.log(`[SAFE TEST MODE]         Isolated database available for mutating operations.`);
  }
  console.log("==================================================\n");
}

/**
 * Wraps a mutating database test. If running against production, cleanly
 * refuses execution and records it as skipped/refused without crashing.
 */
export function guardMutatingTest(testName, fn) {
  const env = getDatabaseClassification();
  if (env.isProduction) {
    console.log(`[PROD GUARD REFUSED] Mutating test skipped: "${testName}" (Production DB protected)`);
    return { status: "REFUSED_PROD_PROTECTION", testName, reason: env.reason };
  }
  return fn();
}
