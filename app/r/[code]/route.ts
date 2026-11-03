import { NextRequest, NextResponse } from "next/server";
import { resolveCampaignRedirect } from "@/lib/referrals/campaigns";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{
    code: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { code } = await params;

  if (!code || typeof code !== "string" || code.trim().length < 2) {
    const fallbackUrl = new URL("/login", request.url);
    fallbackUrl.searchParams.set("error", "invalid_referral");
    return NextResponse.redirect(fallbackUrl);
  }

  // Check if visitor already has an existing opaque attribution token
  const existingToken = request.cookies.get("trevo_ref_token")?.value;

  // Resolve campaign redirect strictly on server
  const resolution = await resolveCampaignRedirect(code, existingToken);

  if (resolution.status === "REDIRECT") {
    let targetUrl: URL;
    try {
      if (resolution.destinationUrl.startsWith("/")) {
        targetUrl = new URL(resolution.destinationUrl, request.url);
      } else {
        targetUrl = new URL(resolution.destinationUrl);
      }
    } catch {
      targetUrl = new URL(`/consultoria/${resolution.consultancySlug}`, request.url);
    }

    const response = NextResponse.redirect(targetUrl, 307);
    const isProd = process.env.NODE_ENV === "production";
    response.cookies.set("trevo_ref_token", resolution.attributionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30-day attribution window
    });

    return response;
  }

  if (resolution.status === "UNAVAILABLE") {
    const reasonLabels: Record<string, string> = {
      PAUSED: "Esta campanha está temporariamente pausada.",
      ENDED: "Esta campanha de divulgação já foi encerrada.",
      NOT_STARTED: "Esta campanha ainda não iniciou seu período de vigência.",
      LIMIT_REACHED: "O limite de utilizações desta campanha já foi atingido.",
    };

    const reasonText = reasonLabels[resolution.reason] || "Esta campanha não está disponível no momento.";

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Campanha Indisponível · ${resolution.consultancyName}</title>
  <style>
    :root {
      --bg: #090A0B;
      --card-bg: #151619;
      --border: #303238;
      --text: #F3F4F6;
      --subtext: #9CA3AF;
      --brand: #10B981;
      --brand-hover: #059669;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background-color: var(--card-bg); border: 1px solid var(--border); border-radius: 24px; padding: 32px 24px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.3); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 800; margin-bottom: 8px; color: #FFFFFF; }
    p { font-size: 13px; color: var(--subtext); line-height: 1.5; margin-bottom: 24px; }
    .campaign-title { font-size: 14px; font-weight: 600; color: #E5E7EB; margin-bottom: 16px; padding: 12px; border-radius: 12px; background: #1B1D21; border: 1px solid #2B2E35; }
    .btn { display: inline-block; width: 100%; padding: 14px 20px; border-radius: 14px; background: var(--brand); color: #FFFFFF; font-size: 13px; font-weight: 700; text-decoration: none; transition: background 0.2s; min-height: 44px; }
    .btn:hover { background: var(--brand-hover); }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Aviso de Campanha</div>
    <h1>${resolution.consultancyName}</h1>
    <div class="campaign-title">${resolution.campaignTitle}</div>
    <p>${reasonText}<br>Fique atento às próximas atualizações e novidades oficiais.</p>
    <a href="/consultoria/${resolution.consultancySlug}" class="btn">Ir para a página inicial</a>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Not found fallback
  const fallbackUrl = new URL("/login", request.url);
  fallbackUrl.searchParams.set("error", "referral_unavailable");
  return NextResponse.redirect(fallbackUrl);
}
