/**
 * Test: Intake Form & Anamnesis Wide Editor Verification
 * Verifies all architectural, layout, ergonomic, and regression requirements for the wide editor.
 */

import fs from "fs";
import path from "path";
import assert from "assert";

const editorPath = path.resolve("components/consultancies/personal-student-hub/intake-form-editor-dialog.tsx");
const anamnesisHubPath = path.resolve("components/consultancies/personal-student-hub/student-anamnesis-hub.tsx");
const formsHubPath = path.resolve("components/consultancies/personal-student-hub/student-forms-hub.tsx");

assert.ok(fs.existsSync(editorPath), "intake-form-editor-dialog.tsx must exist");
assert.ok(fs.existsSync(anamnesisHubPath), "student-anamnesis-hub.tsx must exist");
assert.ok(fs.existsSync(formsHubPath), "student-forms-hub.tsx must exist");

const editorCode = fs.readFileSync(editorPath, "utf-8");
const anamnesisCode = fs.readFileSync(anamnesisHubPath, "utf-8");
const formsCode = fs.readFileSync(formsHubPath, "utf-8");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${err.message}`);
    failed++;
  }
}

console.log("================================================================================");
console.log("EXECUTANDO TESTES DO EDITOR AMPLO DE ANAMNESES E FORMULÁRIOS");
console.log("================================================================================");

// 1. DIMENSÕES E RESPONSIVIDADE
runTest("1.1 Editor Desktop: ~90% largura útil, limite 1200px, coluna centralizada ~900px", () => {
  assert.ok(
    editorCode.includes("sm:w-[90vw]") && editorCode.includes("sm:max-w-[1200px]"),
    "Editor deve usar 90% da largura útil com limite de 1200px no desktop"
  );
  assert.ok(
    editorCode.includes("max-w-[900px]") && editorCode.includes("mx-auto"),
    "Coluna centralizada de escrita e leitura de ~900px"
  );
  assert.ok(
    editorCode.includes("sm:max-h-[92vh]"),
    "Aproveita altura útil da janela com margens discretas"
  );
});

runTest("1.2 Editor Mobile: tela cheia, rolagem única vertical, sem caixas de rolagem aninhadas", () => {
  assert.ok(
    editorCode.includes("h-full") && editorCode.includes("rounded-none"),
    "Abertura em tela cheia no smartphone"
  );
  assert.ok(
    editorCode.includes("overflow-y-auto") && editorCode.includes("flex-1"),
    "Rolagem vertical principal unificada no corpo do editor"
  );
  assert.ok(
    !editorCode.includes("max-h-64 overflow-y-auto"),
    "Eliminada a caixa restrita de rolagem aninhada que escondia perguntas"
  );
  assert.ok(
    editorCode.includes("safe-area-inset-bottom"),
    "Padding inferior seguro para barra de navegação/gestos no mobile"
  );
});

// 2. SEPARAÇÃO DE ETAPAS
runTest("2.1 Separação estrita de Escolha de Modelo, Edição e Destino", () => {
  assert.ok(
    editorCode.includes('"CHOOSE_SOURCE"') &&
    editorCode.includes('"EDIT"') &&
    editorCode.includes('"DESTINATION"') &&
    editorCode.includes('"FILL_NOW"') &&
    editorCode.includes('"PREVIEW"'),
    "Etapas separadas: escolha de modelo, edição ampla, destino e preenchimento/prévia"
  );
  assert.ok(
    editorCode.includes("Usar modelo") && editorCode.includes("Criar do zero"),
    "Etapa de escolha clara com cartões dedicados"
  );
  assert.ok(
    editorCode.includes("originLabel") && editorCode.includes("Trocar modelo"),
    "Origem indicada de forma compacta durante edição sem poluir a tela"
  );
});

runTest("2.2 Proteção contra perda acidental de dados ao fechar ou trocar modelo", () => {
  assert.ok(
    editorCode.includes("isDirtyRef"),
    "Rastreamento de alterações não salvas"
  );
  assert.ok(
    editorCode.includes("handleSafeClose") && editorCode.includes("confirmDiscard"),
    "Confirmação antes de descartar edição ao fechar"
  );
  assert.ok(
    editorCode.includes("handleSwitchModel") && editorCode.includes("confirmSwitch"),
    "Confirmação antes de trocar de modelo no meio da edição"
  );
});

// 3. CAMPOS DE ESCRITA ERGONÔMICOS
runTest("3.1 Enunciados de perguntas em textarea amplo (não inputs de linha única)", () => {
  assert.ok(
    editorCode.includes("<textarea") && editorCode.includes("question-label-"),
    "Enunciado da pergunta utiliza textarea em vez de input comum"
  );
  assert.ok(
    editorCode.includes("rows={2}") && editorCode.includes("min-h-[64px]"),
    "Textarea com pelo menos 2 linhas iniciais para redação confortável"
  );
  assert.ok(
    editorCode.includes("text-base sm:text-sm"),
    "Tamanho de fonte mínimo de 16px no mobile para evitar zoom automático no iOS"
  );
  assert.ok(
    editorCode.includes("resize-y"),
    "Textarea expansível verticalmente conforme o texto cresce"
  );
});

runTest("3.2 Tipo de pergunta e obrigatoriedade separados da linha do enunciado", () => {
  assert.ok(
    editorCode.includes("question-type-") && editorCode.includes("Tipo de resposta:"),
    "Seletor de tipo de resposta posicionado em linha própria, sem competir com enunciado"
  );
  assert.ok(
    editorCode.includes("Resposta obrigatória"),
    "Controle de obrigatoriedade claramente rotulado"
  );
});

runTest("3.3 Ações de pergunta com área de toque mínima de 44x44px", () => {
  assert.ok(
    editorCode.includes("min-h-[44px]") && editorCode.includes("min-w-[44px]"),
    "Alvos de toque de pelo menos 44x44px nos botões de mover, duplicar e excluir"
  );
  assert.ok(
    editorCode.includes("Mover para cima") && editorCode.includes("Mover para baixo"),
    "Reordenação com botões dedicados acessíveis"
  );
  assert.ok(
    editorCode.includes("handleDuplicateQuestion"),
    "Ação de duplicar pergunta existente preservando configurações"
  );
});

// 4. DESTINO, PREENCHIMENTO E PRÉVIA
runTest("4.1 Tela de Destino com resumo do documento e confirmação explícita", () => {
  assert.ok(
    editorCode.includes("Revisão e Destino do Documento"),
    "Cabeçalho de confirmação antes de envio"
  );
  assert.ok(
    editorCode.includes("Enviar para o aluno") && editorCode.includes("SEND_TO_STUDENT"),
    "Opção explícita de envio com notificação no app"
  );
  assert.ok(
    editorCode.includes("Preencher agora") && editorCode.includes("FILL_WITH_STUDENT"),
    "Opção explícita de preenchimento imediato"
  );
});

runTest("4.2 Preenchimento Imediato com autoria do profissional", () => {
  assert.ok(
    editorCode.includes("Registrado pelo profissional"),
    "Destaque de autoria profissional no preenchimento imediato"
  );
  assert.ok(
    editorCode.includes("fillAnswers"),
    "Captação de respostas em formulário amplo com textareas adequados"
  );
});

runTest("4.3 Modo de Prévia sem envios acidentais", () => {
  assert.ok(
    editorCode.includes("Modo de Prévia") && editorCode.includes("Nenhuma resposta será criada"),
    "Banner informativo no modo de prévia"
  );
  assert.ok(
    editorCode.includes("Voltar à edição"),
    "Retorno seguro da prévia para continuar editando sem perder dados"
  );
});

// 5. INTEGRAÇÃO COM ANAMNESE E FORMULÁRIOS
runTest("5.1 Anamnese integra IntakeFormEditorDialog preservando tokens de regressão", () => {
  assert.ok(
    anamnesisCode.includes("<IntakeFormEditorDialog") && anamnesisCode.includes("isAnamnesis={true}"),
    "student-anamnesis-hub.tsx instancia IntakeFormEditorDialog para anamnese"
  );
  assert.ok(
    anamnesisCode.includes("Nova anamnese"),
    "Token 'Nova anamnese' preservado para compatibilidade de testes"
  );
  assert.ok(
    anamnesisCode.includes("SEND_TO_STUDENT") && anamnesisCode.includes("FILL_WITH_STUDENT"),
    "Tokens de modos de envio preservados"
  );
  assert.ok(
    anamnesisCode.includes("Preenchido pelo aluno") && anamnesisCode.includes("Registrado pelo profissional"),
    "Tokens de autoria de respostas no histórico preservados"
  );
});

runTest("5.2 Formulários integra IntakeFormEditorDialog preservando tokens de regressão", () => {
  assert.ok(
    formsCode.includes("<IntakeFormEditorDialog") && formsCode.includes("isAnamnesis={false}"),
    "student-forms-hub.tsx instancia IntakeFormEditorDialog para formulários"
  );
  assert.ok(
    formsCode.includes("selectedForView") && formsCode.includes("Ver respostas"),
    "Ação de ver respostas preservada na aba Formulários"
  );
  assert.ok(
    formsCode.includes("Aguardando resposta") && formsCode.includes("Respondidos"),
    "Filtros de status preservados na aba Formulários"
  );
});

console.log("================================================================================");
console.log(`TOTAL: ${passed} passaram, ${failed} falharam.`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
}
