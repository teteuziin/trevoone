import fs from "node:fs";
import { spawn } from "node:child_process";

const envVars = { ...process.env };
if (fs.existsSync(".env.local")) {
  fs.readFileSync(".env.local", "utf8").split("\n").forEach((l) => {
    const trimmed = l.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx > 0) {
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!envVars[k]) envVars[k] = v;
    }
  });
}

const child = spawn(
  process.execPath,
  ["./node_modules/next/dist/bin/next", "dev", "-p", "3000"],
  {
    env: {
      ...envVars,
      DB_HOST: "127.0.0.1",
      DB_PORT: "3306",
      DB_NAME: "trevo_one_qa",
      DB_USER: "trevo_qa",
      DB_PASSWORD: "trevo_one_qa_pass",
      TREVO_QA_ENV: "test",
      ASAAS_ENVIRONMENT: "sandbox",
    },
    stdio: "inherit",
  }
);

child.on("exit", (code) => {
  process.exit(code || 0);
});
