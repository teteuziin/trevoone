"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

export interface TrevoChatWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  audienceRole: "STUDENT" | "PROFESSIONAL";
  onComplete: () => Promise<void> | void;
  onDismiss: () => Promise<void> | void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

interface SlideContent {
  title: string;
  text: string;
  badge: string;
  iconName: string;
}

const STUDENT_SLIDES: SlideContent[] = [
  {
    badge: "Boas-vindas",
    title: "Bem-vindo ao Trevo Chat",
    text: "Um espaço para conversar com seu profissional, tirar dúvidas e acompanhar suas orientações dentro do Trevo One.",
    iconName: "chat",
  },
  {
    badge: "Mensagens & Áudios",
    title: "Converse do seu jeito",
    text: "Escreva ou envie um áudio para contar suas dificuldades, compartilhar conquistas e explicar o que você precisa.",
    iconName: "audio",
  },
  {
    badge: "Arquivos & Mídia",
    title: "Mostre para explicar melhor",
    text: "Compartilhe fotos, vídeos e documentos que ajudem seu profissional a entender sua dúvida.",
    iconName: "media",
  },
  {
    badge: "Atendimento Assíncrono",
    title: "Acompanhamento que cabe na sua rotina",
    text: "Vocês não precisam estar conectados ao mesmo tempo. Envie sua mensagem quando puder e acompanhe a resposta dentro do prazo combinado.",
    iconName: "clock",
  },
  {
    badge: "Histórico & Continuidade",
    title: "Suas orientações ficam por aqui",
    text: "Consulte o histórico das conversas e solicite um novo atendimento ou retorno quando precisar.",
    iconName: "history",
  },
];

const PROFESSIONAL_SLIDES: SlideContent[] = [
  {
    badge: "Boas-vindas",
    title: "Bem-vindo ao Trevo Chat",
    text: "Centralize suas conversas e acompanhe seus alunos em um espaço organizado dentro do Trevo One.",
    iconName: "chat",
  },
  {
    badge: "Comunicação Rica",
    title: "Entenda melhor cada necessidade",
    text: "Troque mensagens, áudios, fotos, vídeos e documentos para orientar seus alunos com mais contexto.",
    iconName: "media",
  },
  {
    badge: "Organização por Filas",
    title: "Saiba o que precisa da sua atenção",
    text: "Organize seus atendimentos entre respostas pendentes, solicitações e conversas concluídas.",
    iconName: "queues",
  },
  {
    badge: "Atendimento no seu Ritmo",
    title: "Atenda no ritmo combinado",
    text: "Defina a expectativa de resposta do atendimento e converse sem exigir que vocês estejam conectados ao mesmo tempo.",
    iconName: "clock",
  },
  {
    badge: "Histórico & Retorno",
    title: "Dê continuidade ao acompanhamento",
    text: "Consulte o histórico, registre o encerramento e acompanhe os retornos de cada atendimento.",
    iconName: "history",
  },
];

function SlideIllustration({ type }: { type: string }) {
  switch (type) {
    case "chat":
      return (
        <div className="w-full h-36 sm:h-40 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 dark:from-emerald-950/30 dark:to-emerald-950/10 border border-emerald-500/20 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Trevo One</span>
          </div>
          <div className="w-4/5 max-w-[240px] bg-white dark:bg-[#1E2026] p-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#2E313A] shadow-xs space-y-1.5">
            <div className="h-2 w-3/4 bg-emerald-500/30 rounded-full" />
            <div className="h-2 w-1/2 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
          </div>
        </div>
      );

    case "audio":
      return (
        <div className="w-full h-36 sm:h-40 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 dark:from-emerald-950/30 dark:to-emerald-950/10 border border-emerald-500/20 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-xs">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div className="w-4/5 max-w-[240px] bg-white dark:bg-[#1E2026] p-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#2E313A] shadow-xs flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              ▶
            </span>
            <div className="flex-1 flex items-center gap-1 justify-center">
              <span className="w-1 h-3 bg-emerald-500 rounded-full animate-pulse" />
              <span className="w-1 h-5 bg-emerald-600 rounded-full" />
              <span className="w-1 h-2 bg-emerald-400 rounded-full" />
              <span className="w-1 h-6 bg-emerald-600 rounded-full" />
              <span className="w-1 h-3 bg-emerald-500 rounded-full" />
              <span className="w-1 h-4 bg-emerald-400 rounded-full" />
            </div>
            <span className="text-[10px] font-mono text-zinc-500">0:32</span>
          </div>
        </div>
      );

    case "media":
      return (
        <div className="w-full h-36 sm:h-40 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 dark:from-emerald-950/30 dark:to-emerald-950/10 border border-emerald-500/20 flex items-center justify-center gap-3 p-4 relative overflow-hidden">
          <div className="w-20 h-24 rounded-xl bg-white dark:bg-[#1E2026] border border-[#E5E7EB] dark:border-[#2E313A] p-2 flex flex-col items-center justify-center gap-1 shadow-xs">
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-300">Foto</span>
          </div>
          <div className="w-20 h-24 rounded-xl bg-white dark:bg-[#1E2026] border border-[#E5E7EB] dark:border-[#2E313A] p-2 flex flex-col items-center justify-center gap-1 shadow-xs">
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-300">Vídeo</span>
          </div>
          <div className="w-20 h-24 rounded-xl bg-white dark:bg-[#1E2026] border border-[#E5E7EB] dark:border-[#2E313A] p-2 flex flex-col items-center justify-center gap-1 shadow-xs">
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-300">PDF</span>
          </div>
        </div>
      );

    case "clock":
      return (
        <div className="w-full h-36 sm:h-40 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 dark:from-emerald-950/30 dark:to-emerald-950/10 border border-emerald-500/20 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-xs">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
            </svg>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-white dark:bg-[#1E2026] border border-[#E5E7EB] dark:border-[#2E313A] shadow-xs text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Resposta em até 24h ou 48h</span>
          </div>
        </div>
      );

    case "queues":
      return (
        <div className="w-full h-36 sm:h-40 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 dark:from-emerald-950/30 dark:to-emerald-950/10 border border-emerald-500/20 flex flex-col items-center justify-center gap-2 p-4 relative overflow-hidden">
          <div className="w-4/5 max-w-[240px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E2026] border border-[#E5E7EB] dark:border-[#2E313A] shadow-xs flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">Preciso responder</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">2</span>
          </div>
          <div className="w-4/5 max-w-[240px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E2026] border border-[#E5E7EB] dark:border-[#2E313A] shadow-xs flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">Aguardando aluno</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300">1</span>
          </div>
        </div>
      );

    case "history":
    default:
      return (
        <div className="w-full h-36 sm:h-40 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 dark:from-emerald-950/30 dark:to-emerald-950/10 border border-emerald-500/20 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-xs">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E2026] border border-[#E5E7EB] dark:border-[#2E313A] shadow-xs text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Histórico auditado e preservado</span>
          </div>
        </div>
      );
  }
}

export function TrevoChatWelcomeModal({
  isOpen,
  onClose,
  audienceRole,
  onComplete,
  onDismiss,
  triggerRef,
}: TrevoChatWelcomeModalProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setCurrentSlideIndex(0);
    }
  }

  const slides = audienceRole === "PROFESSIONAL" ? PROFESSIONAL_SLIDES : STUDENT_SLIDES;
  const isFirstSlide = currentSlideIndex === 0;
  const isLastSlide = currentSlideIndex === slides.length - 1;

  const handleDismiss = useCallback(() => {
    onClose();
    onDismiss();
  }, [onClose, onDismiss]);

  const handleFinish = useCallback(() => {
    onClose();
    onComplete();
  }, [onClose, onComplete]);

  // Manage focus restoration & body scroll lock
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = (document.activeElement as HTMLElement) || triggerRef?.current || null;

      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      // Focus modal container
      setTimeout(() => {
        dialogRef.current?.focus();
      }, 50);

      return () => {
        document.body.style.overflow = prevOverflow;
        if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
          previousActiveElementRef.current.focus();
        }
      };
    }
  }, [isOpen, triggerRef]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        handleDismiss();
      } else if (e.key === "ArrowRight") {
        if (!isLastSlide) {
          e.preventDefault();
          setCurrentSlideIndex((prev) => Math.min(prev + 1, slides.length - 1));
        }
      } else if (e.key === "ArrowLeft") {
        if (!isFirstSlide) {
          e.preventDefault();
          setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
        }
      }
    },
    [isOpen, isFirstSlide, isLastSlide, slides.length, handleDismiss]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const currentSlide = slides[currentSlideIndex];

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX - touchEndX;

    if (diffX > 50 && !isLastSlide) {
      // Swiped left -> Next
      setCurrentSlideIndex((prev) => Math.min(prev + 1, slides.length - 1));
    } else if (diffX < -50 && !isFirstSlide) {
      // Swiped right -> Prev
      setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
    }
    setTouchStartX(null);
  };

  const handleNext = () => {
    if (isLastSlide) {
      handleFinish();
    } else {
      setCurrentSlideIndex((prev) => Math.min(prev + 1, slides.length - 1));
    }
  };

  const handleBack = () => {
    if (!isFirstSlide) {
      setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trevo-chat-welcome-title"
      className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={handleDismiss}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-lg bg-white dark:bg-[#16171B] border border-[#E5E7EB] dark:border-[#2E313A] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto flex flex-col justify-between focus:outline-none"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top bar: indicator & Skip button */}
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#22242A]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              {currentSlide.badge}
            </span>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {currentSlideIndex + 1} de {slides.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Pular introdução"
            className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#20232B] transition-colors cursor-pointer"
          >
            Pular introdução
          </button>
        </div>

        {/* Visual Illustration */}
        <div className="my-1">
          <SlideIllustration type={currentSlide.iconName} />
        </div>

        {/* Slide Content */}
        <div className="space-y-2 text-center sm:text-left py-1">
          <h2
            id="trevo-chat-welcome-title"
            className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight"
          >
            {currentSlide.title}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal">
            {currentSlide.text}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 py-1" aria-hidden="true">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlideIndex(idx)}
              aria-label={`Ir para slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentSlideIndex
                  ? "w-6 bg-emerald-600 dark:bg-emerald-500"
                  : "w-1.5 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400"
              }`}
            />
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E5E7EB] dark:border-[#22242A] pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
          <div>
            {!isFirstSlide ? (
              <button
                type="button"
                onClick={handleBack}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#20232B] transition-colors cursor-pointer"
              >
                Voltar
              </button>
            ) : (
              <div className="w-16" />
            )}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            {isLastSlide ? (
              <span>Conhecer o Trevo Chat</span>
            ) : (
              <>
                <span>Próximo</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
