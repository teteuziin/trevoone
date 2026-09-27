import mysql from 'mysql2/promise';
import fs from 'node:fs';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
  const p = l.trim().split('=');
  if (p[0] && p[1]) env[p[0].trim()] = p.slice(1).join('=').trim();
});

async function run() {
  const pool = mysql.createPool({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  const [rows] = await pool.query(
    "SELECT id, source_key, source_external_code, name, display_name_pt_br, " +
    "calories_kcal, protein_g, carbohydrate_g, fat_g, fiber_g " +
    "FROM nutrition_v2_foods WHERE source_key IN ('TACO', 'IBGE_POF_2008_2009')"
  );

  console.log('TOTAL_BR_ROWS:', rows.length);
  const byDisplay = new Map();
  for (const r of rows) {
    const dn = r.display_name_pt_br;
    if (!byDisplay.has(dn)) byDisplay.set(dn, []);
    byDisplay.get(dn).push(r);
  }
  console.log('UNIQUE_DISPLAY_NAMES:', byDisplay.size);
  const collisions = Array.from(byDisplay.entries()).filter(([, v]) => v.length > 1);
  console.log('DUPLICATE_DISPLAY_NAME_GROUPS:', collisions.length);
  const totalInCollisions = collisions.reduce((sum, [, v]) => sum + v.length, 0);
  console.log('TOTAL_ROWS_IN_COLLISION_GROUPS:', totalInCollisions);

  collisions.sort((a, b) => b[1].length - a[1].length);
  console.log('\n--- TOP 50 COLLISION GROUPS ---');
  let i = 1;
  for (const [dn, items] of collisions.slice(0, 50)) {
    console.log('\n#' + (i++) + ' [' + items.length + ' rows] Display: "' + dn + '"');
    for (const it of items) {
      console.log('    * [' + it.source_key + '] (' + it.source_external_code + ') "' + it.name + '" -> ' + it.calories_kcal + ' kcal, P:' + it.protein_g + 'g, C:' + it.carbohydrate_g + 'g, F:' + it.fat_g + 'g');
    }
  }
  await pool.end();
}

run().catch(console.error);
