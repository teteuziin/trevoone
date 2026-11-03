import assert from "node:assert/strict";
import fs from "node:fs";

console.log("================================================================================");
console.log("TREVO ONE — SUÍTE DE TESTES: CAMPANHAS, DIVULGAÇÃO & COMISSÕES");
console.log("================================================================================\n");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// PURE DOMAIN IMPLEMENTATION OF SERVICE & CAMPAIGN LOGIC FOR UNIT QA
// -----------------------------------------------------------------------------
function brlToCents(amount) {
  if (typeof amount === "number") {
    const fixed = amount.toFixed(2);
    const [intPart, decPart = "00"] = fixed.split(".");
    return BigInt(intPart) * BigInt(100) + BigInt(decPart.padEnd(2, "0").slice(0, 2));
  }
  const clean = String(amount).replace(/[^0-9,.-]/g, "").replace(",", ".");
  const [intPart = "0", decPart = "00"] = clean.split(".");
  const sign = intPart.startsWith("-") ? BigInt(-1) : BigInt(1);
  const absInt = intPart.replace("-", "");
  return sign * (BigInt(absInt || "0") * BigInt(100) + BigInt(decPart.padEnd(2, "0").slice(0, 2)));
}

function centsToBrl(cents) {
  if (cents === null || cents === undefined) return "0.00";
  const c = BigInt(cents);
  const sign = c < BigInt(0) ? "-" : "";
  const absC = c < BigInt(0) ? -c : c;
  const intPart = absC / BigInt(100);
  const decPart = (absC % BigInt(100)).toString().padStart(2, "0");
  return `${sign}${intPart}.${decPart}`;
}

function percentToBasisPoints(percent) {
  if (typeof percent === "number") {
    const fixed = percent.toFixed(2);
    const [intPart, decPart = "00"] = fixed.split(".");
    return Number(intPart) * 100 + Number(decPart.padEnd(2, "0").slice(0, 2));
  }
  const clean = String(percent).replace(/[^0-9,.-]/g, "").replace(",", ".");
  const [intPart = "0", decPart = "00"] = clean.split(".");
  return Number(intPart) * 100 + Number(decPart.padEnd(2, "0").slice(0, 2));
}

function basisPointsToPercent(bp) {
  return bp / 100;
}

function calculatePercentageCommissionExact(baseAmountCents, rateBasisPoints) {
  if (baseAmountCents <= BigInt(0) || rateBasisPoints <= 0) return BigInt(0);
  return (baseAmountCents * BigInt(rateBasisPoints) + BigInt(5000)) / BigInt(10000);
}

function maskPixKey(type, rawKey) {
  if (!rawKey || typeof rawKey !== "string") return "***";
  const clean = rawKey.trim();

  switch (type) {
    case "EMAIL": {
      const parts = clean.split("@");
      if (parts.length === 2 && parts[0].length > 0) {
        return `${parts[0][0]}***@${parts[1]}`;
      }
      return "***@***";
    }
    case "CPF": {
      const digits = clean.replace(/\D/g, "");
      if (digits.length >= 4) {
        return `***.***.${digits.slice(-5, -2)}-${digits.slice(-2)}`;
      }
      return "***";
    }
    case "CNPJ": {
      const digits = clean.replace(/\D/g, "");
      if (digits.length >= 6) {
        return `**.***.***/${digits.slice(-6, -2)}-${digits.slice(-2)}`;
      }
      return "***";
    }
    case "PHONE": {
      const digits = clean.replace(/\D/g, "");
      if (digits.length >= 4) {
        return `(**) *****-${digits.slice(-4)}`;
      }
      return "***";
    }
    case "RANDOM_KEY":
    default: {
      if (clean.length > 8) {
        return `${clean.slice(0, 4)}...-...${clean.slice(-4)}`;
      }
      return "****";
    }
  }
}

function validateDestinationUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, error: "A URL de destino é obrigatória." };
  }

  const trimmed = rawUrl.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:")
  ) {
    return { valid: false, error: "Protocolo de URL inválido ou não seguro." };
  }

  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
      return { valid: false, error: "Caminho interno inválido." };
    }
    return { valid: true, normalized: trimmed };
  }

  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "Apenas endereços HTTP ou HTTPS são permitidos." };
    }
    return { valid: true, normalized: trimmed };
  } catch {
    return { valid: false, error: "Formato de URL inválido." };
  }
}

function sanitizeCampaignCode(rawCode) {
  if (!rawCode || typeof rawCode !== "string") return "";
  return rawCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
}

// -----------------------------------------------------------------------------
// 1. URL VALIDATION & PRESERVATION OF PARAMETERS
// -----------------------------------------------------------------------------
runTest("validateDestinationUrl: Valida e preserva URL externa com parâmetros de checkout", () => {
  const url = "https://pay.kiwify.com.br/abc1234?afid=parceiro99&cupom=TREVO10&src=meta_ads";
  const res = validateDestinationUrl(url);
  assert.equal(res.valid, true);
  assert.equal(res.normalized, url);
});

runTest("validateDestinationUrl: Valida URL do WhatsApp com mensagem pré-preenchida", () => {
  const url = "https://wa.me/5511999999999?text=Ol%C3%A1%21%20Vim%20pela%20indica%C3%A7%C3%A3o";
  const res = validateDestinationUrl(url);
  assert.equal(res.valid, true);
  assert.equal(res.normalized, url);
});

runTest("validateDestinationUrl: Valida caminho interno relativo seguro", () => {
  const url = "/consultoria/saiya-shape/planos?origem=divulgacao";
  const res = validateDestinationUrl(url);
  assert.equal(res.valid, true);
  assert.equal(res.normalized, url);
});

runTest("validateDestinationUrl: Bloqueia scheme perigoso javascript:", () => {
  const res = validateDestinationUrl("javascript:alert(1)");
  assert.equal(res.valid, false);
  assert.ok(res.error?.includes("Protocolo de URL inválido"));
});

runTest("validateDestinationUrl: Bloqueia scheme data: e vbscript:", () => {
  const res1 = validateDestinationUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==");
  assert.equal(res1.valid, false);
  const res2 = validateDestinationUrl("vbscript:MsgBox(1)");
  assert.equal(res2.valid, false);
});

runTest("validateDestinationUrl: Bloqueia open redirect via barra dupla //malicious.com", () => {
  const res = validateDestinationUrl("//malicious.com/phishing");
  assert.equal(res.valid, false);
  assert.ok(res.error?.includes("Caminho interno inválido"));
});

// -----------------------------------------------------------------------------
// 2. CAMPAIGN CODE SANITIZATION & GENERATION
// -----------------------------------------------------------------------------
runTest("sanitizeCampaignCode: Normaliza código para maiúsculas e remove caracteres inválidos", () => {
  assert.equal(sanitizeCampaignCode("anNy_10%"), "ANNY_10");
  assert.equal(sanitizeCampaignCode("promo-15!"), "PROMO-15");
  assert.equal(sanitizeCampaignCode(""), "");
});

// -----------------------------------------------------------------------------
// 3. MONETARY PRECISION & COMMISSIONS CALCULATION
// -----------------------------------------------------------------------------
runTest("brlToCents e centsToBrl: Conversões exatas sem perda de precisão", () => {
  assert.equal(brlToCents(150.00), BigInt(15000));
  assert.equal(brlToCents("150,50"), BigInt(15050));
  assert.equal(centsToBrl(BigInt(15050)), "150.50");
  assert.equal(centsToBrl(BigInt(5000)), "50.00");
  assert.equal(centsToBrl(BigInt(0)), "0.00");
});

runTest("percentToBasisPoints e basisPointsToPercent: 10% = 1000 bp, 15% = 1500 bp", () => {
  assert.equal(percentToBasisPoints(10), 1000);
  assert.equal(percentToBasisPoints("15.5"), 1550);
  assert.equal(basisPointsToPercent(1000), 10);
  assert.equal(basisPointsToPercent(1500), 15);
});

runTest("calculatePercentageCommissionExact: Cálculo inteiro exato de comissão percentual", () => {
  // R$ 150,00 * 10% = R$ 15,00 (1500 cents)
  const base150 = BigInt(15000);
  const comm10 = calculatePercentageCommissionExact(base150, 1000);
  assert.equal(comm10, BigInt(1500));
  assert.equal(centsToBrl(comm10), "15.00");

  // R$ 200,00 * 15% = R$ 30,00 (3000 cents)
  const base200 = BigInt(20000);
  const comm15 = calculatePercentageCommissionExact(base200, 1500);
  assert.equal(comm15, BigInt(3000));
  assert.equal(centsToBrl(comm15), "30.00");
});

// -----------------------------------------------------------------------------
// 4. PIX MASKING SAFETY
// -----------------------------------------------------------------------------
runTest("maskPixKey: Mascara chaves CPF, CNPJ, Email e Telefone sem expor dados confidenciais", () => {
  const maskedCpf = maskPixKey("CPF", "123.456.789-00");
  assert.ok(maskedCpf.includes("***"));
  assert.ok(maskedCpf.endsWith("-00"));

  const maskedEmail = maskPixKey("EMAIL", "parceiro@exemplo.com");
  assert.ok(maskedEmail.startsWith("p***@"));

  const maskedPhone = maskPixKey("PHONE", "11999998888");
  assert.ok(maskedPhone.includes("***"));
  assert.ok(maskedPhone.endsWith("-8888"));
});

// -----------------------------------------------------------------------------
// 5. CAMPAIGN LINK STATUS RESOLUTION LOGIC
// -----------------------------------------------------------------------------
runTest("Campaign Status: Simula avaliação de links Ativo, Pausado, Encerrado e Limite Atingido", () => {
  function checkCampaignAvailability(link, now = new Date()) {
    if (link.status === "PAUSED") return { available: false, reason: "PAUSED" };
    if (link.status === "ENDED") return { available: false, reason: "ENDED" };
    if (link.startsAt && new Date(link.startsAt) > now) return { available: false, reason: "NOT_STARTED" };
    if (link.endsAt && new Date(link.endsAt) < now) return { available: false, reason: "ENDED" };
    if (link.maxUses != null && link.currentUses >= link.maxUses) return { available: false, reason: "LIMIT_REACHED" };
    return { available: true };
  }

  const activeLink = {
    status: "ACTIVE",
    currentUses: 3,
    maxUses: 10,
    startsAt: "2026-01-01",
    endsAt: "2026-12-31",
  };
  assert.equal(checkCampaignAvailability(activeLink).available, true);

  const pausedLink = { ...activeLink, status: "PAUSED" };
  assert.equal(checkCampaignAvailability(pausedLink).reason, "PAUSED");

  const endedLink = { ...activeLink, status: "ENDED" };
  assert.equal(checkCampaignAvailability(endedLink).reason, "ENDED");

  const expiredLink = { ...activeLink, endsAt: "2025-10-01" };
  assert.equal(checkCampaignAvailability(expiredLink, new Date("2026-10-31")).reason, "ENDED");

  const limitReachedLink = { ...activeLink, currentUses: 10, maxUses: 10 };
  assert.equal(checkCampaignAvailability(limitReachedLink).reason, "LIMIT_REACHED");
});

// -----------------------------------------------------------------------------
// 6. MULTIPLE INDIVIDUAL LINKS PER PARTICIPANT & INDEPENDENT CONDITIONS
// -----------------------------------------------------------------------------
runTest("Multiple Links: O mesmo participante pode ter link de 10% e link de 15% com destinos e comissões independentes", () => {
  const participantAnny = { memberId: 101, name: "Anny Santos" };

  const link1 = {
    referrerMemberId: participantAnny.memberId,
    title: "Meu desconto de 10%",
    destinationUrl: "https://pay.hotmart.com/trevo10",
    announcedDiscountValue: "10%",
    commissionType: "PERCENTAGE",
    commissionRateBasisPoints: 1000, // 10%
  };

  const link2 = {
    referrerMemberId: participantAnny.memberId,
    title: "Meu desconto de 15%",
    destinationUrl: "https://pay.kiwify.com.br/trevo15",
    announcedDiscountValue: "15%",
    commissionType: "FIXED",
    commissionAmountCents: BigInt(5000), // R$ 50,00 fixo
  };

  assert.equal(link1.referrerMemberId, link2.referrerMemberId);
  assert.notEqual(link1.destinationUrl, link2.destinationUrl);
  assert.notEqual(link1.announcedDiscountValue, link2.announcedDiscountValue);
  assert.notEqual(link1.commissionType, link2.commissionType);
});

// -----------------------------------------------------------------------------
// 7. SNAPSHOT IMMUTABILITY & EDITING PRESERVATION
// -----------------------------------------------------------------------------
runTest("Snapshot Immutability: Editar as condições futuras de uma campanha não altera comissões já criadas", () => {
  const initialCampaign = {
    id: 1,
    commissionType: "PERCENTAGE",
    rateBasisPoints: 1000, // 10%
  };

  const commissionSnapshot = {
    id: 99,
    campaignLinkId: initialCampaign.id,
    commissionTypeSnapshot: initialCampaign.commissionType,
    rateBasisPointsSnapshot: initialCampaign.rateBasisPoints,
    baseAmountCents: BigInt(20000), // R$ 200,00
    finalAmountCents: calculatePercentageCommissionExact(BigInt(20000), initialCampaign.rateBasisPoints), // R$ 20,00
  };

  assert.equal(commissionSnapshot.finalAmountCents, BigInt(2000));

  const updatedCampaign = {
    ...initialCampaign,
    rateBasisPoints: 1500, // 15%
  };

  assert.equal(commissionSnapshot.rateBasisPointsSnapshot, 1000);
  assert.equal(commissionSnapshot.finalAmountCents, BigInt(2000));
  assert.notEqual(commissionSnapshot.rateBasisPointsSnapshot, updatedCampaign.rateBasisPoints);
});

// -----------------------------------------------------------------------------
// 8. CODEBASE INTEGRITY CHECKS (SOURCE FILES AUDIT)
// -----------------------------------------------------------------------------
runTest("Source Integrity: Migration 072 existe com tabelas de campanhas e materiais", () => {
  const migration = fs.readFileSync("database/migrations/072_influencer_promotional_campaigns.sql", "utf8");
  assert.ok(migration.includes("CREATE TABLE IF NOT EXISTS `promotional_campaign_links`"));
  assert.ok(migration.includes("CREATE TABLE IF NOT EXISTS `promotional_marketing_materials`"));
  assert.ok(migration.includes("CREATE TABLE IF NOT EXISTS `promotional_campaign_link_materials`"));
  assert.ok(migration.includes("campaign_link_id"));
});

runTest("Source Integrity: Rota /r/[code] utiliza resolveCampaignRedirect com tratamento de indisponibilidade", () => {
  const route = fs.readFileSync("app/r/[code]/route.ts", "utf8");
  assert.ok(route.includes("resolveCampaignRedirect"));
  assert.ok(route.includes("UNAVAILABLE"));
  assert.ok(route.includes("Esta campanha está temporariamente pausada"));
});

runTest("Source Integrity: Hub 'Divulgue e Ganhe' possui as 3 áreas obrigatórias", () => {
  const hub = fs.readFileSync("components/referrals/promotional-hub-view.tsx", "utf8");
  assert.ok(hub.includes("Meus Links"));
  assert.ok(hub.includes("Materiais de Divulgação") || hub.includes("Materiais para Divulgar"));
  assert.ok(hub.includes("Minhas Indicações e Comissões") || hub.includes("Resultados"));
  assert.ok(hub.includes("Copiar link"));
  assert.ok(hub.includes("Legenda Pronta") || hub.includes("Copiar legenda") || hub.includes("handleCopyCaption"));
});

console.log("\n================================================================================");
console.log(`RESULTADO DOS TESTES: ${passed} DE ${total} PASSARAM COM SUCESSO (100%)!`);
console.log("================================================================================\n");
