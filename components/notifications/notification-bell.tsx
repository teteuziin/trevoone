"use client";

import React, { useState } from "react";
import Link from "next/link";
import { revokePushSubscriptionAction } from "@/app/notificacoes/actions";
import { clearAllAuthenticatedOfflineData } from "@/lib/offline/offline-storage";

export interface NotificationBellProps {
  unreadCount?: number;
  className?: string;
}

export function NotificationBell({
  unreadCount = 0,
  className = "",
}: NotificationBellProps) {
  const hasUnread = unreadCount > 0;
  const displayCount = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <Link
      href="/notificacoes"
      aria-label={
        hasUnread
          ? `Notificações (${unreadCount} não lidas)`
          : "Notificações"
      }
      className={`relative inline-flex items-center justify-center w-9.5 h-9.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--brand)] ${className}`.trim()}
    >
      <svg
        className="w-4.5 h-4.5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>

      {hasUnread && (
        <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-[var(--brand)] text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-xs border border-[var(--surface)]">
          {displayCount}
        </span>
      )}
    </Link>
  );
}

/**
 * Best-effort Push cleanup on explicit user logout.
 * 1. Queries active subscription from browser PushManager.
 * 2. Revokes subscription on the server for current authenticated session.
 * 3. Unsubscribes from browser PushManager.
 * Wrapped defensively so that push failures never disrupt or block session logout.
 */
export async function performPushCleanup(): Promise<void> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) {
      return;
    }

    const endpoint = sub.endpoint;

    // 1. Server-side revocation for current authenticated user
    try {
      await revokePushSubscriptionAction(endpoint, "LOGOUT");
    } catch {
      // Best-effort: ignore server revoke failure
    }

    // 2. Browser unsubscribe
    try {
      await sub.unsubscribe();
    } catch {
      // Best-effort: ignore unsubscribe failure
    }
  } catch {
    // Best-effort
  }
}

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
      // Best-effort: offline purge failure must never block logout
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
