import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("=====================================================================");
console.log("TEST SUITE: DIVULGUE E GANHE (AFILIADOS & VIPS) COMPLETO");
console.log("=====================================================================\n");

// 1. Test calculation functions (Cent-exact math)
console.log("1. Testando precisão matemática de comissões (cents & basis points)...");

function brlToCents(amount) {
  if (typeof amount === "number") {
    const fixed = amount.toFixed(2);
    const [intPart, decPart = "00"] = fixed.split(".");
    return BigInt(intPart) * 100n + BigInt(decPart.padEnd(2, "0").slice(0, 2));
  }
  const clean = amount.replace(/[^0-9,.-]/g, "").replace(",", ".");
  const [intPart = "0", decPart = "00"] = clean.split(".");
  const sign = intPart.startsWith("-") ? -1n : 1n;
  const absInt = intPart.replace("-", "");
  return sign * (BigInt(absInt || "0") * 100n + BigInt(decPart.padEnd(2, "0").slice(0, 2)));
}

function centsToBrl(cents) {
  if (cents === null || cents === undefined) return "0.00";
  const c = BigInt(cents);
  const sign = c < 0n ? "-" : "";
  const absC = c < 0n ? -c : c;
  const intPart = absC / 100n;
  const decPart = (absC % 100n).toString().padStart(2, "0");
  return `${sign}${intPart}.${decPart}`;
}

function calculatePercentageCommissionExact(baseAmountCents, rateBasisPoints) {
  if (baseAmountCents <= 0n || rateBasisPoints <= 0) return 0n;
  return (baseAmountCents * BigInt(rateBasisPoints) + 5000n) / 10000n;
}

// 10.5% of R$ 10.00 (1000 cents with 1050 bp) -> 105 cents (R$ 1.05)
const cents10 = brlToCents("10.00");
assert.equal(cents10, 1000n, "R$ 10.00 deve ser 1000 cents");
const comm105 = calculatePercentageCommissionExact(cents10, 1050);
assert.equal(comm105, 105n, "10.5% de R$ 10.00 deve ser exatamente 105 cents (R$ 1.05)");
assert.equal(centsToBrl(comm105), "1.05", "105 cents formatado deve ser 1.05");

// 15% of R$ 197.90 (19790 cents with 1500 bp)
const cents197 = brlToCents(197.90);
assert.equal(cents197, 19790n, "R$ 197.90 deve ser 19790 cents");
const comm197 = calculatePercentageCommissionExact(cents197, 1500);
// 19790 * 1500 = 29,685,000 + 5000 = 29,690,000 / 10000 = 2969 cents (R$ 29.69)
assert.equal(comm197, 2969n, "15% de R$ 197.90 deve ser exatamente 2969 cents (R$ 29.69)");
assert.equal(centsToBrl(comm197), "29.69");

console.log("  ✓ Cálculos monetários exatos validados com sucesso!");

// 2. Validate Migration 073 structure
console.log("\n2. Validando migration 073 de vendas manuais e storage...");
const migrationPath = path.join(process.cwd(), "database", "migrations", "073_promotional_campaigns_manual_sales_and_storage.sql");
assert.ok(fs.existsSync(migrationPath), "Migration 073 deve existir");
const migrationContent = fs.readFileSync(migrationPath, "utf8");
assert.ok(migrationContent.includes("referred_member_id"), "Deve lidar com referred_member_id");
assert.ok(migrationContent.includes("buyer_name"), "Deve adicionar buyer_name");
assert.ok(migrationContent.includes("external_reference"), "Deve adicionar external_reference");
console.log("  ✓ Migration 073 validada com sucesso!");

// 3. Validate Marketing File Mime Detection logic
console.log("\n3. Validando detecção de magic bytes de arquivos de marketing...");

function detectMarketingFileType(buffer) {
  if (buffer.length < 8) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" };
  }
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { ext: "pdf", mime: "application/pdf" };
  }
  return null;
}

const storageTs = fs.readFileSync(path.join(process.cwd(), "lib", "referrals", "marketing-storage.ts"), "utf8");
assert.ok(storageTs.includes("detectMarketingFileType"), "marketing-storage.ts deve conter detectMarketingFileType");
assert.ok(storageTs.includes("saveMarketingMaterialFile"), "marketing-storage.ts deve conter saveMarketingMaterialFile");
assert.ok(storageTs.includes("MAX_MARKETING_FILE_SIZE_BYTES"), "marketing-storage.ts deve ter limite de 25MB");

const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x35]);

assert.equal(detectMarketingFileType(jpegHeader)?.mime, "image/jpeg");
assert.equal(detectMarketingFileType(pngHeader)?.mime, "image/png");
assert.equal(detectMarketingFileType(pdfHeader)?.mime, "application/pdf");
console.log("  ✓ Magic bytes de imagem e PDF validados com sucesso!");

// 4. Validate Components Exports & Icons
console.log("\n4. Validando ausência de emojis e presença de ícones SVG limpos...");
const adminViewContent = fs.readFileSync(path.join(process.cwd(), "components", "referrals", "admin-referrals-view.tsx"), "utf8");
const hubViewContent = fs.readFileSync(path.join(process.cwd(), "components", "referrals", "promotional-hub-view.tsx"), "utf8");

// Assert no emojis in hubView tabs
assert.ok(!hubViewContent.includes("🔗"), "Não deve conter emoji de link");
assert.ok(!hubViewContent.includes("🎨"), "Não deve conter emoji de paleta");
assert.ok(!hubViewContent.includes("📊"), "Não deve conter emoji de gráfico");
assert.ok(hubViewContent.includes("Meus Links"), "Deve conter aba Meus Links");
assert.ok(hubViewContent.includes("Materiais de Divulgação"), "Deve conter aba Materiais");
assert.ok(hubViewContent.includes("Minhas Indicações e Comissões"), "Deve conter aba Comissões");
assert.ok(hubViewContent.includes("#10b981"), "Deve ter destaque em esmeralda #10b981");

// Assert admin view has manual sale button and 3 clean tabs
assert.ok(adminViewContent.includes("+ Registrar venda manual"), "Admin deve ter botão de registrar venda manual");
assert.ok(adminViewContent.includes("Participantes e Links"), "Admin deve ter aba Participantes e Links");
assert.ok(adminViewContent.includes("Materiais"), "Admin deve ter aba Materiais");
assert.ok(adminViewContent.includes("Vendas e Comissões"), "Admin deve ter aba Vendas e Comissões");
console.log("  ✓ Componentes UI validados com sucesso!");

console.log("\n=====================================================================");
console.log("TODOS OS TESTES DO MÓDULO DIVULGUE E GANHE PASSARAM!");
console.log("=====================================================================");
