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
import { AdminMissionActions } from "./admin-actions-client";

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

export default async function AdminMissionDetailPage({
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

  if (!consultancyContext.roles.includes("CONSULTANCY_ADMIN")) {
    redirect(`/consultoria/${slug}`);
  }

  const mission = await getMissionDetail({
    consultancyId: consultancyContext.consultancyId,
    missionPublicId,
  });

  if (!mission) {
    notFound();
  }

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
            href={`/consultoria/${slug}/missoes/gestao`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors mb-3"
          >
            ← Voltar para Gestão de Missões
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

        {/* Info Grid: Assignee & Deadline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 space-y-1 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Destinatário (Influenciador / VIP)
            </span>
            <div className="text-base font-bold text-zinc-900">
              {mission.assigneeName}
            </div>
            <p className="text-xs text-zinc-500">{mission.assigneeEmail}</p>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 space-y-1 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Prazo Limite (Data / Hora)
            </span>
            <div className="text-base font-bold text-zinc-900">
              {mission.formattedDueAt}
            </div>
            <p className="text-xs text-zinc-500">
              Fuso canônico: <span className="font-mono font-medium text-zinc-700">{mission.timezoneSnapshot}</span>
            </p>
          </div>
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

        {/* Admin Actions Component (Review, Cancel, Attachments) */}
        <AdminMissionActions
          slug={slug}
          missionPublicId={missionPublicId}
          status={mission.status}
        />

        {/* Submissions History */}
        {mission.submissions.length > 0 ? (
          <div className="space-y-4 pt-4">
            <h2 className="text-lg font-bold tracking-tight text-zinc-900">
              Histórico de Entregas do Influenciador ({mission.submissions.length})
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
                        Observações do Influenciador:
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

                  {/* Review decision on this submission */}
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
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center space-y-1 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-800">
              Nenhuma entrega realizada ainda
            </h3>
            <p className="text-xs text-zinc-500">
              Quando o influenciador iniciar e enviar os materiais desta missão, eles aparecerão aqui.
            </p>
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
