// Consultancy members and invitations directory
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  listConsultancyMembers,
  ADMIN_ROLE_LABELS,
} from "@/lib/consultancies/admin";
import { listConsultancyInvitations } from "@/lib/consultancies/invitations";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { InvitationForm } from "@/components/consultancies/invitation-form";
import { InvitationRevokeButton } from "@/components/consultancies/invitation-revoke-button";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
};

function formatDate(date: Date): string {
  const d = date.getUTCDate().toString().padStart(2, "0");
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const y = date.getUTCFullYear();
  const h = date.getUTCHours().toString().padStart(2, "0");
  const min = date.getUTCMinutes().toString().padStart(2, "0");
  return `${d}/${m}/${y} ${h}:${min}`;
}

export default async function ConsultancyMembersPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { q, page } = await searchParams;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  // Apenas membros com CONSULTANCY_ADMIN podem acessar /membros
  if (!context.roles.includes("CONSULTANCY_ADMIN")) {
    redirect(`/consultoria/${slug}`);
  }

  const query = typeof q === "string" ? q.trim() : "";
  const pageNum = Number(page);
  const validPage = !isNaN(pageNum) && pageNum >= 1 ? Math.floor(pageNum) : 1;

  // Buscar membros e convites em paralelo
  const [{ members, total, page: currentPage, totalPages }, invitations] =
    await Promise.all([
      listConsultancyMembers({
        consultancyId: context.consultancyId,
        query,
        page: validPage,
        pageSize: 25,
      }),
      listConsultancyInvitations(context.consultancyId),
    ]);

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="space-y-8">
        {/* Page Header */}
        <PageHeader
          title="Membros e Convites"
          description="Gerencie os participantes, convites pendentes e permissões de acesso da consultoria."
          backHref={`/consultoria/${slug}`}
          backLabel="Voltar à visão geral"
        />

        {/* 1. Formulário de Novo Convite */}
        <section aria-labelledby="invitation-form-heading">
          <InvitationForm slug={slug} />
        </section>

        {/* 2. Listagem de Convites Recentes */}
        {invitations.length > 0 && (
          <section aria-labelledby="invitations-list-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="invitations-list-heading" className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                Convites recentes ({invitations.length})
              </h2>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-[var(--surface)] rounded-xl border border-[var(--border-default)] shadow-xs overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--surface-subtle)] border-b border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">
                      Convidado
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      Funções
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      Expiração
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      Status
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {invitations.map((inv) => (
                    <tr key={inv.publicId} className="hover:bg-[var(--surface-hover)] transition-colors">
                      <td className="px-5 py-4 min-w-0">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-[var(--text-primary)] truncate text-sm">
                            {inv.email}
                          </p>
                          <p className="text-[11px] text-[var(--text-tertiary)]">
                            Criado em {formatDate(inv.createdAt)}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {inv.roles.map((role) => (
                            <Badge key={role} variant="brand" size="sm">
                              {ADMIN_ROLE_LABELS[role] || role}
                            </Badge>
                          ))}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                        {formatDate(inv.expiresAt)}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            inv.status === "PENDING"
                              ? "warning"
                              : inv.status === "ACCEPTED"
                              ? "success"
                              : inv.status === "REVOKED"
                              ? "danger"
                              : "neutral"
                          }
                          size="sm"
                        >
                          {inv.statusLabel}
                        </Badge>
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {inv.status === "PENDING" && (
                          <InvitationRevokeButton
                            slug={slug}
                            invitationPublicId={inv.publicId}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {invitations.map((inv) => (
                <div
                  key={inv.publicId}
                  className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border-default)] shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {inv.email}
                      </p>
                      <p className="text-[11px] text-[var(--text-tertiary)]">
                        Criado em {formatDate(inv.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        inv.status === "PENDING"
                          ? "warning"
                          : inv.status === "ACCEPTED"
                          ? "success"
                          : inv.status === "REVOKED"
                          ? "danger"
                          : "neutral"
                      }
                      size="sm"
                    >
                      {inv.statusLabel}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {inv.roles.map((role) => (
                      <Badge key={role} variant="brand" size="sm">
                        {ADMIN_ROLE_LABELS[role] || role}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                    <span>Expira em: {formatDate(inv.expiresAt)}</span>
                    {inv.status === "PENDING" && (
                      <InvitationRevokeButton
                        slug={slug}
                        invitationPublicId={inv.publicId}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. Diretório de Membros */}
        <section aria-labelledby="members-directory-heading" className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
          <div className="space-y-1">
            <h2 id="members-directory-heading" className="text-base font-bold text-[var(--text-primary)] tracking-tight">
              Diretório de Membros
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Pessoas atualmente vinculadas à consultoria ({total} {total === 1 ? "membro registrado" : "membros registrados"}).
            </p>
          </div>

          {/* Search Bar */}
          <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border-default)] shadow-xs">
            <form method="get" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-tertiary)]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  name="q"
                  id="members_search_input"
                  aria-label="Buscar membros por nome ou e-mail"
                  defaultValue={query}
                  placeholder="Buscar por nome ou e-mail..."
                  className="w-full h-10 pl-10 pr-4 text-sm bg-[var(--surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-[var(--brand)] transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  className="w-full sm:w-auto h-10 px-5 bg-[var(--brand-strong)] hover:bg-[var(--brand)] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors focus-visible:outline-[var(--brand)] flex items-center justify-center"
                >
                  Buscar
                </button>

                {query.length > 0 && (
                  <Link
                    href={`/consultoria/${slug}/membros`}
                    className="w-full sm:w-auto h-10 px-4 bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] text-[var(--text-primary)] text-xs sm:text-sm font-medium rounded-lg border border-[var(--border-default)] transition-colors flex items-center justify-center"
                  >
                    Limpar
                  </Link>
                )}
              </div>
            </form>
          </div>

          {/* Members Directory Content */}
          {members.length === 0 ? (
            <EmptyState
              title={
                query.length > 0
                  ? "Nenhum membro encontrado para esta busca"
                  : "Nenhum membro registrado"
              }
              description={
                query.length > 0
                  ? "Tente buscar utilizando outros termos ou limpe o filtro de busca."
                  : "Esta consultoria ainda não possui membros registrados."
              }
            />
          ) : (
            <div className="space-y-4">
              {/* Desktop Table */}
              <div className="hidden md:block bg-[var(--surface)] rounded-xl border border-[var(--border-default)] shadow-xs overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--surface-subtle)] border-b border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-5 py-3.5">
                        Membro
                      </th>
                      <th scope="col" className="px-5 py-3.5">
                        Funções
                      </th>
                      <th scope="col" className="px-5 py-3.5">
                        Status
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-right">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {members.map((member) => (
                      <tr key={member.membershipPublicId} className="hover:bg-[var(--surface-hover)] transition-colors">
                        <td className="px-5 py-4 min-w-0">
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-semibold text-[var(--text-primary)] truncate text-sm">
                              {member.fullName}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] truncate">
                              {member.email}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {member.roles.length > 0 ? (
                              member.roles.map((role) => (
                                <Badge key={role} variant="brand" size="sm">
                                  {ADMIN_ROLE_LABELS[role] || role}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-[var(--text-tertiary)] italic">
                                Sem papéis
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <Badge
                            variant={
                              member.status === "ACTIVE"
                                ? "success"
                                : member.status === "INVITED"
                                ? "warning"
                                : member.status === "SUSPENDED"
                                ? "danger"
                                : "neutral"
                            }
                            size="sm"
                          >
                            {member.statusLabel}
                          </Badge>
                        </td>

                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          {member.roles.includes("STUDENT") && member.status === "ACTIVE" && (
                            <Link
                              href={`/consultoria/${slug}/membros/${member.membershipPublicId}/onboarding`}
                              className="inline-flex items-center justify-center px-3 py-1.5 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] text-xs font-semibold rounded-lg shadow-2xs transition-colors focus-visible:outline-[var(--brand)]"
                            >
                              Ver onboarding
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {members.map((member) => (
                  <div
                    key={member.membershipPublicId}
                    className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border-default)] shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {member.fullName}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {member.email}
                        </p>
                      </div>
                      <Badge
                        variant={
                          member.status === "ACTIVE"
                            ? "success"
                            : member.status === "INVITED"
                            ? "warning"
                            : member.status === "SUSPENDED"
                            ? "danger"
                            : "neutral"
                        }
                        size="sm"
                      >
                        {member.statusLabel}
                      </Badge>
                    </div>

                    <div className="pt-1 border-t border-[var(--border-subtle)] flex flex-wrap gap-1.5">
                      {member.roles.length > 0 ? (
                        member.roles.map((role) => (
                          <Badge key={role} variant="brand" size="sm">
                            {ADMIN_ROLE_LABELS[role] || role}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-[var(--text-tertiary)] italic">
                          Sem papéis
                        </span>
                      )}
                    </div>

                    {member.roles.includes("STUDENT") && member.status === "ACTIVE" && (
                      <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-end">
                        <Link
                          href={`/consultoria/${slug}/membros/${member.membershipPublicId}/onboarding`}
                          className="inline-flex items-center text-xs font-semibold text-[var(--brand-foreground)] hover:underline"
                        >
                          Ver onboarding →
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <nav
                  aria-label="Paginação do diretório de membros"
                  className="bg-[var(--surface)] px-4 py-3 rounded-xl border border-[var(--border-default)] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-sm"
                >
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] text-center sm:text-left">
                    Mostrando página <span className="font-semibold text-[var(--text-primary)]">{currentPage}</span> de{" "}
                    <span className="font-semibold text-[var(--text-primary)]">{totalPages}</span> ({total} {total === 1 ? "membro" : "membros"})
                  </p>

                  <div className="flex items-center gap-2">
                    {currentPage > 1 ? (
                      <Link
                        href={`/consultoria/${slug}/membros?page=${currentPage - 1}${
                          query ? `&q=${encodeURIComponent(query)}` : ""
                        }`}
                        className="px-3 py-1.5 bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] text-[var(--text-primary)] text-xs font-semibold rounded-lg border border-[var(--border-default)] transition-colors focus-visible:outline-[var(--brand)]"
                      >
                        Anterior
                      </Link>
                    ) : (
                      <span className="px-3 py-1.5 bg-[var(--surface-subtle)] text-[var(--text-tertiary)] text-xs font-medium rounded-lg border border-[var(--border-subtle)] cursor-not-allowed select-none">
                        Anterior
                      </span>
                    )}

                    {currentPage < totalPages ? (
                      <Link
                        href={`/consultoria/${slug}/membros?page=${currentPage + 1}${
                          query ? `&q=${encodeURIComponent(query)}` : ""
                        }`}
                        className="px-3 py-1.5 bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] text-[var(--text-primary)] text-xs font-semibold rounded-lg border border-[var(--border-default)] transition-colors focus-visible:outline-[var(--brand)]"
                      >
                        Próxima
                      </Link>
                    ) : (
                      <span className="px-3 py-1.5 bg-[var(--surface-subtle)] text-[var(--text-tertiary)] text-xs font-medium rounded-lg border border-[var(--border-subtle)] cursor-not-allowed select-none">
                        Próxima
                      </span>
                    )}
                  </div>
                </nav>
              )}
            </div>
          )}
        </section>
      </div>
    </ConsultancyAppShell>
  );
}
