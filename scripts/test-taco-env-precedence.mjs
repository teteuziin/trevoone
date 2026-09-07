import {
  resolveDatabaseConfig,
  classifyDatabase,
  validateTargetGuards,
  parseArgs,
  PROD_DB_NAME,
  DEV_DB_NAME,
  EXPECTED_HOST,
} from "./import-nutrition-v2-taco.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FALHA NA ASSERÇÃO: ${message}`);
  }
}

function runTests() {
  console.log("=== TREVO ONE — TESTE DE PRECEDÊNCIA DE AMBIENTE (TACO IMPORTER) ===");

  const fakeFileEnv = {
    DB_HOST: "srv1595.hstgr.io",
    DB_PORT: "3306",
    DB_NAME: "u406031981_trevoone_dev",
    DB_USER: "u406031981_trevodev",
    DB_PASSWORD: "file-secret-marker",
  };

  // CASE A: No process DB overrides -> falls back to fileEnv
  {
    const proc = {};
    const config = resolveDatabaseConfig(proc, fakeFileEnv);
    assert(config.host === "srv1595.hstgr.io", "Case A host");
    assert(config.port === 3306, "Case A port");
    assert(config.database === "u406031981_trevoone_dev", "Case A db");
    assert(config.user === "u406031981_trevodev", "Case A user");
    assert(config.password === "file-secret-marker", "Case A password");
    console.log("✓ CASE A (Sem overrides em process.env → DEV fallback): PASS");
  }

  // CASE B: process DB_NAME override
  {
    const proc = { DB_NAME: "explicit-custom-db" };
    const config = resolveDatabaseConfig(proc, fakeFileEnv);
    assert(config.database === "explicit-custom-db", "Case B db override");
    assert(config.host === "srv1595.hstgr.io", "Case B fallback host");
    assert(config.user === "u406031981_trevodev", "Case B fallback user");
    console.log("✓ CASE B (process.env DB_NAME override): PASS");
  }

  // CASE C: All DB process overrides (fake values)
  {
    const proc = {
      DB_HOST: "srv1595.hstgr.io",
      DB_PORT: "3307",
      DB_NAME: "fake-process-db",
      DB_USER: "fake-process-user",
      DB_PASSWORD: "process-secret-marker",
    };
    const config = resolveDatabaseConfig(proc, fakeFileEnv);
    assert(config.host === "srv1595.hstgr.io", "Case C host");
    assert(config.port === 3307, "Case C port");
    assert(config.database === "fake-process-db", "Case C db");
    assert(config.user === "fake-process-user", "Case C user");
    assert(config.password === "process-secret-marker", "Case C password");
    console.log("✓ CASE C (Todos DB process overrides com valores fake): PASS");
  }

  // CASE D: Partial override (DB_NAME explicit in process, others absent)
  {
    const proc = { DB_NAME: "u406031981_trevoone" };
    const config = resolveDatabaseConfig(proc, fakeFileEnv);
    assert(config.database === "u406031981_trevoone", "Case D db");
    assert(config.host === "srv1595.hstgr.io", "Case D host fallback");
    assert(config.user === "u406031981_trevodev", "Case D user fallback");
    console.log("✓ CASE D (Override parcial process.env + fallback fileEnv): PASS");
  }

  // CASE E: Production guard logic
  {
    const classification = classifyDatabase(PROD_DB_NAME);
    assert(classification.isProd === true, "Case E isProd");
    assert(classification.isDev === false, "Case E isDev");
    assert(classification.isValid === true, "Case E isValid");

    // Without --allow-production -> must throw
    let caughtMissingOptIn = false;
    try {
      validateTargetGuards({
        dbName: PROD_DB_NAME,
        dbHost: EXPECTED_HOST,
        isAllowProduction: false,
      });
    } catch (e) {
      caughtMissingOptIn = true;
      assert(e.message.includes("PRODUÇÃO DETECTADA"), "Case E missing opt-in message");
    }
    assert(caughtMissingOptIn, "Case E missing opt-in threw");

    // With --allow-production -> accepts
    const res = validateTargetGuards({
      dbName: PROD_DB_NAME,
      dbHost: EXPECTED_HOST,
      isAllowProduction: true,
    });
    assert(res.isProd === true, "Case E opt-in accepted");
    console.log("✓ CASE E (Lógica de segurança de PRODUÇÃO): PASS");
  }

  // CASE F: DEV guard logic
  {
    const classification = classifyDatabase(DEV_DB_NAME);
    assert(classification.isProd === false, "Case F isProd");
    assert(classification.isDev === true, "Case F isDev");
    assert(classification.isValid === true, "Case F isValid");

    // With --allow-production on DEV -> must throw inconsistent flag
    let caughtInconsistent = false;
    try {
      validateTargetGuards({
        dbName: DEV_DB_NAME,
        dbHost: EXPECTED_HOST,
        isAllowProduction: true,
      });
    } catch (e) {
      caughtInconsistent = true;
      assert(e.message.includes("Flag inconsistente"), "Case F inconsistent flag message");
    }
    assert(caughtInconsistent, "Case F inconsistent flag threw");

    // Normal DEV without --allow-production -> accepts
    const res = validateTargetGuards({
      dbName: DEV_DB_NAME,
      dbHost: EXPECTED_HOST,
      isAllowProduction: false,
    });
    assert(res.isDev === true, "Case F dev accepted");
    console.log("✓ CASE F (Lógica de segurança de DEV): PASS");
  }

  // CASE G: Unknown database -> fail closed
  {
    const classification = classifyDatabase("unknown_malicious_db");
    assert(classification.isValid === false, "Case G isValid false");

    let caughtUnknown = false;
    try {
      validateTargetGuards({
        dbName: "unknown_malicious_db",
        dbHost: EXPECTED_HOST,
        isAllowProduction: true,
      });
    } catch (e) {
      caughtUnknown = true;
      assert(e.message.includes("Banco de dados não autorizado"), "Case G message");
    }
    assert(caughtUnknown, "Case G threw for unknown db");
    console.log("✓ CASE G (Banco desconhecido rejeitado fail-closed): PASS");
  }

  // CASE H: Empty / whitespace string in process.env treated as missing
  {
    const proc = { DB_NAME: "   ", DB_USER: "" };
    const config = resolveDatabaseConfig(proc, fakeFileEnv);
    assert(config.database === "u406031981_trevoone_dev", "Case H db fallback");
    assert(config.user === "u406031981_trevodev", "Case H user fallback");
    console.log("✓ CASE H (String vazia/espaço tratada como ausente com fallback): PASS");
  }

  // CASE I: CLI invalid flag rejection
  {
    let caughtInvalid = false;
    const origExit = process.exit;
    const origErr = console.error;
    try {
      console.error = () => {};
      process.exit = (code) => {
        throw new Error(`EXIT_${code}`);
      };
      parseArgs(["--invalid-flag"]);
    } catch (e) {
      caughtInvalid = e.message.includes("EXIT_1");
    } finally {
      process.exit = origExit;
      console.error = origErr;
    }
    assert(caughtInvalid, "Case I rejected invalid CLI flag");
    console.log("✓ CASE I (Rejeição estrita de flags CLI inválidas): PASS");
  }

  console.log("\nTODOS OS 9 CASOS DA MATRIZ DE TESTE FORAM APROVADOS (PASS)!");
}

runTests();
