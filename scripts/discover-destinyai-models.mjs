/**
 * TREVO ONE — DESTINY AI MODEL DISCOVERY CLI
 * 
 * Lists all models available directly from the Destiny AI endpoint.
 * Zero invented model names.
 */

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

register(pathToFileURL(path.resolve("scripts/ts-loader.mjs")).href, import.meta.url);

const { listDestinyAiModels, isDestinyAiConfigured, getDestinyAiBaseUrl } = await import(
  pathToFileURL(path.resolve("lib/ai/destiny-ai-client.ts")).href
);

async function main() {
  console.log("==================================================");
  console.log("TREVO ONE — DESTINY AI MODEL DISCOVERY");
  console.log("==================================================");
  console.log(`Endpoint Base URL: ${getDestinyAiBaseUrl()}`);

  if (!isDestinyAiConfigured()) {
    console.error("\x1b[31mERRO:\x1b[0m DESTINYAI_API_KEY não encontrada no ambiente (.env.local).");
    console.error("Defina DESTINYAI_API_KEY no arquivo .env.local para listar os modelos.");
    process.exit(1);
  }

  try {
    console.log("Consultando endpoint /v1/models...");
    const models = await listDestinyAiModels();
    console.log(`\nModelos disponíveis na Destiny AI (${models.length}):\n`);
    for (const m of models) {
      console.log(`  • ID: \x1b[36m${m.id}\x1b[0m`);
      if (m.owned_by) console.log(`    Proprietário: ${m.owned_by}`);
      if (m.created) console.log(`    Criado em: ${new Date(m.created * 1000).toLocaleString("pt-BR")}`);
    }
    console.log("\nPara fixar um modelo específico, defina no .env.local ou na Hostinger:");
    console.log(`DESTINYAI_MODEL=${models[0]?.id || "id_do_modelo"}`);
  } catch (err) {
    console.error("\x1b[31mFalha na consulta de modelos:\x1b[0m", err.message);
    process.exit(1);
  }
}

main();
