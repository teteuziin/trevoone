import mysql from "mysql2/promise";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, "..", "database", "migrations");

const MIGRATION_FILE_PATTERN = /^\d{3}_[a-z0-9_]+\.sql$/;

async function loadAndValidateLocalMigrations() {
  let files;
  try {
    files = await fs.readdir(MIGRATIONS_DIR);
  } catch (err) {
    console.error(`Erro ao ler o diretório de migrations (${MIGRATIONS_DIR}):`, err.message);
    process.exit(1);
  }

  const sqlFiles = files.filter(
    (file) => !file.startsWith(".") && file.endsWith(".sql")
  );

  for (const file of sqlFiles) {
    if (!MIGRATION_FILE_PATTERN.test(file)) {
      console.error(`ERRO: Nomenclatura de migration inválida: '${file}'. Esperado formato '001_nome.sql'.`);
      process.exit(1);
    }
  }

  sqlFiles.sort((a, b) => a.localeCompare(b));

  const prefixes = new Map();
  for (const file of sqlFiles) {
    const prefix = file.substring(0, 3);
    if (prefixes.has(prefix)) {
      console.error(
        `ERRO: Prefixo numérico duplicado '${prefix}' encontrado em '${prefixes.get(prefix)}' e '${file}'.`
      );
      process.exit(1);
    }
    prefixes.set(prefix, file);
  }

  const migrations = [];
  for (const file of sqlFiles) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const contentBuffer = await fs.readFile(filePath);
    const checksum = crypto.createHash("sha256").update(contentBuffer).digest("hex");
    migrations.push({
      name: file,
      filePath,
      checksum,
      content: contentBuffer.toString("utf-8"),
    });
  }

  return migrations;
}

async function run() {
  const isApplyMode = process.argv.includes("--apply");

  const localMigrations = await loadAndValidateLocalMigrations();

  if (!isApplyMode) {
    console.log("Migrations locais encontradas:");
    for (const m of localMigrations) {
      console.log(`- ${m.name}`);
    }
    console.log("\nModo seguro.");
    console.log("Nenhuma conexão com o banco foi aberta.");
    console.log("Use --apply somente após autorização explícita.");
    process.exit(0);
  }

  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

  if (!DB_HOST || !DB_NAME || !DB_USER || DB_PASSWORD === undefined || DB_PASSWORD === "") {
    console.error("ERRO: Variáveis de ambiente do banco de dados não estão completamente configuradas.");
    process.exit(1);
  }

  const port = Number(DB_PORT);
  const validatedPort = !isNaN(port) && port > 0 ? port : 3306;

  let pool = null;
  let connection = null;

  try {
    pool = mysql.createPool({
      host: DB_HOST,
      port: validatedPort,
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASSWORD,
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
      multipleStatements: true,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    connection = await pool.getConnection();

    await connection.query("SET SESSION time_zone = '+00:00';");

    const createSchemaMigrationsTable = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
          migration VARCHAR(255) NOT NULL,
          checksum CHAR(64) NOT NULL,
          applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (migration)
      )
      ENGINE=InnoDB
      DEFAULT CHARACTER SET=utf8mb4
      COLLATE=utf8mb4_unicode_ci;
    `;
    await connection.query(createSchemaMigrationsTable);

    const [rows] = await connection.query(
      "SELECT migration, checksum FROM schema_migrations ORDER BY migration ASC;"
    );

    const appliedMap = new Map();
    if (Array.isArray(rows)) {
      for (const row of rows) {
        appliedMap.set(row.migration, row.checksum);
      }
    }

    const localMap = new Map(localMigrations.map((m) => [m.name, m]));

    for (const [appliedMigration] of appliedMap) {
      if (!localMap.has(appliedMigration)) {
        console.error(`ERRO DE INTEGRIDADE DE MIGRATION\n\nMigration registrada no banco mas ausente no repositório local: '${appliedMigration}'.`);
        process.exit(1);
      }
    }

    for (const [appliedMigration, dbChecksum] of appliedMap) {
      const local = localMap.get(appliedMigration);
      if (local.checksum !== dbChecksum) {
        console.error(
          `ERRO DE INTEGRIDADE DE MIGRATION\n\nMigration:\n${appliedMigration}\n\nA migration já foi aplicada anteriormente, mas seu conteúdo local foi modificado.\nNenhuma nova migration foi executada.`
        );
        process.exit(1);
      }
    }

    const pending = localMigrations.filter((m) => !appliedMap.has(m.name));

    if (pending.length === 0) {
      console.log("Nenhuma migration pendente. O banco de dados já está atualizado.");
      return;
    }

    console.log(`Encontrada(s) ${pending.length} migration(s) pendente(s):`);
    for (const m of pending) {
      console.log(`- Executando ${m.name}...`);
      await connection.query(m.content);
      await connection.query(
        "INSERT INTO schema_migrations (migration, checksum) VALUES (?, ?);",
        [m.name, m.checksum]
      );
      console.log(`- ${m.name} aplicada e registrada com sucesso.`);
    }

    console.log("\nTodas as migrations foram aplicadas com sucesso.");
  } catch (err) {
    const errCode = err?.code || "ERRO_MIGRATION";
    const errMessage = err?.message || String(err);
    console.error(`ERRO AO EXECUTAR MIGRATION\n\nCódigo:\n${errCode}\n\nMensagem:\n${errMessage}`);
    process.exit(1);
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch {}
    }
    if (pool) {
      try {
        await pool.end();
      } catch {}
    }
  }
}

run();
