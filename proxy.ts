import { NextRequest, NextResponse } from "next/server";
import { evaluateOriginGuard, createOriginGuardResponse } from "@/lib/security/origin-guard";

/**
 * Next.js 16 global request interception proxy.
 * Evaluates inbound HTTP traffic against the Origin Guard policy.
 */
export function proxy(request: NextRequest): NextResponse | Response {
  // 1. Evaluate Origin Guard first: all non-allowlisted routes require valid origin proof under enforce.
  const decision = evaluateOriginGuard(request);
  const response = createOriginGuardResponse(decision);
  if (response) {
    return response;
  }

  // 2. Handle canonical www -> apex redirect AFTER origin guard allows the request.
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim().split(":")[0].toLowerCase();
  const hostHeader = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  const nextHost = request.nextUrl.hostname.toLowerCase();
  if (forwardedHost === "www.trevoone.com" || hostHeader === "www.trevoone.com" || nextHost === "www.trevoone.com") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.protocol = "https:";
    redirectUrl.host = "trevoone.com";
    redirectUrl.port = "";
    return NextResponse.redirect(redirectUrl, 308);
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|favicon.ico|trevo-one-logo\\.png|icons/|consultancies/[^/]+/logo\\.png).*)",
  ],
};
