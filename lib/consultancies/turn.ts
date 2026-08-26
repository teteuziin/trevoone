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

interface MeteredCreateCredentialResponse {
  username?: string;
  password?: string;
  credential?: string;
  apiKey?: string;
  expiryInSeconds?: number;
  [key: string]: unknown;
}

interface MeteredRawIceServer {
  urls?: string | string[];
  url?: string;
  username?: string;
  credential?: string;
  password?: string;
  [key: string]: unknown;
}

const ALLOWED_SCHEMES = ["stun:", "stuns:", "turn:", "turns:"];
const MAX_ICE_SERVERS = 32;
const PROVIDER_TIMEOUT_MS = 6000;

function validateDomain(domain: string): boolean {
  if (!domain || typeof domain !== "string") return false;
  // Domain must be a valid hostname (e.g. abc.metered.live), no slashes, no protocols
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return domainRegex.test(domain);
}

function validateRegion(region: string): boolean {
  if (!region || typeof region !== "string") return false;
  const regionRegex = /^[a-zA-Z0-9-_]{1,32}$/;
  return regionRegex.test(region);
}

function sanitizeIceUrl(rawUrl: string): string | null {
  if (typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  const lower = trimmed.toLowerCase();
  const hasAllowedScheme = ALLOWED_SCHEMES.some((s) => lower.startsWith(s));
  if (!hasAllowedScheme) {
    return null;
  }
  return trimmed;
}

function normalizeIceServers(rawList: unknown): RtcIceServerDto[] | null {
  if (!Array.isArray(rawList)) {
    return null;
  }

  const normalized: RtcIceServerDto[] = [];

  for (const item of rawList.slice(0, MAX_ICE_SERVERS)) {
    if (!item || typeof item !== "object") continue;
    const entry = item as MeteredRawIceServer;

    const urls: string[] = [];
    if (typeof entry.urls === "string") {
      const sanitized = sanitizeIceUrl(entry.urls);
      if (sanitized) urls.push(sanitized);
    } else if (Array.isArray(entry.urls)) {
      for (const u of entry.urls) {
        if (typeof u === "string") {
          const sanitized = sanitizeIceUrl(u);
          if (sanitized) urls.push(sanitized);
        }
      }
    } else if (typeof entry.url === "string") {
      const sanitized = sanitizeIceUrl(entry.url);
      if (sanitized) urls.push(sanitized);
    }

    if (urls.length === 0) continue;

    const username = typeof entry.username === "string" && entry.username.trim() ? entry.username.trim() : undefined;
    const credential =
      typeof entry.credential === "string" && entry.credential.trim()
        ? entry.credential.trim()
        : typeof entry.password === "string" && entry.password.trim()
        ? entry.password.trim()
        : undefined;

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
 * Server-side helper to create a temporary TURN credential and retrieve ICE servers from Metered.
 * Secrets and provider API keys are never leaked to the caller or logged.
 */
export async function fetchTemporaryIceServers(
  consultationPublicId: string,
  scheduledEndAt: Date,
  serverNow: Date = new Date(),
  customFetch?: typeof fetch
): Promise<TurnConfigResult> {
  const domain = process.env.METERED_TURN_DOMAIN?.trim();
  const secretKey = process.env.METERED_TURN_SECRET_KEY?.trim();
  const region = (process.env.METERED_TURN_REGION || "global").trim();

  if (!domain || !secretKey) {
    return {
      success: false,
      error: "TURN_PROVIDER_NOT_CONFIGURED",
      message: "Serviço de retransmissão de vídeo não configurado.",
    };
  }

  if (!validateDomain(domain)) {
    return {
      success: false,
      error: "TURN_CONFIG_INVALID",
      message: "Configuração do domínio TURN inválida.",
    };
  }

  if (!validateRegion(region)) {
    return {
      success: false,
      error: "TURN_CONFIG_INVALID",
      message: "Configuração de região TURN inválida.",
    };
  }

  // Calculate remaining window: scheduledEndAt + 30 minutes
  const credentialExpiration = new Date(scheduledEndAt.getTime() + 30 * 60 * 1000);
  const remainingSeconds = Math.floor((credentialExpiration.getTime() - serverNow.getTime()) / 1000);

  if (remainingSeconds <= 0) {
    return {
      success: false,
      error: "JOIN_WINDOW_CLOSED",
      message: "Janela de atendimento da consulta expirada.",
    };
  }

  // Cap TTL to a safe maximum (e.g. 86400s / 24h) and minimum 60s
  const expiryInSeconds = Math.max(60, Math.min(remainingSeconds, 86400));
  const safeLabel = `trevo-consultation-${consultationPublicId.slice(0, 8)}`;

  const activeFetch = customFetch || fetch;

  // Step 1: Create temporary credential on Metered
  let createRes: Response;
  const createController = new AbortController();
  const createTimer = setTimeout(() => createController.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const createUrl = new URL(`https://${domain}/api/v1/turn/credential`);
    createUrl.searchParams.set("secretKey", secretKey);

    createRes = await activeFetch(createUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expiryInSeconds,
        label: safeLabel,
      }),
      cache: "no-store",
      signal: createController.signal,
    });
  } catch {
    return {
      success: false,
      error: "TURN_PROVIDER_UNAVAILABLE",
      message: "Falha de comunicação ao gerar credencial temporária.",
    };
  } finally {
    clearTimeout(createTimer);
  }

  if (!createRes.ok) {
    return {
      success: false,
      error: "TURN_PROVIDER_UNAVAILABLE",
      message: "Provedor TURN indisponível no momento.",
    };
  }

  let createData: MeteredCreateCredentialResponse;
  try {
    createData = (await createRes.json()) as MeteredCreateCredentialResponse;
  } catch {
    return {
      success: false,
      error: "TURN_CONFIG_INVALID",
      message: "Resposta inválida do provedor TURN.",
    };
  }

  if (!createData.apiKey || typeof createData.apiKey !== "string") {
    return {
      success: false,
      error: "TURN_CONFIG_INVALID",
      message: "Credencial temporária não retornou chave de acesso válida.",
    };
  }

  // Step 2: Retrieve ICE servers array using credential-scoped apiKey
  let iceRes: Response;
  const iceController = new AbortController();
  const iceTimer = setTimeout(() => iceController.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const getIceUrl = new URL(`https://${domain}/api/v1/turn/credentials`);
    getIceUrl.searchParams.set("apiKey", createData.apiKey);
    if (region && region !== "global") {
      getIceUrl.searchParams.set("region", region);
    }

    iceRes = await activeFetch(getIceUrl.toString(), {
      method: "GET",
      cache: "no-store",
      signal: iceController.signal,
    });
  } catch {
    return {
      success: false,
      error: "TURN_PROVIDER_UNAVAILABLE",
      message: "Falha ao obter lista de servidores ICE temporários.",
    };
  } finally {
    clearTimeout(iceTimer);
  }

  if (!iceRes.ok) {
    return {
      success: false,
      error: "TURN_PROVIDER_UNAVAILABLE",
      message: "Não foi possível carregar os servidores de mídia.",
    };
  }

  let rawIceList: unknown;
  try {
    rawIceList = await iceRes.json();
  } catch {
    return {
      success: false,
      error: "TURN_CONFIG_INVALID",
      message: "Formato de lista ICE inválido retornado pelo provedor.",
    };
  }

  const normalizedIceServers = normalizeIceServers(rawIceList);
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
