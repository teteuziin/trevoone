"use client";

import React from "react";
import Link from "next/link";
import { revokePushSubscriptionAction } from "@/app/notificacoes/actions";

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

export { LogoutButton, type LogoutButtonProps } from "@/components/auth/logout-button";
