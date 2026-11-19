import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function runBackup() {
  const envPath = "/home/u406031981/domains/trevoone.com/hbuilds/config/.env";
  const envContent = await fs.readFile(envPath, "utf-8");
  const env = {};
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      let val = trimmed.substring(eqIdx + 1).trim();
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.slice(1, -1);
      }
      env[trimmed.substring(0, eqIdx).trim()] = val;
    }
  }

  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = env;
  if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
    throw new Error("Variáveis do banco ausentes no .env");
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T.]/g, "").slice(0, 14);
  const backupDir = "/home/u406031981/backups/trevoone";
  await fs.mkdir(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `backup_prod_${DB_NAME}_${timestamp}_pre_migration_077.sql`);

  const tempCnf = path.join("/home/u406031981/preview_migration_077", `.temp_dump_${Date.now()}.cnf`);
  const cnfContent = `[client]\nhost=${DB_HOST}\nport=${DB_PORT || 3306}\nuser=${DB_USER}\npassword="${DB_PASSWORD.replace(/"/g, '\\"')}"\n`;

  await fs.writeFile(tempCnf, cnfContent, { mode: 0o600 });

  try {
    console.log(`[Backup]: Iniciando dump completo de '${DB_NAME}' (estrutura, dados, rotinas, triggers)...`);
    const args = [
      `--defaults-extra-file=${tempCnf}`,
      "--single-transaction",
      "--quick",
      "--routines",
      "--triggers",
      "--default-character-set=utf8mb4",
      DB_NAME,
      `--result-file=${backupFile}`
    ];
    await execFileAsync("mysqldump", args);

    const stats = await fs.stat(backupFile);
    console.log(`[Backup Concluído]: ${backupFile}`);
    console.log(`Tamanho: ${(stats.size / (1024 * 1024)).toFixed(2)} MB (${stats.size} bytes)`);

    // Validação de integridade do arquivo gerado
    const sample = await fs.readFile(backupFile, "utf-8", { encoding: "utf-8", flag: "r" });
    const hasCreateTable = sample.includes("CREATE TABLE");
    const hasInsertInto = sample.includes("INSERT INTO");
    const hasSchemaMigrations = sample.includes("schema_migrations");
    const hasEndDump = sample.includes("Dump completed on");

    if (!hasCreateTable || !hasInsertInto || !hasSchemaMigrations || !hasEndDump) {
      throw new Error("Verificação de integridade do backup falhou: marcadores essenciais ausentes no dump.");
    }
    console.log("✓ Integridade do backup confirmada (CREATE TABLE, INSERT INTO, schema_migrations e Dump completed).");
    console.log(`BACKUP_PATH: ${backupFile}`);
  } finally {
    try {
      await fs.unlink(tempCnf);
    } catch {}
  }
}

runBackup().catch((err) => {
  console.error("ERRO NO BACKUP:", err.message);
  process.exit(1);
});
