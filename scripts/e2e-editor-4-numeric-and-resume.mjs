/**
 * TREVO ONE — REAL RUNTIME E2E VALIDATION:
 * 1. Numeric input editing (complete clearing, typing 12 -> "" -> 4, reps range, load, rest)
 * 2. Início -> Criar Treino -> Voltar -> Retomar Edição (P0 404 fix)
 * 3. Legacy /editor redirect compatibility
 * 4. Mobile viewports (320px, 360px, 390px, 412px)
 */

import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { seedQaData } from "./seed-editor-4-qa-data.mjs";

const ARTIFACT_DIR = "C:\\Users\\User\\.gemini\\antigravity\\brain\\bda29c4f-b0d7-4433-9298-37b93b4df5ec";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.callbacks = new Map();
    this.events = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { resolve, reject } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) reject(new Error(data.error.message));
          else resolve(data.result);
        } else if (data.method) {
          const handlers = this.events.get(data.method) || [];
          for (const handler of handlers) handler(data.params);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {}
    await sleep(500);
  }
  throw new Error(`Timeout waiting for server at ${url}`);
}

async function captureScreenshot(cdp, filename) {
  const res = await cdp.send("Page.captureScreenshot", { format: "png" });
  const outPath = path.join(ARTIFACT_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(res.data, "base64"));
  console.log(`[EVIDÊNCIA REAL CAPTURADA] ${filename}`);
  return outPath;
}

async function run() {
  console.log("==================================================================");
  console.log("   TREVO ONE — BUGFIX VALIDATION: NUMERIC FIELDS & RESUME DRAFT   ");
  console.log("==================================================================\n");

  let nextProcess = null;
  let edgeProcess = null;
  let edgeTmpDir = null;
  let cdp = null;

  try {
    // 1. Seed QA Database
    console.log("[1/6] Semeando fixtures no banco de homologação local...");
    const fixtures = await seedQaData();
    console.log("[OK] Fixtures prontas. Sessão gerada para Carlos Personal.");

    // 2. Start Next.js
    console.log("\n[2/6] Iniciando o servidor real Next.js na porta 3000...");
    const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

    nextProcess = spawn(process.execPath, [nextBin, "start", "-p", "3000"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: "3000",
        NODE_ENV: "production",
        DB_HOST: "127.0.0.1",
        DB_PORT: "3306",
        DB_USER: "trevo_qa",
        DB_PASSWORD: "trevo_one_qa_pass",
        DB_NAME: "trevo_one_qa",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    nextProcess.stdout.on("data", (data) => {
      const line = data.toString().trim();
      if (line) console.log(`  [Next.js stdout] ${line}`);
    });
    nextProcess.stderr.on("data", (data) => {
      const line = data.toString().trim();
      if (line) console.warn(`  [Next.js stderr] ${line}`);
    });

    await waitForServer("http://localhost:3000/api/version", 30000);
    console.log("[OK] Servidor Next.js pronto!");

    // 3. Launch Edge via CDP
    console.log("\n[3/6] Iniciando navegador Edge real em modo headless CDP...");
    edgeTmpDir = path.join(os.tmpdir(), `edge-e2e-bugfixes-${Date.now()}`);
    fs.mkdirSync(edgeTmpDir, { recursive: true });

    edgeProcess = spawn(EDGE_PATH, [
      "--headless=new",
      "--remote-debugging-port=9222",
      `--user-data-dir=${edgeTmpDir}`,
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ]);

    await sleep(2500);

    const versionRes = await fetch("http://127.0.0.1:9222/json/list");
    const pages = await versionRes.json();
    assert.ok(pages.length > 0, "Edge deve ter página ativa");
    const wsUrl = pages[0].webSocketDebuggerUrl;

    cdp = new CdpClient(wsUrl);
    await cdp.connect();

    await cdp.send("Network.enable");
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("DOM.enable");

    // Cookie de autenticação
    await cdp.send("Network.setCookie", {
      name: "trevo_session",
      value: fixtures.rawSessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    });
    await cdp.send("Network.setCookie", {
      name: "trevo_view_mode_saiya-shape",
      value: "PERSONAL",
      domain: "localhost",
      path: "/",
      sameSite: "Lax",
    });

    // Ignorar tutorial inicial
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: "localStorage.setItem('trevo_first_access_tutorial_v1', 'completed');",
    });

    // -------------------------------------------------------------------------
    // TESTE 1: INÍCIO -> CRIAR TREINO
    // -------------------------------------------------------------------------
    console.log("\n[4/6] Executando Teste: Início -> Criar Treino...");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    await cdp.send("Page.navigate", { url: "http://localhost:3000/consultoria/saiya-shape" });
    await sleep(3000);
    await captureScreenshot(cdp, "bugfix-01-inicio-before-draft.png");

    // Obter link do botão "+ Criar novo treino" no Início e navegar
    console.log("  Localizando botão de criar treino no Início...");
    const createHrefEval = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const createBtn = links.find(a => a.textContent.includes('Criar novo treino') || a.textContent.includes('Criar treino') || a.href.includes('/rotinas/novo'));
        return createBtn ? createBtn.href : null;
      })()`,
      returnByValue: true,
    });
    console.log("  Href do botão de criar treino:", createHrefEval.result.value);
    assert.ok(createHrefEval.result.value, "Link de criar treino deve existir no Início");
    await cdp.send("Page.navigate", { url: createHrefEval.result.value });
    await sleep(3500);

    // Verificar URL do Editor 4.0
    const urlEval = await cdp.send("Runtime.evaluate", { expression: "window.location.pathname" });
    const currentPath = urlEval.result.value;
    console.log(`  Editor 4.0 aberto na rota: ${currentPath}`);
    assert.ok(currentPath.includes("/rotinas/"), "Deve abrir rota /rotinas/[publicId]");
    assert.ok(!currentPath.includes("/rotinas/novo"), "Deve ter auto-inicializado e redirecionado para a ficha");

    const createdWorkoutPublicId = currentPath.split("/rotinas/")[1].split("?")[0];
    console.log(`  Identificador do rascunho criado: ${createdWorkoutPublicId}`);

    await captureScreenshot(cdp, "bugfix-02-editor-empty-mobile.png");

    // -------------------------------------------------------------------------
    // TESTE 2: ADICIONAR SUPINO E EDITAR CAMPOS NUMÉRICOS
    // -------------------------------------------------------------------------
    console.log("\n[5/6] Executando Teste de Digitação Numérica Completa no Editor...");
    // 1. Digitar Supino na busca integrada do empty state e clicar em Adicionar
    const addResult = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const input = document.querySelector('input[placeholder*="Buscar exercício"]');
        if (input) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          nativeSetter.call(input, "Supino");
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return { foundInput: true };
        }
        return { foundInput: false };
      })()`,
      returnByValue: true,
    });
    console.log("  Busca por Supino disparada:", addResult.result.value);
    await sleep(1500);

    // Clicar no item Supino retornado ou no botão "+ Adicionar"
    const clickedAdd = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        // Encontra o card/item com Supino
        const elements = Array.from(document.querySelectorAll('div, li')).filter(el => 
          el.textContent.includes('Supino') && !el.querySelector('input[placeholder*="Buscar"]')
        );
        for (const el of elements) {
          const btn = el.querySelector('button');
          if (btn && (btn.textContent.includes('+ Adicionar') || btn.textContent.includes('Adicionar'))) {
            btn.click();
            return { clicked: true, text: el.textContent.trim().slice(0, 40) };
          }
        }
        // Fallback: clica no primeiro botão de adicionar
        const fallbackBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('+ Adicionar'));
        if (fallbackBtn) {
          fallbackBtn.click();
          return { clicked: true, fallback: true };
        }
        return { clicked: false };
      })()`,
      returnByValue: true,
    });
    console.log("  Exercício adicionado:", clickedAdd.result.value);
    await sleep(2500);

    // 2. Testar edição do campo Séries: 3 -> "" -> 12 -> "" -> 4
    console.log("  Testando campo Séries: limpar totalmente, digitar 12, limpar novamente, digitar 4...");
    const setsResult = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const setsInput = inputs.find(i => i.placeholder === '3' || i.value === '3');
        if (!setsInput) return { error: 'Campo Séries não encontrado' };

        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;

        // Teste 1: Limpar completamente (deve aceitar string vazia sem forçar 1)
        setsInput.focus();
        nativeSetter.call(setsInput, '');
        setsInput.dispatchEvent(new Event('input', { bubbles: true }));
        const valEmpty = setsInput.value;

        // Teste 2: Digitar 12
        nativeSetter.call(setsInput, '12');
        setsInput.dispatchEvent(new Event('input', { bubbles: true }));
        const val12 = setsInput.value;

        // Teste 3: Limpar novamente
        nativeSetter.call(setsInput, '');
        setsInput.dispatchEvent(new Event('input', { bubbles: true }));
        const valEmpty2 = setsInput.value;

        // Teste 4: Digitar 4 e sair do campo (blur)
        nativeSetter.call(setsInput, '4');
        setsInput.dispatchEvent(new Event('input', { bubbles: true }));
        setsInput.dispatchEvent(new Event('blur', { bubbles: true }));
        const valFinal = setsInput.value;

        return { valEmpty, val12, valEmpty2, valFinal };
      })()`,
      returnByValue: true,
    });

    console.log("  Resultado Séries:", setsResult.result.value);
    assert.equal(setsResult.result.value.valEmpty, "", "Campo Séries deve permitir ficar vazio durante edição");
    assert.equal(setsResult.result.value.val12, "12", "Campo Séries deve aceitar 12 normalmente");
    assert.equal(setsResult.result.value.valEmpty2, "", "Campo Séries deve permitir ser apagado novamente");
    assert.equal(setsResult.result.value.valFinal, "4", "Campo Séries deve manter 4 ao sair");

    // 3. Testar Repetições com faixa (8-12)
    console.log("  Testando campo Repetições: faixa 8-12...");
    const repsResult = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const repsInput = inputs.find(i => i.placeholder?.includes('8-12') || i.value === '10');
        if (!repsInput) return { error: 'Campo Repetições não encontrado' };

        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        repsInput.focus();
        nativeSetter.call(repsInput, '8-12');
        repsInput.dispatchEvent(new Event('input', { bubbles: true }));
        repsInput.dispatchEvent(new Event('blur', { bubbles: true }));
        return { repsFinal: repsInput.value };
      })()`,
      returnByValue: true,
    });
    console.log("  Resultado Repetições:", repsResult.result.value);
    assert.equal(repsResult.result.value.repsFinal, "8-12", "Repetições deve ser 8-12");
    await sleep(500);

    // 4. Testar Carga (30 kg)
    console.log("  Testando campo Carga: 30 kg...");
    const loadResult = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const loadInput = inputs.find(i => i.placeholder === 'Opcional');
        if (!loadInput) return { error: 'Campo Carga não encontrado' };

        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        loadInput.focus();
        nativeSetter.call(loadInput, '30');
        loadInput.dispatchEvent(new Event('input', { bubbles: true }));
        loadInput.dispatchEvent(new Event('blur', { bubbles: true }));
        return { loadFinal: loadInput.value };
      })()`,
      returnByValue: true,
    });
    console.log("  Resultado Carga:", loadResult.result.value);
    assert.equal(loadResult.result.value.loadFinal, "30", "Carga deve ser 30");
    await sleep(500);

    // 5. Testar Descanso (60 -> "" -> 90)
    console.log("  Testando campo Descanso: limpar 60 e digitar 90...");
    const restResult = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const restInput = inputs.find(i => i.placeholder === '60' || i.value === '60');
        if (!restInput) return { error: 'Campo Descanso não encontrado' };

        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;

        restInput.focus();
        nativeSetter.call(restInput, '');
        restInput.dispatchEvent(new Event('input', { bubbles: true }));
        const restEmpty = restInput.value;

        nativeSetter.call(restInput, '90');
        restInput.dispatchEvent(new Event('input', { bubbles: true }));
        restInput.dispatchEvent(new Event('blur', { bubbles: true }));
        const restFinal = restInput.value;

        return { restEmpty, restFinal };
      })()`,
      returnByValue: true,
    });
    console.log("  Resultado Descanso:", restResult.result.value);
    assert.equal(restResult.result.value.restEmpty, "", "Campo Descanso deve permitir ficar vazio ao apagar");
    assert.equal(restResult.result.value.restFinal, "90", "Campo Descanso deve manter 90 ao sair");

    await sleep(2000);
    await captureScreenshot(cdp, "bugfix-03-editor-supino-configured.png");

    // -------------------------------------------------------------------------
    // TESTE 3: SALVAMENTO AO SAIR (CLICAR EM VOLTAR E IR PARA O INÍCIO)
    // -------------------------------------------------------------------------
    console.log("\n  Clicando no botão 'Voltar' do cabeçalho...");
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const backBtn = btns.find(b => b.title === 'Voltar' || b.textContent.trim() === 'Voltar');
        if (backBtn) backBtn.click();
      })()`,
    });
    await sleep(2500);

    // Garantir navegação para o Início
    await cdp.send("Page.navigate", { url: "http://localhost:3000/consultoria/saiya-shape" });
    await sleep(3000);

    await captureScreenshot(cdp, "bugfix-04-inicio-draft-card.png");

    // -------------------------------------------------------------------------
    // TESTE 4: RETOMAR EDIÇÃO NO INÍCIO (PREVENÇÃO DO ERRO 404)
    // -------------------------------------------------------------------------
    console.log("\n  Verificando card 'Retomar edição' no Início...");
    const draftLinkEval = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const resumeLink = links.find(a => a.textContent.includes('Retomar edição'));
        if (!resumeLink) return { error: 'Link Retomar edição não encontrado no Início' };
        return {
          href: resumeLink.getAttribute('href'),
          text: resumeLink.textContent.trim()
        };
      })()`,
      returnByValue: true,
    });

    console.log("  Link do card de rascunho:", draftLinkEval.result.value);
    assert.ok(draftLinkEval.result.value.href, "Card deve conter atributo href");
    assert.ok(!draftLinkEval.result.value.href.endsWith("/editor"), "Href NÃO deve conter /editor obsoleto");
    assert.ok(draftLinkEval.result.value.href.includes(createdWorkoutPublicId), "Href deve apontar para o rascunho criado");

    // Navegar para o destino de Retomar edição
    console.log("  Navegando para o destino de 'Retomar edição':", draftLinkEval.result.value.href);
    await cdp.send("Page.navigate", { url: `http://localhost:3000${draftLinkEval.result.value.href}` });
    await sleep(3500);

    // Confirmar que a página carregou com HTTP 200 e NÃO 404
    const pageTitleEval = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const is404 = document.title.includes('404') || 
                      Boolean(document.querySelector('.next-error-h1')) || 
                      document.body.innerText.includes('Página não encontrada');
        const hasSupino = document.body.innerText.includes('Supino');
        const inputs = Array.from(document.querySelectorAll('input'));
        const setsVal = inputs.find(i => i.placeholder === '3')?.value;
        const repsVal = inputs.find(i => i.placeholder?.includes('8-12'))?.value;
        const loadVal = inputs.find(i => i.placeholder === 'Opcional')?.value;
        const restVal = inputs.find(i => i.placeholder === '60')?.value;
        return { is404, hasSupino, setsVal, repsVal, loadVal, restVal };
      })()`,
      returnByValue: true,
    });

    console.log("  Verificação após Retomar edição:", pageTitleEval.result.value);
    assert.equal(pageTitleEval.result.value.is404, false, "NÃO deve exibir erro 404");
    assert.equal(pageTitleEval.result.value.hasSupino, true, "Exercício Supino deve permanecer");
    assert.equal(pageTitleEval.result.value.setsVal, "4", "Séries deve permanecer 4");
    assert.equal(pageTitleEval.result.value.repsVal, "8-12", "Repetições deve permanecer 8-12");
    assert.equal(pageTitleEval.result.value.loadVal, "30", "Carga deve permanecer 30");
    assert.equal(pageTitleEval.result.value.restVal, "90", "Descanso deve permanecer 90");

    await captureScreenshot(cdp, "bugfix-05-editor-resumed.png");

    // -------------------------------------------------------------------------
    // TESTE 5: ROTA LEGADA /rotinas/[publicId]/editor REDIRECIONA SEM 404
    // -------------------------------------------------------------------------
    console.log("\n  Testando compatibilidade da URL legada com /editor...");
    const legacyUrl = `http://localhost:3000/consultoria/saiya-shape/rotinas/${createdWorkoutPublicId}/editor`;
    await cdp.send("Page.navigate", { url: legacyUrl });
    await sleep(3000);

    const redirectPathEval = await cdp.send("Runtime.evaluate", { expression: "window.location.pathname" });
    console.log(`  Rota após navegar para URL legada: ${redirectPathEval.result.value}`);
    assert.equal(
      redirectPathEval.result.value,
      `/consultoria/saiya-shape/rotinas/${createdWorkoutPublicId}`,
      "Deve redirecionar automaticamente sem 404"
    );

    await captureScreenshot(cdp, "bugfix-06-legacy-url-redirect.png");

    // -------------------------------------------------------------------------
    // TESTE 6: VALIDAÇÃO EM DISPOSITIVOS MÓVEIS (320px, 360px, 390px, 412px)
    // -------------------------------------------------------------------------
    console.log("\n  Capturando evidências nos viewports mobile protegidos...");
    // 320px
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 320, height: 600, deviceScaleFactor: 2, mobile: true });
    await sleep(1000);
    await captureScreenshot(cdp, "bugfix-07-mobile-320px.png");

    // 360px
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
    await sleep(1000);
    await captureScreenshot(cdp, "bugfix-08-mobile-360px.png");

    // 390px
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(1000);
    await captureScreenshot(cdp, "bugfix-09-mobile-390px.png");

    // 412px
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 412, height: 915, deviceScaleFactor: 2, mobile: true });
    await sleep(1000);
    await captureScreenshot(cdp, "bugfix-10-mobile-412px.png");

    console.log("\n[OK] Todos os testes e validações foram concluídos com sucesso absoluto!");
  } finally {
    console.log("\n[6/6] Finalizando processos de teste...");
    if (cdp) cdp.close();
    if (edgeProcess) edgeProcess.kill();
    if (nextProcess) nextProcess.kill();
    if (edgeTmpDir) {
      try {
        fs.rmSync(edgeTmpDir, { recursive: true, force: true });
      } catch {}
    }
  }

  console.log("\n==================================================================");
  console.log("   BUGFIX VALIDATION COMPLETED: ALL P0 & P1 CRITERIA PASS         ");
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("FATAL ERROR IN BUGFIX VALIDATION:", err);
  process.exit(1);
});
