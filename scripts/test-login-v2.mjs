import { verifyPassword, DUMMY_SCRYPT_HASH } from "../lib/auth/password.ts";
import { createSession } from "../lib/auth/session.ts";
import { getDbConnection } from "../lib/db/mysql.ts";
import fs from "node:fs";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (!condition) {
    console.error("  [FAIL]: " + message);
    failedCount++;
    throw new Error(message);
  } else {
    console.log("  [PASS]: " + message);
    passedCount++;
  }
}

console.log("==================================================");
console.log("TESTING TREVO ONE: LOGIN V2 PREMIUM SUITE");
console.log("==================================================");

async function runTests() {
  const connection = await getDbConnection();

  try {
    // -------------------------------------------------------------------------
    // SUITE 1: Auth Logic & Natural PT-BR Error Messages
    // -------------------------------------------------------------------------
    console.log("\n--- Suite 1: Auth Logic & Natural PT-BR Errors ---");

    const actionsCode = fs.readFileSync("app/login/actions.ts", "utf8");

    // 1.1 Natural PT-BR error messages in server action
    assert(
      actionsCode.includes('errors.email = "Informe seu e-mail."'),
      "Natural email required message: 'Informe seu e-mail.'"
    );
    assert(
      actionsCode.includes('errors.email = "Digite um e-mail válido."'),
      "Natural invalid email message: 'Digite um e-mail válido.'"
    );
    assert(
      actionsCode.includes('errors.password = "Informe sua senha."'),
      "Natural password required message: 'Informe sua senha.'"
    );
    assert(
      actionsCode.includes(
        'message: "E-mail ou senha incorretos. Confira os dados e tente novamente."'
      ),
      "Natural credentials failure message: 'E-mail ou senha incorretos. Confira os dados e tente novamente.'"
    );
    assert(
      actionsCode.includes(
        'message: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente."'
      ),
      "Natural rate limit message: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'"
    );
    assert(
      !actionsCode.includes("Invalid credentials") && !actionsCode.includes("SQL"),
      "Zero technical or English error strings present"
    );

    // 1.2 Password verification against dummy hash (timing attack protection)
    const dummyCheck = await verifyPassword("random-password", DUMMY_SCRYPT_HASH);
    assert(dummyCheck === false, "Dummy hash verification safely rejects");

    // -------------------------------------------------------------------------
    // SUITE 2: Exact Slogan & Copywriting Verification
    // -------------------------------------------------------------------------
    console.log("\n--- Suite 2: Official Slogan & Copywriting Compliance ---");

    const brandPanelContent = fs.readFileSync("components/auth/login-brand-panel.tsx", "utf8");
    const loginFormContent = fs.readFileSync("components/auth/login-form.tsx", "utf8");
    const loginShellContent = fs.readFileSync("components/auth/login-shell-v2.tsx", "utf8");

    // 2.1 Official Slogan
    assert(
      brandPanelContent.includes("A evolução na palma da sua mão.") &&
      loginShellContent.includes("A evolução na palma da sua mão."),
      "Official Slogan present in Brand Panel and Mobile/Tablet footer: 'A evolução na palma da sua mão.'"
    );

    // 2.2 Brand Headlines
    assert(
      brandPanelContent.includes("Sua evolução começa aqui.") &&
      loginShellContent.includes("Sua evolução começa aqui"),
      "Headline present: 'Sua evolução começa aqui.'"
    );
    assert(
      brandPanelContent.includes("Treino, nutrição e acompanhamento em um só lugar."),
      "Subheadline present: 'Treino, nutrição e acompanhamento em um só lugar.'"
    );

    // 2.3 Login Card Headings
    assert(
      loginFormContent.includes("Bem-vindo de volta"),
      "Card title present: 'Bem-vindo de volta'"
    );
    assert(
      loginFormContent.includes("Entre na sua conta para continuar sua evolução."),
      "Card subtitle present: 'Entre na sua conta para continuar sua evolução.'"
    );

    // 2.4 Button CTA & Loading State
    assert(
      loginFormContent.includes("Entrar no TREVO ONE"),
      "CTA Button text: 'Entrar no TREVO ONE'"
    );
    assert(
      loginFormContent.includes("Entrando no TREVO ONE..."),
      "CTA Loading text: 'Entrando no TREVO ONE...'"
    );

    // -------------------------------------------------------------------------
    // SUITE 3: Audio Infrastructure & Autoplay Fallback
    // -------------------------------------------------------------------------
    console.log("\n--- Suite 3: Ambient Audio Infrastructure & Fallback ---");

    const audioControllerContent = fs.readFileSync("components/auth/login-audio-controller.tsx", "utf8");
    assert(
      audioControllerContent.includes("/audio/login-theme.mp3"),
      "Audio points to designated path: /audio/login-theme.mp3"
    );
    assert(
      audioControllerContent.includes("TARGET_VOLUME = 0.15"),
      "Volume configured to comfortable target: 0.15"
    );
    assert(
      audioControllerContent.includes("trevo_login_audio_enabled"),
      "Audio preference persisted in localStorage key: trevo_login_audio_enabled"
    );
    assert(
      audioControllerContent.includes("fadeIn") && audioControllerContent.includes("fadeOutAndStop"),
      "Smooth fade-in and fade-out transitions implemented"
    );
    assert(
      audioControllerContent.includes("trevo-login-fade-out"),
      "Coordinates with login submission via trevo-login-fade-out event"
    );
    assert(
      audioControllerContent.includes("visibilitychange"),
      "Page visibility (tab switch) handling implemented"
    );

    // -------------------------------------------------------------------------
    // SUITE 4: Accessibility & Form Control Integrity
    // -------------------------------------------------------------------------
    console.log("\n--- Suite 4: Form Controls, Autocomplete & Accessibility ---");

    assert(
      loginFormContent.includes('autoComplete="email"'),
      "Email autocomplete attribute configured: email"
    );
    assert(
      loginFormContent.includes('autoComplete="current-password"'),
      "Password autocomplete attribute configured: current-password"
    );
    assert(
      loginFormContent.includes('aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}'),
      "Password toggle has dynamic accessible aria-label"
    );
    assert(
      loginFormContent.includes('name="remember_me"'),
      "Remember me checkbox properly named"
    );
    assert(
      loginFormContent.includes('href="/recuperar-senha"'),
      "Forgot password link points to /recuperar-senha"
    );
    assert(
      loginFormContent.includes('href={`/cadastro'),
      "Create account link points to /cadastro"
    );

    console.log("\n==================================================");
    console.log(`ALL LOGIN V2 TESTS PASSED: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log("==================================================");
  } finally {
    connection.release();
  }
}

runTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
