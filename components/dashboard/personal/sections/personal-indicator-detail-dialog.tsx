"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import type { IndicatorTabType, PersonalFinanceIndicatorData } from "./personal-indicators";
import type { StudentAttentionItem, DraftAttentionItem } from "./personal-attention-section";

export interface PersonalFinanceChargeItem {
  publicId: string;
  studentName: string;
  amountCents: number;
  dueOn: string;
  computedStatus: string;
}

export interface PersonalIndicatorDetailProps {
  consultancySlug: string;
  activeTab: IndicatorTabType;
  isOpen: boolean;
  onClose: () => void;
  satisfactionRating?: number | null;
  totalReviews?: number;
  financeSummary?: PersonalFinanceIndicatorData & {
    upcomingCharges?: PersonalFinanceChargeItem[];
  };
  studentsWithoutWorkout?: StudentAttentionItem[];
  draftWorkouts?: DraftAttentionItem[];
  isEmbeddedDesktop?: boolean;
}

function XIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function formatDateBr(isoDateStr?: string | null): string {
  if (!isoDateStr) return "—";
  if (!isoDateStr.includes("-")) return isoDateStr;
  const parts = isoDateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDateStr;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function PersonalIndicatorDetailContent({
  consultancySlug,
  activeTab,
  satisfactionRating,
  totalReviews = 0,
  financeSummary,
  studentsWithoutWorkout = [],
  draftWorkouts = [],
}: Omit<PersonalIndicatorDetailProps, "isOpen" | "onClose" | "isEmbeddedDesktop">) {
  const hasFinanceAccess = financeSummary?.hasAccess ?? false;
  const toReceiveBrl = (financeSummary?.toReceiveCents || 0) / 100;
  const toReceiveFormatted = `R$ ${toReceiveBrl.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const upcomingCharges = financeSummary?.upcomingCharges || [];

  if (activeTab === "satisfaction") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#303238]">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Satisfação dos Alunos</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Avaliação média de treinos e atendimento
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#F3F4F6] dark:bg-[#1B1D21] text-[var(--text-secondary)] border border-[#E5E7EB] dark:border-[#303238]">
            {totalReviews > 0 ? `${totalReviews} avaliações` : "Coleta não iniciada"}
          </span>
        </div>

        {/* Nota / Estado Real */}
        <div className="p-4 rounded-xl bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex flex-col items-center justify-center shrink-0">
            <span className="text-lg font-black leading-none">
              {satisfactionRating != null ? satisfactionRating.toFixed(1).replace(".", ",") : "—"}
            </span>
            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 mt-0.5">
              / 5.0
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {satisfactionRating != null ? "Média geral calculada" : "Sem avaliações registradas"}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
              {satisfactionRating != null
                ? "Baseada exclusivamente no feedback real enviado pelos seus alunos."
                : "A coleta de avaliações dos alunos sobre os treinos ainda não foi iniciada nesta consultoria."}
            </p>
          </div>
        </div>

        {/* Informações detalhadas */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] space-y-2.5 text-xs text-[var(--text-secondary)] leading-relaxed">
          <p className="font-semibold text-[var(--text-primary)]">
            Transparência Trevo One:
          </p>
          <p>
            • Não geramos notas simuladas, aleatórias ou fictícias em produção.
          </p>
          <p>
            • Quando a funcionalidade de avaliação pós-treino for disponibilizada para os alunos, as notas, comentários e eventuais reclamações aparecerão organizadas neste painel.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href={`/consultoria/${consultancySlug}/progresso/alunos`}
            prefetch={false}
            className="w-full min-h-[44px] px-4 rounded-xl font-semibold text-xs sm:text-sm bg-[#F3F4F6] hover:bg-[#E5E7EB] dark:bg-[#1B1D21] dark:hover:bg-[#252830] text-[var(--text-primary)] border border-[#E5E7EB] dark:border-[#303238] flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            Acompanhar alunos sob gestão →
          </Link>
        </div>
      </div>
    );
  }

  if (activeTab === "finance") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#303238]">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Financeiro</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Valores a receber e próximos vencimentos
            </p>
          </div>
          {hasFinanceAccess && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              Autorizado
            </span>
          )}
        </div>

        {hasFinanceAccess ? (
          <>
            {/* Métricas Principais */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238]">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] block">
                  Total a receber
                </span>
                <span className="text-lg font-black text-[var(--text-primary)] mt-0.5 block">
                  {toReceiveFormatted}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238]">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] block">
                  Vencimentos próximos
                </span>
                <span className="text-lg font-black text-[var(--text-primary)] mt-0.5 block">
                  {financeSummary?.upcomingChargesCount || 0}
                </span>
              </div>
            </div>

            {/* Lista de Cobranças */}
            <div>
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Próximas cobranças
              </p>

              {upcomingCharges.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] text-center text-xs text-[var(--text-secondary)]">
                  Nenhuma cobrança pendente no momento.
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7EB] dark:divide-[#303238] border border-[#E5E7EB] dark:border-[#303238] rounded-xl overflow-hidden bg-white dark:bg-[#151619]">
                  {upcomingCharges.slice(0, 5).map((charge) => {
                    const amountFormatted = `R$ ${(charge.amountCents / 100).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}`;
                    const isOverdue = charge.computedStatus === "OVERDUE";
                    return (
                      <div key={charge.publicId} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-bold text-[var(--text-primary)] truncate">
                            {charge.studentName}
                          </p>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                            Vence em {formatDateBr(charge.dueOn)}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-[var(--text-primary)] block">
                            {amountFormatted}
                          </span>
                          <span
                            className={`inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded mt-0.5 ${
                              isOverdue
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            }`}
                          >
                            {isOverdue ? "Em atraso" : "Pendente"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2">
              <Link
                href={`/consultoria/${consultancySlug}/financeiro`}
                prefetch={false}
                className="w-full min-h-[44px] px-4 rounded-xl font-bold text-xs sm:text-sm bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                Ver painel financeiro completo →
              </Link>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <p className="font-bold text-sm mb-1">Visualização Restrita</p>
              <p>
                Os dados financeiros são restritos aos administradores da consultoria.
              </p>
              <p className="mt-2">
                O seu perfil ativo está focado na gestão técnica e prescrição de treinos. Caso precise de autorização para ver cobranças ou pagamentos, solicite acesso ao administrador da consultoria.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] text-xs text-[var(--text-secondary)] space-y-2">
              <p className="font-semibold text-[var(--text-primary)]">
                Segurança Multi-Tenant:
              </p>
              <p>
                • Nenhuma informação de faturamento ou valores é exposta a perfis sem autorização explícita.
              </p>
              <p>
                • O sistema financeiro opera exclusivamente no servidor com validação rigorosa de permissões.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // activeTab === "issues"
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#303238]">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">Precisa Resolver</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Alunos sem ficha ativa e fichas em rascunho
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
          {studentsWithoutWorkout.length + draftWorkouts.length} pendências
        </span>
      </div>

      {studentsWithoutWorkout.length === 0 && draftWorkouts.length === 0 ? (
        <div className="p-5 rounded-xl bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] text-center space-y-1">
          <p className="text-sm font-bold text-[var(--text-primary)]">Tudo em dia!</p>
          <p className="text-xs text-[var(--text-secondary)]">
            Todos os seus alunos ativos possuem fichas de treino prescritas e não há rascunhos pendentes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Alunos sem ficha */}
          {studentsWithoutWorkout.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Alunos sem ficha ativa ({studentsWithoutWorkout.length})
              </p>
              <div className="divide-y divide-[#E5E7EB] dark:divide-[#303238] border border-[#E5E7EB] dark:border-[#303238] rounded-xl overflow-hidden bg-white dark:bg-[#151619]">
                {studentsWithoutWorkout.map((student) => (
                  <div
                    key={student.membershipPublicId}
                    className="p-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] dark:bg-[#1B1D21] text-[var(--text-primary)] font-bold flex items-center justify-center shrink-0 border border-[#E5E7EB] dark:border-[#303238]">
                        {getInitials(student.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--text-primary)] truncate">
                          {student.name}
                        </p>
                        <span className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold block">
                          Sem treino ativo
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/consultoria/${consultancySlug}/rotinas/novo?student=${encodeURIComponent(
                        student.membershipPublicId
                      )}`}
                      prefetch={false}
                      className="px-3 py-1.5 rounded-lg font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white shrink-0 min-h-[36px] flex items-center justify-center transition-colors"
                    >
                      + Criar treino
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rascunhos */}
          {draftWorkouts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Rascunhos pendentes ({draftWorkouts.length})
              </p>
              <div className="divide-y divide-[#E5E7EB] dark:divide-[#303238] border border-[#E5E7EB] dark:border-[#303238] rounded-xl overflow-hidden bg-white dark:bg-[#151619]">
                {draftWorkouts.map((draft) => (
                  <div
                    key={draft.publicId}
                    className="p-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--text-primary)] truncate">
                        {draft.title}
                      </p>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold block">
                        Rascunho não publicado
                      </span>
                    </div>

                    <Link
                      href={`/consultoria/${consultancySlug}/rotinas/${draft.publicId}`}
                      prefetch={false}
                      className="px-3 py-1.5 rounded-lg font-bold text-xs bg-[#F3F4F6] hover:bg-[#E5E7EB] dark:bg-[#1B1D21] dark:hover:bg-[#252830] text-[var(--text-primary)] border border-[#E5E7EB] dark:border-[#303238] shrink-0 min-h-[36px] flex items-center justify-center transition-colors"
                    >
                      Editar ficha
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PersonalIndicatorDetailDialog({
  consultancySlug,
  activeTab,
  isOpen,
  onClose,
  satisfactionRating,
  totalReviews,
  financeSummary,
  studentsWithoutWorkout,
  draftWorkouts,
}: PersonalIndicatorDetailProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 30);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Detalhes do indicador selecionado"
    >
      <div
        className="w-full sm:max-w-md max-h-[90dvh] flex flex-col bg-white dark:bg-[#151619] border-t sm:border border-[#E5E7EB] dark:border-[#303238] rounded-t-3xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E5E7EB] dark:border-[#303238] shrink-0">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Detalhes do Indicador
          </span>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[#F3F4F6] dark:hover:bg-[#1B1D21] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Fechar detalhes"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-5">
          <PersonalIndicatorDetailContent
            consultancySlug={consultancySlug}
            activeTab={activeTab}
            satisfactionRating={satisfactionRating}
            totalReviews={totalReviews}
            financeSummary={financeSummary}
            studentsWithoutWorkout={studentsWithoutWorkout}
            draftWorkouts={draftWorkouts}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
