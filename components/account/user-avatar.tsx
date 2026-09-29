"use client";

import React, { useState } from "react";
import { computeInitials } from "@/lib/auth/user-identity";

export interface UserAvatarProps {
  fullName?: string;
  hasProfilePhoto?: boolean;
  avatarUrl?: string | null;
  userPublicId?: string | null;
  userId?: number | null;
  profilePhotoUpdatedAt?: Date | string | number | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  shape?: "circle" | "rounded";
  circular?: boolean;
  className?: string;
  alt?: string;
}

const sizeClasses: Record<
  NonNullable<UserAvatarProps["size"]>,
  { dimension: string; text: string; roundedDefault: string }
> = {
  xs: { dimension: "w-7 h-7", text: "text-[11px]", roundedDefault: "rounded-lg" },
  sm: { dimension: "w-8 h-8", text: "text-xs", roundedDefault: "rounded-xl" },
  md: { dimension: "w-10 h-10", text: "text-sm", roundedDefault: "rounded-xl" },
  lg: { dimension: "w-12 h-12", text: "text-base", roundedDefault: "rounded-2xl" },
  xl: { dimension: "w-16 h-16", text: "text-xl", roundedDefault: "rounded-2xl" },
  "2xl": { dimension: "w-24 h-24", text: "text-2xl", roundedDefault: "rounded-3xl" },
};

export function getInitials(name?: string): string {
  return computeInitials(name);
}

export function UserAvatar({
  fullName = "Usuário",
  hasProfilePhoto,
  avatarUrl,
  userPublicId,
  profilePhotoUpdatedAt,
  size = "md",
  shape = "circle",
  circular = true,
  className = "",
  alt,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(fullName);
  const sizeConfig = sizeClasses[size] || sizeClasses.md;

  const isCircle = shape === "circle" || circular !== false;
  const roundingClass = isCircle ? "rounded-full" : sizeConfig.roundedDefault;

  const versionParam = profilePhotoUpdatedAt
    ? typeof profilePhotoUpdatedAt === "number"
      ? profilePhotoUpdatedAt
      : new Date(profilePhotoUpdatedAt).getTime()
    : null;

  let photoSrc: string | null = null;
  if (!imageError) {
    if (avatarUrl) {
      photoSrc = avatarUrl;
    } else if (userPublicId && hasProfilePhoto !== false) {
      photoSrc = `/api/users/${userPublicId}/avatar${versionParam ? `?v=${versionParam}` : ""}`;
    } else if (hasProfilePhoto) {
      photoSrc = `/api/account/profile-photo${versionParam ? `?v=${versionParam}` : ""}`;
    }
  }

  const altText = alt || `Foto de perfil de ${fullName}`;

  return (
    <div
      className={`relative shrink-0 select-none overflow-hidden flex items-center justify-center font-bold bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] text-[var(--brand-foreground)] shadow-2xs ${sizeConfig.dimension} ${roundingClass} ${sizeConfig.text} ${className}`.trim()}
      aria-label={altText}
    >
      {photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoSrc}
          alt={altText}
          onError={() => setImageError(true)}
          className={`w-full h-full object-cover ${roundingClass}`}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
}
