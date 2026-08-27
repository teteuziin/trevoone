"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminStudentIntakeResult } from "@/lib/consultancies/student-intake";
import { getIntakeUIFormConfig } from "@/lib/consultancies/intake-ui-config";
import { confirmRequirementAction } from "@/app/consultoria/[slug]/membros/[memberPublicId]/onboarding/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export interface AdminStudentIntakeReviewProps {
  consultancySlug: string;
  memberPublicId: string;
  formKey: string;
  data: AdminStudentIntakeResult;
}

export function AdminStudentIntakeReview({
  consultancySlug,
  memberPublicId,
  formKey,
  data,
}: AdminStudentIntakeReviewProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const { student, form, submission, requirement, isLegacyWithoutNativeContent } = data;
  const uiConfig = getIntakeUIFormConfig(formKey);

  const reqStatus = requirement?.status || "PENDING";
  const isConfirmed = reqStatus === "CONFIRMED";
  const isSubmitted = reqStatus === "SUBMITTED";

  const responses = submission?.responses || {};
  const fieldMap = new Map(form?.fields.map((f) => [f.key, f]) || []);

  const handleConfirm = () => {
    if (!requirement?.publicId || isPending || isConfirmed) return;

    setFeedback(null);
    startTransition(async () => {
      try {
        const res = await confirmRequirementAction(
          consultancySlug,
          memberPublicId,
          requirement.publicId
        );

        if (!res.success) {
          setFeedback({
            type: "error",
            message: res.error || "Não foi possível confirmar o formulário.",
          });
        } else {
          setFeedback({
            type: "success",
            message: res.message || "Formulário confirmado com sucesso!",
          });
          router.refresh();
        }
      } catch {
        setFeedback({
          type: "error",
          message: "Ocorreu um erro inesperado ao confirmar. Tente novamente.",
        });
      }
    });
  };

  const displayTitle = uiConfig?.displayTitle || form?.title || "Formulário de Onboarding";
  const badgeLabel = uiConfig?.badgeLabel || "Revisão de Onboarding";
  const steps = uiConfig?.steps || [];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/consultoria/${consultancySlug}/membros/${memberPublicId}/onboarding`}
          className="inline-flex items-center text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors min-h-[44px]"
        >
          ← Voltar ao Onboarding do Aluno
        </Link>

        <div>
          {isConfirmed && (
            <Badge variant="success" size="md">
              Confirmado • Concluído
            </Badge>
          )}
          {isSubmitted && (
            <Badge variant="warning" size="md">
              Aguardando Confirmação
            </Badge>
          )}
          {reqStatus === "PENDING" && (
            <Badge variant="neutral" size="md">
              Pendente
            </Badge>
          )}
        </div>
      </div>

      {/* Header Info Card */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand)]">
              {badgeLabel}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
              {displayTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)] font-medium pt-1">
              <span>
                Aluno: <strong className="text-[var(--text-primary)]">{student?.fullName || "Aluno"}</strong>
              </span>
              <span>•</span>
              <span className="break-all">{student?.email}</span>
            </div>
          </div>

          {/* Submission / Confirmation dates */}
          <div className="text-xs text-[var(--text-tertiary)] self-start sm:self-auto shrink-0 space-y-0.5 sm:text-right">
            {submission?.submittedAt && (
              <p>
                Enviado em:{" "}
                <strong className="text-[var(--text-secondary)]">
                  {new Date(submission.submittedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </p>
            )}
            {requirement?.confirmedAt && (
              <p>
                Confirmado em:{" "}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {new Date(requirement.confirmedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </p>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <Alert
            variant={feedback.type === "success" ? "success" : "danger"}
            title={feedback.type === "success" ? "Sucesso" : "Atenção"}
          >
            <p className="text-xs">{feedback.message}</p>
          </Alert>
        )}

        {/* Confirmation Action Banner for SUBMITTED state */}
        {isSubmitted && (
          <div className="p-4 rounded-2xl bg-[var(--warning-soft)] border border-[var(--warning-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-[var(--warning-foreground)] uppercase tracking-wider">
                Ação Administrativa Necessária
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Revise as informações preenchidas abaixo e confirme para validar este requisito no onboarding.
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={isPending}
              isLoading={isPending}
              onClick={handleConfirm}
              className="shrink-0 min-h-[44px] px-6 bg-[#00A859] hover:bg-[#008f4c] font-bold"
            >
              {isPending ? "Confirmando..." : "Confirmar formulário ✓"}
            </Button>
          </div>
        )}

        {/* Legacy submission banner */}
        {isLegacyWithoutNativeContent && (
          <Alert variant="info" title="Fluxo de Preenchimento Anterior">
            <p className="text-xs">
              {isConfirmed
                ? "Este requisito foi concluído através do fluxo externo legado."
                : "Este formulário foi declarado como preenchido pelo fluxo anterior. As respostas completas não estão no banco nativo."}
            </p>
          </Alert>
        )}
      </div>

      {/* Structured Responses View */}
      {submission && steps.length > 0 ? (
        <div className="space-y-5">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
            >
              <div className="border-b border-[var(--border-subtle)] pb-2.5">
                <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
                  Seção {idx + 1} de {steps.length}
                </span>
                <h2 className="text-base font-bold text-[var(--text-primary)]">{step.title}</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {step.fieldKeys.map((key) => {
                  const field = fieldMap.get(key);
                  if (!field) return null;
                  const val = responses[key];

                  return (
                    <div
                      key={key}
                      className={`p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1 ${
                        field.type === "LONG_TEXT" ? "sm:col-span-2" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-[var(--text-secondary)] block">
                          {field.label}
                        </span>
                        {!field.required && (
                          <span className="text-[10px] text-[var(--text-tertiary)] italic">
                            opcional
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] break-words whitespace-pre-wrap">
                        {val && val.trim() !== "" ? (
                          val
                        ) : (
                          <span className="text-[var(--text-tertiary)] italic">Não informado</span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : isLegacyWithoutNativeContent ? null : (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Nenhuma resposta registrada
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            O aluno ainda não iniciou ou enviou as respostas deste formulário.
          </p>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="pt-2 flex justify-center">
        <Link href={`/consultoria/${consultancySlug}/membros/${memberPublicId}/onboarding`}>
          <Button variant="outline" size="md" className="min-h-[44px]">
            ← Voltar ao Onboarding do Aluno
          </Button>
        </Link>
      </div>
    </div>
  );
}
