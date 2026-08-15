import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  listPersonalTrainingPlans,
  listStudentsForPersonal,
} from "@/lib/consultancies/training";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { createDraftTrainingPlanAction } from "./actions";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
    status?: string;
    new?: string;
  }>;
};

export default async function PersonalTrainingPlansPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { page, status: rawStatus, new: isNewOpen } = await searchParams;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  // Permissão estrita: apenas PERSONAL
  if (!context.roles.includes("PERSONAL")) {
    redirect(`/consultoria/${slug}`);
  }

  const validStatus: "DRAFT" | "ACTIVE" | "ARCHIVED" =
    rawStatus === "ACTIVE" || rawStatus === "ARCHIVED" ? rawStatus : "DRAFT";

  const parsedPage = Number(page);
  const validPage = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  const plansResult = await listPersonalTrainingPlans({
    actorUserId: session.userId,
    consultancySlug: slug,
    statusFilter: validStatus,
    page: validPage,
    pageSize: 25,
  });

  const students = await listStudentsForPersonal({
    actorUserId: session.userId,
    consultancySlug: slug,
    limit: 100,
  });

  const items = plansResult?.items || [];
  const total = plansResult?.total || 0;
  const totalPages = plansResult?.totalPages || 1;

  async function handleCreateAction(formData: FormData) {
    "use server";
    const res = await createDraftTrainingPlanAction({}, formData);
    if (res.success && res.planPublicId) {
      redirect(`/consultoria/${slug}/personal/treinos/${res.planPublicId}`);
    }
  }

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="w-full max-w-4xl mx-auto space-y-6">

        {/* Header & New Plan CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 pb-1">
              <Link
                href={`/consultoria/${slug}`}
                className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
              >
                ← Voltar à consultoria
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
              Planos de Treino
            </h1>
            <p className="text-sm text-zinc-500">
              Crie, gerencie e acompanhe as prescrições de treino para seus alunos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/consultoria/${slug}/personal/exercicios`}
              className="px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-lg shadow-2xs transition-all"
            >
              Biblioteca de Exercícios
            </Link>

            <Link
              href={`/consultoria/${slug}/personal/treinos?new=1`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00A859] hover:bg-[#008f4c] text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              + Novo Plano
            </Link>
          </div>
        </div>

        {/* Status Tabs Navigation */}
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
          <Link
            href={`/consultoria/${slug}/personal/treinos?status=DRAFT`}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              validStatus === "DRAFT"
                ? "bg-zinc-900 text-white shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            Rascunhos {validStatus === "DRAFT" && `(${total})`}
          </Link>
          <Link
            href={`/consultoria/${slug}/personal/treinos?status=ACTIVE`}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              validStatus === "ACTIVE"
                ? "bg-[#00A859] text-white shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            Ativos {validStatus === "ACTIVE" && `(${total})`}
          </Link>
          <Link
            href={`/consultoria/${slug}/personal/treinos?status=ARCHIVED`}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              validStatus === "ARCHIVED"
                ? "bg-zinc-700 text-white shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            Arquivados {validStatus === "ARCHIVED" && `(${total})`}
          </Link>
        </div>

        {/* Plans List */}
        {items.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-2xl bg-white border border-zinc-200 shadow-2xs text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 mx-auto flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-zinc-900">
              {validStatus === "DRAFT"
                ? "Nenhum plano em rascunho"
                : validStatus === "ACTIVE"
                ? "Nenhum plano ativo no momento"
                : "Nenhum plano arquivado"}
            </h3>
            <p className="text-xs text-zinc-500 max-w-[360px] mx-auto">
              {validStatus === "DRAFT"
                ? "Você não possui fichas de treino em edição. Comece criando um novo plano para um aluno."
                : validStatus === "ACTIVE"
                ? "Quando você disponibilizar um plano para um aluno, ele aparecerá aqui como ativo."
                : "Planos anteriores substituídos por novas fichas aparecerão aqui no histórico."}
            </p>
            {validStatus === "DRAFT" && (
              <Link
                href={`/consultoria/${slug}/personal/treinos?new=1`}
                className="inline-flex items-center justify-center px-4 py-2 bg-[#00A859] hover:bg-[#008f4c] text-white text-xs font-semibold rounded-lg shadow-2xs transition-all"
              >
                Criar Primeiro Plano
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                {validStatus === "DRAFT"
                  ? `Seus Rascunhos (${total})`
                  : validStatus === "ACTIVE"
                  ? `Planos Ativos para Alunos (${total})`
                  : `Histórico de Planos Arquivados (${total})`}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {items.map((planItem) => (
                <div
                  key={planItem.publicId}
                  className="p-4 sm:p-5 rounded-xl bg-white border border-zinc-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-900">
                        {planItem.title}
                      </h3>
                      {planItem.status === "DRAFT" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          Rascunho
                        </span>
                      )}
                      {planItem.status === "ACTIVE" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-[#00A859] border border-emerald-200">
                          Ativo para o aluno
                        </span>
                      )}
                      {planItem.status === "ARCHIVED" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                          Arquivado
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-medium text-zinc-700">
                      Aluno: <span className="font-bold">{planItem.studentName}</span> ({planItem.studentEmail})
                    </p>

                    {planItem.subtitle && (
                      <p className="text-xs text-zinc-500">{planItem.subtitle}</p>
                    )}

                    <div className="flex flex-wrap gap-3 text-[11px] text-zinc-400 pt-0.5">
                      {(planItem.startsOn || planItem.endsOn) && (
                        <span>
                          Validade: {planItem.startsOn || "—"} até {planItem.endsOn || "—"}
                        </span>
                      )}
                      {planItem.activatedAt && (
                        <span>
                          Ativado em: {new Date(planItem.activatedAt).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      {planItem.archivedAt && (
                        <span>
                          Arquivado em: {new Date(planItem.archivedAt).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-100">
                    {planItem.status === "DRAFT" ? (
                      <Link
                        href={`/consultoria/${slug}/personal/treinos/${planItem.publicId}`}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#00A859] hover:bg-[#008f4c] rounded-lg shadow-2xs transition-all"
                      >
                        Editar Ficha
                      </Link>
                    ) : planItem.status === "ACTIVE" ? (
                      <span className="px-3 py-1.5 text-xs font-semibold text-[#00A859] bg-emerald-50 rounded-lg border border-emerald-200">
                        Disponibilizado
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 text-xs font-semibold text-zinc-500 bg-zinc-100 rounded-lg border border-zinc-200">
                        Somente Leitura
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-2xs flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-500 font-medium">
                  Página {validPage} de {totalPages}
                </span>

                <div className="flex items-center gap-2">
                  {validPage > 1 ? (
                    <Link
                      href={`/consultoria/${slug}/personal/treinos?status=${validStatus}&page=${validPage - 1}`}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                    >
                      ← Anterior
                    </Link>
                  ) : (
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 text-zinc-400 cursor-not-allowed">
                      ← Anterior
                    </span>
                  )}

                  {validPage < totalPages ? (
                    <Link
                      href={`/consultoria/${slug}/personal/treinos?status=${validStatus}&page=${validPage + 1}`}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                    >
                      Próxima →
                    </Link>
                  ) : (
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 text-zinc-400 cursor-not-allowed">
                      Próxima →
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal: Novo Plano DRAFT */}
        {isNewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="w-full max-w-[500px] bg-white rounded-2xl border border-zinc-200 shadow-xl p-5 sm:p-6 space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h2 className="text-lg font-bold text-zinc-900">Novo Plano de Treino</h2>
                <Link
                  href={`/consultoria/${slug}/personal/treinos?status=${validStatus}`}
                  className="text-zinc-400 hover:text-zinc-700 text-sm font-semibold p-1"
                >
                  ✕
                </Link>
              </div>

              <form action={handleCreateAction} className="space-y-4">
                <input type="hidden" name="slug" value={slug} />

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-800">
                    Selecione o Aluno <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="studentMembershipPublicId"
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                  >
                    <option value="">Selecione um aluno cadastrado...</option>
                    {(students || []).map((st) => (
                      <option key={st.membershipPublicId} value={st.membershipPublicId}>
                        {st.studentName} ({st.studentEmail})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-800">
                    Título do Plano <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="Ex: Ficha de Hipertrofia - Fase 1"
                    maxLength={255}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-800">
                    Subtítulo (opcional)
                  </label>
                  <input
                    type="text"
                    name="subtitle"
                    placeholder="Ex: Adaptação neuromuscular e força"
                    maxLength={255}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-800">
                      Data Inicial
                    </label>
                    <input
                      type="date"
                      name="startsOn"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-800">
                      Data Final
                    </label>
                    <input
                      type="date"
                      name="endsOn"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-800">
                    Descrição / Metas do Plano
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    placeholder="Orientações e objetivos gerais do plano..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
                  <Link
                    href={`/consultoria/${slug}/personal/treinos?status=${validStatus}`}
                    className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-lg transition-all"
                  >
                    Cancelar
                  </Link>

                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] rounded-lg shadow-sm transition-all"
                  >
                    Criar Rascunho
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
