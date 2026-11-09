import fs from "fs";
import path from "path";
import assert from "assert";

console.log("=== TEST SUITE: ALUNOS 4.0 ULTRASSIMPLIFICADO — RECONSTRUÇÃO COMPLETA ===\n");

// 1. Audit lib/consultancies/personal-student-hub.ts
console.log("1. Auditando lib/consultancies/personal-student-hub.ts...");
const hubPath = path.resolve("lib/consultancies/personal-student-hub.ts");
const hubContent = fs.readFileSync(hubPath, "utf-8");

assert(hubContent.includes("latestAssignmentPublicId?: string | null;"), "ERRO: latestAssignmentPublicId deve estar na interface PersonalStudentSummary");
assert(hubContent.includes("latestWorkoutPublicId?: string | null;"), "ERRO: latestWorkoutPublicId deve estar na interface PersonalStudentSummary");
assert(hubContent.includes("latest_wa.public_id AS latest_assignment_public_id"), "ERRO: Query SQL deve selecionar latest_assignment_public_id");
assert(hubContent.includes("COALESCE(w.public_id, wv.public_id) AS latest_workout_public_id"), "ERRO: Query SQL deve selecionar latest_workout_public_id");
assert(hubContent.includes("latestAssignmentPublicId: r.latest_assignment_public_id ? String(r.latest_assignment_public_id) : null"), "ERRO: Mapeamento de retorno deve conter latestAssignmentPublicId");
assert(hubContent.includes("latestWorkoutPublicId: r.latest_workout_public_id ? String(r.latest_workout_public_id) : null"), "ERRO: Mapeamento de retorno deve conter latestWorkoutPublicId");
console.log("✓ lib/consultancies/personal-student-hub.ts verificado com sucesso!\n");

// 2. Audit components/consultancies/personal-student-hub/personal-student-list.tsx
console.log("2. Auditando components/consultancies/personal-student-hub/personal-student-list.tsx...");
const listPath = path.resolve("components/consultancies/personal-student-hub/personal-student-list.tsx");
const listContent = fs.readFileSync(listPath, "utf-8");

// Theme and official palette: White card, subtle border, ivory background
assert(listContent.includes("border-[#E5E8E2]"), "ERRO: Lista deve utilizar bordas oficiais border-[#E5E8E2]");
assert(!listContent.includes("bg-[#151619] border border-[#303238]"), "ERRO: Cabeçalho preto antigo #151619 não deve existir na lista");

// Contract & Regression test preservation
assert(listContent.includes('data-testid="mobile-student-card"'), "ERRO: data-testid='mobile-student-card' deve ser preservado para testes");
assert(listContent.includes('data-testid="desktop-student-grid"'), "ERRO: data-testid='desktop-student-grid' deve ser preservado para testes");
assert(listContent.includes("GESTÃO DE ALUNOS ATIVA"), "ERRO: Texto de contrato GESTÃO DE ALUNOS ATIVA deve ser preservado");

// 3 Main Filters with real counts
assert(listContent.includes('handleFilterChange("all")'), "ERRO: Filtro 'Todos' deve estar disponível");
assert(listContent.includes('handleFilterChange("with_workout")'), "ERRO: Filtro 'Com treino' deve estar disponível");
assert(listContent.includes('handleFilterChange("without_workout")'), "ERRO: Filtro 'Sem treino' deve estar disponível");
assert(listContent.includes("withWorkoutCount"), "ERRO: Contagem real de alunos com treino deve ser calculada");
assert(listContent.includes("withoutWorkoutCount"), "ERRO: Contagem real de alunos sem treino deve ser calculada");

// Primary actions: "Abrir treino" if active workout, "+ Criar treino" if none
assert(listContent.includes("Abrir treino"), "ERRO: Botão de ação primária 'Abrir treino' deve estar presente para alunos com ficha ativa");
assert(listContent.includes("+ Criar treino") || listContent.includes("Criar treino"), "ERRO: Botão '+ Criar treino' deve estar presente para alunos sem ficha ativa");
assert(listContent.includes("openWorkoutHref"), "ERRO: openWorkoutHref deve direcionar diretamente para o treino do aluno");

// 3-dots secondary menu
assert(listContent.includes("MoreDotsIcon"), "ERRO: Menu de 3 pontos para opções contextuais do aluno deve estar presente");
assert(listContent.includes("Registrar foto"), "ERRO: Atalho 'Registrar foto' deve estar no menu contextual");
assert(listContent.includes("Nova anamnese"), "ERRO: Atalho 'Nova anamnese' deve estar no menu contextual");
assert(listContent.includes("Enviar formulário"), "ERRO: Atalho 'Enviar formulário' deve estar no menu contextual");

// Card neutral area click navigation to student profile
assert(listContent.includes("router.push(studentDetailHref)"), "ERRO: Toque no card deve abrir o perfil operacional do aluno");
console.log("✓ personal-student-list.tsx verificado com sucesso!\n");

// 3. Audit components/consultancies/personal-student-hub/personal-student-detail-view.tsx
console.log("3. Auditando components/consultancies/personal-student-hub/personal-student-detail-view.tsx...");
const detailPath = path.resolve("components/consultancies/personal-student-hub/personal-student-detail-view.tsx");
const detailContent = fs.readFileSync(detailPath, "utf-8");

// No 5-tab top bar!
assert(!detailContent.includes('handleTabChange("overview")'), "ERRO: Não deve haver barra horizontal com 5 abas no topo do perfil");
assert(!detailContent.includes('handleTabChange("workouts")'), "ERRO: Não deve haver barra horizontal com 5 abas no topo do perfil");

// Header: White card, green accents, Ativo badge, 3-dots menu, NO duplicate workout button
assert(detailContent.includes("border-[#E5E8E2]"), "ERRO: Cabeçalho do perfil deve ter superfície clara oficial");
assert(detailContent.includes("Ativo"), "ERRO: Badge 'Ativo' deve estar presente");
assert(detailContent.includes("MoreDotsIcon"), "ERRO: Menu de 3 pontos deve estar presente no cabeçalho");

// Treino do aluno (Cartão Compacto)
assert(detailContent.includes("Treino Atual"), "ERRO: Cartão 'Treino Atual' deve estar presente");
assert(detailContent.includes("activeWorkout.title"), "ERRO: Nome do treino ativo deve ser exibido");
assert(detailContent.includes("Abrir treino"), "ERRO: Ação primária 'Abrir treino' deve estar no bloco");
assert(detailContent.includes("Criar treino"), "ERRO: Ação primária 'Criar treino' deve estar no bloco quando sem treino ativo");

// Acompanhamento: 3 linhas simples (Fotos, Anamnese, Formulários)
assert(detailContent.includes("Acompanhamento"), "ERRO: Bloco 'Acompanhamento' deve estar presente");
assert(detailContent.includes("setFocusedView(\"fotos\")"), "ERRO: Ação direta para abrir Fotos deve estar presente");
assert(detailContent.includes("setFocusedView(\"anamnese\")"), "ERRO: Ação direta para abrir Anamnese deve estar presente");
assert(detailContent.includes("setFocusedView(\"formularios\")"), "ERRO: Ação direta para abrir Formulários deve estar presente");

// Histórico e Informações (Acesso compacto)
assert(detailContent.includes("Histórico de Atividades"), "ERRO: Acesso compacto ao histórico deve estar presente");
assert(detailContent.includes("Informações do Aluno"), "ERRO: Informações do aluno devem estar presentes");
assert(detailContent.includes("overview.weightKg"), "ERRO: Peso deve ser exibido");
assert(detailContent.includes("overview.heightCm"), "ERRO: Altura deve ser exibida");

// Initial tab support & back button to student
assert(detailContent.includes("initialTab?: string;"), "ERRO: PersonalStudentDetailViewProps deve aceitar initialTab");
assert(detailContent.includes("Voltar ao perfil"), "ERRO: Sub-visões devem conter botão de retorno direto ao perfil do aluno");
console.log("✓ personal-student-detail-view.tsx verificado com sucesso!\n");

// 4. Audit student-photos-mural.tsx
console.log("4. Auditando components/consultancies/personal-student-hub/student-photos-mural.tsx...");
const photosPath = path.resolve("components/consultancies/personal-student-hub/student-photos-mural.tsx");
const photosContent = fs.readFileSync(photosPath, "utf-8");
assert(photosContent.includes("Nenhuma foto registrada."), "ERRO: Estado vazio de fotos deve exibir 'Nenhuma foto registrada.'");
assert(photosContent.includes("Adicionar fotos"), "ERRO: Botão 'Adicionar fotos' deve estar presente");
assert(photosContent.includes("Solicitar ao aluno"), "ERRO: Botão secundário 'Solicitar ao aluno' deve estar presente");
assert(photosContent.includes("Comparar"), "ERRO: Funcionalidade de comparação deve estar disponível");
console.log("✓ student-photos-mural.tsx verificado com sucesso!\n");

// 5. Audit student-anamnesis-hub.tsx
console.log("5. Auditando components/consultancies/personal-student-hub/student-anamnesis-hub.tsx...");
const anamnesisPath = path.resolve("components/consultancies/personal-student-hub/student-anamnesis-hub.tsx");
const anamnesisContent = fs.readFileSync(anamnesisPath, "utf-8");
assert(anamnesisContent.includes("Este aluno ainda não possui anamnese."), "ERRO: Estado vazio deve exibir 'Este aluno ainda não possui anamnese.'");
assert(anamnesisContent.includes("Iniciar anamnese"), "ERRO: Botão 'Iniciar anamnese' deve estar presente");
assert(anamnesisContent.includes("Enviar ao aluno"), "ERRO: Opção 'Enviar ao aluno' deve estar presente");
console.log("✓ student-anamnesis-hub.tsx verificado com sucesso!\n");

// 6. Audit student-forms-hub.tsx
console.log("6. Auditando components/consultancies/personal-student-hub/student-forms-hub.tsx...");
const formsPath = path.resolve("components/consultancies/personal-student-hub/student-forms-hub.tsx");
const formsContent = fs.readFileSync(formsPath, "utf-8");
assert(formsContent.includes("Nenhum formulário enviado."), "ERRO: Estado vazio deve exibir 'Nenhum formulário enviado.'");
assert(formsContent.includes("Enviar formulário"), "ERRO: Botão 'Enviar formulário' deve estar presente");
assert(formsContent.includes("Escolher modelo existente"), "ERRO: Modal deve permitir escolher modelo existente");
console.log("✓ student-forms-hub.tsx verificado com sucesso!\n");

// 7. Audit actions.ts
console.log("7. Auditando app/consultoria/[slug]/progresso/alunos/[studentPublicId]/actions.ts...");
const actionsPath = path.resolve("app/consultoria/[slug]/progresso/alunos/[studentPublicId]/actions.ts");
const actionsContent = fs.readFileSync(actionsPath, "utf-8");
assert(actionsContent.includes("updateStudentPersonalDataAction"), "ERRO: updateStudentPersonalDataAction deve estar exportada");
console.log("✓ actions.ts verificado com sucesso!\n");

console.log("==================================================================");
console.log("🎉 TODOS OS TESTES DE VALIDAÇÃO DE ALUNOS 4.0 PASSARAM COM SUCESSO!");
console.log("==================================================================");
