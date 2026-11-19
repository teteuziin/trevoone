"use server";

import { defaultLogoutAction } from "@/lib/auth/actions";

export async function logoutFromPlatformAdminArea(): Promise<never> {
  return defaultLogoutAction();
}
