"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { UserAvatar } from "@/components/account/user-avatar";
import { resolveUserIdentity } from "@/lib/auth/user-identity";

export const WELCOME_SESSION_STORAGE_KEY = "trevo_welcome_seen";

export interface PostLoginWelcomeProps {
  userName?: string | null;
  userEmail?: string | null;
  userPublicId?: string | null;
  avatarUrl?: string | null;
  hasProfilePhoto?: boolean;
  profilePhotoUpdatedAt?: Date | string | number | null;
  consultancyName?: string | null;
}

export function PostLoginWelcome({
  userName,
  userEmail,
  userPublicId,
  avatarUrl,
  hasProfilePhoto,
  profilePhotoUpdatedAt,
  consultancyName,
}: PostLoginWelcomeProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showEscapeButton, setShowEscapeButton] = useState(false);

  const storageKey = userPublicId
    ? `${WELCOME_SESSION_STORAGE_KEY}_${userPublicId}`
    : WELCOME_SESSION_STORAGE_KEY;

  const dismiss = useCallback(() => {
    setIsFadingOut(true);
    setIsVisible(false);
    setTimeout(() => {
      setIsMounted(false);
      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("trevo-welcome-finished"));
        }
      } catch {
        // ignore
      }
    }, 200);
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const seen = window.sessionStorage.getItem(storageKey);
        if (seen === "true") {
          return;
        }
        // Registra como visualizado nesta sessão para evitar repetição em navegações internas
        window.sessionStorage.setItem(storageKey, "true");
        window.sessionStorage.setItem(WELCOME_SESSION_STORAGE_KEY, "true");
      }
    } catch {
      // Best-effort storage fallback
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    // Se preferência por movimento reduzido estiver ativa, não retém a tela
    if (prefersReducedMotion) {
      return;
    }

    // Monta suavemente de forma assíncrona
    const enterTimer = setTimeout(() => {
      setIsMounted(true);
      setIsVisible(true);
    }, 20);

    // Duração rápida e elegante: ~650ms de exibição + fade-out suave
    const displayDuration = 650;

    const exitTimer = setTimeout(() => {
      dismiss();
    }, displayDuration);

    // Válvula de segurança: se após 3.5s ainda estiver montado, exibe botão de escape
    const safetyTimer = setTimeout(() => {
      setShowEscapeButton(true);
    }, 3500);

    // Escape listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(safetyTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [storageKey, dismiss]);

  if (!isMounted) {
    return null;
  }

  const identity = resolveUserIdentity({
    fullName: userName,
    email: userEmail,
    userPublicId: userPublicId,
    avatarUrl: avatarUrl,
    hasProfilePhoto: hasProfilePhoto,
    profilePhotoUpdatedAt: profilePhotoUpdatedAt,
  });

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Boas-vindas, ${identity.firstName}`}
      onClick={dismiss}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0C0D10] transition-opacity duration-200 ease-out select-none px-4 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] cursor-pointer ${
        isVisible && !isFadingOut ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Composição Central Sólida e Elegante */}
      <div
        className={`relative flex flex-col items-center text-center max-w-sm sm:max-w-md w-full transition-all duration-200 ease-out ${
          isVisible && !isFadingOut ? "scale-100 translate-y-0" : "scale-95 translate-y-1"
        }`}
      >
        {/* Marca TREVO ONE Completa, sem card cinza envolvente, com alto contraste */}
        <div className="mb-6 sm:mb-8 flex items-center justify-center gap-3">
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
            <Image
              src="/trevo-one-logo.png"
              alt="Trevo One"
              width={44}
              height={44}
              priority
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-extrabold text-2xl sm:text-3xl tracking-tight text-white font-heading">
            Trevo <span className="text-[#10B981]">One</span>
          </span>
        </div>

        {/* Foto do Usuário com acabamento cuidadoso e anel discreto */}
        <div className="relative mb-4 sm:mb-5">
          <div className="relative rounded-full ring-2 ring-[#10B981]/30 p-1 bg-[#151619] border border-[#303238] shadow-lg">
            <UserAvatar
              fullName={identity.fullName}
              userPublicId={identity.userPublicId}
              avatarUrl={identity.avatarUrl}
              hasProfilePhoto={identity.hasProfilePhoto}
              profilePhotoUpdatedAt={identity.profilePhotoUpdatedAt}
              shape="circle"
              size="xl"
              className="w-20 h-20 sm:w-24 sm:h-24 text-2xl sm:text-3xl font-black shadow-md"
            />
          </div>
        </div>

        {/* Saudação com Nome em Destaque Forte */}
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading">
          Olá, {identity.firstName}
        </h1>

        {/* Consultoria como Contexto Secundário */}
        {consultancyName && (
          <p className="mt-1 text-xs sm:text-sm font-medium text-[#8E95A2]">
            {consultancyName}
          </p>
        )}

        {/* Status de Carregamento Discreto e Verdadeiro */}
        <p className="mt-4 text-xs font-semibold text-[#10B981] tracking-wide uppercase">
          Abrindo seu painel...
        </p>

        {/* Linha Fina de Progresso Discreta */}
        <div
          className="mt-2 w-28 sm:w-36 h-1 rounded-full bg-[#1B1D21] border border-[#303238] overflow-hidden"
          aria-hidden="true"
        >
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 animate-pulse rounded-full" />
        </div>

        {/* Saída Recuperável em Caso de Espera Inesperada */}
        {showEscapeButton && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
            className="mt-6 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-[#1B1D21] border border-[#303238] transition-colors"
          >
            Continuar para o painel →
          </button>
        )}
      </div>
    </div>
  );
}
