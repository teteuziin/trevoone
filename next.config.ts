import type { NextConfig } from "next";
import { execSync } from "node:child_process";

function resolveDeploymentId(): string | undefined {
  if (process.env.DEPLOYMENT_ID && process.env.DEPLOYMENT_ID.trim()) {
    return process.env.DEPLOYMENT_ID.trim();
  }
  if (process.env.GIT_COMMIT_SHA && process.env.GIT_COMMIT_SHA.trim()) {
    return process.env.GIT_COMMIT_SHA.trim();
  }
  try {
    const sha = execSync("git rev-parse HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (sha && sha.trim().length >= 7) {
      return sha.trim().slice(0, 16);
    }
  } catch {
    // Non-blocking fallback if git binary is unavailable in production runtime
  }
  return undefined;
}

const deploymentId = resolveDeploymentId();

const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Content-Security-Policy",
    value: cspHeader,
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(deploymentId ? { deploymentId } : {}),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
