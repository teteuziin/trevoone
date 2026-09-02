import crypto from "node:crypto";

export const ORIGIN_GUARD_HEADER_NAME = "x-trevo-origin-verify";

export type OriginGuardMode = "disabled" | "observe" | "enforce";

export type OriginGuardDecision =
  | {
      allowed: true;
      mode: OriginGuardMode;
      configValid?: boolean;
      headerPresent?: boolean;
      headerValid?: boolean;
    }
  | {
      allowed: false;
      status: 403 | 503;
      reason: "MISSING_HEADER" | "INVALID_HEADER" | "INVALID_CONFIG" | "INVALID_MODE";
      mode: string;
    };

/**
 * Validates that a secret conforms to the required specification:
 * Exactly 32 cryptographically random bytes encoded as 64 hexadecimal characters.
 */
export function isValidOriginGuardSecret(secret: unknown): secret is string {
  if (typeof secret !== "string") {
    return false;
  }
  const trimmed = secret.trim();
  return trimmed.length === 64 && /^[0-9a-fA-F]{64}$/.test(trimmed);
}

/**
 * Performs a constant-time comparison between the expected secret and the provided header value.
 * Uses SHA-256 digests on both inputs before timingSafeEqual to avoid variable-length comparisons.
 */
export function verifyOriginHeader(
  providedHeader: string | null | undefined,
  expectedSecret: string
): boolean {
  if (!providedHeader || typeof providedHeader !== "string") {
    return false;
  }
  const trimmedHeader = providedHeader.trim();
  if (trimmedHeader.length === 0) {
    return false;
  }

  const expectedDigest = crypto
    .createHash("sha256")
    .update(expectedSecret.trim(), "utf8")
    .digest();
  const providedDigest = crypto
    .createHash("sha256")
    .update(trimmedHeader, "utf8")
    .digest();

  return crypto.timingSafeEqual(expectedDigest, providedDigest);
}

/**
 * Parses and normalizes the ORIGIN_GUARD_MODE environment setting.
 * Empty or undefined defaults to 'disabled'.
 * Unsupported non-empty modes return valid=false to prevent silent fail-open.
 */
export function parseOriginGuardMode(rawMode: string | undefined): {
  valid: boolean;
  mode: OriginGuardMode;
} {
  if (!rawMode || rawMode.trim().length === 0) {
    return { valid: true, mode: "disabled" };
  }

  const normalized = rawMode.trim().toLowerCase();
  if (normalized === "disabled" || normalized === "observe" || normalized === "enforce") {
    return { valid: true, mode: normalized as OriginGuardMode };
  }

  return { valid: false, mode: normalized as OriginGuardMode };
}

/**
 * Evaluates the incoming request against the Origin Guard policy.
 * Supports optional env overrides for deterministic local testing.
 */
export function evaluateOriginGuard(
  request: Request,
  envOverride?: { mode?: string; secret?: string }
): OriginGuardDecision {
  const rawMode = envOverride ? envOverride.mode : process.env.ORIGIN_GUARD_MODE;
  const rawSecret = envOverride ? envOverride.secret : process.env.ORIGIN_GUARD_SECRET;

  const parsedMode = parseOriginGuardMode(rawMode);
  if (!parsedMode.valid) {
    return {
      allowed: false,
      status: 503,
      reason: "INVALID_MODE",
      mode: rawMode || "unknown",
    };
  }

  const mode = parsedMode.mode;

  if (mode === "disabled") {
    return { allowed: true, mode: "disabled" };
  }

  const secretValid = isValidOriginGuardSecret(rawSecret);
  const providedHeader = request.headers.get(ORIGIN_GUARD_HEADER_NAME);
  const headerPresent = Boolean(providedHeader && providedHeader.trim().length > 0);
  const headerValid = secretValid && verifyOriginHeader(providedHeader, rawSecret!);

  if (mode === "observe") {
    const method = request.method || "UNKNOWN";
    let pathname = "UNKNOWN";
    try {
      pathname = new URL(request.url).pathname;
    } catch {
      // Fallback if URL parsing fails
    }
    const rayId = request.headers.get("cf-ray") || request.headers.get("x-ray-id");

    console.info(
      `[Origin Guard] observe: method=${method} path=${pathname} header_present=${headerPresent} header_valid=${headerValid} config_valid=${secretValid}${rayId ? ` ray=${rayId}` : ""}`
    );

    return {
      allowed: true,
      mode: "observe",
      configValid: secretValid,
      headerPresent,
      headerValid,
    };
  }

  // enforce mode
  if (!secretValid) {
    return {
      allowed: false,
      status: 503,
      reason: "INVALID_CONFIG",
      mode: "enforce",
    };
  }

  if (!headerPresent) {
    return {
      allowed: false,
      status: 403,
      reason: "MISSING_HEADER",
      mode: "enforce",
    };
  }

  if (!headerValid) {
    return {
      allowed: false,
      status: 403,
      reason: "INVALID_HEADER",
      mode: "enforce",
    };
  }

  return { allowed: true, mode: "enforce" };
}

/**
 * Creates an appropriate HTTP response for denied or misconfigured origin guard decisions.
 * Returns null if the request is allowed, permitting normal Next.js pipeline execution.
 */
export function createOriginGuardResponse(
  decision: OriginGuardDecision
): Response | null {
  if (decision.allowed) {
    return null;
  }

  if (decision.status === 403) {
    return new Response("Forbidden\n", {
      status: 403,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  return new Response("Service Unavailable\n", {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
