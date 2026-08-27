import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getMyProfilePhotoBuffer } from "@/lib/account/user-profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return new NextResponse(null, { status: 401 });
  }

  const result = await getMyProfilePhotoBuffer(session.userId);
  if (!result.success || !result.buffer) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": result.mimeType || "image/jpeg",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
