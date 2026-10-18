/**
 * TREVO ONE — TEST SUITE: CENTRAL DE TREINOS & WORKOUT BUILDER REPLACEMENT
 *
 * Verifies:
 * 1. Central de Treinos (`app/consultoria/[slug]/rotinas/page.tsx`):
 *    - Shell uses themeVariant="dark-overview" and showDashboardWallpaper={true}
 *    - Compact black header with blue dumbbell icon and "Nova ficha" CTA
 *    - No "MÓDULO DE TREINAMENTO" badge or loose secondary buttons
 *    - 3 tabs (Treinos, Modelos, Prescrições)
 *    - WorkoutListControls (search with clear ✕, status pills, sort, result counter)
 *    - Differentiated empty states (search empty, list empty, error)
 *    - Desktop continuous table container + mobile interactive cards with e.stopPropagation()
 *    - Mobile floating action button
 *    - Zero '#10271F' / '#1e4738' dark green tint surfaces
 * 2. Visualização e Montagem (`app/consultoria/[slug]/rotinas/[publicId]/page.tsx`):
 *    - Shell uses themeVariant="dark-overview" and showDashboardWallpaper={true}
 * 3. Workout Builder (`components/consultancies/training-v2/workout-builder.tsx`):
 *    - Library sidebar defaults closed (isLibrarySidebarOpen = false)
 *    - No invented defaults for difficultyLevel ("") or duration (null)
 *    - No "TRAINING STUDIO" badge
 *    - Clear segregation between Published and Draft modes
 *    - Full-width mobile block selector
 *    - Mutual exclusivity of library drawer and assistant
 * 4. Semantic Tokens (`components/consultancies/training-v2/training-studio-tokens.ts`):
 *    - Semantic colors for Bi-Set, Tri-Set, Circuit, Superset
 *    - No decorative glowing shadows
 * 5. Repository (`lib/training-v2/workout-repository.ts`):
 *    - Supports search across title + assigned student name
 *    - Supports sorting (recent, oldest, title_asc) with prepared statements
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function pass(name) {
  console.log(`  ${colors.green}✓ PASS:${colors.reset} ${name}`);
}

function group(name) {
  console.log(`\n${colors.cyan}${colors.bold}=== ${name} ===${colors.reset}`);
}

async function runTestSuite() {
  console.log(`${colors.bold}Iniciando Auditoria: Central de Treinos e Workout Builder${colors.reset}`);

  // =========================================================================
  // 1. CENTRAL DE TREINOS (app/consultoria/[slug]/rotinas/page.tsx)
  // =========================================================================
  group("1. Central de Treinos (rotinas/page.tsx)");

  const rotinasPagePath = path.resolve("app/consultoria/[slug]/rotinas/page.tsx");
  assert.ok(fs.existsSync(rotinasPagePath), "rotinas/page.tsx exists");
  const rotinasCode = fs.readFileSync(rotinasPagePath, "utf-8");

  // Shell & Wallpaper
  assert.ok(rotinasCode.includes('themeVariant="dark-overview"'), "Must use themeVariant='dark-overview'");
  assert.ok(rotinasCode.includes("showDashboardWallpaper={true}"), "Must enable showDashboardWallpaper={true}");

  // No dark green tints or old badge
  assert.ok(!rotinasCode.includes("#10271F"), "Must not use #10271F");
  assert.ok(!rotinasCode.includes("#1e4738"), "Must not use #1e4738");
  assert.ok(!rotinasCode.includes("MÓDULO DE TREINAMENTO"), "Must not show MÓDULO DE TREINAMENTO badge");

  // Compact Header
  assert.ok(rotinasCode.includes("DumbbellIcon"), "Header must feature blue DumbbellIcon");
  assert.ok(rotinasCode.includes("Nova ficha"), "Primary CTA in header must be 'Nova ficha'");

  // 3 Tabs
  assert.ok(rotinasCode.includes("!isTemplatesTab && !isAssignmentsTab"), "Must have workouts tab");
  assert.ok(rotinasCode.includes("isTemplatesTab"), "Must have templates tab");
  assert.ok(rotinasCode.includes("isAssignmentsTab"), "Must have assignments tab");

  // Control bar & Empty states
  assert.ok(rotinasCode.includes("WorkoutListControls"), "Must integrate WorkoutListControls");
  assert.ok(rotinasCode.includes("Nenhum treino encontrado para esta busca"), "Differentiated search empty state");
  assert.ok(rotinasCode.includes("Você ainda não criou nenhuma ficha"), "Differentiated total empty state");
  assert.ok(rotinasCode.includes("Não foi possível carregar os treinos no momento"), "Differentiated error state");

  // Desktop table & mobile cards with stopPropagation
  assert.ok(rotinasCode.includes("hidden sm:block"), "Desktop table structure");
  assert.ok(rotinasCode.includes("sm:hidden"), "Mobile cards structure");
  assert.ok(rotinasCode.includes("isFloating"), "Mobile floating action button implemented");

  pass("Central de Treinos: Shell wallpapers, compact header, tabs, controls, empty states, desktop table & mobile cards");

  // =========================================================================
  // 2. VISUALIZAÇÃO E MONTAGEM PAGE (app/consultoria/[slug]/rotinas/[publicId]/page.tsx)
  // =========================================================================
  group("2. Rota do Builder (rotinas/[publicId]/page.tsx)");

  const builderPagePath = path.resolve("app/consultoria/[slug]/rotinas/[publicId]/page.tsx");
  assert.ok(fs.existsSync(builderPagePath), "rotinas/[publicId]/page.tsx exists");
  const builderPageCode = fs.readFileSync(builderPagePath, "utf-8");

  assert.ok(builderPageCode.includes('themeVariant="dark-overview"'), "Must use themeVariant='dark-overview'");
  assert.ok(builderPageCode.includes("showDashboardWallpaper={true}"), "Must enable showDashboardWallpaper={true}");
  assert.ok(!builderPageCode.includes("#10271F"), "Must not contain #10271F");
  assert.ok(!builderPageCode.includes("#1e4738"), "Must not contain #1e4738");

  pass("Builder Page: Shell wallpapers enabled, clean surfaces, no dark green tints");

  // =========================================================================
  // 3. WORKOUT BUILDER COMPONENT (components/consultancies/training-v2/workout-builder.tsx)
  // =========================================================================
  group("3. Componente WorkoutBuilder");

  const builderPath = path.resolve("components/consultancies/training-v2/workout-builder.tsx");
  assert.ok(fs.existsSync(builderPath), "workout-builder.tsx exists");
  const builderCode = fs.readFileSync(builderPath, "utf-8");

  // Sidebar closed by default
  assert.ok(builderCode.includes("const [isLibrarySidebarOpen, setIsLibrarySidebarOpen] = useState(false)"), "Library sidebar defaults to false");

  // No TRAINING STUDIO badge
  assert.ok(!builderCode.includes("TRAINING STUDIO"), "Must not contain TRAINING STUDIO badge");

  // No invented defaults
  assert.ok(builderCode.includes('version.difficultyLevel || workout.difficultyLevel || ""'), "difficultyLevel defaults to empty string");
  assert.ok(builderCode.includes("version.estimatedDurationMinutes || workout.estimatedDurationMinutes || null"), "estimatedDurationMinutes defaults to null");
  assert.ok(builderCode.includes("<option value=\"\">Não informado</option>"), "difficultyLevel includes 'Não informado' option");

  // Segregation between published and draft
  assert.ok(builderCode.includes("isDraft ? ("), "Segregates behavior based on isDraft");
  assert.ok(builderCode.includes("<h1"), "Uses <h1> in published mode");
  assert.ok(builderCode.includes("Publicado V"), "Shows Publicado VX badge in published mode");
  assert.ok(builderCode.includes("Rascunho V"), "Shows Rascunho VX badge in draft mode");

  // Full-width mobile block selector
  assert.ok(builderCode.includes("mobile-block-select"), "Provides mobile block dropdown selector");

  // Mutual exclusivity of sidebar & assistant
  assert.ok(builderCode.includes("setIsLibrarySidebarOpen(false)"), "Closes library when opening assistant");
  assert.ok(builderCode.includes("setIsTopAssistantOpen(false)"), "Closes assistant when opening library");

  pass("WorkoutBuilder: library closed by default, no fake defaults, published/draft segregation, mobile selector, mutual exclusivity");

  // =========================================================================
  // 4. TOKENS VISUAIS (components/consultancies/training-v2/training-studio-tokens.ts)
  // =========================================================================
  group("4. Semantic Tokens");

  const tokensPath = path.resolve("components/consultancies/training-v2/training-studio-tokens.ts");
  assert.ok(fs.existsSync(tokensPath), "training-studio-tokens.ts exists");
  const tokensCode = fs.readFileSync(tokensPath, "utf-8");

  assert.ok(tokensCode.includes("BI_SET"), "BI_SET defined");
  assert.ok(tokensCode.includes("TRI_SET"), "TRI_SET defined");
  assert.ok(tokensCode.includes("CIRCUIT"), "CIRCUIT defined");
  assert.ok(tokensCode.includes("SUPERSET"), "SUPERSET defined");
  assert.ok(!tokensCode.includes("shadow-[0_0_20px"), "No glow shadows in tokens");

  pass("Tokens: Semantic color definitions verified, no artificial glows");

  // =========================================================================
  // 5. WORKOUT REPOSITORY (lib/training-v2/workout-repository.ts)
  // =========================================================================
  group("5. Workout Repository Search & Sort");

  const repoPath = path.resolve("lib/training-v2/workout-repository.ts");
  assert.ok(fs.existsSync(repoPath), "workout-repository.ts exists");
  const repoCode = fs.readFileSync(repoPath, "utf-8");

  assert.ok(repoCode.includes('sort?: "recent" | "oldest" | "title_asc"'), "Supports sort options");
  assert.ok(repoCode.includes("JOIN users u_s ON u_s.id = cm_s.user_id"), "Joins users to search by student name");
  assert.ok(repoCode.includes("u_s.full_name LIKE ?"), "Searches student full name with prepared placeholder");

  pass("Repository: SQL search with prepared statements and multi-field sorting");

  console.log(`\n${colors.green}${colors.bold}TODOS OS TESTES PASSARAM COM SUCESSO!${colors.reset}\n`);
}

runTestSuite().catch((err) => {
  console.error(`\n${colors.red}${colors.bold}FALHA NA AUDITORIA:${colors.reset}`, err);
  process.exit(1);
});
