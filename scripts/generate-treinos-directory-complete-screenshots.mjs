import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

const ARTIFACT_DIR = "C:\\Users\\User\\.gemini\\antigravity\\brain\\bda29c4f-b0d7-4433-9298-37b93b4df5ec";

function getHtml(tab = "routines") {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>trevoone - Central de Treinos</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #F5F5F0; margin: 0; padding: 0; }
  </style>
</head>
<body class="bg-[#F5F5F0] text-[#102E23] antialiased min-h-screen p-3 sm:p-6 pb-28">

  <div class="max-w-6xl mx-auto space-y-4">
    
    <!-- 1. CABEÇALHO COMPACTO -->
    <div class="flex items-center justify-between gap-3 pt-1">
      <div class="min-w-0">
        <h1 class="text-xl sm:text-3xl font-extrabold text-[#102E23] tracking-tight">
          Treinos
        </h1>
        <p class="text-xs sm:text-sm text-[#526058] mt-0.5 truncate sm:whitespace-normal">
          ${tab === "assignments" ? "Acompanhe e atualize os treinos dos seus alunos." : tab === "templates" ? "Modelos prontos para acelerar a prescrição de treinos aos seus alunos." : "Crie, encontre e acompanhe seus treinos."}
        </p>
      </div>

      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button class="inline-flex items-center justify-center gap-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#176B49] text-white shadow-2xs min-h-[36px] sm:min-h-[40px]">
          <span>+</span>
          <span class="sm:hidden">Criar</span>
          <span class="hidden sm:inline">Criar treino</span>
        </button>

        <button class="inline-flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-white text-[#102E23] border border-[#E5E8E2] shadow-2xs min-h-[36px] sm:min-h-[40px] text-xs font-semibold">
          <span class="text-[#176B49]">✨</span>
          <span class="sm:hidden">IA</span>
          <span class="hidden sm:inline">Criar com IA</span>
        </button>
      </div>
    </div>

    ${tab === "routines" ? `
    <!-- 2. BANNER COMPACTO: CONTINUE DE ONDE PAROU -->
    <div class="p-2.5 sm:py-2.5 sm:px-4 rounded-2xl bg-[#102E23] text-white border border-[#163E27] shadow-2xs flex items-center justify-between gap-2.5">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-6 h-6 rounded-lg bg-white/10 text-emerald-300 flex items-center justify-center shrink-0 border border-white/10 text-xs font-bold">
          ⚡
        </span>
        <div class="min-w-0 flex items-center gap-1.5 flex-wrap">
          <span class="text-[11px] font-semibold text-emerald-300 shrink-0">
            Continue de onde parou:
          </span>
          <span class="text-xs sm:text-sm font-bold text-white truncate max-w-[150px] sm:max-w-md">
            Ficha Hipertrofia 4D
          </span>
          <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#FFF8E6]/20 text-[#FBE3A4] border border-[#FBE3A4]/30 shrink-0">
            Em elaboração
          </span>
        </div>
      </div>

      <button class="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-[#102E23] shadow-xs min-h-[34px] shrink-0">
        <span>Continuar</span>
        <span>→</span>
      </button>
    </div>
    ` : ""}

    <!-- 3. ABAS PRINCIPAIS (APENAS 3 ÁREAS) -->
    <div class="flex items-center gap-1 p-1 bg-[#EAECE6] border border-[#DEE2DA] rounded-2xl w-full sm:w-fit shadow-2xs">
      <div class="flex-1 sm:flex-initial text-center px-2.5 sm:px-4 py-2 text-[11px] sm:text-xs rounded-xl min-h-[36px] sm:min-h-[38px] flex items-center justify-center whitespace-nowrap cursor-pointer ${tab === "routines" ? "bg-white text-[#102E23] font-bold shadow-2xs border border-[#D5DDD6]" : "text-[#526058] font-semibold"}">
        Meus treinos
      </div>
      <div class="flex-1 sm:flex-initial text-center px-2.5 sm:px-4 py-2 text-[11px] sm:text-xs rounded-xl min-h-[36px] sm:min-h-[38px] flex items-center justify-center whitespace-nowrap cursor-pointer ${tab === "templates" ? "bg-white text-[#102E23] font-bold shadow-2xs border border-[#D5DDD6]" : "text-[#526058] font-semibold"}">
        <span class="sm:hidden">Modelos</span>
        <span class="hidden sm:inline">Modelos prontos</span>
      </div>
      <div class="flex-1 sm:flex-initial text-center px-2.5 sm:px-4 py-2 text-[11px] sm:text-xs rounded-xl min-h-[36px] sm:min-h-[38px] flex items-center justify-center whitespace-nowrap cursor-pointer ${tab === "assignments" ? "bg-white text-[#102E23] font-bold shadow-2xs border border-[#D5DDD6]" : "text-[#526058] font-semibold"}">
        <span class="sm:hidden">Dos alunos</span>
        <span class="hidden sm:inline">Treinos dos alunos</span>
      </div>
    </div>

    ${tab === "assignments" ? `
    <!-- ÁREA 3: TREINOS DOS ALUNOS -->
    <div class="space-y-3">
      <div class="flex items-center gap-1 p-1 bg-[#EAECE6] border border-[#DEE2DA] rounded-2xl w-full sm:w-fit shadow-2xs overflow-x-auto">
        <div class="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-white text-[#102E23] shadow-2xs border border-[#D5DDD6]">Ativos (12)</div>
        <div class="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-[#8C5D00]">Atualizações (2)</div>
        <div class="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-[#526058]">Encerrados (5)</div>
        <div class="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-[#526058]">Todos (19)</div>
      </div>

      <!-- CARD ALUNO 1: ATUALIZAÇÃO DISPONÍVEL -->
      <div class="p-3 sm:p-3.5 rounded-2xl bg-white border border-[#E5E8E2] shadow-2xs space-y-2">
        <div class="flex items-center justify-between gap-2.5">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-[#EDF5F0] text-[#176B49] border border-[#D5E4D8] flex items-center justify-center font-bold text-xs shrink-0">
              JS
            </div>
            <h3 class="text-sm sm:text-base font-bold text-[#102E23]">João da Silva</h3>
          </div>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#FFF8E6] text-[#8C5D00] border border-[#FBE3A4]">
            <span class="w-1.5 h-1.5 rounded-full bg-[#E58900]"></span>
            <span>Atualização disponível</span>
          </span>
        </div>

        <div class="pt-2 border-t border-[#F0F2ED] flex items-center justify-between gap-2.5">
          <div class="min-w-0">
            <p class="text-sm font-bold text-[#102E23] truncate">Ficha Hipertrofia ABCD</p>
            <p class="text-xs text-[#526058]">Início em 15/10/2026 · 4 divisões</p>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button class="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#102E23] border border-[#DEE2DA]">Renomear</button>
            <button class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#176B49] text-white">Conferir atualização</button>
          </div>
        </div>
      </div>

      <!-- CARD ALUNO 2: TREINO ATIVO -->
      <div class="p-3 sm:p-3.5 rounded-2xl bg-white border border-[#E5E8E2] shadow-2xs space-y-2">
        <div class="flex items-center justify-between gap-2.5">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-[#EDF5F0] text-[#176B49] border border-[#D5E4D8] flex items-center justify-center font-bold text-xs shrink-0">
              ML
            </div>
            <h3 class="text-sm sm:text-base font-bold text-[#102E23]">Mariana Lima</h3>
          </div>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#EBF7EE] text-[#12583B] border border-[#CDEED5]">
            <span class="w-1.5 h-1.5 rounded-full bg-[#176B49]"></span>
            <span>Treino ativo</span>
          </span>
        </div>

        <div class="pt-2 border-t border-[#F0F2ED] flex items-center justify-between gap-2.5">
          <div class="min-w-0">
            <p class="text-sm font-bold text-[#102E23] truncate">Definição e Glúteos 3D</p>
            <p class="text-xs text-[#526058]">Início em 01/11/2026 · 3 divisões</p>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button class="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#102E23] border border-[#DEE2DA]">Renomear</button>
            <button class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#176B49] text-white">Ver treino →</button>
          </div>
        </div>
      </div>
    </div>
    ` : tab === "templates" ? `
    <!-- ÁREA 2: MODELOS PRONTOS -->
    <div class="p-3 sm:p-3.5 rounded-2xl border border-[#E5E8E2] bg-white shadow-2xs flex items-center justify-between gap-2">
      <div class="flex-1">
        <input type="text" placeholder="Buscar treino, modelo ou aluno..." class="w-full pl-3 py-1.5 text-xs sm:text-sm rounded-xl border border-[#E5E8E2] bg-[#FDFDFC] text-[#102E23]" />
      </div>
      <span class="text-xs text-[#6B7870] font-medium shrink-0">3 modelos prontos</span>
    </div>

    <div class="space-y-2.5">
      <div class="bg-white rounded-2xl border border-[#E5E8E2] p-3 sm:p-3.5 shadow-2xs flex items-center justify-between gap-3">
        <div class="min-w-0 flex-1">
          <h3 class="font-bold text-sm sm:text-base text-[#102E23] truncate">Modelo ABC - Hipertrofia Básica</h3>
          <p class="text-xs text-[#526058]">Modelo pronto · 3 divisões · Atualizado 02/11/2026</p>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#176B49] text-white">Usar modelo →</button>
          <button class="p-1.5 rounded-xl text-[#526058] border border-[#E5E8E2]">⋮</button>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-[#E5E8E2] p-3 sm:p-3.5 shadow-2xs flex items-center justify-between gap-3">
        <div class="min-w-0 flex-1">
          <h3 class="font-bold text-sm sm:text-base text-[#102E23] truncate">Modelo ABCD - Avançado Força e Cargas</h3>
          <p class="text-xs text-[#526058]">Modelo pronto · 4 divisões · Atualizado 28/10/2026</p>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#176B49] text-white">Usar modelo →</button>
          <button class="p-1.5 rounded-xl text-[#526058] border border-[#E5E8E2]">⋮</button>
        </div>
      </div>
    </div>
    ` : `
    <!-- ÁREA 1: MEUS TREINOS (BUSCA + FILTROS COMPACTOS) -->
    <div class="p-3 sm:p-3.5 rounded-2xl border border-[#E5E8E2] bg-white shadow-2xs space-y-2.5">
      <div class="flex gap-2 items-center">
        <div class="relative flex-1">
          <input type="text" placeholder="Buscar treino, modelo ou aluno..." class="w-full pl-3 pr-8 py-1.5 text-xs sm:text-sm rounded-xl border border-[#E5E8E2] bg-[#FDFDFC] text-[#102E23]" />
        </div>
        <select class="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-[#E5E8E2] bg-[#FDFDFC] text-[#102E23]">
          <option>Mais recentes</option>
          <option>Mais antigas</option>
          <option>Nome A-Z</option>
        </select>
      </div>

      <div class="flex items-center justify-between gap-2 pt-1.5 border-t border-[#F0F2ED]">
        <div class="flex items-center gap-1.5 overflow-x-auto">
          <button class="px-2.5 py-1 rounded-xl text-xs bg-[#102E23] text-white font-bold shadow-2xs">Todos</button>
          <button class="px-2.5 py-1 rounded-xl text-xs bg-[#F5F5F0] text-[#526058] border border-[#E5E8E2]">Em elaboração</button>
          <button class="px-2.5 py-1 rounded-xl text-xs bg-[#F5F5F0] text-[#526058] border border-[#E5E8E2]">Publicados</button>
          <button class="px-2 py-1 rounded-xl text-xs text-[#8C9890]">Arquivados</button>
        </div>
        <span class="text-[11px] sm:text-xs text-[#6B7870] font-medium shrink-0">8 treinos</span>
      </div>
    </div>

    <!-- CARDS DE TREINOS COMPACTOS EM LINHA ÚNICA -->
    <div class="space-y-2.5">
      <!-- CARD 1 -->
      <div class="bg-white rounded-2xl border border-[#E5E8E2] p-3 sm:p-3.5 shadow-2xs flex items-center justify-between gap-2.5 sm:gap-3">
        <div class="min-w-0 flex-1 space-y-1">
          <p class="font-bold text-sm sm:text-base text-[#102E23] truncate leading-tight">Ficha Hipertrofia 4D</p>
          <div class="flex items-center gap-1.5 flex-wrap text-xs text-[#526058]">
            <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#FFF8E6] text-[#8C5D00] border border-[#F0D699]">
              Em elaboração
            </span>
            <span class="font-semibold text-[#102E23]">· João da Silva</span>
            <span>· 4 divisões</span>
            <span class="text-[#8C9890] text-[11px] hidden sm:inline">· Atualizado 07/11/2026</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#176B49] text-white shadow-2xs">Continuar →</button>
          <button class="p-1.5 rounded-xl text-[#526058] border border-[#E5E8E2]">⋮</button>
        </div>
      </div>

      <!-- CARD 2 -->
      <div class="bg-white rounded-2xl border border-[#E5E8E2] p-3 sm:p-3.5 shadow-2xs flex items-center justify-between gap-2.5 sm:gap-3">
        <div class="min-w-0 flex-1 space-y-1">
          <p class="font-bold text-sm sm:text-base text-[#102E23] truncate leading-tight">Definição e Força Geral</p>
          <div class="flex items-center gap-1.5 flex-wrap text-xs text-[#526058]">
            <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#EBF7EE] text-[#12583B] border border-[#C3E6CC]">
              Publicado
            </span>
            <span class="font-semibold text-[#102E23]">· Mariana Lima</span>
            <span>· 3 divisões</span>
            <span class="text-[#8C9890] text-[11px] hidden sm:inline">· Atualizado 05/11/2026</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-[#102E23] border border-[#D5DDD6]">Ver treino →</button>
          <button class="p-1.5 rounded-xl text-[#526058] border border-[#E5E8E2]">⋮</button>
        </div>
      </div>

      <!-- CARD 3 -->
      <div class="bg-white rounded-2xl border border-[#E5E8E2] p-3 sm:p-3.5 shadow-2xs flex items-center justify-between gap-2.5 sm:gap-3">
        <div class="min-w-0 flex-1 space-y-1">
          <p class="font-bold text-sm sm:text-base text-[#102E23] truncate leading-tight">Condicionamento e Mobilidade</p>
          <div class="flex items-center gap-1.5 flex-wrap text-xs text-[#526058]">
            <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#EBF7EE] text-[#12583B] border border-[#C3E6CC]">
              Publicado
            </span>
            <span class="font-semibold text-[#102E23]">· Carlos Eduardo</span>
            <span>· 2 divisões</span>
            <span class="text-[#8C9890] text-[11px] hidden sm:inline">· Atualizado 01/11/2026</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-[#102E23] border border-[#D5DDD6]">Ver treino →</button>
          <button class="p-1.5 rounded-xl text-[#526058] border border-[#E5E8E2]">⋮</button>
        </div>
      </div>
    </div>
    `}

  </div>

</body>
</html>`;
}

async function run() {
  const browserPath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

  const targets = [
    { tab: "routines", filename: "treinos-final-mobile-320px.png", w: 320, h: 600 },
    { tab: "routines", filename: "treinos-final-mobile-360px.png", w: 360, h: 740 },
    { tab: "routines", filename: "treinos-final-mobile-375px.png", w: 375, h: 667 },
    { tab: "routines", filename: "treinos-final-mobile-390px.png", w: 390, h: 844 },
    { tab: "routines", filename: "treinos-final-mobile-412px.png", w: 412, h: 915 },
    { tab: "routines", filename: "treinos-final-mobile-600px.png", w: 600, h: 960 },
    { tab: "routines", filename: "treinos-final-tablet-768px.png", w: 768, h: 1024 },
    { tab: "routines", filename: "treinos-final-tablet-820px.png", w: 820, h: 1180 },
    { tab: "routines", filename: "treinos-final-desktop-1024px.png", w: 1024, h: 768 },
    { tab: "routines", filename: "treinos-final-desktop-1366px.png", w: 1366, h: 768 },
    { tab: "routines", filename: "treinos-final-desktop-1920px.png", w: 1920, h: 1080 },

    // Tabs
    { tab: "templates", filename: "treinos-final-templates-desktop-1366px.png", w: 1366, h: 768 },
    { tab: "templates", filename: "treinos-final-templates-mobile-390px.png", w: 390, h: 844 },
    { tab: "assignments", filename: "treinos-final-assignments-desktop-1366px.png", w: 1366, h: 768 },
    { tab: "assignments", filename: "treinos-final-assignments-mobile-390px.png", w: 390, h: 844 },
  ];

  for (const t of targets) {
    const tmpHtml = path.join(os.tmpdir(), `treinos_dir_${t.tab}_${Date.now()}.html`);
    fs.writeFileSync(tmpHtml, getHtml(t.tab), "utf8");
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

  console.log("Todos os screenshots da Central de Treinos foram gerados com sucesso!");
}

run().catch(console.error);
