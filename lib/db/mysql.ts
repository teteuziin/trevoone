import mysql, { type Pool, type PoolConnection } from "mysql2/promise";

declare global {
  var _mysqlPool: Pool | undefined;
}

export function getDbPool(): Pool {
  if (globalThis._mysqlPool) {
    return globalThis._mysqlPool;
  }

  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

  if (!DB_HOST) {
    throw new Error("Missing required database environment variable: DB_HOST");
  }
  if (!DB_NAME) {
    throw new Error("Missing required database environment variable: DB_NAME");
  }
  if (!DB_USER) {
    throw new Error("Missing required database environment variable: DB_USER");
  }
  if (DB_PASSWORD === undefined || DB_PASSWORD === "") {
    throw new Error("Missing required database environment variable: DB_PASSWORD");
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

  if (process.env.NODE_ENV !== "production") {
    globalThis._mysqlPool = pool;
  }

  return pool;
}

export async function getDbConnection(): Promise<PoolConnection> {
  const pool = getDbPool();
  const connection = await pool.getConnection();
  await connection.query("SET SESSION time_zone = '+00:00';");
  return connection;
}

