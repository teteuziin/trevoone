import { NextResponse } from "next/server";
import { getAppVersion } from "@/lib/version";

export const dynamic = "force-dynamic";

export async function GET() {
  const version = getAppVersion();

  return NextResponse.json(
    { version },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
