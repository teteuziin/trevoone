import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { processConsultationReminders } from "@/lib/consultancies/consultation-reminders";

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
  const expectedSecret = process.env.CONSULTATION_REMINDERS_CRON_SECRET?.trim();
  if (!expectedSecret || expectedSecret.length === 0) {
    return NextResponse.json(
      { error: "CRON_SECRET_NOT_CONFIGURED" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  }

  const authHeader = req.headers.get("authorization");
  const customHeader = req.headers.get("x-cron-secret");

  if (!validateCronSecret(authHeader, customHeader)) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      {
        status: 401,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  }

  try {
    const result = await processConsultationReminders();

    return NextResponse.json(
      {
        success: true,
        processed: result.processed,
        created: result.created,
        skipped: result.skipped,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (err: unknown) {
    console.error("[Internal Consultation Reminders Route] Error:", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "METHOD_NOT_ALLOWED" },
    {
      status: 405,
      headers: {
        Allow: "POST",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
