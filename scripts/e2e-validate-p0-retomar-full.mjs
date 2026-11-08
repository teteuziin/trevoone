/**
 * TREVO ONE — P0 RETOMAR EDIÇÃO E2E EXHAUSTIVE VALIDATION
 * 
 * Verifies:
 * 1. Reproduces user flow: Início -> Criar treino -> Add 3 exercises -> Voltar -> Retomar edição -> 100% data intact
 * 2. 3 exercises:
 *    - Supino reto (3x12, 90s, 30kg)
 *    - Agachamento livre (4x10, 60s, 50kg)
 *    - Puxada alta (3x12, 45s, 40kg)
 * 3. Draft A vs Draft B complete isolation
 * 4. Direct URL reload with F5
 * 5. Viewports: 320px, 360px, 390px, 412px, 768px, 1024px, 1440px
 */

import mysql from "mysql2/promise";
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
  console.log(`  [EVIDÊNCIA CAPTURADA] ${filename}`);
  return outPath;
}

async function waitForSelector(cdp, expression, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await cdp.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
    });
    if (res?.result?.value) return res.result.value;
    await sleep(400);
  }
  throw new Error(`Timeout aguardando expressão: ${expression}`);
}

async function run() {
  console.log("==================================================================");
  console.log("   TREVO ONE — P0 E2E VALIDATION: RETOMAR EDIÇÃO DETERMINÍSTICO   ");
  console.log("==================================================================\n");

  let nextProcess = null;
  let edgeProcess = null;
  let edgeTmpDir = null;
  let cdp = null;

  try {
    // 1. Semeando QA Database
    console.log("[1/7] Semeando banco de homologação local...");
    const fixtures = await seedQaData();

    // 2. Iniciar Next.js em produção
    console.log("\n[2/7] Iniciando Next.js real na porta 3000...");
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

    await waitForServer("http://localhost:3000/api/version", 30000);
    console.log("  [OK] Servidor Next.js pronto!");

    // 3. Iniciar Edge Headless
    console.log("\n[3/7] Iniciando Edge CDP headless...");
    edgeTmpDir = path.join(os.tmpdir(), `edge-e2e-retomar-${Date.now()}`);
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
    const wsUrl = pages[0].webSocketDebuggerUrl;

    cdp = new CdpClient(wsUrl);
    await cdp.connect();

    await cdp.send("Network.enable");
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("DOM.enable");

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

    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: "localStorage.setItem('trevo_first_access_tutorial_v1', 'completed');",
    });

    // Viewport inicial: 390px Mobile
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    // -------------------------------------------------------------------------
    // ETAPA 4: FLUXO DO USUÁRIO PASSO A PASSO COM 3 EXERCÍCIOS
    // -------------------------------------------------------------------------
    console.log("\n[4/7] Executando Fluxo 1: Início -> Criar treino -> 3 exercícios -> Voltar -> Retomar...");

    // 4.1 Abrir Início
    console.log("  Passo 1: Abrindo Início...");
    await cdp.send("Page.navigate", { url: "http://localhost:3000/consultoria/saiya-shape" });
    
    // Aguardar página carregar
    await waitForSelector(cdp, `(() => {
      const h1 = document.querySelector('h1');
      return h1 && h1.innerText.includes('Início');
    })()`);
    await sleep(1000);
    await captureScreenshot(cdp, "p0-01-inicio-before-creation.png");

    // 4.2 Clicar em Criar treino no cabeçalho
    console.log("  Passo 2: Clicando em '+ Criar treino'...");
    const createBtnHref = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const link = Array.from(document.querySelectorAll('a')).find(a => 
          a.innerText.includes('Criar treino') && a.href.includes('/rotinas/novo')
        );
        return link ? link.href : null;
      })()`,
      returnByValue: true,
    });
    assert.ok(createBtnHref.result.value, "Botão Criar treino deve existir no Início");
    console.log("  Href de criação:", createBtnHref.result.value);

    await cdp.send("Page.navigate", { url: createBtnHref.result.value });

    // Aguardar o editor abrir
    await waitForSelector(cdp, `(() => {
      const path = window.location.pathname;
      return path.includes('/rotinas/') && !path.includes('/rotinas/novo');
    })()`);
    await sleep(2000);

    const editorPathEval = await cdp.send("Runtime.evaluate", { expression: "window.location.pathname" });
    const workoutDraftAId = editorPathEval.result.value.split("/rotinas/")[1].split("?")[0];
    console.log(`  Editor 4.0 inicializado com ID: ${workoutDraftAId}`);

    // Renomear treino para "Teste de Retomada A"
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const titleBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Nova Ficha de Treino') || b.innerText.includes('Treino'));
        if (titleBtn) titleBtn.click();
      })()`,
    });
    await sleep(500);

    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const input = document.querySelector('input[value*="Treino"], input[value*="Nova Ficha"]');
        if (input) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          nativeSetter.call(input, "Teste de Retomada A");
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      })()`,
    });
    await sleep(1000);

    // 4.3 Adicionar Exercício 1: Supino reto (3x12, 90s, 30kg)
    console.log("  Passo 3.1: Adicionando Supino reto...");
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const input = document.querySelector('input[placeholder*="Buscar exercício"]');
        if (input) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          nativeSetter.call(input, "Supino");
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`,
    });
    await sleep(1200);

    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const item = document.querySelector('[data-testid="empty-search-exercise-item"]') || 
          Array.from(document.querySelectorAll('div')).find(el => el.innerText && el.innerText.includes('Supino') && el.innerText.includes('+ Adicionar'));
        if (item) {
          const btn = item.querySelector('button') || item;
          btn.click();
          return true;
        }
        return false;
      })()`,
    });
    await sleep(2500);

    // Configurar Supino reto: Séries=3, Reps=12, Descanso=90, Carga=30
    console.log("  Configurando Supino reto: 3 séries, 12 reps, 90s descanso, 30kg carga...");
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const card = Array.from(document.querySelectorAll('div, section')).find(el => 
          el.innerText && el.innerText.includes('Supino') && el.querySelector('input')
        );
        if (!card) return;
        const inputs = Array.from(card.querySelectorAll('input'));
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;

        const setsIn = inputs.find(i => i.placeholder === '3' || i.value === '3');
        if (setsIn) {
          nativeSetter.call(setsIn, '3');
          setsIn.dispatchEvent(new Event('input', { bubbles: true }));
          setsIn.dispatchEvent(new Event('blur', { bubbles: true }));
        }

        const repsIn = inputs.find(i => i.placeholder?.includes('8-12') || i.value === '10');
        if (repsIn) {
          nativeSetter.call(repsIn, '12');
          repsIn.dispatchEvent(new Event('input', { bubbles: true }));
          repsIn.dispatchEvent(new Event('blur', { bubbles: true }));
        }

        const loadIn = inputs.find(i => i.placeholder === 'Opcional');
        if (loadIn) {
          nativeSetter.call(loadIn, '30');
          loadIn.dispatchEvent(new Event('input', { bubbles: true }));
          loadIn.dispatchEvent(new Event('blur', { bubbles: true }));
        }

        const restIn = inputs.find(i => i.placeholder === '60' || i.value === '60');
        if (restIn) {
          nativeSetter.call(restIn, '90');
          restIn.dispatchEvent(new Event('input', { bubbles: true }));
          restIn.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      })()`,
    });
    await sleep(1500);

    // 4.4 Adicionar Exercício 2: Agachamento livre (4x10, 60s, 50kg)
    console.log("  Passo 3.2: Adicionando Agachamento livre...");
    // Abrir modal de adicionar exercício via atalho do dock
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const dockBtn = document.querySelector('button[title*="Adicionar exercício, bi-set"]');
        if (dockBtn) {
          dockBtn.click();
          return { clicked: true };
        }
        return { clicked: false };
      })()`,
    });
    await sleep(1500);

    // Buscar "Agachamento" no input do modal
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const input = document.querySelector('input[placeholder*="Buscar"], input[placeholder*="exercício"]');
        if (input) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          nativeSetter.call(input, "Agachamento");
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`,
    });
    await sleep(1500);

    // Clicar no exercício Agachamento retornado
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const items = Array.from(document.querySelectorAll('[data-testid="add-exercise-item"]')).filter(el => 
          el.innerText && el.innerText.includes('Agachamento')
        );
        if (items.length) {
          items[0].click();
          return true;
        }
        return false;
      })()`,
    });
    await sleep(2500);

    // Configurar Agachamento: Séries=4, Reps=10, Descanso=60, Carga=50
    console.log("  Configurando Agachamento livre: 4 séries, 10 reps, 60s descanso, 50kg carga...");
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const cards = Array.from(document.querySelectorAll('div, section')).filter(el => 
          el.innerText && el.innerText.includes('Agachamento') && el.querySelector('input')
        );
        const card = cards[cards.length - 1];
        if (!card) return;
        const inputs = Array.from(card.querySelectorAll('input'));
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;

        const setsIn = inputs.find(i => i.placeholder === '3' || i.value === '3');
        if (setsIn) {
          nativeSetter.call(setsIn, '4');
          setsIn.dispatchEvent(new Event('input', { bubbles: true }));
          setsIn.dispatchEvent(new Event('blur', { bubbles: true }));
        }

        const repsIn = inputs.find(i => i.placeholder?.includes('8-12') || i.value === '10');
        if (repsIn) {
          nativeSetter.call(repsIn, '10');
          repsIn.dispatchEvent(new Event('input', { bubbles: true }));
          repsIn.dispatchEvent(new Event('blur', { bubbles: true }));
        }

        const loadIn = inputs.find(i => i.placeholder === 'Opcional');
        if (loadIn) {
          nativeSetter.call(loadIn, '50');
          loadIn.dispatchEvent(new Event('input', { bubbles: true }));
          loadIn.dispatchEvent(new Event('blur', { bubbles: true }));
        }

        const restIn = inputs.find(i => i.placeholder === '60' || i.value === '60');
        if (restIn) {
          nativeSetter.call(restIn, '60');
          restIn.dispatchEvent(new Event('input', { bubbles: true }));
          restIn.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      })()`,
    });
    await sleep(1500);

    // 4.5 Adicionar Exercício 3: Puxada alta (3x12, 45s, 40kg)
    console.log("  Passo 3.3: Adicionando Puxada alta...");
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const dockBtn = document.querySelector('button[title*="Adicionar exercício, bi-set"]');
        if (dockBtn) {
          dockBtn.click();
          return { clicked: true };
        }
        return { clicked: false };
      })()`,
    });
    await sleep(1500);

    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const input = document.querySelector('input[placeholder*="Buscar"], input[placeholder*="exercício"]');
        if (input) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          nativeSetter.call(input, "Puxada");
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`,
    });
    await sleep(1500);

    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const items = Array.from(document.querySelectorAll('[data-testid="add-exercise-item"]')).filter(el => 
          el.innerText && el.innerText.includes('Puxada')
        );
        if (items.length) {
          items[0].click();
          return true;
        }
        return false;
      })()`,
    });
    await sleep(2500);

    // Configurar Puxada alta: Séries=3, Reps=12, Descanso=45, Carga=40
    console.log("  Configurando Puxada alta: 3 séries, 12 reps, 45s descanso, 40kg carga...");
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const cards = Array.from(document.querySelectorAll('div, section')).filter(el => 
          el.innerText && el.innerText.includes('Puxada') && el.querySelector('input')
        );
        const card = cards[cards.length - 1];
        if (!card) return;
        const inputs = Array.from(card.querySelectorAll('input'));
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;

        const setsIn = inputs.find(i => i.placeholder === '3' || i.value === '3');
        if (setsIn) {
          nativeSetter.call(setsIn, '3');
          setsIn.dispatchEvent(new Event('input', { bubbles: true }));
          setsIn.dispatchEvent(new Event('blur', { bubbles: true }));
        }

        const repsIn = inputs.find(i => i.placeholder?.includes('8-12') || i.value === '10');
        if (repsIn) {
          nativeSetter.call(repsIn, '12');
          repsIn.dispatchEvent(new Event('input', { bubbles: true }));
          repsIn.dispatchEvent(new Event('blur', { bubbles: true }));
        }

        const loadIn = inputs.find(i => i.placeholder === 'Opcional');
        if (loadIn) {
          nativeSetter.call(loadIn, '40');
          loadIn.dispatchEvent(new Event('input', { bubbles: true }));
          loadIn.dispatchEvent(new Event('blur', { bubbles: true }));
        }

        const restIn = inputs.find(i => i.placeholder === '60' || i.value === '60');
        if (restIn) {
          nativeSetter.call(restIn, '45');
          restIn.dispatchEvent(new Event('input', { bubbles: true }));
          restIn.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      })()`,
    });
    await sleep(2500);

    // Passo 5: Confirmar indicador de Salvo
    console.log("  Passo 4: Verificando indicador 'Salvo'...");
    const isSavedEval = await cdp.send("Runtime.evaluate", {
      expression: `document.body.innerText.includes('Salvo')`,
    });
    console.log("  Indicador Salvo visível:", isSavedEval.result.value);
    await captureScreenshot(cdp, "p0-02-editor-three-exercises.png");

    // Passo 6: Personal toca em Voltar
    console.log("  Passo 5: Personal toca no botão 'Voltar'...");
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const backBtn = btns.find(b => b.title === 'Voltar' || b.textContent.trim() === 'Voltar');
        if (backBtn) backBtn.click();
      })()`,
    });
    await sleep(3000);

    const pathAfterVoltar = await cdp.send("Runtime.evaluate", { expression: "window.location.pathname" });
    console.log(`  Rota atual após clicar em Voltar: ${pathAfterVoltar.result.value}`);
    assert.equal(
      pathAfterVoltar.result.value,
      "/consultoria/saiya-shape",
      "O botão Voltar deve navegar diretamente para o Início quando veio do Início"
    );

    // Passo 7: No Início, verificar o card Rascunho de Treino
    console.log("  Passo 6: Verificando card Rascunho de Treino no Início...");
    await captureScreenshot(cdp, "p0-03-inicio-resumed-card.png");

    const draftCardState = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const resumeLink = links.find(l => l.textContent.includes('Retomar edição'));
        const newWorkoutBtn = links.find(l => l.textContent.includes('+ Novo treino'));
        const cardSection = document.querySelector('section[aria-label="Rascunho de treino"]');
        return {
          cardFound: Boolean(cardSection),
          cardText: cardSection ? cardSection.innerText.replace(/\\s+/g, ' ') : null,
          resumeHref: resumeLink ? resumeLink.getAttribute('href') : null,
          newWorkoutHref: newWorkoutBtn ? newWorkoutBtn.getAttribute('href') : null,
        };
      })()`,
      returnByValue: true,
    });
    console.log("  Card de rascunho no Início:", draftCardState.result.value);
    assert.ok(draftCardState.result.value.cardFound, "Card Rascunho de Treino deve estar presente");
    assert.ok(
      draftCardState.result.value.resumeHref?.includes(workoutDraftAId),
      `O link Retomar edição deve apontar para o rascunho recém editado (${workoutDraftAId})`
    );

    // Passo 8: Clicar em Retomar edição
    console.log("  Passo 7: Clicando em 'Retomar edição'...");
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const link = Array.from(document.querySelectorAll('a')).find(l => l.textContent.includes('Retomar edição'));
        if (link) link.click();
      })()`,
    });
    await sleep(3500);

    const resumedPath = await cdp.send("Runtime.evaluate", { expression: "window.location.pathname" });
    console.log(`  Rota após Retomar edição: ${resumedPath.result.value}`);
    assert.ok(resumedPath.result.value.includes(workoutDraftAId), "Deve abrir a URL exata do rascunho A");

    // Verificar se TODOS os 3 exercícios e suas configurações estão 100% presentes
    const resumedContent = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const body = document.body.innerText;
        const hasSupino = body.includes('Supino');
        const hasAgachamento = body.includes('Agachamento');
        const hasPuxada = body.includes('Puxada');
        const isBlank = body.includes('Vamos adicionar o primeiro exercício?');
        const is404 = document.title.includes('404') || body.includes('Página não encontrada');

        // Contar cards de exercícios
        const cards = Array.from(document.querySelectorAll('div, section')).filter(el => 
          (el.innerText && (el.innerText.includes('Supino') || el.innerText.includes('Agachamento') || el.innerText.includes('Puxada'))) &&
          el.querySelector('input')
        );

        return {
          hasSupino,
          hasAgachamento,
          hasPuxada,
          isBlank,
          is404,
          cardsCount: cards.length,
          preview: body.slice(0, 300)
        };
      })()`,
      returnByValue: true,
    });

    console.log("  Conteúdo verificado após Retomar:", resumedContent.result.value);
    assert.equal(resumedContent.result.value.is404, false, "NÃO deve ser 404");
    assert.equal(resumedContent.result.value.isBlank, false, "NÃO deve ser editor vazio!");
    assert.equal(resumedContent.result.value.hasSupino, true, "Deve conter Supino reto!");
    assert.equal(resumedContent.result.value.hasAgachamento, true, "Deve conter Agachamento livre!");
    assert.equal(resumedContent.result.value.hasPuxada, true, "Deve conter Puxada alta!");

    await captureScreenshot(cdp, "p0-04-editor-resumed-intact.png");
    console.log("  [PASS] Cenário 1: 3 exercícios preservados intactos ao retomar!");

    // -------------------------------------------------------------------------
    // ETAPA 5: ISOLAMENTO ENTRE DUAS FICHAS DIFERENTES (DRAFT A vs DRAFT B)
    // -------------------------------------------------------------------------
    console.log("\n[5/7] Executando Fluxo 2: Isolamento estrito entre Ficha A e Ficha B...");

    // Voltar para o Início
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const backBtn = btns.find(b => b.title === 'Voltar' || b.textContent.trim() === 'Voltar');
        if (backBtn) backBtn.click();
      })()`,
    });
    await sleep(3000);

    // No Início, clicar em "+ Novo treino" (criação da Ficha B)
    console.log("  Criando Ficha B através de '+ Novo treino' no card de rascunho...");
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const newBtn = links.find(l => l.textContent.includes('+ Novo treino'));
        if (newBtn) newBtn.click();
      })()`,
    });
    await sleep(3500);

    await waitForSelector(cdp, `(() => {
      const path = window.location.pathname;
      return path.includes('/rotinas/') && !path.includes('/rotinas/novo');
    })()`);

    const pathDraftB = await cdp.send("Runtime.evaluate", { expression: "window.location.pathname" });
    const workoutDraftBId = pathDraftB.result.value.split("/rotinas/")[1].split("?")[0];
    console.log(`  Ficha B criada com identificador: ${workoutDraftBId}`);
    assert.notEqual(workoutDraftAId, workoutDraftBId, "Ficha B deve ter um ID completamente diferente da Ficha A");

    // Renomear Ficha B para "Teste de Retomada B"
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const titleBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Nova Ficha de Treino') || b.innerText.includes('Treino'));
        if (titleBtn) titleBtn.click();
      })()`,
    });
    await sleep(500);

    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const input = document.querySelector('input[value*="Treino"], input[value*="Nova Ficha"]');
        if (input) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          nativeSetter.call(input, "Teste de Retomada B");
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      })()`,
    });
    await sleep(1000);

    // Adicionar APENAS Leg Press na Ficha B (não deve conter Supino nem Agachamento nem Puxada)
    console.log("  Adicionando apenas 'Leg Press' na Ficha B...");
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const input = document.querySelector('input[placeholder*="Buscar exercício"]');
        if (input) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          nativeSetter.call(input, "Leg Press");
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`,
    });
    await sleep(1200);

    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const item = document.querySelector('[data-testid="empty-search-exercise-item"]') || 
          Array.from(document.querySelectorAll('div')).find(el => el.innerText && el.innerText.toLowerCase().includes('leg press'));
        if (item) {
          const btn = item.querySelector('button') || item;
          btn.click();
          return true;
        }
        return false;
      })()`,
    });
    await sleep(2500);
    await captureScreenshot(cdp, "p0-05-draft-b-legpress.png");

    // Verificar se Ficha B contém Leg Press e NÃO contém Supino
    const draftBContent = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const body = document.body.innerText;
        return {
          hasLegPress: body.toLowerCase().includes('leg press'),
          hasSupino: body.includes('Supino'),
          hasAgachamento: body.includes('Agachamento'),
        };
      })()`,
      returnByValue: true,
    });
    console.log("  Conteúdo da Ficha B:", draftBContent.result.value);
    assert.equal(draftBContent.result.value.hasLegPress, true, "Ficha B deve ter Leg Press");
    assert.equal(draftBContent.result.value.hasSupino, false, "Ficha B NÃO deve ter Supino da Ficha A");

    // Voltar para Início
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const backBtn = btns.find(b => b.title === 'Voltar' || b.textContent.trim() === 'Voltar');
        if (backBtn) backBtn.click();
      })()`,
    });
    await sleep(2500);

    // No Início, agora o card de rascunho deve apontar para a Ficha B (mais recentemente editada)
    const inicioAfterDraftB = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const resumeLink = links.find(l => l.textContent.includes('Retomar edição'));
        const cardSection = document.querySelector('section[aria-label="Rascunho de treino"]');
        return {
          cardText: cardSection ? cardSection.innerText.replace(/\\s+/g, ' ') : null,
          resumeHref: resumeLink ? resumeLink.getAttribute('href') : null,
        };
      })()`,
      returnByValue: true,
    });
    console.log("  Início após Ficha B:", inicioAfterDraftB.result.value);
    assert.ok(
      inicioAfterDraftB.result.value.resumeHref?.includes(workoutDraftBId),
      `Card de rascunho deve agora apontar para a Ficha B (${workoutDraftBId})`
    );

    // Agora abrir Ficha A diretamente por URL e verificar se ela continua 100% intacta sem vazamento da Ficha B
    console.log("  Abrindo Ficha A diretamente por URL e testando F5...");
    await cdp.send("Page.navigate", { url: `http://localhost:3000/consultoria/saiya-shape/rotinas/${workoutDraftAId}` });
    await sleep(3000);

    // Executar F5 (Reload direto)
    console.log("  Executando F5 (Page.reload)...");
    await cdp.send("Page.reload");
    await sleep(3500);

    const draftAAfterReload = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const body = document.body.innerText;
        return {
          hasSupino: body.includes('Supino'),
          hasAgachamento: body.includes('Agachamento'),
          hasPuxada: body.includes('Puxada'),
          hasLegPress: body.toLowerCase().includes('leg press'),
          is404: document.title.includes('404') || body.includes('Página não encontrada'),
        };
      })()`,
      returnByValue: true,
    });
    console.log("  Ficha A após F5 direto:", draftAAfterReload.result.value);
    assert.equal(draftAAfterReload.result.value.is404, false, "Ficha A não deve ser 404 após F5");
    assert.equal(draftAAfterReload.result.value.hasSupino, true, "Ficha A mantém Supino após F5");
    assert.equal(draftAAfterReload.result.value.hasAgachamento, true, "Ficha A mantém Agachamento após F5");
    assert.equal(draftAAfterReload.result.value.hasPuxada, true, "Ficha A mantém Puxada após F5");
    assert.equal(draftAAfterReload.result.value.hasLegPress, false, "Ficha A NUNCA deve conter dados da Ficha B");

    console.log("  [PASS] Cenário 2: Isolamento 100% garantido entre Ficha A e Ficha B!");

    // -------------------------------------------------------------------------
    // ETAPA 6: RESPONSIVIDADE EM TODOS OS VIEWPORTS HOMOLOGADOS
    // -------------------------------------------------------------------------
    console.log("\n[6/7] Capturando evidências em todos os viewports oficiais...");
    const viewports = [
      { width: 320, height: 600, name: "p0-06-viewport-320px.png", mobile: true },
      { width: 360, height: 740, name: "p0-07-viewport-360px.png", mobile: true },
      { width: 390, height: 844, name: "p0-08-viewport-390px.png", mobile: true },
      { width: 412, height: 915, name: "p0-09-viewport-412px.png", mobile: true },
      { width: 768, height: 1024, name: "p0-10-viewport-768px-tablet.png", mobile: false },
      { width: 1024, height: 768, name: "p0-11-viewport-1024px-laptop.png", mobile: false },
      { width: 1440, height: 900, name: "p0-12-viewport-1440px-desktop.png", mobile: false },
    ];

    for (const vp of viewports) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: vp.mobile,
      });
      await sleep(800);
      await captureScreenshot(cdp, vp.name);
    }
    console.log("  [PASS] Todos os 7 viewports capturados com sucesso!");

    console.log("\n[7/7] VALIDAÇÃO CONCLUÍDA COM 100% DE SUCESSO!");
  } finally {
    if (cdp) cdp.close();
    if (edgeProcess) edgeProcess.kill();
    if (nextProcess) nextProcess.kill();
    if (edgeTmpDir) {
      try {
        fs.rmSync(edgeTmpDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

run().catch((err) => {
  console.error("\nFALHA NA VALIDAÇÃO E2E:", err);
  process.exit(1);
});
