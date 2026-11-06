"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/account/user-avatar";
import { AppearanceSegmentedControl } from "@/components/consultancies/consultancy-navigation";
import { LogoutButton } from "@/components/notifications/notification-bell";
import { logoutFromConsultancyArea } from "@/app/selecionar-consultoria/actions";

export interface PersonalHeaderProps {
  consultancyName: string;
  consultancySlug: string;
  consultancyLogoUrl?: string | null;
  userName?: string;
  userEmail?: string;
  userPublicId?: string;
  userAvatarUrl?: string | null;
  hasProfilePhoto?: boolean;
  profilePhotoUpdatedAt?: Date | string | number | null;
  roles?: string[];
  activeRoleMode?: string;
  hasMultipleConsultancies?: boolean;
  className?: string;
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ChevronDownIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function SwitchHorizontalIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    </svg>
  );
}

function UserCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function getShortName(fullName?: string): string {
  if (!fullName) return "Treinador";
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || fullName;
}

export function PersonalHeader({
  consultancyName = "Saiya Shape",
  consultancySlug,
  userName = "Treinador",
  userEmail,
  userPublicId,
  userAvatarUrl,
  hasProfilePhoto = false,
  profilePhotoUpdatedAt,
  hasMultipleConsultancies = true,
  className = "",
}: PersonalHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Perfil efetivamente em uso na tela: "Treinador" (sem acumular múltiplos cargos)
  const effectiveRoleLabel = "Treinador";
  const shortName = getShortName(userName);

  // Fechar menu ao clicar fora ou pressionar ESC
  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className={`w-full ${className}`}>
      {/* ============================================================== */}
      {/* 1. VERSÃO MOBILE (< 768px): COMPOSIÇÃO EDITORIAL NÃO-APERTADA  */}
      {/* ============================================================== */}
      <div className="block md:hidden space-y-3 pb-1">
        {/* Linha 1: Identificação do Ambiente (Esq) + Usuário & Foto (Dir) */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          {/* Ambiente: Trevo One em subtítulo e Nome da Consultoria COMPLETO sem cortes */}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] font-semibold text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wider leading-none">
              Trevo One
            </span>
            <span
              title={consultancyName}
              className="text-sm font-black text-gray-900 dark:text-white tracking-tight leading-snug mt-0.5 break-words"
            >
              {consultancyName}
            </span>
          </div>

          {/* Usuário: Primeiro Nome + Cargo "Treinador" + Foto Circular + Toque para Menu */}
          <div className="relative shrink-0">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Abrir menu do perfil do treinador"
              className="min-h-[44px] flex items-center gap-2 px-2.5 py-1 rounded-xl text-left transition-colors bg-white hover:bg-gray-50 dark:bg-[#151619] dark:hover:bg-[#1B1D21] border border-gray-200 dark:border-[#303238] shadow-2xs cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="flex flex-col text-right leading-tight">
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  {shortName}
                </span>
                <span className="text-[10px] font-medium text-gray-500 dark:text-[#9CA3AF] mt-0.5">
                  {effectiveRoleLabel}
                </span>
              </div>

              <UserAvatar
                fullName={userName}
                userPublicId={userPublicId}
                avatarUrl={userAvatarUrl}
                hasProfilePhoto={hasProfilePhoto}
                profilePhotoUpdatedAt={profilePhotoUpdatedAt}
                shape="circle"
                circular
                size="xs"
                className="w-7 h-7 shrink-0 ring-1 ring-black/5 dark:ring-white/10"
              />

              <ChevronDownIcon
                className={`w-3.5 h-3.5 text-gray-400 dark:text-[#9CA3AF] transition-transform duration-150 ${
                  menuOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Linha 2: Título da Tela + Ação Principal "Criar treino" */}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-[#047857] dark:text-emerald-400 tracking-tight leading-none">
              Início
            </h1>
          </div>

          <Link
            href={`/consultoria/${consultancySlug}/rotinas/novo`}
            prefetch={false}
            className="min-h-[44px] px-3.5 sm:px-4 rounded-xl font-bold text-xs sm:text-sm bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center gap-1.5 shadow-xs shrink-0 select-none cursor-pointer active:translate-y-[1px] transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Criar treino</span>
          </Link>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. VERSÃO DESKTOP (>= 768px): SAAS PREMIUM EDITORIAL           */}
      {/* ============================================================== */}
      <div className="hidden md:block space-y-3.5 py-1">
        {/* Nível Superior: Identidade do Ambiente (Esq) + Usuário / Cargo / Foto (Dir) */}
        <div className="flex items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-[#22242A]">
          {/* Esquerda: Identidade Trevo One e Consultoria Ativa */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-black flex items-center justify-center text-xs shrink-0">
              T
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-gray-500 dark:text-[#9CA3AF] tracking-wide">
                Trevo One
              </span>
              <span className="text-gray-300 dark:text-[#4B5563] text-xs select-none">/</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight truncate">
                {consultancyName}
              </span>
            </div>
          </div>

          {/* Direita: Usuário, Cargo e Foto Circular com Menu Dropdown */}
          <div className="relative">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Abrir menu da conta do treinador"
              className="flex items-center gap-3 px-2.5 py-1.5 rounded-xl text-right transition-colors hover:bg-gray-100 dark:hover:bg-[#1B1D21] border border-transparent hover:border-gray-200 dark:hover:border-[#303238] cursor-pointer select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="flex flex-col text-right">
                <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {userName}
                </span>
                <span className="text-[11px] font-medium text-gray-500 dark:text-[#9CA3AF] leading-tight mt-0.5">
                  {effectiveRoleLabel}
                </span>
              </div>

              <UserAvatar
                fullName={userName}
                userPublicId={userPublicId}
                avatarUrl={userAvatarUrl}
                hasProfilePhoto={hasProfilePhoto}
                profilePhotoUpdatedAt={profilePhotoUpdatedAt}
                shape="circle"
                circular
                size="sm"
                className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 ring-1 ring-black/5 dark:ring-white/10"
              />

              <ChevronDownIcon
                className={`w-3.5 h-3.5 text-gray-400 dark:text-[#9CA3AF] transition-transform duration-150 ${
                  menuOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Nível Inferior: Título "Início" + Ação Única Principal "Criar treino" */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#047857] dark:text-emerald-400 tracking-tight">
              Início
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href={`/consultoria/${consultancySlug}/rotinas/novo`}
              prefetch={false}
              className="px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer select-none active:translate-y-[1px]"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Criar treino</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MENU DROPDOWN DE CONTA (DESKTOP & MOBILE COMPARTILHADO)      */}
      {/* ============================================================== */}
      {menuOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Menu de opções da conta"
          className="absolute right-0 top-12 sm:top-14 w-[calc(100vw-24px)] sm:w-72 max-w-72 z-50 rounded-2xl bg-white dark:bg-[#151619] border border-gray-200 dark:border-[#303238] shadow-xl p-3.5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 text-gray-900 dark:text-white"
        >
          {/* Cartão de Resumo do Usuário */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-[#26282E]">
            <UserAvatar
              fullName={userName}
              userPublicId={userPublicId}
              avatarUrl={userAvatarUrl}
              hasProfilePhoto={hasProfilePhoto}
              profilePhotoUpdatedAt={profilePhotoUpdatedAt}
              shape="circle"
              circular
              size="md"
              className="w-10 h-10 shrink-0 ring-1 ring-black/5 dark:ring-white/10"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {userName}
              </p>
              {userEmail && (
                <p className="text-xs text-gray-500 dark:text-[#9CA3AF] truncate mt-0.5">
                  {userEmail}
                </p>
              )}
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 mt-1">
                {effectiveRoleLabel}
              </span>
            </div>
          </div>

          {/* Links Principais da Conta */}
          <div className="space-y-1 text-xs font-semibold">
            <Link
              href="/conta/perfil"
              prefetch={false}
              onClick={() => setMenuOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1B1D21] transition-colors text-gray-700 dark:text-[#E5E7EB]"
            >
              <UserCircleIcon className="w-4 h-4 text-gray-400 dark:text-[#9CA3AF]" />
              <span>Meu perfil</span>
            </Link>

            {/* Troca de consultoria somente quando houver múltiplas consultorias acessíveis */}
            {hasMultipleConsultancies && (
              <Link
                href="/selecionar-consultoria"
                prefetch={false}
                onClick={() => setMenuOpen(false)}
                role="menuitem"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1B1D21] transition-colors text-gray-700 dark:text-[#E5E7EB]"
              >
                <SwitchHorizontalIcon className="w-4 h-4 text-gray-400 dark:text-[#9CA3AF]" />
                <span>Trocar consultoria</span>
              </Link>
            )}
          </div>

          {/* Seletor de Tema (Claro / Escuro / Sistema) */}
          <div className="pt-2.5 border-t border-gray-100 dark:border-[#26282E]">
            <p className="text-[10px] font-bold text-gray-400 dark:text-[#9CA3AF] uppercase tracking-wider px-1 mb-1.5">
              Tema da interface
            </p>
            <AppearanceSegmentedControl compact />
          </div>

          {/* Ação de Logout */}
          <div className="pt-2 border-t border-gray-100 dark:border-[#26282E]">
            <LogoutButton
              logoutAction={logoutFromConsultancyArea}
              className="flex items-center justify-center w-full py-2 px-3 text-xs font-bold rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              Sair da conta
            </LogoutButton>
          </div>
        </div>
      )}
    </header>
  );
}
