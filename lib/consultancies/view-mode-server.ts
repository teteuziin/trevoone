import { cookies } from "next/headers";
import type { ConsultancyRole } from "./context";
import {
  VIEW_MODE_COOKIE_NAME,
  computeEffectiveViewModeFromCookie,
  type EffectiveViewModeState,
} from "./view-mode";

/**
 * Resolves effective presentation mode state server-side using next/headers cookies().
 * Validates requested cookie against current slug and allowed matrix.
 * Normalizes invalid or tampered cookies to default real presentation mode.
 */
export async function resolveEffectiveViewMode(
  slug: string,
  realRoles: ConsultancyRole[]
): Promise<EffectiveViewModeState> {
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(VIEW_MODE_COOKIE_NAME)?.value;
    return computeEffectiveViewModeFromCookie(slug, realRoles, cookieVal);
  } catch {
    return computeEffectiveViewModeFromCookie(slug, realRoles, null);
  }
}
