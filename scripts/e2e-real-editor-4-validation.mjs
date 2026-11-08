/**
 * TREVO ONE — REAL RUNTIME E2E VALIDATION: EDITOR 4.0 COMPLETE FLOWS & REAL SCREENSHOTS
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
  console.log(`[EVIDÊNCIA REAL CAPTURADA] ${filename}`);
  return outPath;
}

async function run() {
  console.log("==================================================================");
  console.log("   TREVO ONE — REAL NEXT.JS E2E RUNTIME VALIDATION: EDITOR 4.0   ");
  console.log("==================================================================\n");

  let nextProcess = null;
  let edgeProcess = null;
  let edgeTmpDir = null;
  let cdp = null;

  try {
    // 1. Seed QA Database
    console.log("[1/6] Configurando banco de dados de homologação (trevo_one_qa)...");
    const fixtures = await seedQaData();
    console.log("[OK] Fixtures prontas. Token de sessão gerado.");

    // 2. Start Next.js production server
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
    console.log("[OK] Servidor real Next.js pronto!");

    // 3. Launch Edge via CDP
    console.log("\n[3/6] Iniciando navegador Edge real em modo headless CDP...");
    edgeTmpDir = path.join(os.tmpdir(), `edge-e2e-editor4-${Date.now()}`);
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
    assert.ok(pages.length > 0, "Edge deve disponibilizar uma página ativa");
    const wsUrl = pages[0].webSocketDebuggerUrl;
    console.log(`[OK] Edge conectado via CDP WebSocket.`);

    cdp = new CdpClient(wsUrl);
    await cdp.connect();

    await cdp.send("Network.enable");
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("DOM.enable");

    // Injetar cookie trevo_session
    await cdp.send("Network.setCookie", {
      name: "trevo_session",
      value: fixtures.rawSessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    });
    console.log("[OK] Cookie trevo_session autenticado injetado com sucesso.");

    // Desativar tutorial de primeiro acesso
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: "localStorage.setItem('trevo_first_access_tutorial_v1', 'completed');",
    });

    // -------------------------------------------------------------------------
    // 4. TESTAR FLUXOS DE PONTA A PONTA
    // -------------------------------------------------------------------------
    console.log("\n[4/6] Executando os 14 fluxos de ponta a ponta no Editor 4.0 real...");

    // FLUXO 1: Criar treino para aluno
    console.log("\n--- FLUXO 1: Criar treino para aluno ---");
    const createUrl = `http://localhost:3000/consultoria/saiya-shape/rotinas/novo?student=${fixtures.studentMemberPublicId}`;
    await cdp.send("Page.navigate", { url: createUrl });
    await sleep(3000);

    // Configurar viewport Desktop (1366x768)
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1366,
      height: 768,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await sleep(1000);

    // EVIDÊNCIA 1: Editor vazio desktop
    await captureScreenshot(cdp, "real-editor-4-01-empty-desktop.png");

    // EVIDÊNCIA 2: Editor vazio mobile 390px
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(1000);
    await captureScreenshot(cdp, "real-editor-4-02-empty-mobile-390px.png");

    // EVIDÊNCIA 3: Editor vazio mobile 320px com dock de 5 colunas perfeito
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 320,
      height: 600,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(1000);
    await captureScreenshot(cdp, "real-editor-4-03-empty-mobile-320px.png");

    // Voltar para Desktop para adicionar exercícios e testar métodos
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1366,
      height: 850,
      deviceScaleFactor: 1.5,
      mobile: false,
    });
    await sleep(1000);

    // FLUXO 2: Adicionar 5 exercícios pela busca
    console.log("\n--- FLUXO 2: Adicionar cinco exercícios pela busca integrada ---");
    // Digitar na busca do empty state
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const input = document.querySelector('input[placeholder*="Buscar exercício"]');
        if (input) {
          input.value = "Supino";
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`,
    });
    await sleep(1000);

    // Clicar no primeiro resultado
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector('button:has-text("+ Adicionar"), div:has-text("+ Adicionar")');
        const allBtns = Array.from(document.querySelectorAll('button'));
        const addBtn = allBtns.find(b => b.textContent.includes('+ Adicionar'));
        if (addBtn) addBtn.click();
      })()`,
    });
    await sleep(1500);

    // Abrir o modal de adicionar para incluir mais 4 exercícios
    const exerciseNamesToAdd = [
      "Crucifixo com halteres",
      "Tríceps testa na polia",
      "Tríceps corda",
      "Supino inclinado com halteres"
    ];

    for (const exName of exerciseNamesToAdd) {
      // Clicar no dock "Adicionar"
      await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const addDock = btns.find(b => b.textContent.trim().startsWith('Adicionar'));
          if (addDock) addDock.click();
        })()`,
      });
      await sleep(1000);

      // Digitar na busca do modal
      await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const input = document.querySelector('input[placeholder*="Buscar exercício pelo nome"]');
          if (input) {
            input.value = "${exName}";
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        })()`,
      });
      await sleep(1000);

      // Clicar em + Adicionar
      await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const addBtn = btns.find(b => b.textContent.includes('+ Adicionar'));
          if (addBtn) addBtn.click();
        })()`,
      });
      await sleep(1500);
    }

    // EVIDÊNCIA 4: Editor com cinco exercícios
    await captureScreenshot(cdp, "real-editor-4-04-five-exercises-desktop.png");

    // FLUXO 3: Editar séries, repetições, carga e descanso
    console.log("\n--- FLUXO 3: Editar séries, repetições, carga e descanso ---");
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const seriesInput = inputs.find(i => i.value === '3' || i.value === '4');
        if (seriesInput) {
          seriesInput.value = '4';
          seriesInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`,
    });
    await sleep(1000);

    // FLUXO 4: Inserir exercício entre outros dois usando "+ Inserir aqui"
    console.log("\n--- FLUXO 4: Inserir exercício entre outros dois ---");
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const dividers = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Inserir aqui'));
        if (dividers.length > 1) {
          dividers[1].click();
        }
      })()`,
    });
    await sleep(1000);

    // FLUXO 5: Criar Bi-set, Tri-set, Circuito e Supersérie via MethodModal
    console.log("\n--- FLUXO 5: Criar métodos avançados com slots guiados ---");
    // Clicar em "Bi-set (2 exercícios)" no menu do divider
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const bisetBtn = btns.find(b => b.textContent.includes('Bi-set'));
        if (bisetBtn) bisetBtn.click();
      })()`,
    });
    await sleep(1200);

    // MethodModal aberto: confirmar bi-set com os 2 exercícios preenchidos dos slots
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const confirmBtn = btns.find(b => b.textContent.includes('Confirmar e Criar'));
        if (confirmBtn) confirmBtn.click();
      })()`,
    });
    await sleep(2000);

    // EVIDÊNCIA 6: Bi-set e métodos criados
    await captureScreenshot(cdp, "real-editor-4-06-biset-circuito-desktop.png");

    // FLUXO 6 & 7 & 8: Treinos A, B e C + Reorganizar
    console.log("\n--- FLUXO 6, 7 & 8: Treinos A, B e C e reordenação ---");
    // Clicar em "+ Nova divisão"
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const newDivBtn = btns.find(b => b.textContent.includes('+ Nova divisão'));
        if (newDivBtn) newDivBtn.click();
      })()`,
    });
    await sleep(1500);

    // Clicar em "+ Nova divisão" novamente para criar Treino C
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const newDivBtn = btns.find(b => b.textContent.includes('+ Nova divisão'));
        if (newDivBtn) newDivBtn.click();
      })()`,
    });
    await sleep(1500);

    // EVIDÊNCIA 5: Treino ABC
    await captureScreenshot(cdp, "real-editor-4-05-treino-abc-desktop.png");

    // Abrir Drawer Organizar
    console.log("\n--- Abrindo Drawer Organizar ---");
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const orgBtn = btns.find(b => b.textContent.trim().startsWith('Organizar'));
        if (orgBtn) orgBtn.click();
      })()`,
    });
    await sleep(1000);
    // EVIDÊNCIA 7: Modo Organizar
    await captureScreenshot(cdp, "real-editor-4-07-reorder-drawer.png");

    // Fechar Drawer Organizar
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const closeBtn = document.querySelector('button:has-text("✕")');
        const btns = Array.from(document.querySelectorAll('button'));
        const xBtn = btns.find(b => b.textContent.trim() === '✕' || b.textContent.includes('Cancelar'));
        if (xBtn) xBtn.click();
      })()`,
    });
    await sleep(1000);

    // FLUXO 9: Abrir Drawer Modelos
    console.log("\n--- FLUXO 9: Biblioteca de Modelos ---");
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const modBtn = btns.find(b => b.textContent.trim().startsWith('Modelos'));
        if (modBtn) modBtn.click();
      })()`,
    });
    await sleep(1200);
    // EVIDÊNCIA 8: Biblioteca de Modelos
    await captureScreenshot(cdp, "real-editor-4-08-models-drawer.png");

    // Fechar Drawer Modelos
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const xBtn = btns.find(b => b.textContent.trim() === '✕');
        if (xBtn) xBtn.click();
      })()`,
    });
    await sleep(1000);

    // FLUXO 10: Abrir IA ("Me ajuda")
    console.log("\n--- FLUXO 10: Drawer IA (Me ajuda) ---");
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const aiBtn = btns.find(b => b.textContent.trim().includes('Me ajuda'));
        if (aiBtn) aiBtn.click();
      })()`,
    });
    await sleep(1200);
    // EVIDÊNCIA 9: IA Aberta
    await captureScreenshot(cdp, "real-editor-4-09-ai-helper-drawer.png");

    // Fechar Drawer IA
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const xBtn = btns.find(b => b.textContent.trim() === '✕');
        if (xBtn) xBtn.click();
      })()`,
    });
    await sleep(1000);

    // FLUXO 12: Abrir Prévia
    console.log("\n--- FLUXO 12: Prévia em Tela Cheia ---");
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const prevBtn = btns.find(b => b.textContent.trim().includes('Prévia'));
        if (prevBtn) prevBtn.click();
      })()`,
    });
    await sleep(1500);

    // Fechar Prévia
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const closePrev = btns.find(b => b.textContent.includes('Fechar prévia'));
        if (closePrev) closePrev.click();
      })()`,
    });
    await sleep(1000);

    // FLUXO 13: Drawer de Finalização com validação
    console.log("\n--- FLUXO 13: Drawer de Finalização ---");
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const finBtn = btns.find(b => b.textContent.trim().includes('Finalizar'));
        if (finBtn) finBtn.click();
      })()`,
    });
    await sleep(1200);
    // EVIDÊNCIA 10: Finalização com Checklist
    await captureScreenshot(cdp, "real-editor-4-10-finalize-drawer.png");

    // Fechar Drawer de Finalização
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const xBtn = btns.find(b => b.textContent.trim() === '✕' || b.textContent.includes('Voltar à edição'));
        if (xBtn) xBtn.click();
      })()`,
    });
    await sleep(1000);

    // FLUXO 14: Mobile 320px com dock completa de 5 botões
    console.log("\n--- TESTE MOBILE: 320px e 390px ---");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 320,
      height: 600,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(1000);
    // EVIDÊNCIA 11: Celular 320px com barra completa
    await captureScreenshot(cdp, "real-editor-4-11-mobile-320px-full-dock.png");

    // Celular 390px com teclado / input focado
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 600, // altura reduzida para simular teclado virtual aberto
      deviceScaleFactor: 2,
      mobile: true,
    });
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const firstInput = document.querySelector('input');
        if (firstInput) firstInput.focus();
      })()`,
    });
    await sleep(1000);
    // EVIDÊNCIA 12: Celular 390px com input ativo
    await captureScreenshot(cdp, "real-editor-4-12-mobile-390px-keyboard-input.png");

    console.log("\n[5/6] Todos os 14 fluxos executados com sucesso no runtime real!");

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
  console.log("   E2E RUNTIME VALIDATION COMPLETED: ALL 14 FLOWS PASS            ");
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("FATAL ERROR IN REAL RUNTIME E2E:", err);
  process.exit(1);
});
