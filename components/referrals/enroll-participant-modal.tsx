"use client";

import React, { useState } from "react";
import { UserCheck, UserPlus, X, AlertCircle, CheckCircle2 } from "@/components/referrals/referral-icons";
import { UserAvatar } from "@/components/account/user-avatar";
import type { EligiblePromotionParticipant } from "@/lib/referrals/campaigns";
import { enrollParticipantAction } from "@/app/consultoria/[slug]/indicacoes/actions";

interface EnrollParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  participants: EligiblePromotionParticipant[];
  onSuccess: (enrolledMemberId: number) => void;
}

export function EnrollParticipantModal({
  isOpen,
  onClose,
  consultancySlug,
  participants,
  onSuccess,
}: EnrollParticipantModalProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<number>(
    participants[0]?.memberId ?? 0
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const selectedParticipant = participants.find((p) => p.memberId === selectedMemberId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMemberId) {
      setError("Selecione um participante.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await enrollParticipantAction(consultancySlug, selectedMemberId);
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || "Erro ao ativar participante.");
    } else {
      setSuccess(true);
      setTimeout(() => {
        onSuccess(selectedMemberId);
        onClose();
      }, 1000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Adicionar Participante</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Habilite alunos ou influenciadores no programa</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Participante ativado com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
              Selecione o Membro da Consultoria
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition-colors min-h-[44px]"
              required
            >
              {participants.map((p) => (
                <option key={p.memberId} value={p.memberId} className="bg-white dark:bg-[#151619] text-slate-900 dark:text-white">
                  {p.name} ({p.role === "INFLUENCER" ? "Influenciador / VIP" : "Aluno"})
                  {p.isPromotionEnabled ? " • [Já Habilitado]" : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedParticipant && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
              <div className="flex items-center gap-3">
                <UserAvatar
                  fullName={selectedParticipant.name}
                  userPublicId={selectedParticipant.userPublicId}
                  size="sm"
                />
                <div className="truncate">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                    {selectedParticipant.name}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-semibold">
                    {selectedParticipant.role === "INFLUENCER" ? "Influenciador / VIP" : "Aluno"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/5 text-[11px]">
                <span className="text-slate-500 dark:text-zinc-400">Status atual:</span>
                <span
                  className={`font-semibold ${
                    selectedParticipant.isPromotionEnabled
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {selectedParticipant.isPromotionEnabled ? "Habilitado no programa" : "Não habilitado"}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors min-h-[42px] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer min-h-[42px] flex items-center gap-2 shadow-xs"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isSubmitting ? "Ativando..." : "Habilitar Participante"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
