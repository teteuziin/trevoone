import fs from "fs";
import path from "path";
import assert from "assert";

console.log("=== TEST SUITE: MARCA-D'ÁGUA GLOBAL + REORGANIZAÇÃO DE AVALIAÇÕES FÍSICAS ===\n");

// 1. Marca-d'água Global
console.log("1. Auditando Marca-d'água Global...");
const wallpaperPath = path.resolve("components/dashboard/dashboard-wallpaper.tsx");
const wallpaperContent = fs.readFileSync(wallpaperPath, "utf-8");
assert(wallpaperContent.includes("offsetSidebar?: boolean;"), "ERRO: DashboardWallpaper deve aceitar offsetSidebar");
assert(wallpaperContent.includes("lg:left-64"), "ERRO: DashboardWallpaper deve suportar deslocamento para sidebar no desktop");

const shellPath = path.resolve("components/consultancies/consultancy-app-shell.tsx");
const shellContent = fs.readFileSync(shellPath, "utf-8");
assert(shellContent.includes("showDashboardWallpaper = true"), "ERRO: ConsultancyAppShell deve ter showDashboardWallpaper=true como padrão");

const adminShellPath = path.resolve("components/admin/platform-admin-shell.tsx");
const adminShellContent = fs.readFileSync(adminShellPath, "utf-8");
assert(adminShellContent.includes("<DashboardWallpaper"), "ERRO: PlatformAdminShell deve renderizar DashboardWallpaper");
console.log("✓ Marca-d'água Global verificada com sucesso!\n");

// 2. Card Avaliação física no Início
console.log("2. Auditando Card Avaliação física no Início...");
const inicioPath = path.resolve("app/consultoria/[slug]/page.tsx");
const inicioContent = fs.readFileSync(inicioPath, "utf-8");
assert(inicioContent.includes("getConsultancyPhysicalAssessmentsStats"), "ERRO: Início deve carregar getConsultancyPhysicalAssessmentsStats");

const personalViewPath = path.resolve("components/dashboard/dashboard-personal-view.tsx");
const personalViewContent = fs.readFileSync(personalViewPath, "utf-8");
assert(personalViewContent.includes("renderAvaliacaoFisica"), "ERRO: DashboardPersonalView deve ter renderAvaliacaoFisica");
assert(personalViewContent.includes("/avaliacoes-fisicas"), "ERRO: Card deve direcionar para /avaliacoes-fisicas");
assert(personalViewContent.includes("Nenhuma avaliação física registrada."), "ERRO: Card deve tratar estado vazio com mensagem amigável");
assert(personalViewContent.includes("loadStatus === \"ERROR\""), "ERRO: Card deve tratar erro discretamente sem mascarar com zero");
console.log("✓ Card Avaliação física no Início verificado com sucesso!\n");

// 3. Serviço de Avaliações Físicas
console.log("3. Auditando lib/consultancies/physical-assessments.ts...");
const servicePath = path.resolve("lib/consultancies/physical-assessments.ts");
const serviceContent = fs.readFileSync(servicePath, "utf-8");
assert(serviceContent.includes("getConsultancyPhysicalAssessmentsStats"), "ERRO: getConsultancyPhysicalAssessmentsStats deve estar presente");
assert(serviceContent.includes("listStudentsPhysicalAssessments"), "ERRO: listStudentsPhysicalAssessments deve estar presente");
assert(serviceContent.includes("getStudentPhysicalAssessments"), "ERRO: getStudentPhysicalAssessments deve estar presente");
assert(serviceContent.includes("computeMetricDelta"), "ERRO: computeMetricDelta deve estar presente");
assert(serviceContent.includes("student_progress_entries"), "ERRO: Deve consultar tabela student_progress_entries");
console.log("✓ Serviço de avaliações físicas verificado com sucesso!\n");

// 4. Central de Avaliações Físicas (Nova rota)
console.log("4. Auditando Central de Avaliações Físicas...");
const pagePath = path.resolve("app/consultoria/[slug]/avaliacoes-fisicas/page.tsx");
assert(fs.existsSync(pagePath), "ERRO: Rota app/consultoria/[slug]/avaliacoes-fisicas/page.tsx deve existir");
const pageContent = fs.readFileSync(pagePath, "utf-8");
assert(pageContent.includes("getConsultancyPhysicalAssessmentsStats"), "ERRO: Página deve carregar estatísticas");
assert(pageContent.includes("listStudentsPhysicalAssessments"), "ERRO: Página deve listar alunos");
assert(pageContent.includes("PhysicalAssessmentsHubView"), "ERRO: Página deve renderizar PhysicalAssessmentsHubView");

const hubPath = path.resolve("components/consultancies/assessments/physical-assessments-hub-view.tsx");
assert(fs.existsSync(hubPath), "ERRO: Componente physical-assessments-hub-view.tsx deve existir");
const hubContent = fs.readFileSync(hubPath, "utf-8");
assert(hubContent.includes("Avaliações físicas"), "ERRO: Título 'Avaliações físicas' deve estar presente");
assert(hubContent.includes("Nova avaliação"), "ERRO: Botão '+ Nova avaliação' deve estar presente");
assert(hubContent.includes("activeFilter === \"ALL\""), "ERRO: Filtro 'Todos' deve estar disponível");
assert(hubContent.includes("activeFilter === \"EVALUATED\""), "ERRO: Filtro 'Avaliados' deve estar disponível");
assert(hubContent.includes("activeFilter === \"NOT_EVALUATED\""), "ERRO: Filtro 'Sem avaliação' deve estar disponível");
assert(hubContent.includes("NewPhysicalAssessmentModal"), "ERRO: Modal de nova avaliação deve estar presente");
assert(hubContent.includes("PhysicalAssessmentDetailModal"), "ERRO: Modal de detalhes e comparativo deve estar presente");
assert(hubContent.includes("computeMetricDelta"), "ERRO: Comparador deve usar computeMetricDelta");
console.log("✓ Central de Avaliações Físicas verificada com sucesso!\n");

// 5. Integração no Perfil do Aluno (Alunos 4.0)
console.log("5. Auditando Integração no Perfil do Aluno (Alunos 4.0)...");
const detailPath = path.resolve("components/consultancies/personal-student-hub/personal-student-detail-view.tsx");
const detailContent = fs.readFileSync(detailPath, "utf-8");
assert(detailContent.includes("StudentPhysicalAssessmentHub"), "ERRO: personal-student-detail-view.tsx deve importar StudentPhysicalAssessmentHub");
assert(detailContent.includes("focusedView === \"avaliacao-fisica\""), "ERRO: Deve renderizar StudentPhysicalAssessmentHub quando focusedView === 'avaliacao-fisica'");
assert(detailContent.includes("ACOMPANHAMENTO: 4 LINHAS SIMPLES"), "ERRO: Acompanhamento deve conter 4 linhas simples");
assert(detailContent.includes("setFocusedView(\"avaliacao-fisica\")"), "ERRO: Deve haver ação direta para focar na avaliação física");
assert(detailContent.includes("Nenhuma avaliação física registrada."), "ERRO: Deve exibir estado pendente quando sem avaliações");

const studentHubPath = path.resolve("components/consultancies/personal-student-hub/student-physical-assessment-hub.tsx");
assert(fs.existsSync(studentHubPath), "ERRO: student-physical-assessment-hub.tsx deve existir");
const studentHubContent = fs.readFileSync(studentHubPath, "utf-8");
assert(studentHubContent.includes("Nova avaliação física"), "ERRO: Botão de nova avaliação deve estar no hub do aluno");
assert(studentHubContent.includes("Comparador de Evolução"), "ERRO: Comparador de evolução deve estar no hub do aluno");
assert(studentHubContent.includes("recordProfessionalProgressAction"), "ERRO: Deve persistir avaliações via recordProfessionalProgressAction");
console.log("✓ Integração no Perfil do Aluno verificada com sucesso!\n");

console.log("==================================================================");
console.log("🎉 TODOS OS TESTES DE AVALIAÇÕES FÍSICAS E MARCA-D'ÁGUA PASSARAM!");
console.log("==================================================================");
