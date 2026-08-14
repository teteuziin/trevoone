import mysql from "mysql2/promise";
import crypto from "node:crypto";

const VALID_ROLES = ["STUDENT", "PERSONAL", "NUTRITIONIST", "CONSULTANCY_ADMIN"];
const VALID_TYPES = ["EXTERNAL_FORM"];

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--apply") {
      parsed.apply = true;
    } else if (arg === "--consultancy-slug" && i + 1 < args.length) {
      parsed.consultancySlug = args[++i];
    } else if (arg === "--key" && i + 1 < args.length) {
      parsed.key = args[++i];
    } else if (arg === "--title" && i + 1 < args.length) {
      parsed.title = args[++i];
    } else if (arg === "--type" && i + 1 < args.length) {
      parsed.type = args[++i];
    } else if (arg === "--url" && i + 1 < args.length) {
      parsed.url = args[++i];
    } else if (arg === "--role" && i + 1 < args.length) {
      parsed.role = args[++i];
    } else if (arg === "--sort-order" && i + 1 < args.length) {
      parsed.sortOrder = parseInt(args[++i], 10);
    }
  }
  return parsed;
}

function validateUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return false;
  }
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith("https://")) {
    return false;
  }
  try {
    const u = new URL(trimmed);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  const {
    apply = false,
    consultancySlug,
    key,
    title,
    type = "EXTERNAL_FORM",
    url,
    role = "STUDENT",
    sortOrder = 0,
  } = args;

  if (!consultancySlug || typeof consultancySlug !== "string" || !consultancySlug.trim()) {
    console.error("ERRO: --consultancy-slug é obrigatório.");
    process.exit(1);
  }

  if (!key || typeof key !== "string" || !/^[A-Za-z0-9_-]{2,100}$/.test(key.trim())) {
    console.error("ERRO: --key deve conter entre 2 e 100 caracteres alfanuméricos, hífens ou underscores.");
    process.exit(1);
  }

  if (!title || typeof title !== "string" || !title.trim()) {
    console.error("ERRO: --title é obrigatório.");
    process.exit(1);
  }

  if (!type || !VALID_TYPES.includes(type.trim())) {
    console.error(`ERRO: --type inválido. Tipos suportados: ${VALID_TYPES.join(", ")}`);
    process.exit(1);
  }

  if (!validateUrl(url)) {
    console.error("ERRO: --url deve ser uma URL absoluta válida com protocolo HTTPS.");
    process.exit(1);
  }

  if (!role || !VALID_ROLES.includes(role.trim())) {
    console.error(`ERRO: --role inválido. Roles suportadas: ${VALID_ROLES.join(", ")} (PLATFORM_ADMIN rejeitado).`);
    process.exit(1);
  }

  if (isNaN(sortOrder)) {
    console.error("ERRO: --sort-order deve ser um número inteiro válido.");
    process.exit(1);
  }

  const cleanSlug = consultancySlug.trim();
  const cleanKey = key.trim();
  const cleanTitle = title.trim();
  const cleanType = type.trim();
  const cleanUrl = url.trim();
  const cleanRole = role.trim();

  console.log("=== Configuração de Requisito de Onboarding ===");
  console.log(`Consultoria (slug): ${cleanSlug}`);
  console.log(`Chave do Requisito: ${cleanKey}`);
  console.log(`Título:             ${cleanTitle}`);
  console.log(`Tipo:               ${cleanType}`);
  console.log(`URL:                ${cleanUrl}`);
  console.log(`Aplica-se à Role:   ${cleanRole}`);
  console.log(`Ordem (sort_order): ${sortOrder}`);
  console.log(`Modo:               ${apply ? "APPLY (Write autorizado)" : "SAFE MODE (Leitura/Validação apenas)"}`);

  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

  if (!DB_HOST || !DB_NAME || !DB_USER || DB_PASSWORD === undefined || DB_PASSWORD === "") {
    console.error("ERRO: Variáveis de ambiente do banco de dados não estão configuradas no .env.local.");
    process.exit(1);
  }

  const port = Number(DB_PORT) || 3306;

  let pool = null;
  let connection = null;

  try {
    pool = mysql.createPool({
      host: DB_HOST,
      port,
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASSWORD,
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
    });

    connection = await pool.getConnection();

    // Hard gate DEV
    const [dbRows] = await connection.query("SELECT DATABASE() AS db;");
    const currentDb = dbRows[0]?.db;

    if (apply && currentDb !== "u406031981_trevoone_dev") {
      console.error(`HARD GATE BLOQUEADO: Banco atual é '${currentDb}', esperado 'u406031981_trevoone_dev'.`);
      process.exit(1);
    }

    // 1. Revalidar consultoria ativa
    const [consultancyRows] = await connection.query(
      `SELECT id, name, slug, status
       FROM consultancies
       WHERE slug = ?
         AND status = 'ACTIVE'
         AND deleted_at IS NULL
       LIMIT 1;`,
      [cleanSlug]
    );

    if (!Array.isArray(consultancyRows) || consultancyRows.length === 0) {
      console.error(`ERRO: Consultoria ativa com slug '${cleanSlug}' não foi encontrada.`);
      process.exit(1);
    }

    const consultancy = consultancyRows[0];
    const consultancyId = Number(consultancy.id);

    console.log(`Consultoria ID:     ${consultancyId} (${consultancy.name})`);

    // 2. Verificar se o requirement já existe
    const [existingRows] = await connection.query(
      `SELECT id, public_id, title, requirement_type, external_url, applies_to_role, sort_order, status, deleted_at
       FROM consultancy_onboarding_requirements
       WHERE consultancy_id = ?
         AND requirement_key = ?
       LIMIT 1;`,
      [consultancyId, cleanKey]
    );

    const exists = Array.isArray(existingRows) && existingRows.length > 0;

    if (exists) {
      const existing = existingRows[0];
      const isIdentical =
        existing.title === cleanTitle &&
        existing.requirement_type === cleanType &&
        existing.external_url === cleanUrl &&
        existing.applies_to_role === cleanRole &&
        Number(existing.sort_order) === sortOrder &&
        existing.status === "ACTIVE" &&
        existing.deleted_at === null;

      if (isIdentical) {
        console.log(`\nRequisito '${cleanKey}' já configurado com os mesmos dados na consultoria '${cleanSlug}'. Nenhuma alteração necessária (0 writes).`);
        process.exit(0);
      } else {
        console.error(`\nERRO DE CONFLITO: Requisito '${cleanKey}' já existe na consultoria com valores divergentes.`);
        console.error("Dados existentes:", existing);
        console.error("Dados fornecidos:", { cleanTitle, cleanType, cleanUrl, cleanRole, sortOrder });
        console.error("Nenhuma alteração foi realizada. Para atualizar requisitos, use fluxo administrativo específico.");
        process.exit(1);
      }
    }

    if (!apply) {
      console.log("\n[SAFE MODE] Requisito validado com sucesso. Nenhum write foi executado.");
      console.log("Execute novamente com a flag --apply para persistir no banco de dados.");
      process.exit(0);
    }

    // 3. Execução em transação com lock
    await connection.beginTransaction();

    const publicId = crypto.randomUUID();

    const [insertResult] = await connection.execute(
      `INSERT INTO consultancy_onboarding_requirements (
        public_id,
        consultancy_id,
        requirement_key,
        title,
        requirement_type,
        external_url,
        applies_to_role,
        sort_order,
        status,
        created_at,
        updated_at
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        'ACTIVE',
        UTC_TIMESTAMP(3),
        UTC_TIMESTAMP(3)
      );`,
      [publicId, consultancyId, cleanKey, cleanTitle, cleanType, cleanUrl, cleanRole, sortOrder]
    );

    if (insertResult.affectedRows !== 1) {
      await connection.rollback();
      console.error("ERRO: Falha ao inserir requisito de onboarding.");
      process.exit(1);
    }

    await connection.commit();

    console.log(`\nRequisito '${cleanKey}' configurado com sucesso na consultoria '${cleanSlug}'.`);
    console.log(`Public ID: ${publicId}`);
    console.log("Affected rows: 1");
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    console.error("ERRO AO EXECUTAR SCRIPT:", err?.message || String(err));
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
