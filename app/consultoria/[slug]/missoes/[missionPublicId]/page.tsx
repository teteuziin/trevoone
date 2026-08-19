import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  getMissionDetail,
  type MissionPriority,
  type MissionStatus,
} from "@/lib/consultancies/missions";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { startMissionAction } from "../actions";
import { MissionSubmissionForm } from "./submission-form";

export const dynamic = "force-dynamic";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusBadge(status: MissionStatus, isLate: boolean) {
  const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold";
  let statusBadge = null;

  switch (status) {
    case "PENDING":
      statusBadge = (
        <span className={`${baseClasses} bg-amber-50 text-amber-700 border border-amber-200/60`}>
          Pendente
        </span>
      );
      break;
    case "IN_PROGRESS":
      statusBadge = (
        <span className={`${baseClasses} bg-blue-50 text-blue-700 border border-blue-200/60`}>
          Em andamento
        </span>
      );
      break;
    case "SUBMITTED":
      statusBadge = (
        <span className={`${baseClasses} bg-purple-50 text-purple-700 border border-purple-200/60`}>
          Aguardando revisão
        </span>
      );
      break;
    case "REVISION_REQUESTED":
      statusBadge = (
        <span className={`${baseClasses} bg-orange-50 text-orange-700 border border-orange-200/60`}>
          Revisão solicitada
        </span>
      );
      break;
    case "APPROVED":
      statusBadge = (
        <span className={`${baseClasses} bg-emerald-50 text-[#008f4c] border border-emerald-200/60`}>
          Aprovada
        </span>
      );
      break;
    case "CANCELED":
      statusBadge = (
        <span className={`${baseClasses} bg-zinc-100 text-zinc-500 border border-zinc-200`}>
          Cancelada
        </span>
      );
      break;
    default:
      statusBadge = (
        <span className={`${baseClasses} bg-zinc-100 text-zinc-600 border border-zinc-200`}>
          {status}
        </span>
      );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {statusBadge}
      {isLate && (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200/60">
          Atrasada
        </span>
      )}
    </div>
  );
}

function getPriorityBadge(priority: MissionPriority) {
  switch (priority) {
    case "HIGH":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
          Prioridade Alta
        </span>
      );
    case "NORMAL":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
          Prioridade Normal
        </span>
      );
    case "LOW":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-zinc-50 text-zinc-500 border border-zinc-200">
          Prioridade Baixa
        </span>
      );
  }
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
        <div>
          <Link
            href={`/consultoria/${slug}/missoes`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors mb-3"
          >
            ← Voltar para Minhas Missões
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                  {mission.title}
                </h1>
                {getPriorityBadge(mission.priority)}
              </div>
              <p className="text-xs text-zinc-500">
                Criada em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(mission.createdAt)} por {mission.creatorName}
              </p>
            </div>
            <div className="shrink-0">
              {getStatusBadge(mission.status, mission.isLate)}
            </div>
          </div>
        </div>

        {/* Deadline card */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Prazo limite para conclusão
            </span>
            <div className="text-lg font-bold text-zinc-900 mt-0.5">
              {mission.formattedDueAt}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Fuso horário canônico: <span className="font-mono text-zinc-700 font-medium">{mission.timezoneSnapshot}</span>
            </p>
          </div>

          {mission.startedAt && (
            <div className="sm:text-right text-xs text-zinc-500 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100">
              <span>Iniciada em:</span>
              <div className="font-medium text-zinc-800">
                {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(mission.startedAt)}
              </div>
            </div>
          )}
        </div>

        {/* Objective & Instructions */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-7 space-y-5 shadow-sm">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Objetivo da Missão
            </h2>
            <p className="text-sm text-zinc-900 mt-1.5 leading-relaxed whitespace-pre-line font-medium">
              {mission.objective}
            </p>
          </div>

          <div className="pt-4 border-t border-zinc-100">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Instruções e Orientações
            </h2>
            <div className="text-sm text-zinc-700 mt-1.5 leading-relaxed whitespace-pre-line">
              {mission.instructions}
            </div>
          </div>

          {mission.referenceAttachments.length > 0 && (
            <div className="pt-4 border-t border-zinc-100 space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Arquivos e Materiais de Apoio ({mission.referenceAttachments.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {mission.referenceAttachments.map((att) => (
                  <a
                    key={att.publicId}
                    href={`/consultoria/${slug}/missoes/arquivos/${att.publicId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-zinc-50/50 hover:bg-zinc-50 transition-all text-xs group"
                  >
                    <span className="font-medium text-zinc-800 truncate pr-2 group-hover:text-[#00A859]">
                      📄 {att.fileName}
                    </span>
                    <span className="text-[11px] text-zinc-500 shrink-0 font-mono">
                      {formatFileSize(att.fileSizeBytes)}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Section based on Status */}
        {mission.status === "PENDING" && (
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-6 sm:p-7 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-amber-900">
                Pronto para começar?
              </h3>
              <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
                Leia com atenção os objetivos e instruções acima. Quando estiver pronto para executar a tarefa, clique no botão abaixo para iniciar.
              </p>
            </div>
            <form action={handleStartMission}>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 h-11 bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] text-white font-semibold text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:ring-offset-2"
              >
                Iniciar missão
              </button>
            </form>
          </div>
        )}

        {mission.status === "IN_PROGRESS" && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-7 space-y-5 shadow-sm">
            <div>
              <h3 className="text-base font-semibold text-zinc-900">
                Enviar entrega da missão
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                Envie observações, links de postagens/vídeos e fotos de comprovação do trabalho realizado.
              </p>
            </div>
            <MissionSubmissionForm slug={slug} missionPublicId={missionPublicId} />
          </div>
        )}

        {mission.status === "SUBMITTED" && (
          <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-6 sm:p-7 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">⏳</span>
              <h3 className="text-base font-semibold text-purple-900">
                Entrega enviada — Aguardando revisão
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-purple-800 leading-relaxed">
              Sua entrega foi enviada com sucesso e está na fila de avaliação da consultoria. Você será notificado caso seja solicitada alguma revisão ou quando a missão for aprovada.
            </p>
          </div>
        )}

        {mission.status === "REVISION_REQUESTED" && (
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 sm:p-7 space-y-3">
              <div className="flex items-center gap-2 text-orange-900">
                <span className="text-lg">⚠️</span>
                <h3 className="text-base font-semibold">
                  A equipe da consultoria solicitou uma revisão
                </h3>
              </div>
              <div className="bg-white/80 rounded-xl p-4 border border-orange-200/60 text-sm text-zinc-900 space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-orange-800">
                  Orientações para o ajuste:
                </span>
                <p className="text-sm whitespace-pre-line leading-relaxed">
                  {mission.submissions[0]?.reviewNote || "Por favor, revise os materiais e reenvie a entrega."}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-7 space-y-5 shadow-sm">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">
                  Reenviar entrega ajustada
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                  Preencha os novos links, observações e arquivos corrigidos.
                </p>
              </div>
              <MissionSubmissionForm slug={slug} missionPublicId={missionPublicId} isResubmission />
            </div>
          </div>
        )}

        {mission.status === "APPROVED" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 sm:p-7 space-y-2">
            <div className="flex items-center gap-2 text-[#008f4c]">
              <span className="text-xl">✅</span>
              <h3 className="text-base font-semibold">
                Missão aprovada com sucesso!
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed">
              Parabéns! Sua entrega foi revisada e aprovada pela equipe da consultoria. O histórico completo de envios e avaliações permanece salvo abaixo.
            </p>
          </div>
        )}

        {mission.status === "CANCELED" && (
          <div className="bg-zinc-100 border border-zinc-200 rounded-2xl p-6 sm:p-7 space-y-1">
            <h3 className="text-base font-semibold text-zinc-700">
              Missão cancelada
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500">
              Esta missão foi cancelada pela consultoria em {mission.canceledAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(mission.canceledAt) : "-"}
              {mission.cancelerName ? ` por ${mission.cancelerName}` : ""}.
            </p>
          </div>
        )}

        {/* Submissions History */}
        {mission.submissions.length > 0 && (
          <div className="space-y-4 pt-4">
            <h2 className="text-lg font-bold tracking-tight text-zinc-900">
              Histórico de Entregas ({mission.submissions.length})
            </h2>

            <div className="space-y-4">
              {mission.submissions.map((sub) => (
                <div
                  key={sub.publicId}
                  className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 space-y-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-700 text-xs font-bold flex items-center justify-center">
                        #{sub.sequenceNo}
                      </span>
                      <span className="text-sm font-semibold text-zinc-900">
                        Entrega #{sub.sequenceNo}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-500">
                      Enviada em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(sub.createdAt)} por {sub.submitterName}
                    </span>
                  </div>

                  {sub.notes && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Observações:
                      </span>
                      <p className="text-sm text-zinc-800 whitespace-pre-line leading-relaxed">
                        {sub.notes}
                      </p>
                    </div>
                  )}

                  {sub.links.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Links anexados ({sub.links.length}):
                      </span>
                      <ul className="space-y-1">
                        {sub.links.map((link, idx) => (
                          <li key={idx}>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono text-[#00A859] hover:underline break-all inline-flex items-center gap-1"
                            >
                              🔗 {link.url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {sub.attachments.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Arquivos comprovatórios ({sub.attachments.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sub.attachments.map((att) => (
                          <a
                            key={att.publicId}
                            href={`/consultoria/${slug}/missoes/arquivos/${att.publicId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-zinc-50 hover:bg-zinc-100 transition-all text-xs group"
                          >
                            <span className="font-medium text-zinc-800 truncate pr-2 group-hover:text-[#00A859]">
                              📄 {att.fileName}
                            </span>
                            <span className="text-[11px] text-zinc-500 shrink-0 font-mono">
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
                      className={`rounded-xl p-4 border mt-3 space-y-1.5 ${
                        sub.reviewDecision === "APPROVED"
                          ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                          : "bg-orange-50/80 border-orange-200 text-orange-950"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                        <span>
                          {sub.reviewDecision === "APPROVED" ? "✅ Aprovada na revisão" : "⚠️ Revisão solicitada"}
                        </span>
                        {sub.reviewedAt && (
                          <span className="font-normal opacity-80">
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
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
