"use server";

import { redirect } from "next/navigation";
import { revokeCurrentSession } from "@/lib/auth/session";

/**
 * Universal Server Action to terminate the current user session and redirect to /login.
 * Can be safely called from Client Components across any route segment.
 */
export async function defaultLogoutAction(): Promise<never> {
  await revokeCurrentSession();
  redirect("/login");
}
