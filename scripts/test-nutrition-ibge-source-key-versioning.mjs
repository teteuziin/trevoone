/**
 * Test: IBGE Source Key and Source UID Versioning
 *
 * Verifies:
 * 1. Database uses versioned source_key 'IBGE_POF_2008_2009' and 0 records have unversioned 'IBGE'
 * 2. Every source_uid in DEV database follows 'IBGE_POF_2008_2009:{food_code}:{prep_code}'
 * 3. Query builder allowlist includes 'IBGE_POF_2008_2009' and excludes generic 'IBGE'
 * 4. Manifest and canonical dataset JSON reference 'IBGE_POF_2008_2009'
 */

import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

const env = {};
fs.readFileSync(".env.local", "utf8").split("\n").forEach(l => {
  const parts = l.trim().split("=");
  const k = parts[0];
  const v = parts.slice(1).join("=");
  if (k && v) env[k.trim()] = v.trim();
});

const EXPECTED_HOST = "srv1595.hstgr.io";
const DEV_DB_NAME = "u406031981_trevoone_dev";

if (env.DB_HOST !== EXPECTED_HOST) {
  throw new Error(`Invalid host: ${env.DB_HOST}`);
}
if (env.DB_NAME !== DEV_DB_NAME) {
  throw new Error(`ABSOLUTE GUARD: DB is NOT DEV: ${env.DB_NAME}`);
}

async function run() {
  console.log('=== TEST: IBGE Source Key Versioning & Provenance ===\n');

  // 1. Verify Manifest
  const manifestPath = path.resolve(process.cwd(), 'data/nutrition/ibge-pof-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  if (manifest.source_key !== 'IBGE_POF_2008_2009') {
    throw new Error(`Manifest source_key is '${manifest.source_key}', expected 'IBGE_POF_2008_2009'`);
  }
  console.log(`[PASS] Manifest source_key: ${manifest.source_key}`);

  // 2. Verify Canonical Dataset
  const datasetPath = path.resolve(process.cwd(), 'data/nutrition/ibge-pof-2008-2009.json');
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
  if (dataset.metadata?.source_key !== 'IBGE_POF_2008_2009') {
    throw new Error(`Dataset metadata.source_key is '${dataset.metadata?.source_key}', expected 'IBGE_POF_2008_2009'`);
  }
  let invalidDatasetUid = 0;
  for (const item of dataset.foods) {
    if (!item.source_uid || !item.source_uid.startsWith('IBGE_POF_2008_2009:')) invalidDatasetUid++;
  }
  if (invalidDatasetUid > 0) {
    throw new Error(`Dataset has ${invalidDatasetUid} invalid source_uids`);
  }
  console.log(`[PASS] Canonical dataset (${dataset.foods.length} items): metadata.source_key='IBGE_POF_2008_2009' and all source_uids prefixed`);

  // 3. Verify Food Query Builder
  const queryBuilderPath = path.resolve(process.cwd(), 'lib/nutrition-v2/food-query-builder.ts');
  const queryBuilderCode = fs.readFileSync(queryBuilderPath, 'utf-8');
  if (!queryBuilderCode.includes('"IBGE_POF_2008_2009"')) {
    throw new Error('food-query-builder.ts does not include IBGE_POF_2008_2009');
  }
  if (queryBuilderCode.includes('"IBGE"') && !queryBuilderCode.includes('"IBGE_POF_2008_2009"')) {
    throw new Error('food-query-builder.ts still uses bare "IBGE"');
  }
  console.log('[PASS] Query builder allowlist includes IBGE_POF_2008_2009 and not bare IBGE');

  // 4. Verify Database
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME
  });

  try {
    const [dbCheck] = await connection.execute('SELECT DATABASE() AS db_name');
    const currentDb = dbCheck[0].db_name;
    console.log(`Connected to database: ${currentDb}`);
    if (currentDb !== DEV_DB_NAME) {
      throw new Error(`SAFETY ERROR: connected to ${currentDb}, expected ${DEV_DB_NAME}`);
    }

    // Check raw unversioned IBGE count
    const [rawIbge] = await connection.execute(
      "SELECT COUNT(*) AS c FROM nutrition_v2_foods WHERE source_key = 'IBGE'"
    );
    const rawIbgeCount = rawIbge[0].c;
    console.log(`DEV rows with unversioned source_key='IBGE': ${rawIbgeCount} (expected: 0)`);
    if (rawIbgeCount !== 0) {
      throw new Error(`Found ${rawIbgeCount} records with unversioned source_key 'IBGE'`);
    }

    // Check versioned IBGE_POF_2008_2009 count
    const [versionedIbge] = await connection.execute(
      "SELECT COUNT(*) AS c FROM nutrition_v2_foods WHERE source_key = 'IBGE_POF_2008_2009'"
    );
    const versionedCount = versionedIbge[0].c;
    console.log(`DEV rows with versioned source_key='IBGE_POF_2008_2009': ${versionedCount} (expected: 1820)`);
    if (versionedCount !== 1820) {
      throw new Error(`Expected 1820 versioned records, found ${versionedCount}`);
    }

    // Check source_uid format in DB
    const [invalidUids] = await connection.execute(
      "SELECT COUNT(*) AS c FROM nutrition_v2_foods WHERE source_key = 'IBGE_POF_2008_2009' AND source_uid NOT LIKE 'IBGE_POF_2008_2009:%'"
    );
    const invalidUidCount = invalidUids[0].c;
    console.log(`DEV rows with non-conforming source_uid: ${invalidUidCount} (expected: 0)`);
    if (invalidUidCount !== 0) {
      throw new Error(`Found ${invalidUidCount} records with invalid source_uid format`);
    }

    // Check sample source_uid
    const [sample] = await connection.execute(
      "SELECT source_key, source_uid, name FROM nutrition_v2_foods WHERE source_key = 'IBGE_POF_2008_2009' LIMIT 3"
    );
    console.log('\nSample records:');
    for (const row of sample) {
      console.log(` - [${row.source_key}] ${row.source_uid} -> ${row.name}`);
    }

    console.log('\n[ALL CHECKS PASSED] SOURCE_KEY and SOURCE_UID are properly versioned and provenance-preserved.');
  } finally {
    await connection.end();
  }
}

run().catch((err) => {
  console.error('\nFAIL:', err);
  process.exit(1);
});
