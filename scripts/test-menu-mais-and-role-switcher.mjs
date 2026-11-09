import fs from "fs";
import path from "path";
import assert from "assert";

console.log("=== TEST SUITE: MENU MAIS & SELETOR DE ÁREA DESKTOP ===\n");

// 1. Audit cockpit-role-mode-switcher.tsx
console.log("1. Auditando components/dashboard/cockpit-role-mode-switcher.tsx...");
const switcherPath = path.resolve("components/dashboard/cockpit-role-mode-switcher.tsx");
const switcherContent = fs.readFileSync(switcherPath, "utf-8");

// No full-screen portal modal
assert(!switcherContent.includes("createPortal"), "ERRO: createPortal não deve ser usado para modal grande no desktop");
assert(!switcherContent.includes("max-h-[min(88dvh,680px)]"), "ERRO: Bottom sheet gigante encontrada");
// Aligned popover
assert(switcherContent.includes("absolute top-full right-0 mt-2 w-72 rounded-2xl bg-white border border-[#E5E8E2]"), "ERRO: Popover compacto alinhado à direita deve estar presente");
assert(switcherContent.includes("Área de trabalho"), "ERRO: Cabeçalho 'Área de trabalho' deve estar no popover");
assert(switcherContent.includes("— Área atual"), "ERRO: Indicador de área atual deve estar presente");
assert(switcherContent.includes("setConsultancyViewModeAction"), "ERRO: Deve chamar setConsultancyViewModeAction");
assert(switcherContent.includes("trevo-view-mode-change"), "ERRO: Deve despachar evento trevo-view-mode-change");
assert(switcherContent.includes("Escape"), "ERRO: Deve fechar no Escape");
console.log("✓ CockpitRoleModeSwitcher verificado com sucesso!\n");

// 2. Audit consultancy-navigation.tsx
console.log("2. Auditando components/consultancies/consultancy-navigation.tsx...");
const navPath = path.resolve("components/consultancies/consultancy-navigation.tsx");
const navContent = fs.readFileSync(navPath, "utf-8");

// Mobile Drawer: Ivory background, no dark theme classes in drawer
assert(navContent.includes('className="relative w-full max-h-[85vh] overflow-y-auto bg-[#FBFBF9] border-t border-[#E5E8E2] rounded-t-3xl'), "ERRO: Drawer deve ter fundo marfim #FBFBF9 e borda #E5E8E2");
// Header: avatar, name, role badge, consultancy name, close button. NO email in mobile drawer!
const drawerStart = navContent.indexOf('id="mobile-navigation-drawer"');
const drawerEnd = navContent.indexOf('</LogoutButton>\n            </div>\n          </div>\n        </div>\n      )}');
const drawerSlice = navContent.slice(drawerStart, drawerEnd !== -1 ? drawerEnd + 50 : undefined);

assert(drawerSlice.includes("activeRoleLabel"), "ERRO: Drawer deve exibir activeRoleLabel");
assert(drawerSlice.includes("{consultancyName}"), "ERRO: Drawer deve exibir nome da consultoria");
assert(!drawerSlice.includes("identity.email"), "ERRO: Drawer não deve exibir e-mail ocupando espaço");

// 1-tap Area switcher right under header
assert(navContent.includes("canSwitchRoles && targetSwitchOptions.length > 0"), "ERRO: Troca de área com 1 toque deve estar logo abaixo do cabeçalho");
assert(navContent.includes("Ir para Administração →"), "ERRO: Botão 'Ir para Administração →' deve estar presente");
assert(navContent.includes("Ir para Treinador →"), "ERRO: Botão 'Ir para Treinador →' deve estar presente");
assert(navContent.includes("handleQuickSwitchRole"), "ERRO: handleQuickSwitchRole deve alternar com 1 toque direto sem modal aninhado");

// Compact authorized links: no categories, no AppearanceSegmentedControl in mobile menu
assert(!navContent.includes("<AppearanceSegmentedControl\n                currentTheme={currentTheme}"), "ERRO: AppearanceSegmentedControl não deve ser renderizado no menu Mais");
assert(!navContent.includes("Gestão\n                  </p>"), "ERRO: Categoria artificial 'Gestão' não deve estar no menu Mais");
assert(!navContent.includes("Negócio\n                  </p>"), "ERRO: Categoria artificial 'Negócio' não deve estar no menu Mais");
assert(!navContent.includes("Sistema\n                  </p>"), "ERRO: Categoria artificial 'Sistema' não deve estar no menu Mais");

// Check required authorized links
assert(navContent.includes("rotinas") && navContent.includes("Treinos"), "ERRO: Link de Treinos deve estar presente");
assert(navContent.includes("consultas") && navContent.includes("Consultas"), "ERRO: Link de Consultas deve estar presente");
assert(navContent.includes("exercicios") && navContent.includes("Biblioteca de exercícios"), "ERRO: Link de Biblioteca de exercícios deve estar presente");
assert(navContent.includes("/notificacoes") && navContent.includes("Notificações"), "ERRO: Link de Notificações deve estar presente");
assert(navContent.includes("ajuda") && navContent.includes("Ajuda e suporte"), "ERRO: Link de Ajuda e suporte deve estar presente");
assert(navContent.includes("/conta/perfil") && navContent.includes("Minha conta"), "ERRO: Link de Minha conta deve estar presente");
assert(navContent.includes("Sair da conta"), "ERRO: Ação discreta de Sair da conta deve estar no final");

// Desktop header
assert(navContent.includes('className="hidden sm:inline-flex"'), "ERRO: Seletor de área desktop deve ser visível com sm:inline-flex");
assert(navContent.includes("{activeRoleLabel}"), "ERRO: Perfil desktop deve exibir activeRoleLabel dinamicamente");
console.log("✓ consultancy-navigation.tsx verificado com sucesso!\n");

console.log("=== TODOS OS TESTES PASSARAM COM SUCESSO! ===");
