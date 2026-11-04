import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ARTIFACT_DIR = "C:\\Users\\User\\.gemini\\antigravity\\brain\\bda29c4f-b0d7-4433-9298-37b93b4df5ec";
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const pixData = JSON.parse(fs.readFileSync("tmp-pix-data.json", "utf8"));

function renderPaymentPage(mode = "pix-pending") {
  const isPaid = mode === "paid";
  const isBoleto = mode === "boleto-pending";
  const isPix = mode === "pix-pending";

  const title = isBoleto
    ? "Mensalidade Saiya Shape - Boleto Bancário"
    : isPaid
    ? "Mensalidade Saiya Shape - Confirmada"
    : "Mensalidade Saiya Shape - Plano Premium";

  const description = isBoleto
    ? "Boleto bancário emitido via Asaas com compensação automática"
    : isPaid
    ? "Mensalidade quitada via Pix automático. Acesso aos treinos e consultas liberado."
    : "Acompanhamento nutricional personalizado e periodização de treinos";

  const badgeConfig = isPaid
    ? {
        label: "Pago",
        classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        svg: `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`,
      }
    : {
        label: "Pendente",
        classes: "bg-zinc-800 text-zinc-300 border-zinc-700",
        svg: `<svg class="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
      };

  return `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Trevo One - Pagamento do Aluno</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b0c0e; margin: 0; padding: 0; color: #f1f5f9; }
  </style>
</head>
<body class="bg-[#0b0c0e] antialiased select-none min-h-screen">

  <!-- TOP APP BAR -->
  <header class="border-b border-[#252830] bg-[#121316] sticky top-0 z-30 px-4 py-3">
    <div class="max-w-4xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-sm">
          ☘
        </div>
        <div>
          <span class="text-xs font-bold text-white block leading-tight">Trevo One</span>
          <span class="text-[10px] text-zinc-400 block leading-tight">Saiya Shape Consultoria</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-zinc-400 hidden sm:inline">Aluno:</span>
        <span class="text-xs font-bold text-white bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-700">Goku Aluno QA</span>
      </div>
    </div>
  </header>

  <!-- MAIN CONTAINER -->
  <main class="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-20">

    <!-- A. CABEÇALHO DO ALUNO -->
    <div class="p-4 sm:p-5 rounded-2xl bg-[#151619] border border-[#303238] shadow-sm text-white">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="w-2 h-2 rounded-full bg-[#10B981] shrink-0"></span>
            <span class="text-[11px] sm:text-xs text-[#8E95A2] font-semibold tracking-wide uppercase">
              Acompanhamento do Aluno · Saiya Shape
            </span>
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${badgeConfig.classes}">
              ${badgeConfig.svg}
              <span>${badgeConfig.label}</span>
            </span>
          </div>

          <div class="flex items-baseline gap-3 flex-wrap">
            <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">
              ${title}
            </h1>
          </div>
        </div>

        <div>
          <a href="#" class="px-4 py-2 rounded-xl font-semibold text-xs bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] text-[#E5E7EB] flex items-center gap-2 transition-colors">
            <span>←</span>
            <span>Voltar para pagamentos</span>
          </a>
        </div>
      </div>
    </div>

    <!-- B. CARD DE RESUMO DA COBRANÇA -->
    <div class="bg-[#151619] border border-[#303238] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#303238] pb-4">
        <div class="space-y-1">
          <span class="text-[11px] font-semibold text-[#8E95A2] uppercase tracking-wider block">
            Valor Total da Cobrança
          </span>
          <p class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight tabular-nums">
            R$&nbsp;149,90
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${badgeConfig.classes}">
            ${badgeConfig.svg}
            <span>${badgeConfig.label}</span>
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div class="p-3.5 rounded-xl bg-[#1B1D21] border border-[#303238] space-y-1">
          <span class="text-[11px] font-semibold text-[#8E95A2] uppercase tracking-wider block">
            Data de Vencimento
          </span>
          <strong class="text-sm font-bold text-white block">
            ${isBoleto ? "28/11/2026" : "25/11/2026"}
          </strong>
        </div>

        <div class="p-3.5 rounded-xl bg-[#1B1D21] border border-[#303238] space-y-1">
          <span class="text-[11px] font-semibold text-[#8E95A2] uppercase tracking-wider block">
            Período de Competência
          </span>
          <strong class="text-sm font-bold text-white block">
            Mensalidade Atual
          </strong>
        </div>
      </div>

      <div class="pt-2 border-t border-[#303238]">
        <span class="text-xs font-semibold text-white block mb-1">
          Observações da Consultoria:
        </span>
        <p class="text-xs text-zinc-300 leading-relaxed bg-[#1B1D21] p-3.5 rounded-xl border border-[#303238]">
          ${description}
        </p>
      </div>
    </div>

    <!-- C. ESTADO: PAGO -->
    ${isPaid ? `
    <div class="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 space-y-1">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <strong class="text-sm font-bold text-white">Pagamento Confirmado</strong>
      </div>
      <p class="text-xs text-emerald-300 pl-7">
        Esta cobrança foi quitada com sucesso. Seu acesso aos treinos e acompanhamento da consultoria está totalmente liberado.
      </p>
      <p class="text-[11px] text-emerald-400/80 pl-7 font-medium">
        Confirmado via compensação automática Asaas em 03/11/2026 às 22:23.
      </p>
    </div>

    <div class="bg-[#151619] border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div>
          <h3 class="text-base font-bold text-white">Pagamento Confirmado via Asaas</h3>
          <p class="text-xs text-[#8E95A2]">
            Compensação automática realizada com sucesso. Seus acessos aos treinos e consultas estão liberados.
          </p>
        </div>
      </div>
    </div>
    ` : `
    <!-- D. CARD DE PAGAMENTO DIGITAL INTEGRADO ASAAS -->
    <div class="bg-[#151619] border border-[#303238] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <!-- Top Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#303238] pb-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Cobrança Digital Integrada · Saiya Shape
            </span>
          </div>
          <h2 class="text-lg font-bold text-white">
            ${isBoleto ? "Pague via Boleto ou Fatura Digital" : "Pague via Pix ou Checkout Asaas"}
          </h2>
          <p class="text-xs text-[#8E95A2]">
            Valor: <strong class="text-white font-semibold">R$&nbsp;149,90</strong> · Vencimento: <strong class="text-white font-semibold">${isBoleto ? "28/11/2026" : "25/11/2026"}</strong>
          </p>
        </div>

        <span class="self-start sm:self-auto px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
          Baixa Automática
        </span>
      </div>

      <!-- Reassurance Notice -->
      <div class="flex items-start gap-3 p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-xs text-emerald-300">
        <svg class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="leading-relaxed">
          <strong>Não é necessário enviar comprovante!</strong> Assim que o pagamento for realizado no seu banco ou aplicativo, o Asaas avisa nosso sistema e seu acesso é liberado instantaneamente.
        </p>
      </div>

      ${isPix ? `
      <!-- QR CODE PIX REAL DO ASAAS -->
      <div class="flex flex-col items-center justify-center p-6 bg-[#1B1D21] rounded-2xl border border-[#303238] space-y-3">
        <div class="bg-white p-3 rounded-2xl shadow-sm border border-zinc-200">
          <img
            src="data:image/png;base64,${pixData.encodedImage}"
            alt="QR Code Pix Asaas Oficial"
            class="w-48 h-48 object-contain"
          />
        </div>
        <p class="text-xs text-[#8E95A2] text-center max-w-xs">
          Abra o aplicativo do seu banco, escolha <strong>Pix</strong> e aponte a câmera para o QR Code acima.
        </p>
      </div>

      <!-- PIX COPIA E COLA -->
      <div class="space-y-2 bg-[#1B1D21] p-4 rounded-xl border border-[#303238]">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-[#8E95A2]">
            Código Pix Copia e Cola
          </span>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="p-2.5 bg-[#151619] rounded-lg border border-[#303238] font-mono text-[11px] text-[#E5E7EB] select-all break-all flex-1 max-h-24 overflow-y-auto leading-relaxed">
            ${pixData.payload}
          </div>
          <button
            type="button"
            class="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
            <span>Copiar código Pix</span>
          </button>
        </div>
      </div>
      ` : `
      <!-- BOLETO / LINK DO ASAAS -->
      <div class="p-4 bg-[#1B1D21] rounded-xl border border-[#303238] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="space-y-0.5">
          <span class="text-xs font-bold text-white block">Linha Digitável / Boleto Bancário</span>
          <span class="text-[11px] text-[#8E95A2] block">Acesse a fatura oficial hospedada para imprimir ou copiar a linha digitável</span>
        </div>
        <a
          href="${pixData.invoiceUrl}"
          target="_blank"
          class="px-4 py-2.5 rounded-xl font-bold text-xs bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 flex items-center justify-center gap-1.5 shrink-0"
        >
          <span>Visualizar Boleto</span>
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
        </a>
      </div>
      `}

      <!-- BOTÃO DE CHECKOUT COMPLETO ASAAS -->
      <div class="pt-2">
        <a
          href="${pixData.invoiceUrl}"
          target="_blank"
          class="w-full min-h-[50px] px-6 py-3 rounded-xl font-bold text-sm bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer border border-emerald-600"
        >
          <span>Pagar com Asaas (Fatura / Pix / Cartão)</span>
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
        <p class="text-[11px] text-[#8E95A2] text-center mt-2">
          Ambiente seguro gerenciado oficialmente pelo gateway Asaas.
        </p>
      </div>
    </div>
    `}

  </main>
</body>
</html>`;
}

const tmpHtmlPix = path.join(process.cwd(), "tmp-preview-pix.html");
const tmpHtmlBoleto = path.join(process.cwd(), "tmp-preview-boleto.html");
const tmpHtmlPaid = path.join(process.cwd(), "tmp-preview-paid.html");

fs.writeFileSync(tmpHtmlPix, renderPaymentPage("pix-pending"), "utf8");
fs.writeFileSync(tmpHtmlBoleto, renderPaymentPage("boleto-pending"), "utf8");
fs.writeFileSync(tmpHtmlPaid, renderPaymentPage("paid"), "utf8");

const captures = [
  {
    htmlFile: tmpHtmlPix,
    outName: "student-charge-pix-pending-mobile.png",
    viewport: "--window-size=375,1350",
  },
  {
    htmlFile: tmpHtmlPix,
    outName: "student-charge-pix-pending-desktop.png",
    viewport: "--window-size=1280,1150",
  },
  {
    htmlFile: tmpHtmlBoleto,
    outName: "student-charge-boleto-pending-mobile.png",
    viewport: "--window-size=375,1000",
  },
  {
    htmlFile: tmpHtmlPaid,
    outName: "student-charge-paid-mobile.png",
    viewport: "--window-size=375,900",
  },
  {
    htmlFile: tmpHtmlPaid,
    outName: "student-charge-paid-desktop.png",
    viewport: "--window-size=1280,850",
  },
];

for (const cap of captures) {
  const outPath = path.join(ARTIFACT_DIR, cap.outName);
  const fileUrl = `file:///${cap.htmlFile.replace(/\\/g, "/")}`;
  const cmd = `"${edgePath}" --headless=old --disable-gpu --no-first-run ${cap.viewport} --screenshot="${outPath}" "${fileUrl}"`;
  console.log(`Renderizando: ${cap.outName}...`);
  try {
    execSync(cmd, { stdio: "ignore" });
    const stat = fs.statSync(outPath);
    console.log(`✅ Salvo: ${cap.outName} (${stat.size} bytes)`);
  } catch (err) {
    console.error(`Erro ao capturar ${cap.outName}:`, err);
  }
}

// Limpeza de arquivos temporários
fs.rmSync(tmpHtmlPix, { force: true });
fs.rmSync(tmpHtmlBoleto, { force: true });
fs.rmSync(tmpHtmlPaid, { force: true });

console.log("\nTodos os screenshots da Etapa 2 foram gerados com sucesso!");
