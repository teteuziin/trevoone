"use client";

import React from "react";
import Link from "next/link";
import {
  DuotoneTrainingIcon,
  DuotoneNutritionIcon,
  DuotoneFormsIcon,
  DuotoneConsultationsIcon,
} from "@/components/ui/icons/duotone-icons";

export interface StudentOverviewHeaderProps {
  consultancySlug: string;
  consultancyName: string;
  userName: string;
  isInfluencer?: boolean;
  isVip?: boolean;
  activeWorkoutTitle?: string | null;
  workoutRoutinesCount?: number;
  activeNutritionTitle?: string | null;
  nutritionMealsCount?: number;
  pendingRequestsCount?: number;
  nextConsultationFormatted?: string | null;
  nextConsultationTitle?: string | null;
}

export function StudentOverviewHeader({
  consultancySlug,
  consultancyName,
  userName,
  isInfluencer = false,
  isVip = false,
  activeWorkoutTitle,
  workoutRoutinesCount = 0,
  activeNutritionTitle,
  nutritionMealsCount = 0,
  pendingRequestsCount = 0,
  nextConsultationFormatted,
  nextConsultationTitle,
}: StudentOverviewHeaderProps) {
  const hasTraining = Boolean(activeWorkoutTitle);
  const hasNutrition = Boolean(activeNutritionTitle);
  const routinesText =
    workoutRoutinesCount === 1 ? "1 rotina ativa" : `${workoutRoutinesCount} rotinas ativas`;

  return (
    <div className="w-full">
      {/* 1. Header Card Sólido Executivo no padrão Treinador Cockpit */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#151619] border border-[#303238] shadow-sm text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            {/* Linha de status com ponto verde e contexto */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
              <span className="text-xs text-[#8E95A2] font-semibold tracking-wide uppercase">
                Acompanhamento do Aluno · {consultancyName}
              </span>
              {isVip && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  VIP
                </span>
              )}
              {isInfluencer && !isVip && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Parceiro
                </span>
              )}
            </div>

            {/* Título forte: Meu acompanhamento */}
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Meu acompanhamento
            </h1>

            {/* Subtítulo limpo: Nome do aluno exibido UMA única vez */}
            <p className="text-xs sm:text-sm text-[#A1A7B4]">
              Aluno: <strong className="text-white font-semibold">{userName}</strong>
            </p>
          </div>

          {/* Atalho rápido secundário */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/consultoria/${consultancySlug}/treinos`}
              className="px-4 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] text-[#E5E7EB] hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
            >
              <span>Ver treinos</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* 2. Faixa Integrada de Indicadores Compactos (sem blocos soltos repetidos) */}
        <div className="mt-5 pt-4 border-t border-[#303238] grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Treino */}
          <Link
            href={`/consultoria/${consultancySlug}/treinos`}
            className="p-3 rounded-xl bg-[#1B1D21]/80 hover:bg-[#252830] border border-[#303238] transition-colors group flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <DuotoneTrainingIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-[#8E95A2] block truncate">
                Ficha de Treino
              </span>
              <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors block truncate">
                {hasTraining ? routinesText : "Sem ficha ativa"}
              </span>
              <span className="text-[10px] text-[#6B7280] block truncate">
                {hasTraining ? activeWorkoutTitle : "Aguardando treinador"}
              </span>
            </div>
          </Link>

          {/* Card 2: Alimentação */}
          <Link
            href={`/consultoria/${consultancySlug}/nutricao`}
            className="p-3 rounded-xl bg-[#1B1D21]/80 hover:bg-[#252830] border border-[#303238] transition-colors group flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <DuotoneNutritionIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-[#8E95A2] block truncate">
                Plano Alimentar
              </span>
              <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors block truncate">
                {hasNutrition ? `${nutritionMealsCount} refeições` : "Sem plano ativo"}
              </span>
              <span className="text-[10px] text-[#6B7280] block truncate">
                {hasNutrition ? activeNutritionTitle : "Aguardando nutricionista"}
              </span>
            </div>
          </Link>

          {/* Card 3: Pendências */}
          <a
            href="#para-responder"
            className="p-3 rounded-xl bg-[#1B1D21]/80 hover:bg-[#252830] border border-[#303238] transition-colors group flex items-start gap-3"
          >
            <div
              className={`p-2 rounded-lg shrink-0 ${
                pendingRequestsCount > 0
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-emerald-500/10 text-emerald-400"
              }`}
            >
              <DuotoneFormsIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-[#8E95A2] block truncate">
                Para Responder
              </span>
              <span
                className={`text-sm font-bold block truncate transition-colors ${
                  pendingRequestsCount > 0
                    ? "text-amber-300 group-hover:text-amber-200"
                    : "text-white group-hover:text-emerald-400"
                }`}
              >
                {pendingRequestsCount > 0
                  ? `${pendingRequestsCount} ${pendingRequestsCount === 1 ? "pendência" : "pendências"}`
                  : "Tudo em dia"}
              </span>
              <span className="text-[10px] text-[#6B7280] block truncate">
                {pendingRequestsCount > 0 ? "Ação solicitada" : "Nenhuma pendência"}
              </span>
            </div>
          </a>

          {/* Card 4: Consultas */}
          <Link
            href={`/consultoria/${consultancySlug}/consultas`}
            className="p-3 rounded-xl bg-[#1B1D21]/80 hover:bg-[#252830] border border-[#303238] transition-colors group flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <DuotoneConsultationsIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-[#8E95A2] block truncate">
                Consultas & Chat
              </span>
              <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors block truncate">
                {nextConsultationFormatted ? nextConsultationFormatted : "Nenhuma agendada"}
              </span>
              <span className="text-[10px] text-[#6B7280] block truncate">
                {nextConsultationTitle || "Atendimento com a equipe"}
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
