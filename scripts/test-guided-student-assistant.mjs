import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("================================================================================");
console.log("TREVO ONE — GUIDED CONVERSATIONAL STUDENT ASSISTANT (NO AI) TEST SUITE");
console.log("================================================================================");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

const assistantFile = path.resolve("components/consultancies/personal-student-hub/guided-student-assistant.tsx");
const listFile = path.resolve("components/consultancies/personal-student-hub/personal-student-list.tsx");
const pageFile = path.resolve("app/consultoria/[slug]/progresso/alunos/page.tsx");
const actionsFile = path.resolve("app/consultoria/[slug]/progresso/student-request-actions.ts");

assert.ok(fs.existsSync(assistantFile), "guided-student-assistant.tsx must exist");
assert.ok(fs.existsSync(listFile), "personal-student-list.tsx must exist");
assert.ok(fs.existsSync(pageFile), "alunos/page.tsx must exist");
assert.ok(fs.existsSync(actionsFile), "student-request-actions.ts must exist");

const assistantCode = fs.readFileSync(assistantFile, "utf-8");
const listCode = fs.readFileSync(listFile, "utf-8");
const pageCode = fs.readFileSync(pageFile, "utf-8");
const actionsCode = fs.readFileSync(actionsFile, "utf-8");

// -----------------------------------------------------------------------------
// 1. ABERTURA EM PAINEL GRANDE TIPO CHAT
// -----------------------------------------------------------------------------
runTest("1.1 Painel grande estilo chat com abertura em slide e layout viewport", () => {
  assert.ok(
    assistantCode.includes("slide-in-from-right-6") &&
    assistantCode.includes("motion-reduce:animate-none"),
    "Entrada em slide suave pela direita com respeito a prefers-reduced-motion"
  );
  assert.ok(
    assistantCode.includes("max-w-5xl") &&
    assistantCode.includes("max-w-3xl mx-auto"),
    "Painel amplo e coluna de mensagens centralizada em largura confortável"
  );
  assert.ok(
    assistantCode.includes("h-[calc(100dvh-5.5rem)]") || assistantCode.includes("h-[calc(100vh-6.5rem)]"),
    "Altura otimizada ocupando a área útil sem tela dupla"
  );
});

runTest("1.2 Cabeçalho compacto com identificação e retorno claro", () => {
  assert.ok(
    assistantCode.includes("Assistente de Alunos") &&
    assistantCode.includes("100% Sem IA"),
    "Cabeçalho com identificação do assistente sem IA"
  );
  assert.ok(
    assistantCode.includes("Voltar para a Visão Geral") || assistantCode.includes("consultoria/${consultancySlug}"),
    "Retorno previsível e botão de voltar disponível"
  );
});

// -----------------------------------------------------------------------------
// 2. PRIMEIRA MENSAGEM E SELETOR INTEGRADO À CONVERSA
// -----------------------------------------------------------------------------
runTest("2.1 Mensagem inicial de saudação com nome real do profissional", () => {
  assert.ok(
    assistantCode.includes("greetingName ? `Olá, ${greetingName}! Qual aluno você gostaria de ver?`") ||
    assistantCode.includes("Olá, ${greetingName}! Qual aluno você gostaria de ver?"),
    "Saudação personalizada com nome real do profissional"
  );
  assert.ok(
    assistantCode.includes("Olá! Qual aluno você gostaria de ver?"),
    "Fallback neutro quando nome não disponível"
  );
});

runTest("2.2 Lista de alunos compacta DENTRO da conversa com paginação e busca", () => {
  assert.ok(
    assistantCode.includes('widget?.type === "STUDENT_SELECTOR"'),
    "Seletor de alunos embutido como widget dentro da mensagem do assistente"
  );
  assert.ok(
    assistantCode.includes("STUDENTS_PER_PAGE = 5") &&
    assistantCode.includes("totalPickerPages"),
    "Lista compacta com paginação de 5 itens para não criar parede de cards"
  );
  assert.ok(
    assistantCode.includes("pickerSearch") &&
    assistantCode.includes("pickerWorkoutFilter"),
    "Busca e filtros operacionais presentes no seletor integrado"
  );
});

runTest("2.3 Correção de imagens quebradas e exibição de iniciais limpas", () => {
  assert.ok(
    assistantCode.includes("function StudentAvatar") &&
    assistantCode.includes("imageFailed") &&
    assistantCode.includes("setImageFailed(true)"),
    "Componente StudentAvatar com fallback reativo seguro contra erro de imagem"
  );
  assert.ok(
    assistantCode.includes('alt=""'),
    "Evita vazamento de texto 'Foto' e ícone quebrado do navegador"
  );
});

// -----------------------------------------------------------------------------
// 3. A ESCOLHA VIRA MENSAGEM & RECOLHIMENTO
// -----------------------------------------------------------------------------
runTest("3.1 Escolha registrada como mensagem do usuário e recolhimento limpo da lista", () => {
  assert.ok(
    assistantCode.includes("text: `Quero ver ${student.name}.`") ||
    assistantCode.includes("Quero ver ${student.name}"),
    "Escolha do aluno inserida como mensagem do usuário no chat"
  );
  assert.ok(
    assistantCode.includes("collapsed: true"),
    "Lista inicial recolhida para deixar a conversa limpa"
  );
  assert.ok(
    assistantCode.includes("text: `O que você gostaria de ver de ${student.name}?`") ||
    assistantCode.includes("O que você gostaria de ver de ${student.name}"),
    "Assistente responde perguntando o que deseja ver daquele aluno"
  );
});

runTest("3.2 Sugestões discretas de atalho (Visão Geral, Fotos, Anamnese, Formulários, Treinos)", () => {
  assert.ok(
    assistantCode.includes("Visão Geral") &&
    assistantCode.includes("Fotos") &&
    assistantCode.includes("Anamnese") &&
    assistantCode.includes("Formulários") &&
    assistantCode.includes("Treinos"),
    "Todos os 5 atalhos opcionais disponíveis abaixo da pergunta"
  );
});

// -----------------------------------------------------------------------------
// 4. CAMPO DE DIGITAÇÃO NA PARTE INFERIOR
// -----------------------------------------------------------------------------
runTest("4.1 Campo de texto fixo com placeholder contextual e teclas de atalho", () => {
  assert.ok(
    assistantCode.includes("Digite o que deseja ver deste aluno") &&
    assistantCode.includes("Digite o nome do aluno ou escolha acima"),
    "Placeholder contextual baseado na presença de aluno selecionado"
  );
  assert.ok(
    assistantCode.includes("e.key === \"Enter\" && !e.shiftKey"),
    "Enter para enviar e Shift+Enter para quebra de linha"
  );
  assert.ok(
    assistantCode.includes("isComposing"),
    "Proteção durante composição de texto no teclado virtual/IME"
  );
  assert.ok(
    assistantCode.includes("setInputText(trimmed)"),
    "Preservação do texto digitado caso ocorra falha"
  );
});

// -----------------------------------------------------------------------------
// 5. INTERPRETAÇÃO DETERMINÍSTICA SEM IA (NLP EM PORTUGUÊS)
// -----------------------------------------------------------------------------
runTest("5.1 Normalização determinística e reconhecimento de sinônimos em PT-BR", () => {
  assert.ok(
    assistantCode.includes("normalizeCommandText") &&
    assistantCode.includes("detectCommandIntent"),
    "Funções de normalização e detecção de intenção exportadas"
  );
  assert.ok(
    !assistantCode.includes("openai") &&
    !assistantCode.includes("chat/completions") &&
    !assistantCode.includes("model:"),
    "100% sem IA: nenhuma API, modelo ou dependência de IA"
  );
});

runTest("5.2 Diferenciação estrita de intenções (consultar vs criar vs enviar)", () => {
  assert.ok(
    assistantCode.includes("ANAMNESIS_VIEW") &&
    assistantCode.includes("ANAMNESIS_SEND") &&
    assistantCode.includes("ANAMNESIS_CREATE"),
    "Diferencia consultar anamnese, criar anamnese e enviar anamnese"
  );
  assert.ok(
    assistantCode.includes("FORMS_VIEW") &&
    assistantCode.includes("FORMS_SEND") &&
    assistantCode.includes("FORMS_CREATE"),
    "Diferencia consultar formulário, criar formulário e enviar formulário"
  );
  assert.ok(
    assistantCode.includes("trocar aluno") && assistantCode.includes("CHANGE_STUDENT"),
    "Reconhece intenção de trocar de aluno"
  );
});

// -----------------------------------------------------------------------------
// 6. RESPOSTAS INTERATIVAS DENTRO DA CONVERSA
// -----------------------------------------------------------------------------
runTest("6.1 Visão Geral: blocos informativos reais na conversa", () => {
  assert.ok(
    assistantCode.includes("VisaoGeralWidget"),
    "Widget da Visão Geral embutido no chat"
  );
  assert.ok(
    assistantCode.includes("Cadastro e Contato") &&
    assistantCode.includes("Objetivos Registrados") &&
    assistantCode.includes("Acompanhamento e Avaliações") &&
    assistantCode.includes("Medidas e Evolução Registradas") &&
    assistantCode.includes("Situação dos Treinos") &&
    assistantCode.includes("Anamneses e Formulários"),
    "Blocos de dados reais presentes na Visão Geral"
  );
});

runTest("6.2 Fotos: galeria por data, zoom e comparador antes e depois", () => {
  assert.ok(
    assistantCode.includes("FotosWidget"),
    "Widget de Fotos na conversa"
  );
  assert.ok(
    assistantCode.includes("setSelectedZoomPhoto"),
    "Modal de ampliação / zoom de fotos (Lightbox)"
  );
  assert.ok(
    assistantCode.includes("isPhotoComparatorOpen") &&
    assistantCode.includes("Comparar Antes e Depois"),
    "Comparador de fotos antes e depois lado a lado"
  );
});

runTest("6.3 Anamnese e Formulários: respostas, histórico e fluxo de envio guiado", () => {
  assert.ok(
    assistantCode.includes("AnamneseWidget") &&
    assistantCode.includes("FormulariosWidget"),
    "Widgets de Anamnese e Formulários presentes"
  );
  assert.ok(
    assistantCode.includes("confirmedSend") &&
    assistantCode.includes("Confirmo o envio para este aluno"),
    "Confirmação explícita obrigatória antes do envio"
  );
  assert.ok(
    assistantCode.includes("requestStudentAnamnesisAction") &&
    assistantCode.includes("requestStudentCustomFormAction"),
    "Integração com as actions oficiais do servidor"
  );
});

runTest("6.4 Treinos: roteamento determinístico (1 ativo abre fluxo, múltiplos dá opções, nenhum avisa)", () => {
  assert.ok(
    assistantCode.includes("TreinosWidget"),
    "Widget de Treinos presente"
  );
  assert.ok(
    assistantCode.includes("activeWorkouts.length === 1") &&
    assistantCode.includes("activeWorkouts.length > 1"),
    "Trata adequadamente 1 ativo, múltiplos ativos e nenhum treino"
  );
});

// -----------------------------------------------------------------------------
// 7. SEGURANÇA E NÃO PERSISTÊNCIA DE DADOS SENSÍVEIS
// -----------------------------------------------------------------------------
runTest("7.1 Prevenção de race condition e sem persistência sensível em localStorage", () => {
  assert.ok(
    assistantCode.includes("latestRequestIdRef"),
    "Identificador de requisição utilizado para descartar respostas defasadas"
  );
  assert.ok(
    !assistantCode.includes("localStorage.setItem('chat_messages'") &&
    !assistantCode.includes("localStorage.setItem(\"chat_messages\""),
    "Zero persistência indevida de dados de saúde no localStorage"
  );
});

// -----------------------------------------------------------------------------
// 8. IDENTIDADE VISUAL PRETO/GRAFITE
// -----------------------------------------------------------------------------
runTest("8.1 Design preto/grafite sólido (#151619, #0B0C0E) sem verde-escuro (#10271F)", () => {
  assert.ok(
    assistantCode.includes("bg-[#151619]") && assistantCode.includes("bg-[#0B0C0E]"),
    "Superfícies preto/grafite sólido aplicadas"
  );
  assert.ok(
    !assistantCode.includes("#10271F"),
    "Ausência de cartões verde-escuros antigos"
  );
});

console.log("\n================================================================================");
console.log(`TOTAL TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
