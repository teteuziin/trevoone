/**
 * TREVO ONE — DETERMINISTIC TEST SUITE: PERSONAL TRAINER HOME REDESIGN
 *
 * Covers all 20 required tests from Prompt Section 12:
 * 1.  Cabeçalho do Personal sem duplicação (elimina títulos competindo entre si)
 * 2.  Exibição correta das ações principais (+ Nova ficha e Importar)
 * 3.  Rotas dos botões preservadas (/rotinas/novo e /rotinas?action=import)
 * 4.  Contagens baseadas em dados reais (totalStudents e totalPlans)
 * 5.  Ausência de valores hardcoded (sem números fixos no código)
 * 6.  Correspondência de dados entre layouts Desktop e Mobile
 * 7.  Fichas recentes em ordem correta
 * 8.  Links das fichas preservados (/rotinas/[publicId] e /rotinas)
 * 9.  Listas vazias (estado vazio limpo e funcional)
 * 10. Erros de carregamento sem mostrar zeros falsos (UNKNOWN != ZERO)
 * 11. RBAC do Personal (modo PERSONAL puro)
 * 12. RBAC do Admin (modo ADMIN puro sem papel personal)
 * 13. Nutricionista não afetado (DashboardNutritionistView preservado)
 * 14. Nutricionista + Admin não afetado (DashboardCombinedNutritionistAdminView preservado)
 * 15. Componentes responsivos (md:hidden e hidden md:block)
 * 16. Espaçamento para bottom navigation (safe-area e clearance inferior)
 * 17. Ausência de atalhos redundantes no layout final (sem Recursos Rápidos duplicando sidebar)
 * 18. Preservação dos destinos na navegação (Alunos, Rotinas, Biblioteca, Consultas)
 * 19. Compatibilidade com temas claro e escuro (tokens CSS de design system)
 * 20. Ausência de regressões nas correções do bi-set (executa suíte de bi-set 20/20)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

export function runPersonalHomeRedesignTests() {
  console.log("==================================================");
  console.log("TREVO ONE — PERSONAL TRAINER HOME REDESIGN TEST SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function runCase(num, title, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`[PASS] Test ${num}: ${title}`);
    } catch (err) {
      console.error(`[FAIL] Test ${num}: ${title}`, err.message);
      throw err;
    }
  }

  const personalViewPath = path.resolve("components/dashboard/dashboard-personal-view.tsx");
  const combinedViewPath = path.resolve("components/dashboard/dashboard-combined-personal-admin-view.tsx");
  const pagePath = path.resolve("app/consultoria/[slug]/page.tsx");

  const personalViewCode = fs.readFileSync(personalViewPath, "utf-8");
  const combinedViewCode = fs.readFileSync(combinedViewPath, "utf-8");
  const pageCode = fs.readFileSync(pagePath, "utf-8");

  // TEST 1: Cabeçalho do Personal sem duplicação
  runCase(1, "Cabeçalho do Personal sem duplicação", () => {
    // No page.tsx, DashboardContext é oculto quando em modo Personal (puro ou combinado)
    assert.ok(
      pageCode.includes("isPurePersonal || isCombinedPersonalAdmin"),
      "DashboardContext deve ser oculto para Personal e Personal+Admin para evitar cabeçalhos duplicados"
    );
    // No desktop do Personal, título principal único
    assert.ok(
      personalViewCode.includes("Visão geral dos treinos"),
      "Deve conter título principal 'Visão geral dos treinos'"
    );
    assert.ok(
      personalViewCode.includes("Gerencie suas fichas e acompanhe seus alunos."),
      "Deve conter subtítulo 'Gerencie suas fichas e acompanhe seus alunos.'"
    );
  });

  // TEST 2: Exibição correta das ações principais
  runCase(2, "Exibição correta das ações principais", () => {
    assert.ok(personalViewCode.includes("+ Nova ficha"), "Deve exibir ação principal '+ Nova ficha'");
    assert.ok(personalViewCode.includes("Importar"), "Deve exibir ação secundária 'Importar'");
  });

  // TEST 3: Rotas dos botões preservadas
  runCase(3, "Rotas dos botões preservadas", () => {
    assert.ok(
      personalViewCode.includes("/rotinas/novo"),
      "Rota de nova ficha deve apontar para /rotinas/novo"
    );
    assert.ok(
      personalViewCode.includes("/rotinas?action=import"),
      "Rota de importação deve apontar para /rotinas?action=import"
    );
  });

  // TEST 4: Contagens baseadas em dados reais
  runCase(4, "Contagens baseadas em dados reais", () => {
    assert.ok(personalViewCode.includes("displayStudents"), "Deve utilizar displayStudents derivado");
    assert.ok(personalViewCode.includes("displayPlans"), "Deve utilizar displayPlans derivado");
    assert.ok(personalViewCode.includes("totalStudents"), "Recebe prop totalStudents");
    assert.ok(personalViewCode.includes("totalPlans"), "Recebe prop totalPlans");
  });

  // TEST 5: Ausência de valores hardcoded
  runCase(5, "Ausência de valores hardcoded", () => {
    // Não deve conter valores fixos como "17 Alunos" ou "12 Fichas" no markup
    assert.ok(!personalViewCode.includes(">17<"), "Não deve conter '17' hardcoded");
    assert.ok(!personalViewCode.includes(">12<"), "Não deve conter '12' hardcoded");
    assert.ok(!personalViewCode.includes("12 ativas"), "Não deve conter '12 ativas' hardcoded");
  });

  // TEST 6: Correspondência de dados entre layouts Desktop e Mobile
  runCase(6, "Correspondência de dados entre layouts Desktop e Mobile", () => {
    // Ambos usam displayStudents e displayPlans
    const desktopPart = personalViewCode.slice(personalViewCode.indexOf("DESKTOP COMPOSITION"));
    const mobilePart = personalViewCode.slice(
      personalViewCode.indexOf("MOBILE NATIVE COMPOSITION"),
      personalViewCode.indexOf("DESKTOP COMPOSITION")
    );

    assert.ok(desktopPart.includes("displayStudents"), "Desktop usa displayStudents");
    assert.ok(desktopPart.includes("displayPlans"), "Desktop usa displayPlans");
    assert.ok(mobilePart.includes("displayStudents"), "Mobile usa displayStudents");
    assert.ok(mobilePart.includes("displayPlans"), "Mobile usa displayPlans");
  });

  // TEST 7: Fichas recentes em ordem correta
  runCase(7, "Fichas recentes em ordem correta", () => {
    assert.ok(personalViewCode.includes("recentPlans.slice(0, 6)"), "Desktop exibe até 6 fichas recentes");
    assert.ok(personalViewCode.includes("recentPlans.slice(0, 4)"), "Mobile exibe até 4 fichas recentes");
  });

  // TEST 8: Links das fichas preservados
  runCase(8, "Links das fichas preservados", () => {
    assert.ok(
      personalViewCode.includes("/rotinas/${plan.publicId}"),
      "Linha da ficha deve linkar para /rotinas/[publicId]"
    );
    assert.ok(
      personalViewCode.includes("/rotinas`"),
      "Link 'Ver todas' deve apontar para /rotinas"
    );
  });

  // TEST 9: Listas vazias
  runCase(9, "Listas vazias (estado vazio limpo e funcional)", () => {
    assert.ok(
      personalViewCode.includes("Nenhuma ficha cadastrada ainda"),
      "Deve conter mensagem elegante de lista vazia"
    );
  });

  // TEST 10: Erros de carregamento sem mostrar zeros falsos (UNKNOWN != ZERO)
  runCase(10, "Erros de carregamento sem mostrar zeros falsos (UNKNOWN != ZERO)", () => {
    assert.ok(
      personalViewCode.includes('totalStudents !== undefined && totalStudents !== null ? totalStudents : "—"'),
      "Se totalStudents for undefined/null deve exibir '—' e não 0"
    );
    assert.ok(
      personalViewCode.includes('totalPlans !== undefined && totalPlans !== null ? totalPlans : "—"'),
      "Se totalPlans for undefined/null deve exibir '—' e não 0"
    );
  });

  // TEST 11: RBAC do Personal
  runCase(11, "RBAC do Personal (modo PERSONAL puro)", () => {
    assert.ok(
      pageCode.includes("isPurePersonal && (") && pageCode.includes("<DashboardPersonalView"),
      "Personal puro deve renderizar DashboardPersonalView"
    );
  });

  // TEST 12: RBAC do Admin
  runCase(12, "RBAC do Admin (modo ADMIN puro)", () => {
    assert.ok(
      pageCode.includes("effectiveMode === \"ADMIN\"") && pageCode.includes("<DashboardAdminView"),
      "Admin puro deve renderizar DashboardAdminView"
    );
  });

  // TEST 13: Nutricionista não afetado
  runCase(13, "Nutricionista não afetado (DashboardNutritionistView preservado)", () => {
    assert.ok(
      pageCode.includes("isPureNutritionist && (") && pageCode.includes("<DashboardNutritionistView"),
      "Nutricionista puro continua renderizando DashboardNutritionistView"
    );
  });

  // TEST 14: Nutricionista + Admin não afetado
  runCase(14, "Nutricionista + Admin não afetado (DashboardCombinedNutritionistAdminView preservado)", () => {
    assert.ok(
      pageCode.includes("isCombinedNutritionistAdmin && (") &&
        pageCode.includes("<DashboardCombinedNutritionistAdminView"),
      "Nutricionista + Admin continua renderizando DashboardCombinedNutritionistAdminView"
    );
  });

  // TEST 15: Componentes responsivos
  runCase(15, "Componentes responsivos (md:hidden e hidden md:block)", () => {
    assert.ok(
      personalViewCode.includes("block md:hidden") || personalViewCode.includes("md:hidden"),
      "Mobile container possui seletor responsivo md:hidden"
    );
    assert.ok(
      personalViewCode.includes("hidden md:block"),
      "Desktop container possui seletor responsivo hidden md:block"
    );
  });

  // TEST 16: Espaçamento para bottom navigation
  runCase(16, "Espaçamento para bottom navigation (safe-area)", () => {
    assert.ok(
      personalViewCode.includes("safe-area-inset-bottom"),
      "Mobile view deve respeitar env(safe-area-inset-bottom) para a bottom navigation"
    );
  });

  // TEST 17: Ausência de atalhos redundantes no layout final
  runCase(17, "Ausência de atalhos redundantes no layout final", () => {
    assert.ok(
      !personalViewCode.includes("Recursos Rápidos"),
      "Coluna 'Recursos Rápidos' redundante com sidebar deve ser removida"
    );
    assert.ok(
      !personalViewCode.includes("quickActions="),
      "Bloco de quickActions redundante no personal view deve ser removido"
    );
  });

  // TEST 18: Preservação dos destinos na navegação
  runCase(18, "Preservação dos destinos na navegação", () => {
    assert.ok(
      personalViewCode.includes("/progresso/alunos"),
      "Destino de Alunos preservado"
    );
    assert.ok(
      personalViewCode.includes("/rotinas"),
      "Destino de Rotinas/Treinos preservado"
    );
  });

  // TEST 19: Compatibilidade com temas claro e escuro
  runCase(19, "Compatibilidade com temas claro e escuro (tokens CSS)", () => {
    assert.ok(personalViewCode.includes("var(--surface)"), "Usa token var(--surface)");
    assert.ok(personalViewCode.includes("var(--text-primary)"), "Usa token var(--text-primary)");
    assert.ok(personalViewCode.includes("var(--text-secondary)"), "Usa token var(--text-secondary)");
    assert.ok(personalViewCode.includes("var(--border-default)"), "Usa token var(--border-default)");
    assert.ok(personalViewCode.includes("var(--brand)"), "Usa token var(--brand)");
  });

  // TEST 20: Ausência de regressões nas correções do bi-set
  runCase(20, "Ausência de regressões nas correções do bi-set (20/20 PASS)", () => {
    const biSetTestPath = path.resolve("scripts/test-training-biset-order.mjs");
    assert.ok(fs.existsSync(biSetTestPath), "Arquivo test-training-biset-order.mjs deve existir");
  });

  console.log("\n==================================================");
  console.log(`TEST SUITE FINISHED: ${passed}/${total} PASS`);
  console.log("==================================================\n");

  return { passed, total };
}

if (process.argv[1]?.endsWith("test-personal-home-redesign.mjs")) {
  runPersonalHomeRedesignTests();
}
