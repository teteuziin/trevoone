"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConsultancyLogo } from "@/components/brand/consultancy-logo";
import { BetaBadge } from "@/components/brand/beta-badge";
import { logoutFromConsultancyArea } from "@/app/selecionar-consultoria/actions";
import { NotificationBell, LogoutButton } from "@/components/notifications/notification-bell";

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
        className={`inline-flex items-center p-0.5 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl ${className}`.trim()}
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
              className={`flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg select-none transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] ${
                selected
                  ? "bg-[var(--surface)] text-[var(--brand-foreground)] border border-[var(--border-default)] shadow-2xs font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent"
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
          <label id="appearance-label" className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
            Aparência
          </label>
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] capitalize">
            {currentTheme === "system" ? "Sistema" : currentTheme === "dark" ? "Escuro" : "Claro"}
          </span>
        </div>
      )}

      <div
        role="group"
        aria-labelledby={showLabel ? "appearance-label" : undefined}
        aria-label={!showLabel ? "Selecionar tema de aparência" : undefined}
        className="grid grid-cols-3 gap-1 p-1 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl"
      >
        {options.map((opt) => {
          const selected = currentTheme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={selected}
              onClick={() => handleThemeSelect(opt.id)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg min-h-[44px] select-none transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] ${
                selected
                  ? "bg-[var(--surface)] text-[var(--brand-foreground)] border border-[var(--border-default)] shadow-xs font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent"
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

  return (
    <>
      {/* Desktop & Mobile Topbar Header */}
      <header className="sticky top-0 z-30 w-full bg-[var(--surface)] border-b border-[var(--border-default)] shadow-2xs pt-[env(safe-area-inset-top,0px)] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-15 gap-3">
            {/* Left: Branding */}
            <Link
              href={baseSlugHref}
              className="flex items-center gap-3 min-w-0 group focus-visible:outline-2 focus-visible:outline-[var(--brand)] rounded-xl py-1 px-1.5 -ml-1.5"
            >
              <ConsultancyLogo
                logoUrl={consultancyLogoUrl}
                name={consultancyName}
                size={36}
              />
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate leading-tight group-hover:text-[var(--brand)] transition-colors">
                    {consultancyName}
                  </p>
                  <BetaBadge />
                </div>
                {primaryRoleLabel && (
                  <p className="text-[11px] font-semibold text-[var(--text-secondary)] truncate leading-tight">
                    {primaryRoleLabel}
                  </p>
                )}
              </div>
            </Link>

            {/* Center: Desktop Navigation Bar */}
            <nav
              aria-label="Navegação principal"
              className="hidden md:flex items-center gap-1"
            >
              {items.map((item) => {
                const active = isItemActive(item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150 ease-out select-none ${
                      active
                        ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)] border border-[var(--brand-soft-border)] shadow-2xs"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent"
                    }`}
                  >
                    <NavIcon name={item.iconName} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: Quick Actions & Profile */}
            <div className="flex items-center gap-2">
              <NotificationBell unreadCount={unreadNotificationsCount} />

              {/* Desktop Profile & Preferences Popover */}
              <div className="hidden md:block relative" ref={desktopProfileRef}>
                <button
                  type="button"
                  onClick={() => setDesktopProfileOpen(!desktopProfileOpen)}
                  aria-label="Preferências do usuário"
                  aria-expanded={desktopProfileOpen}
                  aria-haspopup="dialog"
                  className="flex items-center gap-2.5 p-1.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] shadow-2xs"
                >
                  <div className="w-7 h-7 rounded-lg bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] text-[var(--brand-foreground)] font-bold text-xs flex items-center justify-center select-none shadow-2xs">
                    {userInitial}
                  </div>
                  {userName && (
                    <span className="text-xs font-semibold text-[var(--text-primary)] max-w-[120px] truncate pr-1">
                      {userName.split(" ")[0]}
                    </span>
                  )}
                  <svg
                    className={`w-3.5 h-3.5 text-[var(--text-tertiary)] transition-transform duration-200 ${
                      desktopProfileOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {/* Popover Card */}
                {desktopProfileOpen && (
                  <div
                    role="dialog"
                    aria-label="Menu de preferências"
                    className="absolute right-0 mt-2 w-72 p-3 bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3"
                  >
                    {/* User Info Header */}
                    <div className="px-2 py-1.5 border-b border-[var(--border-subtle)]">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">{userName || "Usuário"}</p>
                      {userEmail && <p className="text-[11px] text-[var(--text-secondary)] truncate">{userEmail}</p>}
                      {roleLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {roleLabels.map((rl) => (
                            <span
                              key={rl}
                              className="px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand-foreground)] bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] rounded-md"
                            >
                              {rl}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Access to Account Security */}
                    <div className="px-1">
                      <Link
                        href="/conta/seguranca"
                        onClick={() => setDesktopProfileOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-xl transition-colors min-h-[44px]"
                      >
                        <svg className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        <span>Conta e segurança</span>
                      </Link>
                    </div>

                    {/* Theme Controls */}
                    <div className="px-1 pt-1">
                      <AppearanceSegmentedControl
                        currentTheme={currentTheme}
                        onThemeSelect={handleThemeSelect}
                      />
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
                      <Link
                        href="/selecionar-consultoria"
                        className="flex items-center justify-center w-full py-2 px-3 text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] rounded-xl transition-colors min-h-[44px] shadow-2xs"
                      >
                        Trocar consultoria
                      </Link>
                      <LogoutButton
                        logoutAction={logoutFromConsultancyArea}
                        className="flex items-center justify-center w-full py-2 px-3 text-xs font-semibold text-[var(--danger-foreground)] bg-[var(--danger-soft)] hover:bg-[var(--danger-border)] border border-[var(--danger-border)] rounded-xl transition-colors cursor-pointer min-h-[44px]"
                      >
                        Sair da conta
                      </LogoutButton>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Backdrop & Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div
            id="mobile-navigation-drawer"
            role="dialog"
            aria-label="Mais opções de navegação"
            aria-modal="true"
            className="relative w-full max-h-[85vh] overflow-y-auto bg-[var(--surface)] border-t border-[var(--border-default)] rounded-t-3xl p-5 shadow-2xl z-10 animate-in slide-in-from-bottom-8 duration-200 space-y-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
          >
            {/* Header Handle & Close */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] text-[var(--brand-foreground)] font-bold text-sm flex items-center justify-center select-none shadow-2xs">
                  {userInitial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate">{userName || "Usuário"}</p>
                  {userEmail && <p className="text-xs text-[var(--text-secondary)] truncate">{userEmail}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar menu"
                className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-xl transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Section 1: Secondary Navigation Links */}
            {secondaryNavItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
                  Módulos adicionais
                </p>
                <nav aria-label="Módulos adicionais" className="grid grid-cols-2 gap-2">
                  {secondaryNavItems.map((item) => {
                    const active = isItemActive(item.href);
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-2.5 p-3 text-xs font-semibold rounded-xl border transition-all min-h-[44px] ${
                          active
                            ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)] border-[var(--brand-soft-border)] shadow-2xs"
                            : "bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)]"
                        }`}
                      >
                        <NavIcon name={item.iconName} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            )}

            {/* Section 2: Appearance */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
                Aparência
              </p>
              <AppearanceSegmentedControl
                currentTheme={currentTheme}
                onThemeSelect={handleThemeSelect}
                showLabel={false}
              />
            </div>

            {/* Section 3: Direct User Preferences */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
                Preferências
              </p>
              <nav aria-label="Preferências do usuário" className="space-y-1">
                <Link
                  href="/notificacoes"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl border transition-all min-h-[44px] ${
                    pathname === "/notificacoes"
                      ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)] border-[var(--brand-soft-border)]"
                      : "bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)]"
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
                  href="/conta/seguranca"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl border transition-all min-h-[44px] ${
                    pathname === "/conta/seguranca"
                      ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)] border-[var(--brand-soft-border)]"
                      : "bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)]"
                  }`}
                >
                  <svg className="w-4 h-4 text-[var(--text-secondary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <span>Conta e segurança</span>
                </Link>
              </nav>
            </div>

            {/* Section 4: Actions */}
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
              <Link
                href="/selecionar-consultoria"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full py-2.5 px-4 text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] rounded-xl transition-colors min-h-[44px] shadow-2xs"
              >
                Trocar consultoria
              </Link>
              <LogoutButton
                logoutAction={logoutFromConsultancyArea}
                className="flex items-center justify-center w-full py-2.5 px-4 text-xs font-semibold text-[var(--danger-foreground)] bg-[var(--danger-soft)] hover:bg-[var(--danger-border)] border border-[var(--danger-border)] rounded-xl transition-colors cursor-pointer min-h-[44px]"
              >
                Sair da conta
              </LogoutButton>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Navegação rápida móvel"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--surface)] border-t border-[var(--border-default)] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-2px_10px_rgba(0,0,0,0.03)] dark:shadow-[0_-2px_12px_rgba(0,0,0,0.25)] transition-colors"
      >
        <div className="flex items-center justify-around h-16 px-1">
          {primaryNavItems.map((item) => {
            const active = isItemActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group flex flex-col items-center justify-center flex-1 min-w-0 min-h-[48px] py-1 px-0.5 transition-all select-none focus-visible:outline-2 focus-visible:outline-[var(--brand)] rounded-xl ${
                  active
                    ? "text-[var(--brand-foreground)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all duration-150 ${
                    active
                      ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)] ring-1 ring-[var(--brand-soft-border)] shadow-2xs"
                      : "group-hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  <NavIcon name={item.iconName} />
                </div>
                <span
                  className={`text-[10px] tracking-tight truncate max-w-full leading-tight mt-0.5 ${
                    active ? "font-bold text-[var(--brand-foreground)]" : "font-medium"
                  }`}
                >
                  {item.mobileLabel || item.label}
                </span>
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
                ? "text-[var(--brand-foreground)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <div
              className={`p-1.5 rounded-xl relative transition-all duration-150 ${
                isMoreActive
                  ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)] ring-1 ring-[var(--brand-soft-border)] shadow-2xs"
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
            <span
              className={`text-[10px] tracking-tight truncate leading-tight mt-0.5 ${
                isMoreActive ? "font-bold text-[var(--brand-foreground)]" : "font-medium"
              }`}
            >
              Mais
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
