import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { listInfluencerMissions } from "@/lib/consultancies/missions";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import {
  MissionPriorityBadge,
  MissionStatusGroup,
} from "@/components/missions/mission-ui-badges";

export const dynamic = "force-dynamic";

export default async function InfluencerMissionsPage({
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

  if (!consultancyContext.roles.includes("INFLUENCER")) {
    redirect(`/consultoria/${slug}`);
  }

  const { items, total, page, totalPages } = await listInfluencerMissions({
    consultancyId: consultancyContext.consultancyId,
    membershipId: consultancyContext.membershipId,
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
      <div className="space-y-6 max-w-4xl mx-auto pb-10">
        <PageHeader
          eyebrow="INFLUENCIADOR / VIP"
          title="Minhas Missões"
          description="Acompanhe suas tarefas, envie entregas e confira o status de aprovação."
        />

        {items.length === 0 ? (
          <EmptyState
            icon={
              <svg
                className="w-5 h-5 text-[var(--text-tertiary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            }
            title="Nenhuma missão atribuída"
            description="Você ainda não possui missões em andamento. Quando a equipe da consultoria criar uma nova missão para você, ela aparecerá aqui."
          />
        ) : (
          <div className="space-y-3">
            {items.map((m) => (
              <Link
                key={m.publicId}
                href={`/consultoria/${slug}/missoes/${m.publicId}`}
                className="block group focus-visible:outline-none"
              >
                <Surface
                  variant="interactive"
                  padding="md"
                  className="transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                          {m.title}
                        </h2>
                        <MissionPriorityBadge priority={m.priority} size="sm" />
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2.5 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Prazo: <strong className="font-semibold text-[var(--text-primary)]">{m.formattedDueAt}</strong></span>
                        </span>
                        <span className="text-[var(--border-strong)]">•</span>
                        <span className="font-mono text-[11px] text-[var(--text-tertiary)]">{m.timezoneSnapshot}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-[var(--border-subtle)]">
                      <MissionStatusGroup status={m.status} isLate={m.isLate} size="sm" />
                      <div className="text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all text-xs font-semibold flex items-center gap-0.5 pl-1">
                        <span className="hidden sm:inline">Detalhes</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                </Surface>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)] text-xs">
            <span className="text-[var(--text-secondary)]">
              Página <strong className="text-[var(--text-primary)]">{page}</strong> de {totalPages} ({total} {total === 1 ? "missão" : "missões"})
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/consultoria/${slug}/missoes?page=${page - 1}`}>
                  <Button variant="secondary" size="sm">
                    Anterior
                  </Button>
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/consultoria/${slug}/missoes?page=${page + 1}`}>
                  <Button variant="secondary" size="sm">
                    Próxima
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
