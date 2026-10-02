/**
 * Application Version Management
 *
 * Provides build-time and runtime application version resolution.
 * Used for client-server update detection and cache coordination.
 */

export function getAppVersion(): string {
  // 1. Next.js inlined public env variable (available on client & server)
  if (
    process.env.NEXT_PUBLIC_APP_VERSION &&
    process.env.NEXT_PUBLIC_APP_VERSION.trim()
  ) {
    return process.env.NEXT_PUBLIC_APP_VERSION.trim();
  }

  // 2. Server-side deployment ID if present
  if (process.env.DEPLOYMENT_ID && process.env.DEPLOYMENT_ID.trim()) {
    return process.env.DEPLOYMENT_ID.trim();
  }

  // 3. Fallback Git commit SHA if passed via environment
  if (process.env.GIT_COMMIT_SHA && process.env.GIT_COMMIT_SHA.trim()) {
    return process.env.GIT_COMMIT_SHA.trim().slice(0, 16);
  }

  return "0.1.0";
}
