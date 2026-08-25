"use client";

import React, { useState } from "react";
import { performPushCleanup } from "@/components/notifications/notification-bell";
import { clearAllAuthenticatedOfflineData } from "@/lib/offline/offline-storage";

export interface LogoutButtonProps {
  logoutAction: () => Promise<void> | void;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  primary:
    "bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] text-white shadow-xs focus-visible:outline-[var(--brand)]",
  secondary:
    "bg-[var(--surface)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-active)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-xs focus-visible:outline-[var(--brand)]",
  ghost:
    "bg-transparent hover:bg-[var(--surface-hover)] active:bg-[var(--surface-active)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-[var(--brand)]",
  danger:
    "bg-[var(--danger)] hover:bg-[var(--danger-hover)] text-white shadow-xs focus-visible:outline-[var(--danger)]",
  outline:
    "bg-transparent hover:bg-[var(--brand-soft)] text-[var(--brand-foreground)] border border-[var(--brand-soft-border)] focus-visible:outline-[var(--brand)]",
};

const sizeStyles: Record<string, string> = {
  sm: "h-8.5 px-3 text-xs font-semibold gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm font-semibold gap-2 rounded-lg",
  lg: "h-11.5 px-5 text-base font-semibold gap-2.5 rounded-xl",
};

/**
 * LogoutButton — Client Component that executes secure logout.
 * 1. Best-effort push notification subscription unregister.
 * 2. Purges all authenticated offline snapshots and active context from IndexedDB.
 * 3. Dispatches server action to revoke session and delete auth cookies.
 */
export function LogoutButton({
  logoutAction,
  className = "",
  variant,
  size,
  fullWidth = false,
  children,
}: LogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogoutSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await performPushCleanup();
    } catch {
      // Best-effort
    }

    try {
      await clearAllAuthenticatedOfflineData();
    } catch {
      // Best-effort: offline storage purge failure must never block session logout
    } finally {
      await logoutAction();
    }
  }

  const baseClasses = variant
    ? `inline-flex items-center justify-center select-none transition-all duration-150 ease-out cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none active:scale-[0.985] ${
        variantStyles[variant] || ""
      } ${sizeStyles[size || "md"] || ""} ${fullWidth ? "w-full" : ""}`
    : "";

  return (
    <form action={logoutAction} onSubmit={handleLogoutSubmit} className={fullWidth ? "w-full" : "contents"}>
      <button
        type="submit"
        disabled={isLoggingOut}
        className={`${baseClasses} ${className}`.trim()}
      >
        {children || (isLoggingOut ? "Saindo..." : "Sair")}
      </button>
    </form>
  );
}
