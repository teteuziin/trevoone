import crypto from "node:crypto";

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

export interface TemporaryTurnCredential {
  username: string;
  credential: string;
  expiresAt: string;
}

export interface TurnRuntimeConfig {
  host: string;
  sharedSecret: string;
  realm: string;
}

const DEFAULT_STUN_TURN_PORT = 3478;
const DEFAULT_TURNS_TLS_PORT = 5349;

/**
 * Validates that a host is a valid hostname or IPv4 string without schemes, ports, paths, or query fragments.
 */
export function validateTurnHost(host: string): boolean {
  if (!host || typeof host !== "string") return false;
  const trimmed = host.trim();
  if (!trimmed) return false;

  // Disallow schemes, ports, paths, query params, fragments, auth symbols, or whitespace
  if (
    trimmed.includes("/") ||
    trimmed.includes("?") ||
    trimmed.includes("#") ||
    trimmed.includes(":") ||
    trimmed.includes("@") ||
    trimmed.includes("\\") ||
    /\s/.test(trimmed)
  ) {
    return false;
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("http:") ||
    lower.startsWith("https:") ||
    lower.startsWith("stun:") ||
    lower.startsWith("stuns:") ||
    lower.startsWith("turn:") ||
    lower.startsWith("turns:") ||
    lower.startsWith("javascript:")
  ) {
    return false;
  }

  // IPv4 format check (4 octets 0-255)
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Regex.test(trimmed)) {
    return true;
  }

  // Domain/hostname check (RFC 1123)
  const hostnameRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  if (hostnameRegex.test(trimmed) && trimmed.length <= 253) {
    return true;
  }

  return false;
}

/**
 * Validates the TURN realm string.
 */
export function validateTurnRealm(realm: string): boolean {
  if (!realm || typeof realm !== "string") return false;
  const trimmed = realm.trim();
  return trimmed.length > 0 && trimmed.length <= 255 && !/\s/.test(trimmed);
}

/**
 * Validates the TURN shared secret.
 */
export function validateTurnSecret(secret: string): boolean {
  if (!secret || typeof secret !== "string") return false;
  const trimmed = secret.trim();
  return trimmed.length > 0;
}

/**
 * Generates temporary HMAC-SHA1 TURN REST API credentials for Coturn.
 * Username format: `<expirationEpochSeconds>:trevo-<consultationPublicId>`
 * Password/Credential format: `Base64(HMAC-SHA1(key = TURN_SHARED_SECRET, data = username))`
 */
export function generateTurnRestCredentials(
  consultationPublicId: string,
  scheduledEndAt: Date,
  sharedSecret: string,
  serverNow: Date = new Date()
):
  | { success: true; credentials: TemporaryTurnCredential }
  | { success: false; error: string; message: string } {
  // Server-authoritative expiration: scheduledEndAt + 30 minutes
  const credentialExpiration = new Date(scheduledEndAt.getTime() + 30 * 60 * 1000);
  const expirationEpochSeconds = Math.floor(credentialExpiration.getTime() / 1000);
  const currentEpochSeconds = Math.floor(serverNow.getTime() / 1000);

  if (expirationEpochSeconds <= currentEpochSeconds) {
    return {
      success: false,
      error: "JOIN_WINDOW_CLOSED",
      message: "Janela de atendimento da consulta expirada.",
    };
  }

  // Opaque technical user ID without PII
  const opaqueUserId = `trevo-${consultationPublicId}`;
  const username = `${expirationEpochSeconds}:${opaqueUserId}`;

  // Standard Coturn TURN REST API HMAC-SHA1 signature
  const credential = crypto
    .createHmac("sha1", sharedSecret)
    .update(username)
    .digest("base64");

  return {
    success: true,
    credentials: {
      username,
      credential,
      expiresAt: credentialExpiration.toISOString(),
    },
  };
}

/**
 * Builds standard WebRTC RTCIceServer array for self-hosted Coturn.
 */
export function buildIceServers(
  host: string,
  username: string,
  credential: string
): RtcIceServerDto[] {
  return [
    {
      urls: [`stun:${host}:${DEFAULT_STUN_TURN_PORT}`],
    },
    {
      urls: [
        `turn:${host}:${DEFAULT_STUN_TURN_PORT}?transport=udp`,
        `turn:${host}:${DEFAULT_STUN_TURN_PORT}?transport=tcp`,
        `turns:${host}:${DEFAULT_TURNS_TLS_PORT}?transport=tcp`,
      ],
      username,
      credential,
    },
  ];
}

/**
 * Server-side helper to create temporary TURN credentials and construct ICE servers array locally.
 * Zero external HTTP requests are made.
 * Secrets are never exposed to the client.
 */
export async function fetchTemporaryIceServers(
  consultationPublicId: string,
  scheduledEndAt: Date,
  serverNow: Date = new Date(),
  overrideConfig?: Partial<TurnRuntimeConfig>
): Promise<TurnConfigResult> {
  const host = (overrideConfig?.host ?? process.env.TURN_SERVER_HOST)?.trim();
  const sharedSecret = (overrideConfig?.sharedSecret ?? process.env.TURN_SHARED_SECRET)?.trim();
  const realm = (overrideConfig?.realm ?? process.env.TURN_REALM)?.trim();

  if (!host || !sharedSecret || !realm) {
    return {
      success: false,
      error: "TURN_NOT_CONFIGURED",
      message: "Serviço de retransmissão de vídeo não configurado.",
    };
  }

  if (!validateTurnHost(host)) {
    return {
      success: false,
      error: "TURN_CONFIG_INVALID",
      message: "Configuração do servidor TURN inválida.",
    };
  }

  if (!validateTurnRealm(realm) || !validateTurnSecret(sharedSecret)) {
    return {
      success: false,
      error: "TURN_CONFIG_INVALID",
      message: "Configuração TURN inválida.",
    };
  }

  const credResult = generateTurnRestCredentials(
    consultationPublicId,
    scheduledEndAt,
    sharedSecret,
    serverNow
  );

  if (!credResult.success) {
    return {
      success: false,
      error: credResult.error,
      message: credResult.message,
    };
  }

  const iceServers = buildIceServers(
    host,
    credResult.credentials.username,
    credResult.credentials.credential
  );

  return {
    success: true,
    iceServers,
    expiresAt: credResult.credentials.expiresAt,
  };
}
