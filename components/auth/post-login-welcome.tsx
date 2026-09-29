"use client";

import React, { useState, useEffect } from "react";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { UserAvatar } from "@/components/account/user-avatar";
import { resolveUserIdentity } from "@/lib/auth/user-identity";

export const WELCOME_SESSION_STORAGE_KEY = "trevo_welcome_seen";

export interface PostLoginWelcomeProps {
  userName?: string | null;
  userEmail?: string | null;
  userPublicId?: string | null;
  avatarUrl?: string | null;
  hasProfilePhoto?: boolean;
}

export function PostLoginWelcome({
  userName,
  userEmail,
  userPublicId,
  avatarUrl,
  hasProfilePhoto,
}: PostLoginWelcomeProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const seen = window.sessionStorage.getItem(WELCOME_SESSION_STORAGE_KEY);
        if (seen === "true") {
          return;
        }
        // Mark as seen immediately so no concurrent route changes trigger it
        window.sessionStorage.setItem(WELCOME_SESSION_STORAGE_KEY, "true");
      }
    } catch {
      // Best-effort storage fallback
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    // Trigger smooth mount and fade-in asynchronously
    const enterTimer = setTimeout(() => {
      setIsMounted(true);
      setIsVisible(true);
    }, 20);

    // Timing: ~1.6s visible, then smooth fade-out
    const displayDuration = prefersReducedMotion ? 1000 : 1600;
    const fadeOutDuration = prefersReducedMotion ? 150 : 350;

    const exitTimer = setTimeout(() => {
      setIsFadingOut(true);
      setIsVisible(false);

      const cleanupTimer = setTimeout(() => {
        setIsMounted(false);
      }, fadeOutDuration);

      return () => clearTimeout(cleanupTimer);
    }, displayDuration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, []);

  if (!isMounted) {
    return null;
  }

  const identity = resolveUserIdentity({
    fullName: userName,
    email: userEmail,
    userPublicId: userPublicId,
    avatarUrl: avatarUrl,
    hasProfilePhoto: hasProfilePhoto,
  });

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Boas-vindas, ${identity.firstName}`}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-neutral-950/98 backdrop-blur-2xl transition-opacity duration-300 ease-out select-none px-4 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] ${
        isVisible && !isFadingOut ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Ambient Emerald Glow */}
      <div
        className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none -translate-y-8"
        aria-hidden="true"
      />

      {/* Main Content Box */}
      <div
        className={`relative flex flex-col items-center text-center max-w-sm sm:max-w-md w-full transition-all duration-300 ease-out ${
          isVisible && !isFadingOut ? "scale-100 translate-y-0" : "scale-95 translate-y-2"
        }`}
      >
        {/* Trevo One Logo Header */}
        <div className="mb-6 sm:mb-8 flex items-center justify-center">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-xl shadow-emerald-500/5">
            <TrevoOneLogo size={36} showWordmark priority />
          </div>
        </div>

        {/* Circular User Avatar with Brand Ring */}
        <div className="relative mb-5 sm:mb-6">
          <div
            className="absolute -inset-1 rounded-full bg-gradient-to-tr from-emerald-500/40 via-emerald-400/20 to-transparent blur-sm"
            aria-hidden="true"
          />
          <div className="relative rounded-full ring-2 ring-emerald-500/40 p-1 bg-neutral-950">
            <UserAvatar
              fullName={identity.fullName}
              userPublicId={identity.userPublicId}
              avatarUrl={identity.avatarUrl}
              hasProfilePhoto={identity.hasProfilePhoto}
              shape="circle"
              size="xl"
              className="w-20 h-20 sm:w-24 sm:h-24 text-2xl sm:text-3xl font-extrabold shadow-2xl"
            />
          </div>
        </div>

        {/* Welcome Greeting */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
          Olá, {identity.firstName}
        </h1>

        {/* Secondary Message */}
        <p className="mt-2 text-sm sm:text-base font-medium text-neutral-400">
          Já estávamos com saudades!
        </p>

        {/* Subtle Loading Accent Bar */}
        <div
          className="mt-7 w-28 sm:w-36 h-1 rounded-full bg-neutral-800/80 overflow-hidden"
          aria-hidden="true"
        >
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 animate-pulse rounded-full" />
        </div>
      </div>
    </div>
  );
}
