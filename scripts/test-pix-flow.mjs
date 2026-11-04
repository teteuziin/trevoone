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

const config = getAsaasConfig();

async function run() {
  console.log("=== TESTANDO CRIAÇÃO DE COBRANÇA PIX NO ASAAS SANDBOX ===");

  // 1. Obter cliente com CPF
  const custRes = await fetch(`${config.baseUrl}/customers?email=goku.qa@saiyashape.test`, {
    headers: { access_token: config.apiKey },
  });
  const custData = await custRes.json();
  const customerId = custData.data?.[0]?.id;
  console.log("Cliente:", customerId);

  // 2. Criar cobrança PIX
  const payRes = await fetch(`${config.baseUrl}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: config.apiKey,
    },
    body: JSON.stringify({
      customer: customerId,
      billingType: "PIX",
      value: 125.50,
      dueDate: "2026-11-20",
      description: "Mensalidade Pix Saiya Shape Teste",
      externalReference: "pix-test-" + Date.now(),
    }),
  });
  const payData = await payRes.json();
  console.log("Criação PIX - status:", payRes.status);
  console.log("Criação PIX - billingType:", payData.billingType, "id:", payData.id, "status:", payData.status);

  if (!payData.id) {
    console.error("Erro na criação:", payData);
    process.exit(1);
  }

  const paymentId = payData.id;

  // 3. Obter QR Code Pix (GET /v3/payments/{id}/pixQrCode)
  console.log("\n=== OBTENDO QR CODE PIX (GET /v3/payments/{id}/pixQrCode) ===");
  const qrRes = await fetch(`${config.baseUrl}/payments/${paymentId}/pixQrCode`, {
    headers: { access_token: config.apiKey },
  });
  const qrData = await qrRes.json();
  console.log("QR Code status:", qrRes.status);
  console.log("encodedImage presente?:", Boolean(qrData.encodedImage), "tamanho base64:", qrData.encodedImage?.length);
  console.log("payload presente?:", Boolean(qrData.payload), "primeiros 30 chars payload:", qrData.payload?.slice(0, 30));
  console.log("expirationDate:", qrData.expirationDate);

  // 4. Testar simulação de pagamento Pix
  console.log("\n=== TESTANDO SIMULAÇÃO DE CONFIRMAÇÃO DO PIX ===");
  // Testar se POST /sandbox/payment/{id}/confirm funciona para Pix
  const simRes = await fetch(`${config.baseUrl}/sandbox/payment/${paymentId}/confirm`, {
    method: "POST",
    headers: { access_token: config.apiKey },
  });
  const simData = await simRes.json();
  console.log("Simulador /sandbox/payment/{id}/confirm - status:", simRes.status);
  console.log("Simulador response - status:", simData.status, "billingType:", simData.billingType);

  // 5. Testar se existe outro endpoint específico no sandbox (ex: /sandbox/payment/{id}/payWithPix ou similar)
  console.log("\nDados completos da confirmação:", JSON.stringify(simData, null, 2));
}

run().catch(console.error);
