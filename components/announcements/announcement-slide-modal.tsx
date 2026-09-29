"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { UserAvatar } from "@/components/account/user-avatar";
import { markAnnouncementReadAction } from "@/app/consultoria/[slug]/comunicados/actions";
import type { ConsultancyAnnouncementDto } from "@/lib/consultancies/announcements";

export interface AnnouncementSlideModalProps {
  announcements: ConsultancyAnnouncementDto[];
  consultancySlug: string;
}

function formatDatePtBr(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

export function AnnouncementSlideModal({
  announcements,
}: AnnouncementSlideModalProps) {
  const [unreadList, setUnreadList] = useState<ConsultancyAnnouncementDto[]>(announcements);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isWelcomeFinished, setIsWelcomeFinished] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return window.sessionStorage?.getItem("trevo_welcome_seen") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });
  const [countdown, setCountdown] = useState(5);
  const [isPending, setIsPending] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 1. Synchronize with PostLoginWelcome overlay if welcome has not finished yet
  useEffect(() => {
    if (isWelcomeFinished) return;

    function handleWelcomeFinished() {
      setIsWelcomeFinished(true);
    }

    window.addEventListener("trevo-welcome-finished", handleWelcomeFinished);

    // Safety fallback: if welcome finished without event or timed out, display after 2.2s
    const fallbackTimer = setTimeout(() => {
      setIsWelcomeFinished(true);
    }, 2200);

    return () => {
      window.removeEventListener("trevo-welcome-finished", handleWelcomeFinished);
      clearTimeout(fallbackTimer);
    };
  }, [isWelcomeFinished]);

  // 2. Countdown timer for current announcement (5 seconds minimum reading time)
  useEffect(() => {
    if (!isWelcomeFinished || unreadList.length === 0) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isWelcomeFinished, currentIndex, unreadList.length]);

  // 3. Accessibility: Prevent ESC dismissal and trap focus
  useEffect(() => {
    if (!isWelcomeFinished || unreadList.length === 0) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Critical: Do NOT dismiss on ESC
        e.preventDefault();
        e.stopPropagation();
      } else if (e.key === "Tab") {
        // Trap focus inside modal
        if (!modalRef.current) return;
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isWelcomeFinished, unreadList.length]);

  // 4. Focus active button when countdown enables
  useEffect(() => {
    if (countdown === 0 && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [countdown]);

  // 5. Handle acknowledgement
  const handleAcknowledge = useCallback(async () => {
    if (countdown > 0 || isPending) return;

    const currentAnnouncement = unreadList[currentIndex];
    if (!currentAnnouncement) return;

    setIsPending(true);
    try {
      // Mark read in database persistently
      await markAnnouncementReadAction(currentAnnouncement.publicId);

      // Advance to next announcement or finish
      if (currentIndex + 1 < unreadList.length) {
        setCountdown(5);
        setCurrentIndex((prev) => prev + 1);
      } else {
        // All read
        setUnreadList([]);
      }
    } catch (err) {
      console.error("[ANNOUNCEMENT_MODAL] Failed to mark read:", err);
      // Even on network glitch, advance to avoid locking user permanently
      if (currentIndex + 1 < unreadList.length) {
        setCountdown(5);
        setCurrentIndex((prev) => prev + 1);
      } else {
        setUnreadList([]);
      }
    } finally {
      setIsPending(false);
    }
  }, [countdown, isPending, unreadList, currentIndex]);

  // If welcome is still playing or all announcements are read, render nothing
  if (!isWelcomeFinished || unreadList.length === 0) {
    return null;
  }

  const current = unreadList[currentIndex];
  if (!current) return null;

  const total = unreadList.length;
  const isMultiple = total > 1;

  const priorityConfig = {
    CRITICAL: {
      badgeText: "URGENTE",
      badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      accentGlow: "bg-rose-500/10",
      iconColor: "text-rose-400",
    },
    HIGH: {
      badgeText: "IMPORTANTE",
      badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      accentGlow: "bg-amber-500/10",
      iconColor: "text-amber-400",
    },
    NORMAL: {
      badgeText: "COMUNICADO",
      badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      accentGlow: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
    },
  }[current.priority] || {
    badgeText: "COMUNICADO",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    accentGlow: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6 bg-neutral-950/85 backdrop-blur-md select-none transition-all duration-300 animate-in fade-in"
      onClick={(e) => {
        // Critical: Do NOT dismiss on backdrop click
        e.stopPropagation();
      }}
    >
      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
        aria-describedby="announcement-body"
        className="relative w-full max-w-[680px] bg-neutral-900/95 border border-neutral-800 rounded-3xl shadow-2xl shadow-emerald-950/40 p-6 sm:p-8 flex flex-col justify-between overflow-hidden animate-in zoom-in-95 duration-200 border-specular-t"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Brand Glow */}
        <div
          className={`absolute -top-24 -right-24 w-72 h-72 rounded-full ${priorityConfig.accentGlow} blur-3xl pointer-events-none`}
          aria-hidden="true"
        />

        {/* Header: Icon, Category & Multi-Announcement Counter */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-neutral-800/80">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 ${priorityConfig.iconColor} shadow-inner`}>
              <svg
                className="w-5 h-5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.464a13.997 13.997 0 01-1.896-4.21m3.558 0a22.593 22.593 0 010-9.18m0 0c.253-.962.584-1.892.985-2.783.247-.55.06-1.21-.463-1.511l-.657-.38c-.551-.318-1.26-.117-1.527.464a13.997 13.997 0 00-1.896 4.21M17.25 8.25a6 6 0 010 7.5"
                />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest font-heading">
                COMUNICADO
              </span>
              <span
                className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border tracking-wide ${priorityConfig.badgeClass}`}
              >
                {priorityConfig.badgeText}
              </span>
            </div>
          </div>

          {/* Sequential counter */}
          {isMultiple && (
            <span className="text-xs font-semibold text-neutral-400 bg-neutral-950/60 px-3 py-1 rounded-full border border-neutral-800">
              Comunicado {currentIndex + 1} de {total}
            </span>
          )}
        </div>

        {/* Title */}
        <div className="pt-5 pb-3">
          <h2
            id="announcement-title"
            className="text-xl sm:text-2xl font-extrabold text-white tracking-tight font-heading leading-snug"
          >
            {current.title}
          </h2>
        </div>

        {/* Scrollable Body: Comfortable for short, medium, and long text */}
        <div
          id="announcement-body"
          className="my-3 overflow-y-auto max-h-[46vh] sm:max-h-[50vh] pr-2 text-sm sm:text-base text-neutral-300 leading-relaxed space-y-3 select-text scrollbar-thin scrollbar-thumb-neutral-700"
        >
          <p className="whitespace-pre-line break-words">{current.body}</p>
        </div>

        {/* Footer: Author Info & Date */}
        <div className="pt-4 border-t border-neutral-800/80 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {current.authorPublicId && (
              <UserAvatar
                fullName={current.authorName}
                userPublicId={current.authorPublicId}
                hasProfilePhoto={current.authorHasPhoto}
                profilePhotoUpdatedAt={current.authorPhotoUpdatedAt}
                shape="circle"
                size="xs"
              />
            )}
            <div className="min-w-0">
              <p className="text-xs text-neutral-400 truncate">
                Publicado por:{" "}
                <span className="font-semibold text-neutral-200">
                  {current.authorName}
                </span>
              </p>
              {current.createdAt && (
                <p className="text-[11px] text-neutral-500">
                  {formatDatePtBr(current.createdAt)}
                </p>
              )}
            </div>
          </div>

          {/* CTA Button: 5s Minimum Timer before enabling */}
          <div className="w-full sm:w-auto shrink-0">
            <button
              ref={buttonRef}
              type="button"
              disabled={countdown > 0 || isPending}
              onClick={handleAcknowledge}
              className={`w-full sm:w-auto min-w-[200px] min-h-[48px] px-6 py-2.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                countdown > 0
                  ? "bg-neutral-800/90 text-neutral-400 border border-neutral-700/60 cursor-not-allowed opacity-80"
                  : "bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-neutral-950 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
              }`}
            >
              {countdown > 0 ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin text-neutral-400"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Você poderá continuar em {countdown}s</span>
                </>
              ) : isPending ? (
                <span>Confirmando...</span>
              ) : (
                <span>Li o comunicado</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
