import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

const ARTIFACT_DIR = "C:\\Users\\User\\.gemini\\antigravity\\brain\\bda29c4f-b0d7-4433-9298-37b93b4df5ec";

function getHtml(view = "hub", isMobile = false) {
  return `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Trevo One - Formulários do Aluno</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b0c0e; margin: 0; padding: 0; }
  </style>
</head>
<body class="bg-[#0b0c0e] text-slate-100 antialiased ${isMobile ? "p-3 pb-24" : "p-8 max-w-6xl mx-auto"}">

  <!-- TOP HEADER / NAV CONTEXT -->
  <div class="mb-6 pb-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <div class="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
        <span>Alunos</span>
        <span>/</span>
        <span>Pedro Santos</span>
        <span>/</span>
        <span class="text-white">Formulários</span>
      </div>
      <h1 class="text-2xl font-extrabold text-white tracking-tight">Formulários do Aluno</h1>
      <p class="text-sm text-zinc-400 mt-1">Gerencie questionários, anamneses e check-ins atribuídos exclusivamente a este aluno.</p>
    </div>
    <div class="flex items-center gap-2">
      <button class="w-full sm:w-auto min-h-[48px] px-5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
        <span>Novo formulário</span>
      </button>
    </div>
  </div>

  <!-- FILTER PILLS WITH HIGH-CONTRAST COUNTERS -->
  <div class="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
    <!-- TODOS (ACTIVE) -->
    <button class="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-white text-slate-900 shadow-sm shrink-0">
      <span>Todos</span>
      <span class="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-900 text-white">2</span>
    </button>
    <!-- AGUARDANDO RESPOSTA -->
    <button class="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white shrink-0">
      <span>Aguardando resposta</span>
      <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300">1</span>
    </button>
    <!-- RESPONDIDOS -->
    <button class="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white shrink-0">
      <span>Respondidos</span>
      <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-zinc-400">0</span>
    </button>
    <!-- REVISADOS -->
    <button class="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white shrink-0">
      <span>Revisados</span>
      <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300">1</span>
    </button>
  </div>

  <!-- ASSIGNMENT CARDS LIST -->
  <div class="space-y-4">
    <!-- CARD 1: PENDING FORM -->
    <div class="bg-[#151619] border border-white/10 rounded-2xl p-4 sm:p-5 hover:border-white/20 transition shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-white">Anamnese Pré-Treino & Saúde</h3>
            <p class="text-xs text-zinc-400 mt-0.5">Enviado em 03/11/2026 • Prazo: 20/11/2026</p>
          </div>
        </div>
        <div class="flex items-center gap-2 self-start sm:self-auto">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/20">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Aguardando resposta
          </span>
        </div>
      </div>

      <div class="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div class="text-xs text-zinc-400 flex items-center gap-4">
          <span><strong>4</strong> perguntas</span>
          <span>•</span>
          <span>Check-in Inicial</span>
        </div>
        <div class="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <button class="min-h-[44px] px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold text-xs rounded-xl border border-emerald-500/20 flex items-center justify-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
            WhatsApp
          </button>
          <button class="min-h-[44px] px-3 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold text-xs rounded-xl border border-white/10 flex items-center justify-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
            Copiar Link
          </button>
          <button class="min-h-[44px] px-3 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold text-xs rounded-xl border border-white/10 flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1">
            Preencher pelo aluno
          </button>
          <button class="min-h-[44px] px-3 py-2 text-rose-400 hover:bg-rose-500/10 font-semibold text-xs rounded-xl transition flex items-center justify-center col-span-2 sm:col-span-1">
            Excluir
          </button>
        </div>
      </div>
    </div>

    <!-- CARD 2: REVIEWED FORM -->
    <div class="bg-[#151619] border border-white/10 rounded-2xl p-4 sm:p-5 hover:border-white/20 transition shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-white">Avaliação Fisiológica Mensal</h3>
            <p class="text-xs text-zinc-400 mt-0.5">Respondido em 02/11/2026 • Aprovado pelo Personal</p>
          </div>
        </div>
        <div class="flex items-center gap-2 self-start sm:self-auto">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            Revisado
          </span>
        </div>
      </div>

      <div class="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div class="text-xs text-zinc-400 flex items-center gap-4">
          <span><strong>8</strong> respostas</span>
          <span>•</span>
          <span>Periodização Aprovada</span>
        </div>
        <div class="flex items-center gap-2">
          <button class="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-xl border border-white/10 flex items-center justify-center gap-1.5">
            Ver Respostas
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- MOBILE BOTTOM NAVIGATION (z-30) IN APP SHELL -->
  <nav class="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-[#111315] border-t border-white/10 flex items-center justify-around px-2 text-zinc-400 text-[10px]">
    <div class="flex flex-col items-center gap-1">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
      <span>Início</span>
    </div>
    <div class="flex flex-col items-center gap-1 text-emerald-400 font-bold">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
      <span>Alunos</span>
    </div>
    <div class="flex flex-col items-center gap-1">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
      <span>Treinos</span>
    </div>
    <div class="flex flex-col items-center gap-1">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
      <span>Consultas</span>
    </div>
    <div class="flex flex-col items-center gap-1">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
      <span>Mais</span>
    </div>
  </nav>

  ${view === "chooser" ? `
  <!-- OVERLAY CHOOSER MODAL (PORTALED AT ROOT WITH z-[70] - COVERS BOTTOM NAV BAR z-30) -->
  <div class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs">
    <div class="w-full sm:max-w-lg bg-[#151619] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden m-0">
      
      <!-- MOBILE DRAG HANDLE -->
      <div class="w-full pt-3 pb-1 flex justify-center sm:hidden shrink-0 bg-[#151619]">
        <div class="w-12 h-1.5 bg-zinc-700 rounded-full"></div>
      </div>

      <!-- HEADER -->
      <div class="flex items-start justify-between border-b border-white/10 px-5 sm:px-6 py-4 shrink-0">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
            ● Atribuição de Formulário
          </span>
          <h3 class="text-base sm:text-lg font-bold text-white mt-0.5">
            Adicionar para Pedro Santos
          </h3>
          <p class="text-xs text-zinc-400 mt-0.5">
            Como você deseja disponibilizar este questionário para o aluno?
          </p>
        </div>
        <button class="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer shrink-0">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- SCROLLABLE BODY (ZERO CLIPPING / FULL ACCESSIBILITY) -->
      <div class="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-3">
        <!-- OPTION 1: EXISTING TEMPLATE -->
        <button class="w-full p-4 sm:p-5 rounded-2xl border border-white/10 hover:border-emerald-500/50 bg-white/[0.03] hover:bg-emerald-500/[0.04] text-left transition-all cursor-pointer group flex items-start gap-4 min-h-[96px]">
          <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:scale-105 transition-transform">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                Escolher modelo existente
              </span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                2 disponíveis
              </span>
            </div>
            <p class="text-xs text-zinc-400 mt-1 leading-relaxed">
              Selecione um questionário já pronto da biblioteca (check-in, avaliação, rotina) e envie com 1 clique.
            </p>
          </div>
        </button>

        <!-- OPTION 2: CREATE NEW MODEL -->
        <button class="w-full p-4 sm:p-5 rounded-2xl border border-white/10 hover:border-emerald-500/50 bg-white/[0.03] hover:bg-emerald-500/[0.04] text-left transition-all cursor-pointer group flex items-start gap-4 min-h-[96px]">
          <div class="w-12 h-12 rounded-xl bg-white/5 text-zinc-300 flex items-center justify-center shrink-0 border border-white/10 group-hover:scale-105 transition-transform">
            <svg class="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                Criar novo modelo do zero
              </span>
            </div>
            <p class="text-xs text-zinc-400 mt-1 leading-relaxed">
              Construa um modelo com perguntas sob medida (escalas, escolhas, textos). Ficará salvo na biblioteca e já atribuído ao aluno.
            </p>
          </div>
        </button>
      </div>

      <!-- FOOTER DISMISS ACTION (48px TOUCH TARGET & SAFE AREA PADDING) -->
      <div class="p-4 sm:p-6 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-white/10 bg-white/[0.02] shrink-0">
        <button class="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold text-sm transition-colors flex items-center justify-center cursor-pointer active:scale-[0.99]">
          Cancelar
        </button>
      </div>
    </div>
  </div>
  ` : ""}

</body>
</html>`;
}

async function run() {
  const browserPath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

  const targets = [
    { view: "hub", filename: "student-forms-hub-desktop.png", w: 1440, h: 900, mobile: false },
    { view: "chooser", filename: "student-forms-chooser-desktop.png", w: 1440, h: 900, mobile: false },
    { view: "hub", filename: "student-forms-hub-375x667.png", w: 375, h: 667, mobile: true },
    { view: "hub", filename: "student-forms-hub-390x844.png", w: 390, h: 844, mobile: true },
    { view: "chooser", filename: "student-forms-chooser-375x667.png", w: 375, h: 667, mobile: true },
    { view: "chooser", filename: "student-forms-chooser-390x844.png", w: 390, h: 844, mobile: true },
  ];

  for (const t of targets) {
    const tmpHtml = path.join(os.tmpdir(), `student_forms_${t.view}_${Date.now()}.html`);
    fs.writeFileSync(tmpHtml, getHtml(t.view, t.mobile), "utf8");
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

  console.log("Todos os screenshots de formulários do perfil do aluno foram gerados com sucesso!");
}

run().catch(console.error);
