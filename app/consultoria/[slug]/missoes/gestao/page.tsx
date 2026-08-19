import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  listAdminMissions,
  type MissionPriority,
  type MissionStatus,
} from "@/lib/consultancies/missions";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";

export const dynamic = "force-dynamic";

function getStatusBadge(status: MissionStatus, isLate: boolean) {
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold";
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
    <div className="flex items-center gap-1.5 flex-wrap">
      {statusBadge}
      {isLate && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200/60">
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
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
          Alta
        </span>
      );
    case "NORMAL":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
          Normal
        </span>
      );
    case "LOW":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-50 text-zinc-500 border border-zinc-200">
          Baixa
        </span>
      );
  }
}

export default async function AdminMissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const { slug } = await params;
  const { page: rawPage } = await searchParams;
  const currentPage = rawPage ? Number(rawPage) : 1;

  const consultancyContext = await resolveConsultancyContext(session.userId, slug);
  if (!consultancyContext) {
    redirect("/selecionar-consultoria");
  }

  if (!consultancyContext.roles.includes("CONSULTANCY_ADMIN")) {
    redirect(`/consultoria/${slug}`);
  }

  const { items, total, page, totalPages } = await listAdminMissions({
    consultancyId: consultancyContext.consultancyId,
    page: currentPage,
    limit: 20,
  });

  return (
    <ConsultancyAppShell
      consultancyName={consultancyContext.consultancyName}
      consultancySlug={slug}
      consultancyLogoUrl={consultancyContext.consultancyLogoUrl}
      roles={consultancyContext.roles}
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Gestão de Missões
            </h1>
            <p className="text-sm text-zinc-600 mt-0.5">
              Atribua missões a Influenciadores / VIPs, acompanhe prazos e avalie entregas.
            </p>
          </div>

          <Link
            href={`/consultoria/${slug}/missoes/gestao/nova`}
            className="inline-flex items-center justify-center px-4 h-10 bg-[#00A859] hover:bg-[#008f4c] text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:ring-offset-2 shrink-0"
          >
            + Nova Missão
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#00A859] flex items-center justify-center mx-auto text-xl font-bold">
              🎯
            </div>
            <h3 className="text-base font-semibold text-zinc-900">
              Nenhuma missão cadastrada
            </h3>
            <p className="text-sm text-zinc-500 max-w-md mx-auto">
              Crie a primeira missão para orientar a produção de conteúdo e entregas dos seus influenciadores e parceiros VIP.
            </p>
            <div className="pt-2">
              <Link
                href={`/consultoria/${slug}/missoes/gestao/nova`}
                className="inline-flex items-center px-4 py-2 bg-[#00A859] hover:bg-[#008f4c] text-white text-xs font-semibold rounded-lg transition-all"
              >
                Criar missão
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((m) => (
              <Link
                key={m.publicId}
                href={`/consultoria/${slug}/missoes/gestao/${m.publicId}`}
                className="block bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 hover:border-[#00A859]/50 hover:shadow-sm transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-semibold text-zinc-900 group-hover:text-[#00A859] transition-colors truncate">
                        {m.title}
                      </h2>
                      {getPriorityBadge(m.priority)}
                    </div>
                    <div className="text-xs text-zinc-500 flex items-center gap-3 flex-wrap">
                      <span>Destinatário: <strong className="text-zinc-800 font-medium">{m.assigneeName}</strong></span>
                      <span className="text-zinc-300">•</span>
                      <span>Prazo: <strong className="text-zinc-700 font-medium">{m.formattedDueAt}</strong></span>
                      <span className="text-zinc-300">•</span>
                      <span>Fuso: <span className="font-mono text-zinc-600">{m.timezoneSnapshot}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                    {getStatusBadge(m.status, m.isLate)}
                    <span className="text-zinc-400 group-hover:text-zinc-600 group-hover:translate-x-0.5 transition-all text-sm font-medium">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200 text-sm">
            <span className="text-zinc-500">
              Página {page} de {totalPages} ({total} missões)
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/consultoria/${slug}/missoes/gestao?page=${page - 1}`}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-medium text-xs"
                >
                  Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/consultoria/${slug}/missoes/gestao?page=${page + 1}`}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-medium text-xs"
                >
                  Próxima
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
