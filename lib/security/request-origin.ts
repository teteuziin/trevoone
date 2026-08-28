/**
 * Validates that an incoming browser-facing mutating request comes from the expected same origin.
 * Provides defense-in-depth against cross-origin forged requests (CSRF) for mutating Route Handlers.
 */
export function validateSameOrigin(request: Request): { allowed: boolean; error?: string } {
  const originHeader = request.headers.get("origin");
  if (!originHeader) {
    return { allowed: true };
  }

  try {
    const requestUrl = new URL(request.url);
    if (originHeader === requestUrl.origin) {
      return { allowed: true };
    }

    // Proxy-aware host matching
    const hostHeader = request.headers.get("host") || request.headers.get("x-forwarded-host");
    if (hostHeader) {
      const originUrl = new URL(originHeader);
      if (originUrl.host === hostHeader) {
        return { allowed: true };
      }
    }

    return { allowed: false, error: "Requisição não autorizada por política de mesma origem." };
  } catch {
    return { allowed: false, error: "Origem da requisição inválida." };
  }
}
