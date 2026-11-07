import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

const ARTIFACT_DIR = "C:\\Users\\User\\.gemini\\antigravity\\brain\\bda29c4f-b0d7-4433-9298-37b93b4df5ec";

function getHtml(view = "form") {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>trevoone - Vamos montar seu treino?</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #F5F5F0; margin: 0; padding: 0; }
  </style>
</head>
<body class="bg-[#F5F5F0] text-[#102E23] antialiased flex items-center justify-center min-h-screen p-0 sm:p-4">

  <!-- MODAL CONTAINER -->
  <div class="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl lg:max-w-3xl bg-[#F5F5F0] rounded-none sm:rounded-3xl border sm:border-[#E5E8E2] flex flex-col shadow-2xl overflow-hidden">
    
    <!-- HEADER -->
    <div class="px-5 sm:px-6 py-4 border-b border-[#E5E8E2] flex items-center justify-between shrink-0 bg-white">
      <div class="flex items-center gap-3 min-w-0 pr-3">
        <div class="w-10 h-10 rounded-2xl bg-[#176B49]/10 text-[#176B49] flex items-center justify-center shrink-0 border border-[#176B49]/20 font-bold">
          ⚡
        </div>
        <div class="min-w-0">
          <h2 class="text-base sm:text-lg font-bold text-[#102E23] leading-tight">
            ${view === "preview" ? "Revisar proposta gerada" : "Vamos montar seu treino?"}
          </h2>
          <p class="text-xs text-[#526058] mt-0.5">
            ${view === "preview" ? "Confira as divisões e exercícios antes de abrir no editor" : "Escolha o básico. A IA ajuda com o resto."}
          </p>
        </div>
      </div>
      <div class="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[#526058] hover:bg-[#E5E8E2]/60 flex items-center justify-center cursor-pointer">
        ✕
      </div>
    </div>

    <!-- BODY -->
    <div class="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
      
      <!-- COTA BANNER -->
      <div class="p-2.5 px-3.5 rounded-xl bg-white border border-[#E5E8E2] text-xs flex items-center justify-between shadow-2xs">
        <span class="text-[#526058]">
          Cota diária: <strong class="text-[#102E23]">2</strong> de <strong class="text-[#102E23]">20</strong> fichas utilizadas
        </span>
        <span class="font-bold text-[#176B49]">
          Restam: 18
        </span>
      </div>

      ${view === "form" ? `
      <!-- 1. PARA QUEM É O TREINO? -->
      <div class="bg-white border border-[#E5E8E2] rounded-2xl p-4 space-y-2 shadow-2xs">
        <label class="block text-xs font-bold text-[#102E23] uppercase tracking-wider">
          Para quem é o treino?
        </label>
        
        <div class="flex items-center gap-3 p-3 rounded-xl bg-[#F5F5F0] border border-[#E5E8E2]">
          <div class="w-9 h-9 rounded-full bg-[#176B49] text-white font-bold flex items-center justify-center text-xs shrink-0">
            J
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold text-[#102E23] truncate">João da Silva</p>
            <p class="text-xs text-[#526058] truncate">joao.silva@email.com</p>
          </div>
          <span class="text-[11px] font-semibold text-[#176B49] bg-[#176B49]/10 px-2 py-0.5 rounded-md shrink-0">
            Aluno selecionado
          </span>
        </div>

        <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 flex items-start gap-2.5">
          <span class="text-sm">📋</span>
          <div class="min-w-0 flex-1">
            <p class="font-bold">Dados aproveitados da ficha do aluno:</p>
            <p class="text-[11px] text-emerald-800 mt-0.5">Objetivo: Hipertrofia • Frequência: 4 dias/sem • Restrições: Dor leve no ombro esquerdo</p>
            <p class="text-[10px] text-emerald-700 mt-1 italic">Campos pré-ajustados. Você pode alterar qualquer opção abaixo.</p>
          </div>
        </div>
      </div>

      <!-- 2. O QUE DESEJA TRABALHAR? -->
      <div class="bg-white border border-[#E5E8E2] rounded-2xl p-4 space-y-2.5 shadow-2xs">
        <div class="flex items-center justify-between">
          <label class="block text-xs font-bold text-[#102E23] uppercase tracking-wider">
            O que deseja trabalhar?
          </label>
          <span class="text-[11px] text-[#526058]">Escolha o objetivo</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div class="p-3 rounded-xl border bg-[#102E23] text-white border-[#102E23] shadow-xs cursor-pointer">
            <div class="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
              <span>💪</span>
              <span>Hipertrofia</span>
            </div>
            <span class="text-[11px] text-emerald-200 mt-0.5 block">Ganho de massa</span>
          </div>

          <div class="p-3 rounded-xl border bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] hover:border-[#176B49] cursor-pointer">
            <div class="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
              <span>🔥</span>
              <span>Emagrecimento</span>
            </div>
            <span class="text-[11px] text-[#526058] mt-0.5 block">Perda de gordura</span>
          </div>

          <div class="p-3 rounded-xl border bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] hover:border-[#176B49] cursor-pointer">
            <div class="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
              <span>✨</span>
              <span>Definição</span>
            </div>
            <span class="text-[11px] text-[#526058] mt-0.5 block">Tônus muscular</span>
          </div>

          <div class="p-3 rounded-xl border bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] hover:border-[#176B49] cursor-pointer">
            <div class="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
              <span>⚡</span>
              <span>Força</span>
            </div>
            <span class="text-[11px] text-[#526058] mt-0.5 block">Cargas e potência</span>
          </div>

          <div class="p-3 rounded-xl border bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] hover:border-[#176B49] cursor-pointer">
            <div class="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
              <span>🏃</span>
              <span>Condicionamento</span>
            </div>
            <span class="text-[11px] text-[#526058] mt-0.5 block">Resistência geral</span>
          </div>

          <div class="p-3 rounded-xl border bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] hover:border-[#176B49] cursor-pointer">
            <div class="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
              <span>✏️</span>
              <span>Outro</span>
            </div>
            <span class="text-[11px] text-[#526058] mt-0.5 block">Personalizado</span>
          </div>
        </div>
      </div>

      <!-- 3. QUANTOS DIAS POR SEMANA? -->
      <div class="bg-white border border-[#E5E8E2] rounded-2xl p-4 space-y-2.5 shadow-2xs">
        <div class="flex items-center justify-between">
          <label class="block text-xs font-bold text-[#102E23] uppercase tracking-wider">
            Quantos dias por semana?
          </label>
          <span class="text-[11px] font-bold text-[#176B49]">4 dias por semana</span>
        </div>

        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <div class="py-2.5 px-3 rounded-xl border text-center font-bold text-xs sm:text-sm bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] cursor-pointer">1 dia</div>
          <div class="py-2.5 px-3 rounded-xl border text-center font-bold text-xs sm:text-sm bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] cursor-pointer">2 dias</div>
          <div class="py-2.5 px-3 rounded-xl border text-center font-bold text-xs sm:text-sm bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] cursor-pointer">3 dias</div>
          <div class="py-2.5 px-3 rounded-xl border text-center font-bold text-xs sm:text-sm bg-[#176B49] text-white border-[#176B49] shadow-xs cursor-pointer">4 dias</div>
          <div class="py-2.5 px-3 rounded-xl border text-center font-bold text-xs sm:text-sm bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] cursor-pointer">5 dias</div>
          <div class="py-2.5 px-3 rounded-xl border text-center font-bold text-xs sm:text-sm bg-[#FAFBF9] text-[#102E23] border-[#E5E8E2] cursor-pointer">6 dias</div>
        </div>

        <p class="text-xs text-[#526058] leading-relaxed bg-[#F5F5F0] p-2.5 rounded-xl border border-[#E5E8E2]">
          <strong class="text-[#102E23]">Divisão sugerida:</strong> Divisão A / B / C / D (Peito/Tríceps, Costas/Bíceps, Pernas, Ombros)
        </p>
      </div>

      <!-- 4. PERGUNTAR SÓ O QUE FALTA -->
      <div class="bg-white border border-[#E5E8E2] rounded-2xl p-4 space-y-4 shadow-2xs">
        <span class="block text-xs font-bold text-[#102E23] uppercase tracking-wider">
          Detalhes essenciais
        </span>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label class="block text-[11px] font-bold text-[#526058] uppercase tracking-wider">Onde vai treinar?</label>
            <div class="w-full rounded-xl bg-[#F5F5F0] border border-[#E5E8E2] px-3 py-2 text-xs font-semibold text-[#102E23]">
              Academia Completa (Aparelhos, Polias, Barras e Halteres)
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="block text-[11px] font-bold text-[#526058] uppercase tracking-wider">Duração média por treino</label>
            <div class="w-full rounded-xl bg-[#F5F5F0] border border-[#E5E8E2] px-3 py-2 text-xs font-semibold text-[#102E23]">
              Até 50 minutos
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#E5E8E2]">
          <div class="space-y-1.5">
            <label class="block text-[11px] font-bold text-[#526058] uppercase tracking-wider">Experiência / Nível</label>
            <div class="flex gap-2">
              <div class="flex-1 py-2 px-2 rounded-xl text-xs font-bold border text-center bg-[#FAFBF9] text-[#526058] border-[#E5E8E2]">Iniciante</div>
              <div class="flex-1 py-2 px-2 rounded-xl text-xs font-bold border text-center bg-[#102E23] text-white border-[#102E23]">Intermediário</div>
              <div class="flex-1 py-2 px-2 rounded-xl text-xs font-bold border text-center bg-[#FAFBF9] text-[#526058] border-[#E5E8E2]">Avançado</div>
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="block text-[11px] font-bold text-[#526058] uppercase tracking-wider">Dores ou restrições?</label>
            <div class="flex gap-2">
              <div class="flex-1 py-2 px-2 rounded-xl text-xs font-bold border text-center bg-[#FAFBF9] text-[#526058] border-[#E5E8E2]">Sem restrições</div>
              <div class="flex-1 py-2 px-2 rounded-xl text-xs font-bold border text-center bg-[#176B49] text-white border-[#176B49]">Possui dor/restrição</div>
            </div>
          </div>
        </div>

        <div class="pt-1">
          <div class="w-full rounded-xl bg-[#F5F5F0] border border-[#E5E8E2] px-3.5 py-2.5 text-xs text-[#102E23]">
            Dor leve no ombro esquerdo em rotação externa
          </div>
        </div>
      </div>
      ` : `
      <!-- PREVIEW STATE -->
      <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 flex items-center gap-2">
        <span class="font-bold">✓ Proposta pronta para revisão!</span>
        <span>Esta ficha será salva estritamente como Rascunho para você revisar no editor.</span>
      </div>

      <div class="bg-white border border-[#E5E8E2] rounded-2xl p-4 space-y-2">
        <label class="block text-xs font-bold text-[#102E23] uppercase tracking-wider">Título da Ficha</label>
        <div class="w-full bg-white border border-[#E5E8E2] rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#102E23]">
          Ficha Hipertrofia ABCD - João da Silva
        </div>
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
          <div class="bg-white border border-[#E5E8E2] rounded-lg p-2.5 text-xs flex justify-between items-center shadow-2xs">
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
      `}

      <!-- ACTIONS -->
      <div class="pt-3 flex items-center justify-between gap-3 border-t border-[#E5E8E2]">
        <button class="px-4 py-2.5 min-h-[46px] rounded-xl text-xs sm:text-sm font-semibold text-[#526058] hover:bg-[#E5E8E2]/60 transition">
          ${view === "preview" ? "← Ajustar opções" : "Cancelar"}
        </button>

        <button class="px-6 py-2.5 min-h-[48px] rounded-xl text-xs sm:text-sm font-bold text-white bg-[#176B49] hover:bg-[#12583B] transition shadow-sm flex items-center gap-2">
          ${view === "preview" ? "<span>Salvar rascunho e abrir no editor</span>" : "<span>⚡ Gerar treino com IA</span>"}
        </button>
      </div>

    </div>
  </div>

</body>
</html>`;
}

async function run() {
  const browserPath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

  const targets = [
    { view: "form", filename: "ia-facil-modal-mobile-320px.png", w: 320, h: 600 },
    { view: "form", filename: "ia-facil-modal-mobile-360px.png", w: 360, h: 740 },
    { view: "form", filename: "ia-facil-modal-mobile-390px.png", w: 390, h: 844 },
    { view: "form", filename: "ia-facil-modal-mobile-412px.png", w: 412, h: 915 },
    { view: "form", filename: "ia-facil-modal-tablet-768px.png", w: 768, h: 1024 },
    { view: "form", filename: "ia-facil-modal-tablet-820px.png", w: 820, h: 1180 },
    { view: "form", filename: "ia-facil-modal-desktop-1024px.png", w: 1024, h: 768 },
    { view: "form", filename: "ia-facil-modal-desktop-1366px.png", w: 1366, h: 768 },
    { view: "form", filename: "ia-facil-modal-desktop-1920px.png", w: 1920, h: 1080 },
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
