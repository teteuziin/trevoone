import fs from "node:fs";
import path from "node:path";

function getHtml(viewType = "normal") {
  const isError = viewType === "error";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Preview Bottom Sheet - Trevo One</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b0c0e; margin: 0; padding: 0; }
  </style>
</head>
<body class="bg-black/90 antialiased overflow-hidden select-none">
  <!-- BACKGROUND SIMULATING THE DASHBOARD UNDER OVERLAY -->
  <div class="fixed inset-0 p-4 opacity-30 pointer-events-none">
    <div class="h-10 bg-emerald-500/20 rounded-xl mb-4"></div>
    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="h-20 bg-white/10 rounded-2xl"></div>
      <div class="h-20 bg-white/10 rounded-2xl"></div>
    </div>
    <div class="h-40 bg-white/5 rounded-2xl"></div>
  </div>

  <!-- MODAL OVERLAY -->
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs">
    <!-- BOTTOM SHEET CONTAINER (FLUSH TO EDGES ON MOBILE: W-FULL, ROUNDED-T-3XL, M-0) -->
    <div class="w-full sm:max-w-md bg-[#151619] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden m-0">
      
      <!-- MOBILE DRAG HANDLE (SUBTLE AND CENTERED AT TOP) -->
      <div class="w-full pt-3 pb-1 flex justify-center sm:hidden shrink-0 bg-[#151619]">
        <div class="w-12 h-1.5 bg-zinc-700 rounded-full"></div>
      </div>

      <!-- HEADER FIXO (NO X BUTTON IN MOBILE) -->
      <div class="px-5 py-3 border-b border-white/10 flex items-start justify-between shrink-0 bg-[#151619]">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
            Nova Campanha de Divulgação
          </span>
          <h2 class="text-base font-bold text-white mt-0.5">
            Criar Link Individual de Divulgação
          </h2>
        </div>
        <button class="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center bg-white/5 text-zinc-400">
          ✕
        </button>
      </div>

      <!-- FORMULÁRIO COM CORPO ROLÁVEL E FOOTER STICKY -->
      <form class="flex flex-col flex-1 overflow-hidden" onsubmit="return false;">
        <!-- CORPO ROLÁVEL -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3.5">
          
          <!-- 1. PARTICIPANTE RESPONSÁVEL -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-zinc-300 block">
              Participante Responsável
            </label>
            <div class="relative">
              <select class="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white font-medium focus:outline-none min-h-[44px] appearance-none cursor-pointer">
                <option selected>Ana Beatriz (Aluno)</option>
                <option>Rodrigo Personal (Personal Trainer)</option>
              </select>
              <div class="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <!-- 2. TIPO DE DESTINO + CAMPO DINÂMICO ÚNICO -->
          <div class="space-y-2">
            <label class="text-xs font-bold text-zinc-300 block">
              Tipo de Destino
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" class="px-3 py-2.5 rounded-2xl text-xs font-bold min-h-[44px] flex items-center justify-center gap-2 border bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-xs ring-1 ring-emerald-500/30">
                <svg class="w-4 h-4 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                <span class="truncate">WhatsApp (Atendimento)</span>
              </button>
              <button type="button" class="px-3 py-2.5 rounded-2xl text-xs font-bold min-h-[44px] flex items-center justify-center gap-2 border bg-white/5 border-white/10 text-zinc-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 17H7A5 5 0 0 1 7 7h2m6 0h2a5 5 0 1 1 0 10h-2m-7-5h8"></path></svg>
                <span class="truncate">URL Externa</span>
              </button>
            </div>

            <!-- CAMPO DINÂMICO ÚNICO: WHATSAPP -->
            <div class="space-y-1 pt-0.5">
              <label class="text-xs font-semibold text-zinc-300 block">
                Número do WhatsApp de Atendimento
              </label>
              <input 
                type="tel" 
                value="${isError ? "" : "(71) 99876-5432"}" 
                placeholder="Ex: (71) 99999-9999"
                class="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border text-xs font-mono text-white placeholder:text-zinc-500 focus:outline-none min-h-[44px] ${isError ? "border-red-500 ring-1 ring-red-500/20" : "border-white/10"}"
              />
              ${isError ? `<p class="text-xs text-red-500 mt-1 font-medium">Informe o número do WhatsApp com DDD.</p>` : ""}
            </div>
          </div>

          <!-- 3. DESCONTO ANUNCIADO AO CLIENTE -->
          <div class="space-y-2 p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <label class="text-xs font-bold text-white block">
              Desconto Anunciado ao Cliente
            </label>
            <div class="flex items-center gap-2 pt-0.5">
              <button type="button" class="px-3 py-2 rounded-xl text-xs font-bold min-h-[40px] bg-emerald-500 text-white shadow-xs">
                10% OFF
              </button>
              <button type="button" class="px-3 py-2 rounded-xl text-xs font-bold min-h-[40px] bg-white/5 border border-white/10 text-zinc-200">
                15% OFF
              </button>
              <div class="flex-1 min-w-[120px]">
                <input 
                  type="text" 
                  value="10" 
                  placeholder="Outro (ex: 20%)"
                  class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white placeholder:text-zinc-500 focus:outline-none min-h-[40px]"
                />
              </div>
            </div>
          </div>

          <!-- 4. COMISSÃO DO PARTICIPANTE (SEMPRE VISÍVEL) -->
          <div class="space-y-2 p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <label class="text-xs font-bold text-white block">
              Comissão do Participante
            </label>
            <div class="grid grid-cols-2 gap-2">
              <div class="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10">
                <button type="button" class="py-1.5 px-2 rounded-lg text-xs font-bold min-h-[36px] bg-emerald-500 text-white shadow-xs">
                  %
                </button>
                <button type="button" class="py-1.5 px-2 rounded-lg text-xs font-bold min-h-[36px] text-zinc-400">
                  R$
                </button>
              </div>
              <div class="relative">
                <input 
                  type="number" 
                  value="10" 
                  class="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white focus:outline-none min-h-[44px]"
                />
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 pointer-events-none">
                  %
                </span>
              </div>
            </div>
          </div>

          <!-- CAMADA 2: OPÇÕES AVANÇADAS (COLLAPSIBLE FECHADO POR PADRÃO) -->
          <div class="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
            <button type="button" class="w-full flex items-center justify-between p-3.5 text-xs font-bold text-zinc-200 hover:bg-white/5 transition-colors min-h-[44px]">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="21" y1="4" x2="14" y2="4"></line><line x1="10" y1="4" x2="3" y2="4"></line>
                  <line x1="21" y1="12" x2="12" y2="12"></line><line x1="8" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="20" x2="16" y2="20"></line><line x1="12" y1="20" x2="3" y2="20"></line>
                  <line x1="14" y1="2" x2="14" y2="6"></line><line x1="8" y1="10" x2="8" y2="14"></line>
                  <line x1="16" y1="18" x2="16" y2="22"></line>
                </svg>
                <span>Opções avançadas</span>
              </div>
              <div class="flex items-center gap-1.5 text-[11px] text-zinc-400 font-normal">
                <span>Mostrar</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </button>
          </div>

        </div>

        <!-- RODAPÉ STICKY COM BOTÃO DE AÇÃO (SEMPRE VISÍVEL) -->
        <div class="sticky bottom-0 shrink-0 bg-[#151619]/95 backdrop-blur-md border-t border-white/10 p-4 flex items-center justify-end gap-2.5 z-10">
          <button type="button" class="px-4 py-2.5 rounded-xl bg-white/5 text-xs font-semibold text-zinc-300 min-h-[44px]">
            Cancelar
          </button>
          <button type="button" class="px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold shadow-md min-h-[44px] flex items-center justify-center">
            Criar Link
          </button>
        </div>
      </form>
    </div>
  </div>
</body>
</html>`;
}

const outDir = process.env.TEMP || "C:\\temp";
fs.writeFileSync(path.join(outDir, "modal-preview-normal.html"), getHtml("normal"), "utf-8");
fs.writeFileSync(path.join(outDir, "modal-preview-error.html"), getHtml("error"), "utf-8");
console.log("HTML files generated successfully.");
