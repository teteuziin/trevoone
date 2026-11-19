"use server";

import { defaultLogoutAction } from "@/lib/auth/actions";

export async function logoutFromConsultancyArea(): Promise<never> {
  return defaultLogoutAction();
}

