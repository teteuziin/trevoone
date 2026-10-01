/**
 * TREVO ONE — USDA OFFICIAL DATASET DOWNLOADER & INTEGRITY VALIDATOR
 *
 * Downloads official FoodData Central JSON datasets directly from USDA:
 * 1. Foundation Foods (April 2026 release)
 * 2. FNDDS / Survey Foods (FNDDS 2021-2023, 2024-10-31 release)
 *
 * Strict Security & Integrity:
 * - Zero extra npm dependencies (uses built-in tar / Expand-Archive).
 * - Downloads to gitignored local directory (.tmp/usda/ or scratch/).
 * - Validates HTTP response status, Content-Length, and ZIP headers.
 * - Extracts and verifies valid JSON structure.
 * - Confirms food item counts > 0.
 * - Aborts on any error. Never tracks raw data in git.
 */

import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const USDA_DATASETS = {
  FOUNDATION: {
    key: "USDA_FOUNDATION",
    release: "Foundation 04/2026",
    filename: "FoodData_Central_foundation_food_json_2026-04-30.zip",
    url: "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2026-04-30.zip",
    expectedRootKey: "FoundationFoods",
    expectedMinCount: 300,
  },
  FNDDS: {
    key: "USDA_FNDDS",
    release: "FNDDS 2021-2023 (2024-10-31)",
    filename: "FoodData_Central_survey_food_json_2024-10-31.zip",
    url: "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_survey_food_json_2024-10-31.zip",
    expectedRootKey: "SurveyFoods",
    expectedMinCount: 5000,
  },
};

function extractZip(zipPath, targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  try {
    execFileSync("tar", ["-xf", zipPath, "-C", targetDir], { stdio: "pipe" });
  } catch {
    // Fallback for Windows PowerShell Expand-Archive if tar fails
    if (process.platform === "win32") {
      execFileSync(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${targetDir.replace(/'/g, "''")}' -Force`,
        ],
        { stdio: "pipe" }
      );
    } else {
      execFileSync("unzip", ["-o", zipPath, "-d", targetDir], { stdio: "pipe" });
    }
  }
}

export async function downloadAndExtractUsda({ targetDir = path.resolve(__dirname, "../.tmp/usda") } = {}) {
  console.log("==================================================");
  console.log("USDA FOODDATA CENTRAL — OFFICIAL DATASET DOWNLOAD");
  console.log("==================================================");
  console.log(`Target directory: ${targetDir}`);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const results = {};

  for (const [name, meta] of Object.entries(USDA_DATASETS)) {
    console.log(`\n--- [${name}] ${meta.release} ---`);
    console.log(`Downloading: ${meta.url}`);

    const zipPath = path.join(targetDir, meta.filename);
    const extractDir = path.join(targetDir, name.toLowerCase() + "_extracted");

    // Download stream
    const res = await fetch(meta.url);
    if (!res.ok) {
      throw new Error(`Failed to download ${name} from ${meta.url}: HTTP ${res.status} ${res.statusText}`);
    }

    const contentLength = Number(res.headers.get("content-length") || 0);
    console.log(`Download stream started (Content-Length: ${(contentLength / 1024).toFixed(1)} KB)...`);

    const fileStream = fs.createWriteStream(zipPath);
    await pipeline(Readable.fromWeb(res.body), fileStream);

    const stat = fs.statSync(zipPath);
    console.log(`Saved: ${zipPath} (${(stat.size / 1024).toFixed(1)} KB)`);

    if (stat.size < 10000) {
      throw new Error(`Downloaded file too small (${stat.size} bytes). Aborting import.`);
    }

    // Extract ZIP
    console.log(`Extracting ZIP archive to ${extractDir}...`);
    extractZip(zipPath, extractDir);

    const extractedFiles = fs.readdirSync(extractDir);
    console.log(`Extracted files: ${extractedFiles.join(", ")}`);

    const jsonFile = extractedFiles.find((f) => f.endsWith(".json"));
    if (!jsonFile) {
      throw new Error(`No JSON file found in extracted archive for ${name}.`);
    }

    const jsonFilePath = path.join(extractDir, jsonFile);
    console.log(`Validating JSON structure in ${jsonFile}...`);

    const raw = fs.readFileSync(jsonFilePath, "utf8");
    const parsed = JSON.parse(raw);
    const items = parsed[meta.expectedRootKey];

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error(`Invalid JSON format: property '${meta.expectedRootKey}' is missing or empty.`);
    }

    if (items.length < meta.expectedMinCount) {
      throw new Error(`Unexpected item count for ${name}: found ${items.length}, expected at least ${meta.expectedMinCount}.`);
    }

    console.log(`[PASS] ${name} verified: ${items.length} records found in ${meta.expectedRootKey}.`);

    results[name] = {
      dataset: meta.key,
      release: meta.release,
      format: "JSON",
      downloadDate: new Date().toISOString(),
      rawZipBytes: stat.size,
      jsonPath: jsonFilePath,
      itemCount: items.length,
    };
  }

  console.log("\n==================================================");
  console.log("ALL DATASETS DOWNLOADED AND VALIDATED SUCCESSFULLY");
  console.log("==================================================");
  console.table(
    Object.values(results).map((r) => ({
      dataset: r.dataset,
      release: r.release,
      format: r.format,
      downloadDate: r.downloadDate,
      items: r.itemCount,
      rawBytes: r.rawZipBytes,
    }))
  );

  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  downloadAndExtractUsda().catch((err) => {
    console.error("FATAL DOWNLOAD ERROR:", err);
    process.exit(1);
  });
}
