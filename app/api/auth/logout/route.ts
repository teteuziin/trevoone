import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { revokeCurrentSession } from "@/lib/auth/session";
import { validateSameOrigin } from "@/lib/security/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const originValidation = validateSameOrigin(request);
  if (!originValidation.allowed) {
    return new NextResponse(
      JSON.stringify({ error: originValidation.error || "Requisição bloqueada por política de mesma origem (CSRF)." }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  await revokeCurrentSession();
  redirect("/login");
}

export async function GET() {
  return new NextResponse(
    JSON.stringify({ error: "Método não permitido. O encerramento de sessão requer requisição POST segura." }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        Allow: "POST",
      },
    }
  );
}
