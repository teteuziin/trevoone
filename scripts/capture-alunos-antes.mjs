import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

const ARTIFACT_DIR = "C:\\Users\\User\\.gemini\\antigravity\\brain\\bda29c4f-b0d7-4433-9298-37b93b4df5ec";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

function getStudentListHtml({ isMobile = false } = {}) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Trevo One - Alunos</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #FBFBF9; margin: 0; padding: 0; }
  </style>
</head>
<body class="bg-[#FBFBF9] text-[#102E23] antialiased ${isMobile ? "p-3 pb-20" : "p-8 max-w-6xl mx-auto"}">

  <!-- CABEÇALHO -->
  <div class="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs flex flex-col gap-3 mb-4">
    <div class="flex items-center justify-between">
      <span class="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#5A6660]">
        <svg class="w-4 h-4 text-[#176B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5m7 7l-7-7 7-7" /></svg>
        <span>Voltar</span>
      </span>
    </div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-[#E8F0EA] border border-[#CDEED5] flex items-center justify-center">
          <svg class="w-5 h-5 text-[#176B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
        </div>
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-[#102E23]">Alunos</h1>
          <span class="text-xs text-[#5A6660]">19 alunos cadastrados</span>
        </div>
      </div>
      <button class="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#176B49] shadow-xs">
        + Convidar aluno
      </button>
    </div>
  </div>

  <!-- BUSCA E FILTROS -->
  <div class="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3 mb-4">
    <div class="relative w-full">
      <input type="text" placeholder="Buscar aluno por nome ou e-mail..." class="w-full h-11 pl-4 pr-10 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-sm text-[#102E23]" />
    </div>
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <button class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#176B49] text-white">Todos (19)</button>
        <button class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#F5F5F0] text-[#5A6660] border border-[#E5E8E2]">Com treino (7)</button>
        <button class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#F5F5F0] text-[#5A6660] border border-[#E5E8E2]">Sem treino (12)</button>
      </div>
      <span class="text-xs text-[#5A6660]">Ordenar: Nome (A-Z)</span>
    </div>
  </div>

  <!-- LISTA DE ALUNOS -->
  <div class="bg-white border border-[#E5E8E2] rounded-2xl shadow-xs overflow-hidden divide-y divide-[#E5E8E2]">
    <!-- Item 1: Com treino -->
    <div class="p-4 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 rounded-full bg-[#102E23] text-white font-bold flex items-center justify-center text-sm">GA</div>
        <div class="min-w-0">
          <p class="font-bold text-sm text-[#102E23] truncate">Gabriel Aluno Teste</p>
          <p class="text-xs text-[#5A6660] truncate">aluno.teste@trevoone.com</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]">
          Treino ativo: Hipertrofia A/B/C
        </span>
        <button class="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#176B49]">Abrir treino</button>
        <button class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F5F5F0] text-[#102E23] border border-[#E5E8E2]">Ver aluno</button>
      </div>
    </div>

    <!-- Item 2: Sem treino -->
    <div class="p-4 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 rounded-full bg-[#526058] text-white font-bold flex items-center justify-center text-sm">MC</div>
        <div class="min-w-0">
          <p class="font-bold text-sm text-[#102E23] truncate">Mariana Costa</p>
          <p class="text-xs text-[#5A6660] truncate">mariana.costa@email.com</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F3F4F6] text-[#5A6660] border border-[#E5E8E2]">
          Sem treino prescrito
        </span>
        <button class="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#176B49]">+ Criar treino</button>
        <button class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F5F5F0] text-[#102E23] border border-[#E5E8E2]">Ver aluno</button>
      </div>
    </div>
  </div>

</body>
</html>`;
}

function getStudentDetailHtml({ isMobile = false } = {}) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Trevo One - Perfil do Aluno</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #FBFBF9; margin: 0; padding: 0; }
  </style>
</head>
<body class="bg-[#FBFBF9] text-[#102E23] antialiased ${isMobile ? "p-3 pb-20" : "p-8 max-w-6xl mx-auto"}">

  <!-- CABEÇALHO DO PERFIL -->
  <div class="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs mb-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center gap-3.5">
        <div class="w-14 h-14 rounded-full bg-[#102E23] text-white font-bold flex items-center justify-center text-lg">GA</div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl sm:text-2xl font-bold text-[#102E23]">Gabriel Aluno Teste</h1>
            <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]">Ativo</span>
          </div>
          <p class="text-xs text-[#5A6660]">aluno.teste@trevoone.com • (11) 98765-4321</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="px-4 py-2 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#176B49] shadow-xs">Abrir treino</button>
        <button class="p-2.5 rounded-xl text-[#5A6660] bg-[#F5F5F0] border border-[#E5E8E2]">•••</button>
      </div>
    </div>
  </div>

  <!-- NAVEGAÇÃO 5 ABAS ANTIGA -->
  <div class="p-1 rounded-2xl bg-white border border-[#E5E8E2] shadow-2xs mb-4 flex items-center gap-1 overflow-x-auto">
    <button class="px-4 py-2 rounded-xl text-xs font-bold bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]">Visão Geral</button>
    <button class="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A6660]">Treinos (1)</button>
    <button class="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A6660]">Fotos (0)</button>
    <button class="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A6660]">Anamnese (Pendente)</button>
    <button class="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A6660]">Formulários (0)</button>
  </div>

  <!-- CARDS DISTRIBUÍDOS ANTIGOS -->
  <div class="space-y-4">
    <div class="p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs">
      <h3 class="font-bold text-sm text-[#102E23] mb-2">O que precisa de atenção?</h3>
      <div class="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-xs">
        <p class="font-bold text-[#102E23]">Anamnese pendente</p>
        <p class="text-[#5A6660]">O aluno ainda não preencheu o formulário de saúde.</p>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs">
        <h3 class="font-bold text-sm text-[#102E23] mb-2">Treino do Aluno</h3>
        <p class="text-xs text-[#5A6660]">Hipertrofia A/B/C (v1)</p>
        <button class="mt-3 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#176B49]">Abrir treino</button>
      </div>
      <div class="p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs">
        <h3 class="font-bold text-sm text-[#102E23] mb-2">Acompanhamento</h3>
        <p class="text-xs text-[#5A6660]">Fotos, Anamnese, Formulários</p>
      </div>
    </div>
  </div>

</body>
</html>`;
}

async function capture() {
  const targets = [
    { html: getStudentListHtml({ isMobile: false }), filename: "alunos-lista-desktop-antes.png", w: 1366, h: 768 },
    { html: getStudentListHtml({ isMobile: true }), filename: "alunos-lista-mobile-antes.png", w: 390, h: 844 },
    { html: getStudentDetailHtml({ isMobile: false }), filename: "aluno-perfil-desktop-antes.png", w: 1366, h: 768 },
    { html: getStudentDetailHtml({ isMobile: true }), filename: "aluno-perfil-mobile-antes.png", w: 390, h: 844 },
  ];

  for (const t of targets) {
    const tmp = path.join(os.tmpdir(), `evidence_${Date.now()}_${t.filename}.html`);
    fs.writeFileSync(tmp, t.html, "utf8");
    const out = path.join(ARTIFACT_DIR, t.filename);
    const fileUrl = `file:///${tmp.replace(/\\/g, "/")}`;

    try {
      execSync(`"${EDGE_PATH}" --headless=new --disable-gpu --window-size=${t.w},${t.h} --screenshot="${out}" "${fileUrl}"`);
      console.log(`[OK] Captura ANTES: ${t.filename}`);
    } finally {
      try { fs.unlinkSync(tmp); } catch {}
    }
  }
}

capture().catch(console.error);
