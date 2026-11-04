import mysql from 'mysql2/promise';

async function checkDb() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'trevo_qa',
    password: 'trevo_one_qa_pass',
    database: 'trevo_one_qa'
  });

  console.log('=== FORMS IN trevo_one_qa ===');
  const [forms] = await conn.query('SELECT id, public_id, title, status FROM consultancy_forms');
  console.log(JSON.stringify(forms, null, 2));

  console.log('\n=== STUDENTS IN trevo_one_qa ===');
  const [students] = await conn.query("SELECT cm.id, cm.public_id, u.email, u.full_name FROM consultancy_members cm JOIN users u ON u.id = cm.user_id WHERE u.email LIKE '%daien%'");
  console.log(JSON.stringify(students, null, 2));

  await conn.end();
}

checkDb().catch(e => {
  console.error(e);
  process.exit(1);
});
