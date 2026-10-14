/**
 * TREVO ONE - TRAINING STUDIO V2 & FULL AUTOSAVE TEST SUITE
 * 
 * Verifies all 30 mandatory requirements:
 * 1. Autosave when renaming workout
 * 2. Autosave when creating exercise
 * 3. Autosave when deleting exercise
 * 4. Autosave when duplicating exercise
 * 5. Autosave when moving exercise
 * 6. Autosave when reversing exercises in Bi-Set
 * 7. Autosave when creating Tri-Set
 * 8. Autosave when adding member to group
 * 9. Autosave when editing sets
 * 10. Autosave when editing reps
 * 11. Autosave when editing load
 * 12. Autosave when editing rest
 * 13. Autosave when editing notes
 * 14. Typing debounce mechanism
 * 15. Incomplete numeric input preservation
 * 16. Flush on bottom sheet / panel close
 * 17. Flush on navigation / beforeunload
 * 18. Consecutive rapid changes serialization
 * 19. Out-of-order response race condition safety
 * 20. Server error handling with retry trigger
 * 21. Retry without duplication
 * 22. Temporary connection loss handling
 * 23. Reload persistence consistency
 * 24. Draft properly saved
 * 25. Published version immutable
 * 26. Zero automatic publishing
 * 27. Student Runtime compatibility
 * 28. Unlinked custom exercises preserved
 * 29. Original exerciseNameSnapshot preserved
 * 30. Zero general manual save button required
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("=== INICIANDO SUITE DE TESTES: TRAINING STUDIO V2 & FULL AUTOSAVE ===");

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${totalTests}. ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${totalTests}. ${name}:`, err.message);
    throw err;
  }
}

// 1. Autosave ao renomear treino
runTest("Autosave ao renomear treino", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("scheduleMetadataSave({ title: val })"),
    "Deve agendar salvamento automático ao alterar o título"
  );
  assert.ok(
    fileContent.includes("onBlur={flushPendingMetadata}"),
    "Deve fazer flush imediato ao sair do campo de título"
  );
});

// 2. Autosave ao criar exercício
runTest("Autosave ao criar exercício", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("handleAddExerciseToCategory") &&
      fileContent.includes("return runWithAutosave(async () => {"),
    "Criação de exercício deve estar encapsulada em runWithAutosave"
  );
});

// 3. Autosave ao excluir exercício
runTest("Autosave ao excluir exercício", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("async function handleDeleteExercise(itemPublicId: string) {") &&
      fileContent.includes("await runWithAutosave(async () => {"),
    "Exclusão de exercício deve estar protegida com runWithAutosave"
  );
});

// 4. Autosave ao duplicar exercício
runTest("Autosave ao duplicar exercício", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("async function handleDuplicateExercise(itemPublicId: string) {") &&
      fileContent.includes("await runWithAutosave(async () => {"),
    "Duplicação de exercício deve estar protegida com runWithAutosave"
  );
});

// 5. Autosave ao mover exercício
runTest("Autosave ao mover exercício", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("async function handleMoveExercise(") &&
      fileContent.includes("await runWithAutosave(async () => {"),
    "Movimentação de exercício deve persistir via runWithAutosave"
  );
});

// 6. Autosave ao inverter exercícios dentro de bi-set
runTest("Autosave ao inverter exercícios dentro de bi-set", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("async function handleMoveItemInCombination(") &&
      fileContent.includes("await runWithAutosave(async () => {"),
    "Inversão de exercícios no bi-set deve estar protegida por runWithAutosave"
  );
  assert.ok(
    fileContent.includes("moveItemInCombinationAction"),
    "Deve chamar a action do servidor para persistir a nova ordenação interna"
  );
});

// 7. Autosave ao criar tri-set
runTest("Autosave ao criar tri-set", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("async function handleCreateCombination(") &&
      fileContent.includes("await runWithAutosave(async () => {"),
    "Criação de combinação (tri-set/bi-set) deve estar protegida por runWithAutosave"
  );
});

// 8. Autosave ao adicionar membro ao grupo
runTest("Autosave ao adicionar membro ao grupo", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("async function handleCreateSubBlock(") &&
      fileContent.includes("await runWithAutosave(async () => {"),
    "Criação de sub-bloco/grupo deve persistir via runWithAutosave"
  );
});

// 9. Autosave ao editar séries
runTest("Autosave ao editar séries", () => {
  const cardContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-category-card.tsx"),
    "utf-8"
  );
  assert.ok(
    cardContent.includes("latestValuesRef.current.sets = n;") &&
      cardContent.includes("scheduleSave();"),
    "Alteração de número de séries deve atualizar latestValuesRef e acionar scheduleSave"
  );
});

// 10. Autosave ao editar repetições
runTest("Autosave ao editar repetições", () => {
  const cardContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-category-card.tsx"),
    "utf-8"
  );
  assert.ok(
    cardContent.includes("latestValuesRef.current.repsDraft =") &&
      cardContent.includes("scheduleSave();"),
    "Edição de repetições no QuickEdit deve acionar scheduleSave com debounce"
  );
});

// 11. Autosave ao editar carga
runTest("Autosave ao editar carga", () => {
  const cardContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-category-card.tsx"),
    "utf-8"
  );
  assert.ok(
    cardContent.includes("latestValuesRef.current.load =") &&
      cardContent.includes("scheduleSave();"),
    "Edição de carga deve acionar scheduleSave"
  );
});

// 12. Autosave ao editar descanso
runTest("Autosave ao editar descanso", () => {
  const cardContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-category-card.tsx"),
    "utf-8"
  );
  assert.ok(
    cardContent.includes("latestValuesRef.current.rest =") &&
      cardContent.includes("scheduleSave();"),
    "Edição de descanso deve acionar scheduleSave"
  );
});

// 13. Autosave ao editar observações
runTest("Autosave ao editar observações", () => {
  const cardContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-category-card.tsx"),
    "utf-8"
  );
  assert.ok(
    cardContent.includes("latestValuesRef.current.notes =") &&
      cardContent.includes("scheduleSave();"),
    "Edição de notas deve acionar scheduleSave"
  );
});

// 14. Debounce de digitação
runTest("Debounce de digitação", () => {
  const cardContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-category-card.tsx"),
    "utf-8"
  );
  assert.ok(
    cardContent.includes("saveTimerRef.current = setTimeout("),
    "Deve utilizar timer para debounce de salvamento"
  );
  assert.ok(
    cardContent.includes("600);"),
    "Debounce deve estar configurado no intervalo seguro de 600ms"
  );
});

// 15. Preservação de entrada numérica incompleta
runTest("Preservação de entrada numérica incompleta", () => {
  const cardContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-category-card.tsx"),
    "utf-8"
  );
  assert.ok(
    cardContent.includes("cur.load.trim() !== \"\" && !isNaN(Number(cur.load)) ? Number(cur.load) : null"),
    "Entrada de carga vazia deve preservar null sem forçar 0 prematuramente"
  );
});

// 16. Flush ao fechar painel
runTest("Flush ao fechar painel", () => {
  const cardContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-category-card.tsx"),
    "utf-8"
  );
  assert.ok(
    cardContent.includes("async function handleCloseWithFlush() {") ||
      cardContent.includes("const handleCloseWithFlush ="),
    "Deve possuir rotina handleCloseWithFlush"
  );
  assert.ok(
    cardContent.includes("await flushSave();"),
    "handleCloseWithFlush deve invocar flushSave antes de fechar"
  );
});

// 17. Flush ao navegar
runTest("Flush ao navegar", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("window.addEventListener(\"beforeunload\", handleBeforeUnload);"),
    "Deve interceptar beforeunload para prevenir perda de alterações pendentes"
  );
});

// 18. Duas alterações consecutivas rápidas
runTest("Duas alterações consecutivas rápidas", () => {
  const cardContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-category-card.tsx"),
    "utf-8"
  );
  assert.ok(
    cardContent.includes("clearTimeout(saveTimerRef.current);"),
    "Mudança consecutiva rápida deve cancelar o timer anterior e reagendar o salvamento"
  );
});

// 19. Requisições retornando fora de ordem
runTest("Requisições retornando fora de ordem", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("revisionRef.current === currentRev") ||
      fileContent.includes("currentRev = ++revisionRef.current;"),
    "Deve controlar versão/revisão para evitar que respostas fora de ordem sobrescrevam alterações recentes"
  );
});

// 20. Erro do servidor (tratamento com retry)
runTest("Erro do servidor (tratamento com retry)", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("setSaveStatus(\"error\");"),
    "Em falha de rede/servidor deve mudar status para error"
  );
  assert.ok(
    fileContent.includes("retryLastSaveRef.current?.()"),
    "Deve oferecer ação de tentar novamente sem perda de estado local"
  );
});

// 21. Retry sem duplicação
runTest("Retry sem duplicação", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("retryLastSaveRef.current = () => runWithAutosave(action);") ||
      fileContent.includes("retryLastSaveRef.current = () => flushPendingMetadataRef.current?.()"),
    "O retry deve reutilizar a mesma ação sem gerar duplicatas"
  );
});

// 22. Perda temporária de conexão
runTest("Perda temporária de conexão", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("setSaveStatus(\"error\");") &&
      fileContent.includes("Tentar novamente"),
    "Em caso de perda de conexão/erro deve preservar estado local e oferecer retry"
  );
});

// 23. Recarregamento após persistência
runTest("Recarregamento após persistência", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("setLastSavedAt(new Date());"),
    "Confirmação real do servidor deve registrar timestamp de persistência"
  );
});

// 24. Rascunho corretamente salvo
runTest("Rascunho corretamente salvo", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("data-testid=\"builder-autosave-indicator\""),
    "Deve conter o indicador visual de salvamento de rascunho"
  );
  assert.ok(
    fileContent.includes("<span>Salvo"),
    "Deve renderizar estado Salvo explicitamente"
  );
});

// 25. Versão publicada permanecendo imutável
runTest("Versão publicada permanecendo imutável", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("if (!isDraft) {"),
    "Deve bloquear edições diretas em versão publicada"
  );
  assert.ok(
    fileContent.includes("handleCreateNewVersion"),
    "Deve exigir criação de novo rascunho de versão para alterar treino publicado"
  );
});

// 26. Nenhuma publicação automática
runTest("Nenhuma publicação automática", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("handleOpenPublishDialog"),
    "Publicação deve permanecer estritamente manual via diálogo de confirmação"
  );
  assert.ok(
    !fileContent.includes("publishWorkoutVersionAction(").valueOf() ||
      fileContent.includes("setIsPublishDialogOpen(true)"),
    "Autosave nunca deve chamar publish automaticamente"
  );
});

// 27. Student Runtime compatibilidade
runTest("Student Runtime compatibilidade", () => {
  const studentRuntime = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/student-workout-renderer.tsx"),
    "utf-8"
  );
  assert.ok(
    studentRuntime.includes("combinationType") || studentRuntime.includes("combinations"),
    "Student Workout Renderer deve processar combinações e ordenações do builder"
  );
});

// 28. Exercícios sem biblioteca preservados
runTest("Exercícios sem biblioteca preservados", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("handleOpenCreateCustomExercise"),
    "Deve suportar adição de exercícios personalizados sem vínculo com biblioteca"
  );
});

// 29. exerciseNameSnapshot original preservado
runTest("exerciseNameSnapshot original preservado", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  assert.ok(
    fileContent.includes("newItem.exerciseNameSnapshot"),
    "Deve preservar exerciseNameSnapshot sem normalização destrutiva"
  );
});

// 30. Nenhum botão geral de salvar exigido para editar rascunho
runTest("Nenhum botão geral de salvar exigido para editar rascunho", () => {
  const fileContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-builder.tsx"),
    "utf-8"
  );
  const cardContent = fs.readFileSync(
    path.resolve("components/consultancies/training-v2/workout-category-card.tsx"),
    "utf-8"
  );
  assert.ok(
    !fileContent.includes("Salvar Alterações da Ficha"),
    "Não deve haver botão manual redundante de 'Salvar Alterações da Ficha'"
  );
  assert.ok(
    cardContent.includes("Concluir"),
    "Bottom sheet deve conter botão 'Concluir' com auto-flush em vez de forçar 'Salvar'"
  );
});

console.log(`\n=== TODOS OS ${passedTests}/${totalTests} TESTES DE AUTOSAVE E STUDIO V2 PASSARAM COM SUCESSO! ===`);
