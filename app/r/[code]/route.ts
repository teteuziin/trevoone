import { NextRequest, NextResponse } from "next/server";
import { createAnonymousReferralAttribution } from "@/lib/referrals/service";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{
    code: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { code } = await params;

  if (!code || typeof code !== "string" || code.trim().length < 3) {
    const fallbackUrl = new URL("/login", request.url);
    fallbackUrl.searchParams.set("error", "invalid_referral");
    return NextResponse.redirect(fallbackUrl);
  }

  // Check if visitor already has an existing opaque attribution token
  const existingToken = request.cookies.get("trevo_ref_token")?.value;

  // Server-side validation and anonymous first-touch attribution creation
  // FIRST VALID REFERRAL WINS: existing valid token is preserved
  const result = await createAnonymousReferralAttribution(code, existingToken);

  if (!result.valid || !result.consultancySlug || !result.token) {
    const fallbackUrl = new URL("/login", request.url);
    fallbackUrl.searchParams.set("error", "referral_unavailable");
    return NextResponse.redirect(fallbackUrl);
  }

  const targetUrl = new URL(`/consultoria/${result.consultancySlug}`, request.url);
  const response = NextResponse.redirect(targetUrl);

  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set("trevo_ref_token", result.token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30-day attribution window
  });

  return response;
}
