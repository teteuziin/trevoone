"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { submitRequirementAction } from "@/app/consultoria/[slug]/onboarding/actions";
import type {
  StudentOnboardingStatusResult,
  StudentOnboardingRequirementItem,
} from "@/lib/consultancies/student-onboarding";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}


export type StudentOnboardingItemPresentation = StudentOnboardingRequirementItem & {
  nativeFormKey: string | null;
  nativeSubmissionStatus: "DRAFT" | "SUBMITTED" | "NOT_STARTED" | null;
  hasNativeContent: boolean;
};

export type StudentOnboardingPresentationStatus = Omit<
  StudentOnboardingStatusResult,
  "requirements"
> & {
  requirements: StudentOnboardingItemPresentation[];
};

type Props = {
  consultancySlug: string;
  consultancyName: string;
  initialStatus: StudentOnboardingPresentationStatus;
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

  const handleSubmit = (req: StudentOnboardingItemPresentation) => {
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors min-h-[44px]"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Voltar ao painel</span>
          </Link>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Complete seu onboarding
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Antes de acessar os módulos de <span className="font-semibold text-[var(--text-primary)]">Treinos</span> e{" "}
          <span className="font-semibold text-[var(--text-primary)]">Dieta/Nutrição</span> na{" "}
          <span className="font-semibold text-[var(--text-primary)]">{consultancyName}</span>, seus formulários
          precisam ser preenchidos e confirmados pela equipe.
        </p>
      </div>

      {/* Progress Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] shadow-card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Progresso Geral
          </span>
          <Badge variant={isComplete ? "brand" : "neutral"} size="sm">
            {confirmedRequirements} de {totalRequirements} confirmadas
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-[var(--surface-subtle)] overflow-hidden">
          <div
            className="h-full bg-[var(--brand)] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {isComplete ? (
          <div className="flex items-center gap-2 pt-1 text-xs font-semibold text-[var(--brand)]">
            <CheckCircleIcon className="w-4 h-4 shrink-0" />
            <span>Onboarding concluído! Seus acessos estão liberados.</span>
          </div>
        ) : (
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Preencha cada formulário para que a equipe técnica confirme e libere suas prescrições.
          </p>
        )}
      </div>

      {/* Feedback message global if any */}
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
            title="Nenhuma etapa de onboarding pendente"
            description="Não há formulários ou requisitos configurados para esta consultoria."
          />
        ) : (
          requirements.map((req, index) => {
            const isNative = Boolean(req.nativeFormKey);
            const nativeUrl = req.nativeFormKey
              ? `/consultoria/${consultancySlug}/onboarding/${req.nativeFormKey}`
              : null;
            const isDraft = req.status === "PENDING" && req.nativeSubmissionStatus === "DRAFT";
            const isThisSubmitting = isPending && submittingId === req.publicId;

            return (
              <div
                key={req.publicId}
                className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] shadow-card space-y-4 hover:border-[var(--brand-border)] transition-colors"
              >
                {/* Header of Item */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Etapa {index + 1}
                    </span>
                    <h3 className="text-base font-semibold text-[var(--text-primary)] leading-snug">
                      {req.title}
                    </h3>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {req.status === "CONFIRMED" && (
                      <Badge variant="brand" size="sm">
                        Confirmado
                      </Badge>
                    )}

                    {req.status === "SUBMITTED" && (
                      <Badge variant="warning" size="sm">
                        Aguardando confirmação
                      </Badge>
                    )}

                    {req.status === "PENDING" && (
                      isDraft ? (
                        <Badge variant="brand" size="sm">
                          Em preenchimento
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Pendente
                        </Badge>
                      )
                    )}
                  </div>
                </div>

                {/* Body / Description based on Status & Native Type */}
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {req.status === "CONFIRMED" && (
                    <p className="text-[var(--brand)] font-medium">
                      Esta etapa foi verificada e confirmada pela consultoria.
                    </p>
                  )}

                  {req.status === "SUBMITTED" && (
                    <p className="text-[var(--warning)] font-medium">
                      {isNative
                        ? "Formulário enviado com sucesso. A equipe da consultoria está revisando as respostas para confirmar seu acesso."
                        : "Você declarou o preenchimento deste formulário. A equipe da consultoria está revisando as respostas para confirmar seu acesso."}
                    </p>
                  )}

                  {req.status === "PENDING" && (
                    isNative ? (
                      isDraft ? (
                        <p>
                          Você possui um rascunho salvo deste formulário. Continue de onde parou para finalizar o envio.
                        </p>
                      ) : (
                        <p>
                          Preencha este formulário diretamente pela plataforma para avançar no seu onboarding.
                        </p>
                      )
                    ) : (
                      <p>
                        Abra o formulário externo no link abaixo, responda todas as perguntas e, ao
                        finalizar, clique em &ldquo;Já preenchi&rdquo;.
                      </p>
                    )
                  )}
                </div>

                {/* Per-item feedback */}
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
                  {/* NATIVE FORM ACTIONS */}
                  {isNative && nativeUrl && (
                    <>
                      {req.status === "PENDING" && (
                        <Link href={nativeUrl} className="w-full sm:w-auto">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            className="w-full sm:w-auto min-h-[44px] px-5 font-semibold"
                          >
                            {isDraft ? "Continuar preenchendo →" : "Começar formulário →"}
                          </Button>
                        </Link>
                      )}

                      {(req.status === "SUBMITTED" || req.status === "CONFIRMED") && (
                        <Link href={nativeUrl} className="w-full sm:w-auto">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto min-h-[44px]"
                          >
                            Ver respostas
                          </Button>
                        </Link>
                      )}
                    </>
                  )}

                  {/* GENERIC EXTERNAL FORM ACTIONS (Non-native only) */}
                  {!isNative && (
                    <>
                      {isValidHttpsUrl(req.externalUrl) && (
                        <a
                          href={req.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 py-2 px-4 bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] active:opacity-90 text-[var(--text-primary)] font-semibold text-xs rounded-xl border border-[var(--border-default)] shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] min-h-[44px]"
                        >
                          <span>Abrir formulário</span>
                          <ExternalLinkIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                        </a>
                      )}

                      {req.status === "PENDING" && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          isLoading={isThisSubmitting}
                          disabled={isPending}
                          onClick={() => handleSubmit(req)}
                          className="min-h-[44px]"
                        >
                          {isThisSubmitting ? "Enviando..." : "Já preenchi"}
                        </Button>
                      )}
                    </>
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
          href={`/consultoria/${consultancySlug}`}
          className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] active:opacity-90 border border-[var(--border-default)] text-[var(--text-primary)] font-semibold text-sm rounded-xl shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] min-h-[44px]"
        >
          Voltar ao painel da consultoria
        </Link>
      </div>
    </div>
  );
}
