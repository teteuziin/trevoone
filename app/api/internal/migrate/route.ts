import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { ensureAiSchemaBootstrapped } from "@/lib/db/ai-schema-bootstrap";

export const dynamic = "force-dynamic";

function validateCronSecret(authHeader: string | null, customHeader: string | null): boolean {
  const expectedSecret = process.env.CONSULTATION_REMINDERS_CRON_SECRET?.trim();
  if (!expectedSecret || expectedSecret.length === 0) {
    return false;
  }

  let providedSecret = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    providedSecret = authHeader.slice(7).trim();
  } else if (customHeader) {
    providedSecret = customHeader.trim();
  }

  if (!providedSecret || providedSecret.length === 0) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedSecret, "utf8");
  const providedBuffer = Buffer.from(providedSecret, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization");
  const customHeader = req.headers.get("x-cron-secret");
  const isSecretValid = validateCronSecret(authHeader, customHeader);

  let isPlatformAdmin = false;
  if (!isSecretValid) {
    const session = await getCurrentSession();
    if (session) {
      const access = await getPlatformAdminAccess(session.userId);
      isPlatformAdmin = access.isPlatformAdmin;
    }
  }

  if (!isSecretValid && !isPlatformAdmin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    await ensureAiSchemaBootstrapped();
    return NextResponse.json({
      success: true,
      message: "AI schema and compatibility migrations bootstrapped successfully.",
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[InternalMigrate] Error:", err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return POST(req);
}
