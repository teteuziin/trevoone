import mysql from 'mysql2/promise';

async function auditCombinations() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [rows] = await pool.query(`
      SELECT 
        COUNT(*) as total_combinations,
        SUM(CASE WHEN wv.status = 'PUBLISHED' THEN 1 ELSE 0 END) as in_published,
        SUM(CASE WHEN wv.status = 'DRAFT' THEN 1 ELSE 0 END) as in_draft,
        SUM(CASE WHEN wv.status = 'ARCHIVED' THEN 1 ELSE 0 END) as in_archived,
        SUM(CASE WHEN wv.status IN ('PUBLISHED', 'ARCHIVED') AND wic.created_at > DATE_ADD(wv.published_at, INTERVAL 5 SECOND) THEN 1 ELSE 0 END) as after_publish_suspicious
      FROM workout_item_combinations wic
      JOIN workout_blocks wb ON wb.id = wic.block_id
      JOIN workout_versions wv ON wv.id = wb.workout_version_id
    `);

    console.log('AUDIT RESULT:', JSON.stringify(rows[0], null, 2));
  } finally {
    await pool.end();
  }
}

auditCombinations().catch(console.error);
