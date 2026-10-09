"use client";

import React, { useState } from "react";
import Link from "next/link";
import type {
  CheckinRequestDto,
  CheckinAdherenceLevel,
  SubmitCheckinResponseInput,
} from "@/lib/nutrition-v2/checkin-types";
import {
  CHECKIN_RATING_LABELS,
  CHECKIN_ENERGY_LABELS,
  CHECKIN_SLEEP_LABELS,
  CHECKIN_TRAINING_LABELS,
} from "@/lib/nutrition-v2/checkin-types";
import { submitCheckinResponseAction } from "@/app/consultoria/[slug]/planos-v2/checkin-actions";

interface StudentCheckinFormProps {
  slug: string;
  request: CheckinRequestDto;
}

export function StudentCheckinForm({ slug, request }: StudentCheckinFormProps) {
  // Form state
  const [adherence, setAdherence] = useState<CheckinAdherenceLevel | null>(null);
  const [hungerRating, setHungerRating] = useState<number | null>(null);
  const [energyRating, setEnergyRating] = useState<number | null>(null);
  const [sleepRating, setSleepRating] = useState<number | null>(null);
  const [trainingRating, setTrainingRating] = useState<number | null>(null);
  const [hydrationLiters, setHydrationLiters] = useState<string>("");
  const [selfReportedWeightKg, setSelfReportedWeightKg] = useState<string>("");
  const [difficultyText, setDifficultyText] = useState<string>("");
  const [studentNotes, setStudentNotes] = useState<string>("");
  const [requestsHelp, setRequestsHelp] = useState<boolean | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  const isExpired = request.derivedState === "EXPIRED";
  const isAlreadyCompleted = request.status === "COMPLETED";
  const isCanceled = request.status === "CANCELED";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adherence) {
      setErrorMessage("Por favor, selecione como foi sua adesão ao plano alimentar.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: SubmitCheckinResponseInput = {
      adherence,
      hungerRating: hungerRating || null,
      energyRating: energyRating || null,
      sleepRating: sleepRating || null,
      trainingRating: trainingRating || null,
      hydrationLiters: hydrationLiters ? parseFloat(hydrationLiters.replace(",", ".")) : null,
      selfReportedWeightKg: selfReportedWeightKg
        ? parseFloat(selfReportedWeightKg.replace(",", "."))
        : null,
      difficultyText: difficultyText.trim() || null,
      studentNotes: studentNotes.trim() || null,
      requestsHelp,
    };

    const res = await submitCheckinResponseAction(slug, request.publicId, payload);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || "Erro ao enviar check-in.");
    } else {
      setIsSubmittedSuccess(true);
    }
  }

  // 1. Estado Expirado
  if (isExpired) {
    return (
      <div className="max-w-lg mx-auto bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-2xl font-bold">
          ⏳
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-[var(--text-primary)] font-heading">
            Este check-in expirou
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
            O prazo para responder a esta solicitação de acompanhamento já encerrou. Sua
            nutricionista poderá solicitar um novo check-in quando necessário.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href={`/consultoria/${slug}`}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)] transition-all min-h-[44px]"
          >
            Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }

  // 2. Já Respondido / Cancelado
  if (isAlreadyCompleted || isCanceled) {
    return (
      <div className="max-w-lg mx-auto bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-2xl font-bold">
          ✓
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-[var(--text-primary)] font-heading">
            {isAlreadyCompleted ? "Check-in já enviado" : "Solicitação cancelada"}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
            {isAlreadyCompleted
              ? "Você já respondeu a este check-in. Suas respostas foram salvas e enviadas à sua nutricionista."
              : "Esta solicitação foi cancelada pela sua nutricionista."}
          </p>
        </div>
        <div className="pt-2">
          <Link
            href={`/consultoria/${slug}`}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-bold transition-all min-h-[44px]"
          >
            Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }

  // 3. Sucesso após Envio
  if (isSubmittedSuccess) {
    return (
      <div className="max-w-lg mx-auto bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-sm animate-in fade-in duration-200">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto text-3xl font-bold">
          ✓
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] font-heading">
            Check-in enviado com sucesso!
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
            Obrigado pelo seu relato. Suas respostas foram sincronizadas com sua nutricionista e
            ajudarão a acompanhar sua evolução até o próximo atendimento.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href={`/consultoria/${slug}`}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs sm:text-sm font-bold transition-all min-h-[44px] shadow-xs"
          >
            Voltar ao Painel
          </Link>
        </div>
      </div>
    );
  }

  // 4. Formulário Aberto (Mobile First, 1 a 2 minutos)
  return (
    <div className="max-w-lg mx-auto bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
      {/* Header */}
      <div className="space-y-1 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand)]" />
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading">
            Check-in de Acompanhamento
          </h2>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Conte para sua nutricionista como foi seu período. Leva menos de 2 minutos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. Adesão (OBRIGATÓRIA) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[var(--text-primary)] block">
            1. Como foi sua adesão ao plano alimentar? <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "LOW", label: "Baixa" },
              { id: "MODERATE", label: "Moderada" },
              { id: "HIGH", label: "Alta" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAdherence(opt.id as CheckinAdherenceLevel)}
                className={`py-3 px-2 text-xs sm:text-sm rounded-xl border font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
                  adherence === opt.id
                    ? "bg-[var(--brand)] text-[var(--text-inverse)] border-[var(--brand)] shadow-xs"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Fome (1 a 5) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
            <span>2. Como ficou sua fome na maior parte dos dias?</span>
            {hungerRating && (
              <span className="text-[var(--brand)] font-extrabold">
                {hungerRating}/5 ({CHECKIN_RATING_LABELS[hungerRating]})
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setHungerRating(lvl)}
                className={`py-2.5 text-xs sm:text-sm rounded-xl border font-bold transition-all cursor-pointer min-h-[44px] flex flex-col items-center justify-center ${
                  hungerRating === lvl
                    ? "bg-[var(--brand)] text-[var(--text-inverse)] border-[var(--brand)] shadow-xs"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <span>{lvl}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] px-1">
            <span>Muito baixa</span>
            <span>Muito alta</span>
          </div>
        </div>

        {/* 3. Disposição / Energia (1 a 5) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
            <span>3. Como ficou sua energia no dia a dia?</span>
            {energyRating && (
              <span className="text-[var(--brand)] font-extrabold">
                {energyRating}/5 ({CHECKIN_ENERGY_LABELS[energyRating]})
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setEnergyRating(lvl)}
                className={`py-2.5 text-xs sm:text-sm rounded-xl border font-bold transition-all cursor-pointer min-h-[44px] flex flex-col items-center justify-center ${
                  energyRating === lvl
                    ? "bg-[var(--brand)] text-[var(--text-inverse)] border-[var(--brand)] shadow-xs"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <span>{lvl}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] px-1">
            <span>Muito baixa</span>
            <span>Excelente</span>
          </div>
        </div>

        {/* 4. Sono (1 a 5) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
            <span>4. Como você avalia seu sono?</span>
            {sleepRating && (
              <span className="text-[var(--brand)] font-extrabold">
                {sleepRating}/5 ({CHECKIN_SLEEP_LABELS[sleepRating]})
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSleepRating(lvl)}
                className={`py-2.5 text-xs sm:text-sm rounded-xl border font-bold transition-all cursor-pointer min-h-[44px] flex flex-col items-center justify-center ${
                  sleepRating === lvl
                    ? "bg-[var(--brand)] text-[var(--text-inverse)] border-[var(--brand)] shadow-xs"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <span>{lvl}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] px-1">
            <span>Muito ruim</span>
            <span>Excelente</span>
          </div>
        </div>

        {/* 5. Rotina de Treinos (1 a 5) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
            <span>5. Como foi sua rotina de treinos?</span>
            {trainingRating && (
              <span className="text-[var(--brand)] font-extrabold">
                {trainingRating}/5 ({CHECKIN_TRAINING_LABELS[trainingRating]})
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setTrainingRating(lvl)}
                className={`py-2.5 text-xs sm:text-sm rounded-xl border font-bold transition-all cursor-pointer min-h-[44px] flex flex-col items-center justify-center ${
                  trainingRating === lvl
                    ? "bg-[var(--brand)] text-[var(--text-inverse)] border-[var(--brand)] shadow-xs"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <span>{lvl}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] px-1">
            <span>Abaixo</span>
            <span>Excelente</span>
          </div>
        </div>

        {/* 6. Hidratação e Peso (opcionais) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)] block">
              6. Água por dia (litros):
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={hydrationLiters}
              onChange={(e) => setHydrationLiters(e.target.value)}
              placeholder="Ex: 2.5"
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 min-h-[44px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)] block">
              7. Peso atual, se souber (kg):
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={selfReportedWeightKg}
              onChange={(e) => setSelfReportedWeightKg(e.target.value)}
              placeholder="Ex: 72.5"
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 min-h-[44px]"
            />
          </div>
        </div>

        {/* 8. Principal Dificuldade */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-primary)] block">
            8. Qual foi sua principal dificuldade? (opcional)
          </label>
          <input
            type="text"
            value={difficultyText}
            onChange={(e) => setDifficultyText(e.target.value)}
            maxLength={250}
            placeholder="Ex: Organizar o jantar durante a semana corrida..."
            className="w-full text-xs sm:text-sm p-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 min-h-[44px]"
          />
        </div>

        {/* 9. Observações do Aluno */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-primary)] block">
            9. Quer contar mais alguma coisa? (opcional)
          </label>
          <textarea
            value={studentNotes}
            onChange={(e) => setStudentNotes(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Algo a mais que queira compartilhar com sua nutricionista..."
            className="w-full text-xs sm:text-sm p-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 min-h-[64px]"
          />
        </div>

        {/* 10. Preciso de Ajuda */}
        <div className="space-y-2 pt-1 border-t border-[var(--border-subtle)]">
          <label className="text-xs font-bold text-[var(--text-primary)] block">
            10. Gostaria que sua nutricionista entrasse em contato antes do próximo retorno?
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRequestsHelp(false)}
              className={`py-2.5 px-3 text-xs sm:text-sm rounded-xl border font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
                requestsHelp === false
                  ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs"
                  : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              Não
            </button>
            <button
              type="button"
              onClick={() => setRequestsHelp(true)}
              className={`py-2.5 px-3 text-xs sm:text-sm rounded-xl border font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
                requestsHelp === true
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/35 shadow-xs font-extrabold"
                  : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              Sim
            </button>
          </div>
        </div>

        {/* Erro */}
        {errorMessage && (
          <div className="p-3 text-xs rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Botão de Envio */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            href={`/consultoria/${slug}`}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] text-center transition-all min-h-[44px] flex items-center justify-center"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs sm:text-sm font-bold active:scale-98 transition-all disabled:opacity-50 cursor-pointer shadow-xs min-h-[44px] flex items-center justify-center"
          >
            {isSubmitting ? "Enviando..." : "Enviar Check-in"}
          </button>
        </div>
      </form>
    </div>
  );
}
