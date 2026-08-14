import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  listDraftTrainingPlansForPersonal,
  listStudentsForPersonal,
} from "@/lib/consultancies/training";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { createDraftTrainingPlanAction } from "./actions";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
    new?: string;
  }>;
};

export default async function PersonalTrainingPlansPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { page, new: isNewOpen } = await searchParams;

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

  const parsedPage = Number(page);
  const validPage = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  const draftPlansResult = await listDraftTrainingPlansForPersonal({
    actorUserId: session.userId,
    consultancySlug: slug,
    page: validPage,
    pageSize: 25,
  });

  const students = await listStudentsForPersonal({
    actorUserId: session.userId,
    consultancySlug: slug,
    limit: 100,
  });

  const items = draftPlansResult?.items || [];
  const total = draftPlansResult?.total || 0;
  const totalPages = draftPlansResult?.totalPages || 1;

  async function handleCreateAction(formData: FormData) {
    "use server";
    const res = await createDraftTrainingPlanAction({}, formData);
    if (res.success && res.planPublicId) {
      redirect(`/consultoria/${slug}/personal/treinos/${res.planPublicId}`);
    }
  }

  return (
    <main className="min-h-svh w-full flex flex-col items-center justify-start p-4 sm:p-6 md:p-8 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))] bg-zinc-50/50 text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
      <div className="w-full max-w-[840px] mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2">
          <div className="w-[120px] sm:w-[130px] shrink-0">
            <TrevoOneLogo priority size={130} />
          </div>
          <span className="text-xs font-semibold text-zinc-500 bg-white border border-zinc-200 px-3 py-1 rounded-full shadow-2xs">
            {context.consultancyName}
          </span>
        </div>

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
              Crie e edite as fichas e prescrições de treino para seus alunos.
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

        {/* Draft Plans List */}
        {items.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-2xl bg-white border border-zinc-200 shadow-2xs text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 mx-auto flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-zinc-900">
              Nenhum plano em rascunho
            </h3>
            <p className="text-xs text-zinc-500 max-w-[360px] mx-auto">
              Você ainda não possui fichas de treino em edição. Comece criando um novo plano para um aluno.
            </p>
            <Link
              href={`/consultoria/${slug}/personal/treinos?new=1`}
              className="inline-flex items-center justify-center px-4 py-2 bg-[#00A859] hover:bg-[#008f4c] text-white text-xs font-semibold rounded-lg shadow-2xs transition-all"
            >
              Criar Primeiro Plano
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Seus Rascunhos ({total})
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {items.map((draft) => (
                <div
                  key={draft.publicId}
                  className="p-4 sm:p-5 rounded-xl bg-white border border-zinc-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-900">
                        {draft.title}
                      </h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        Rascunho
                      </span>
                    </div>

                    <p className="text-xs font-medium text-zinc-700">
                      Aluno: <span className="font-bold">{draft.studentName}</span> ({draft.studentEmail})
                    </p>

                    {draft.subtitle && (
                      <p className="text-xs text-zinc-500">{draft.subtitle}</p>
                    )}

                    {(draft.startsOn || draft.endsOn) && (
                      <p className="text-[11px] text-zinc-400">
                        Validade: {draft.startsOn || "—"} até {draft.endsOn || "—"}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-100">
                    <Link
                      href={`/consultoria/${slug}/personal/treinos/${draft.publicId}`}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#00A859] hover:bg-[#008f4c] rounded-lg shadow-2xs transition-all"
                    >
                      Editar Ficha
                    </Link>
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
                      href={`/consultoria/${slug}/personal/treinos?page=${validPage - 1}`}
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
                      href={`/consultoria/${slug}/personal/treinos?page=${validPage + 1}`}
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
                  href={`/consultoria/${slug}/personal/treinos`}
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
                    href={`/consultoria/${slug}/personal/treinos`}
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
    </main>
  );
}
