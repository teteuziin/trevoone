import fs from "node:fs";
import path from "node:path";
import http from "node:http";
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
  <div class="fixed inset-0 p-4 opacity-25 pointer-events-none">
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
    <!-- SCREEN (A): FORM BUILDER MODAL -->
    <div class="w-full bg-[#151619] border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden m-0">
      <!-- DRAG HANDLE -->
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
      <div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5">
        <!-- INFO -->
        <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
          <div>
            <label class="text-[11px] font-bold text-zinc-300 block mb-1">Título do Formulário *</label>
            <input type="text" value="Check-in Semanal de Evolução" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-medium focus:outline-none" readonly />
          </div>
          <div>
            <label class="text-[11px] font-bold text-zinc-300 block mb-1">Descrição / Instruções</label>
            <textarea rows="2" class="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-medium focus:outline-none" readonly>Preencha todas as sextas-feiras antes de enviar suas fotos de evolução.</textarea>
          </div>
        </div>

        <!-- QUESTIONS LIST -->
        <div class="space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold uppercase tracking-wider text-white">Perguntas (3)</span>
            <span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">+ Adicionar</span>
          </div>

          <!-- Q1: SCALE -->
          <div class="p-3.5 rounded-2xl bg-[#1a1c20] border border-white/10 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-emerald-400">#1 • Escala (0 a 10)</span>
              <span class="text-[10px] font-semibold text-zinc-400">Obrigatória</span>
            </div>
            <p class="text-xs font-semibold text-white">Como você avalia seu nível de energia e cansaço nos treinos?</p>
            <div class="flex justify-between text-[10px] text-zinc-400 pt-1">
              <span>0 (Muito cansado)</span>
              <span>10 (Muito disposto)</span>
            </div>
          </div>

          <!-- Q2: SINGLE CHOICE -->
          <div class="p-3.5 rounded-2xl bg-[#1a1c20] border border-white/10 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-emerald-400">#2 • Escolha única</span>
              <span class="text-[10px] font-semibold text-zinc-400">Obrigatória</span>
            </div>
            <p class="text-xs font-semibold text-white">Conseguiu bater a meta diária de água (3L+)?</p>
            <div class="space-y-1 pt-1">
              <div class="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[11px] text-zinc-300">1. Sim, todos os dias</div>
              <div class="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[11px] text-zinc-300">2. Na maioria dos dias</div>
              <div class="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[11px] text-zinc-300">3. Menos de 2L por dia</div>
            </div>
          </div>

          <!-- Q3: LONG TEXT -->
          <div class="p-3.5 rounded-2xl bg-[#1a1c20] border border-white/10 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-emerald-400">#3 • Texto longo</span>
              <span class="text-[10px] text-zinc-500">Opcional</span>
            </div>
            <p class="text-xs font-semibold text-white">Observações ou dificuldades encontradas na dieta?</p>
          </div>
        </div>
      </div>

      <!-- STICKY FOOTER -->
      <div class="sticky bottom-0 bg-[#151619]/95 backdrop-blur-md border-t border-white/10 p-4 pb-6 flex items-center justify-end gap-2.5">
        <button class="px-3.5 py-2.5 rounded-xl bg-white/5 text-xs font-semibold text-zinc-300">Cancelar</button>
        <button class="px-3.5 py-2.5 rounded-xl bg-white/10 text-xs font-bold text-white">Salvar Rascunho</button>
        <button class="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold shadow-md">Publicar Modelo</button>
      </div>
    </div>
    ` : view === "assign" ? `
    <!-- SCREEN (B): ASSIGN FORM MODAL -->
    <div class="w-full bg-[#151619] border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden m-0">
      <!-- DRAG HANDLE -->
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
          <label class="text-xs font-bold text-zinc-200 block">Modelo do Formulário *</label>
          <div class="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white font-medium flex items-center justify-between">
            <span>Check-in Semanal de Evolução (3 perguntas)</span>
            <span class="text-emerald-400 text-xs">▼</span>
          </div>
        </div>

        <!-- DUE DATE -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-zinc-200 block">Prazo para Resposta (opcional)</label>
          <div class="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white font-medium">
            10/11/2026
          </div>
        </div>

        <!-- BULK TOGGLE -->
        <div class="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
          <div>
            <span class="text-xs font-bold text-white block">Enviar para todos os alunos ativos</span>
            <span class="text-[11px] text-zinc-400">Dispara para a base inteira (42 alunos)</span>
          </div>
          <div class="w-5 h-5 rounded-md border border-white/20 bg-zinc-800"></div>
        </div>

        <!-- STUDENT SEARCH & LIST -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-zinc-200">Selecionar Alunos (1 selecionado)</label>
            <span class="text-[11px] font-bold text-emerald-400">Selecionar todos</span>
          </div>
          <input type="text" placeholder="Buscar aluno por nome..." value="Patricia Ramos" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white" readonly />

          <div class="space-y-1.5 border border-white/10 rounded-2xl p-2 bg-white/[0.02]">
            <div class="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-white">
              <div>
                <span class="text-xs font-bold block">Patricia Ramos</span>
                <span class="text-[10px] text-zinc-400 block">patricia.ramos@email.com • (11) 98765-4321</span>
              </div>
              <div class="w-4 h-4 rounded-md bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">✓</div>
            </div>

            <div class="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 text-zinc-300">
              <div>
                <span class="text-xs font-bold block">Carlos Alberto Silva</span>
                <span class="text-[10px] text-zinc-500 block">carlos.silva@email.com</span>
              </div>
              <div class="w-4 h-4 rounded-md border border-white/20"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- STICKY FOOTER -->
      <div class="sticky bottom-0 bg-[#151619]/95 backdrop-blur-md border-t border-white/10 p-4 pb-6 flex items-center justify-end gap-2.5">
        <button class="px-4 py-2.5 rounded-xl bg-white/5 text-xs font-semibold text-zinc-300">Cancelar</button>
        <button class="px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold shadow-md">Atribuir Formulário</button>
      </div>
    </div>
    ` : view === "runner" ? `
    <!-- SCREEN (C): STUDENT FORM RUNNER -->
    <div class="w-full bg-[#151619] border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden m-0">
      <!-- DRAG HANDLE -->
      <div class="w-full pt-3 pb-1 flex justify-center shrink-0">
        <div class="w-12 h-1.5 bg-zinc-700 rounded-full"></div>
      </div>

      <!-- HEADER -->
      <div class="px-4 py-3 border-b border-white/10 flex items-start justify-between shrink-0">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
              Preenchimento de Formulário
            </span>
            <span class="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Rascunho salvo
            </span>
          </div>
          <h2 class="text-base font-bold text-white mt-0.5">
            Check-in Semanal de Evolução
          </h2>
        </div>
      </div>

      <!-- BODY -->
      <div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <!-- Q1: SCALE -->
        <div class="p-4 rounded-2xl bg-[#1a1c20] border border-white/10 space-y-3">
          <div class="flex items-start gap-2.5">
            <span class="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
            <label class="text-xs font-bold text-white">Como você avalia seu nível de energia e cansaço nos treinos? *</label>
          </div>
          <div class="pl-7 space-y-2">
            <div class="flex items-center gap-1 overflow-x-auto pb-1">
              ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `
                <div class="flex-1 min-w-[24px] h-8 rounded-lg text-xs font-bold flex items-center justify-center ${n === 8 ? 'bg-emerald-500 text-white shadow-xs' : 'bg-white/10 text-zinc-300'}">${n}</div>
              `).join('')}
            </div>
            <div class="flex justify-between text-[10px] text-zinc-400">
              <span>Muito cansado</span>
              <span>Muito disposto</span>
            </div>
          </div>
        </div>

        <!-- Q2: SINGLE CHOICE -->
        <div class="p-4 rounded-2xl bg-[#1a1c20] border border-white/10 space-y-3">
          <div class="flex items-start gap-2.5">
            <span class="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
            <label class="text-xs font-bold text-white">Conseguiu bater a meta diária de água (3L+)? *</label>
          </div>
          <div class="pl-7 space-y-1.5">
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/50 text-white font-semibold text-xs">
              <span>Sim, todos os dias</span>
              <div class="w-4 h-4 rounded-full border border-emerald-500 bg-emerald-500 flex items-center justify-center">
                <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
            </div>
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-xs">
              <span>Na maioria dos dias</span>
              <div class="w-4 h-4 rounded-full border border-white/20"></div>
            </div>
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-xs">
              <span>Menos de 2L por dia</span>
              <div class="w-4 h-4 rounded-full border border-white/20"></div>
            </div>
          </div>
        </div>

        <!-- Q3: LONG TEXT -->
        <div class="p-4 rounded-2xl bg-[#1a1c20] border border-white/10 space-y-3">
          <div class="flex items-start gap-2.5">
            <span class="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
            <label class="text-xs font-bold text-white">Observações ou dificuldades encontradas na dieta?</label>
          </div>
          <div class="pl-7">
            <div class="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white">
              Senti um pouco de fome no meio da tarde na quarta-feira, mas consegui manter 100% o plano alimentar. Treinos foram ótimos!
            </div>
          </div>
        </div>
      </div>

      <!-- STICKY FOOTER -->
      <div class="sticky bottom-0 bg-[#151619]/95 backdrop-blur-md border-t border-white/10 p-4 pb-6 flex items-center justify-end gap-2.5">
        <button class="px-4 py-2.5 rounded-xl bg-white/5 text-xs font-semibold text-zinc-300">Salvar Rascunho</button>
        <button class="px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold shadow-md">Enviar Respostas</button>
      </div>
    </div>
    ` : `
    <!-- SCREEN (D): ADMIN REVIEW MODAL -->
    <div class="w-full bg-[#151619] border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden m-0">
      <!-- DRAG HANDLE -->
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
            <span class="text-xs font-bold text-white block">Patricia Ramos</span>
            <span class="text-[10px] text-zinc-400">patricia.ramos@email.com • (11) 98765-4321</span>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-zinc-400 uppercase font-semibold block">Enviado em</span>
            <span class="text-xs font-medium text-zinc-300">Hoje às 14:32</span>
          </div>
        </div>

        <!-- RESPONSES -->
        <div class="space-y-2.5">
          <span class="text-[11px] font-bold uppercase tracking-wider text-white">Respostas do Aluno</span>

          <div class="p-3.5 rounded-2xl bg-[#1a1c20] border border-white/10 space-y-2">
            <span class="text-[11px] font-bold text-white block">1. Nível de energia e cansaço nos treinos</span>
            <div class="pl-2">
              <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-block">
                Nota 8 / 10 (Muito disposto)
              </span>
            </div>
          </div>

          <div class="p-3.5 rounded-2xl bg-[#1a1c20] border border-white/10 space-y-2">
            <span class="text-[11px] font-bold text-white block">2. Meta diária de água (3L+)</span>
            <div class="pl-2">
              <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/10 text-white border border-white/10 inline-block">
                Sim, todos os dias
              </span>
            </div>
          </div>

          <div class="p-3.5 rounded-2xl bg-[#1a1c20] border border-white/10 space-y-2">
            <span class="text-[11px] font-bold text-white block">3. Observações ou dificuldades</span>
            <div class="pl-2 text-xs text-zinc-300 leading-relaxed">
              "Senti um pouco de fome no meio da tarde na quarta-feira, mas consegui manter 100% o plano alimentar. Treinos foram ótimos!"
            </div>
          </div>
        </div>

        <!-- REVIEWER NOTES -->
        <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
          <label class="text-xs font-bold text-zinc-200 block">Feedback / Parecer do Profissional</label>
          <textarea rows="2" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white" readonly>Excelente consistência, Patricia! Vamos manter o volume de água e incluir um lanche proteico extra na quarta.</textarea>
        </div>
      </div>

      <!-- STICKY FOOTER -->
      <div class="sticky bottom-0 bg-[#151619]/95 backdrop-blur-md border-t border-white/10 p-4 pb-6 flex items-center justify-end gap-2.5">
        <button class="px-4 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold">Solicitar Ajustes</button>
        <button class="px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold shadow-md">Aprovar Formulário</button>
      </div>
    </div>
    `}

  </div>
</body>
</html>`;
}

async function run() {
  const browserPath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

  const views = [
    { name: "builder", filename: "admin-forms-builder-375px.png", label: "A (Builder)" },
    { name: "assign", filename: "admin-forms-assign-375px.png", label: "B (Assign)" },
    { name: "runner", filename: "student-form-runner-375px.png", label: "C (Runner)" },
    { name: "review", filename: "admin-form-review-375px.png", label: "D (Review)" },
  ];

  for (const v of views) {
    const tmpHtml = path.join(os.tmpdir(), `forms_${v.name}_${Date.now()}.html`);
    fs.writeFileSync(tmpHtml, getHtml(v.name), "utf8");
    const outPath = path.join(ARTIFACT_DIR, v.filename);
    const fileUrl = `file:///${tmpHtml.replace(/\\/g, "/")}`;

    try {
      execSync(`"${browserPath}" --headless=new --disable-gpu --window-size=375,812 --screenshot="${outPath}" "${fileUrl}"`);
      console.log(`✓ Screenshot ${v.label} gerado:`, outPath);
    } finally {
      try {
        fs.unlinkSync(tmpHtml);
      } catch {}
    }
  }

  console.log("Todos os 4 screenshots mobile foram gerados com sucesso!");
}

run().catch(console.error);
