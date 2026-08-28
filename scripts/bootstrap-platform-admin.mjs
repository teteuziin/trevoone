import mysql from "mysql2/promise";
import { randomUUID } from "node:crypto";

function parseArgs(args) {
  let email = null;
  let isApply = false;
  let isAllowProduction = false;

  for (const arg of args) {
    if (arg.startsWith("--email=")) {
      if (email !== null) {
        console.error("ERRO: Argumento --email duplicado.");
        process.exit(1);
      }
      email = arg.slice("--email=".length);
    } else if (arg === "--apply") {
      if (isApply) {
        console.error("ERRO: Argumento --apply duplicado.");
        process.exit(1);
      }
      isApply = true;
    } else if (arg === "--allow-production") {
      if (isAllowProduction) {
        console.error("ERRO: Argumento --allow-production duplicado.");
        process.exit(1);
      }
      isAllowProduction = true;
    } else {
      console.error(`ERRO: Argumento desconhecido ou inválido: '${arg}'.`);
      console.error("Uso DEV:  node --env-file=.env.local scripts/bootstrap-platform-admin.mjs --email=<email> [--apply]");
      console.error("Uso PROD: ALLOW_PRODUCTION_PLATFORM_ADMIN_BOOTSTRAP=true node --env-file=<prod.env> scripts/bootstrap-platform-admin.mjs --email=<email> --allow-production [--apply]");
      process.exit(1);
    }
  }

  if (!email || email.trim().length === 0) {
    console.error("ERRO: Parâmetro --email=<email> é obrigatório e não pode ser vazio.");
    console.error("Uso DEV:  node --env-file=.env.local scripts/bootstrap-platform-admin.mjs --email=<email> [--apply]");
    console.error("Uso PROD: ALLOW_PRODUCTION_PLATFORM_ADMIN_BOOTSTRAP=true node --env-file=<prod.env> scripts/bootstrap-platform-admin.mjs --email=<email> --allow-production [--apply]");
    process.exit(1);
  }

  const normalizedEmail = email.trim().normalize("NFC").toLowerCase();

  return {
    email: normalizedEmail,
    isApply,
    isAllowProduction,
  };
}

function validateEnvironment(isAllowProduction) {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, ALLOW_PRODUCTION_PLATFORM_ADMIN_BOOTSTRAP } = process.env;

  if (!DB_HOST || !DB_NAME || !DB_USER || DB_PASSWORD === undefined || DB_PASSWORD === "") {
    console.error("ERRO: Variáveis de ambiente de banco de dados não configuradas corretamente.");
    process.exit(1);
  }

  const isExactDev =
    DB_HOST === "srv1595.hstgr.io" &&
    DB_NAME === "u406031981_trevoone_dev" &&
    DB_USER === "u406031981_trevodev";

  const isExactProd =
    DB_HOST === "srv1595.hstgr.io" &&
    DB_NAME === "u406031981_trevoone" &&
    DB_USER === "u406031981_trevoadmin";

  const isProdEnvOptIn = ALLOW_PRODUCTION_PLATFORM_ADMIN_BOOTSTRAP === "true";

  if (isExactDev) {
    if (isAllowProduction || ALLOW_PRODUCTION_PLATFORM_ADMIN_BOOTSTRAP !== undefined) {
      console.error("ERRO: Autorizações de produção (--allow-production / ALLOW_PRODUCTION_PLATFORM_ADMIN_BOOTSTRAP) não devem ser fornecidas no ambiente DEV.");
      process.exit(1);
    }
    const port = Number(DB_PORT);
    const validatedPort = !isNaN(port) && port > 0 ? port : 3306;
    return {
      host: DB_HOST,
      port: validatedPort,
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASSWORD,
      environment: "DEVELOPMENT",
    };
  }

  if (isExactProd) {
    if (!isProdEnvOptIn || !isAllowProduction) {
      console.error("PRODUÇÃO DETECTADA — EXECUÇÃO ABORTADA.");
      console.error("Para executar o bootstrap em produção é obrigatório fornecer simultaneamente:");
      console.error("1. Variável de ambiente ALLOW_PRODUCTION_PLATFORM_ADMIN_BOOTSTRAP=true");
      console.error("2. Flag CLI --allow-production");
      process.exit(1);
    }
    const port = Number(DB_PORT);
    const validatedPort = !isNaN(port) && port > 0 ? port : 3306;
    return {
      host: DB_HOST,
      port: validatedPort,
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASSWORD,
      environment: "PRODUCTION",
    };
  }

  console.error("ERRO: Configuração de banco de dados não autorizada para bootstrap de platform admin.");
  process.exit(1);
}

async function main() {
  const { email, isApply, isAllowProduction } = parseArgs(process.argv.slice(2));
  const dbConfig = validateEnvironment(isAllowProduction);

  let connection = null;
  let lockAcquired = false;

  try {
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      multipleStatements: false,
    });

    await connection.query("SET SESSION time_zone = '+00:00';");

    const [dbRes] = await connection.query("SELECT DATABASE() AS database_name;");
    const currentDb = dbRes[0]?.database_name;

    if (currentDb !== dbConfig.database) {
      console.error(`ERRO: Conexão aberta com banco inesperado ('${currentDb}'). Abortando.`);
      process.exit(1);
    }

    const [migrationRows] = await connection.query(
      "SELECT migration FROM schema_migrations WHERE migration = '003_administration_foundation.sql';"
    );
    if (!Array.isArray(migrationRows) || migrationRows.length !== 1) {
      console.error("ERRO: Migration 003_administration_foundation.sql não encontrada em schema_migrations.");
      process.exit(1);
    }

    const [tableRows] = await connection.query(
      "SELECT table_name FROM information_schema.TABLES WHERE table_schema = ? AND table_name IN ('platform_admins', 'audit_events');",
      [currentDb]
    );
    const existingTableNames = new Set(
      Array.isArray(tableRows) ? tableRows.map((t) => t.TABLE_NAME || t.table_name) : []
    );
    if (!existingTableNames.has("platform_admins") || !existingTableNames.has("audit_events")) {
      console.error("ERRO: Tabelas platform_admins e/ou audit_events não encontradas no schema.");
      process.exit(1);
    }

    const [userRows] = await connection.query(
      "SELECT id, public_id, full_name, email, status, deleted_at FROM users WHERE email = ?;",
      [email]
    );

    if (!Array.isArray(userRows) || userRows.length === 0) {
      console.error(`ERRO: Conta candidata '${email}' não encontrada em ${dbConfig.environment}.`);
      process.exit(1);
    }

    const candidateUser = userRows[0];

    if (candidateUser.deleted_at !== null || candidateUser.status !== "ACTIVE") {
      console.error(
        `ERRO: Conta candidata não está elegível (status='${candidateUser.status}', deleted_at='${candidateUser.deleted_at}').`
      );
      process.exit(1);
    }

    const [adminRows] = await connection.query("SELECT COUNT(*) AS total FROM platform_admins;");
    const adminCount = Number(adminRows[0]?.total || 0);

    const [auditRows] = await connection.query("SELECT COUNT(*) AS total FROM audit_events;");
    const auditCount = Number(auditRows[0]?.total || 0);

    if (adminCount > 0) {
      console.error(`ERRO: Já existe(m) ${adminCount} platform_admin(s) registrado(s). Este script executa somente o primeiro bootstrap histórico.`);
      process.exit(1);
    }

    if (!isApply) {
      console.log("=== MODO DE INSPEÇÃO (DRY-RUN) ===");
      console.log(`Ambiente: ${dbConfig.environment}`);
      console.log(`Banco: ${currentDb}`);
      console.log("Migration 003: presente");
      console.log("Usuário encontrado: sim");
      console.log(`Nome: ${candidateUser.full_name}`);
      console.log(`Email: ${candidateUser.email}`);
      console.log(`Status: ${candidateUser.status}`);
      console.log(`deleted_at: ${candidateUser.deleted_at === null ? "NULL" : candidateUser.deleted_at}`);
      console.log(`platform_admins: ${adminCount}`);
      console.log(`audit_events: ${auditCount}`);
      console.log("Bootstrap permitido: sim");
      console.log("Escrita executada: NÃO");
      console.log("\nPara aplicar as alterações, execute o comando com a flag --apply.");
      return;
    }

    const [lockRes] = await connection.query(
      "SELECT GET_LOCK('trevo_one_platform_admin_bootstrap', 10) AS lock_acquired;"
    );
    if (!lockRes || lockRes[0]?.lock_acquired !== 1) {
      console.error("ERRO: Não foi possível adquirir o lock para execução do bootstrap.");
      process.exit(1);
    }
    lockAcquired = true;

    const [recheckDb] = await connection.query("SELECT DATABASE() AS database_name;");
    if (recheckDb[0]?.database_name !== dbConfig.database) {
      console.error("ERRO: Falha na revalidação do banco antes da escrita. Abortando.");
      process.exit(1);
    }

    const [recheckAdmin] = await connection.query("SELECT COUNT(*) AS total FROM platform_admins;");
    if (Number(recheckAdmin[0]?.total || 0) > 0) {
      console.error("ERRO: platform_admins não está mais vazio. Abortando.");
      process.exit(1);
    }

    const [recheckUser] = await connection.query(
      "SELECT id, public_id, full_name, email, status, deleted_at FROM users WHERE email = ?;",
      [email]
    );
    if (
      !Array.isArray(recheckUser) ||
      recheckUser.length === 0 ||
      recheckUser[0].status !== "ACTIVE" ||
      recheckUser[0].deleted_at !== null
    ) {
      console.error("ERRO: Falha na revalidação do usuário antes da escrita. Abortando.");
      process.exit(1);
    }

    const targetUser = recheckUser[0];
    const auditEventPublicId = randomUUID();

    await connection.beginTransaction();

    try {
      const [insertAdminRes] = await connection.query(
        "INSERT INTO platform_admins (user_id, status, granted_by_user_id) VALUES (?, 'ACTIVE', NULL);",
        [targetUser.id]
      );

      if (insertAdminRes.affectedRows !== 1) {
        throw new Error(`Falha ao inserir platform_admin (affectedRows=${insertAdminRes.affectedRows}).`);
      }

      const [insertAuditRes] = await connection.query(
        "INSERT INTO audit_events (public_id, actor_user_id, consultancy_id, action, target_type, target_public_id, metadata_json) VALUES (?, NULL, NULL, 'PLATFORM_ADMIN_BOOTSTRAPPED', 'USER', ?, NULL);",
        [auditEventPublicId, targetUser.public_id]
      );

      if (insertAuditRes.affectedRows !== 1) {
        throw new Error(`Falha ao inserir audit_event (affectedRows=${insertAuditRes.affectedRows}).`);
      }

      await connection.commit();
    } catch (txErr) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error("ERRO no rollback da transação:", rollbackErr.message);
      }
      throw txErr;
    }

    console.log("=== BOOTSTRAP CONCLUÍDO COM SUCESSO ===");
    console.log(`Ambiente: ${dbConfig.environment}`);
    console.log(`Banco: ${currentDb}`);
    console.log(`Conta promovida: ${targetUser.email}`);
    console.log("Platform Admin status: ACTIVE");
    console.log("Audit Event registrado: PLATFORM_ADMIN_BOOTSTRAPPED");
    console.log("Escrita executada: SIM (transação confirmada)");
  } catch (err) {
    const errCode = err?.code || "ERRO_BOOTSTRAP";
    const errMessage = err?.message || String(err);
    console.error(`FALHA NA EXECUÇÃO DO BOOTSTRAP\nCódigo: ${errCode}\nMensagem: ${errMessage}`);
    process.exit(1);
  } finally {
    if (connection) {
      if (lockAcquired) {
        try {
          await connection.query("SELECT RELEASE_LOCK('trevo_one_platform_admin_bootstrap');");
        } catch {}
      }
      try {
        await connection.end();
      } catch {}
    }
  }
}

main();
