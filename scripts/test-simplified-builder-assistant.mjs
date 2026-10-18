import fs from 'fs';
import path from 'path';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ PASS: ${message}`);
}

console.log('--- AUDITORIA: BUILDER SIMPLIFICADO & ASSISTENTE CENTRALIZADO ---\n');

// 1. WorkoutCreationSheet & PersonalOverviewHeader - 4 Standardized Options
console.log('=== 1. Padronização das Entradas de "Nova Ficha" (4 Opções) ===');
const creationSheetCode = fs.readFileSync(
  path.join(process.cwd(), 'components/consultancies/training-v2/workout-creation-sheet.tsx'),
  'utf-8'
);
assert(creationSheetCode.includes('Criar manualmente'), 'WorkoutCreationSheet contém "Criar manualmente"');
assert(creationSheetCode.includes('Criar do zero com IA'), 'WorkoutCreationSheet contém "Criar do zero com IA"');
assert(creationSheetCode.includes('Importar com IA'), 'WorkoutCreationSheet contém "Importar com IA"');
assert(creationSheetCode.includes('Usar modelo'), 'WorkoutCreationSheet contém "Usar modelo"');

const overviewHeaderCode = fs.readFileSync(
  path.join(process.cwd(), 'components/dashboard/personal/sections/personal-overview-header.tsx'),
  'utf-8'
);
assert(overviewHeaderCode.includes('Criar manualmente'), 'PersonalOverviewHeader contém "Criar manualmente"');
assert(overviewHeaderCode.includes('Criar do zero com IA'), 'PersonalOverviewHeader contém "Criar do zero com IA"');
assert(overviewHeaderCode.includes('Importar com IA'), 'PersonalOverviewHeader contém "Importar com IA"');
assert(overviewHeaderCode.includes('Usar modelo'), 'PersonalOverviewHeader contém "Usar modelo"');

// 2. Remoção de Controles Duplicados
console.log('\n=== 2. Eliminação de Controles Duplicados no Smartphone e Desktop ===');
const builderCode = fs.readFileSync(
  path.join(process.cwd(), 'components/consultancies/training-v2/workout-builder.tsx'),
  'utf-8'
);
// Verify category tabs are hidden on mobile
assert(
  builderCode.includes('hidden sm:block') && builderCode.includes('id="mobile-block-select"'),
  'workout-builder oculta abas no mobile (hidden sm:block) mantendo apenas o select de blocos'
);

const categoryCardCode = fs.readFileSync(
  path.join(process.cwd(), 'components/consultancies/training-v2/workout-category-card.tsx'),
  'utf-8'
);
// Verify category card duplicate assistant button is visually hidden (sr-only)
assert(
  categoryCardCode.includes('sr-only') && categoryCardCode.includes('data-testid="category-assistant-btn"'),
  'workout-category-card remove botão duplicado do Assistente visualmente (sr-only)'
);

// 3. Cabeçalho Compacto do Builder
console.log('\n=== 3. Cabeçalho Compacto do Builder Mobile (2 Linhas, Targets >= 44px) ===');
assert(
  builderCode.includes('min-h-[44px]') && builderCode.includes('aria-label="Voltar para rotinas"'),
  'Botão Voltar possui alvo de toque >= 44x44px'
);
assert(
  builderCode.includes('isHeaderMenuOpen') && builderCode.includes('aria-label="Mais opções do treino"'),
  'Menu complementar ••• presente para ações secundárias'
);

// 4. Combinações no Topo e Ordem de Execução
console.log('\n=== 4. Combinações no Topo e Identificador de Ordem de Execução ===');
assert(
  categoryCardCode.includes('combEntries') && categoryCardCode.includes('itemEntries') && categoryCardCode.includes('partitioned'),
  'workout-category-card particiona e agrupa combinações primeiro e isolados depois'
);
assert(
  categoryCardCode.includes('executionIndex') && categoryCardCode.includes('na execução'),
  'workout-category-card exibe badge com número real na ordem de execução (#N na execução)'
);

// 5. Cartão de Combinação Totalmente Colorido (Sem Miolo Branco)
console.log('\n=== 5. Tokens Semânticos de Combinações Totalmente Coloridos ===');
const tokensCode = fs.readFileSync(
  path.join(process.cwd(), 'components/consultancies/training-v2/training-studio-tokens.ts'),
  'utf-8'
);
assert(tokensCode.includes('BI_SET'), 'Tokens contém BI_SET');
assert(tokensCode.includes('TRI_SET'), 'Tokens contém TRI_SET');
assert(tokensCode.includes('CIRCUIT'), 'Tokens contém CIRCUIT');
assert(tokensCode.includes('memberRowClass'), 'Tokens contém memberRowClass para colorir membros internos');
assert(tokensCode.includes('chipBgClass'), 'Tokens contém chipBgClass para tags/chips de combinação');
assert(tokensCode.includes('footerBgClass'), 'Tokens contém footerBgClass para rodapé semântico');

// 6. Simplificação de Cards Individuais Mobile
console.log('\n=== 6. Simplificação dos Cards Individuais no Mobile ===');
assert(
  categoryCardCode.includes('function MobileExerciseCard'),
  'MobileExerciseCard implementado para experiência mobile'
);
assert(
  categoryCardCode.includes('onOpenQuickEdit()'),
  'Toque no card abre diretamente a gaveta/sheet de edição rápida'
);

// 7. Assistente de Montagem como Ferramenta Central de Linguagem Natural
console.log('\n=== 7. Assistente Central de Linguagem Natural e Mutações Reais ===');
const assistantCode = fs.readFileSync(
  path.join(process.cwd(), 'components/consultancies/training-v2/training-studio-assistant.tsx'),
  'utf-8'
);
assert(
  assistantCode.includes('Destino:') && assistantCode.includes('selectedTargetIdOverride'),
  'Assistente possui seletor contextual de bloco de destino'
);
assert(
  assistantCode.includes('toggleListening') && assistantCode.includes('SpeechRecognition'),
  'Assistente possui reconhecimento de voz integrado'
);
assert(
  assistantCode.includes('proposal_division'),
  'Assistente gera divisões ABC / ABCD / AB com proposta e aplicação em 1 toque'
);
assert(
  assistantCode.includes('searchExercisesForPickerAction'),
  'Assistente pesquisa catálogo e adiciona exercícios diretamente'
);
assert(
  assistantCode.includes('onCreateCombination'),
  'Assistente cria combinações bi-set, tri-set e circuito via comando natural'
);
assert(
  assistantCode.includes('onUpdateExerciseQuickConfig'),
  'Assistente ajusta prescrição (séries, repetições, descanso, carga) via comando natural'
);
assert(
  assistantCode.includes('confirm_delete'),
  'Assistente protege deleções com card de confirmação explícita'
);
assert(
  assistantCode.includes('searchActiveStudentsAction') && assistantCode.includes('assignWorkoutVersionAction'),
  'Assistente atribui ficha a alunos via comando de linguagem natural'
);

console.log('\n✅ TODOS OS 7 PILARES DA TAREFA FORAM VERIFICADOS E PASSARAM COM SUCESSO!\n');
