"use client";

import React, { useState, useEffect } from "react";
import {
  SparklesIcon as Sparkles,
  LayoutIcon as Layout,
  DumbbellIcon as Dumbbell,
  TrendingUpIcon as TrendingUp,
  HelpCircleIcon as HelpCircle,
  ChevronRightIcon as ChevronRight,
  ChevronLeftIcon as ChevronLeft,
  CheckIcon as Check,
  CloseIcon as X,
  LightbulbIcon as Lightbulb,
} from "@/components/ui/icons";

const TUTORIAL_STORAGE_KEY = "trevo_first_access_tutorial_v1";

interface FirstAccessTutorialProps {
  consultancyName?: string;
  forceOpen?: boolean;
  onClose?: () => void;
}

interface TutorialStep {
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: React.ElementType;
  tip?: string;
}

export function FirstAccessTutorial({
  consultancyName = "sua consultoria",
  forceOpen = false,
  onClose,
}: FirstAccessTutorialProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TutorialStep[] = [
    {
      badge: "Bem-vindo",
      title: "Bem-vindo ao Trevo One",
      subtitle: "Sua saúde e performance em um só lugar",
      description: `Você está conectado à ${consultancyName}. Aqui você terá acesso aos seus treinos personalizados, cardápios e evolução com acompanhamento profissional.`,
      icon: Sparkles,
      tip: "Dica: Você pode instalar o Trevo One como aplicativo na tela inicial do seu celular.",
    },
    {
      badge: "Navegação",
      title: "Onde ficam suas funções",
      subtitle: "Navegação rápida e pensada para o celular",
      description: "No celular, utilize o menu inferior fixo para alternar entre Início, Treinos e Cardápio. No computador ou tablet, a barra lateral reúne todas as ferramentas da sua consultoria.",
      icon: Layout,
      tip: "Toque no ícone do Trevo One a qualquer momento para voltar à tela inicial.",
    },
    {
      badge: "Treinos & Dietas",
      title: "Como acessar treinos e planos",
      subtitle: "Prescrição completa na palma da mão",
      description: "Suas fichas contam com séries, repetições, cronômetro de descanso e vídeos de execução. Seus planos alimentares exibem horários, porções e substituições de alimentos.",
      icon: Dumbbell,
      tip: "Ao abrir um treino, registre suas repetições e cargas para acompanhar sua evolução.",
    },
    {
      badge: "Evolução",
      title: "Como acompanhar sua evolução",
      subtitle: "Histórico visual de resultados",
      description: "Registre peso e circunferências corporais. Seu treinador e nutricionista acompanham os números em tempo real para ajustar seu planejamento.",
      icon: TrendingUp,
      tip: "Fotos de evolução e medidas podem ser adicionadas na aba de Progresso.",
    },
    {
      badge: "Suporte",
      title: "Onde encontrar ajuda",
      subtitle: "Central de Ajuda sempre acessível",
      description: "Dúvidas sobre o funcionamento do app, uso offline ou contato com os profissionais? Acesse a Central de Ajuda a qualquer momento no menu ou na sua conta.",
      icon: HelpCircle,
      tip: "Você pode rever este tutorial sempre que quiser na Central de Ajuda.",
    },
  ];

  useEffect(() => {
    if (forceOpen) {
      const timer = setTimeout(() => {
        setCurrentStep(0);
        setIsOpen(true);
      }, 0);
      return () => clearTimeout(timer);
    }

    try {
      const hasSeen = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (!hasSeen) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore localStorage restrictions
    }
  }, [forceOpen]);

  // Listen for custom open event dispatched from anywhere (e.g. Ajuda page)
  useEffect(() => {
    function handleOpenEvent() {
      setCurrentStep(0);
      setIsOpen(true);
    }

    window.addEventListener("trevo:open-tutorial", handleOpenEvent);
    return () => window.removeEventListener("trevo:open-tutorial", handleOpenEvent);
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    } catch {
      // Ignore
    }
    setIsOpen(false);
    onClose?.();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const StepIcon = step.icon;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-[var(--surface)] border border-[var(--border-strong)] p-6 sm:p-8 shadow-2xl space-y-6 depth-surface text-[var(--text-primary)]">
        {/* Top Header: Badge + Close Button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] text-[var(--brand-foreground)]">
              {step.badge}
            </span>
            <span className="text-xs text-[var(--text-tertiary)] font-semibold tabular-nums">
              Passo {currentStep + 1} de {steps.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Pular tutorial"
            className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Step Visual Hero Icon Card */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
          <div className="w-14 h-14 rounded-2xl bg-[var(--brand)] text-[var(--text-inverse)] flex items-center justify-center shrink-0 shadow-sm">
            <StepIcon className="w-7 h-7" strokeWidth={1.75} />
          </div>
          <div className="space-y-0.5 min-w-0">
            <h2
              id="tutorial-title"
              className="text-lg sm:text-xl font-bold font-heading text-[var(--text-primary)] tracking-tight leading-snug"
            >
              {step.title}
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
              {step.subtitle}
            </p>
          </div>
        </div>

        {/* Step Description & Tip */}
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {step.description}
          </p>

          {step.tip && (
            <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-[var(--brand)] shrink-0 mt-0.5" strokeWidth={1.75} />
              <p className="text-[var(--text-secondary)] leading-relaxed">
                {step.tip}
              </p>
            </div>
          )}
        </div>

        {/* Stepper Progress Bar Dots */}
        <div className="flex items-center justify-center gap-1.5 py-1" aria-hidden="true">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? "w-7 bg-[var(--brand)]"
                  : idx < currentStep
                  ? "w-2 bg-[var(--border-strong)]"
                  : "w-2 bg-[var(--border-default)] opacity-50"
              }`}
            />
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]">
          <div>
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
                <span>Voltar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDismiss}
                className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors min-h-[44px] cursor-pointer"
              >
                Pular tutorial
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] shadow-xs transition-all min-h-[44px] depth-interactive cursor-pointer"
          >
            {isLastStep ? (
              <>
                <Check className="w-4 h-4" strokeWidth={2} />
                <span>Concluir</span>
              </>
            ) : (
              <>
                <span>Próximo</span>
                <ChevronRight className="w-4 h-4" strokeWidth={2} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
