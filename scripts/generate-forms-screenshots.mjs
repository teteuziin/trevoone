import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

const ARTIFACT_DIR = "C:\\Users\\User\\.gemini\\antigravity\\brain\\bda29c4f-b0d7-4433-9298-37b93b4df5ec";

function getHtml(view = "builder") {
  return `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Trevo One - Formulários Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b0c0e; margin: 0; padding: 0; }
  </style>
</head>
<body class="bg-black/90 antialiased overflow-hidden select-none text-slate-100">

  <!-- BACKGROUND BEHIND MODAL -->
  <div class="fixed inset-0 p-4 opacity-20 pointer-events-none">
    <div class="h-8 bg-emerald-500/20 rounded-xl mb-4 w-48"></div>
    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="h-16 bg-white/10 rounded-2xl"></div>
      <div class="h-16 bg-white/10 rounded-2xl"></div>
    </div>
    <div class="h-48 bg-white/5 rounded-2xl"></div>
  </div>

  <!-- MODAL OVERLAY -->
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs">

    ${view === "builder" ? `
    <!-- SCREEN (A): FORM BUILDER MODAL (TRUE MOBILE-FIRST REDESIGN) -->
    <div class="w-full bg-[#151619] border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden m-0">
      <!-- MOBILE DRAG HANDLE -->
      <div class="w-full pt-3 pb-1 flex justify-center shrink-0">
        <div class="w-12 h-1.5 bg-zinc-700 rounded-full"></div>
      </div>

      <!-- HEADER -->
      <div class="px-4 py-3 border-b border-white/10 flex items-start justify-between shrink-0">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
            Novo Formulário Personalizado
          </span>
          <h2 class="text-base font-bold text-white mt-0.5">
            Criar Modelo de Formulário
          </h2>
        </div>
      </div>

      <!-- BODY -->
      <div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <!-- BASIC INFORMATION -->
        <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
          <div>
            <label class="text-sm font-bold text-zinc-200 block mb-1.5">
              Título do Formulário <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value="Check-in Semanal de Evolução"
              class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-base text-white font-medium focus:outline-none min-h-[48px]"
              readonly
            />
          </div>
          <div>
            <label class="text-sm font-bold text-zinc-200 block mb-1.5">
              Instruções / Descrição (opcional)
            </label>
            <textarea
              rows="2"
              class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-base text-white font-medium focus:outline-none min-h-[80px]"
              readonly
            >Preencha todas as sextas-feiras antes de enviar suas fotos de evolução.</textarea>
          </div>
        </div>

        <!-- QUESTIONS LIST -->
        <div class="space-y-3.5">
          <!-- SECTION HEADER EMPILHADO EM MOBILE COM BOTÃO LARGURA TOTAL -->
          <div class="flex flex-col gap-3">
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider">
                Perguntas (2)
              </h3>
              <p class="text-xs text-zinc-400 mt-0.5">
                Configure as perguntas e o tipo de resposta esperado.
              </p>
            </div>
            <button class="w-full min-h-[48px] rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-sm flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              <span>+ Adicionar Pergunta</span>
            </button>
          </div>

          <!-- QUESTION CARD 1 (SCALE COM LABELS EMPILHADOS) -->
          <div class="p-4 rounded-2xl bg-[#1a1c20] border border-white/10 space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-emerald-400">#1 • Escala de 0 a 10</span>
              <span class="px-2 py-0.5 rounded-md bg-white/5 text-[11px] font-semibold text-zinc-400">Obrigatória</span>
            </div>

            <div>
              <label class="text-xs font-semibold text-zinc-300 block mb-1">Enunciado da pergunta</label>
              <input
                type="text"
                value="Nível de energia e disposição nos treinos desta semana"
                class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-base text-white font-medium min-h-[48px]"
                readonly
              />
            </div>

            <div>
              <label class="text-xs font-semibold text-zinc-300 block mb-1">Tipo de resposta</label>
              <select class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-base text-white font-medium min-h-[48px]">
                <option>Escala de 0 a 10</option>
              </select>
            </div>

            <!-- LABELS EMPILHADOS VERTICALMENTE (GRID-COLS-1) -->
            <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3.5">
              <div class="space-y-1">
                <label class="text-xs font-semibold text-zinc-300 block">Rótulo nota mínima (0)</label>
                <input
                  type="text"
                  value="Muito cansado / Sem energia"
                  class="w-full px-3.5 py-3 rounded-xl bg-white/5 border border-white/10 text-base text-white font-medium min-h-[48px]"
                  readonly
                />
              </div>
              <div class="space-y-1">
                <label class="text-xs font-semibold text-zinc-300 block">Rótulo nota máxima (10)</label>
                <input
                  type="text"
                  value="Excelente / Muito disposto"
                  class="w-full px-3.5 py-3 rounded-xl bg-white/5 border border-white/10 text-base text-white font-medium min-h-[48px]"
                  readonly
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- STICKY FOOTER (EMPILHADO EM MOBILE COM AÇÃO PRIMÁRIA NO TOPO E SEM QUEBRA DE LINHA) -->
      <div class="sticky bottom-0 bg-[#151619]/95 backdrop-blur-md border-t border-white/10 p-4 pb-6 flex flex-col gap-2.5 z-10">
        <button class="w-full min-h-[48px] rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 whitespace-nowrap">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span>Publicar Modelo</span>
        </button>
        <button class="w-full min-h-[48px] rounded-xl bg-white/10 text-white font-bold text-sm flex items-center justify-center whitespace-nowrap">
          Salvar Rascunho
        </button>
        <button class="w-full min-h-[48px] rounded-xl bg-transparent text-zinc-400 font-semibold text-sm flex items-center justify-center whitespace-nowrap">
          Cancelar
        </button>
      </div>
    </div>
    ` : view === "assign" ? `
    <!-- SCREEN (B): ASSIGN FORM MODAL -->
    <div class="w-full bg-[#151619] border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden m-0">
      <!-- MOBILE DRAG HANDLE -->
      <div class="w-full pt-3 pb-1 flex justify-center shrink-0">
        <div class="w-12 h-1.5 bg-zinc-700 rounded-full"></div>
      </div>

      <!-- HEADER -->
      <div class="px-4 py-3 border-b border-white/10 flex items-start justify-between shrink-0">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
            Atribuição de Formulário
          </span>
          <h2 class="text-base font-bold text-white mt-0.5">
            Enviar para Aluno(s)
          </h2>
        </div>
      </div>

      <!-- BODY -->
      <div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <!-- FORM SELECT -->
        <div class="space-y-1.5">
          <label class="text-sm font-bold text-zinc-200 block">Modelo do Formulário *</label>
          <div class="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-base text-white font-medium flex items-center justify-between min-h-[48px]">
            <span>Check-in Semanal de Evolução (3 perguntas)</span>
            <svg class="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <!-- DUE DATE -->
        <div class="space-y-1.5">
          <label class="text-sm font-bold text-zinc-200 block">Prazo para Resposta (opcional)</label>
          <input type="text" value="08/11/2026" class="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-base text-white font-medium min-h-[48px]" readonly />
        </div>

        <!-- TARGET RECIPIENTS -->
        <div class="space-y-2.5 pt-1">
          <label class="text-sm font-bold text-zinc-200 block">Selecionar Aluno (1 selecionado)</label>
          <input type="text" placeholder="Buscar aluno por nome ou email..." class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-base text-white min-h-[48px]" />

          <div class="space-y-1.5 border border-white/10 rounded-2xl p-2 bg-white/[0.02]">
            <div class="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 min-h-[48px]">
              <div>
                <span class="text-sm font-bold text-white block">Patricia Ramos</span>
                <span class="text-xs text-zinc-400 block">patricia.ramos@email.com</span>
              </div>
              <div class="w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- STICKY FOOTER -->
      <div class="sticky bottom-0 bg-[#151619]/95 backdrop-blur-md border-t border-white/10 p-4 pb-6 flex flex-col gap-2.5 z-10">
        <button class="w-full min-h-[48px] rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 whitespace-nowrap">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <span>Atribuir Formulário</span>
        </button>
        <button class="w-full min-h-[48px] rounded-xl bg-white/5 text-zinc-300 font-semibold text-sm flex items-center justify-center whitespace-nowrap">
          Cancelar
        </button>
      </div>
    </div>
    ` : view === "runner" ? `
    <!-- SCREEN (C): STUDENT FORM RUNNER -->
    <div class="w-full bg-[#151619] border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden m-0">
      <!-- MOBILE DRAG HANDLE -->
      <div class="w-full pt-3 pb-1 flex justify-center shrink-0">
        <div class="w-12 h-1.5 bg-zinc-700 rounded-full"></div>
      </div>

      <!-- HEADER -->
      <div class="px-4 py-3 border-b border-white/10 flex items-start justify-between shrink-0">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
            Preenchimento de Formulário
          </span>
          <h2 class="text-base font-bold text-white mt-0.5">
            Check-in Semanal de Evolução
          </h2>
        </div>
      </div>

      <!-- BODY -->
      <div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <!-- QUESTION 1: SCALE -->
        <div class="p-4 rounded-2xl bg-[#1a1c20] border border-white/10 space-y-3.5">
          <div class="flex items-start gap-2.5">
            <span class="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <label class="text-sm font-bold text-white block">
              Como avalia seu nível de energia e cansaço nos treinos? <span class="text-rose-500">*</span>
            </label>
          </div>
          <div class="space-y-2.5">
            <div class="flex items-center justify-between gap-1 overflow-x-auto pb-1">
              ${[0,1,2,3,4,5,6,7,8,9,10].map(n => `
                <button class="flex-1 min-w-[28px] h-11 rounded-lg text-sm font-bold ${n === 8 ? 'bg-emerald-500 text-white' : 'bg-white/10 text-zinc-300'}">
                  ${n}
                </button>
              `).join('')}
            </div>
            <div class="flex justify-between text-xs text-zinc-400 px-1">
              <span>0 (Muito cansado)</span>
              <span>10 (Muito disposto)</span>
            </div>
          </div>
        </div>

        <!-- QUESTION 2: SINGLE CHOICE -->
        <div class="p-4 rounded-2xl bg-[#1a1c20] border border-white/10 space-y-3.5">
          <div class="flex items-start gap-2.5">
            <span class="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <label class="text-sm font-bold text-white block">
              Bateu a meta diária de água (3L+)? <span class="text-rose-500">*</span>
            </label>
          </div>
          <div class="space-y-2">
            <button class="w-full flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-white font-semibold min-h-[48px]">
              <span class="text-sm">Sim, todos os dias</span>
              <div class="w-5 h-5 rounded-full border border-emerald-500 bg-emerald-500 flex items-center justify-center">
                <div class="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </button>
            <button class="w-full flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-white/5 text-zinc-300 min-h-[48px]">
              <span class="text-sm">Na maioria dos dias</span>
              <div class="w-5 h-5 rounded-full border border-white/20"></div>
            </button>
          </div>
        </div>
      </div>

      <!-- STICKY FOOTER -->
      <div class="sticky bottom-0 bg-[#151619]/95 backdrop-blur-md border-t border-white/10 p-4 pb-6 flex flex-col gap-2.5 z-10">
        <button class="w-full min-h-[48px] rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 whitespace-nowrap">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span>Enviar Respostas</span>
        </button>
        <button class="w-full min-h-[48px] rounded-xl bg-white/5 text-zinc-300 font-semibold text-sm flex items-center justify-center whitespace-nowrap">
          Cancelar
        </button>
      </div>
    </div>
    ` : `
    <!-- SCREEN (D): FORM REVIEW MODAL -->
    <div class="w-full bg-[#151619] border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden m-0">
      <!-- MOBILE DRAG HANDLE -->
      <div class="w-full pt-3 pb-1 flex justify-center shrink-0">
        <div class="w-12 h-1.5 bg-zinc-700 rounded-full"></div>
      </div>

      <!-- HEADER -->
      <div class="px-4 py-3 border-b border-white/10 flex items-start justify-between shrink-0">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
              Revisão de Resposta
            </span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Respondido
            </span>
          </div>
          <h2 class="text-base font-bold text-white mt-0.5">
            Check-in Semanal de Evolução
          </h2>
        </div>
      </div>

      <!-- BODY -->
      <div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <!-- STUDENT INFO CARD -->
        <div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div>
            <span class="text-[10px] text-zinc-400 uppercase font-semibold block">Aluno</span>
            <span class="text-sm font-bold text-white block">Patricia Ramos</span>
            <span class="text-xs text-zinc-400">patricia.ramos@email.com</span>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-zinc-400 uppercase font-semibold block">Enviado em</span>
            <span class="text-xs font-medium text-zinc-300">Hoje às 14:32</span>
          </div>
        </div>

        <!-- REVIEWER NOTES -->
        <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <label class="text-sm font-bold text-zinc-200 block">Feedback / Parecer do Profissional</label>
          <textarea rows="3" class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-base text-white min-h-[96px]" readonly>Excelente consistência, Patricia! Vamos manter o volume de água e incluir um lanche proteico extra na quarta.</textarea>
        </div>
      </div>

      <!-- STICKY FOOTER -->
      <div class="sticky bottom-0 bg-[#151619]/95 backdrop-blur-md border-t border-white/10 p-4 pb-6 flex flex-col gap-2.5 z-10">
        <button class="w-full min-h-[48px] rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 whitespace-nowrap">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span>Aprovar Formulário</span>
        </button>
        <button class="w-full min-h-[48px] rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold text-sm flex items-center justify-center whitespace-nowrap">
          Solicitar Ajustes
        </button>
        <button class="w-full min-h-[48px] rounded-xl bg-white/5 text-zinc-300 font-semibold text-sm flex items-center justify-center whitespace-nowrap">
          Fechar
        </button>
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
    { view: "builder", filename: "form-builder-modal-375x667.png", w: 375, h: 667 },
    { view: "builder", filename: "form-builder-modal-390x844.png", w: 390, h: 844 },
    { view: "builder", filename: "admin-forms-builder-375px.png", w: 375, h: 812 },
    { view: "assign", filename: "admin-forms-assign-375px.png", w: 375, h: 812 },
    { view: "runner", filename: "student-form-runner-375px.png", w: 375, h: 812 },
    { view: "review", filename: "admin-form-review-375px.png", w: 375, h: 812 },
  ];

  for (const t of targets) {
    const tmpHtml = path.join(os.tmpdir(), `forms_${t.view}_${Date.now()}.html`);
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

  console.log("Todos os screenshots mobile foram gerados com sucesso!");
}

run().catch(console.error);
