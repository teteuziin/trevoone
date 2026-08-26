export interface RtcIceServerDto {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export type TurnConfigResult =
  | {
      success: true;
      iceServers: RtcIceServerDto[];
      expiresAt: string;
    }
  | {
      success: false;
      error: string;
      message: string;
    };

export interface CloudflareTurnRuntimeConfig {
  keyId: string;
  apiToken: string;
}

interface CloudflareRawIceServer {
  urls?: string | string[];
  url?: string;
  username?: string;
  credential?: string;
  [key: string]: unknown;
}

interface CloudflareGenerateIceResponse {
  iceServers?: CloudflareRawIceServer[];
  [key: string]: unknown;
}

const CLOUDFLARE_TURN_ENDPOINT_BASE = "https://rtc.live.cloudflare.com/v1/turn/keys";
const ALLOWED_ICE_SCHEMES = ["stun:", "stuns:", "turn:", "turns:"];
const DISALLOWED_SCHEMES = ["http:", "https:", "ws:", "wss:", "file:", "javascript:", "data:"];
const MAX_ICE_SERVERS = 32;
const PROVIDER_TIMEOUT_MS = 8000;

/**
 * Validates Cloudflare TURN Key ID format.
 */
export function validateTurnKeyId(keyId: string): boolean {
  if (!keyId || typeof keyId !== "string") return false;
  const trimmed = keyId.trim();
  if (!trimmed || trimmed.length > 128) return false;
  // Alphanumeric with hyphens/underscores, no slashes or whitespace
  return /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

/**
 * Validates Cloudflare TURN Key API Token.
 */
export function validateTurnKeyApiToken(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const trimmed = token.trim();
  return trimmed.length > 0 && !/\s/.test(trimmed);
}

/**
 * Sanitizes an individual ICE URL against allowed schemes and optional port 53 filtering.
 */
export function sanitizeIceUrl(rawUrl: string, filterPort53: boolean = true): string | null {
  if (typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  const lower = trimmed.toLowerCase();

  // Explicitly reject forbidden schemes
  if (DISALLOWED_SCHEMES.some((s) => lower.startsWith(s))) {
    return null;
  }

  // Ensure allowed ICE scheme
  const hasAllowedScheme = ALLOWED_ICE_SCHEMES.some((s) => lower.startsWith(s));
  if (!hasAllowedScheme) {
    return null;
  }

  // Filter port 53 if requested (browsers/ISPs frequently block non-DNS traffic on port 53)
  if (filterPort53 && /:53(?:\?|$)/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * Normalizes raw iceServers array from Cloudflare Realtime TURN into canonical RtcIceServerDto list.
 */
export function normalizeIceServers(rawList: unknown, filterPort53: boolean = true): RtcIceServerDto[] | null {
  if (!Array.isArray(rawList)) {
    return null;
  }

  const normalized: RtcIceServerDto[] = [];

  for (const item of rawList.slice(0, MAX_ICE_SERVERS)) {
    if (!item || typeof item !== "object") continue;
    const entry = item as CloudflareRawIceServer;

    const urls: string[] = [];
    if (typeof entry.urls === "string") {
      const sanitized = sanitizeIceUrl(entry.urls, filterPort53);
      if (sanitized) urls.push(sanitized);
    } else if (Array.isArray(entry.urls)) {
      for (const u of entry.urls) {
        if (typeof u === "string") {
          const sanitized = sanitizeIceUrl(u, filterPort53);
          if (sanitized) urls.push(sanitized);
        }
      }
    } else if (typeof entry.url === "string") {
      const sanitized = sanitizeIceUrl(entry.url, filterPort53);
      if (sanitized) urls.push(sanitized);
    }

    if (urls.length === 0) continue;

    const username = typeof entry.username === "string" && entry.username.trim() ? entry.username.trim() : undefined;
    const credential = typeof entry.credential === "string" && entry.credential.trim() ? entry.credential.trim() : undefined;

    normalized.push({
      urls: urls.length === 1 ? urls[0] : urls,
      ...(username ? { username } : {}),
      ...(credential ? { credential } : {}),
    });
  }

  if (normalized.length === 0) {
    return null;
  }

  return normalized;
}

/**
 * Server-side helper to request temporary short-lived TURN credentials from Cloudflare Realtime TURN API.
 * The master token is never leaked to the client or logs.
 */
export async function fetchTemporaryIceServers(
  consultationPublicId: string,
  scheduledEndAt: Date,
  serverNow: Date = new Date(),
  customFetch?: typeof fetch,
  overrideConfig?: Partial<CloudflareTurnRuntimeConfig>
): Promise<TurnConfigResult> {
  const keyId = (overrideConfig?.keyId ?? process.env.CLOUDFLARE_TURN_KEY_ID)?.trim();
  const apiToken = (overrideConfig?.apiToken ?? process.env.CLOUDFLARE_TURN_KEY_API_TOKEN)?.trim();

  if (!keyId || !apiToken) {
    return {
      success: false,
      error: "TURN_NOT_CONFIGURED",
      message: "Serviço de retransmissão de vídeo não configurado.",
    };
  }

  if (!validateTurnKeyId(keyId) || !validateTurnKeyApiToken(apiToken)) {
    return {
      success: false,
      error: "TURN_CONFIG_INVALID",
      message: "Configuração do serviço TURN inválida.",
    };
  }

  // Calculate server-authoritative TTL: scheduledEndAt + 30 minutes
  const credentialExpiration = new Date(scheduledEndAt.getTime() + 30 * 60 * 1000);
  const remainingSeconds = Math.floor((credentialExpiration.getTime() - serverNow.getTime()) / 1000);

  if (remainingSeconds <= 0) {
    return {
      success: false,
      error: "JOIN_WINDOW_CLOSED",
      message: "Janela de atendimento da consulta expirada.",
    };
  }

  // Safe bounds: minimum 60s, maximum 86400s (24h)
  const ttl = Math.max(60, Math.min(remainingSeconds, 86400));
  const activeFetch = customFetch || fetch;

  const endpointUrl = `${CLOUDFLARE_TURN_ENDPOINT_BASE}/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`;

  let response: Response;
  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    response = await activeFetch(endpointUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl }),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        success: false,
        error: "TURN_PROVIDER_TIMEOUT",
        message: "Tempo limite excedido ao comunicar com o serviço de vídeo.",
      };
    }
    return {
      success: false,
      error: "TURN_PROVIDER_UNAVAILABLE",
      message: "Falha de comunicação ao obter servidores de mídia.",
    };
  } finally {
    clearTimeout(timeoutTimer);
  }

  if (response.status === 401 || response.status === 403) {
    return {
      success: false,
      error: "TURN_AUTHORIZATION_DENIED",
      message: "Credenciais de acesso ao serviço TURN não autorizadas.",
    };
  }

  if (response.status === 429) {
    return {
      success: false,
      error: "TURN_PROVIDER_UNAVAILABLE",
      message: "Limite de requisições excedido no provedor TURN.",
    };
  }

  if (!response.ok) {
    return {
      success: false,
      error: "TURN_PROVIDER_UNAVAILABLE",
      message: "Provedor TURN indisponível no momento.",
    };
  }

  let data: CloudflareGenerateIceResponse;
  try {
    data = (await response.json()) as CloudflareGenerateIceResponse;
  } catch {
    return {
      success: false,
      error: "TURN_CONFIG_INVALID",
      message: "Resposta inválida retornada pelo provedor de vídeo.",
    };
  }

  if (!data || !data.iceServers) {
    return {
      success: false,
      error: "TURN_CONFIG_INVALID",
      message: "Formato de lista ICE inválido retornado pelo provedor.",
    };
  }

  const normalizedIceServers = normalizeIceServers(data.iceServers, true);
  if (!normalizedIceServers) {
    return {
      success: false,
      error: "TURN_CONFIG_INVALID",
      message: "Nenhum servidor ICE válido foi retornado pelo provedor.",
    };
  }

  return {
    success: true,
    iceServers: normalizedIceServers,
    expiresAt: credentialExpiration.toISOString(),
  };
}
