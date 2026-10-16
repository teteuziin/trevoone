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
const navFile = path.resolve("components/consultancies/consultancy-navigation.tsx");
const actionsFile = path.resolve("app/consultoria/[slug]/progresso/student-request-actions.ts");

assert.ok(fs.existsSync(assistantFile), "guided-student-assistant.tsx must exist");
assert.ok(fs.existsSync(listFile), "personal-student-list.tsx must exist");
assert.ok(fs.existsSync(pageFile), "alunos/page.tsx must exist");
assert.ok(fs.existsSync(navFile), "consultancy-navigation.tsx must exist");
assert.ok(fs.existsSync(actionsFile), "student-request-actions.ts must exist");

const assistantCode = fs.readFileSync(assistantFile, "utf-8");
const listCode = fs.readFileSync(listFile, "utf-8");
const pageCode = fs.readFileSync(pageFile, "utf-8");
const navCode = fs.readFileSync(navFile, "utf-8");
const actionsCode = fs.readFileSync(actionsFile, "utf-8");

// -----------------------------------------------------------------------------
// 1. OCUPAÇÃO DA ÁREA ÚTIL & AUSÊNCIA DE MODAL FLUTUANTE
// -----------------------------------------------------------------------------
runTest("1.1 Chat ocupa toda a área de trabalho útil sem modal flutuante", () => {
  assert.ok(
    assistantCode.includes("w-full h-full flex flex-col flex-1 min-h-0") &&
    pageCode.includes('maxWidth="full"') &&
    pageCode.includes("!p-0 !pb-0"),
    "Chat preenche 100% da área útil sem margens brancas ou padding concorrente"
  );
  assert.ok(
    !assistantCode.includes("max-h-[920px]") &&
    !assistantCode.includes("h-[calc(100vh-6.5rem)]"),
    "Removido aspecto de modal flutuante, bordas cortadas e dimensões fixas restritivas"
  );
  assert.ok(
    assistantCode.includes("max-w-3xl lg:max-w-4xl mx-auto"),
    "Coluna de mensagens centralizada em largura confortável para leitura e expansão de widgets"
  );
});

runTest("1.2 Cabeçalho limpo 'Alunos' e proteção mobile sem sobreposição", () => {
  assert.ok(
    /<h1[^>]*>\s*Alunos\s*<\/h1>/.test(assistantCode),
    "Cabeçalho simples 'Alunos' sem jargões ou títulos genéricos"
  );
  assert.ok(
    !assistantCode.includes("100% Sem IA") &&
    !assistantCode.includes("Navegação conversacional por etapas e dados determinísticos"),
    "Removidos selos técnicos e descrições promocionais da interface"
  );
  assert.ok(
    assistantCode.includes("Trocar aluno") &&
    assistantCode.includes("consultoria/${consultancySlug}"),
    "Identificação clara do aluno ativo com 'Trocar aluno' e botão de voltar funcional"
  );
  assert.ok(
    navCode.includes("isStudentChat") &&
    navCode.includes("shouldHideMobileBottomNav"),
    "Navegação inferior mobile oculta na rota do chat para não cobrir a área de digitação"
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
runTest("3.1 Escolha registrada como mensagem do usuário e texto natural da pergunta", () => {
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
    assistantCode.includes("text: `O que você quer ver de ${student.name}?`") ||
    assistantCode.includes("O que você quer ver de ${student.name}"),
    "Assistente responde com frase curta e natural: 'O que você quer ver de [nome]?'"
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
runTest("4.1 Campo de texto fixo com placeholder contextual e ajuda de teclado desktop", () => {
  assert.ok(
    assistantCode.includes("O que você quer consultar?") &&
    assistantCode.includes("Digite o nome do aluno…"),
    "Placeholders contextuais específicos ('Digite o nome do aluno…' / 'O que você quer consultar?')"
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
  assert.ok(
    assistantCode.includes("hidden sm:block") &&
    assistantCode.includes("Pressione <strong>Enter</strong>"),
    "Instrução de teclado oculta no mobile e discreta no desktop"
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
// 6. RESPOSTAS INTERATIVAS E FRASES ESPECÍFICAS
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

runTest("6.2 Fotos: frases curtas, galeria por data, zoom e comparador", () => {
  assert.ok(
    assistantCode.includes("Fotos de ") &&
    assistantCode.includes("Nenhuma foto cadastrada."),
    "Frases curtas especificadas para fotos"
  );
  assert.ok(
    assistantCode.includes("setSelectedZoomPhoto") &&
    assistantCode.includes("isPhotoComparatorOpen"),
    "Modal de ampliação e comparador lado a lado preservados"
  );
});

runTest("6.3 Anamnese e Formulários: respostas, histórico e fluxo de envio guiado", () => {
  assert.ok(
    assistantCode.includes("Anamnese respondida em") &&
    assistantCode.includes("Este aluno ainda não respondeu à anamnese.") &&
    assistantCode.includes("Escolha o formulário que deseja enviar"),
    "Frases curtas e específicas para anamneses e formulários"
  );
  assert.ok(
    assistantCode.includes("confirmedSend") &&
    assistantCode.includes("Confirmo o envio para este aluno"),
    "Confirmação explícita obrigatória antes do envio"
  );
});

runTest("6.4 Treinos: roteamento determinístico (1 ativo abre fluxo, múltiplos dá opções, nenhum avisa)", () => {
  assert.ok(
    assistantCode.includes("Treino ativo:") &&
    assistantCode.includes("Nenhum treino ativo prescrito para este aluno."),
    "Frases curtas e objetivas sobre treinos"
  );
  assert.ok(
    assistantCode.includes("activeWorkouts.length === 1") &&
    assistantCode.includes("activeWorkouts.length > 1"),
    "Trata adequadamente 1 ativo, múltiplos ativos e nenhum treino"
  );
});

// -----------------------------------------------------------------------------
// 7. SEGURANÇA, ISOLAMENTO E ROLAGEM INTELIGENTE
// -----------------------------------------------------------------------------
runTest("7.1 Rolagem inteligente: não interrompe leitura de mensagens anteriores", () => {
  assert.ok(
    assistantCode.includes("isNearBottomRef") &&
    assistantCode.includes("distanceToBottom < 160"),
    "Auto-scroll condicional: só rola ao final se o usuário já estiver próximo da base"
  );
  assert.ok(
    !assistantCode.includes("localStorage.setItem('chat_messages'") &&
    !assistantCode.includes("localStorage.setItem(\"chat_messages\""),
    "Zero persistência indevida de dados de saúde no localStorage"
  );
});

// -----------------------------------------------------------------------------
// 8. TEMAS COMPATÍVEIS COM A TELA INICIAL
// -----------------------------------------------------------------------------
runTest("8.1 Tema Claro cinza suave (#DDE1E6 / #ECEFF2) e Escuro grafite (#202226 / #0B0C0E)", () => {
  assert.ok(
    assistantCode.includes("bg-[#DDE1E6] dark:bg-[#202226]") &&
    assistantCode.includes("bg-[#ECEFF2] dark:bg-[#0B0C0E]"),
    "Fundo geral e superfícies de cabeçalho/input adaptadas aos temas da Visão Geral"
  );
  assert.ok(
    assistantCode.includes("text-[#17191D] dark:text-[#FFFFFF]") ||
    assistantCode.includes("text-[#17191D] dark:text-white"),
    "Texto escuro no modo claro e texto claro no modo escuro"
  );
  assert.ok(
    assistantCode.includes("text-[#065F46] dark:text-emerald-400"),
    "Verde com alto contraste calibrado (#065F46) no modo claro"
  );
  assert.ok(
    pageCode.includes('themeVariant="dark-overview"'),
    "Página de alunos configurada com o themeVariant oficial do shell"
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
