"use server";

import { redirect } from "next/navigation";
import { revokeCurrentSession } from "../../lib/auth/session";

export async function logoutFromConsultancyArea(): Promise<never> {
  await revokeCurrentSession();
  redirect("/login");
}
