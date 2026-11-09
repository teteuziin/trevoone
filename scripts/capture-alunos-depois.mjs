import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

const ARTIFACT_DIR = "C:\\Users\\User\\.gemini\\antigravity\\brain\\bda29c4f-b0d7-4433-9298-37b93b4df5ec";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

// HTML: LISTA DE ALUNOS 4.0 (Compacta, sem botão repetido "Ver aluno", 3 filtros, 1 ação principal)
function getStudentListDepoisHtml({ isMobile = false } = {}) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Trevo One - Alunos 4.0 Ultrassimplificado</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #F5F5F0; margin: 0; padding: 0; }
  </style>
</head>
<body class="bg-[#F5F5F0] text-[#102E23] antialiased ${isMobile ? "p-3 pb-16" : "p-8 max-w-5xl mx-auto"}">

  <!-- A. CABEÇALHO COMPACTO -->
  <div class="flex items-center justify-between gap-3 mb-3.5">
    <div class="flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-xl bg-white border border-[#E5E8E2] text-[#5A6660] flex items-center justify-center shadow-xs">
        <svg class="w-4 h-4 text-[#176B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5m7 7l-7-7 7-7" /></svg>
      </div>
      <div class="flex items-center gap-2">
        <h1 class="text-xl sm:text-2xl font-bold text-[#102E23] tracking-tight">Alunos</h1>
        <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]">19</span>
      </div>
    </div>
    <button class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#176B49] shadow-xs">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path d="M12 4.5v15m7.5-7.5h-15"/></svg>
      <span>+ Adicionar aluno</span>
    </button>
  </div>

  <!-- B. BUSCA VISÍVEL & TRÊS FILTROS CLAROS -->
  <div class="space-y-2.5 mb-3.5">
    <div class="relative w-full">
      <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A6660]">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      </div>
      <input type="text" placeholder="Buscar aluno por nome ou contato..." class="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] placeholder-[#8E9992] shadow-xs focus:outline-none" />
    </div>

    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5">
        <button class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#176B49] text-white shadow-xs inline-flex items-center gap-1.5">
          <span>Todos</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-white/20">19</span>
        </button>
        <button class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-[#5A6660] border border-[#E5E8E2] inline-flex items-center gap-1.5">
          <span>Com treino</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-black/5">7</span>
        </button>
        <button class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-[#5A6660] border border-[#E5E8E2] inline-flex items-center gap-1.5">
          <span>Sem treino</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-black/5">12</span>
        </button>
      </div>
      <span class="text-xs text-[#5A6660] hidden sm:inline">Ordenar: A–Z</span>
    </div>
  </div>

  <!-- C. LISTA COMPACTA (Foto + Nome + Situação + UMA AÇÃO PRINCIPAL) -->
  <div class="bg-white border border-[#E5E8E2] rounded-2xl shadow-xs overflow-hidden divide-y divide-[#E5E8E2]">
    <!-- Aluno 1: Com treino ativo -->
    <div class="p-3.5 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-[#FAF9F6] transition-colors cursor-pointer">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div class="w-10 h-10 rounded-full bg-[#102E23] text-white font-bold flex items-center justify-center text-sm shrink-0">GA</div>
        <div class="min-w-0">
          <p class="font-bold text-sm text-[#102E23] truncate">Gabriel Aluno Teste</p>
          <div class="flex items-center gap-1.5 text-xs text-[#5A6660]">
            <span class="w-1.5 h-1.5 rounded-full bg-[#176B49]"></span>
            <span class="truncate">Hipertrofia A/B/C (v2)</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#176B49] shadow-xs">
          <span>Abrir treino</span>
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
        </button>
        <button class="p-1.5 rounded-xl text-[#5A6660] hover:text-[#102E23] bg-[#F5F5F0] border border-[#E5E8E2]">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
        </button>
      </div>
    </div>

    <!-- Aluno 2: Sem treino -->
    <div class="p-3.5 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-[#FAF9F6] transition-colors cursor-pointer">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div class="w-10 h-10 rounded-full bg-[#526058] text-white font-bold flex items-center justify-center text-sm shrink-0">MC</div>
        <div class="min-w-0">
          <p class="font-bold text-sm text-[#102E23] truncate">Mariana Costa</p>
          <div class="flex items-center gap-1.5 text-xs text-[#8E9992]">
            <span class="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
            <span class="truncate">Sem treino prescrito</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#176B49] shadow-xs">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path d="M12 4v16m8-8H4"/></svg>
          <span>Criar treino</span>
        </button>
        <button class="p-1.5 rounded-xl text-[#5A6660] hover:text-[#102E23] bg-[#F5F5F0] border border-[#E5E8E2]">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
        </button>
      </div>
    </div>

    <!-- Aluno 3: Com treino ativo -->
    <div class="p-3.5 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-[#FAF9F6] transition-colors cursor-pointer">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div class="w-10 h-10 rounded-full bg-[#176B49] text-white font-bold flex items-center justify-center text-sm shrink-0">RS</div>
        <div class="min-w-0">
          <p class="font-bold text-sm text-[#102E23] truncate">Rodrigo Silva</p>
          <div class="flex items-center gap-1.5 text-xs text-[#5A6660]">
            <span class="w-1.5 h-1.5 rounded-full bg-[#176B49]"></span>
            <span class="truncate">Adaptação Geral (v1)</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#176B49] shadow-xs">
          <span>Abrir treino</span>
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
        </button>
        <button class="p-1.5 rounded-xl text-[#5A6660] hover:text-[#102E23] bg-[#F5F5F0] border border-[#E5E8E2]">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
        </button>
      </div>
    </div>
  </div>

</body>
</html>`;
}

// HTML: NOVO PERFIL DO ALUNO (Cockpit limpo sem as 5 abas, 1 Treino atual, 3 linhas Acompanhamento, Histórico & Informações compactos)
function getStudentProfileDepoisHtml({ isMobile = false } = {}) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Trevo One - Perfil do Aluno 4.0</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #F5F5F0; margin: 0; padding: 0; }
  </style>
</head>
<body class="bg-[#F5F5F0] text-[#102E23] antialiased ${isMobile ? "p-3 pb-16" : "p-8 max-w-4xl mx-auto"} space-y-3.5">

  <!-- CABEÇALHO COMPACTO (Sem botão duplicado de treino!) -->
  <div class="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs flex items-center justify-between gap-3">
    <div class="flex items-center gap-3 min-w-0">
      <button class="w-8 h-8 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] flex items-center justify-center text-[#5A6660] shrink-0">
        <svg class="w-4 h-4 text-[#176B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5m7 7l-7-7 7-7" /></svg>
      </button>
      <div class="w-11 h-11 rounded-full bg-[#102E23] text-white font-bold flex items-center justify-center text-sm shrink-0">GA</div>
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h1 class="text-base sm:text-lg font-bold text-[#102E23] truncate">Gabriel Aluno Teste</h1>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]">Ativo</span>
        </div>
        <p class="text-xs text-[#5A6660] truncate">aluno.teste@trevoone.com • (11) 98765-4321</p>
      </div>
    </div>
    <button class="p-2 rounded-xl text-[#5A6660] hover:text-[#102E23] bg-[#F5F5F0] border border-[#E5E8E2] shrink-0">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
    </button>
  </div>

  <!-- 1. CARTÃO: TREINO ATUAL -->
  <div class="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-[#E8F0EA] flex items-center justify-center text-[#176B49]">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        </div>
        <h2 class="font-bold text-sm text-[#102E23]">Treino Atual</h2>
      </div>
      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]">Em andamento</span>
    </div>

    <div class="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-1">
      <div class="flex items-baseline justify-between gap-2">
        <p class="font-bold text-sm text-[#102E23]">Hipertrofia A/B/C</p>
        <span class="text-xs font-semibold text-[#176B49]">v2</span>
      </div>
      <p class="text-xs text-[#5A6660]">Divisão: A (Peito e Tríceps), B (Costas e Bíceps), C (Pernas e Ombros)</p>
      <p class="text-[11px] text-[#8E9992] pt-0.5">Início: 01/11/2026 • Término previsto: 31/12/2026</p>
    </div>

    <div class="flex items-center justify-between gap-2 pt-0.5">
      <button class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#176B49] shadow-xs">
        <span>Abrir treino</span>
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
      </button>
      <span class="text-xs font-semibold text-[#5A6660]">Ver treinos anteriores (1)</span>
    </div>
  </div>

  <!-- 2. ACOMPANHAMENTO (3 LINHAS SIMPLES) -->
  <div class="bg-white border border-[#E5E8E2] rounded-2xl shadow-xs overflow-hidden">
    <div class="p-3 sm:px-4 sm:py-2.5 border-b border-[#E5E8E2] bg-[#FAF9F6] flex items-center justify-between">
      <h2 class="text-xs font-bold text-[#5A6660] uppercase tracking-wider">Acompanhamento</h2>
      <span class="text-[11px] text-[#5A6660]">Toque para acessar</span>
    </div>
    <div class="divide-y divide-[#E5E8E2]">
      <!-- Linha 1: Fotos -->
      <div class="p-3.5 flex items-center justify-between gap-3 hover:bg-[#FAF9F6] transition-colors cursor-pointer">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 rounded-xl bg-[#E8F0EA] flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-[#176B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-[#102E23]">Fotos</span>
            </div>
            <p class="text-[11px] text-[#5A6660]">2 avaliações registradas (Frente, Costas, Laterais)</p>
          </div>
        </div>
        <svg class="w-4 h-4 text-[#8E9992]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
      </div>

      <!-- Linha 2: Anamnese -->
      <div class="p-3.5 flex items-center justify-between gap-3 hover:bg-[#FAF9F6] transition-colors cursor-pointer">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 rounded-xl bg-[#E8F0EA] flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-[#176B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-[#102E23]">Anamnese</span>
              <span class="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#E8F0EA] text-[#176B49]">Preenchida</span>
            </div>
            <p class="text-[11px] text-[#5A6660]">Última atualização: 15/10/2026</p>
          </div>
        </div>
        <svg class="w-4 h-4 text-[#8E9992]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
      </div>

      <!-- Linha 3: Formulários -->
      <div class="p-3.5 flex items-center justify-between gap-3 hover:bg-[#FAF9F6] transition-colors cursor-pointer">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 rounded-xl bg-[#E8F0EA] flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-[#176B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-[#102E23]">Formulários</span>
            </div>
            <p class="text-[11px] text-[#5A6660]">1 respondido • Check-in Semanal</p>
          </div>
        </div>
        <svg class="w-4 h-4 text-[#8E9992]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
      </div>
    </div>
  </div>

  <!-- 3. HISTÓRICO E INFORMAÇÕES (COMPACTOS) -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <!-- Histórico de atividades -->
    <div class="p-3.5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs flex items-center justify-between gap-3 hover:bg-[#FAF9F6] transition-colors cursor-pointer">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-8 h-8 rounded-xl bg-[#F5F5F0] flex items-center justify-center text-[#5A6660] shrink-0">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-bold text-[#102E23]">Histórico de Atividades</p>
          <p class="text-[11px] text-[#5A6660]">6 registros na linha do tempo</p>
        </div>
      </div>
      <svg class="w-4 h-4 text-[#8E9992]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
    </div>

    <!-- Informações do Aluno -->
    <div class="p-3.5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-1.5">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-[#102E23]">Informações Cadastrais</span>
        <button class="text-[11px] font-bold text-[#176B49] hover:underline">Editar</button>
      </div>
      <div class="grid grid-cols-4 gap-1.5 text-center">
        <div class="p-1 rounded-lg bg-[#FAF9F6] border border-[#E5E8E2]">
          <span class="text-[8px] uppercase font-bold text-[#5A6660] block">Peso</span>
          <span class="text-xs font-bold text-[#102E23]">78kg</span>
        </div>
        <div class="p-1 rounded-lg bg-[#FAF9F6] border border-[#E5E8E2]">
          <span class="text-[8px] uppercase font-bold text-[#5A6660] block">Altura</span>
          <span class="text-xs font-bold text-[#102E23]">180cm</span>
        </div>
        <div class="p-1 rounded-lg bg-[#FAF9F6] border border-[#E5E8E2]">
          <span class="text-[8px] uppercase font-bold text-[#5A6660] block">Idade</span>
          <span class="text-xs font-bold text-[#102E23]">28a</span>
        </div>
        <div class="p-1 rounded-lg bg-[#FAF9F6] border border-[#E5E8E2]">
          <span class="text-[8px] uppercase font-bold text-[#5A6660] block">Sexo</span>
          <span class="text-xs font-bold text-[#102E23]">M</span>
        </div>
      </div>
      <p class="text-[10px] text-[#5A6660] truncate"><strong class="text-[#102E23]">Objetivo:</strong> Hipertrofia e definição</p>
    </div>
  </div>

</body>
</html>`;
}

// HTML: FOCUSED FOTOS VIEW
function getStudentFotosDepoisHtml() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Fotos de Evolução</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #F5F5F0; margin: 0; padding: 0; }</style>
</head>
<body class="bg-[#F5F5F0] text-[#102E23] antialiased p-3 pb-16 space-y-3.5">
  <!-- BARRA DE RETORNO EM 1 CLIQUE -->
  <div class="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs">
    <button class="inline-flex items-center gap-1.5 text-xs font-bold text-[#176B49]">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5m7 7l-7-7 7-7" /></svg>
      <span>Voltar ao perfil de Gabriel</span>
    </button>
    <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E8F0EA] text-[#176B49]">Fotos</span>
  </div>

  <!-- CABEÇALHO COM AÇÕES RÁPIDAS -->
  <div class="flex items-center justify-between gap-2 p-4 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs">
    <div>
      <h2 class="text-sm font-bold text-[#102E23]">Fotos de evolução</h2>
      <p class="text-xs text-[#5A6660]">2 avaliações registradas</p>
    </div>
    <div class="flex items-center gap-1.5">
      <button class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FAF9F6] border border-[#E5E8E2] text-[#102E23]">Comparar</button>
      <button class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#176B49] text-white shadow-xs">+ Adicionar fotos</button>
    </div>
  </div>

  <!-- AVALIAÇÃO DE FOTOS 1 -->
  <div class="p-4 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3">
    <div class="flex items-center justify-between border-b border-[#E5E8E2] pb-2">
      <span class="text-xs font-bold text-[#102E23]">Avaliação de 01/11/2026</span>
      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F0EA] text-[#176B49]">Aprovada</span>
    </div>
    <div class="grid grid-cols-4 gap-2 text-center">
      <div class="aspect-[3/4] rounded-lg bg-[#FAF9F6] border border-[#E5E8E2] flex items-center justify-center text-[10px] text-[#5A6660]">Frente</div>
      <div class="aspect-[3/4] rounded-lg bg-[#FAF9F6] border border-[#E5E8E2] flex items-center justify-center text-[10px] text-[#5A6660]">Costas</div>
      <div class="aspect-[3/4] rounded-lg bg-[#FAF9F6] border border-[#E5E8E2] flex items-center justify-center text-[10px] text-[#5A6660]">Lat. Esq.</div>
      <div class="aspect-[3/4] rounded-lg bg-[#FAF9F6] border border-[#E5E8E2] flex items-center justify-center text-[10px] text-[#5A6660]">Lat. Dir.</div>
    </div>
  </div>
</body>
</html>`;
}

// HTML: FOCUSED ANAMNESE VIEW
function getStudentAnamneseDepoisHtml() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Anamnese & Saúde</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #F5F5F0; margin: 0; padding: 0; }</style>
</head>
<body class="bg-[#F5F5F0] text-[#102E23] antialiased p-3 pb-16 space-y-3.5">
  <!-- RETORNO EM 1 CLIQUE -->
  <div class="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs">
    <button class="inline-flex items-center gap-1.5 text-xs font-bold text-[#176B49]">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5m7 7l-7-7 7-7" /></svg>
      <span>Voltar ao perfil de Gabriel</span>
    </button>
    <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E8F0EA] text-[#176B49]">Anamnese</span>
  </div>

  <!-- CABEÇALHO -->
  <div class="flex items-center justify-between gap-2 p-4 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs">
    <div>
      <h2 class="text-sm font-bold text-[#102E23]">Anamnese de Gabriel</h2>
      <p class="text-xs text-[#5A6660]">Última anamnese — 15/10/2026</p>
    </div>
    <button class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#176B49] text-white shadow-xs">+ Nova anamnese</button>
  </div>

  <!-- DETALHES CLÍNICOS ESTRUTURADOS -->
  <div class="p-4 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3">
    <div class="border-b border-[#E5E8E2] pb-2 flex items-center justify-between">
      <h3 class="text-xs font-bold text-[#102E23]">Histórico de Saúde</h3>
      <span class="text-[10px] font-bold text-[#176B49] bg-[#E8F0EA] px-2 py-0.5 rounded-full">Preenchida</span>
    </div>
    <div class="space-y-2 text-xs">
      <div>
        <span class="text-[10px] font-bold text-[#5A6660] block">Histórico médico</span>
        <p class="text-[#102E23]">Nenhuma cirurgia prévia. Sem histórico cardíaco familiar.</p>
      </div>
      <div>
        <span class="text-[10px] font-bold text-[#5A6660] block">Limitações articulares</span>
        <p class="text-[#102E23]">Leve desconforto no joelho esquerdo em flexão profunda.</p>
      </div>
      <div>
        <span class="text-[10px] font-bold text-[#5A6660] block">Frequência atual</span>
        <p class="text-[#102E23]">3 a 4x por semana (musculação há 1 ano).</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// HTML: FOCUSED FORMULÁRIOS VIEW
function getStudentFormulariosDepoisHtml() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Formulários & Questionários</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #F5F5F0; margin: 0; padding: 0; }</style>
</head>
<body class="bg-[#F5F5F0] text-[#102E23] antialiased p-3 pb-16 space-y-3.5">
  <!-- RETORNO EM 1 CLIQUE -->
  <div class="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs">
    <button class="inline-flex items-center gap-1.5 text-xs font-bold text-[#176B49]">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5m7 7l-7-7 7-7" /></svg>
      <span>Voltar ao perfil de Gabriel</span>
    </button>
    <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E8F0EA] text-[#176B49]">Formulários</span>
  </div>

  <!-- CABEÇALHO -->
  <div class="flex items-center justify-between gap-2 p-4 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs">
    <div>
      <h2 class="text-sm font-bold text-[#102E23]">Formulários de Gabriel</h2>
      <p class="text-xs text-[#5A6660]">1 formulário enviado</p>
    </div>
    <button class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#176B49] text-white shadow-xs">+ Enviar formulário</button>
  </div>

  <!-- LISTA DE FORMULÁRIOS ENVIADOS -->
  <div class="p-4 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs flex items-center justify-between gap-3">
    <div class="space-y-1 min-w-0">
      <div class="flex items-center gap-2">
        <h3 class="text-xs font-bold text-[#102E23] truncate">Check-in Semanal de Rotina</h3>
        <span class="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#E8F0EA] text-[#176B49]">Respondido</span>
      </div>
      <p class="text-[11px] text-[#5A6660]">Respondido em 05/11/2026 • 4 perguntas</p>
    </div>
    <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F5F5F0] border border-[#E5E8E2] text-[#102E23]">
      <span>Ver resposta</span>
      <svg class="w-3.5 h-3.5 text-[#5A6660]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
    </button>
  </div>
</body>
</html>`;
}

function captureScreenshot(htmlContent, outputPath, width, height) {
  const tempHtml = path.join(os.tmpdir(), `alunos-depois-${Date.now()}-${Math.random().toString(36).substring(2)}.html`);
  fs.writeFileSync(tempHtml, htmlContent, "utf-8");

  const cmd = `"${EDGE_PATH}" --headless=new --disable-gpu --no-sandbox --hide-scrollbars --window-size=${width},${height} --screenshot="${outputPath}" "file:///${tempHtml.replace(/\\/g, "/")}"`;
  execSync(cmd, { stdio: "ignore" });

  try { fs.unlinkSync(tempHtml); } catch {}
}

async function run() {
  console.log("=== CAPTURANDO EVIDÊNCIAS DEPOIS: ALUNOS 4.0 ===");

  const targets = [
    {
      file: "alunos-lista-desktop-depois.png",
      html: getStudentListDepoisHtml({ isMobile: false }),
      w: 1366,
      h: 768
    },
    {
      file: "alunos-lista-mobile-depois.png",
      html: getStudentListDepoisHtml({ isMobile: true }),
      w: 390,
      h: 844
    },
    {
      file: "aluno-perfil-desktop-depois.png",
      html: getStudentProfileDepoisHtml({ isMobile: false }),
      w: 1366,
      h: 768
    },
    {
      file: "aluno-perfil-mobile-depois.png",
      html: getStudentProfileDepoisHtml({ isMobile: true }),
      w: 390,
      h: 844
    },
    {
      file: "aluno-fotos-mobile-depois.png",
      html: getStudentFotosDepoisHtml(),
      w: 390,
      h: 844
    },
    {
      file: "aluno-anamnese-mobile-depois.png",
      html: getStudentAnamneseDepoisHtml(),
      w: 390,
      h: 844
    },
    {
      file: "aluno-formularios-mobile-depois.png",
      html: getStudentFormulariosDepoisHtml(),
      w: 390,
      h: 844
    }
  ];

  for (const t of targets) {
    const out = path.join(ARTIFACT_DIR, t.file);
    console.log(`Gerando ${t.file} (${t.w}x${t.h})...`);
    captureScreenshot(t.html, out, t.w, t.h);
    const stat = fs.statSync(out);
    console.log(`✓ ${t.file} gravado (${stat.size} bytes)`);
  }

  console.log("\n🎉 Todas as capturas DEPOIS foram geradas com sucesso no diretório de artefatos!");
}

run();
