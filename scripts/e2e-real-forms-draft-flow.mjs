/**
 * TREVO ONE — REAL RUNTIME E2E VALIDATION: DRAFT FORM ASSIGNMENT VIA REAL NEXT.JS SERVER & EDGE CDP
 *
 * This script:
 * 1. Seeds required test state in local MariaDB (Saiya Shape, Trainer, Student Daien Silva, DRAFT form model, active auth session).
 * 2. Starts the REAL Next.js production server on port 3000.
 * 3. Launches REAL Microsoft Edge in headless mode with remote debugging port 9222.
 * 4. Connects via Chrome DevTools Protocol (CDP) WebSocket:
 *    - Injects real auth session cookie.
 *    - Navigates to real student detail URL: /consultoria/saiya-shape/progresso/alunos/[daienMembershipPublicId].
 *    - Clicks the 'Formulários' tab in the real rendered React DOM.
 *    - Clicks 'Novo formulário' to open the chooser modal.
 *    - Takes real browser screenshot: real-e2e-01-chooser-modal.png.
 *    - Clicks 'Escolher modelo existente'.
 *    - Selects the DRAFT form model in the real HTML <select> dropdown.
 *    - Takes real browser screenshot: real-e2e-02-assign-modal-draft-selected.png.
 *    - Clicks 'Atribuir Formulário'.
 *    - Awaits Next.js server action completion.
 *    - Confirms zero errors and confirms 'Formulário Atribuído com Sucesso!'.
 *    - Takes real browser screenshot: real-e2e-03-assign-draft-success.png.
 *    - Validates database state (consultancy_forms auto-published, assignment created in PENDING).
 * 5. Cleans up all processes and temporary resources.
 */

import mysql from "mysql2/promise";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

const ARTIFACT_DIR = "C:\\Users\\User\\.gemini\\antigravity\\brain\\bda29c4f-b0d7-4433-9298-37b93b4df5ec";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const dbConfig = {
  host: "127.0.0.1",
  port: 3306,
  user: "trevo_qa",
  password: "trevo_one_qa_pass",
  database: "trevo_one_qa",
};

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

  on(event, handler) {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event).push(handler);
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // ignore
    }
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
    } catch {
      // retry
    }
    await sleep(500);
  }
  throw new Error(`Timeout waiting for server at ${url}`);
}

async function runE2E() {
  console.log("==================================================================");
  console.log("   TREVO ONE — REAL NEXT.JS E2E RUNTIME TEST: DRAFT MODEL FLOW    ");
  console.log("==================================================================\n");

  const pool = mysql.createPool(dbConfig);
  let nextProcess = null;
  let edgeProcess = null;
  let edgeTmpDir = null;
  let cdp = null;

  try {
    // -------------------------------------------------------------------------
    // 1. SEED DATABASE (Consultancy, Admin User, Student Daien Silva, Draft Form)
    // -------------------------------------------------------------------------
    console.log("[1/6] Preparando dados no banco MariaDB (trevo_one_qa)...");

    // 1.1 Consultoria Saiya Shape
    let [cRows] = await pool.query(
      "SELECT id, public_id, slug FROM consultancies WHERE slug = 'saiya-shape' LIMIT 1;"
    );
    let consultancyId;
    if (cRows.length === 0) {
      const [ins] = await pool.query(
        "INSERT INTO consultancies (public_id, name, slug, status, created_at, updated_at) VALUES (UUID(), 'Saiya Shape Consultoria', 'saiya-shape', 'ACTIVE', NOW(3), NOW(3));"
      );
      consultancyId = ins.insertId;
    } else {
      consultancyId = cRows[0].id;
    }

    // 1.2 Usuário Treinador / Admin
    let [tRows] = await pool.query(
      "SELECT id, public_id FROM users WHERE email = 'treinador.teste@trevoone.com' LIMIT 1;"
    );
    let trainerUserId;
    if (tRows.length === 0) {
      const [uIns] = await pool.query(
        "INSERT INTO users (public_id, full_name, email, password_hash, status, created_at, updated_at) VALUES (UUID(), 'Matheus Personal Admin', 'treinador.teste@trevoone.com', 'dummy_hash', 'ACTIVE', NOW(3), NOW(3));"
      );
      trainerUserId = uIns.insertId;
    } else {
      trainerUserId = tRows[0].id;
    }

    // Membro do treinador
    let [tmRows] = await pool.query(
      "SELECT id FROM consultancy_members WHERE consultancy_id = ? AND user_id = ? LIMIT 1;",
      [consultancyId, trainerUserId]
    );
    let trainerMemberId;
    if (tmRows.length === 0) {
      const [ins] = await pool.query(
        "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (UUID(), ?, ?, 'ACTIVE', NOW(3), NOW(3));",
        [consultancyId, trainerUserId]
      );
      trainerMemberId = ins.insertId;
    } else {
      trainerMemberId = tmRows[0].id;
    }

    // Papéis do treinador (PERSONAL e CONSULTANCY_ADMIN)
    await pool.query(
      "INSERT IGNORE INTO consultancy_member_roles (member_id, role, created_at) VALUES (?, 'PERSONAL', NOW(3)), (?, 'CONSULTANCY_ADMIN', NOW(3));",
      [trainerMemberId, trainerMemberId]
    );

    // 1.3 Aluno Daien Silva
    let [dRows] = await pool.query(
      "SELECT cm.id AS membership_id, cm.public_id AS membership_public_id, u.id AS user_id, u.full_name, u.email FROM consultancy_members cm JOIN users u ON u.id = cm.user_id WHERE cm.consultancy_id = ? AND u.full_name LIKE '%Daien%' LIMIT 1;",
      [consultancyId]
    );
    let daien;
    if (dRows.length === 0) {
      const [uIns] = await pool.query(
        "INSERT INTO users (public_id, full_name, email, password_hash, status, created_at, updated_at) VALUES (UUID(), 'Daien Silva', 'daien.silva@trevoone.com', 'dummy_hash', 'ACTIVE', NOW(3), NOW(3));"
      );
      const daienUserId = uIns.insertId;
      const [cmIns] = await pool.query(
        "INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at) VALUES (UUID(), ?, ?, 'ACTIVE', NOW(3), NOW(3));",
        [consultancyId, daienUserId]
      );
      const daienMemberId = cmIns.insertId;
      await pool.query(
        "INSERT INTO consultancy_member_roles (member_id, role, created_at) VALUES (?, 'STUDENT', NOW(3));",
        [daienMemberId]
      );
      const [nRows] = await pool.query(
        "SELECT cm.id AS membership_id, cm.public_id AS membership_public_id, u.id AS user_id, u.full_name, u.email FROM consultancy_members cm JOIN users u ON u.id = cm.user_id WHERE cm.id = ?;",
        [daienMemberId]
      );
      daien = nRows[0];
    } else {
      daien = dRows[0];
    }
    console.log(`[OK] Aluno Daien Silva configurado: ${daien.membership_public_id} (${daien.full_name})`);

    // 1.4 Sessão de autenticação real para o treinador
    const rawSessionToken = crypto.randomBytes(32).toString("hex");
    const sessionTokenHash = crypto.createHash("sha256").update(rawSessionToken).digest("hex");
    await pool.query(
      "INSERT INTO auth_sessions (user_id, token_hash, remember_me, expires_at, created_at) VALUES (?, ?, 1, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 1 DAY), UTC_TIMESTAMP(3));",
      [trainerUserId, sessionTokenHash]
    );
    console.log("[OK] Sessão de autenticação criada para o Treinador.");

    // 1.5 Formulário em RASCUNHO (status = 'DRAFT')
    await pool.query("DELETE FROM consultancy_form_assignments WHERE consultancy_id = ?;", [consultancyId]);
    await pool.query("DELETE FROM consultancy_forms WHERE consultancy_id = ? AND title LIKE '%Rascunho%';", [consultancyId]);

    const draftFormPublicId = crypto.randomUUID();
    const draftQuestions = [
      { id: "q_semana", type: "SHORT_TEXT", title: "Como você avalia sua semana de treinos?", required: true },
      { id: "q_energia", type: "SCALE", title: "Nível geral de energia (1 a 10)", required: false, scaleMin: 1, scaleMax: 10 },
      { id: "q_obs", type: "LONG_TEXT", title: "Observações ou desconfortos articulares", required: false },
    ];

    await pool.query(
      `INSERT INTO consultancy_forms (
        public_id, consultancy_id, title, description, questions_json,
        status, is_recurring, created_by_user_id, created_at, updated_at
      ) VALUES (?, ?, 'Check-in Semanal de Rotina (Rascunho)', 'Modelo de acompanhamento salvo como rascunho', ?, 'DRAFT', 0, ?, NOW(3), NOW(3));`,
      [draftFormPublicId, consultancyId, JSON.stringify(draftQuestions), trainerUserId]
    );
    console.log(`[OK] Modelo em RASCUNHO inserido no banco: ${draftFormPublicId} (status: DRAFT)`);

    // -------------------------------------------------------------------------
    // 2. START REAL NEXT.JS SERVER (next start)
    // -------------------------------------------------------------------------
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
    console.log("[OK] Servidor real Next.js respondendo na porta 3000!");

    // -------------------------------------------------------------------------
    // 3. LAUNCH MICROSOFT EDGE VIA REMOTE DEBUGGING (CDP)
    // -------------------------------------------------------------------------
    console.log("\n[3/6] Iniciando navegador Edge real em modo headless CDP...");
    edgeTmpDir = path.join(os.tmpdir(), `edge-e2e-${Date.now()}`);
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

    await sleep(2000);

    const versionRes = await fetch("http://127.0.0.1:9222/json/list");
    const pages = await versionRes.json();
    assert.ok(pages.length > 0, "Edge deve disponibilizar uma página ativa");
    const wsUrl = pages[0].webSocketDebuggerUrl;
    console.log(`[OK] Edge conectado via CDP WebSocket: ${wsUrl}`);

    cdp = new CdpClient(wsUrl);
    await cdp.connect();

    await cdp.send("Network.enable");
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("DOM.enable");

    // Configurar viewport 1280x850
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 850,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Injetar cookie de autenticação real
    await cdp.send("Network.setCookie", {
      name: "trevo_session",
      value: rawSessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    });
    console.log("[OK] Cookie trevo_session injetado no navegador real.");

    // Desativar tutorial de primeiro acesso para não bloquear modais
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: "localStorage.setItem('trevo_first_access_tutorial_v1', 'completed');",
    });

    // -------------------------------------------------------------------------
    // 4. NAVEGAR ATÉ A TELA REAL DO ALUNO E NAVEGAR PARA A ABA FORMULÁRIOS
    // -------------------------------------------------------------------------
    const targetUrl = `http://localhost:3000/consultoria/saiya-shape/progresso/alunos/${daien.membership_public_id}`;
    console.log(`\n[4/6] Navegando até a URL real: ${targetUrl}...`);

    let pageLoadedResolve;
    const pageLoadedPromise = new Promise((r) => (pageLoadedResolve = r));
    cdp.on("Page.loadEventFired", () => pageLoadedResolve());

    await cdp.send("Page.navigate", { url: targetUrl });
    await pageLoadedPromise;
    await sleep(2000); // Aguardar hidratação React

    // Verificar se renderizou a tela do aluno
    const pageTitleRes = await cdp.send("Runtime.evaluate", {
      expression: "document.title",
    });
    console.log(`[OK] Página carregada no navegador: "${pageTitleRes.result.value}"`);

    // Clicar na aba "Formulários"
    console.log("Clicando na aba 'Formulários'...");
    const tabClickRes = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const formTab = buttons.find(b => b.textContent.includes('Formulários'));
        if (formTab) {
          formTab.click();
          return { clicked: true, text: formTab.textContent.trim() };
        }
        return { clicked: false };
      })()`,
      returnByValue: true,
    });
    console.log("Resultado do clique na aba:", tabClickRes.result.value);
    await sleep(1000);

    // -------------------------------------------------------------------------
    // 5. TESTAR O FLUXO: NOVO FORMULÁRIO -> MODELO EXISTENTE -> SELECIONAR RASCUNHO
    // -------------------------------------------------------------------------
    console.log("\n[5/6] Executando o fluxo exato: 'Novo Formulário' -> 'Escolher modelo existente' -> 'Rascunho'...");

    // 5.1 Clicar no botão "Novo formulário"
    const openChooserRes = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.includes('Novo formulário'));
        if (btn) {
          btn.click();
          return { clicked: true, text: btn.textContent.trim() };
        }
        return { clicked: false };
      })()`,
      returnByValue: true,
    });
    assert.ok(openChooserRes.result.value.clicked, "Botão 'Novo formulário' deve ser clicado");
    console.log("[OK] Botão 'Novo formulário' clicado no DOM real.");
    await sleep(600);

    // Screenshot 1: Chooser Modal aberto
    const ssChooser = await cdp.send("Page.captureScreenshot", { format: "png" });
    const chooserPath = path.join(ARTIFACT_DIR, "real-e2e-01-chooser-modal.png");
    fs.writeFileSync(chooserPath, Buffer.from(ssChooser.data, "base64"));
    console.log(`[EVIDÊNCIA 1] Screenshot real gerado: ${chooserPath}`);

    // 5.2 Clicar na opção "Escolher modelo existente"
    console.log("Clicando em 'Escolher modelo existente' no modal...");
    const clickExistingRes = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.includes('Escolher modelo existente'));
        if (btn) {
          btn.click();
          return { clicked: true, text: btn.textContent.trim() };
        }
        return { clicked: false };
      })()`,
      returnByValue: true,
    });
    assert.ok(clickExistingRes.result.value.clicked, "Opção 'Escolher modelo existente' deve ser clicada");
    console.log("[OK] 'Escolher modelo existente' clicado.");
    await sleep(800);

    // 5.3 Verificar se o modal AssignFormModal abriu e contém o modelo em RASCUNHO
    const selectDraftRes = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const modalTitle = document.getElementById('assign-modal-title');
        const select = document.querySelector('select');
        if (!select) return { error: 'Elemento select não encontrado' };

        const options = Array.from(select.options).map(o => ({ value: o.value, text: o.text }));
        // Localizar a opção do modelo recém-criado em rascunho
        const draftOpt = options.find(o => o.value === '${draftFormPublicId}') || options.find(o => o.text.includes('(Rascunho)'));
        if (!draftOpt) {
          return { error: 'Modelo em rascunho não encontrado nas opções', options };
        }

        // Selecionar o modelo em rascunho
        select.value = draftOpt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));

        return {
          success: true,
          modalTitle: modalTitle ? modalTitle.textContent : null,
          selectedTitle: draftOpt.text,
          selectedValue: draftOpt.value,
          allOptions: options
        };
      })()`,
      returnByValue: true,
    });

    console.log("Inspeção do modal e opções no DOM:", selectDraftRes.result.value);
    assert.ok(selectDraftRes.result.value.success, `Falha ao selecionar modelo em rascunho: ${selectDraftRes.result.value.error}`);
    console.log(`[OK] Modelo em rascunho selecionado: "${selectDraftRes.result.value.selectedTitle}"`);
    await sleep(600);

    // Screenshot 2: Assign Modal com o modelo em rascunho selecionado e aluno Daien Silva
    const ssAssignModal = await cdp.send("Page.captureScreenshot", { format: "png" });
    const assignModalPath = path.join(ARTIFACT_DIR, "real-e2e-02-assign-modal-draft-selected.png");
    fs.writeFileSync(assignModalPath, Buffer.from(ssAssignModal.data, "base64"));
    console.log(`[EVIDÊNCIA 2] Screenshot real gerado: ${assignModalPath}`);

    // 5.4 Clicar no botão "Atribuir Formulário"
    console.log("\nClicando em 'Atribuir Formulário'...");
    const clickSubmitRes = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.includes('Atribuir Formulário'));
        if (btn) {
          btn.click();
          return { clicked: true, text: btn.textContent.trim() };
        }
        return { clicked: false };
      })()`,
      returnByValue: true,
    });
    assert.ok(clickSubmitRes.result.value.clicked, "Botão 'Atribuir Formulário' deve ser clicado");
    console.log("[OK] Botão 'Atribuir Formulário' clicado. Aguardando processamento da Server Action...");

    // Aguardar conclusão da Server Action e verificar o DOM
    let isSuccess = false;
    let lastState = null;
    for (let i = 0; i < 15; i++) {
      await sleep(1000);
      const checkRes = await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const bodyText = document.body.innerText;
          const modalText = document.querySelector('[role="dialog"]')?.innerText || '';
          const hasSuccessTitle =
            bodyText.includes('Formulário Atribuído com Sucesso') ||
            bodyText.includes('Enviado para') ||
            modalText.includes('Formulário Atribuído com Sucesso');
          const hasAssignedCard =
            bodyText.includes('Check-in Semanal de Rotina (Rascunho)') &&
            bodyText.includes('Aguardando resposta');
          const hasSqlError =
            bodyText.includes("Unknown column 'up.phone'") ||
            bodyText.includes('ER_BAD_FIELD_ERROR') ||
            modalText.includes("Unknown column 'up.phone'");
          const errorBox = document.querySelector('.bg-rose-500\\\\/10')?.textContent || null;

          return {
            hasSuccessTitle,
            hasAssignedCard,
            hasSqlError,
            errorBox,
            bodySnippet: bodyText.slice(0, 400),
          };
        })()`,
        returnByValue: true,
      });

      lastState = checkRes.result.value;
      console.log(`  [Poll ${i + 1}] Estado da tela:`, lastState);

      if (lastState.hasSqlError) {
        throw new Error("ERRO REGRESSIVO DETECTADO NO DOM: Unknown column 'up.phone' apareceu na tela!");
      }

      if (lastState.hasSuccessTitle || lastState.hasAssignedCard) {
        isSuccess = true;
        console.log("[PASS] Atribuição concluída com sucesso no DOM da aplicação real!");
        break;
      }
    }

    // Capture screenshot da tela real após a atribuição
    const ssAfterSubmit = await cdp.send("Page.captureScreenshot", { format: "png" });
    const afterSubmitPath = path.join(ARTIFACT_DIR, "real-e2e-03-assign-draft-success.png");
    fs.writeFileSync(afterSubmitPath, Buffer.from(ssAfterSubmit.data, "base64"));
    console.log(`[EVIDÊNCIA 3] Screenshot real gerado: ${afterSubmitPath}`);

    if (!isSuccess) {
      console.error("FALHA: Estado final da tela:", lastState);
    }
    assert.ok(isSuccess, "A Server Action de atribuição deve ser concluída com sucesso no DOM");

    // -------------------------------------------------------------------------
    // 6. VERIFICAÇÃO FINAL NO BANCO DE DADOS
    // -------------------------------------------------------------------------
    console.log("\n[6/6] Verificando persistência e regras de negócio no banco de dados...");

    // 6.1 O formulário antes em DRAFT agora deve estar 'PUBLISHED'
    const [updatedFormRows] = await pool.query(
      "SELECT id, public_id, title, status FROM consultancy_forms WHERE public_id = ?;",
      [draftFormPublicId]
    );
    assert.equal(updatedFormRows[0].status, "PUBLISHED", "Modelo deve ser promovido de DRAFT para PUBLISHED ao ser atribuído");
    console.log(`[PASS] consultancy_forms: status atualizado para '${updatedFormRows[0].status}'.`);

    // 6.2 A atribuição para o aluno Daien Silva deve existir em status 'PENDING'
    const [assignRows] = await pool.query(
      `SELECT cfa.id, cfa.public_id, cfa.status, u.full_name, cf.title
       FROM consultancy_form_assignments cfa
       JOIN consultancy_forms cf ON cf.id = cfa.form_id
       JOIN consultancy_members cm ON cm.id = cfa.student_membership_id
       JOIN users u ON u.id = cm.user_id
       WHERE cf.public_id = ? AND cm.id = ?;`,
      [draftFormPublicId, daien.membership_id]
    );
    assert.ok(assignRows.length >= 1, "Atribuição deve existir no banco");
    assert.equal(assignRows[0].status, "PENDING", "Atribuição deve nascer com status PENDING");
    assert.equal(assignRows[0].full_name, daien.full_name, "Aluno vinculado deve ser Daien Silva");
    console.log(`[PASS] consultancy_form_assignments criado com sucesso:
      - Assignment ID: ${assignRows[0].public_id}
      - Form: ${assignRows[0].title}
      - Aluno: ${assignRows[0].full_name}
      - Status: ${assignRows[0].status}`);

    console.log("\n==================================================================");
    console.log("✓ TESTE E2E REAL CONCLUÍDO COM 100% DE SUCESSO NO RUNTIME DO NEXT!");
    console.log("  - Zero ocorrências de 'Unknown column up.phone'");
    console.log("  - Rascunho selecionado e promovido para publicado perfeitamente");
    console.log("  - Atribuição para Daien Silva gerada e confirmada na UI e no BD");
    console.log("==================================================================\n");
  } finally {
    if (cdp) cdp.close();
    if (edgeProcess) {
      edgeProcess.kill();
      console.log("[Cleanup] Navegador Edge encerrado.");
    }
    if (nextProcess) {
      nextProcess.kill();
      console.log("[Cleanup] Servidor Next.js encerrado.");
    }
    if (edgeTmpDir && fs.existsSync(edgeTmpDir)) {
      try {
        fs.rmSync(edgeTmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
    await pool.end();
  }
}

runE2E().catch((err) => {
  console.error("\n❌ FALHA NO TESTE E2E REAL:", err);
  process.exit(1);
});
