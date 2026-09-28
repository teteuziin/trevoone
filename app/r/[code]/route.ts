import { NextRequest, NextResponse } from "next/server";
import { validateReferralCode } from "@/lib/referrals/service";

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

  const validation = await validateReferralCode(code);

  if (!validation.valid || !validation.consultancySlug || !validation.consultancyId) {
    const fallbackUrl = new URL("/login", request.url);
    fallbackUrl.searchParams.set("error", "referral_unavailable");
    return NextResponse.redirect(fallbackUrl);
  }

  const consultancySlug = validation.consultancySlug;
  const consultancyId = validation.consultancyId;
  const cookieName = `trevo_ref_${consultancyId}`;

  // First-touch attribution rule: check if user already has a valid attribution cookie for this consultancy
  const existingCookie = request.cookies.get(cookieName)?.value;

  const targetUrl = new URL(`/consultoria/${consultancySlug}`, request.url);
  const response = NextResponse.redirect(targetUrl);

  if (!existingCookie) {
    const payload = JSON.stringify({
      code: validation.code,
      codeId: validation.codeId,
      referrerMemberId: validation.referrerMemberId,
      consultancyId,
      timestamp: Date.now(),
    });

    const isProd = process.env.NODE_ENV === "production";
    response.cookies.set(cookieName, payload, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30-day attribution window
    });
  }

  return response;
}
