import crypto from "node:crypto";
import net from "node:net";

const ALLOWED_PUSH_DOMAINS = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "push.services.mozilla.com",
  "updates.push.services.mozilla.com",
  "push.apple.com",
  "web.push.apple.com",
  "notify.windows.com",
  "wns.windows.com",
];

function isPrivateOrLocalHost(hostname: string): boolean {
  const clean = hostname.replace(/^\[|\]$/g, "").toLowerCase();

  // Localhost names
  if (
    clean === "localhost" ||
    clean === "localhost.localdomain" ||
    clean.endsWith(".localhost")
  ) {
    return true;
  }

  const ipType = net.isIP(clean);

  // IPv4 Literal
  if (ipType === 4) {
    const parts = clean.split(".").map(Number);
    // 127.0.0.0/8 (loopback) and 0.0.0.0/8 (unspecified)
    if (parts[0] === 127 || parts[0] === 0) return true;
    // 10.0.0.0/8 (private)
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 (private: 172.16.0.0 - 172.31.255.255)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 255.255.255.255 (broadcast)
    if (parts[0] === 255 && parts[1] === 255 && parts[2] === 255 && parts[3] === 255) return true;
    return false;
  }

  // IPv6 Literal
  if (ipType === 6) {
    // Loopback (::1) or Unspecified (::)
    if (
      clean === "::1" ||
      clean === "::" ||
      clean === "0:0:0:0:0:0:0:1" ||
      clean === "0:0:0:0:0:0:0:0"
    ) {
      return true;
    }
    // IPv4-mapped IPv6
    if (clean.startsWith("::ffff:")) return true;

    // Range checks based on first 16-bit hextet
    const firstHextet = parseInt(clean.split(":")[0], 16);
    if (!isNaN(firstHextet)) {
      // fc00::/7 (Unique Local: fc00:: to fdff::)
      if (firstHextet >= 0xfc00 && firstHextet <= 0xfdff) return true;
      // fe80::/10 (Link-Local: fe80:: to febf::)
      if (firstHextet >= 0xfe80 && firstHextet <= 0xfebf) return true;
    }
    return false;
  }

  // DNS Hostname (not an IP literal)
  return false;
}

/**
 * Validates that an endpoint URL belongs strictly to a standard browser Web Push service
 * and does not represent an internal SSRF or arbitrary proxy destination.
 */
export function isValidWebPushEndpoint(endpointStr: string): boolean {
  if (!endpointStr || typeof endpointStr !== "string") {
    return false;
  }

  // Reasonable length bounds
  if (endpointStr.length < 10 || endpointStr.length > 2048) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(endpointStr);
  } catch {
    return false;
  }

  // Strict HTTPS protocol
  if (url.protocol !== "https:") {
    return false;
  }

  // Reject URL credentials
  if (url.username || url.password) {
    return false;
  }

  // Reject non-standard ports (Web Push endpoints operate on standard 443 HTTPS)
  if (url.port && url.port !== "443") {
    return false;
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();

  // Reject local and private IP targets
  if (isPrivateOrLocalHost(hostname)) {
    return false;
  }

  // Verify hostname matches known legitimate Web Push provider domain suffix
  const isAllowedPushProvider = ALLOWED_PUSH_DOMAINS.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  );

  return isAllowedPushProvider;
}

/**
 * Computes deterministic SHA-256 fingerprint for a Web Push endpoint.
 */
export function computeEndpointFingerprint(endpoint: string): string {
  return crypto.createHash("sha256").update(endpoint.trim()).digest("hex");
}
