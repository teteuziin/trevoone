import fs from "fs";
import path from "path";
import assert from "assert";

console.log("=== TEST SUITE: ALUNOS 4.0 — RECONSTRUÇÃO DA EXPERIÊNCIA DE ACOMPANHAMENTO ===\n");

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
assert(listContent.includes("bg-white border border-[#E5E8E2] shadow-xs"), "ERRO: Lista deve utilizar superfícies claras oficiais bg-white border-[#E5E8E2]");
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

// Header: White card, green accents
assert(detailContent.includes("bg-white border border-[#E5E8E2] shadow-xs text-[#102E23]"), "ERRO: Cabeçalho do perfil deve ter superfície clara oficial");
assert(detailContent.includes("Ativo"), "ERRO: Badge 'Ativo' deve estar presente");

// Bloco 1: O que precisa de atenção?
assert(detailContent.includes("O que precisa de atenção?"), "ERRO: Bloco 1 'O que precisa de atenção?' deve estar presente");
assert(detailContent.includes("Tudo em dia por aqui"), "ERRO: Estado sem pendências deve informar 'Tudo em dia por aqui'");
assert(!detailContent.includes("Crítico"), "ERRO: Faltas de dados biométricos opcionais não devem exibir alerta alarmista 'Crítico'");

// Bloco 2: Treino do aluno
assert(detailContent.includes("Treino do Aluno"), "ERRO: Bloco 2 'Treino do Aluno' deve estar presente");
assert(detailContent.includes("activeWorkout.title"), "ERRO: Nome do treino ativo deve ser exibido");
assert(detailContent.includes("Abrir treino"), "ERRO: Ação primária 'Abrir treino' deve estar no bloco");
assert(detailContent.includes("Histórico"), "ERRO: Link para histórico de treinos deve estar presente");

// Bloco 3: Acompanhamento
assert(detailContent.includes("Acompanhamento"), "ERRO: Bloco 3 'Acompanhamento' deve estar presente");
assert(detailContent.includes("Fotos de Evolução"), "ERRO: Card de fotos de evolução deve estar presente");
assert(detailContent.includes("Anamnese & Saúde") || detailContent.includes("Anamnese &amp; Saúde"), "ERRO: Card de anamnese deve estar presente");
assert(detailContent.includes("Formulários & Questionários") || detailContent.includes("Formulários &amp; Questionários"), "ERRO: Card de formulários deve estar presente");

// Bloco 4: Informações do aluno
assert(detailContent.includes("Informações do Aluno"), "ERRO: Bloco 4 'Informações do Aluno' deve estar presente");
assert(detailContent.includes("overview.weightKg"), "ERRO: Peso deve ser exibido de forma compacta");
assert(detailContent.includes("overview.heightCm"), "ERRO: Altura deve ser exibida de forma compacta");
assert(detailContent.includes("overview.age"), "ERRO: Idade deve ser exibida de forma compacta");
assert(detailContent.includes("overview.sex"), "ERRO: Sexo deve ser exibido de forma compacta");
assert(detailContent.includes("overview.objective"), "ERRO: Objetivo deve ser exibido de forma compacta");

// Initial tab support
assert(detailContent.includes("initialTab?: string;"), "ERRO: PersonalStudentDetailViewProps deve aceitar initialTab");
console.log("✓ personal-student-detail-view.tsx verificado com sucesso!\n");

// 4. Audit app/consultoria/[slug]/progresso/alunos/page.tsx
console.log("4. Auditando app/consultoria/[slug]/progresso/alunos/page.tsx...");
const pagePath = path.resolve("app/consultoria/[slug]/progresso/alunos/page.tsx");
const pageContent = fs.readFileSync(pagePath, "utf-8");
assert(pageContent.includes('trainer-refined'), "ERRO: themeVariant='trainer-refined' deve ser configurado para a lista de alunos");
console.log("✓ app/consultoria/[slug]/progresso/alunos/page.tsx verificado com sucesso!\n");

// 5. Audit app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx
console.log("5. Auditando app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx...");
const detailPagePath = path.resolve("app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx");
const detailPageContent = fs.readFileSync(detailPagePath, "utf-8");
assert(detailPageContent.includes('trainer-refined'), "ERRO: themeVariant='trainer-refined' deve ser configurado para o perfil do aluno");
assert(detailPageContent.includes('initialTab={resolvedSearchParams?.tab}'), "ERRO: initialTab deve ser repassado ao PersonalStudentDetailView");
console.log("✓ app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx verificado com sucesso!\n");

console.log("==================================================================");
console.log("🎉 TODOS OS TESTES DE VALIDAÇÃO DE ALUNOS 4.0 PASSARAM COM SUCESSO!");
console.log("==================================================================");
