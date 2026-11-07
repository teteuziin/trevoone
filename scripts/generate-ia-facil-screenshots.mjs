import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

const ARTIFACT_DIR = "C:\\Users\\User\\.gemini\\antigravity\\brain\\bda29c4f-b0d7-4433-9298-37b93b4df5ec";

function getHtml(view = "step1") {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>trevoone - Criar treino com IA</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #F5F5F0; margin: 0; padding: 0; }
  </style>
</head>
<body class="bg-[#F5F5F0] text-[#102E23] antialiased flex items-center justify-center min-h-screen p-0 sm:p-4">

  <!-- MODAL CONTAINER (All Light theme, ivory/white, emerald accents) -->
  <div class="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-xl lg:max-w-2xl bg-[#F5F5F0] rounded-none sm:rounded-3xl border sm:border-[#E5E8E2] flex flex-col shadow-2xl overflow-hidden">
    
    <!-- HEADER -->
    <div class="px-5 sm:px-6 py-3.5 border-b border-[#E5E8E2] flex items-center justify-between shrink-0 bg-white">
      <div class="flex items-center gap-3 min-w-0 pr-3">
        <div class="w-9 h-9 rounded-2xl bg-[#176B49]/10 text-[#176B49] flex items-center justify-center shrink-0 border border-[#176B49]/20 font-bold">
          ⚡
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-bold text-[#102E23] leading-tight">
            ${view === "preview" ? "Revisar proposta de treino" : "Criar treino com IA"}
          </h2>
          <p class="text-xs text-[#526058] mt-0.5">
            ${view === "preview" ? "Confira as divisões e exercícios antes de abrir no editor" : "Vamos preparar seu treino juntos."}
          </p>
        </div>
      </div>
      <div class="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[#526058] hover:bg-[#E5E8E2]/60 flex items-center justify-center cursor-pointer">
        ✕
      </div>
    </div>

    <!-- BODY -->
    <div class="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
      
      <!-- COTA DISCRETA -->
      <div class="p-2.5 px-3.5 rounded-2xl bg-white border border-[#E5E8E2] text-xs flex items-center justify-between shadow-2xs">
        <span class="text-[#526058] flex items-center gap-1.5 font-medium">
          <span>✨</span>
          <span>IA Trevo One</span>
        </span>
        <span class="font-bold text-[#176B49]">
          18 criações disponíveis hoje
        </span>
      </div>

      ${view === "step1" ? `
      <!-- TELA 1: SOMENTE 3 DECISÕES -->

      <!-- 1. PARA QUEM É O TREUNO? -->
      <div class="bg-white border border-[#E5E8E2] rounded-2xl p-4 space-y-2 shadow-2xs">
        <label class="block text-xs font-bold text-[#102E23] uppercase tracking-wider">
          1. Para quem é o treino?
        </label>
        
        <div class="flex items-center gap-3 p-3 rounded-xl bg-[#F5F5F0] border border-[#E5E8E2]">
          <div class="w-8 h-8 rounded-full bg-[#176B49] text-white font-bold flex items-center justify-center text-xs shrink-0">
            J
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold text-[#102E23] truncate">João da Silva</p>
            <p class="text-[11px] text-[#526058] truncate">joao.silva@email.com</p>
          </div>
          <span class="text-[11px] font-semibold text-[#176B49] bg-[#176B49]/10 px-2 py-0.5 rounded-md shrink-0">
            Aluno selecionado
          </span>
        </div>

        <div class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 flex items-center gap-2">
          <span>📋</span>
          <span class="text-[11px] text-emerald-800">Aproveitando histórico: Ganhar massa · 4 dias/sem</span>
        </div>
      </div>

      <!-- 2. QUAL É O OBJETIVO? -->
      <div class="bg-white border border-[#E5E8E2] rounded-2xl p-4 space-y-2.5 shadow-2xs">
        <label class="block text-xs font-bold text-[#102E23] uppercase tracking-wider">
          2. Qual é o objetivo?
        </label>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div class="p-3 rounded-xl border bg-[#176B49] text-white border-[#176B49] shadow-xs text-center font-bold text-xs sm:text-sm cursor-pointer">
            Ganhar massa
          </div>
          <div class="p-3 rounded-xl border bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] text-center font-bold text-xs sm:text-sm hover:border-[#176B49] cursor-pointer">
            Perder gordura
          </div>
          <div class="p-3 rounded-xl border bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] text-center font-bold text-xs sm:text-sm hover:border-[#176B49] cursor-pointer">
            Ganhar força
          </div>
          <div class="p-3 rounded-xl border bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] text-center font-bold text-xs sm:text-sm hover:border-[#176B49] cursor-pointer">
            Condicionamento
          </div>
          <div class="p-3 rounded-xl border bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] text-center font-bold text-xs sm:text-sm hover:border-[#176B49] cursor-pointer col-span-2 sm:col-span-2">
            Outro objetivo
          </div>
        </div>
      </div>

      <!-- 3. QUANTOS DIAS POR SEMANA? -->
      <div class="bg-white border border-[#E5E8E2] rounded-2xl p-4 space-y-2.5 shadow-2xs">
        <label class="block text-xs font-bold text-[#102E23] uppercase tracking-wider">
          3. Quantos dias por semana?
        </label>

        <div class="grid grid-cols-5 gap-2">
          <div class="py-2.5 rounded-xl border text-center font-bold text-xs sm:text-sm bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] cursor-pointer">2</div>
          <div class="py-2.5 rounded-xl border text-center font-bold text-xs sm:text-sm bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] cursor-pointer">3</div>
          <div class="py-2.5 rounded-xl border text-center font-bold text-xs sm:text-sm bg-[#176B49] text-white border-[#176B49] shadow-xs cursor-pointer">4</div>
          <div class="py-2.5 rounded-xl border text-center font-bold text-xs sm:text-sm bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] cursor-pointer">5</div>
          <div class="py-2.5 rounded-xl border text-center font-bold text-xs sm:text-sm bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] cursor-pointer">Outro</div>
        </div>
      </div>

      <!-- BOTÃO TELA 1 -->
      <div class="pt-2 flex items-center justify-between gap-3 border-t border-[#E5E8E2]">
        <button class="px-4 py-2.5 min-h-[44px] rounded-2xl text-xs font-semibold text-[#526058] hover:bg-[#E5E8E2]/60 transition">
          Cancelar
        </button>
        <button class="px-6 py-2.5 min-h-[46px] rounded-2xl text-xs sm:text-sm font-bold text-white bg-[#176B49] hover:bg-[#12583B] transition shadow-sm flex items-center gap-1.5 cursor-pointer">
          <span>Continuar</span>
          <span>→</span>
        </button>
      </div>
      ` : view === "step2" ? `
      <!-- TELA 2: O QUE FALTA -->

      <!-- BADGE RESUMO ESCOLHAS ANTERIORES -->
      <div class="p-3 rounded-2xl bg-white border border-[#E5E8E2] flex items-center justify-between text-xs shadow-2xs">
        <div class="flex items-center gap-2">
          <span class="w-5 h-5 rounded-full bg-[#176B49] text-white text-[10px] font-bold flex items-center justify-center">✓</span>
          <span class="font-bold text-[#102E23]">João da Silva</span>
          <span class="text-[#526058]">·</span>
          <span class="text-[#102E23] font-semibold">Ganhar massa</span>
          <span class="text-[#526058]">·</span>
          <span class="text-[#102E23] font-semibold">4 dias/sem</span>
        </div>
        <span class="text-[11px] font-bold text-[#176B49] hover:underline cursor-pointer">Editar</span>
      </div>

      <div class="bg-white border border-[#E5E8E2] rounded-2xl p-4 space-y-4 shadow-2xs">
        <span class="block text-xs font-bold text-[#102E23] uppercase tracking-wider">
          O que falta para montar o treino?
        </span>

        <!-- EQUIPAMENTOS -->
        <div class="space-y-1.5">
          <label class="block text-[11px] font-bold text-[#526058] uppercase tracking-wider">Onde vai treinar?</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div class="p-2.5 rounded-xl border bg-[#176B49] text-white border-[#176B49] text-xs font-bold text-center cursor-pointer">
              Academia completa
            </div>
            <div class="p-2.5 rounded-xl border bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] text-xs font-bold text-center cursor-pointer">
              Em casa / Halteres
            </div>
          </div>
        </div>

        <!-- DURAÇÃO -->
        <div class="space-y-1.5">
          <label class="block text-[11px] font-bold text-[#526058] uppercase tracking-wider">Duração média por treino</label>
          <div class="grid grid-cols-3 gap-2">
            <div class="p-2 rounded-xl border bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] text-xs font-bold text-center cursor-pointer">
              Até 30 min
            </div>
            <div class="p-2 rounded-xl border bg-[#176B49] text-white border-[#176B49] text-xs font-bold text-center cursor-pointer">
              45 a 60 min
            </div>
            <div class="p-2 rounded-xl border bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] text-xs font-bold text-center cursor-pointer">
              +60 min
            </div>
          </div>
        </div>

        <!-- NÍVEL -->
        <div class="space-y-1.5">
          <label class="block text-[11px] font-bold text-[#526058] uppercase tracking-wider">Nível de experiência</label>
          <div class="grid grid-cols-3 gap-2">
            <div class="p-2 rounded-xl border bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] text-xs font-bold text-center cursor-pointer">
              Iniciante
            </div>
            <div class="p-2 rounded-xl border bg-[#176B49] text-white border-[#176B49] text-xs font-bold text-center cursor-pointer">
              Intermediário
            </div>
            <div class="p-2 rounded-xl border bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] text-xs font-bold text-center cursor-pointer">
              Avançado
            </div>
          </div>
        </div>

        <!-- RESTRIÇÕES -->
        <div class="space-y-1.5">
          <label class="block text-[11px] font-bold text-[#526058] uppercase tracking-wider">Possui restrições físicas ou dores?</label>
          <div class="grid grid-cols-2 gap-2">
            <div class="p-2 rounded-xl border bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] text-xs font-bold text-center cursor-pointer">
              Não possui
            </div>
            <div class="p-2 rounded-xl border bg-[#176B49] text-white border-[#176B49] text-xs font-bold text-center cursor-pointer">
              Sim, possui
            </div>
          </div>
          <div class="pt-1">
            <div class="w-full rounded-xl bg-[#F5F5F0] border border-[#E5E8E2] px-3.5 py-2 text-xs text-[#102E23]">
              Dor leve no ombro esquerdo em rotação externa
            </div>
          </div>
        </div>

        <!-- ACCORDION PERSONALIZAR MAIS -->
        <div class="p-3 rounded-xl bg-[#FAFBF9] border border-[#E5E8E2] text-xs flex items-center justify-between text-[#526058] font-semibold cursor-pointer">
          <span>+ Personalizar mais (opcional)</span>
          <span>▾</span>
        </div>
      </div>

      <!-- BOTÕES TELA 2 -->
      <div class="pt-2 flex items-center justify-between gap-3 border-t border-[#E5E8E2]">
        <button class="px-4 py-2.5 min-h-[44px] rounded-2xl text-xs font-semibold text-[#526058] hover:bg-[#E5E8E2]/60 transition">
          ← Voltar
        </button>
        <button class="px-6 py-2.5 min-h-[46px] rounded-2xl text-xs sm:text-sm font-bold text-white bg-[#176B49] hover:bg-[#12583B] transition shadow-sm flex items-center gap-2 cursor-pointer">
          <span>⚡</span>
          <span>Gerar treino com IA</span>
        </button>
      </div>
      ` : `
      <!-- TELA 3: PROPOSTA PRONTA PARA REVISÃO -->
      <div class="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 flex items-center gap-2">
        <span class="font-bold">✓ Proposta pronta para revisão!</span>
        <span class="text-emerald-800">Esta ficha será salva estritamente como Rascunho para você revisar no editor.</span>
      </div>

      <!-- DIVISÃO A -->
      <div class="border border-[#E5E8E2] rounded-2xl p-4 bg-white space-y-3 shadow-2xs">
        <div class="flex items-center justify-between text-xs font-bold text-[#102E23] uppercase tracking-wider pb-1.5 border-b border-[#E5E8E2]">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-md bg-[#176B49]/10 text-[#176B49] text-[11px] font-bold">Divisão A</span>
            <span class="text-[#102E23] text-xs">Peito e Tríceps</span>
          </div>
          <span class="text-[11px] text-[#526058] font-mono">5 exercícios</span>
        </div>

        <div class="space-y-2">
          <div class="bg-white border border-[#E5E8E2] rounded-xl p-2.5 text-xs flex justify-between items-center shadow-2xs">
            <div>
              <p class="font-semibold text-[#102E23]">Supino reto com barra</p>
              <p class="text-[11px] text-[#526058] font-mono">4 séries × 8–10 reps · Descanso: 90s</p>
            </div>
            <span class="text-[10px] font-semibold text-[#176B49] bg-[#176B49]/10 px-2 py-0.5 rounded-md border border-[#176B49]/20">✓ Na biblioteca</span>
          </div>

          <!-- BI-SET -->
          <div class="bg-[#176B49]/[0.04] border border-[#176B49]/20 rounded-xl p-3 space-y-2">
            <div class="flex items-center justify-between text-xs pb-1 border-b border-[#176B49]/15">
              <span class="font-bold text-[#176B49]">⚡ Bi-set (2 exercícios)</span>
              <span class="text-[11px] text-[#526058] font-mono">3 rodadas · 60s descanso final</span>
            </div>
            <div class="space-y-1.5 pl-1">
              <div class="bg-white border border-[#E5E8E2] rounded-lg p-2 text-xs flex items-center justify-between">
                <span>Crucifixo máquina</span>
                <span class="font-mono text-[#526058]">3 × 10–12 reps</span>
              </div>
              <div class="bg-white border border-[#E5E8E2] rounded-lg p-2 text-xs flex items-center justify-between">
                <span>Tríceps corda na polia</span>
                <span class="font-mono text-[#526058]">3 × 12 reps</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DIVISÃO B -->
      <div class="border border-[#E5E8E2] rounded-2xl p-4 bg-white space-y-2 shadow-2xs">
        <div class="flex items-center justify-between text-xs font-bold text-[#102E23] uppercase tracking-wider pb-1.5 border-b border-[#E5E8E2]">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-md bg-[#176B49]/10 text-[#176B49] text-[11px] font-bold">Divisão B</span>
            <span class="text-[#102E23] text-xs">Costas e Bíceps</span>
          </div>
          <span class="text-[11px] text-[#526058] font-mono">5 exercícios</span>
        </div>
        <p class="text-xs text-[#526058]">Puxada frontal, Remada curvada, Remada baixa, Rosca direta e Rosca martelo.</p>
      </div>

      <!-- BOTÕES PREVIEW -->
      <div class="pt-2 flex items-center justify-between gap-3 border-t border-[#E5E8E2]">
        <button class="px-4 py-2.5 min-h-[44px] rounded-2xl text-xs font-semibold text-[#526058] hover:bg-[#E5E8E2]/60 transition">
          ← Ajustar opções
        </button>
        <button class="px-5 py-2.5 min-h-[46px] rounded-2xl text-xs sm:text-sm font-bold text-white bg-[#176B49] hover:bg-[#12583B] transition shadow-sm flex items-center gap-2 cursor-pointer">
          <span>Salvar rascunho e abrir no editor</span>
        </button>
      </div>
      `}

    </div>
  </div>

</body>
</html>`;
}

async function run() {
  const browserPath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

  const targets = [
    // Step 1: 3 decisions across all required viewports
    { view: "step1", filename: "ia-facil-modal-mobile-320px.png", w: 320, h: 600 },
    { view: "step1", filename: "ia-facil-modal-mobile-360px.png", w: 360, h: 740 },
    { view: "step1", filename: "ia-facil-modal-mobile-375px.png", w: 375, h: 667 },
    { view: "step1", filename: "ia-facil-modal-mobile-390px.png", w: 390, h: 844 },
    { view: "step1", filename: "ia-facil-modal-mobile-412px.png", w: 412, h: 915 },
    { view: "step1", filename: "ia-facil-modal-tablet-768px.png", w: 768, h: 1024 },
    { view: "step1", filename: "ia-facil-modal-tablet-820px.png", w: 820, h: 1180 },
    { view: "step1", filename: "ia-facil-modal-desktop-1024px.png", w: 1024, h: 768 },
    { view: "step1", filename: "ia-facil-modal-desktop-1366px.png", w: 1366, h: 768 },
    { view: "step1", filename: "ia-facil-modal-desktop-1920px.png", w: 1920, h: 1080 },

    // Step 2: "O que falta"
    { view: "step2", filename: "ia-facil-modal-step2-390px.png", w: 390, h: 844 },
    { view: "step2", filename: "ia-facil-modal-step2-1366px.png", w: 1366, h: 768 },

    // Preview
    { view: "preview", filename: "ia-facil-modal-preview-390px.png", w: 390, h: 844 },
    { view: "preview", filename: "ia-facil-modal-preview-1366px.png", w: 1366, h: 768 },
  ];

  for (const t of targets) {
    const tmpHtml = path.join(os.tmpdir(), `ia_facil_${t.view}_${Date.now()}.html`);
    fs.writeFileSync(tmpHtml, getHtml(t.view), "utf8");
    const outPath = path.join(ARTIFACT_DIR, t.filename);
    const fileUrl = `file:///${tmpHtml.replace(/\\/g, "/")}`;

    try {
      execSync(`"${browserPath}" --headless=new --disable-gpu --window-size=${t.w},${t.h} --screenshot="${outPath}" "${fileUrl}"`);
      console.log(`✓ Screenshot [${t.w}x${t.h}] gerado:`, outPath);
    } finally {
      try {
        fs.unlinkSync(tmpHtml);
      } catch {}
    }
  }

  console.log("Todos os screenshots da IA Fácil foram gerados com sucesso!");
}

run().catch(console.error);
