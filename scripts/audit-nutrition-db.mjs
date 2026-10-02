import mysql from 'mysql2/promise';

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    // 1. Check schema_migrations
    const [colsSchema] = await pool.execute(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'schema_migrations'"
    );
    const schemaCol = colsSchema.map(c => c.COLUMN_NAME)[0] || '*';
    const [migs] = await pool.execute(`SELECT * FROM schema_migrations WHERE \`${schemaCol}\` LIKE '%042%'`);

    // 2. Check nutrition_v2_foods column
    const [colCheck] = await pool.execute(
      "SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nutrition_v2_foods' AND COLUMN_NAME = 'auto_imported_from_reference'"
    );

    // 3. Check nutrition_v2_food_aliases table
    const [tblCheck] = await pool.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nutrition_v2_food_aliases'"
    );

    // 4. Check Food Counts by Source
    const [sourceCounts] = await pool.execute(
      "SELECT source_type, source_key, COUNT(*) as cnt FROM nutrition_v2_foods WHERE deleted_at IS NULL GROUP BY source_type, source_key"
    );

    // 5. Check Reference Catalog table if exists
    const [refTbl] = await pool.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE '%reference%'"
    );

    console.log(JSON.stringify({
      database: process.env.DB_NAME,
      migration042Record: migs.length > 0 ? migs[0] : null,
      auto_imported_from_reference: colCheck.length > 0 ? colCheck[0] : null,
      aliases_table_exists: tblCheck.length > 0,
      food_source_counts: sourceCounts,
      reference_tables: refTbl.map(t => t.TABLE_NAME)
    }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
