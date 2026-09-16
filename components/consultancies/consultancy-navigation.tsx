"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConsultancyLogo } from "@/components/brand/consultancy-logo";
import { logoutFromConsultancyArea } from "@/app/selecionar-consultoria/actions";
import { NotificationBell, LogoutButton } from "@/components/notifications/notification-bell";
import { ViewModeSelector } from "./view-mode-selector";
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
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      );
    case "training":
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      );
    case "nutrition":
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case "prescriptions":
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "exercises":
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
    case "members":
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      );
    case "onboarding":
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "finance":
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "subscription":
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
        </svg>
      );
    case "missions":
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.779V4.5l-3.114.779a9 9 0 01-6.086-.71l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
        </svg>
      );
    case "consultations":
      return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
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
  const primaryRoleLabel = roleLabels.length > 0 ? roleLabels[0] : null;

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
        className="hidden lg:flex fixed top-0 bottom-0 left-0 w-64 bg-[var(--surface)] border-r border-[var(--border-default)] z-30 flex-col justify-between overflow-y-auto select-none print:hidden transition-colors border-specular-t"
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
          <div className="grid grid-cols-3 gap-1 pt-0.5">
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
    </>
  );
}
