"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { confirmRequirementAction } from "@/app/consultoria/[slug]/membros/[memberPublicId]/onboarding/actions";
import type {
  AdminStudentOnboardingResult,
  StudentOnboardingRequirementItem,
} from "@/lib/consultancies/student-onboarding";

type Props = {
  consultancySlug: string;
  memberPublicId: string;
  data: AdminStudentOnboardingResult;
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

function formatDate(date: Date | null): string {
  if (!date) return "-";
  const d = date.getUTCDate().toString().padStart(2, "0");
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const y = date.getUTCFullYear();
  const h = date.getUTCHours().toString().padStart(2, "0");
  const min = date.getUTCMinutes().toString().padStart(2, "0");
  return `${d}/${m}/${y} ${h}:${min}`;
}

export function AdminStudentOnboardingPanel({
  consultancySlug,
  memberPublicId,
  data,
}: Props) {
  const [feedback, setFeedback] = useState<{
    reqId?: string;
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const student = data.student;
  const onboarding = data.onboarding || {
    totalRequirements: 0,
    confirmedRequirements: 0,
    isComplete: false,
  };
  const requirements = data.requirements || [];

  const handleConfirm = (req: StudentOnboardingRequirementItem) => {
    setFeedback(null);
    setConfirmingId(req.publicId);

    startTransition(async () => {
      try {
        const res = await confirmRequirementAction(
          consultancySlug,
          memberPublicId,
          req.publicId
        );
        if (!res.success) {
          setFeedback({
            reqId: req.publicId,
            type: "error",
            message: res.error || "Não foi possível confirmar o requisito.",
          });
        } else {
          setFeedback({
            reqId: req.publicId,
            type: "success",
            message: res.message || "Requisito confirmado com sucesso!",
          });
        }
      } catch {
        setFeedback({
          reqId: req.publicId,
          type: "error",
          message: "Ocorreu um erro inesperado. Tente novamente.",
        });
      } finally {
        setConfirmingId(null);
      }
    });
  };

  const progressPercent =
    onboarding.totalRequirements > 0
      ? Math.round(
          (onboarding.confirmedRequirements / onboarding.totalRequirements) * 100
        )
      : 100;

  return (
    <div className="w-full max-w-[800px] mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link
            href={`/consultoria/${consultancySlug}/membros`}
            className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            ← Voltar ao diretório de membros
          </Link>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
          Onboarding do Aluno
        </h2>
        <p className="text-sm text-zinc-600">
          Revise e confirme o preenchimento dos formulários obrigatórios deste aluno.
        </p>
      </div>

      {/* Student Info & Progress Card */}
      <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Aluno Selecionado
            </span>
            <h3 className="text-base font-bold text-zinc-900">
              {student?.fullName || "Aluno"}
            </h3>
            <p className="text-xs text-zinc-500">{student?.email}</p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                onboarding.isComplete
                  ? "bg-emerald-50 text-[#00A859] border border-emerald-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              {onboarding.isComplete
                ? "Onboarding Concluído"
                : `${onboarding.confirmedRequirements} de ${onboarding.totalRequirements} confirmados`}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Progresso da liberação</span>
            <span className="font-semibold text-zinc-700">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className="h-full bg-[#00A859] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Global feedback message */}
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
              Nenhuma etapa configurada
            </p>
            <p className="text-xs text-zinc-500">
              Não há requisitos ativos configurados para alunos nesta consultoria.
            </p>
          </div>
        ) : (
          requirements.map((req, index) => {
            const hasValidUrl = isValidHttpsUrl(req.externalUrl);
            const isThisConfirming = isPending && confirmingId === req.publicId;

            return (
              <div
                key={req.publicId}
                className="p-5 rounded-xl bg-white border border-zinc-200 shadow-2xs space-y-4 transition-all"
              >
                {/* Header of Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Etapa {index + 1}
                    </span>
                    <h4 className="text-base font-semibold text-zinc-900 leading-snug">
                      {req.title}
                    </h4>
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

                {/* Timestamps & Description */}
                <div className="space-y-1 text-xs text-zinc-600">
                  {req.status === "SUBMITTED" && (
                    <div className="space-y-1">
                      <p className="text-amber-900 font-medium">
                        Informado pelo aluno em: {formatDate(req.submittedAt)}
                      </p>
                      <p className="text-zinc-500">
                        O aluno declarou ter preenchido o formulário. Verifique o recebimento das
                        respostas e clique em &ldquo;Confirmar&rdquo; para validar esta etapa.
                      </p>
                    </div>
                  )}

                  {req.status === "CONFIRMED" && (
                    <div className="space-y-1">
                      <p className="text-emerald-800 font-medium">
                        Confirmado em: {formatDate(req.confirmedAt)}
                        {req.submittedAt ? ` (informado em ${formatDate(req.submittedAt)})` : ""}
                      </p>
                      <p className="text-zinc-500">
                        Esta etapa está validada e conta para a liberação de treinos e dieta.
                      </p>
                    </div>
                  )}

                  {req.status === "PENDING" && (
                    <p className="text-zinc-500">
                      O aluno ainda não informou o preenchimento deste formulário.
                    </p>
                  )}
                </div>

                {/* Item feedback */}
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

                  {req.status === "SUBMITTED" && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleConfirm(req)}
                      className="inline-flex items-center justify-center py-2 px-4 bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] disabled:opacity-60 text-white font-semibold text-xs rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:ring-offset-2"
                    >
                      {isThisConfirming ? (
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
                          <span>Confirmando...</span>
                        </span>
                      ) : (
                        "Confirmar"
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
          href={`/consultoria/${consultancySlug}/membros`}
          className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-white hover:bg-zinc-50 active:bg-zinc-100 border border-zinc-300 text-zinc-800 font-semibold text-sm rounded-lg shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859]"
        >
          Voltar ao diretório de membros
        </Link>
      </div>
    </div>
  );
}
