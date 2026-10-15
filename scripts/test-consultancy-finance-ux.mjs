import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("=== INICIANDO TESTE UX/UI: FINANCEIRO E PIX ===");

const root = process.cwd();

function checkFile(relPath, assertions) {
  const fullPath = path.join(root, relPath);
  assert.ok(fs.existsSync(fullPath), `Arquivo não encontrado: ${relPath}`);
  const content = fs.readFileSync(fullPath, "utf-8");
  assertions(content, relPath);
  console.log(`[PASS] ${relPath}`);
}

// 1. Financeiro Dashboard Page
checkFile("app/consultoria/[slug]/financeiro/page.tsx", (code, file) => {
  assert.ok(
    code.includes("bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"),
    `${file} deve conter superfícies sólidas nos cards e contêineres`
  );
  assert.ok(
    !code.includes("bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 shadow-xs"),
    `${file} não deve usar tokens legados translúcidos nas métricas`
  );
  assert.ok(
    code.includes("min-h-[44px]"),
    `${file} deve garantir área de toque acessível (min-h-[44px]) nos botões e links`
  );
});

// 2. Charge Cancel Dialog Modal
checkFile("components/finance/charge-cancel-dialog.tsx", (code, file) => {
  assert.ok(
    code.includes("bg-black/80 backdrop-blur-md"),
    `${file} modal backdrop deve ser opaco e de alto contraste`
  );
  assert.ok(
    code.includes("bg-white dark:bg-zinc-900") && code.includes("border border-zinc-200 dark:border-zinc-800"),
    `${file} modal container deve usar superfície 100% sólida`
  );
  assert.ok(
    code.includes("min-h-[44px]"),
    `${file} botões de ação e cancelamento devem ter min-h-[44px]`
  );
});

// 3. Receipt Review Actions (Approve & Reject Modals)
checkFile("components/finance/receipt-review-actions.tsx", (code, file) => {
  assert.ok(
    code.includes("bg-black/80 backdrop-blur-md"),
    `${file} modais de aprovação e rejeição devem ter backdrop sólido`
  );
  assert.ok(
    code.includes("bg-white dark:bg-zinc-900") && code.includes("border border-zinc-200 dark:border-zinc-800"),
    `${file} modais devem usar superfícies 100% sólidas`
  );
  assert.ok(
    code.includes("min-h-[44px]"),
    `${file} botões de confirmação devem ter min-h-[44px]`
  );
});

// 4. Charge Form Component
checkFile("components/finance/charge-form.tsx", (code, file) => {
  assert.ok(
    code.includes("bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"),
    `${file} dropdown de seleção de alunos deve usar superfície sólida`
  );
  assert.ok(
    code.includes("min-h-[44px]"),
    `${file} botão de submissão e itens de seleção devem ter min-h-[44px]`
  );
  assert.ok(
    code.includes("bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-800"),
    `${file} caixa de restrição de inadimplência deve usar superfície sólida`
  );
});

// 5. Nova Cobrança Page
checkFile("app/consultoria/[slug]/financeiro/nova-cobranca/page.tsx", (code, file) => {
  assert.ok(
    code.includes("bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"),
    `${file} contêiner do formulário deve ser 100% sólido`
  );
});

// 6. Cobrança Detail Page
checkFile("app/consultoria/[slug]/financeiro/cobrancas/[chargePublicId]/page.tsx", (code, file) => {
  assert.ok(
    code.includes("bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"),
    `${file} card de detalhes da cobrança deve ser 100% sólido`
  );
  assert.ok(
    code.includes("bg-zinc-50 dark:bg-zinc-800/60 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800"),
    `${file} caixa de observações deve usar superfície sólida`
  );
});

// 7. Fila de Comprovantes Page
checkFile("app/consultoria/[slug]/financeiro/comprovantes/page.tsx", (code, file) => {
  assert.ok(
    code.includes("bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"),
    `${file} itens da fila de comprovantes devem ser 100% sólidos`
  );
  assert.ok(
    code.includes("min-h-[44px]"),
    `${file} botões de ação e paginação devem ter min-h-[44px]`
  );
});

// 8. Análise de Comprovante Detail Page
checkFile("app/consultoria/[slug]/financeiro/comprovantes/[receiptPublicId]/page.tsx", (code, file) => {
  assert.ok(
    code.includes("bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"),
    `${file} painéis de visualização e metadados devem ser 100% sólidos`
  );
  assert.ok(
    code.includes("min-h-[44px]"),
    `${file} links e botões devem ter min-h-[44px]`
  );
});

// 9. Copy Pix Button
checkFile("components/finance/copy-pix-button.tsx", (code, file) => {
  assert.ok(
    code.includes("min-h-[44px]"),
    `${file} botão de copiar chave Pix deve ter sempre min-h-[44px]`
  );
});

// 10. Receipt Upload Form
checkFile("components/finance/receipt-upload-form.tsx", (code, file) => {
  assert.ok(
    code.includes("bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800"),
    `${file} container do arquivo selecionado deve ser sólido`
  );
  assert.ok(
    code.includes("min-h-[44px]"),
    `${file} botão de envio e remoção devem ter min-h-[44px]`
  );
});

console.log("=== TODOS OS TESTES UX DE FINANCEIRO E PIX PASSARAM (10/10) ===");
