import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  listConsultancyMembers,
  ADMIN_ROLE_LABELS,
} from "@/lib/consultancies/admin";
import { ConsultancyAdminShell } from "@/components/consultancies/consultancy-admin-shell";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
};

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

  const { members, total, page: currentPage, totalPages } =
    await listConsultancyMembers({
      consultancyId: context.consultancyId,
      query,
      page: validPage,
      pageSize: 25,
    });

  return (
    <ConsultancyAdminShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      currentSection="members"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
            Membros
          </h2>
          <p className="text-sm text-zinc-500 font-normal">
            Pessoas vinculadas a esta consultoria.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs">
          <form method="get" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Buscar por nome ou e-mail"
                className="w-full h-10 pl-10 pr-4 text-sm bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="w-full sm:w-auto h-10 px-5 bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:ring-offset-2 flex items-center justify-center shrink-0"
              >
                Buscar
              </button>

              {query.length > 0 && (
                <Link
                  href={`/consultoria/${slug}/membros`}
                  className="w-full sm:w-auto h-10 px-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center shrink-0"
                >
                  Limpar
                </Link>
              )}
            </div>
          </form>
        </div>

        {/* Members Directory Content */}
        {members.length === 0 ? (
          <div className="bg-white p-8 sm:p-12 rounded-xl border border-zinc-200 shadow-2xs text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 mx-auto flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-zinc-900">
                {query.length > 0
                  ? "Nenhum membro encontrado para esta busca."
                  : "Nenhum membro encontrado."}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 max-w-sm mx-auto">
                {query.length > 0
                  ? "Tente buscar utilizando outros termos ou limpe o filtro."
                  : "Não há membros registrados nesta consultoria no momento."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl border border-zinc-200 shadow-2xs overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50/80 border-b border-zinc-200 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {members.map((member) => (
                    <tr key={member.membershipPublicId} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-5 py-4 min-w-0">
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-semibold text-zinc-900 truncate">
                            {member.fullName}
                          </p>
                          <p className="text-xs text-zinc-500 truncate">
                            {member.email}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {member.roles.length > 0 ? (
                            member.roles.map((role) => (
                              <span
                                key={role}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-[#008f4c] border border-emerald-200"
                              >
                                {ADMIN_ROLE_LABELS[role] || role}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-zinc-400 italic">
                              Sem papéis
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            member.status === "ACTIVE"
                              ? "bg-emerald-100/80 text-emerald-800"
                              : member.status === "INVITED"
                              ? "bg-amber-100 text-amber-800"
                              : member.status === "SUSPENDED"
                              ? "bg-red-100 text-red-800"
                              : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {member.statusLabel}
                        </span>
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
                  className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-semibold text-zinc-900 truncate">
                        {member.fullName}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {member.email}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        member.status === "ACTIVE"
                          ? "bg-emerald-100/80 text-emerald-800"
                          : member.status === "INVITED"
                          ? "bg-amber-100 text-amber-800"
                          : member.status === "SUSPENDED"
                          ? "bg-red-100 text-red-800"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {member.statusLabel}
                    </span>
                  </div>

                  <div className="pt-1 border-t border-zinc-100 flex flex-wrap gap-1.5">
                    {member.roles.length > 0 ? (
                      member.roles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-[#008f4c] border border-emerald-200"
                        >
                          {ADMIN_ROLE_LABELS[role] || role}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-400 italic">
                        Sem papéis
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 rounded-xl border border-zinc-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
                <p className="text-xs sm:text-sm text-zinc-500 text-center sm:text-left">
                  Mostrando página <span className="font-semibold text-zinc-800">{currentPage}</span> de{" "}
                  <span className="font-semibold text-zinc-800">{totalPages}</span> ({total} {total === 1 ? "membro" : "membros"})
                </p>

                <div className="flex items-center gap-2">
                  {currentPage > 1 ? (
                    <Link
                      href={`/consultoria/${slug}/membros?page=${currentPage - 1}${
                        query ? `&q=${encodeURIComponent(query)}` : ""
                      }`}
                      className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Anterior
                    </Link>
                  ) : (
                    <span className="px-3 py-1.5 bg-zinc-100/50 text-zinc-300 text-xs font-medium rounded-lg cursor-not-allowed select-none">
                      Anterior
                    </span>
                  )}

                  {currentPage < totalPages ? (
                    <Link
                      href={`/consultoria/${slug}/membros?page=${currentPage + 1}${
                        query ? `&q=${encodeURIComponent(query)}` : ""
                      }`}
                      className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Próxima
                    </Link>
                  ) : (
                    <span className="px-3 py-1.5 bg-zinc-100/50 text-zinc-300 text-xs font-medium rounded-lg cursor-not-allowed select-none">
                      Próxima
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ConsultancyAdminShell>
  );
}
