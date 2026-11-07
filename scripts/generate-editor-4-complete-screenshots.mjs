import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

const ARTIFACT_DIR = "C:\\Users\\User\\.gemini\\antigravity\\brain\\bda29c4f-b0d7-4433-9298-37b93b4df5ec";

function getEditorHtml({ state = "empty" } = {}) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>trevoone - Editor de Treinos 4.0</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #F5F5F0; margin: 0; padding: 0; }
  </style>
</head>
<body class="bg-[#F5F5F0] text-[#102E23] antialiased min-h-screen">

  <!-- 1. HEADER DO EDITOR -->
  <header class="sticky top-0 z-30 w-full bg-[#F5F5F0]/95 backdrop-blur-md border-b border-[#E5E8E2] py-2 sm:py-3">
    <div class="w-full max-w-7xl mx-auto px-3 sm:px-6">
      
      <!-- MOBILE LAYOUT (< sm): 2 Clean Rows -->
      <div class="flex flex-col gap-2 sm:hidden">
        <!-- Row 1: Voltar + Nome do Treino + Status de Salvamento -->
        <div class="flex items-center justify-between gap-2">
          <div class="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-[#E5E8E2] text-[#102E23] shadow-2xs">
            <svg class="w-4 h-4 text-[#526058]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 text-left w-full group py-0.5">
              <span class="text-sm font-extrabold text-[#102E23] truncate leading-tight">
                Treino Hipertrofia A/B/C
              </span>
              <svg class="w-3 h-3 text-[#6B7870] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"/></svg>
            </div>
          </div>

          <div class="shrink-0">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDF5F0] text-[#176B49] border border-[#C6E2D1]">
              <svg class="w-2.5 h-2.5 text-[#176B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
              <span>Salvo</span>
            </span>
          </div>
        </div>

        <!-- Row 2: Escolher Aluno + Prévia (SEM Finalizar no topo) -->
        <div class="flex items-center justify-between gap-2 pt-0.5">
          <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-dashed border-[#B8C8BC] text-xs font-bold text-[#102E23] shadow-2xs">
            <svg class="w-3.5 h-3.5 text-[#176B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
            <span>Escolher aluno</span>
          </div>

          <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5E8E2] text-xs font-bold text-[#102E23] shadow-2xs">
            <svg class="w-3.5 h-3.5 text-[#526058]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span>Prévia</span>
          </div>
        </div>
      </div>

      <!-- DESKTOP LAYOUT (>= sm): Linha Única Completa -->
      <div class="hidden sm:flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5E8E2] text-xs font-bold text-[#102E23] shadow-2xs shrink-0">
            <svg class="w-3.5 h-3.5 text-[#526058]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>
            <span>Voltar</span>
          </div>

          <div class="group inline-flex items-center gap-2 cursor-pointer py-1 px-2 rounded-xl hover:bg-black/5 transition-colors max-w-md">
            <h1 class="text-xl lg:text-2xl font-extrabold text-[#102E23] tracking-tight leading-tight truncate">
              Treino Hipertrofia A/B/C
            </h1>
            <svg class="w-3.5 h-3.5 text-[#6B7870] group-hover:text-[#176B49] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"/></svg>
          </div>

          <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-800 border border-amber-500/20 shrink-0">
            Em elaboração
          </span>

          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EDF5F0] text-[#176B49] border border-[#C6E2D1] shrink-0">
            <svg class="w-3 h-3 text-[#176B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            <span>Salvo</span>
          </span>
        </div>

        <div class="flex items-center gap-2.5 shrink-0">
          <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-dashed border-[#B8C8BC] text-xs font-bold text-[#102E23] shadow-2xs">
            <svg class="w-3.5 h-3.5 text-[#176B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
            <span>Escolher aluno</span>
          </div>

          <div class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#E5E8E2] text-xs font-bold text-[#102E23] shadow-2xs">
            <svg class="w-3.5 h-3.5 text-[#526058]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span>Prévia</span>
          </div>

          <div class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#176B49] text-white text-xs font-bold shadow-xs">
            <span>Finalizar</span>
            <span>→</span>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- 2. BARRA DE DIVISÕES -->
  <div class="w-full bg-white border-b border-[#E5E8E2] px-3 sm:px-6 py-2">
    <div class="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
      <div class="flex items-center gap-2">
        <button class="px-4 py-2 rounded-xl text-xs font-black bg-[#102E23] text-white shadow-2xs">
          A • Peito e Tríceps
        </button>
        <button class="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F5F5F0] text-[#526058] hover:bg-[#E8F0EA] border border-[#E5E8E2]">
          B • Costas e Bíceps
        </button>
        <button class="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F5F5F0] text-[#526058] hover:bg-[#E8F0EA] border border-[#E5E8E2]">
          C • Pernas e Ombros
        </button>
        <button class="px-3 py-2 rounded-xl text-xs font-bold text-[#176B49] border border-dashed border-[#B8C8BC] bg-[#F5F5F0]">
          + Nova divisão
        </button>
      </div>
    </div>
  </div>

  <!-- 3. CORPO PRINCIPAL DO EDITOR -->
  <main class="w-full max-w-4xl mx-auto px-3 sm:px-6 py-6 pb-28">

    ${state === "empty" ? `
    <!-- EMPTY STATE COMPACTO E AÇÃO DIRETA COM BUSCA INTEGRADA -->
    <div class="w-full max-w-2xl mx-auto bg-white border border-[#E5E8E2] rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
      <!-- Título Amigável -->
      <div class="text-center space-y-1">
        <h2 class="text-base sm:text-lg font-extrabold text-[#102E23]">
          Vamos adicionar o primeiro exercício?
        </h2>
        <p class="text-xs sm:text-sm text-[#526058]">
          Digite o nome para buscar na biblioteca ou escolha um método avançado.
        </p>
      </div>

      <!-- Barra de Busca Funcional Integrada -->
      <div class="space-y-3">
        <div class="relative">
          <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7870] w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
          <input
            type="text"
            value="Supino"
            placeholder="Buscar exercício..."
            class="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#F5F5F0] border border-[#176B49] bg-white text-sm text-[#102E23] placeholder-[#6B7870] outline-none shadow-2xs font-sans"
          />
        </div>

        <!-- Resultados da Busca com 1 Toque -->
        <div class="divide-y divide-[#F0F2ED] border border-[#F0F2ED] rounded-2xl overflow-hidden bg-white shadow-2xs">
          <div class="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-[#F5F5F0] transition-colors">
            <div class="min-w-0 flex-1">
              <p class="text-xs sm:text-sm font-bold text-[#102E23] truncate">
                Supino reto com barra
              </p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-[10px] font-semibold text-[#176B49] bg-[#E8F0EA] px-1.5 py-0.5 rounded-md">Peito</span>
                <span class="text-[10px] text-[#526058]">• Barra</span>
              </div>
            </div>
            <button class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#176B49] text-white shadow-2xs">
              + Adicionar
            </button>
          </div>

          <div class="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-[#F5F5F0] transition-colors">
            <div class="min-w-0 flex-1">
              <p class="text-xs sm:text-sm font-bold text-[#102E23] truncate">
                Supino inclinado com halteres
              </p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-[10px] font-semibold text-[#176B49] bg-[#E8F0EA] px-1.5 py-0.5 rounded-md">Peito</span>
                <span class="text-[10px] text-[#526058]">• Halteres</span>
              </div>
            </div>
            <button class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8F0EA] text-[#176B49] shadow-2xs">
              + Adicionar
            </button>
          </div>
        </div>
      </div>

      <!-- Ação Secundária: Escolher Método de Treino -->
      <div class="pt-2 border-t border-[#F0F2ED] flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#102E23] bg-[#F5F5F0] border border-[#E5E8E2] shadow-2xs">
          <span>⚡ Escolher método de treino</span>
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
        </div>

        <button class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#176B49]">
          <span>Ver biblioteca completa →</span>
        </button>
      </div>
    </div>
    ` : `
    <!-- ESTADO PREENCHIDO COM EXERCÍCIOS, BI-SET E DIVISORES -->
    <div class="w-full space-y-3">
      <!-- Exercício 1 -->
      <div class="w-full bg-white border border-[#E5E8E2] rounded-2xl p-4 shadow-xs space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0 flex-1">
            <span class="w-7 h-7 rounded-xl bg-[#F0F5F2] text-[#176B49] text-xs font-black flex items-center justify-center shrink-0">01</span>
            <div>
              <h3 class="text-sm sm:text-base font-bold text-[#102E23]">Supino reto com barra</h3>
              <div class="flex items-center gap-1.5 mt-1">
                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E8F0EA] text-[#176B49]">Peito</span>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#F5F5F0] text-[#526058]">Barra</span>
                <span class="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-600">▶ Vídeo</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1 bg-[#F5F5F0] p-1 rounded-xl">
            <button class="w-7 h-7 rounded-lg flex items-center justify-center text-[#526058] hover:bg-white text-xs">↑</button>
            <button class="w-7 h-7 rounded-lg flex items-center justify-center text-[#526058] hover:bg-white text-xs">↓</button>
            <button class="w-7 h-7 rounded-lg flex items-center justify-center text-[#526058] hover:bg-white text-xs">⧉</button>
            <button class="w-7 h-7 rounded-lg flex items-center justify-center text-[#DC2626] hover:bg-white text-xs">✕</button>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-2 pt-1 border-t border-[#F0F2ED]">
          <div class="p-2 rounded-xl bg-[#FBFBF9] border border-[#EAEFEA]">
            <span class="text-[10px] font-bold uppercase text-[#6B7870] block">Séries</span>
            <span class="text-sm font-extrabold text-[#102E23]">4</span>
          </div>
          <div class="p-2 rounded-xl bg-[#FBFBF9] border border-[#EAEFEA]">
            <span class="text-[10px] font-bold uppercase text-[#6B7870] block">Reps</span>
            <span class="text-sm font-extrabold text-[#102E23]">8-10</span>
          </div>
          <div class="p-2 rounded-xl bg-[#FBFBF9] border border-[#EAEFEA]">
            <span class="text-[10px] font-bold uppercase text-[#6B7870] block">Carga</span>
            <span class="text-sm font-extrabold text-[#102E23]">80 kg</span>
          </div>
          <div class="p-2 rounded-xl bg-[#FBFBF9] border border-[#EAEFEA]">
            <span class="text-[10px] font-bold uppercase text-[#6B7870] block">Descanso</span>
            <span class="text-sm font-extrabold text-[#102E23]">90 s</span>
          </div>
        </div>
      </div>

      <!-- Inserir aqui Divider -->
      <div class="flex items-center justify-center py-1">
        <button class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white text-[#526058] border border-[#E5E8E2] shadow-2xs">
          <span>+ Inserir aqui</span>
        </button>
      </div>

      <!-- Bi-set Combinado -->
      <div class="w-full bg-[#FAFBF9] border-2 border-blue-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-[#E5E8E2]">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              ⚡ BI-SET
            </span>
            <span class="text-xs font-bold text-[#102E23]">2 exercícios combinados</span>
          </div>
          <div class="flex items-center gap-1.5">
            <button class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-[#E5E8E2] text-[#526058]">Inverter</button>
            <button class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-[#E5E8E2] text-[#526058]">Desmembrar</button>
          </div>
        </div>

        <div class="space-y-2">
          <!-- Item A -->
          <div class="p-3 rounded-2xl bg-white border border-[#E5E8E2] flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 text-xs font-black flex items-center justify-center">A</span>
              <span class="text-sm font-bold text-[#102E23]">Crucifixo com halteres</span>
            </div>
            <span class="text-xs font-semibold text-[#526058]">3x 12 reps • 60s</span>
          </div>
          <!-- Item B -->
          <div class="p-3 rounded-2xl bg-white border border-[#E5E8E2] flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 text-xs font-black flex items-center justify-center">B</span>
              <span class="text-sm font-bold text-[#102E23]">Tríceps testa na polia</span>
            </div>
            <span class="text-xs font-semibold text-[#526058]">3x 12 reps • 90s</span>
          </div>
        </div>
      </div>
    </div>
    `}
  </main>

  <!-- 4. BARRA DE ATALHOS FIXA (DOCK) -->
  <aside aria-label="Barra de ações do editor" class="fixed inset-x-0 bottom-0 z-40 px-2 sm:px-4 pb-3 flex justify-center pointer-events-none">
    <div class="pointer-events-auto bg-[#102E23] text-white rounded-2xl sm:rounded-full p-1 sm:p-1.5 shadow-2xl border border-[#163E27] grid grid-cols-5 sm:flex sm:items-center sm:justify-center gap-1 sm:gap-2 w-full max-w-lg">
      
      <!-- 1. Adicionar -->
      <button class="min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3.5 rounded-xl sm:rounded-full text-white bg-[#176B49] shadow-xs min-h-[44px]">
        <svg class="w-4 h-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
        <span class="text-[10px] sm:text-xs font-bold tracking-tight truncate w-full text-center leading-tight">Adicionar</span>
      </button>

      <!-- 2. Modelos -->
      <button class="min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 rounded-xl sm:rounded-full text-white/90 min-h-[44px]">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
        <span class="text-[10px] sm:text-xs font-semibold tracking-tight truncate w-full text-center leading-tight">Modelos</span>
      </button>

      <!-- 3. Me ajuda -->
      <button class="min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 rounded-xl sm:rounded-full text-emerald-300 min-h-[44px]">
        <svg class="w-4 h-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
        <span class="text-[10px] sm:text-xs font-bold tracking-tight truncate w-full text-center leading-tight">Me ajuda</span>
      </button>

      <!-- 4. Organizar -->
      <button class="min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 rounded-xl sm:rounded-full text-white/90 min-h-[44px]">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"/></svg>
        <span class="text-[10px] sm:text-xs font-semibold tracking-tight truncate w-full text-center leading-tight">Organizar</span>
      </button>

      <!-- 5. Finalizar -->
      <button class="min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3.5 rounded-xl sm:rounded-full bg-white text-[#102E23] shadow-xs min-h-[44px]">
        <svg class="w-4 h-4 shrink-0 text-[#176B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span class="text-[10px] sm:text-xs font-bold tracking-tight truncate w-full text-center leading-tight">Finalizar</span>
      </button>

    </div>
  </aside>

</body>
</html>`;
}

async function run() {
  const browserPath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

  const targets = [
    { state: "empty", filename: "editor-4-empty-mobile-320px.png", w: 320, h: 600 },
    { state: "empty", filename: "editor-4-empty-mobile-360px.png", w: 360, h: 740 },
    { state: "empty", filename: "editor-4-empty-mobile-375px.png", w: 375, h: 667 },
    { state: "empty", filename: "editor-4-empty-mobile-390px.png", w: 390, h: 844 },
    { state: "empty", filename: "editor-4-empty-mobile-412px.png", w: 412, h: 915 },
    { state: "empty", filename: "editor-4-empty-desktop-1366px.png", w: 1366, h: 768 },
    { state: "populated", filename: "editor-4-populated-mobile-390px.png", w: 390, h: 844 },
    { state: "populated", filename: "editor-4-populated-tablet-768px.png", w: 768, h: 1024 },
    { state: "populated", filename: "editor-4-populated-tablet-820px.png", w: 820, h: 1180 },
    { state: "populated", filename: "editor-4-populated-desktop-1024px.png", w: 1024, h: 768 },
    { state: "populated", filename: "editor-4-populated-desktop-1366px.png", w: 1366, h: 768 },
    { state: "populated", filename: "editor-4-populated-desktop-1920px.png", w: 1920, h: 1080 },
  ];

  for (const t of targets) {
    const tmpHtml = path.join(os.tmpdir(), `editor_4_${t.state}_${Date.now()}.html`);
    fs.writeFileSync(tmpHtml, getEditorHtml({ state: t.state }), "utf8");
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

  console.log("Todos os screenshots do Editor 4.0 foram gerados com sucesso!");
}

run().catch(console.error);
