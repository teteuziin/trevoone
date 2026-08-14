"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { submitRequirementAction } from "@/app/consultoria/[slug]/onboarding/actions";
import type {
  StudentOnboardingStatusResult,
  StudentOnboardingRequirementItem,
} from "@/lib/consultancies/student-onboarding";

type Props = {
  consultancySlug: string;
  consultancyName: string;
  initialStatus: StudentOnboardingStatusResult;
};

function isValidHttpsUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith("https://")) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export function StudentOnboardingPanel({
  consultancySlug,
  consultancyName,
  initialStatus,
}: Props) {
  const [feedback, setFeedback] = useState<{
    reqId?: string;
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { totalRequirements, confirmedRequirements, isComplete, requirements } =
    initialStatus;

  const handleSubmit = (req: StudentOnboardingRequirementItem) => {
    setFeedback(null);
    setSubmittingId(req.publicId);

    startTransition(async () => {
      try {
        const res = await submitRequirementAction(consultancySlug, req.publicId);
        if (!res.success) {
          setFeedback({
            reqId: req.publicId,
            type: "error",
            message: res.error || "Não foi possível registrar o envio.",
          });
        } else {
          setFeedback({
            reqId: req.publicId,
            type: "success",
            message: res.message || "Preenchimento declarado com sucesso!",
          });
        }
      } catch {
        setFeedback({
          reqId: req.publicId,
          type: "error",
          message: "Ocorreu um erro inesperado. Tente novamente.",
        });
      } finally {
        setSubmittingId(null);
      }
    });
  };

  const progressPercent =
    totalRequirements > 0
      ? Math.round((confirmedRequirements / totalRequirements) * 100)
      : 100;

  return (
    <div className="w-full max-w-[640px] mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link
            href={`/consultoria/${consultancySlug}`}
            className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            ← Voltar ao painel
          </Link>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
          Complete seu onboarding
        </h1>
        <p className="text-sm text-zinc-600 leading-relaxed">
          Antes de acessar os módulos de <span className="font-semibold text-zinc-800">Treinos</span> e{" "}
          <span className="font-semibold text-zinc-800">Dieta/Nutrição</span> na{" "}
          <span className="font-semibold text-zinc-800">{consultancyName}</span>, seus formulários
          precisam ser preenchidos e confirmados pela equipe.
        </p>
      </div>

      {/* Progress Card */}
      <div className="p-4 sm:p-5 rounded-xl bg-white border border-zinc-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Progresso Geral
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
            {confirmedRequirements} de {totalRequirements} confirmadas
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
          <div
            className="h-full bg-[#00A859] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {isComplete ? (
          <div className="flex items-center gap-2 pt-1 text-xs font-semibold text-[#00A859]">
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Onboarding concluído! Seus acessos estão liberados.</span>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 leading-relaxed">
            Após informar que preencheu cada formulário, a consultoria fará a conferência para
            confirmar seu acesso.
          </p>
        )}
      </div>

      {/* Feedback message global if any */}
      {feedback && !feedback.reqId && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Requirements List */}
      <div className="space-y-4">
        {requirements.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-zinc-50 border border-dashed border-zinc-300 space-y-2">
            <p className="text-sm font-semibold text-zinc-700">
              Nenhuma etapa de onboarding pendente
            </p>
            <p className="text-xs text-zinc-500">
              Não há formulários ou requisitos configurados para esta consultoria.
            </p>
          </div>
        ) : (
          requirements.map((req, index) => {
            const hasValidUrl = isValidHttpsUrl(req.externalUrl);
            const isThisSubmitting = isPending && submittingId === req.publicId;

            return (
              <div
                key={req.publicId}
                className="p-5 rounded-xl bg-white border border-zinc-200 shadow-2xs space-y-4 transition-all"
              >
                {/* Header of Item */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Etapa {index + 1}
                    </span>
                    <h3 className="text-base font-semibold text-zinc-900 leading-snug">
                      {req.title}
                    </h3>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {req.status === "CONFIRMED" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#00A859] border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00A859]" />
                        Confirmado
                      </span>
                    )}

                    {req.status === "SUBMITTED" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Aguardando confirmação
                      </span>
                    )}

                    {req.status === "PENDING" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                        Pendente
                      </span>
                    )}
                  </div>
                </div>

                {/* Body / Description based on Status */}
                <div className="text-xs text-zinc-600 leading-relaxed">
                  {req.status === "CONFIRMED" && (
                    <p className="text-emerald-700">
                      Esta etapa foi verificada e confirmada pela consultoria.
                    </p>
                  )}

                  {req.status === "SUBMITTED" && (
                    <p className="text-amber-800">
                      Você declarou o preenchimento deste formulário. A equipe da consultoria
                      está revisando as respostas para confirmar seu acesso.
                    </p>
                  )}

                  {req.status === "PENDING" && (
                    <p>
                      Abra o formulário externo no link abaixo, responda todas as perguntas e, ao
                      finalizar, clique em &ldquo;Já preenchi&rdquo;.
                    </p>
                  )}
                </div>

                {/* Per-item feedback */}
                {feedback && feedback.reqId === req.publicId && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-semibold ${
                      feedback.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {feedback.message}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
                  {hasValidUrl && (
                    <a
                      href={req.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 py-2 px-4 bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-800 font-semibold text-xs rounded-lg border border-zinc-300 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859]"
                    >
                      <span>Abrir formulário</span>
                      <svg
                        className="w-3.5 h-3.5 text-zinc-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}

                  {req.status === "PENDING" && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSubmit(req)}
                      className="inline-flex items-center justify-center py-2 px-4 bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] disabled:opacity-60 text-white font-semibold text-xs rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:ring-offset-2"
                    >
                      {isThisSubmitting ? (
                        <span className="inline-flex items-center gap-1.5">
                          <svg
                            className="w-3.5 h-3.5 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v8H4z"
                            />
                          </svg>
                          <span>Enviando...</span>
                        </span>
                      ) : (
                        "Já preenchi"
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Navigation */}
      <div className="pt-4 border-t border-zinc-200">
        <Link
          href={`/consultoria/${consultancySlug}`}
          className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-white hover:bg-zinc-50 active:bg-zinc-100 border border-zinc-300 text-zinc-800 font-semibold text-sm rounded-lg shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859]"
        >
          Voltar ao painel da consultoria
        </Link>
      </div>
    </div>
  );
}
