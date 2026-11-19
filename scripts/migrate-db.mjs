import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, "..", "database", "migrations");

async function loadMysql() {
  try {
    const mod = await import("mysql2/promise");
    return mod.default || mod;
  } catch {
    const candidatePaths = [
      path.join(__dirname, "..", "node_modules", "mysql2", "promise.js"),
      "/home/u406031981/runner_deps/node_modules/mysql2/promise.js",
      path.join(__dirname, "..", "..", "runner_deps", "node_modules", "mysql2", "promise.js"),
      path.join(__dirname, "..", "..", "domains", "trevoone.com", "hbuilds", "current", "nodejs", "node_modules", "mysql2", "promise.js"),
      path.join(__dirname, "..", "..", "domains", "trevoone.com", "hbuilds", "last-source", "node_modules", "mysql2", "promise.js"),
    ];
    for (const p of candidatePaths) {
      try {
        const fileUrl = p.startsWith("/") ? `file://${p}` : `file:///${p.replace(/\\/g, "/")}`;
        const mod = await import(fileUrl);
        return mod.default || mod;
      } catch {}
    }
    throw new Error(
      "Não foi possível carregar a dependência 'mysql2'. Certifique-se de que o diretório 'node_modules' esteja acessível via symlink (ex: ln -s ~/public_html/node_modules node_modules)."
    );
  }
}

const MIGRATION_FILE_PATTERN = /^\d{3}_[a-z0-9_]+\.sql$/;

/**
 * Whitelist estrita e auditável de exceções históricas comprovadas em produção.
 * Somente estes arquivos específicos com o valor exato autorizado são tolerados.
 * Qualquer outro arquivo ou qualquer outro valor é rejeitado sem exceção.
 */
export const HISTORICAL_SPECIAL_CHECKSUMS = new Map([
  ["051_trevo_chat_and_anamnesis.sql", "runtime_bootstrapped"],
  ["052_trevo_chat_bilateral_appointments.sql", "runtime_bootstrapped"],
]);

export async function loadAndValidateLocalMigrations() {
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
    const normalizedBuffer = Buffer.from(contentBuffer.toString("utf-8").replace(/\r\n/g, "\n"), "utf-8");
    const normalizedChecksum = crypto.createHash("sha256").update(normalizedBuffer).digest("hex");
    migrations.push({
      name: file,
      filePath,
      checksum,
      normalizedChecksum,
      content: contentBuffer.toString("utf-8"),
    });
  }

  return migrations;
}

async function run() {
  const isApplyMode = process.argv.includes("--apply");
  const isPreviewMode =
    process.argv.includes("--preview") ||
    process.argv.includes("--dry-run") ||
    process.argv.includes("--simulate");
  const onlyArg = process.argv.find((arg) => arg.startsWith("--only=") || arg.startsWith("--migration="));
  const targetOnly = onlyArg ? onlyArg.replace(/^--(only|migration)=/, "").trim() : null;

  console.log(`[Diretório Atual]: ${process.cwd()}`);

  const localMigrations = await loadAndValidateLocalMigrations();

  if (!isApplyMode && !isPreviewMode) {
    console.log(`\nMigrations locais encontradas (${localMigrations.length}):`);
    for (const m of localMigrations) {
      console.log(`- ${m.name}`);
    }
    console.log("\nModo seguro.");
    console.log("Nenhuma conexão com o banco foi aberta.");
    console.log("\nOpções de execução:");
    console.log("  node scripts/migrate-db.mjs --preview --only=077_custom_charges_and_plan_features.sql  # Simula e valida pré-requisitos sem gravar");
    console.log("  node scripts/migrate-db.mjs --apply --only=077_custom_charges_and_plan_features.sql    # Executa estritamente a migration 077");
    console.log("  node scripts/migrate-db.mjs --apply                                                    # Aplica todas as migrations pendentes");
    process.exit(0);
  }

  if (!process.env.DB_HOST) {
    const candidatePaths = [
      path.join(__dirname, "..", ".env.local"),
      path.join(__dirname, "..", ".env"),
      path.join(__dirname, "..", ".env.production"),
      path.join(__dirname, "..", "..", ".env.local"),
      path.join(__dirname, "..", "..", ".env"),
      path.join(__dirname, "..", "..", ".env.production"),
      path.join(__dirname, "..", "..", "domains", "trevoone.com", "hbuilds", "config", ".env"),
      "/home/u406031981/domains/trevoone.com/hbuilds/config/.env",
      path.join(__dirname, "..", "..", "public_html", ".env"),
      path.join(__dirname, "..", "..", "public_html", ".env.production"),
    ];
    for (const envPath of candidatePaths) {
      try {
        const envContent = await fs.readFile(envPath, "utf-8");
        for (const line of envContent.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx !== -1) {
            const k = trimmed.substring(0, eqIdx).trim();
            const v = trimmed.substring(eqIdx + 1).trim();
            if (k && !process.env[k]) {
              process.env[k] = v;
            }
          }
        }
        if (process.env.DB_HOST) break;
      } catch {}
    }
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
    const mysql = await loadMysql();
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

    // Validação estrita da identidade do banco conectado
    const [identityRows] = await connection.query(
      "SELECT DATABASE() AS current_db, @@hostname AS current_host;"
    );
    const activeDb = identityRows[0]?.current_db;
    if (!activeDb || (DB_NAME && activeDb.toLowerCase() !== DB_NAME.toLowerCase())) {
      throw new Error(
        `Discrepância na identidade do banco de dados: esperado '${DB_NAME}', ativo na sessão '${activeDb}'. Operação recusada.`
      );
    }

    const targetDbArg = process.argv.find((arg) => arg.startsWith("--target-db="));
    const expectedTargetDb = targetDbArg
      ? targetDbArg.replace(/^--target-db=/, "").trim()
      : process.env.TARGET_DB || null;

    if (expectedTargetDb && activeDb.toLowerCase() !== expectedTargetDb.toLowerCase()) {
      throw new Error(
        `Banco de dados alvo divergente: esperado '${expectedTargetDb}', mas o banco ativo na sessão é '${activeDb}'. Execução bloqueada.`
      );
    }

    console.log(`[Banco Conectado]: '${activeDb}' em ${DB_HOST}:${validatedPort}`);

    if (!isPreviewMode) {
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
    } else {
      // Em modo preview, garantimos ZERO operações DDL: apenas verificamos leitura via information_schema
      const [tableCheck] = await connection.query(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'schema_migrations';"
      );
      if (!Array.isArray(tableCheck) || tableCheck.length === 0) {
        throw new Error("A tabela 'schema_migrations' não existe no banco de dados.");
      }
    }

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
        console.error(
          `ERRO DE INTEGRIDADE DE MIGRATION\n\nMigration registrada no banco mas ausente no repositório local: '${appliedMigration}'.`
        );
        process.exit(1);
      }
    }

    const recognizedHistoricalExceptions = [];

    for (const [appliedMigration, dbChecksum] of appliedMap) {
      const local = localMap.get(appliedMigration);
      const allowedSpecial = HISTORICAL_SPECIAL_CHECKSUMS.get(appliedMigration);
      const isAllowedSpecial = allowedSpecial !== undefined && allowedSpecial === dbChecksum;

      if (isAllowedSpecial) {
        recognizedHistoricalExceptions.push({
          migration: appliedMigration,
          checksum: dbChecksum,
        });
        continue;
      }

      if (local.checksum !== dbChecksum && local.normalizedChecksum !== dbChecksum) {
        console.error(
          `ERRO DE INTEGRIDADE DE MIGRATION\n\nMigration: '${appliedMigration}'\nChecksum no banco: '${dbChecksum}'\nChecksum local esperado: '${local.normalizedChecksum}'.\nConteúdo divergente detectado. Nenhuma migration foi executada.`
        );
        process.exit(1);
      }
    }

    if (recognizedHistoricalExceptions.length > 0) {
      console.log(
        `[Integridade Histórica]: ${recognizedHistoricalExceptions.length} registro(s) com checksum histórico especial autorizado:`
      );
      for (const exc of recognizedHistoricalExceptions) {
        console.log(`  - ${exc.migration} [${exc.checksum}]`);
      }
    }

    const pending = localMigrations.filter((m) => !appliedMap.has(m.name));

    let toExecute = pending;

    if (targetOnly) {
      const matched = localMigrations.find((m) => m.name === targetOnly || m.name.startsWith(targetOnly));
      if (!matched) {
        console.error(`ERRO: Migration alvo '${targetOnly}' não encontrada no repositório.`);
        process.exit(1);
      }
      if (appliedMap.has(matched.name)) {
        console.log(`A migration '${matched.name}' já consta como aplicada e registrada no banco de dados.`);
        if (isPreviewMode) {
          console.log("\n================================================================================");
          console.log("TREVO ONE: MIGRADOR — SIMULAÇÃO CONCLUÍDA COM SUCESSO (--preview)");
          console.log("================================================================================");
          console.log(`Banco Alvo Verificado: ${activeDb}`);
          console.log(`Total de Migrations Registradas: ${appliedMap.size}`);
          console.log(`Exceções Históricas Autorizadas: ${recognizedHistoricalExceptions.length}`);
          console.log(`[Simulação]: A migration '${matched.name}' já consta aplicada no banco.`);
          console.log("\n[STATUS]: NENHUMA ALTERAÇÃO FOI REALIZADA NO BANCO DE DADOS.");
          console.log("================================================================================\n");
        }
        return;
      }
      toExecute = [matched];

      const intermediateExcluded = pending.filter((m) => m.name !== matched.name);
      console.log(`[Modo Seletivo]: Executando exclusivamente a migration '${matched.name}'.`);
      if (intermediateExcluded.length > 0) {
        console.log(
          `[Isolamento]: ${intermediateExcluded.length} migration(s) intermediária(s) ausente(s) no histórico NÃO serão executadas:`
        );
        for (const ie of intermediateExcluded) {
          console.log(`  * Ignorada: ${ie.name}`);
        }
      }
    } else {
      if (pending.length === 0) {
        if (isPreviewMode) {
          console.log("\n================================================================================");
          console.log("TREVO ONE: MIGRADOR — SIMULAÇÃO CONCLUÍDA COM SUCESSO (--preview)");
          console.log("================================================================================");
          console.log(`Banco Alvo Verificado: ${activeDb}`);
          console.log(`Total de Migrations Registradas: ${appliedMap.size}`);
          console.log(`Exceções Históricas Autorizadas: ${recognizedHistoricalExceptions.length}`);
          console.log("Nenhuma migration pendente. O banco de dados já está atualizado.");
          console.log("\n[STATUS]: NENHUMA ALTERAÇÃO FOI REALIZADA NO BANCO DE DADOS.");
          console.log("================================================================================\n");
          return;
        }
        console.log("Nenhuma migration pendente. O banco de dados já está atualizado.");
        return;
      }
      console.log(`Encontrada(s) ${pending.length} migration(s) pendente(s):`);
    }

    // Validações de pré-requisitos estruturais específicos para a migration 077
    if (toExecute.some((m) => m.name.startsWith("077"))) {
      console.log("\n[Pré-requisitos 077]: Validando compatibilidade estrutural...");

      const [colCheck] = await connection.query(
        `SELECT TABLE_NAME, COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND (
             (TABLE_NAME = 'consultancy_plans' AND COLUMN_NAME = 'payment_methods') OR
             (TABLE_NAME = 'student_charges' AND COLUMN_NAME = 'title') OR
             (TABLE_NAME = 'student_plan_subscriptions' AND COLUMN_NAME = 'charge_id')
           );`
      );
      if (colCheck.length < 3) {
        const found = colCheck.map((c) => `${c.TABLE_NAME}.${c.COLUMN_NAME}`).join(", ");
        throw new Error(
          `Pré-requisitos estruturais incompletos para a migration 077. Encontradas apenas: [${found}]. Requeridas: consultancy_plans.payment_methods, student_charges.title, student_plan_subscriptions.charge_id.`
        );
      }

      const [orphanCheck] = await connection.query(
        `SELECT COUNT(*) AS total
         FROM student_plan_subscriptions sps
         LEFT JOIN student_charges sc ON sc.id = sps.charge_id
         WHERE sps.charge_id IS NOT NULL AND sc.id IS NULL;`
      );
      const orphanCount = Number(orphanCheck[0]?.total || 0);
      if (orphanCount > 0) {
        throw new Error(
          `Pré-requisitos estruturais violados: foram encontradas ${orphanCount} assinatura(s) com charge_id órfão. A criação da foreign key falharia.`
        );
      }

      console.log("✓ Pré-requisitos estruturais da migration 077 validados: colunas-base presentes e 0 assinaturas órfãs.");
    }

    // Se estiver em modo de simulação/preview, encerra aqui sem executar DDL nem INSERT
    if (isPreviewMode) {
      console.log("\n================================================================================");
      console.log("TREVO ONE: MIGRADOR — SIMULAÇÃO CONCLUÍDA COM SUCESSO (--preview)");
      console.log("================================================================================");
      console.log(`Banco Alvo Verificado: ${activeDb}`);
      console.log(`Total de Migrations Registradas: ${appliedMap.size}`);
      console.log(`Exceções Históricas Autorizadas: ${recognizedHistoricalExceptions.length}`);
      console.log(`Migration(s) pronta(s) para aplicação (${toExecute.length}):`);
      for (const m of toExecute) {
        console.log(`  -> ${m.name}`);
      }
      console.log("\n[STATUS]: NENHUMA ALTERAÇÃO FOI REALIZADA NO BANCO DE DADOS.");
      console.log("================================================================================\n");
      return;
    }

    for (const m of toExecute) {
      console.log(`- Executando ${m.name}...`);
      await connection.query(m.content);
      await connection.query(
        "INSERT INTO schema_migrations (migration, checksum) VALUES (?, ?);",
        [m.name, m.normalizedChecksum]
      );
      console.log(`- ${m.name} aplicada e registrada com sucesso.`);
    }

    console.log("\nOperação de migration concluída com sucesso.");
  } catch (err) {
    const errCode = err?.code || "ERRO_MIGRATION";
    let errMessage = err?.message || String(err);
    if (process.env.DB_PASSWORD) {
      errMessage = errMessage.replaceAll(process.env.DB_PASSWORD, "********");
    }
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
