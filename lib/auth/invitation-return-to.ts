/**
 * Valida de forma estrita e segura se um parâmetro returnTo corresponde
 * exclusivamente ao padrão interno de convite: /convite/<TOKEN_BASE64URL_43_CHARS>
 *
 * Previne open redirects, double encoding, protocolos arbitrários ou rotas fora do escopo.
 */
export function validateInvitationReturnTo(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  // Rejeita qualquer tentativa de protocolo, barra dupla, contra-barra ou caracteres de controle
  if (
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("://") ||
    trimmed.includes("\r") ||
    trimmed.includes("\n") ||
    trimmed.includes("javascript:") ||
    trimmed.includes("data:")
  ) {
    return null;
  }

  // Whitelist estrita: exatamente /convite/<43 caracteres base64url>
  const match = trimmed.match(/^\/convite\/([A-Za-z0-9_-]{43})$/);
  if (!match) {
    return null;
  }

  return `/convite/${match[1]}`;
}
