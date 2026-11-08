/**
 * TREVO ONE — REPRODUCE "RETOMAR EDIÇÃO ABRE EDITOR VAZIO"
 * Investigating the exact root cause:
 * 1. Multiple drafts in database: does primaryDraft pick an old empty draft?
 * 2. Does router.back() go to /rotinas/novo or leave stale bfcache?
 * 3. Does revalidation update the draft card on Início?
 * 4. Does getWorkoutWithSpecificVersion or WorkoutEditor4 drop items?
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

async function run() {
  console.log("==================================================================");
  console.log("   INVESTIGAÇÃO P0: RETOMAR EDIÇÃO ABRE EDITOR VAZIO              ");
  console.log("==================================================================\n");

  let nextProcess = null;
  let edgeProcess = null;
  let edgeTmpDir = null;
  let cdp = null;

  try {
    // 1. Seed QA Database
    console.log("[1/5] Semeando fixtures e criando cenário com rascunho anterior...");
    const fixtures = await seedQaData();

    // Injetar um rascunho anterior VAZIO para simular o banco real do Personal
    const pool = mysql.createPool({
      host: "127.0.0.1",
      port: 3306,
      user: "trevo_qa",
      password: "trevo_one_qa_pass",
      database: "trevo_one_qa",
    });

    const [cRows] = await pool.query("SELECT id FROM consultancies WHERE slug = 'saiya-shape'");
    const consultancyId = cRows[0].id;
    const [mRows] = await pool.query("SELECT id FROM consultancy_members WHERE consultancy_id = ? AND user_id = ?", [consultancyId, fixtures.trainerUserId]);
    const trainerMemberId = mRows[0].id;

    // Criar um rascunho antigo VAZIO (ex: usuário clicou em criar treino anteriormente)
    const oldDraftPublicId = crypto.randomUUID();
    const [wOld] = await pool.query(
      "INSERT INTO workouts (public_id, consultancy_id, created_by_membership_id, title, status, is_template, created_at, updated_at) VALUES (?, ?, ?, 'Nova Ficha de Treino Antiga', 'DRAFT', 0, NOW(3) - INTERVAL 1 HOUR, NOW(3) - INTERVAL 1 HOUR)",
      [oldDraftPublicId, consultancyId, trainerMemberId]
    );
    const [vOld] = await pool.query(
      "INSERT INTO workout_versions (public_id, workout_id, version_number, title, status, created_by_membership_id, created_at, updated_at) VALUES (UUID(), ?, 1, 'Nova Ficha de Treino Antiga', 'DRAFT', ?, NOW(3) - INTERVAL 1 HOUR, NOW(3) - INTERVAL 1 HOUR)",
      [wOld.insertId, trainerMemberId]
    );
    await pool.query(
      "INSERT INTO workout_blocks (public_id, workout_version_id, title, sort_order, block_type, created_at, updated_at) VALUES (UUID(), ?, 'Treino A', 1, 'SINGLE', NOW(3) - INTERVAL 1 HOUR, NOW(3) - INTERVAL 1 HOUR)",
      [vOld.insertId]
    );

    console.log(`  [OK] Rascunho antigo VAZIO criado: ${oldDraftPublicId}`);
    await pool.end();

    // 2. Start Next.js
    console.log("\n[2/5] Iniciando o servidor real Next.js na porta 3000...");
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
    console.log("[OK] Servidor Next.js pronto!");

    // 3. Launch Edge via CDP
    console.log("\n[3/5] Iniciando navegador Edge real em modo headless CDP...");
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

    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: "localStorage.setItem('trevo_first_access_tutorial_v1', 'completed');",
    });

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    // -------------------------------------------------------------------------
    // FLUXO DO USUÁRIO
    // -------------------------------------------------------------------------
    console.log("\n[4/5] Rastreando fluxo completo do usuário:");

    // Passo 1: Abrir Início
    console.log("  Passo 1: Personal abre o Início...");
    await cdp.send("Page.navigate", { url: "http://localhost:3000/consultoria/saiya-shape" });
    await sleep(3000);

    const initialDraftCard = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const h3 = Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim());
        const links = Array.from(document.querySelectorAll('a')).map(a => ({ text: a.textContent.trim().replace(/\\s+/g, ' '), href: a.href }));
        const resumeLink = links.find(l => l.text.includes('Retomar edição'));
        const createHeaderBtn = links.find(l => l.text.includes('Criar treino') && l.href.includes('/rotinas/novo'));
        return { h3, resumeLink, createHeaderBtn };
      })()`,
      returnByValue: true,
    });
    console.log("  Início inicial:", initialDraftCard.result.value);

    // Passo 2: Clica em Criar treino no cabeçalho
    console.log("\n  Passo 2: Clica em Criar treino (+ Criar treino no topo)...");
    const createUrl = initialDraftCard.result.value.createHeaderBtn?.href || "http://localhost:3000/consultoria/saiya-shape/rotinas/novo";
    console.log("  Navegando para:", createUrl);
    await cdp.send("Page.navigate", { url: createUrl });
    await sleep(3500);

    const editorPathEval = await cdp.send("Runtime.evaluate", { expression: "window.location.pathname" });
    const newlyCreatedWorkoutId = editorPathEval.result.value.split("/rotinas/")[1].split("?")[0];
    console.log(`  Novo treino criado com sucesso no editor: ${newlyCreatedWorkoutId}`);

    // Passo 3 e 4: Adiciona exercícios (Supino) e configura séries, repetições, descanso
    console.log("\n  Passo 3 e 4: Adiciona Supino e configura 4 séries, 12 reps, 90s...");
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
    await sleep(1500);

    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const elements = Array.from(document.querySelectorAll('div, li')).filter(el => 
          el.textContent.includes('Supino') && !el.querySelector('input[placeholder*="Buscar"]')
        );
        for (const el of elements) {
          const btn = el.querySelector('button');
          if (btn && (btn.textContent.includes('+ Adicionar') || btn.textContent.includes('Adicionar'))) {
            btn.click();
            return true;
          }
        }
        const fallbackBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('+ Adicionar'));
        if (fallbackBtn) fallbackBtn.click();
      })()`,
    });
    await sleep(2500);

    // Passo 5: Aguardar "Salvo"
    console.log("  Passo 5: Verificando se o sistema informou 'Salvo'...");
    const saveStatusEval = await cdp.send("Runtime.evaluate", {
      expression: `document.body.innerText.includes('Salvo')`,
    });
    console.log("  Status Salvo na tela:", saveStatusEval.result.value);

    // Passo 6: Personal toca em Voltar
    console.log("\n  Passo 6: Personal toca em Voltar no editor...");
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const backBtn = btns.find(b => b.title === 'Voltar' || b.textContent.trim() === 'Voltar');
        if (backBtn) backBtn.click();
      })()`,
    });
    await sleep(3000);

    const pathAfterBack = await cdp.send("Runtime.evaluate", { expression: "window.location.pathname" });
    console.log(`  Rota atual após clicar em Voltar: ${pathAfterBack.result.value}`);

    // Passo 7: No Início, inspeciona o card Rascunho de Treino
    console.log("\n  Passo 7: No Início, inspeciona o card Rascunho de Treino...");
    const resumeCardInfo = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const resumeLink = links.find(l => l.textContent.includes('Retomar edição'));
        const cardSection = document.querySelector('section[aria-label="Rascunho de treino"]');
        return {
          cardText: cardSection ? cardSection.innerText.replace(/\\s+/g, ' ') : null,
          resumeHref: resumeLink ? resumeLink.getAttribute('href') : null,
          newlyCreatedWorkoutId: "${newlyCreatedWorkoutId}",
          oldDraftPublicId: "${oldDraftPublicId}",
        };
      })()`,
      returnByValue: true,
    });
    console.log("  Dados do card de rascunho no Início:", JSON.stringify(resumeCardInfo.result.value, null, 2));

    // Passo 8: Clica em Retomar edição
    console.log("\n  Passo 8: Clica no link 'Retomar edição'...");
    const targetResumeHref = resumeCardInfo.result.value.resumeHref;
    console.log("  Destino do clique:", targetResumeHref);

    if (targetResumeHref) {
      await cdp.send("Page.navigate", { url: `http://localhost:3000${targetResumeHref}` });
      await sleep(3500);

      const editorContentAfterResume = await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const path = window.location.pathname;
          const body = document.body.innerText;
          const hasSupino = body.includes('Supino');
          const hasEmptyState = body.includes('Vamos adicionar o primeiro exercício?');
          return { path, hasSupino, hasEmptyState, bodyPreview: body.slice(0, 300) };
        })()`,
        returnByValue: true,
      });

      console.log("  Conteúdo do Editor após Retomar:", JSON.stringify(editorContentAfterResume.result.value, null, 2));
    }

  } finally {
    console.log("\n[5/5] Finalizando...");
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
  console.error("ERRO NO TESTE DE REPRODUÇÃO:", err);
  process.exit(1);
});
