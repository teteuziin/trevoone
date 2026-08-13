import mysql from "mysql2/promise";

async function testConnection() {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

  if (!DB_HOST || !DB_NAME || !DB_USER || DB_PASSWORD === undefined || DB_PASSWORD === "") {
    console.error("Erro: Variáveis de ambiente do banco de dados não estão completamente configuradas no .env.local.");
    process.exit(1);
  }

  const port = Number(DB_PORT);
  const validatedPort = !isNaN(port) && port > 0 ? port : 3306;

  const pool = mysql.createPool({
    host: DB_HOST,
    port: validatedPort,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    if (Array.isArray(rows) && rows.length > 0 && (rows[0]).ok === 1) {
      console.log("Conexão MySQL OK");
    } else {
      console.error("Erro: A consulta SELECT 1 não retornou o resultado esperado.");
      process.exit(1);
    }
  } catch (error) {
    const errCode = error?.code || error?.message || "ERRO_DESCONHECIDO";
    console.error(`TAREFA NÃO CONCLUÍDA — CONEXÃO MYSQL\n\nCódigo do erro:\n${errCode}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
