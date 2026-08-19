"use client";

import { useActionState, useState } from "react";
import {
  cancelMissionAction,
  reviewMissionAction,
  uploadReferenceAttachmentAction,
  type AdminMissionActionState,
} from "../actions";
import type { MissionStatus } from "@/lib/consultancies/missions";

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
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Review Actions for SUBMITTED */}
      {status === "SUBMITTED" && (
        <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-purple-950">
              Avaliação da Entrega
            </h3>
            <p className="text-xs sm:text-sm text-purple-800 mt-0.5">
              Esta missão possui uma nova entrega aguardando sua revisão e decisão.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleApprove}
              disabled={isApproving}
              className="px-5 h-10 bg-[#00A859] hover:bg-[#008f4c] text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859] disabled:opacity-60"
            >
              {isApproving ? "Aprovando..." : "✅ Aprovar entrega"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowReviewModal(true);
                setActionError(null);
              }}
              className="px-5 h-10 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              ⚠️ Solicitar revisão
            </button>
          </div>
        </div>
      )}

      {/* Modal / Inline form for Requesting Revision */}
      {showReviewModal && (
        <div className="bg-white border-2 border-orange-300 rounded-2xl p-5 sm:p-6 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-zinc-900">
              Solicitar Revisão da Entrega
            </h3>
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className="text-xs text-zinc-500 hover:text-zinc-800"
            >
              Fechar ✕
            </button>
          </div>

          <form onSubmit={handleRequestRevision} className="space-y-4">
            <div>
              <label
                htmlFor="reviewNote"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
              >
                Orientações para o ajuste *
              </label>
              <textarea
                id="reviewNote"
                rows={4}
                required
                maxLength={2000}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Descreva o que precisa ser corrigido, complementado ou ajustado pelo influenciador..."
                disabled={isSubmittingReview}
                className="w-full p-3.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:opacity-60"
              />
              <p className="mt-1 text-xs text-zinc-500 text-right">{reviewNote.length}/2000</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmittingReview || !reviewNote.trim()}
                className="px-5 h-10 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
              >
                {isSubmittingReview ? "Enviando solicitação..." : "Enviar pedido de revisão"}
              </button>

              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-4 h-10 text-xs sm:text-sm font-medium text-zinc-600 hover:text-zinc-900"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reference file upload for PENDING missions */}
      {status === "PENDING" && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Adicionar Arquivo de Apoio / Referência
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Anexe roteiros, briefings ou imagens de exemplo para o influenciador (JPG, PNG, WEBP ou PDF até 10 MB).
            </p>
          </div>

          {attState?.error && (
            <div className="p-3 rounded-lg bg-red-50 text-xs text-red-700 border border-red-200">
              {attState.error}
            </div>
          )}

          <form action={attFormAction} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input
              type="file"
              name="file"
              required
              accept="image/jpeg,image/png,image/webp,application/pdf"
              disabled={isUploadingAtt}
              className="text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isUploadingAtt}
              className="px-4 h-9 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-60 shrink-0"
            >
              {isUploadingAtt ? "Anexando..." : "Anexar arquivo"}
            </button>
          </form>
        </div>
      )}

      {/* Cancellation section */}
      {canCancel && (
        <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
          {!showCancelConfirm ? (
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors"
            >
              Cancelar esta missão
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2.5 w-full">
              <p className="text-xs font-medium text-red-900">
                Tem certeza que deseja cancelar esta missão? Esta ação é definitiva e não poderá ser desfeita.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelMission}
                  disabled={isCanceling}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-60"
                >
                  {isCanceling ? "Cancelando..." : "Confirmar cancelamento"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
