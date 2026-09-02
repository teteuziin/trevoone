import { NextRequest, NextResponse } from "next/server";
import { evaluateOriginGuard, createOriginGuardResponse } from "@/lib/security/origin-guard";

/**
 * Next.js 16 global request interception proxy.
 * Evaluates inbound HTTP traffic against the Origin Guard policy.
 */
export function proxy(request: NextRequest): NextResponse | Response {
  const decision = evaluateOriginGuard(request);
  const response = createOriginGuardResponse(decision);
  if (response) {
    return response;
  }
  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|favicon.ico).*)",
  ],
};
