"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircleIcon as HelpCircle } from "@/components/ui/icons";
import { ConsultancyLogo } from "@/components/brand/consultancy-logo";
import { logoutFromConsultancyArea } from "@/app/selecionar-consultoria/actions";
import { NotificationBell, LogoutButton } from "@/components/notifications/notification-bell";
import { ViewModeSelector } from "./view-mode-selector";
import { FirstAccessTutorial } from "@/components/onboarding/first-access-tutorial";
import type { EffectiveViewModeState } from "@/lib/consultancies/view-mode";

export interface NavItemConfig {
  id: string;
  label: string;
  mobileLabel?: string;
  href: string;
  iconName:
    | "overview"
    | "training"
    | "nutrition"
    | "progress"
    | "prescriptions"
    | "exercises"
    | "members"
    | "onboarding"
    | "finance"
    | "subscription"
    | "missions"
    | "consultations";
}

export interface ConsultancyNavigationProps {
  consultancySlug: string;
  consultancyName: string;
  consultancyLogoUrl: string | null;
  items: NavItemConfig[];
  mobilePrimaryItems?: NavItemConfig[];
  userName?: string;
  userEmail?: string;
  roleLabels?: string[];
  unreadNotificationsCount?: number;
  viewModeState?: EffectiveViewModeState;
}

type ThemeMode = "light" | "dark" | "system";

function NavIcon({ name }: { name: NavItemConfig["iconName"] }) {
  switch (name) {
    case "overview":
      // Clean home cockpit architecture
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75M4.5 10.5V20.25a.75.75 0 00.75.75H9v-5.25a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75V21h3.75a.75.75 0 00.75-.75V10.5" />
        </svg>
      );
    case "training":
      // Unmistakable gym barbell / dumbbell
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5l11 11" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 9l3-3 2 2-3 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 20l3-3 2 2-3 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 10.5l4-4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.5 21.5l4-4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15l-1.5 1.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 7.5L15 9" />
        </svg>
      );
    case "nutrition":
      // Organic nutrition leaf & apple silhouette
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c1.8 2.2 1.5 4 0 5.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 7C5.2 7.5 3 10.5 3 14c0 4 3 6.5 5.5 6.5 2 0 2.5-.8 3.5-.8s1.5.8 3.5.8c2.5 0 5.5-2.5 5.5-6.5 0-3.5-2.2-6.5-5.5-7-1.2-.2-2.3.4-3.5.4S9.7 6.8 8.5 7z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v5" />
        </svg>
      );
    case "progress":
      // Body metrics & progress growth chart with tracking milestone
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18M3.5 15.5l5.5-5.5 4 4 7-7.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 6.5H20V11" />
          <circle cx="13" cy="14" r="1.25" fill="currentColor" />
        </svg>
      );
    case "prescriptions":
      // Clinical prescription sheet with lines
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "exercises":
      // Exercises library rack / weights
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M8 10v10M16 10v10" />
        </svg>
      );
    case "members":
      // Team members multi-person silhouette
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0112 15a6.062 6.062 0 015.963 4.416zM15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      );
    case "onboarding":
      // Checkmark checklist / intake form
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    case "finance":
      // Executive wallet with card slot and coin
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h3.75A2.25 2.25 0 0121 6v12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18V6a2.25 2.25 0 012.25-2.25H15M18 13.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
        </svg>
      );
    case "subscription":
      // SaaS Platform Subscription / Shield
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      );
    case "missions":
      // VIP Ambassador Trophy / Badge
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-6.75c-.621 0-1.125.504-1.125 1.125V18.75m10.5-12.75h1.875a3.375 3.375 0 013.375 3.375c0 1.63-1.162 2.986-2.705 3.284A6.002 6.002 0 0116.5 15V6zm-9 0H5.625A3.375 3.375 0 002.25 9.375c0 1.63 1.162 2.986 2.705 3.284A6.002 6.002 0 007.5 15V6zm0 0v9m9-9v9" />
        </svg>
      );
    case "consultations":
      // Video Teleconsultation Camera / Schedule
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      );
  }
}

function getThemeSnapshot(): ThemeMode {
  try {
    const stored = localStorage.getItem("trevo_theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Storage access unavailable
  }
  return "system";
}

function getThemeServerSnapshot(): ThemeMode {
  return "system";
}

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("trevo-theme-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("trevo-theme-change", callback);
  };
}

export function AppearanceSegmentedControl({
  className = "",
  compact = false,
  showLabel = true,
  currentTheme: propCurrentTheme,
  onThemeSelect: propOnThemeSelect,
}: {
  className?: string;
  compact?: boolean;
  showLabel?: boolean;
  currentTheme?: ThemeMode;
  onThemeSelect?: (theme: ThemeMode) => void;
}) {
  const storeTheme = React.useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );
  const currentTheme = propCurrentTheme ?? storeTheme;

  function handleThemeSelect(newTheme: ThemeMode) {
    if (propOnThemeSelect) {
      propOnThemeSelect(newTheme);
      return;
    }
    try {
      localStorage.setItem("trevo_theme", newTheme);
      if (newTheme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
      } else if (newTheme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      window.dispatchEvent(new Event("trevo-theme-change"));
    } catch {
      // Storage unavailable
    }
  }

  const options: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
    {
      id: "light",
      label: "Claro",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      ),
    },
    {
      id: "dark",
      label: "Escuro",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      ),
    },
    {
      id: "system",
      label: "Sistema",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
        </svg>
      ),
    },
  ];

  if (compact) {
    return (
      <div
        role="group"
        aria-label="Selecionar tema de aparência"
        className={`inline-flex items-center p-0.5 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl shadow-inner ${className}`.trim()}
      >
        {options.map((opt) => {
          const selected = currentTheme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={selected}
              onClick={() => handleThemeSelect(opt.id)}
              title={opt.label}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-[11px] rounded-lg select-none transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] depth-interactive ${
                selected
                  ? "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-xs font-semibold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent font-medium"
              }`}
            >
              {opt.icon}
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`.trim()}>
      {showLabel && (
        <div className="flex items-center justify-between px-1">
          <label id="appearance-label" className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Aparência
          </label>
          <span className="text-[11px] font-medium text-[var(--text-secondary)] capitalize">
            {currentTheme === "system" ? "Sistema" : currentTheme === "dark" ? "Escuro" : "Claro"}
          </span>
        </div>
      )}

      <div
        role="group"
        aria-labelledby={showLabel ? "appearance-label" : undefined}
        aria-label={!showLabel ? "Selecionar tema de aparência" : undefined}
        className="grid grid-cols-3 gap-1 p-1 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl shadow-inner"
      >
        {options.map((opt) => {
          const selected = currentTheme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={selected}
              onClick={() => handleThemeSelect(opt.id)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs rounded-lg min-h-[44px] select-none transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] depth-interactive ${
                selected
                  ? "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-xs font-semibold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent font-medium"
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ConsultancyNavigation({
  consultancySlug,
  consultancyName,
  consultancyLogoUrl,
  items,
  mobilePrimaryItems,
  userName,
  userEmail,
  roleLabels = [],
  unreadNotificationsCount = 0,
  viewModeState,
}: ConsultancyNavigationProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopProfileOpen, setDesktopProfileOpen] = useState(false);
  const desktopProfileRef = useRef<HTMLDivElement>(null);

  // Hydration-safe external store subscription to localStorage theme
  const currentTheme = React.useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  function handleThemeSelect(newTheme: ThemeMode) {
    try {
      localStorage.setItem("trevo_theme", newTheme);
      if (newTheme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
      } else if (newTheme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      window.dispatchEvent(new Event("trevo-theme-change"));
    } catch {
      // Storage unavailable
    }
  }

  const baseSlugHref = `/consultoria/${consultancySlug}`;

  function isItemActive(itemHref: string): boolean {
    if (itemHref === baseSlugHref) {
      return pathname === baseSlugHref;
    }
    return pathname === itemHref || pathname.startsWith(itemHref + "/");
  }

  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close menus during render when pathname changes
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
    setDesktopProfileOpen(false);
  }

  // Handle keyboard Escape and outside click listeners
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setDesktopProfileOpen(false);
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (
        desktopProfileRef.current &&
        !desktopProfileRef.current.contains(e.target as Node)
      ) {
        setDesktopProfileOpen(false);
      }
    }

    if (mobileMenuOpen || desktopProfileOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    if (desktopProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen, desktopProfileOpen]);

  const userInitial = (userName?.trim().charAt(0) || "U").toUpperCase();
  const primaryRoleLabel =
    viewModeState?.effectiveMode === "INFLUENCER"
      ? "Influenciador / VIP"
      : viewModeState?.effectiveMode === "ADMIN"
      ? "Administrador"
      : viewModeState?.effectiveMode === "PERSONAL"
      ? "Personal Trainer"
      : viewModeState?.effectiveMode === "NUTRITIONIST"
      ? "Nutricionista"
      : roleLabels.length > 0
      ? roleLabels[0]
      : null;

  // Determine primary (max 4) and secondary items for mobile navigation
  const primaryNavItems =
    mobilePrimaryItems && mobilePrimaryItems.length > 0
      ? mobilePrimaryItems.slice(0, 4)
      : items.slice(0, 4);

  const primaryHrefs = new Set(primaryNavItems.map((item) => item.href));
  const secondaryNavItems = items.filter((item) => !primaryHrefs.has(item.href));

  const isAnyPrimaryActive = primaryNavItems.some((item) => isItemActive(item.href));
  const isAnySecondaryActive =
    secondaryNavItems.some((item) => isItemActive(item.href)) ||
    pathname === "/notificacoes" ||
    pathname === "/conta/seguranca";

  const isMoreActive = !isAnyPrimaryActive && isAnySecondaryActive;

  // Categorize items for desktop sidebar
  const mainNavItems = items.filter(
    (item) =>
      !item.id.startsWith("admin-") &&
      item.id !== "personal-exercicios" &&
      item.id !== "nutritionist-alimentos"
  );
  const managementNavItems = items.filter(
    (item) =>
      item.id.startsWith("admin-") ||
      item.id === "personal-exercicios" ||
      item.id === "nutritionist-alimentos"
  );

  return (
    <>
      {/* =========================================================================
          1. DESKTOP PERSISTENT SIDEBAR (>= 1024px / lg)
          ========================================================================= */}
      <aside
        aria-label="Barra lateral de navegação"
        className="hidden lg:flex fixed top-0 bottom-0 left-0 w-64 bg-[var(--surface)] border-r border-[var(--border-default)] z-30 flex-col justify-between overflow-y-auto select-none print:hidden transition-colors"
      >
        {/* Top: Brand Header & Navigation Sections */}
        <div className="flex flex-col space-y-4 p-4">
          {/* Consultancy Branding */}
          <Link
            href={baseSlugHref}
            prefetch={false}
            className="flex items-center gap-3 p-2 rounded-2xl hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border-default)] transition-all group focus-visible:outline-2 focus-visible:outline-[var(--brand)] depth-interactive"
          >
            <ConsultancyLogo
              logoUrl={consultancyLogoUrl}
              name={consultancyName}
              size={36}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight group-hover:text-[var(--text-primary)] transition-colors">
                {consultancyName}
              </p>
              {primaryRoleLabel && (
                <p className="text-[10px] font-medium text-[var(--text-tertiary)] truncate leading-tight mt-0.5 uppercase tracking-wider">
                  {primaryRoleLabel}
                </p>
              )}
            </div>
          </Link>

          {/* View Mode Selector (if preview/multi-mode available) */}
          {viewModeState && viewModeState.allowedOptions.length > 1 && (
            <div className="p-2.5 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-2xl depth-base">
              <ViewModeSelector
                consultancySlug={consultancySlug}
                effectiveMode={viewModeState.effectiveMode}
                defaultMode={viewModeState.defaultMode}
                allowedOptions={viewModeState.allowedOptions}
              />
            </div>
          )}

          {/* Navigation Links */}
          <nav aria-label="Navegação desktop" className="space-y-4 pt-1">
            {/* Main Section */}
            <div className="space-y-1">
              {managementNavItems.length > 0 && (
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-3 mb-1.5">
                  Principal
                </p>
              )}
              {mainNavItems.map((item) => {
                const active = isItemActive(item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    prefetch={false}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-between px-3 py-2 text-xs rounded-xl border transition-all depth-interactive ${
                      active
                        ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs font-semibold"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-transparent font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <NavIcon name={item.iconName} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] shrink-0 shadow-2xs" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Management Section (if any) */}
            {managementNavItems.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-[var(--border-subtle)]">
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-3 mb-1.5">
                  Gestão &amp; Clínica
                </p>
                {managementNavItems.map((item) => {
                  const active = isItemActive(item.href);
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      prefetch={false}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center justify-between px-3 py-2 text-xs rounded-xl border transition-all depth-interactive ${
                        active
                          ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs font-semibold"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-transparent font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <NavIcon name={item.iconName} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] shrink-0 shadow-2xs" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>
        </div>

        {/* Bottom: User Card, Theme & Actions */}
        <div className="p-3.5 border-t border-[var(--border-default)] space-y-3 bg-[var(--surface)]">
          {/* User Info Card */}
          <div className="flex items-center gap-2.5 px-1 py-0.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center shrink-0 select-none shadow-2xs">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate leading-tight">
                {userName || "Usuário"}
              </p>
              {userEmail && (
                <p className="text-[11px] text-[var(--text-tertiary)] truncate leading-tight mt-0.5">
                  {userEmail}
                </p>
              )}
            </div>
          </div>

          {/* Theme Selector */}
          <AppearanceSegmentedControl
            compact
            currentTheme={currentTheme}
            onThemeSelect={handleThemeSelect}
            className="w-full justify-center"
          />

          {/* Quick Settings & Navigation Links */}
          <div className="grid grid-cols-4 gap-1 pt-0.5">
            <Link
              href="/notificacoes"
              prefetch={false}
              className={`relative flex items-center justify-center py-2 px-1 rounded-xl text-xs transition-all border depth-interactive ${
                pathname === "/notificacoes"
                  ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs font-semibold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)] font-medium"
              }`}
              title="Notificações"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--brand)] ring-2 ring-[var(--surface)]" />
              )}
            </Link>

            <Link
              href="/conta/perfil"
              prefetch={false}
              className={`flex items-center justify-center py-2 px-1 rounded-xl text-xs transition-all border depth-interactive ${
                pathname === "/conta/perfil"
                  ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs font-semibold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)] font-medium"
              }`}
              title="Meu perfil"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/ajuda`}
              prefetch={false}
              className={`flex items-center justify-center py-2 px-1 rounded-xl text-xs transition-all border depth-interactive ${
                pathname === `/consultoria/${consultancySlug}/ajuda`
                  ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs font-semibold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)] font-medium"
              }`}
              title="Central de Ajuda & Suporte"
            >
              <HelpCircle className="w-4 h-4" strokeWidth={1.8} />
            </Link>

            <Link
              href="/conta/seguranca"
              prefetch={false}
              className={`flex items-center justify-center py-2 px-1 rounded-xl text-xs transition-all border depth-interactive ${
                pathname === "/conta/seguranca"
                  ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs font-semibold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)] font-medium"
              }`}
              title="Conta e segurança"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="space-y-1.5 pt-0.5">
            <Link
              href="/selecionar-consultoria"
              prefetch={false}
              className="flex items-center justify-center w-full py-2 px-3 text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] rounded-xl transition-all shadow-2xs depth-interactive"
            >
              Trocar consultoria
            </Link>
            <LogoutButton
              logoutAction={logoutFromConsultancyArea}
              className="flex items-center justify-center w-full py-2 px-3 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--danger-foreground)] bg-[var(--surface-subtle)] hover:bg-[var(--danger-soft)] border border-[var(--border-default)] hover:border-[var(--danger-border)] rounded-xl transition-all cursor-pointer depth-interactive"
            >
              Sair da conta
            </LogoutButton>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          2. TABLET ADAPTIVE TOPBAR (768px - 1023px / md to lg)
          ========================================================================= */}
      <header className="hidden md:flex lg:hidden sticky top-0 z-30 w-full bg-[var(--surface)] border-b border-[var(--border-default)] shadow-2xs print:hidden transition-colors border-specular-t">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Left: Branding */}
          <Link
            href={baseSlugHref}
            prefetch={false}
            className="flex items-center gap-2.5 min-w-0 group focus-visible:outline-2 focus-visible:outline-[var(--brand)] rounded-xl py-1"
          >
            <ConsultancyLogo
              logoUrl={consultancyLogoUrl}
              name={consultancyName}
              size={32}
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate leading-tight">
                {consultancyName}
              </p>
              {primaryRoleLabel && (
                <p className="text-[10px] font-medium text-[var(--text-tertiary)] truncate leading-tight uppercase tracking-wider mt-0.5">
                  {primaryRoleLabel}
                </p>
              )}
            </div>
          </Link>

          {/* Center: Primary Navigation Tabs (Max 4 items to ensure zero wrapping) */}
          <nav aria-label="Navegação do tablet" className="flex items-center gap-1">
            {primaryNavItems.slice(0, 4).map((item) => {
              const active = isItemActive(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition-all depth-interactive ${
                    active
                      ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs font-semibold"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-transparent font-medium"
                  }`}
                >
                  <NavIcon name={item.iconName} />
                  <span>{item.mobileLabel || item.label}</span>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] shrink-0" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: Notifications & Drawer Menu Toggle */}
          <div className="flex items-center gap-2">
            <NotificationBell unreadCount={unreadNotificationsCount} />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu de navegação e opções"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] transition-all shadow-2xs depth-interactive cursor-pointer min-h-[36px]"
            >
              <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              <span>Menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          3. MOBILE TOPBAR (< 768px)
          ========================================================================= */}
      <header className="flex md:hidden sticky top-0 z-30 w-full bg-[var(--surface)] border-b border-[var(--border-default)] shadow-2xs pt-[env(safe-area-inset-top,0px)] print:hidden transition-colors border-specular-t">
        <div className="w-full px-3.5 h-14 flex items-center justify-between gap-3">
          {/* Branding */}
          <Link
            href={baseSlugHref}
            prefetch={false}
            className="flex items-center gap-2.5 min-w-0 group focus-visible:outline-2 focus-visible:outline-[var(--brand)] rounded-xl py-1"
          >
            <ConsultancyLogo
              logoUrl={consultancyLogoUrl}
              name={consultancyName}
              size={30}
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate leading-tight">
                {consultancyName}
              </p>
              {primaryRoleLabel && (
                <p className="text-[10px] font-medium text-[var(--text-tertiary)] truncate leading-tight uppercase tracking-wider mt-0.5">
                  {primaryRoleLabel}
                </p>
              )}
            </div>
          </Link>

          {/* Right Action */}
          <div className="flex items-center gap-1.5">
            <NotificationBell unreadCount={unreadNotificationsCount} />
          </div>
        </div>
      </header>

      {/* =========================================================================
          4. MOBILE BOTTOM NAVIGATION (< 768px)
          ========================================================================= */}
      <nav
        aria-label="Navegação rápida móvel"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--surface)] border-t border-[var(--border-default)] pb-[env(safe-area-inset-bottom,0px)] shadow-lg print:hidden transition-colors border-specular-t"
      >
        <div className="flex items-center justify-around h-16 px-1">
          {primaryNavItems.map((item) => {
            const active = isItemActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={`group flex flex-col items-center justify-center flex-1 min-w-0 min-h-[48px] py-1 px-0.5 transition-all select-none focus-visible:outline-2 focus-visible:outline-[var(--brand)] rounded-xl ${
                  active
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all duration-150 ${
                    active
                      ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-2xs"
                      : "group-hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  <NavIcon name={item.iconName} />
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={`text-[10px] tracking-tight truncate max-w-full leading-tight ${
                      active ? "font-semibold text-[var(--text-primary)]" : "font-medium text-[var(--text-tertiary)]"
                    }`}
                  >
                    {item.mobileLabel || item.label}
                  </span>
                  {active && (
                    <span className="w-1 h-1 rounded-full bg-[var(--brand)] shrink-0" />
                  )}
                </div>
              </Link>
            );
          })}

          {/* "Mais" button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Mais opções de navegação"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            className={`group flex flex-col items-center justify-center flex-1 min-w-0 min-h-[48px] py-1 px-0.5 transition-all select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] rounded-xl ${
              isMoreActive
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <div
              className={`p-1.5 rounded-xl relative transition-all duration-150 ${
                isMoreActive
                  ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-2xs"
                  : "group-hover:bg-[var(--surface-hover)]"
              }`}
            >
              <svg
                className="w-5 h-5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                />
              </svg>
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--brand)] ring-2 ring-[var(--surface)]" />
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className={`text-[10px] tracking-tight truncate leading-tight ${
                  isMoreActive ? "font-semibold text-[var(--text-primary)]" : "font-medium text-[var(--text-tertiary)]"
                }`}
              >
                Mais
              </span>
              {isMoreActive && (
                <span className="w-1 h-1 rounded-full bg-[var(--brand)] shrink-0" />
              )}
            </div>
          </button>
        </div>
      </nav>

      {/* =========================================================================
          5. DRAWER MENU (For Mobile & Tablet)
          ========================================================================= */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 transition-opacity animate-in fade-in duration-150"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div
            id="mobile-navigation-drawer"
            role="dialog"
            aria-label="Mais opções de navegação"
            aria-modal="true"
            className="relative w-full max-h-[85vh] overflow-y-auto bg-[var(--surface)] border-t border-[var(--border-default)] rounded-t-3xl p-5 shadow-2xl z-10 animate-in slide-in-from-bottom-6 duration-200 space-y-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] border-specular-t"
          >
            {/* Header Handle & Close */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] font-bold text-sm flex items-center justify-center select-none shadow-2xs">
                  {userInitial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{userName || "Usuário"}</p>
                  {userEmail && <p className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">{userEmail}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar menu"
                className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-xl transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center border border-[var(--border-default)] bg-[var(--surface-subtle)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Section 1: All / Secondary Navigation Links */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
                Navegação completa
              </p>
              <nav aria-label="Todos os módulos" className="grid grid-cols-2 gap-2">
                {items.map((item) => {
                  const active = isItemActive(item.href);
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      prefetch={false}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center justify-between p-3 text-xs rounded-xl border transition-all min-h-[44px] depth-interactive ${
                        active
                          ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs font-semibold"
                          : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)] font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <NavIcon name={item.iconName} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Section 2: Appearance & Theme */}
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
                Aparência
              </span>
              <AppearanceSegmentedControl
                currentTheme={currentTheme}
                onThemeSelect={handleThemeSelect}
                showLabel={false}
              />
            </div>

            {/* Section 3: View Mode Selector (if multi-mode available) */}
            {viewModeState && viewModeState.allowedOptions.length > 1 && (
              <div className="space-y-2 pt-1 border-t border-[var(--border-subtle)]">
                <ViewModeSelector
                  consultancySlug={consultancySlug}
                  effectiveMode={viewModeState.effectiveMode}
                  defaultMode={viewModeState.defaultMode}
                  allowedOptions={viewModeState.allowedOptions}
                  onSelect={() => setMobileMenuOpen(false)}
                />
              </div>
            )}

            {/* Section 4: Direct User Preferences */}
            <div className="space-y-2 pt-1 border-t border-[var(--border-subtle)]">
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
                Preferências
              </p>
              <nav aria-label="Preferências do usuário" className="space-y-1.5">
                <Link
                  href="/notificacoes"
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 text-xs rounded-xl border transition-all min-h-[44px] depth-interactive ${
                    pathname === "/notificacoes"
                      ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs font-semibold"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)] font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-[var(--text-secondary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                    <span>Central de notificações</span>
                  </div>
                  {unreadNotificationsCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[var(--brand)] text-[var(--text-inverse)]">
                      {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/conta/perfil"
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 text-xs rounded-xl border transition-all min-h-[44px] depth-interactive ${
                    pathname === "/conta/perfil"
                      ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs font-semibold"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)] font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-[var(--text-secondary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <span>Meu perfil</span>
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)]">→</span>
                </Link>

                <Link
                  href={`/consultoria/${consultancySlug}/ajuda`}
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 text-xs rounded-xl border transition-all min-h-[44px] depth-interactive ${
                    pathname === `/consultoria/${consultancySlug}/ajuda`
                      ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs font-semibold"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)] font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-[var(--brand)] shrink-0" strokeWidth={1.8} />
                    <span>Ajuda & Suporte</span>
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)]">→</span>
                </Link>

                <Link
                  href="/conta/seguranca"
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 text-xs rounded-xl border transition-all min-h-[44px] depth-interactive ${
                    pathname === "/conta/seguranca"
                      ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs font-semibold"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)] font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-[var(--text-secondary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <span>Conta e segurança</span>
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)]">→</span>
                </Link>
              </nav>
            </div>

            {/* Section 5: Actions */}
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
              <Link
                href="/selecionar-consultoria"
                prefetch={false}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full py-2.5 px-4 text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] rounded-xl transition-all min-h-[44px] shadow-2xs depth-interactive"
              >
                Trocar consultoria
              </Link>
              <LogoutButton
                logoutAction={logoutFromConsultancyArea}
                className="flex items-center justify-center w-full py-2.5 px-4 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--danger-foreground)] bg-[var(--surface-subtle)] hover:bg-[var(--danger-soft)] border border-[var(--border-default)] hover:border-[var(--danger-border)] rounded-xl transition-all cursor-pointer min-h-[44px] depth-interactive"
              >
                Sair da conta
              </LogoutButton>
            </div>
          </div>
        </div>
      )}

      {/* First Access Guided Tutorial */}
      <FirstAccessTutorial
        consultancyName={consultancyName}
      />
    </>
  );
}
