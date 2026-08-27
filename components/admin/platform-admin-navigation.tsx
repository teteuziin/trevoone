"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { BetaBadge } from "@/components/brand/beta-badge";
import { NotificationBell, LogoutButton } from "@/components/notifications/notification-bell";
import { AppearanceSegmentedControl } from "@/components/consultancies/consultancy-navigation";
import { logoutFromPlatformAdminArea } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";

export interface PlatformAdminNavigationProps {
  userName?: string;
  userEmail?: string;
  unreadNotificationsCount?: number;
}

/* --------------------------------------------------------------------------
   ICONS
   -------------------------------------------------------------------------- */

function NavHomeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function NavConsultanciesIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function NavBillingIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6.75 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
    </svg>
  );
}

function NavMenuIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function CloseIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/* --------------------------------------------------------------------------
   MAIN COMPONENT
   -------------------------------------------------------------------------- */

export function PlatformAdminNavigation({
  userName,
  userEmail,
  unreadNotificationsCount = 0,
}: PlatformAdminNavigationProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Trap escape key and manage body overflow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    if (drawerOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const navItems = [
    {
      id: "admin-home",
      label: "Início",
      href: "/admin",
      icon: <NavHomeIcon />,
      isActive: pathname === "/admin",
    },
    {
      id: "admin-consultancies",
      label: "Consultorias",
      href: "/admin/consultorias",
      icon: <NavConsultanciesIcon />,
      isActive: pathname.startsWith("/admin/consultorias"),
    },
    {
      id: "admin-billing",
      label: "Cobrança",
      href: "/admin/cobranca-plataforma",
      icon: <NavBillingIcon />,
      isActive: pathname.startsWith("/admin/cobranca-plataforma"),
    },
  ];

  const isMoreActive =
    pathname.startsWith("/conta") ||
    pathname === "/notificacoes" ||
    pathname === "/selecionar-consultoria";

  return (
    <>
      {/* =========================================================================
          DESKTOP & MOBILE TOPBAR (Sticky Top-0)
          ========================================================================= */}
      <header className="sticky top-0 z-30 w-full bg-[var(--surface)] border-b border-[var(--border-default)] transition-colors">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 h-14 sm:h-15 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Brand + Beta + Context */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 min-w-0">
            <Link href="/admin" className="flex items-center gap-2 focus-visible:outline-[var(--brand)]">
              <TrevoOneLogo priority showWordmark size={32} />
            </Link>
            <BetaBadge />
            <span className="hidden md:inline-block text-xs font-semibold text-[var(--border-strong)]">
              |
            </span>
            <span className="hidden md:inline-block text-xs font-semibold tracking-wide text-[var(--text-secondary)] uppercase">
              Governança Global
            </span>
          </div>

          {/* Desktop Nav Links (Center / Left aligned) */}
          <nav aria-label="Navegação administrativa" className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                aria-current={item.isActive ? "page" : undefined}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  item.isActive
                    ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)] font-bold shadow-2xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Right Controls */}
          <div className="hidden md:flex items-center space-x-2.5">
            <Badge variant="brand" size="sm" className="hidden lg:inline-flex text-[11px] font-bold">
              Super Administrador
            </Badge>
            <AppearanceSegmentedControl compact />
            <Link
              href="/conta/perfil"
              className="inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-colors focus-visible:outline-[var(--brand)]"
              title="Meu perfil"
            >
              Perfil
            </Link>
            <Link
              href="/conta/seguranca"
              className="inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-colors focus-visible:outline-[var(--brand)]"
              title="Conta e segurança"
            >
              Segurança
            </Link>
            <NotificationBell unreadCount={unreadNotificationsCount} />
            <LogoutButton
              logoutAction={logoutFromPlatformAdminArea}
              variant="ghost"
              size="sm"
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Sair
            </LogoutButton>
          </div>

          {/* Mobile Right Controls (Compact) */}
          <div className="flex md:hidden items-center space-x-1.5 shrink-0">
            <NotificationBell unreadCount={unreadNotificationsCount} />
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menu de configurações"
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-colors focus-visible:outline-[var(--brand)]"
            >
              <NavMenuIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MOBILE BOTTOM HOTBAR (Fixed Bottom-0, Exclusive for Platform Admin)
          ========================================================================= */}
      <nav
        aria-label="Navegação rápida móvel"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--surface)] border-t border-[var(--border-default)] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-2px_10px_rgba(0,0,0,0.03)] dark:shadow-[0_-2px_12px_rgba(0,0,0,0.25)] transition-colors"
      >
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={item.isActive ? "page" : undefined}
              className={`group flex flex-col items-center justify-center flex-1 min-w-0 min-h-[48px] py-1 px-0.5 transition-all select-none focus-visible:outline-2 focus-visible:outline-[var(--brand)] rounded-xl ${
                item.isActive
                  ? "text-[var(--brand-foreground)] font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all duration-150 ${
                  item.isActive
                    ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)] ring-1 ring-[var(--brand-soft-border)] shadow-2xs"
                    : "group-hover:bg-[var(--surface-hover)]"
                }`}
              >
                {item.icon}
              </div>
              <span className={`text-[10px] tracking-tight truncate max-w-full leading-tight mt-0.5 ${
                item.isActive ? "font-bold text-[var(--brand-foreground)]" : "font-medium"
              }`}>
                {item.label}
              </span>
            </Link>
          ))}

          {/* 4th Item: Mais (Opens Secondary Drawer) */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Mais opções e configurações"
            aria-expanded={drawerOpen}
            className={`group flex flex-col items-center justify-center flex-1 min-w-0 min-h-[48px] py-1 px-0.5 transition-all select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] rounded-xl ${
              isMoreActive
                ? "text-[var(--brand-foreground)] font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all duration-150 ${
                isMoreActive
                  ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)] ring-1 ring-[var(--brand-soft-border)] shadow-2xs"
                  : "group-hover:bg-[var(--surface-hover)]"
              }`}
            >
              <NavMenuIcon className="w-5 h-5" />
            </div>
            <span className={`text-[10px] tracking-tight truncate max-w-full leading-tight mt-0.5 ${
              isMoreActive ? "font-bold text-[var(--brand-foreground)]" : "font-medium"
            }`}>
              Mais
            </span>
          </button>
        </div>
      </nav>

      {/* =========================================================================
          MOBILE DRAWER / MODAL (z-50)
          ========================================================================= */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
          {/* Backdrop Click */}
          <div
            className="fixed inset-0"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu administrativo e configurações"
            className="relative w-full max-h-[85vh] overflow-y-auto bg-[var(--surface)] border-t border-[var(--border-default)] rounded-t-3xl p-5 space-y-5 shadow-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] animate-in slide-in-from-bottom duration-200"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  Painel de Governança
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Plataforma Trevo One
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fechar menu"
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-[var(--brand)]"
              >
                <CloseIcon />
              </button>
            </div>

            {/* User Profile Card */}
            {(userName || userEmail) && (
              <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                    {userName || "Super Administrador"}
                  </p>
                  {userEmail && (
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {userEmail}
                    </p>
                  )}
                </div>
                <Badge variant="brand" size="sm" className="shrink-0 text-[10px] font-bold">
                  Super Admin
                </Badge>
              </div>
            )}

            {/* Theme Toggle Section */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Aparência
              </span>
              <AppearanceSegmentedControl compact />
            </div>

            {/* Secondary Action Links */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Opções da Conta
              </span>
              <div className="space-y-1">
                <Link
                  href="/notificacoes"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-sm font-semibold text-[var(--text-primary)] transition-colors min-h-[44px]"
                >
                  <div className="flex items-center gap-2">
                    <span>Notificações</span>
                    {unreadNotificationsCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[var(--brand)] text-white text-[10px] font-bold leading-none">
                        {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)]">→</span>
                </Link>

                <Link
                  href="/conta/perfil"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-sm font-semibold text-[var(--text-primary)] transition-colors min-h-[44px]"
                >
                  <span>Meu perfil</span>
                  <span className="text-xs text-[var(--text-tertiary)]">→</span>
                </Link>

                <Link
                  href="/conta/seguranca"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-sm font-semibold text-[var(--text-primary)] transition-colors min-h-[44px]"
                >
                  <span>Conta e segurança</span>
                  <span className="text-xs text-[var(--text-tertiary)]">→</span>
                </Link>

                <Link
                  href="/selecionar-consultoria"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-sm font-semibold text-[var(--text-primary)] transition-colors min-h-[44px]"
                >
                  <span>Alternar para Consultorias</span>
                  <span className="text-xs text-[var(--text-tertiary)]">→</span>
                </Link>
              </div>
            </div>

            {/* Logout */}
            <div className="pt-2">
              <LogoutButton
                logoutAction={logoutFromPlatformAdminArea}
                variant="outline"
                size="md"
                className="w-full justify-center text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900 min-h-[44px]"
              >
                Encerrar Sessão
              </LogoutButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
