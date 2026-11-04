import fs from "node:fs";
import path from "node:path";

function getAsaasConfig() {
  const envToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  let apiKey = process.env.ASAAS_API_KEY?.trim() || "";
  let webhookToken = envToken || "";

  if (!apiKey || !webhookToken) {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (key === "ASAAS_API_KEY" && !apiKey) apiKey = val;
          if (key === "ASAAS_WEBHOOK_TOKEN" && !webhookToken) webhookToken = val;
        }
      }
    }
  }

  return {
    apiKey,
    webhookToken,
    baseUrl: "https://sandbox.asaas.com/api/v3",
  };
}

const action = process.argv[2] || "list";
const config = getAsaasConfig();

async function run() {
  if (action === "list") {
    const res = await fetch(`${config.baseUrl}/webhooks`, {
      headers: { access_token: config.apiKey },
    });
    const data = await res.json();
    console.log("List status:", res.status);
    console.log(JSON.stringify(data, null, 2));
  } else if (action === "register") {
    const webhookUrl = process.argv[3];
    if (!webhookUrl) {
      console.error("Missing webhookUrl argument");
      process.exit(1);
    }
    const body = {
      name: "Trevo One QA Ngrok Webhook",
      url: webhookUrl,
      email: "financeiro@salyashape.test",
      enabled: true,
      interrupted: false,
      apiVersion: 3,
      authToken: config.webhookToken,
      sendType: "SEQUENTIALLY",
      events: ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_REFUNDED"],
    };
    const res = await fetch(`${config.baseUrl}/webhooks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: config.apiKey,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log("Register status:", res.status);
    console.log(JSON.stringify(data, null, 2));
  } else if (action === "delete") {
    const webhookId = process.argv[3];
    if (!webhookId) {
      console.error("Missing webhookId argument");
      process.exit(1);
    }
    const res = await fetch(`${config.baseUrl}/webhooks/${webhookId}`, {
      method: "DELETE",
      headers: { access_token: config.apiKey },
    });
    const data = await res.json();
    console.log("Delete status:", res.status);
    console.log(JSON.stringify(data, null, 2));
  }
}

run().catch(console.error);
