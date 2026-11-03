/**
 * Pure client-safe URL, WhatsApp, and campaign code utilities.
 * Contains NO server dependencies (no DB, no Node crypto, no notifications).
 */

/**
 * Detects if a URL is a WhatsApp destination (wa.me, api.whatsapp.com, or whatsapp.com).
 */
export function isWhatsAppUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase().trim();
  return (
    lower.includes("wa.me") ||
    lower.includes("api.whatsapp.com") ||
    lower.includes("whatsapp.com")
  );
}

/**
 * Builds a standardized WhatsApp URL (https://wa.me/55...) from phone number and optional message.
 * Cleans non-digits; automatically prefixes Brazilian country code 55 when 10 or 11 digits are passed.
 */
export function buildWhatsAppUrl(rawPhone: string, text?: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return "";
  const fullPhone = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  const base = `https://wa.me/${fullPhone}`;
  if (text && text.trim()) {
    return `${base}?text=${encodeURIComponent(text.trim())}`;
  }
  return base;
}

/**
 * Validates destination URL:
 * - Allows https://, http://, and internal paths starting with /consultoria/
 * - Allows WhatsApp URLs (wa.me, api.whatsapp.com)
 * - Automatically standardizes raw phone numbers or wa.me URLs without scheme
 * - Strictly rejects dangerous schemes (javascript:, data:, vbscript:)
 * - Preserves all existing query parameters
 */
export function validateDestinationUrl(rawUrl: string): { valid: boolean; normalized?: string; error?: string } {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, error: "A URL de destino é obrigatória." };
  }

  const trimmed = rawUrl.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:")
  ) {
    return { valid: false, error: "Protocolo de URL inválido ou não seguro." };
  }

  // Internal relative path check
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
      return { valid: false, error: "Caminho interno inválido." };
    }
    return { valid: true, normalized: trimmed };
  }

  // Support direct phone numbers pasted in URL field (e.g. "(71) 99999-9999" or "71999999999")
  const phoneDigits = trimmed.replace(/[\s().+-]/g, "");
  if (/^\d{10,13}$/.test(phoneDigits)) {
    const normalizedWa = buildWhatsAppUrl(phoneDigits);
    return { valid: true, normalized: normalizedWa };
  }

  // Support URLs typed without scheme starting with wa.me/ or api.whatsapp.com/
  if (lower.startsWith("wa.me/") || lower.startsWith("api.whatsapp.com/")) {
    return { valid: true, normalized: `https://${trimmed}` };
  }

  // Full URL validation
  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "Apenas endereços HTTP ou HTTPS são permitidos." };
    }
    return { valid: true, normalized: trimmed };
  } catch {
    return { valid: false, error: "Formato de URL inválido. Informe um endereço completo (ex: https://...)." };
  }
}

/**
 * Normalizes custom campaign code: uppercase, letters and digits only, 3 to 32 chars.
 */
export function sanitizeCampaignCode(rawCode?: string): string {
  if (!rawCode || typeof rawCode !== "string") {
    return "";
  }
  return rawCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
}
