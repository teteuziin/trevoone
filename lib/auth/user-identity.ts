/**
 * TREVO ONE — Centralized User Identity & Avatar Resolution
 * Guarantees 100% consistency across Sidebar, Mobile Drawer, and Welcome Overlay.
 */

export interface UserIdentityInput {
  fullName?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  email?: string | null;
  userPublicId?: string | null;
  avatarUrl?: string | null;
  hasProfilePhoto?: boolean | null;
}

export interface ResolvedUserIdentity {
  fullName: string;
  firstName: string;
  email: string | null;
  userPublicId: string | null;
  avatarUrl: string | null;
  hasProfilePhoto: boolean;
  initials: string;
}

/**
 * Computes initials following the Trevo One specification:
 * - 2 or more words: First letter of first word + First letter of last word (e.g. "Anny Santos" -> "AS")
 * - 1 word: First letter of that word (e.g. "Matheus" -> "M")
 * - Fallback: "U"
 */
export function computeInitials(name?: string | null): string {
  if (!name || typeof name !== "string") return "U";

  // If email was passed as name, strip domain
  const clean = name.includes("@") ? name.split("@")[0] : name;
  const trimmed = clean.trim();
  if (!trimmed) return "U";

  // Split by whitespace
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  const firstLetter = parts[0].charAt(0).toUpperCase();
  const lastLetter = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstLetter}${lastLetter}`;
}

/**
 * Extracts a friendly first name for greetings (e.g. "Olá, {primeiroNome}"):
 * - "Anny Santos" -> "Anny"
 * - "Matheus Silva" -> "Matheus"
 * - "anny.santos@email.com" -> "Anny"
 * - null / empty -> "Usuário"
 */
export function extractFirstName(
  fullName?: string | null,
  displayName?: string | null,
  firstName?: string | null,
  email?: string | null
): string {
  if (firstName && typeof firstName === "string" && firstName.trim()) {
    return firstName.trim();
  }

  if (displayName && typeof displayName === "string" && displayName.trim()) {
    const firstWord = displayName.trim().split(/\s+/)[0];
    if (firstWord) return firstWord;
  }

  if (fullName && typeof fullName === "string" && fullName.trim()) {
    const firstWord = fullName.trim().split(/\s+/)[0];
    if (firstWord) return firstWord;
  }

  if (email && typeof email === "string" && email.trim()) {
    const prefix = email.trim().split("@")[0] || "";
    // Handle "first.last", "first_last", "first-last"
    const firstSegment = prefix.split(/[._-]/)[0] || "";
    if (firstSegment.length > 0) {
      return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1).toLowerCase();
    }
  }

  return "Usuário";
}

/**
 * Resolves user identity based on prioritized data sources:
 * Priority for name:
 * 1. full_name
 * 2. display_name
 * 3. first_name
 * 4. email
 * 5. "Usuário"
 */
export function resolveUserIdentity(input?: UserIdentityInput | null): ResolvedUserIdentity {
  const fullNameRaw = input?.fullName?.trim() || null;
  const displayNameRaw = input?.displayName?.trim() || null;
  const firstNameRaw = input?.firstName?.trim() || null;
  const emailRaw = input?.email?.trim() || null;
  const userPublicId = input?.userPublicId?.trim() || null;
  const avatarUrl = input?.avatarUrl?.trim() || null;

  // 1. Resolve full name
  let resolvedFullName = "Usuário";
  if (fullNameRaw) {
    resolvedFullName = fullNameRaw;
  } else if (displayNameRaw) {
    resolvedFullName = displayNameRaw;
  } else if (firstNameRaw) {
    resolvedFullName = firstNameRaw;
  } else if (emailRaw) {
    resolvedFullName = emailRaw;
  }

  // 2. Resolve friendly first name
  const resolvedFirstName = extractFirstName(
    fullNameRaw,
    displayNameRaw,
    firstNameRaw,
    emailRaw
  );

  // 3. Compute initials
  const initials = computeInitials(
    fullNameRaw || displayNameRaw || firstNameRaw || resolvedFullName
  );

  // 4. Photo presence flag (defaults to true if userPublicId is provided so UserAvatar queries /api/users/[id]/avatar)
  const hasProfilePhoto = input?.hasProfilePhoto ?? (userPublicId !== null || avatarUrl !== null);

  return {
    fullName: resolvedFullName,
    firstName: resolvedFirstName,
    email: emailRaw,
    userPublicId,
    avatarUrl,
    hasProfilePhoto,
    initials,
  };
}
