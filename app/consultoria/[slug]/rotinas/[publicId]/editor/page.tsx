import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    slug: string;
    publicId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * TREVO ONE — COMPATIBILITY ROUTE
 * Redirects legacy /rotinas/[publicId]/editor directly to /rotinas/[publicId]
 * preventing 404 errors for any cached or bookmarked links.
 */
export default async function LegacyWorkoutEditorRedirectPage({
  params,
  searchParams,
}: PageProps) {
  const { slug, publicId } = await params;
  const search = await searchParams;
  const queryString = new URLSearchParams();

  for (const [key, val] of Object.entries(search)) {
    if (typeof val === "string") {
      queryString.set(key, val);
    } else if (Array.isArray(val)) {
      for (const v of val) queryString.append(key, v);
    }
  }

  const qs = queryString.toString();
  redirect(`/consultoria/${slug}/rotinas/${publicId}${qs ? `?${qs}` : ""}`);
}
