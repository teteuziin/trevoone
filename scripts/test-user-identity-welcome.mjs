import {
  resolveUserIdentity,
  computeInitials,
  extractFirstName,
} from "../lib/auth/user-identity.ts";

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
console.log("TESTING USER IDENTITY & WELCOME RESOLUTION SUITE");
console.log("==================================================");

// --- Suite 1: Name Resolution Priority ---
console.log("\n--- Suite 1: Name Resolution Priority ---");
// 1. full_name prioritized over everything
const id1 = resolveUserIdentity({
  fullName: "Anny Santos",
  displayName: "Anny VIP",
  firstName: "Anny",
  email: "annysantos@saiyashape.com",
});
assert(id1.fullName === "Anny Santos", "full_name takes precedence over display_name, first_name, email");
assert(id1.firstName === "Anny", "firstName extracted correctly as 'Anny'");
assert(id1.initials === "AS", "initials computed correctly as 'AS'");

// 2. display_name when full_name is missing
const id2 = resolveUserIdentity({
  displayName: "Matheus Pro",
  firstName: "Matheus",
  email: "matheus@trevoone.com",
});
assert(id2.fullName === "Matheus Pro", "display_name takes precedence when full_name is missing");
assert(id2.firstName === "Matheus", "firstName extracted as 'Matheus'");
assert(id2.initials === "MP", "initials computed as 'MP'");

// 3. first_name when full_name and display_name are missing
const id3 = resolveUserIdentity({
  firstName: "Matheus",
  email: "matheus@trevoone.com",
});
assert(id3.fullName === "Matheus", "first_name takes precedence when full_name & display_name are missing");
assert(id3.firstName === "Matheus", "firstName extracted as 'Matheus'");
assert(id3.initials === "M", "single word name produces 1-letter initial 'M'");

// 4. email when all name fields are missing
const id4 = resolveUserIdentity({
  email: "anny.santos@email.com",
});
assert(id4.fullName === "anny.santos@email.com", "email used as full_name fallback");
assert(id4.firstName === "Anny", "email prefix capitalized as firstName 'Anny'");
assert(id4.initials === "A", "email fallback initials computed safely");

// 5. Ultimate fallback "Usuário"
const id5 = resolveUserIdentity({});
assert(id5.fullName === "Usuário", "Ultimate fallback is 'Usuário'");
assert(id5.firstName === "Usuário", "Ultimate firstName fallback is 'Usuário'");
assert(id5.initials === "U", "Ultimate initials fallback is 'U'");

const id6 = resolveUserIdentity(null);
assert(id6.fullName === "Usuário", "null input falls back to 'Usuário' with zero crash");

// --- Suite 2: Initials Calculation Exact Spec ---
console.log("\n--- Suite 2: Initials Calculation Exact Spec ---");
assert(computeInitials("Anny Santos") === "AS", "Anny Santos -> AS");
assert(computeInitials("Matheus") === "M", "Matheus -> M (single word produces 1 letter)");
assert(computeInitials("Matheus Silva") === "MS", "Matheus Silva -> MS");
assert(computeInitials("Jéssica Caldeira") === "JC", "Jéssica Caldeira -> JC");
assert(computeInitials("Ingrid Silva") === "IS", "Ingrid Silva -> IS");
assert(computeInitials("Edilson Bispo") === "EB", "Edilson Bispo -> EB");
assert(computeInitials("Maria Tereza de Albuquerque Silveira Brandão") === "MB", "First and last word used for multi-word initials");
assert(computeInitials("") === "U", "Empty string -> U");
assert(computeInitials(null) === "U", "null -> U");
assert(computeInitials(undefined) === "U", "undefined -> U");

// --- Suite 3: First Name Extraction for Welcome Slide ---
console.log("\n--- Suite 3: First Name Extraction for Welcome Slide ---");
assert(extractFirstName("Anny Santos") === "Anny", "Olá, Anny");
assert(extractFirstName("Matheus Silva") === "Matheus", "Olá, Matheus");
assert(extractFirstName("Indiano Personal") === "Indiano", "Olá, Indiano");
assert(extractFirstName(null, null, null, "lucas.trainer@gmail.com") === "Lucas", "Olá, Lucas from email");
assert(extractFirstName(null, null, null, null) === "Usuário", "Olá, Usuário safe fallback");

// --- Suite 4: Multi-Role Person Consistency ---
console.log("\n--- Suite 4: Multi-Role Person Consistency ---");
// STUDENT + VIP user (e.g. Neto Cardoso)
const studentVipIdentity = resolveUserIdentity({
  fullName: "Neto Cardoso",
  email: "netocardos0@saiyashape.com",
  userPublicId: "u_neto_12345",
});
assert(studentVipIdentity.fullName === "Neto Cardoso", "STUDENT + VIP shows real user name");
assert(studentVipIdentity.firstName === "Neto", "STUDENT + VIP welcome shows 'Olá, Neto'");
assert(studentVipIdentity.initials === "NC", "STUDENT + VIP initials 'NC'");

// PERSONAL + ADMIN user (e.g. Indiano)
const personalAdminIdentity = resolveUserIdentity({
  fullName: "Indiano",
  email: "indianopersonal7@saiyashape.com",
  userPublicId: "u_indiano_67890",
});
assert(personalAdminIdentity.fullName === "Indiano", "PERSONAL + ADMIN shows real user name");
assert(personalAdminIdentity.firstName === "Indiano", "PERSONAL + ADMIN welcome shows 'Olá, Indiano'");
assert(personalAdminIdentity.initials === "I", "PERSONAL + ADMIN single name initial 'I'");

// Long name handling
const longNameIdentity = resolveUserIdentity({
  fullName: "Maximilianus Alexander Constantine Ferdinand",
  email: "max@example.com",
});
assert(longNameIdentity.fullName.length > 30, "Long full name preserved without corruption");
assert(longNameIdentity.firstName === "Maximilianus", "First name cleanly extracted from long name");
assert(longNameIdentity.initials === "MF", "Initials cleanly extracted from long name");

console.log("\n==================================================");
console.log(`ALL TESTS PASSED: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("==================================================");
