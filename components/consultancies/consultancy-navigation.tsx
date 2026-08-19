"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConsultancyLogo } from "@/components/brand/consultancy-logo";
import { logoutFromConsultancyArea } from "@/app/selecionar-consultoria/actions";
import { NotificationBell, LogoutButton } from "@/components/notifications/notification-bell";

export interface NavItemConfig {
  id: string;
  label: string;
  href: string;
  iconName: "overview" | "training" | "nutrition" | "prescriptions" | "exercises" | "members" | "onboarding";
}

export interface ConsultancyNavigationProps {
  consultancySlug: string;
  consultancyName: string;
  consultancyLogoUrl: string | null;
  items: NavItemConfig[];
  userName?: string;
  userEmail?: string;
  roleLabels?: string[];
  unreadNotificationsCount?: number;
}

function NavIcon({ name }: { name: NavItemConfig["iconName"] }) {
  switch (name) {
    case "overview":
      return (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      );
    case "training":
      return (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      );
    case "nutrition":
      return (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m0-18C8.5 3 5 6.5 5 11c0 6 7 10 7 10s7-4 7-10c0-4.5-3.5-8-7-8z" />
        </svg>
      );
    case "prescriptions":
      return (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "exercises":
      return (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
    case "members":
      return (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      );
    case "onboarding":
      return (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

export function ConsultancyNavigation({
  consultancySlug,
  consultancyName,
  consultancyLogoUrl,
  items,
  userName,
  userEmail,
  roleLabels = [],
  unreadNotificationsCount = 0,
}: ConsultancyNavigationProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const baseSlugHref = `/consultoria/${consultancySlug}`;

  function isItemActive(itemHref: string): boolean {
    if (itemHref === baseSlugHref) {
      return pathname === baseSlugHref;
    }
    return pathname === itemHref || pathname.startsWith(itemHref + "/");
  }

  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close mobile menu during render when pathname changes
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
  }

  // Close mobile menu on escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [mobileMenuOpen]);

  const userInitial = (userName?.trim().charAt(0) || "U").toUpperCase();
  const primaryRoleLabel = roleLabels.length > 0 ? roleLabels[0] : null;

  return (
    <>
      {/* Desktop & Mobile Topbar Header */}
      <header className="sticky top-0 z-30 w-full bg-[var(--surface)] border-b border-[var(--border-default)] shadow-2xs pt-[env(safe-area-inset-top,0px)]">
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
                <p className="text-sm font-bold text-[var(--text-primary)] truncate leading-tight group-hover:text-[var(--brand)] transition-colors">
                  {consultancyName}
                </p>
                {primaryRoleLabel && (
                  <p className="text-[11px] font-medium text-[var(--text-secondary)] truncate leading-tight">
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
                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 ease-out select-none ${
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

              <Link
                href="/selecionar-consultoria"
                className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] rounded-xl transition-colors"
              >
                Trocar consultoria
              </Link>

              {/* User Avatar Pill */}
              <div
                className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] select-none"
                title={userEmail || userName}
              >
                <div className="w-6 h-6 rounded-full bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] text-[var(--brand-foreground)] font-bold flex items-center justify-center text-[11px]">
                  {userInitial}
                </div>
                <span className="font-semibold max-w-[120px] truncate">
                  {userName || "Usuário"}
                </span>
              </div>

              {/* Logout button */}
              <div className="hidden sm:block">
                <LogoutButton
                  logoutAction={logoutFromConsultancyArea}
                  className="px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] rounded-xl transition-colors cursor-pointer"
                >
                  Sair
                </LogoutButton>
              </div>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation-drawer"
                aria-label={mobileMenuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
                className="md:hidden inline-flex items-center justify-center p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
              >
                {mobileMenuOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-full max-h-[85vh] bg-[var(--surface)] rounded-t-3xl border-t border-[var(--border-default)] shadow-xl p-5 space-y-5 overflow-y-auto pb-[calc(2rem+env(safe-area-inset-bottom,0px))]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header in Drawer */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <ConsultancyLogo
                  logoUrl={consultancyLogoUrl}
                  name={consultancyName}
                  size={32}
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                    {consultancyName}
                  </p>
                  {userName && (
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {userName}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar menu"
                className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation links in Drawer */}
            <nav aria-label="Navegação móvel completa" className="space-y-1">
              <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-2 pb-1">
                Navegação
              </p>
              <Link
                href="/notificacoes"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  <span>Notificações</span>
                </div>
                {unreadNotificationsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--brand)] text-white">
                    {unreadNotificationsCount}
                  </span>
                )}
              </Link>

              {items.map((item) => {
                const active = isItemActive(item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      active
                        ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)] border border-[var(--brand-soft-border)]"
                        : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <NavIcon name={item.iconName} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Role Badges */}
            {roleLabels.length > 0 && (
              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
                <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-2">
                  Seus Papéis
                </p>
                <div className="flex flex-wrap gap-1.5 px-2">
                  {roleLabels.map((rl) => (
                    <span
                      key={rl}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-default)]"
                    >
                      {rl}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions in Drawer */}
            <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
              <Link
                href="/selecionar-consultoria"
                className="flex items-center justify-center w-full py-2.5 px-4 text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] rounded-xl transition-colors"
              >
                Trocar consultoria
              </Link>
              <LogoutButton
                logoutAction={logoutFromConsultancyArea}
                className="flex items-center justify-center w-full py-2.5 px-4 text-xs font-semibold text-[var(--danger-foreground)] bg-[var(--danger-soft)] hover:bg-[var(--danger-border)] border border-[var(--danger-border)] rounded-xl transition-colors cursor-pointer"
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
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--surface)] border-t border-[var(--border-default)] pb-[env(safe-area-inset-bottom,0px)] shadow-lg"
      >
        <div className="flex items-center justify-around h-15 px-2">
          {items.slice(0, 4).map((item) => {
            const active = isItemActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 px-1 transition-colors select-none ${
                  active
                    ? "text-[var(--brand)] font-bold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium"
                }`}
              >
                <div className={`p-1 rounded-lg ${active ? "bg-[var(--brand-soft)]" : ""}`}>
                  <NavIcon name={item.iconName} />
                </div>
                <span className="text-[10px] tracking-tight truncate max-w-full">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* If there are more than 4 items or as shortcut to menu */}
          {items.length > 4 && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Mais opções de navegação"
              className="flex flex-col items-center justify-center flex-1 min-w-0 py-1 px-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium select-none"
            >
              <div className="p-1 rounded-lg">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              </div>
              <span className="text-[10px] tracking-tight truncate">Mais</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
