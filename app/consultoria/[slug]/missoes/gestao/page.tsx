import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { listAdminMissions } from "@/lib/consultancies/missions";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  MissionPriorityBadge,
  MissionStatusGroup,
} from "@/components/missions/mission-ui-badges";
import { AdminExecutiveHeader } from "@/components/admin/admin-executive-header";
import { AdminPageContainer } from "@/components/admin/admin-page-container";

export const dynamic = "force-dynamic";

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
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
      showDashboardWallpaper={true}
    >
      <AdminPageContainer>
        <AdminExecutiveHeader
          eyebrow="● ADMINISTRAÇÃO · GESTÃO"
          title="Gestão de missões"
          subtitle="Atribua missões a Influenciadores / VIPs, acompanhe prazos e avalie entregas."
          backHref={`/consultoria/${slug}`}
          backLabel="Voltar ao Painel"
          badge={total > 0 ? `${total} ${total === 1 ? "missão" : "missões"}` : undefined}
          badgeVariant="neutral"
          primaryAction={
            items.length > 0
              ? {
                  label: "+ Nova Missão",
                  href: `/consultoria/${slug}/missoes/gestao/nova`,
                }
              : undefined
          }
        />

        {items.length === 0 ? (
          <div className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-6 sm:p-10 shadow-sm">
            <EmptyState
              icon={
                <svg
                  className="w-6 h-6 text-zinc-400 dark:text-[#8E95A2]"
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
              title="Nenhuma missão cadastrada"
              description="Crie a primeira missão para orientar a produção de conteúdo e entregas dos seus influenciadores e parceiros VIP."
              action={
                <Link href={`/consultoria/${slug}/missoes/gestao/nova`}>
                  <Button variant="primary" size="md" className="min-h-[44px]">
                    + Nova Missão
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((m) => (
              <Link
                key={m.publicId}
                href={`/consultoria/${slug}/missoes/gestao/${m.publicId}`}
                className="block group focus-visible:outline-none"
              >
                <div className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-4 sm:p-5 shadow-sm group-hover:border-zinc-300 dark:group-hover:border-[#40434C] transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                          {m.title}
                        </h2>
                        <MissionPriorityBadge priority={m.priority} size="sm" />
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-[#8E95A2] flex items-center gap-2.5 flex-wrap">
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-zinc-400 dark:text-[#8E95A2] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Destinatário: <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{m.assigneeName}</strong></span>
                        </span>
                        <span className="text-zinc-300 dark:text-[#303238]">•</span>
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-zinc-400 dark:text-[#8E95A2] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Prazo: <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{m.formattedDueAt}</strong></span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-[#303238]">
                      <MissionStatusGroup status={m.status} isLate={m.isLate} size="sm" />
                      <div className="text-zinc-400 dark:text-[#8E95A2] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all text-xs font-semibold flex items-center gap-0.5 pl-1">
                        <span className="hidden sm:inline">Gerenciar</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-[#303238] text-xs">
            <span className="text-zinc-500 dark:text-[#8E95A2]">
              Página <strong className="text-zinc-900 dark:text-white font-semibold">{page}</strong> de {totalPages} ({total} {total === 1 ? "missão" : "missões"})
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/consultoria/${slug}/missoes/gestao?page=${page - 1}`}>
                  <Button variant="secondary" size="sm" className="min-h-[44px]">
                    Anterior
                  </Button>
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/consultoria/${slug}/missoes/gestao?page=${page + 1}`}>
                  <Button variant="secondary" size="sm" className="min-h-[44px]">
                    Próxima
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </AdminPageContainer>
    </ConsultancyAppShell>
  );
}
