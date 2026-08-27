"use client";

import React, { useState } from "react";

export interface UserAvatarProps {
  fullName?: string;
  hasProfilePhoto?: boolean;
  profilePhotoUpdatedAt?: Date | string | number | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  alt?: string;
}

const sizeClasses: Record<NonNullable<UserAvatarProps["size"]>, { container: string; text: string }> = {
  xs: { container: "w-7 h-7 rounded-lg", text: "text-[11px]" },
  sm: { container: "w-8 h-8 rounded-xl", text: "text-xs" },
  md: { container: "w-10 h-10 rounded-xl", text: "text-sm" },
  lg: { container: "w-12 h-12 rounded-2xl", text: "text-base" },
  xl: { container: "w-16 h-16 rounded-2xl", text: "text-xl" },
  "2xl": { container: "w-24 h-24 rounded-3xl", text: "text-2xl" },
};

export function getInitials(name?: string): string {
  if (!name || typeof name !== "string") return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function UserAvatar({
  fullName = "Usuário",
  hasProfilePhoto = false,
  profilePhotoUpdatedAt,
  size = "md",
  className = "",
  alt,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(fullName);
  const sizeConfig = sizeClasses[size] || sizeClasses.md;

  const versionParam = profilePhotoUpdatedAt
    ? typeof profilePhotoUpdatedAt === "number"
      ? profilePhotoUpdatedAt
      : new Date(profilePhotoUpdatedAt).getTime()
    : null;

  const photoSrc = hasProfilePhoto && !imageError
    ? `/api/account/profile-photo${versionParam ? `?v=${versionParam}` : ""}`
    : null;

  const altText = alt || `Foto de perfil de ${fullName}`;

  return (
    <div
      className={`relative shrink-0 select-none overflow-hidden flex items-center justify-center font-bold bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] text-[var(--brand-foreground)] shadow-2xs ${sizeConfig.container} ${sizeConfig.text} ${className}`.trim()}
      aria-label={altText}
    >
      {photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoSrc}
          alt={altText}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
}
