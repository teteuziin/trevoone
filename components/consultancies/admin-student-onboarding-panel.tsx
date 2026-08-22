"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { confirmRequirementAction } from "@/app/consultoria/[slug]/membros/[memberPublicId]/onboarding/actions";
import type {
  AdminStudentOnboardingResult,
  StudentOnboardingRequirementItem,
} from "@/lib/consultancies/student-onboarding";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";

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
            className="inline-flex items-center text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            ← Voltar ao diretório de membros
          </Link>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Onboarding do Aluno
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Revise e confirme o preenchimento dos formulários obrigatórios deste aluno.
        </p>
      </div>

      {/* Student Info & Progress Card */}
      <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Aluno Selecionado
            </span>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {student?.fullName || "Aluno"}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">{student?.email}</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={onboarding.isComplete ? "success" : "warning"}
              size="md"
            >
              {onboarding.isComplete
                ? "Onboarding Concluído"
                : `${onboarding.confirmedRequirements} de ${onboarding.totalRequirements} confirmados`}
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs text-[var(--text-secondary)]">
            <span>Progresso da liberação</span>
            <span className="font-semibold text-[var(--text-primary)]">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--surface-subtle)] overflow-hidden border border-[var(--border-subtle)]">
            <div
              className="h-full bg-[var(--brand-strong)] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Global feedback message */}
      {feedback && !feedback.reqId && (
        <Alert
          variant={feedback.type === "success" ? "success" : "danger"}
          title={feedback.type === "success" ? "Sucesso" : "Atenção"}
        >
          {feedback.message}
        </Alert>
      )}

      {/* Requirements List */}
      <div className="space-y-4">
        {requirements.length === 0 ? (
          <EmptyState
            title="Nenhuma etapa configurada"
            description="Não há requisitos ativos configurados para alunos nesta consultoria."
          />
        ) : (
          requirements.map((req, index) => {
            const hasValidUrl = isValidHttpsUrl(req.externalUrl);
            const isThisConfirming = isPending && confirmingId === req.publicId;

            return (
              <div
                key={req.publicId}
                className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4 hover:border-[var(--border-strong)] transition-colors"
              >
                {/* Header of Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Etapa {index + 1}
                    </span>
                    <h4 className="text-base font-semibold text-[var(--text-primary)] leading-snug">
                      {req.title}
                    </h4>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {req.status === "CONFIRMED" && (
                      <Badge variant="success" size="sm">
                        Confirmado
                      </Badge>
                    )}

                    {req.status === "SUBMITTED" && (
                      <Badge variant="warning" size="sm">
                        Aguardando confirmação
                      </Badge>
                    )}

                    {req.status === "PENDING" && (
                      <Badge variant="neutral" size="sm">
                        Pendente
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Timestamps & Description */}
                <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                  {req.status === "SUBMITTED" && (
                    <div className="space-y-1">
                      <p className="text-[var(--warning-foreground)] font-medium">
                        Informado pelo aluno em: {formatDate(req.submittedAt)}
                      </p>
                      <p className="text-[var(--text-tertiary)]">
                        O aluno declarou ter preenchido o formulário. Verifique o recebimento das
                        respostas e clique em &ldquo;Confirmar&rdquo; para validar esta etapa.
                      </p>
                    </div>
                  )}

                  {req.status === "CONFIRMED" && (
                    <div className="space-y-1">
                      <p className="text-[var(--brand-foreground)] font-medium">
                        Confirmado em: {formatDate(req.confirmedAt)}
                        {req.submittedAt ? ` (informado em ${formatDate(req.submittedAt)})` : ""}
                      </p>
                      <p className="text-[var(--text-tertiary)]">
                        Esta etapa está validada e conta para a liberação de treinos e dieta.
                      </p>
                    </div>
                  )}

                  {req.status === "PENDING" && (
                    <p className="text-[var(--text-tertiary)]">
                      O aluno ainda não informou o preenchimento deste formulário.
                    </p>
                  )}
                </div>

                {/* Item feedback */}
                {feedback && feedback.reqId === req.publicId && (
                  <Alert
                    variant={feedback.type === "success" ? "success" : "danger"}
                    title={feedback.type === "success" ? "Sucesso" : "Atenção"}
                  >
                    {feedback.message}
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
                  {hasValidUrl && (
                    <a
                      href={req.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 py-2 px-4 bg-[var(--surface)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-active)] text-[var(--text-primary)] font-semibold text-xs rounded-lg border border-[var(--border-default)] shadow-2xs transition-colors focus-visible:outline-[var(--brand)]"
                    >
                      <span>Abrir formulário</span>
                      <svg
                        className="w-3.5 h-3.5 text-[var(--text-tertiary)]"
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
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      isLoading={isThisConfirming}
                      disabled={isPending}
                      onClick={() => handleConfirm(req)}
                    >
                      {isThisConfirming ? "Confirmando..." : "Confirmar"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Navigation */}
      <div className="pt-4 border-t border-[var(--border-subtle)]">
        <Link
          href={`/consultoria/${consultancySlug}/membros`}
          className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-[var(--surface)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-active)] border border-[var(--border-default)] text-[var(--text-primary)] font-semibold text-sm rounded-lg shadow-2xs transition-colors focus-visible:outline-[var(--brand)]"
        >
          Voltar ao diretório de membros
        </Link>
      </div>
    </div>
  );
}
