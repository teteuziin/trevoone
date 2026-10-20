"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import type { PatientRecordDetail } from "@/lib/nutrition-v2/patient-record-types";
import { calculateAgeFromBirthDate, normalizeBiologicalSex } from "@/lib/nutrition-v2/clinical-calculations";

function XIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function UserIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

interface PatientCadastralModalProps {
  isOpen: boolean;
  onClose: () => void;
  detail: PatientRecordDetail;
}

export function PatientCadastralModal({
  isOpen,
  onClose,
  detail,
}: PatientCadastralModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prev;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const age = calculateAgeFromBirthDate(
    detail.resolvedBirthDate || detail.record.birthDate || detail.onboardingReference?.birthDate
  );

  const sex =
    detail.resolvedBiologicalSex ||
    normalizeBiologicalSex(detail.record.biologicalSex) ||
    normalizeBiologicalSex(detail.onboardingReference?.sex);
  const sexLabel = sex === "MALE" ? "Masculino" : sex === "FEMALE" ? "Feminino" : "Não informado";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[var(--text-primary)]">
                Dados do Paciente
              </h2>
              <p className="text-xs text-[var(--text-tertiary)]">Informações cadastrais e biometria</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
              Nome Completo
            </span>
            <p className="text-sm font-bold text-[var(--text-primary)]">{detail.student.fullName}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
              E-mail
            </span>
            <p className="font-semibold text-[var(--text-primary)]">{detail.student.email}</p>
          </div>

          {detail.onboardingReference?.phone && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
                Telefone / WhatsApp
              </span>
              <p className="font-semibold text-[var(--text-primary)]">{detail.onboardingReference.phone}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border-subtle)]">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
                Idade
              </span>
              <p className="font-bold text-[var(--text-primary)]">{age ? `${age} anos` : "Não informado"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
                Sexo Biológico
              </span>
              <p className="font-bold text-[var(--text-primary)]">{sexLabel}</p>
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t border-[var(--border-subtle)]">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
              Data de Início
            </span>
            <p className="font-medium text-[var(--text-secondary)]">
              Membro desde {new Date(detail.student.joinedAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-primary)] transition-colors cursor-pointer min-h-[40px]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
