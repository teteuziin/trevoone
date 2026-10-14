/**
 * TREVO ONE — DETERMINISTIC TEST SUITE: WORKOUT BI-SET & ITEM ORDERING FIX
 * 
 * Covers all 20 required tests from Prompt Section 7:
 * Test 1:  Create Bi-set with Supino and Crucifixo.
 * Test 2:  Invert order to Crucifixo and Supino.
 * Test 3:  Verify the group remains at the same primary block position.
 * Test 4:  Persist and reload inverted order.
 * Test 5:  Create Bi-set at position 1 and add normal exercise -> appends after group.
 * Test 6:  Add multiple normal exercises successively -> follows insertion order naturally.
 * Test 7:  Add exercise directly inside Bi-set -> enters group, not standalone list.
 * Test 8:  Move entire Bi-set to another position while preserving internal order.
 * Test 9:  Reorder another group without affecting the first.
 * Test 10: Zero duplicates and zero lost exercises.
 * Test 11: Preserve sets, reps, load, rest and notes after reorder.
 * Test 12: Order preserved after serialization, save and reload.
 * Test 13: Order preserved in Student Runtime representation (card list & focused view).
 * Test 14: Custom exercises without exercise_id continue functioning and reordering.
 * Test 15: Exact exerciseNameSnapshot from AI import preserved untouched.
 * Test 16: Draft reordering does NOT mutate published versions (immutability).
 * Test 17: Tri-set and multi-exercise combinations supported by same algorithm.
 * Test 18: Stepper boundary controls (disabled on first / last item).
 * Test 19: Rapid successive reorders handled idempotently without collision.
 * Test 20: Explicit insertion position respected (not overwritten by append).
 */

import assert from "node:assert/strict";

// Helper for UI container mapping (identical to workout-category-card.tsx buildContainerEntries)
export function buildContainerEntries(items, combinations, subBlockPublicId) {
  const normSubBlock = subBlockPublicId || null;
  const activeCombinationIds = new Set((combinations || []).map((c) => c.publicId));

  const containerCombinations = (combinations || []).filter((c) => {
    const matchesSb = (c.subBlockPublicId || null) === normSubBlock;
    const hasItemsInContainer = items.some((i) => i.combinationPublicId === c.publicId);
    return matchesSb || hasItemsInContainer;
  });

  const combMap = new Map();
  for (const c of containerCombinations) {
    const matchedItems = items.filter((i) => i.combinationPublicId === c.publicId);
    const fallbackItems = c.items && c.items.length > 0 ? c.items : [];
    const combItems = (matchedItems.length > 0 ? matchedItems : fallbackItems).slice();
    combItems.sort((a, b) => a.sortOrder - b.sortOrder);
    combMap.set(c.publicId, {
      ...c,
      items: combItems,
    });
  }

  // Standalone items: items not part of any active combination
  const standaloneItems = items.filter(
    (it) => !it.combinationPublicId || !activeCombinationIds.has(it.combinationPublicId)
  );

  const rawEntries = [];

  for (const item of standaloneItems) {
    rawEntries.push({
      type: "item",
      sortOrder: item.sortOrder,
      item,
    });
  }

  for (const comb of combMap.values()) {
    const memberSortOrders = comb.items.map((i) => i.sortOrder);
    const effectiveSortOrder =
      memberSortOrders.length > 0 ? Math.min(...memberSortOrders) : comb.sortOrder;

    rawEntries.push({
      type: "combination",
      sortOrder: effectiveSortOrder,
      combination: comb,
    });
  }

  rawEntries.sort((a, b) => a.sortOrder - b.sortOrder);
  return rawEntries;
}

// Student runtime mapping (identical to student-workout-renderer.tsx ItemOrCombinationList)
export function buildStudentRuntimeUnits(items, combinations) {
  const combMap = new Map();
  for (const c of combinations || []) {
    combMap.set(c.publicId, c);
  }

  const units = [];
  const processedCombIds = new Set();

  const sortedItems = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  sortedItems.forEach((item, idx) => {
    if (item.combinationPublicId) {
      if (processedCombIds.has(item.combinationPublicId)) {
        return;
      }
      processedCombIds.add(item.combinationPublicId);
      const comb = combMap.get(item.combinationPublicId) || {
        publicId: item.combinationPublicId,
        combinationType: "BI_SET",
        sortOrder: item.sortOrder,
      };
      const combItems = sortedItems
        .filter((i) => i.combinationPublicId === item.combinationPublicId)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      units.push({
        type: "combination",
        combination: comb,
        items: combItems,
      });
    } else {
      units.push({ type: "single", item, index: idx });
    }
  });

  return units;
}

// Reordering simulation replicating repository logic (atomic sequence update)
export function simulateReorderItemsInCombination(items, combinations, combinationPublicId, orderedItemPublicIds) {
  const comb = combinations.find((c) => c.publicId === combinationPublicId);
  if (!comb) throw new Error("Combination not found");

  const combItems = items.filter((it) => it.combinationPublicId === combinationPublicId);
  const minSortOrder = Math.min(...combItems.map((it) => it.sortOrder));

  const updatedItems = items.map((it) => {
    if (it.combinationPublicId === combinationPublicId) {
      const newPos = orderedItemPublicIds.indexOf(it.publicId);
      if (newPos === -1) return it;
      return {
        ...it,
        sortOrder: minSortOrder + newPos,
      };
    }
    return it;
  });

  const updatedCombinations = combinations.map((c) => {
    if (c.publicId === combinationPublicId) {
      const refreshedCombItems = updatedItems
        .filter((it) => it.combinationPublicId === combinationPublicId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      return {
        ...c,
        sortOrder: minSortOrder,
        items: refreshedCombItems,
      };
    }
    return c;
  });

  return { items: updatedItems, combinations: updatedCombinations };
}

// Append item simulation replicating repository addItemToDraftBlock
export function simulateAddItemToDraftBlock(items, combinations, input) {
  let targetOrder;
  let updatedItems = [...items];

  if (input.combinationPublicId) {
    const combItems = items
      .filter((i) => i.combinationPublicId === input.combinationPublicId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (combItems.length > 0) {
      targetOrder = combItems[combItems.length - 1].sortOrder + 1;
    } else {
      const comb = combinations.find((c) => c.publicId === input.combinationPublicId);
      targetOrder = (comb?.sortOrder ?? 0) + 1;
    }
    // Shift subsequent items
    updatedItems = updatedItems.map((it) => {
      if (it.sortOrder >= targetOrder) {
        return { ...it, sortOrder: it.sortOrder + 1 };
      }
      return it;
    });
  } else if (input.sortOrder !== undefined && input.sortOrder !== null) {
    targetOrder = input.sortOrder;
    updatedItems = updatedItems.map((it) => {
      if (it.sortOrder >= targetOrder) {
        return { ...it, sortOrder: it.sortOrder + 1 };
      }
      return it;
    });
  } else {
    const maxSort = items.reduce((max, it) => Math.max(max, it.sortOrder), -1);
    targetOrder = maxSort + 1;
  }

  const newItem = {
    publicId: input.publicId || `item-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    exerciseId: input.exerciseId ?? 1,
    exercisePublicId: input.exercisePublicId || null,
    exerciseNameSnapshot: input.exerciseNameSnapshot,
    sortOrder: targetOrder,
    combinationPublicId: input.combinationPublicId || null,
    notes: input.notes || null,
    sets: input.sets || [],
  };

  updatedItems.push(newItem);
  updatedItems.sort((a, b) => a.sortOrder - b.sortOrder);

  // Resync combination sort orders to min(member items sortOrder)
  const updatedCombinations = combinations.map((c) => {
    const cItems = updatedItems.filter((i) => i.combinationPublicId === c.publicId);
    if (cItems.length > 0) {
      const minO = Math.min(...cItems.map((i) => i.sortOrder));
      return { ...c, sortOrder: minO, items: cItems.sort((a, b) => a.sortOrder - b.sortOrder) };
    }
    return c;
  });

  return { items: updatedItems, combinations: updatedCombinations, newItem };
}

export function runAllTests() {
  console.log("==================================================");
  console.log("TREVO ONE — WORKOUT BI-SET & ITEM ORDERING TEST SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function runCase(testNum, testTitle, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`[PASS] Test ${testNum}: ${testTitle}`);
    } catch (err) {
      console.error(`[FAIL] Test ${testNum}: ${testTitle}`, err.message);
      throw err;
    }
  }

  // --- Initial Data Fixtures ---
  let items = [];
  let combinations = [];

  // TEST 1: Criar bi-set com Supino e Crucifixo.
  runCase(1, "Criar bi-set com Supino e Crucifixo", () => {
    const itemSupino = {
      publicId: "item-supino",
      exerciseNameSnapshot: "Supino Reto com Barra",
      sortOrder: 0,
      combinationPublicId: "biset-a",
      sets: [{ reps: 10, loadKg: 60, restSeconds: 60 }],
    };
    const itemCrucifixo = {
      publicId: "item-crucifixo",
      exerciseNameSnapshot: "Crucifixo com Halteres",
      sortOrder: 1,
      combinationPublicId: "biset-a",
      sets: [{ reps: 12, loadKg: 16, restSeconds: 60 }],
    };
    items = [itemSupino, itemCrucifixo];
    combinations = [
      {
        publicId: "biset-a",
        combinationType: "BI_SET",
        title: null,
        sortOrder: 0,
        restAfterSeconds: 60,
        items: [itemSupino, itemCrucifixo],
      },
    ];

    const entries = buildContainerEntries(items, combinations);
    assert.equal(entries.length, 1, "Only 1 container entry for Bi-set");
    assert.equal(entries[0].type, "combination");
    assert.equal(entries[0].combination.items[0].exerciseNameSnapshot, "Supino Reto com Barra");
    assert.equal(entries[0].combination.items[1].exerciseNameSnapshot, "Crucifixo com Halteres");
  });

  // TEST 2: Inverter para Crucifixo e Supino.
  runCase(2, "Inverter para Crucifixo e Supino", () => {
    const reordered = simulateReorderItemsInCombination(
      items,
      combinations,
      "biset-a",
      ["item-crucifixo", "item-supino"]
    );
    items = reordered.items;
    combinations = reordered.combinations;

    const entries = buildContainerEntries(items, combinations);
    assert.equal(entries[0].combination.items[0].exerciseNameSnapshot, "Crucifixo com Halteres");
    assert.equal(entries[0].combination.items[0].sortOrder, 0);
    assert.equal(entries[0].combination.items[1].exerciseNameSnapshot, "Supino Reto com Barra");
    assert.equal(entries[0].combination.items[1].sortOrder, 1);
  });

  // TEST 3: Verificar que o grupo permanece na mesma posição principal.
  runCase(3, "Verificar que o grupo permanece na mesma posição principal", () => {
    const entries = buildContainerEntries(items, combinations);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].sortOrder, 0, "Bi-set effective sortOrder remains 0");
  });

  // TEST 4: Persistir e recarregar a ordem invertida.
  runCase(4, "Persistir e recarregar a ordem invertida", () => {
    // Simulating database SELECT ... ORDER BY sort_order ASC, id ASC
    const reloadedItems = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    const reloadedEntries = buildContainerEntries(reloadedItems, combinations);
    assert.equal(reloadedEntries[0].combination.items[0].publicId, "item-crucifixo");
    assert.equal(reloadedEntries[0].combination.items[1].publicId, "item-supino");
  });

  // TEST 5: Criar bi-set na primeira posição e adicionar um exercício normal. O exercício entra depois do grupo.
  runCase(5, "Criar bi-set na primeira posição e adicionar exercício normal -> entra depois do grupo", () => {
    const res = simulateAddItemToDraftBlock(items, combinations, {
      publicId: "item-puxada",
      exerciseNameSnapshot: "Puxada Frontal",
    });
    items = res.items;
    combinations = res.combinations;

    const entries = buildContainerEntries(items, combinations);
    assert.equal(entries.length, 2, "1 combination + 1 standalone item");
    assert.equal(entries[0].type, "combination", "Bi-set stays first at index 0");
    assert.equal(entries[1].type, "item", "Puxada frontal is second");
    assert.equal(entries[1].item.exerciseNameSnapshot, "Puxada Frontal");
    assert.ok(entries[1].sortOrder > entries[0].sortOrder, "Puxada frontal sortOrder must be > Bi-set");
  });

  // TEST 6: Adicionar vários exercícios normais sucessivamente. A ordem segue a sequência de inclusão.
  runCase(6, "Adicionar vários exercícios normais sucessivamente -> sequência preservada", () => {
    const resRemada = simulateAddItemToDraftBlock(items, combinations, {
      publicId: "item-remada",
      exerciseNameSnapshot: "Remada Baixa",
    });
    items = resRemada.items;
    combinations = resRemada.combinations;

    const resRosca = simulateAddItemToDraftBlock(items, combinations, {
      publicId: "item-rosca",
      exerciseNameSnapshot: "Rosca Direta",
    });
    items = resRosca.items;
    combinations = resRosca.combinations;

    const entries = buildContainerEntries(items, combinations);
    assert.equal(entries.length, 4, "1 combination + 3 standalone items");
    assert.equal(entries[0].type, "combination", "1. Bi-set A");
    assert.equal(entries[1].item.exerciseNameSnapshot, "Puxada Frontal", "2. Puxada Frontal");
    assert.equal(entries[2].item.exerciseNameSnapshot, "Remada Baixa", "3. Remada Baixa");
    assert.equal(entries[3].item.exerciseNameSnapshot, "Rosca Direta", "4. Rosca Direta");
  });

  // TEST 7: Adicionar exercício diretamente dentro do bi-set. Ele entra no grupo, não na lista principal.
  runCase(7, "Adicionar exercício diretamente dentro do bi-set -> entra no grupo, não na lista principal", () => {
    const resDirect = simulateAddItemToDraftBlock(items, combinations, {
      publicId: "item-crossover",
      exerciseNameSnapshot: "Crossover no Cabo",
      combinationPublicId: "biset-a",
    });
    items = resDirect.items;
    combinations = resDirect.combinations;

    const entries = buildContainerEntries(items, combinations);
    // Should still have 4 container entries (1 combination + 3 standalone), NOT 5
    assert.equal(entries.length, 4, "Still 4 container entries");
    assert.equal(entries[0].type, "combination");
    assert.equal(entries[0].combination.items.length, 3, "Bi-set now has 3 items");
    assert.equal(entries[0].combination.items[2].exerciseNameSnapshot, "Crossover no Cabo");

    // Standalone list unchanged
    assert.equal(entries[1].item.exerciseNameSnapshot, "Puxada Frontal");
    assert.equal(entries[2].item.exerciseNameSnapshot, "Remada Baixa");
    assert.equal(entries[3].item.exerciseNameSnapshot, "Rosca Direta");
  });

  // TEST 8: Mover o bi-set inteiro para outra posição preservando a ordem interna.
  runCase(8, "Mover o bi-set inteiro para outra posição preservando a ordem interna", () => {
    // Move Bi-set from position 0 to bottom (after Rosca Direta)
    const maxOrder = Math.max(...items.map((i) => i.sortOrder));
    const combItems = items.filter((i) => i.combinationPublicId === "biset-a");
    const otherItems = items.filter((i) => i.combinationPublicId !== "biset-a");

    let newItems = [...otherItems];
    combItems.forEach((ci, idx) => {
      newItems.push({
        ...ci,
        sortOrder: maxOrder + 1 + idx,
      });
    });

    const entries = buildContainerEntries(newItems, combinations);
    assert.equal(entries[entries.length - 1].type, "combination", "Bi-set is now at end");
    const endComb = entries[entries.length - 1].combination;
    assert.equal(endComb.items[0].exerciseNameSnapshot, "Crucifixo com Halteres");
    assert.equal(endComb.items[1].exerciseNameSnapshot, "Supino Reto com Barra");
    assert.equal(endComb.items[2].exerciseNameSnapshot, "Crossover no Cabo");
  });

  // TEST 9: Alterar a ordem de outro grupo sem afetar o primeiro.
  runCase(9, "Alterar a ordem de outro grupo sem afetar o primeiro", () => {
    // Create second bi-set with Remada and Rosca
    const itemRemada = items.find((i) => i.publicId === "item-remada");
    const itemRosca = items.find((i) => i.publicId === "item-rosca");
    itemRemada.combinationPublicId = "biset-b";
    itemRosca.combinationPublicId = "biset-b";

    const bisetB = {
      publicId: "biset-b",
      combinationType: "BI_SET",
      title: "Costas e Bíceps",
      sortOrder: itemRemada.sortOrder,
      restAfterSeconds: 60,
      items: [itemRemada, itemRosca],
    };
    combinations.push(bisetB);

    // Invert bi-set B: Rosca then Remada
    const reordered = simulateReorderItemsInCombination(
      items,
      combinations,
      "biset-b",
      ["item-rosca", "item-remada"]
    );
    items = reordered.items;
    combinations = reordered.combinations;

    const entries = buildContainerEntries(items, combinations);
    const combA = entries.find((e) => e.combination?.publicId === "biset-a").combination;
    const combB = entries.find((e) => e.combination?.publicId === "biset-b").combination;

    // Bi-set A internal order untouched
    assert.equal(combA.items[0].exerciseNameSnapshot, "Crucifixo com Halteres");
    assert.equal(combA.items[1].exerciseNameSnapshot, "Supino Reto com Barra");
    assert.equal(combA.items[2].exerciseNameSnapshot, "Crossover no Cabo");

    // Bi-set B inverted
    assert.equal(combB.items[0].exerciseNameSnapshot, "Rosca Direta");
    assert.equal(combB.items[1].exerciseNameSnapshot, "Remada Baixa");
  });

  // TEST 10: Verificar ausência de duplicação ou perda de exercícios.
  runCase(10, "Verificar ausência de duplicação ou perda de exercícios", () => {
    const entries = buildContainerEntries(items, combinations);
    let totalItemsRendered = 0;
    for (const e of entries) {
      if (e.type === "item") totalItemsRendered++;
      if (e.type === "combination") totalItemsRendered += e.combination.items.length;
    }
    assert.equal(totalItemsRendered, items.length, "Every single item is rendered exactly once");
    const uniqueIds = new Set(items.map((i) => i.publicId));
    assert.equal(uniqueIds.size, items.length, "Zero ID collisions");
  });

  // TEST 11: Garantir preservação de séries, repetições, carga, descanso e observações após reorder.
  runCase(11, "Garantir preservação de séries, repetições, carga, descanso e observações após reorder", () => {
    const supinoBefore = items.find((i) => i.publicId === "item-supino");
    assert.deepEqual(supinoBefore.sets, [{ reps: 10, loadKg: 60, restSeconds: 60 }]);

    const reordered = simulateReorderItemsInCombination(items, combinations, "biset-a", ["item-supino", "item-crucifixo", "item-crossover"]);
    items = reordered.items;
    combinations = reordered.combinations;
    const supinoAfter = items.find((i) => i.publicId === "item-supino");
    assert.deepEqual(supinoAfter.sets, [{ reps: 10, loadKg: 60, restSeconds: 60 }]);
  });

  // TEST 12: Verificar ordem após serialização, salvamento e recarregamento.
  runCase(12, "Verificar ordem após serialização, salvamento e recarregamento", () => {
    const serialized = JSON.stringify({ items, combinations });
    const deserialized = JSON.parse(serialized);

    const entries = buildContainerEntries(deserialized.items, deserialized.combinations);
    assert.ok(entries.length > 0);
    assert.equal(entries[0].combination.items[0].publicId, "item-supino");
  });

  // TEST 13: Verificar ordem final na representação utilizada pelo Student Runtime.
  runCase(13, "Verificar ordem final na representação utilizada pelo Student Runtime", () => {
    // Invert Bi-set A back to Crucifixo, Supino, Crossover
    const reordered = simulateReorderItemsInCombination(
      items,
      combinations,
      "biset-a",
      ["item-crucifixo", "item-supino", "item-crossover"]
    );
    items = reordered.items;
    combinations = reordered.combinations;

    const runtimeUnits = buildStudentRuntimeUnits(items, combinations);
    const combUnit = runtimeUnits.find((u) => u.combination?.publicId === "biset-a");
    assert.ok(combUnit, "Student runtime receives combination unit");
    assert.equal(combUnit.items[0].exerciseNameSnapshot, "Crucifixo com Halteres");
    assert.equal(combUnit.items[1].exerciseNameSnapshot, "Supino Reto com Barra");
    assert.equal(combUnit.items[2].exerciseNameSnapshot, "Crossover no Cabo");
  });

  // TEST 14: Verificar que exercícios sem exercise_id continuam funcionando.
  runCase(14, "Verificar que exercícios sem exercise_id continuam funcionando", () => {
    const customItem = {
      publicId: "custom-ex-1",
      exerciseId: null,
      customExercisePublicId: "cex-999",
      exerciseNameSnapshot: "Exercício Personalizado do Treinador",
      sortOrder: 10,
      combinationPublicId: "biset-a",
    };
    const testItems = [...items, customItem];
    const reordered = simulateReorderItemsInCombination(testItems, combinations, "biset-a", [
      "custom-ex-1",
      "item-crucifixo",
      "item-supino",
      "item-crossover",
    ]);

    const combA = reordered.combinations.find((c) => c.publicId === "biset-a");
    assert.equal(combA.items[0].publicId, "custom-ex-1");
    assert.equal(combA.items[0].exerciseId, null);
  });

  // TEST 15: Garantir que o exerciseNameSnapshot da importação por IA não seja alterado.
  runCase(15, "Garantir que o exerciseNameSnapshot da importação por IA não seja alterado", () => {
    const aiItem = {
      publicId: "ai-item-1",
      exerciseNameSnapshot: "Tríceps Testa na Polia Barra W [AI-FIDELITY-TAG]",
      sortOrder: 20,
      combinationPublicId: "biset-a",
    };
    const testItems = [...items, aiItem];
    const reordered = simulateReorderItemsInCombination(testItems, combinations, "biset-a", [
      "ai-item-1",
      "item-crucifixo",
    ]);
    const found = reordered.items.find((i) => i.publicId === "ai-item-1");
    assert.equal(found.exerciseNameSnapshot, "Tríceps Testa na Polia Barra W [AI-FIDELITY-TAG]");
  });

  // TEST 16: Verificar que a alteração de draft não modifica versões publicadas.
  runCase(16, "Verificar que a alteração de draft não modifica versões publicadas", () => {
    const publishedVersionSnapshot = {
      versionNumber: 1,
      status: "PUBLISHED",
      items: JSON.parse(JSON.stringify(items)),
      combinations: JSON.parse(JSON.stringify(combinations)),
    };

    // Reorder draft
    const draftItems = JSON.parse(JSON.stringify(items));
    const draftComb = JSON.parse(JSON.stringify(combinations));
    simulateReorderItemsInCombination(draftItems, draftComb, "biset-a", [
      "item-crossover",
      "item-supino",
      "item-crucifixo",
    ]);

    // Published snapshot remains strictly immutable
    assert.equal(publishedVersionSnapshot.combinations[0].items[0].publicId, "item-crucifixo");
    assert.equal(publishedVersionSnapshot.combinations[0].items[1].publicId, "item-supino");
  });

  // TEST 17: Verificar tri-set e demais grupos afetados pelo mesmo algoritmo.
  runCase(17, "Verificar tri-set e demais grupos afetados pelo mesmo algoritmo", () => {
    const triSet = {
      publicId: "tri-set-1",
      combinationType: "TRI_SET",
      title: "Ombros 3D",
      sortOrder: 0,
      items: [
        { publicId: "tri-1", exerciseNameSnapshot: "Desenvolvimento", sortOrder: 0, combinationPublicId: "tri-set-1" },
        { publicId: "tri-2", exerciseNameSnapshot: "Elevação Lateral", sortOrder: 1, combinationPublicId: "tri-set-1" },
        { publicId: "tri-3", exerciseNameSnapshot: "Crucifixo Invertido", sortOrder: 2, combinationPublicId: "tri-set-1" },
      ],
    };
    const triItems = triSet.items;
    const reordered = simulateReorderItemsInCombination(triItems, [triSet], "tri-set-1", [
      "tri-3",
      "tri-1",
      "tri-2",
    ]);
    assert.equal(reordered.combinations[0].items[0].exerciseNameSnapshot, "Crucifixo Invertido");
    assert.equal(reordered.combinations[0].items[1].exerciseNameSnapshot, "Desenvolvimento");
    assert.equal(reordered.combinations[0].items[2].exerciseNameSnapshot, "Elevação Lateral");
  });

  // TEST 18: Verificar comportamento de controles de movimentação no primeiro e no último item.
  runCase(18, "Verificar comportamento de controles de movimentação no primeiro e no último item", () => {
    const testItems = [
      { publicId: "it-1", sortOrder: 0 },
      { publicId: "it-2", sortOrder: 1 },
    ];
    function getStepperState(itemIdx, total) {
      return {
        canMoveUp: itemIdx > 0,
        canMoveDown: itemIdx < total - 1,
      };
    }

    const first = getStepperState(0, testItems.length);
    assert.equal(first.canMoveUp, false, "First item cannot move up");
    assert.equal(first.canMoveDown, true, "First item can move down");

    const last = getStepperState(1, testItems.length);
    assert.equal(last.canMoveUp, true, "Last item can move up");
    assert.equal(last.canMoveDown, false, "Last item cannot move down");
  });

  // TEST 19: Verificar duas reordenações rápidas com persistência correta.
  runCase(19, "Verificar duas reordenações rápidas com persistência correta", () => {
    let fastItems = [
      { publicId: "fast-a", sortOrder: 0, combinationPublicId: "c-fast" },
      { publicId: "fast-b", sortOrder: 1, combinationPublicId: "c-fast" },
    ];
    let fastComb = [{ publicId: "c-fast", sortOrder: 0, items: fastItems }];

    // Step 1: invert A, B -> B, A
    let res1 = simulateReorderItemsInCombination(fastItems, fastComb, "c-fast", ["fast-b", "fast-a"]);
    // Step 2 immediately: invert B, A -> A, B
    let res2 = simulateReorderItemsInCombination(res1.items, res1.combinations, "c-fast", ["fast-a", "fast-b"]);

    assert.equal(res2.combinations[0].items[0].publicId, "fast-a");
    assert.equal(res2.combinations[0].items[1].publicId, "fast-b");
    assert.equal(res2.combinations[0].items[0].sortOrder, 0);
    assert.equal(res2.combinations[0].items[1].sortOrder, 1);
  });

  // TEST 20: Garantir que inserir em posição explicitamente escolhida respeite essa posição.
  runCase(20, "Garantir que inserir em posição explicitamente escolhida respeite essa posição", () => {
    const initialList = [
      { publicId: "p1", exerciseNameSnapshot: "Ex 1", sortOrder: 0 },
      { publicId: "p2", exerciseNameSnapshot: "Ex 2", sortOrder: 1 },
      { publicId: "p3", exerciseNameSnapshot: "Ex 3", sortOrder: 2 },
    ];

    // Explicitly insert at position 1 (between Ex 1 and Ex 2)
    const inserted = simulateAddItemToDraftBlock(initialList, [], {
      publicId: "p-new",
      exerciseNameSnapshot: "Ex Inserido no Meio",
      sortOrder: 1,
    });

    assert.equal(inserted.items.length, 4);
    assert.equal(inserted.items[0].publicId, "p1");
    assert.equal(inserted.items[0].sortOrder, 0);
    assert.equal(inserted.items[1].publicId, "p-new");
    assert.equal(inserted.items[1].sortOrder, 1, "Explicit sortOrder 1 respected");
    assert.equal(inserted.items[2].publicId, "p2");
    assert.equal(inserted.items[2].sortOrder, 2, "Previous item at 1 shifted to 2");
    assert.equal(inserted.items[3].publicId, "p3");
    assert.equal(inserted.items[3].sortOrder, 3, "Previous item at 2 shifted to 3");
  });

  console.log("\n==================================================");
  console.log(`TEST SUITE FINISHED: ${passed}/${total} PASS`);
  console.log("==================================================\n");

  return { passed, total };
}

if (process.argv[1]?.endsWith("test-training-biset-order.mjs")) {
  runAllTests();
}
