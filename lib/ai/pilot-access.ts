/**
 * TREVO ONE — TRAINING AI PILOT ACCESS CONTROLLER
 * 
 * FAIL-CLOSED BY DEFAULT RULES:
 * 1. If general access is explicitly enabled via DESTINYAI_GENERAL_ACCESS_ENABLED="true",
 *    access is granted to all authorized professionals.
 * 2. Otherwise (default), system is in STRICT PILOT MODE:
 *    a) If DESTINYAI_PILOT_EMAILS is missing, unset, or empty: ACCESS DENIED TO ALL.
 *    b) If DESTINYAI_PILOT_EMAILS is configured, ONLY emails or userPublicIds matching
 *       the comma-separated list are granted access.
 *    c) Any other account is DENIED access with a friendly explanation.
 * 3. Identity is strictly derived from the server-side authenticated session, NEVER from client input.
 */

export interface PilotAccessCheckResult {
  allowed: boolean;
  error?: string;
  isPilotMode: boolean;
}

export function checkPilotAccess(session: { email?: string; userPublicId?: string } | null | undefined): PilotAccessCheckResult {
  if (!session || !session.email) {
    return {
      allowed: false,
      error: "Usuário não autenticado no servidor.",
      isPilotMode: true,
    };
  }

  // 1. Check for explicit general release override
  const isGeneralAccessExplicitlyEnabled =
    process.env.DESTINYAI_GENERAL_ACCESS_ENABLED?.trim().toLowerCase() === "true";

  if (isGeneralAccessExplicitlyEnabled) {
    return { allowed: true, isPilotMode: false };
  }

  // 2. Strict Fail-Closed Pilot Mode
  const rawPilotEmails = process.env.DESTINYAI_PILOT_EMAILS;
  if (!rawPilotEmails || typeof rawPilotEmails !== "string") {
    return {
      allowed: false,
      error: "O recurso 'Me ajuda (IA)' está em implantação controlada e o acesso ainda não foi liberado.",
      isPilotMode: true,
    };
  }

  const trimmedPilotEmails = rawPilotEmails.trim();
  if (trimmedPilotEmails.length === 0) {
    return {
      allowed: false,
      error: "O recurso 'Me ajuda (IA)' está em implantação controlada e ainda não possui contas piloto cadastradas.",
      isPilotMode: true,
    };
  }

  const allowedEntries = trimmedPilotEmails
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0 && item !== "*");

  if (allowedEntries.length === 0) {
    return {
      allowed: false,
      error: "A configuração de pilotos de IA está vazia ou inválida. O acesso permanece bloqueado por segurança.",
      isPilotMode: true,
    };
  }

  const userEmail = session.email.trim().toLowerCase();
  const userPublicId = session.userPublicId ? session.userPublicId.trim().toLowerCase() : "";

  const isWhitelisted =
    allowedEntries.includes(userEmail) ||
    (userPublicId.length > 0 && allowedEntries.includes(userPublicId));

  if (!isWhitelisted) {
    return {
      allowed: false,
      error: "O recurso 'Me ajuda (IA)' está em liberação controlada e ainda não está ativo para a sua conta.",
      isPilotMode: true,
    };
  }

  return { allowed: true, isPilotMode: true };
}
