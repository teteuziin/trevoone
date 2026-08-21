import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getMissionDetail } from "@/lib/consultancies/missions";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import {
  MissionPriorityBadge,
  MissionStatusBadge,
  MissionStatusGroup,
} from "@/components/missions/mission-ui-badges";
import { startMissionAction } from "../actions";
import { MissionSubmissionForm } from "./submission-form";

export const dynamic = "force-dynamic";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function InfluencerMissionDetailPage({
  params,
}: {
  params: Promise<{ slug: string; missionPublicId: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const { slug, missionPublicId } = await params;
  const consultancyContext = await resolveConsultancyContext(session.userId, slug);
  if (!consultancyContext) {
    redirect("/selecionar-consultoria");
  }

  if (!consultancyContext.roles.includes("INFLUENCER")) {
    redirect(`/consultoria/${slug}`);
  }

  const mission = await getMissionDetail({
    consultancyId: consultancyContext.consultancyId,
    missionPublicId,
    forMembershipId: consultancyContext.membershipId,
  });

  if (!mission) {
    notFound();
  }

  const handleStartMission = async () => {
    "use server";
    await startMissionAction(slug, missionPublicId);
  };

  return (
    <ConsultancyAppShell
      consultancyName={consultancyContext.consultancyName}
      consultancySlug={slug}
      consultancyLogoUrl={consultancyContext.consultancyLogoUrl}
      roles={consultancyContext.roles}
    >
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        {/* Header / Breadcrumb */}
        <PageHeader
          backHref={`/consultoria/${slug}/missoes`}
          backLabel="Voltar para Minhas Missões"
          eyebrow="MISSÃO ATRIBUÍDA"
          title={mission.title}
          description={`Criada em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(mission.createdAt)} por ${mission.creatorName}`}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <MissionPriorityBadge priority={mission.priority} size="md" fullLabel />
              <MissionStatusGroup status={mission.status} isLate={mission.isLate} size="md" />
            </div>
          }
        />

        {/* Deadline & Execution Strip */}
        <Surface variant="default" padding="sm" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--brand)] shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Prazo limite para conclusão
                </span>
                <div className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  {mission.formattedDueAt}
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Fuso horário canônico: <span className="font-mono text-[var(--text-primary)] font-medium">{mission.timezoneSnapshot}</span>
                </p>
              </div>
            </div>

            {mission.startedAt && (
              <div className="sm:text-right text-xs text-[var(--text-secondary)] border-t sm:border-t-0 pt-2.5 sm:pt-0 border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-tertiary)] uppercase font-semibold">Iniciada em</span>
                <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(mission.startedAt)}
                </div>
              </div>
            )}
          </div>
        </Surface>

        {/* Objective & Instructions */}
        <Surface variant="default" padding="lg" className="space-y-6">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Objetivo da Missão
            </h2>
            <p className="text-sm text-[var(--text-primary)] mt-1.5 leading-relaxed whitespace-pre-line font-medium">
              {mission.objective}
            </p>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Instruções e Orientações
            </h2>
            <div className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed whitespace-pre-line">
              {mission.instructions}
            </div>
          </div>

          {mission.referenceAttachments.length > 0 && (
            <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Arquivos e Materiais de Apoio ({mission.referenceAttachments.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {mission.referenceAttachments.map((att) => (
                  <a
                    key={att.publicId}
                    href={`/consultoria/${slug}/missoes/arquivos/${att.publicId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition-all text-xs group"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="text-[var(--text-tertiary)] group-hover:text-[var(--brand)] transition-colors">
                        📄
                      </span>
                      <span className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                        {att.fileName}
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--text-tertiary)] shrink-0 font-mono">
                      {formatFileSize(att.fileSizeBytes)}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </Surface>

        {/* Action Section based on Status */}
        {mission.status === "PENDING" && (
          <Surface variant="default" padding="lg" className="border-amber-200 bg-amber-50/50 space-y-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-amber-950">
                Pronto para começar?
              </h3>
              <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
                Leia com atenção os objetivos e instruções acima. Quando estiver pronto para executar a tarefa, clique no botão abaixo para iniciar a contagem de execução.
              </p>
            </div>
            <form action={handleStartMission}>
              <Button type="submit" variant="primary" size="md">
                Iniciar missão
              </Button>
            </form>
          </Surface>
        )}

        {mission.status === "IN_PROGRESS" && (
          <Surface variant="default" padding="lg" className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Enviar entrega da missão
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                Envie observações, links de postagens/vídeos e fotos de comprovação do trabalho realizado.
              </p>
            </div>
            <div className="pt-2">
              <MissionSubmissionForm slug={slug} missionPublicId={missionPublicId} />
            </div>
          </Surface>
        )}

        {mission.status === "SUBMITTED" && (
          <Alert
            variant="info"
            title="Entrega enviada — Aguardando revisão"
          >
            Sua entrega foi enviada com sucesso e está na fila de avaliação da consultoria. Você receberá o parecer caso sejam solicitados ajustes ou quando for aprovada.
          </Alert>
        )}

        {mission.status === "REVISION_REQUESTED" && (
          <div className="space-y-6">
            <Alert
              variant="warning"
              title="A equipe da consultoria solicitou uma revisão"
            >
              {mission.submissions[0]?.reviewNote ? (
                <span className="block mt-1 font-medium text-amber-950 whitespace-pre-line">
                  Orientações: {mission.submissions[0].reviewNote}
                </span>
              ) : (
                "Por favor, revise as orientações e envie uma versão corrigida da entrega."
              )}
            </Alert>

            <Surface variant="default" padding="lg" className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Reenviar entrega ajustada
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                  Preencha os novos links, observações e arquivos corrigidos conforme solicitado.
                </p>
              </div>
              <div className="pt-2">
                <MissionSubmissionForm slug={slug} missionPublicId={missionPublicId} isResubmission />
              </div>
            </Surface>
          </div>
        )}

        {mission.status === "APPROVED" && (
          <Alert
            variant="success"
            title="Missão aprovada com sucesso!"
          >
            Parabéns! Sua entrega foi revisada e aprovada pela consultoria. O histórico completo de envios e avaliações permanece salvo abaixo.
          </Alert>
        )}

        {mission.status === "CANCELED" && (
          <Alert
            variant="info"
            title="Missão cancelada"
          >
            Esta missão foi cancelada pela consultoria em {mission.canceledAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(mission.canceledAt) : "-"}{mission.cancelerName ? ` por ${mission.cancelerName}` : ""}.
          </Alert>
        )}

        {/* Submissions History */}
        {mission.submissions.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)]">
                Histórico de Entregas ({mission.submissions.length})
              </h2>
            </div>

            <div className="space-y-4">
              {mission.submissions.map((sub) => (
                <Surface
                  key={sub.publicId}
                  variant="default"
                  padding="md"
                  className="space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] text-xs font-bold flex items-center justify-center font-mono">
                        #{sub.sequenceNo}
                      </span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        Entrega #{sub.sequenceNo}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">
                      Enviada em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(sub.createdAt)} por {sub.submitterName}
                    </span>
                  </div>

                  {sub.notes && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                        Observações:
                      </span>
                      <p className="text-sm text-[var(--text-primary)] whitespace-pre-line leading-relaxed">
                        {sub.notes}
                      </p>
                    </div>
                  )}

                  {sub.links.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                        Links anexados ({sub.links.length}):
                      </span>
                      <ul className="space-y-1.5">
                        {sub.links.map((link, idx) => (
                          <li key={idx}>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono text-[var(--brand)] hover:underline break-all inline-flex items-center gap-1.5"
                            >
                              <span>🔗</span>
                              <span>{link.url}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {sub.attachments.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                        Arquivos comprovatórios ({sub.attachments.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sub.attachments.map((att) => (
                          <a
                            key={att.publicId}
                            href={`/consultoria/${slug}/missoes/arquivos/${att.publicId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] transition-all text-xs group"
                          >
                            <span className="font-medium text-[var(--text-primary)] truncate pr-2 group-hover:text-[var(--brand)]">
                              📄 {att.fileName}
                            </span>
                            <span className="text-[11px] text-[var(--text-tertiary)] shrink-0 font-mono">
                              {formatFileSize(att.fileSizeBytes)}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review Outcome on this Submission */}
                  {sub.reviewDecision && (
                    <div
                      className={`rounded-xl p-3.5 border mt-3 space-y-1.5 ${
                        sub.reviewDecision === "APPROVED"
                          ? "bg-[var(--success-soft)] border-[var(--success-border)] text-[var(--success-foreground)]"
                          : "bg-[var(--warning-soft)] border-[var(--warning-border)] text-[var(--warning-foreground)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-bold">
                        <div className="flex items-center gap-1.5">
                          <MissionStatusBadge
                            status={sub.reviewDecision === "APPROVED" ? "APPROVED" : "REVISION_REQUESTED"}
                            size="sm"
                          />
                        </div>
                        {sub.reviewedAt && (
                          <span className="font-normal opacity-85 text-[11px]">
                            em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(sub.reviewedAt)}
                            {sub.reviewerName ? ` por ${sub.reviewerName}` : ""}
                          </span>
                        )}
                      </div>
                      {sub.reviewNote && (
                        <p className="text-xs sm:text-sm whitespace-pre-line leading-relaxed pt-1">
                          {sub.reviewNote}
                        </p>
                      )}
                    </div>
                  )}
                </Surface>
              ))}
            </div>
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
