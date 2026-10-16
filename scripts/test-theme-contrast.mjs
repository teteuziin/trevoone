import fs from "fs";
import path from "path";

console.log("================================================================================");
console.log("TREVO ONE — REPRODUCIBLE THEME CONTRAST & WCAG RATIO VERIFIER");
console.log("================================================================================");

function luminance(r, g, b) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function blend(fgHex, bgHex, alpha) {
  const [r1, g1, b1] = hexToRgb(fgHex);
  const [r2, g2, b2] = hexToRgb(bgHex);
  return [
    Math.round(r1 * alpha + r2 * (1 - alpha)),
    Math.round(g1 * alpha + g2 * (1 - alpha)),
    Math.round(b1 * alpha + b2 * (1 - alpha)),
  ];
}

function contrastRgb(rgb1, rgb2) {
  const l1 = luminance(...rgb1);
  const l2 = luminance(...rgb2);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return Math.round(ratio * 100) / 100;
}

function contrast(hex1, hex2) {
  return contrastRgb(hexToRgb(hex1), hexToRgb(hex2));
}

let passed = 0;
let failed = 0;

function assertRatio(name, ratio, minExpected, level) {
  const isPass = ratio >= minExpected;
  const status = isPass ? "[PASS]" : "[FAIL]";
  console.log(`${status} ${name}: ${ratio.toFixed(2)}:1 (Min: ${minExpected}:1, Level: ${level})`);
  if (isPass) {
    passed++;
  } else {
    failed++;
  }
}

// Surfaces in Light Mode
const bgGeneral = "#DDE1E6"; // Base geral
const bgNav = "#ECEFF2";     // Barras de navegação / laterais
const bgWhite = "#FFFFFF";   // Inputs / botões ativos
const bgBubbleNav = blend("#10B981", bgNav, 0.15); // Bubble ativo na bottom nav
const bgTabBadge = blend("#10B981", bgWhite, 0.15); // Badge da aba ativa

// Surfaces in Dark Mode / Cards
const bgDarkGeneral = "#202226";
const bgDarkNav = "#111215";
const bgCardBlack = "#151619";
const bgHeaderBlack = "#0B0C0E";

console.log("\n--- 1. CONTRASTE DE TEXTO ESCURO NO MODO CLARO ---");
const cTitleGeneral = contrast("#17191D", bgGeneral);
assertRatio("Título #17191D sobre fundo geral #DDE1E6", cTitleGeneral, 7.0, "AAA");

const cTextSecGeneral = contrast("#4B5563", bgGeneral);
assertRatio("Texto secundário #4B5563 sobre fundo geral #DDE1E6", cTextSecGeneral, 4.5, "AA");

const cTitleNav = contrast("#17191D", bgNav);
assertRatio("Título #17191D sobre barra #ECEFF2", cTitleNav, 7.0, "AAA");

const cTextSecNav = contrast("#4B5563", bgNav);
assertRatio("Texto secundário #4B5563 sobre barra #ECEFF2", cTextSecNav, 4.5, "AA");

console.log("\n--- 2. CONTRASTE DE TEXTO VERDE NO MODO CLARO (#065F46) ---");
const cGreenGeneral = contrast("#065F46", bgGeneral);
assertRatio("Link 'Ver todas' #065F46 sobre fundo geral #DDE1E6", cGreenGeneral, 4.5, "AA");

const cGreenNav = contrast("#065F46", bgNav);
assertRatio("Texto ativo #065F46 sobre barra #ECEFF2", cGreenNav, 4.5, "AA");

const cGreenBubble = contrastRgb(hexToRgb("#065F46"), bgBubbleNav);
assertRatio("Ícone/texto #065F46 sobre bubble 15% #10B981 em #ECEFF2", cGreenBubble, 4.5, "AA");

const cGreenWhite = contrast("#065F46", bgWhite);
assertRatio("Controle ativo #065F46 sobre fundo branco #FFFFFF", cGreenWhite, 7.0, "AAA");

const cGreenTabBadge = contrastRgb(hexToRgb("#065F46"), bgTabBadge);
assertRatio("Contador de aba #065F46 sobre badge 15% #10B981 em #FFFFFF", cGreenTabBadge, 4.5, "AA");

console.log("\n--- 3. CONTRASTE DENTRO DOS CARDS E NO MODO ESCURO (#10B981) ---");
const cGreenInCard = contrast("#10B981", bgCardBlack);
assertRatio("Destaque #10B981 dentro de card preto #151619", cGreenInCard, 7.0, "AAA");

const cWhiteInCard = contrast("#FFFFFF", bgCardBlack);
assertRatio("Texto branco #FFFFFF dentro de card preto #151619", cWhiteInCard, 7.0, "AAA");

const cGreenInHeader = contrast("#10B981", bgHeaderBlack);
assertRatio("Destaque #10B981 dentro do cabeçalho preto #0B0C0E", cGreenInHeader, 7.0, "AAA");

console.log("\n================================================================================");
console.log(`TOTAL RATIOS AUDITED: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
