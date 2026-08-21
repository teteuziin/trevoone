"use client";

import { useActionState, useState } from "react";
import {
  cancelMissionAction,
  reviewMissionAction,
  uploadReferenceAttachmentAction,
  type AdminMissionActionState,
} from "../actions";
import type { MissionStatus } from "@/lib/consultancies/missions";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { FormField, Textarea, Label, InputHelper } from "@/components/ui/form-controls";

export function AdminMissionActions({
  slug,
  missionPublicId,
  status,
}: {
  slug: string;
  missionPublicId: string;
  status: MissionStatus;
}) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Reference attachment upload state
  const [attState, attFormAction, isUploadingAtt] = useActionState<AdminMissionActionState | null, FormData>(
    (prevState, formData) => uploadReferenceAttachmentAction(slug, missionPublicId, prevState, formData),
    null
  );

  const handleApprove = async () => {
    if (!confirm("Deseja aprovar a entrega desta missão?")) return;
    setIsApproving(true);
    setActionError(null);
    try {
      const res = await reviewMissionAction(slug, missionPublicId, "APPROVED");
      if (!res.success) {
        setActionError(res.error || "Erro ao aprovar entrega.");
      }
    } catch {
      setActionError("Erro de comunicação ao aprovar entrega.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewNote.trim()) {
      setActionError("Informe as orientações para a revisão solicitada.");
      return;
    }
    setIsSubmittingReview(true);
    setActionError(null);
    try {
      const res = await reviewMissionAction(slug, missionPublicId, "REVISION_REQUESTED", reviewNote);
      if (!res.success) {
        setActionError(res.error || "Erro ao solicitar revisão.");
      } else {
        setShowReviewModal(false);
      }
    } catch {
      setActionError("Erro de comunicação ao solicitar revisão.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleCancelMission = async () => {
    setIsCanceling(true);
    setActionError(null);
    try {
      const res = await cancelMissionAction(slug, missionPublicId);
      if (!res.success) {
        setActionError(res.error || "Erro ao cancelar missão.");
      } else {
        setShowCancelConfirm(false);
      }
    } catch {
      setActionError("Erro de comunicação ao cancelar missão.");
    } finally {
      setIsCanceling(false);
    }
  };

  const canCancel = status === "PENDING" || status === "IN_PROGRESS" || status === "SUBMITTED" || status === "REVISION_REQUESTED";

  return (
    <div className="space-y-6">
      {actionError && (
        <Alert variant="danger" title="Aviso">
          {actionError}
        </Alert>
      )}

      {/* Review Actions for SUBMITTED */}
      {status === "SUBMITTED" && (
        <Surface variant="default" padding="lg" className="border-[var(--brand-soft-border)] bg-[var(--brand-soft)] space-y-4">
          <div>
            <h3 className="text-base font-bold text-[var(--brand-foreground)]">
              Avaliação e Decisão da Entrega
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
              Esta missão possui uma nova entrega aguardando sua revisão. Avalie o material e aprove ou solicite ajustes.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap pt-1">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleApprove}
              isLoading={isApproving}
              disabled={isApproving}
            >
              Aprovar entrega
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                setShowReviewModal(true);
                setActionError(null);
              }}
            >
              Solicitar revisão
            </Button>
          </div>
        </Surface>
      )}

      {/* Modal / Inline form for Requesting Revision */}
      {showReviewModal && (
        <Surface variant="elevated" padding="lg" className="border-amber-300 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Solicitar Revisão da Entrega
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowReviewModal(false)}
            >
              Fechar ✕
            </Button>
          </div>

          <form onSubmit={handleRequestRevision} className="space-y-4">
            <FormField
              id="reviewNote"
              label="Orientações e apontamentos para o ajuste"
              required
              helperText={`${reviewNote.length}/2000 caracteres`}
            >
              <Textarea
                id="reviewNote"
                rows={4}
                required
                maxLength={2000}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Descreva o que precisa ser corrigido, complementado ou ajustado pelo influenciador..."
                disabled={isSubmittingReview}
              />
            </FormField>

            <div className="flex items-center gap-3 pt-1">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmittingReview}
                disabled={isSubmittingReview || !reviewNote.trim()}
              >
                {isSubmittingReview ? "Enviando solicitação..." : "Enviar pedido de revisão"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setShowReviewModal(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Surface>
      )}

      {/* Reference file upload for PENDING missions */}
      {status === "PENDING" && (
        <Surface variant="default" padding="lg" className="space-y-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              Adicionar Arquivo de Apoio / Referência
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
              Anexe roteiros, briefings ou imagens de exemplo para o influenciador (JPG, PNG, WEBP ou PDF até 10 MB).
            </p>
          </div>

          {attState?.error && (
            <Alert variant="danger" title="Erro no anexo">
              {attState.error}
            </Alert>
          )}

          <form action={attFormAction} className="space-y-3">
            <div className="p-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] space-y-2">
              <Label htmlFor="refFile">Selecionar arquivo</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <input
                  id="refFile"
                  type="file"
                  name="file"
                  required
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  disabled={isUploadingAtt}
                  className="block w-full text-xs text-[var(--text-secondary)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--surface)] file:text-[var(--text-primary)] file:border file:border-[var(--border-default)] hover:file:bg-[var(--surface-hover)] cursor-pointer disabled:opacity-60"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  isLoading={isUploadingAtt}
                  disabled={isUploadingAtt}
                  className="shrink-0 w-full sm:w-auto"
                >
                  {isUploadingAtt ? "Anexando..." : "Anexar arquivo"}
                </Button>
              </div>
              <InputHelper variant="default">
                Formatos permitidos: JPG, PNG, WEBP ou PDF até 10 MB.
              </InputHelper>
            </div>
          </form>
        </Surface>
      )}

      {/* Cancellation section */}
      {canCancel && (
        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
          {!showCancelConfirm ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCancelConfirm(true)}
              className="text-[var(--danger)] hover:text-[var(--danger-hover)] hover:bg-[var(--danger-soft)] text-xs font-semibold"
            >
              Cancelar esta missão
            </Button>
          ) : (
            <Surface variant="default" padding="sm" className="border-[var(--danger-border)] bg-[var(--danger-soft)] space-y-3 w-full">
              <p className="text-xs font-semibold text-[var(--danger-foreground)]">
                Tem certeza que deseja cancelar esta missão? Esta ação é definitiva e não poderá ser desfeita.
              </p>
              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleCancelMission}
                  isLoading={isCanceling}
                  disabled={isCanceling}
                >
                  {isCanceling ? "Cancelando..." : "Confirmar cancelamento"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCancelConfirm(false)}
                >
                  Voltar
                </Button>
              </div>
            </Surface>
          )}
        </div>
      )}
    </div>
  );
}
