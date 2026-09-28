"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  requestStudentPhotosAction,
  requestStudentAnamnesisAction,
  requestStudentAssessmentAction,
  requestStudentCustomFormAction,
  getAvailableFormTemplatesAction,
} from "@/app/consultoria/[slug]/progresso/student-request-actions";
import type { AvailableFormTemplateOption } from "@/lib/consultancies/student-requests";

export type RequestModalType = "PHOTOS" | "ANAMNESIS" | "FORM" | "ASSESSMENT";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: RequestModalType;
  consultancySlug: string;
  studentMembershipPublicId: string;
  studentName: string;
  onSuccess?: () => void;
}

export function PersonalRequestModal({
  isOpen,
  onClose,
  type,
  consultancySlug,
  studentMembershipPublicId,
  studentName,
  onSuccess,
}: Props) {
  const [instructions, setInstructions] = useState("");
  const [templates, setTemplates] = useState<AvailableFormTemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen && type === "FORM") {
      getAvailableFormTemplatesAction(consultancySlug)
        .then((res) => {
          if (res.success && res.templates) {
            setTemplates(res.templates);
            if (res.templates.length > 0) {
              setSelectedTemplateId(res.templates[0].publicId);
            }
          } else {
            setError(res.error || "Não foi possível carregar os modelos.");
          }
        })
        .finally(() => setLoadingTemplates(false));
    }
    if (isOpen) {
    }
  }, [isOpen, type, consultancySlug]);

  if (!isOpen) return null;

  const getTitle = () => {
    switch (type) {
      case "PHOTOS":
        return "Solicitar Fotos de Evolução";
      case "ANAMNESIS":
        return "Solicitar Anamnese & Histórico";
      case "ASSESSMENT":
        return "Solicitar Avaliação Física";
      case "FORM":
        return "Solicitar Formulário Personalizado";
    }
  };

  const getDescription = () => {
    switch (type) {
      case "PHOTOS":
        return `O aluno ${studentName} receberá uma notificação solicitando o envio das 4 fotos padronizadas (Frente, Costas, Lateral Esquerda e Direita).`;
      case "ANAMNESIS":
        return `O aluno ${studentName} receberá uma solicitação para preenchimento ou atualização da anamnese e histórico de saúde.`;
      case "ASSESSMENT":
        return `O aluno ${studentName} receberá uma solicitação para preenchimento de medidas e questionário de avaliação física.`;
      case "FORM":
        return `Escolha um formulário para enviar ao aluno ${studentName}. As respostas ficarão disponíveis no Hub do Aluno.`;
    }
  };

  const handleSendRequest = () => {
    startTransition(async () => {
      try {
        let res: { success: boolean; error?: string } = { success: false };

        if (type === "PHOTOS") {
          res = await requestStudentPhotosAction(
            consultancySlug,
            studentMembershipPublicId,
            instructions.trim() || undefined
          );
        } else if (type === "ANAMNESIS") {
          res = await requestStudentAnamnesisAction(
            consultancySlug,
            studentMembershipPublicId
          );
        } else if (type === "ASSESSMENT") {
          res = await requestStudentAssessmentAction(
            consultancySlug,
            studentMembershipPublicId
          );
        } else if (type === "FORM") {
          if (!selectedTemplateId) {
            setError("Selecione um formulário para enviar.");
            return;
          }
          res = await requestStudentCustomFormAction(
            consultancySlug,
            studentMembershipPublicId,
            selectedTemplateId
          );
        }

        if (res.success) {
          setSuccessMsg("Solicitação enviada com sucesso ao aluno!");
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 1200);
        } else {
          setError(res.error || "Ocorreu um erro ao enviar a solicitação.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro de comunicação.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xl p-6 sm:p-7 space-y-5"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--text-primary)]">
              {getTitle()}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Aluno: <strong className="text-[var(--text-primary)]">{studentName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            {getDescription()}
          </p>

          {/* Form Template Picker */}
          {type === "FORM" && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)] block">
                Selecione o Formulário
              </label>
              {loadingTemplates ? (
                <div className="p-3 text-xs text-[var(--text-secondary)] bg-[var(--surface-subtle)] rounded-xl animate-pulse">
                  Carregando formulários disponíveis...
                </div>
              ) : templates.length === 0 ? (
                <div className="p-3 text-xs text-[var(--text-secondary)] bg-[var(--surface-subtle)] rounded-xl">
                  Nenhum formulário personalizado encontrado. Crie um modelo na área de Formulários da consultoria.
                </div>
              ) : (
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs sm:text-sm text-[var(--text-primary)] font-medium focus:outline-none focus:border-[var(--brand)] transition-colors"
                >
                  {templates.map((tmpl) => (
                    <option key={tmpl.publicId} value={tmpl.publicId}>
                      {tmpl.title} ({tmpl.fieldsCount} campos)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Optional Instructions for Photos */}
          {type === "PHOTOS" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)] block">
                Instruções ou orientações adicionais (opcional)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ex: Utilizar mesma iluminação da última avaliação, fundo neutro, sem tênis..."
                rows={3}
                className="w-full p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] transition-colors resize-none"
              />
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium">
              {successMsg}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isPending}
            className="font-bold min-h-[44px]"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSendRequest}
            disabled={isPending || (type === "FORM" && templates.length === 0)}
            className="font-bold min-h-[44px] shadow-xs"
          >
            {isPending ? "Enviando..." : "Enviar Solicitação"}
          </Button>
        </div>
      </div>
    </div>
  );
}
