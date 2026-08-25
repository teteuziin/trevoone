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
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField, Input, Textarea, Select } from "@/components/ui/form-controls";

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
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Planos de Treino"
          description="Crie, gerencie e acompanhe as prescrições de treino para seus alunos."
          backHref={`/consultoria/${slug}`}
          backLabel="Voltar à visão geral"
          actions={
            <div className="flex items-center gap-2">
              <Link
                href={`/consultoria/${slug}/personal/exercicios`}
                className="px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border-default)] hover:bg-[var(--surface-hover)] rounded-lg shadow-2xs transition-colors"
              >
                Biblioteca de Exercícios
              </Link>
              <Link
                href={`/consultoria/${slug}/personal/treinos?new=1&status=${validStatus}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[var(--brand-strong)] hover:bg-[var(--brand)] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors focus-visible:outline-[var(--brand)]"
              >
                + Novo Plano
              </Link>
            </div>
          }
        />

        {/* Status Tabs Navigation */}
        <div className="flex items-center gap-1.5 border-b border-[var(--border-subtle)] pb-2">
          <Link
            href={`/consultoria/${slug}/personal/treinos?status=DRAFT`}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              validStatus === "DRAFT"
                ? "bg-[var(--text-primary)] text-[var(--surface)] shadow-2xs"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            Rascunhos {validStatus === "DRAFT" && `(${total})`}
          </Link>
          <Link
            href={`/consultoria/${slug}/personal/treinos?status=ACTIVE`}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              validStatus === "ACTIVE"
                ? "bg-[var(--brand-strong)] text-white shadow-2xs"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            Ativos {validStatus === "ACTIVE" && `(${total})`}
          </Link>
          <Link
            href={`/consultoria/${slug}/personal/treinos?status=ARCHIVED`}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              validStatus === "ARCHIVED"
                ? "bg-[var(--text-secondary)] text-[var(--surface)] shadow-2xs"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            Arquivados {validStatus === "ARCHIVED" && `(${total})`}
          </Link>
        </div>

        {/* Plans List */}
        {items.length === 0 ? (
          <EmptyState
            title={
              validStatus === "DRAFT"
                ? "Você ainda não possui planos em rascunho"
                : validStatus === "ACTIVE"
                ? "Nenhum plano ativo no momento"
                : "Nenhum plano arquivado no histórico"
            }
            description={
              validStatus === "DRAFT"
                ? "Crie um novo plano de treino para começar a estruturar a rotina de exercícios dos seus alunos."
                : validStatus === "ACTIVE"
                ? "Quando você disponibilizar uma ficha em rascunho para um aluno, ela aparecerá aqui como ativa."
                : "Fichas de treino substituídas ou finalizadas aparecerão aqui no histórico da consultoria."
            }
            action={
              validStatus === "DRAFT" ? (
                <Link
                  href={`/consultoria/${slug}/personal/treinos?new=1&status=DRAFT`}
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-[var(--brand-strong)] hover:bg-[var(--brand)] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors min-h-[44px] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                >
                  + Criar Primeiro Plano
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
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
                  className="p-4 sm:p-5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:border-[var(--border-strong)]"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-[var(--text-primary)] truncate">
                        {planItem.title}
                      </h2>
                      {planItem.status === "DRAFT" && (
                        <Badge variant="warning" size="sm">
                          Rascunho
                        </Badge>
                      )}
                      {planItem.status === "ACTIVE" && (
                        <Badge variant="success" size="sm">
                          Ativo para o aluno
                        </Badge>
                      )}
                      {planItem.status === "ARCHIVED" && (
                        <Badge variant="neutral" size="sm">
                          Arquivado
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs font-medium text-[var(--text-secondary)]">
                      Aluno: <span className="font-semibold text-[var(--text-primary)]">{planItem.studentName}</span> ({planItem.studentEmail})
                    </p>

                    {planItem.subtitle && (
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{planItem.subtitle}</p>
                    )}

                    <div className="flex flex-wrap gap-3 text-[11px] text-[var(--text-tertiary)] pt-0.5">
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

                  <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-[var(--border-subtle)]">
                    {planItem.status === "DRAFT" ? (
                      <Link
                        href={`/consultoria/${slug}/personal/treinos/${planItem.publicId}`}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[var(--brand-strong)] hover:bg-[var(--brand)] rounded-lg shadow-xs transition-colors focus-visible:outline-[var(--brand)]"
                      >
                        Editar Ficha
                      </Link>
                    ) : planItem.status === "ACTIVE" ? (
                      <span className="px-3 py-1.5 text-xs font-semibold text-[var(--brand-foreground)] bg-[var(--brand-soft)] rounded-lg border border-[var(--brand-soft-border)]">
                        Disponibilizado
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 text-xs font-semibold text-[var(--text-tertiary)] bg-[var(--surface-subtle)] rounded-lg border border-[var(--border-subtle)]">
                        Somente Leitura
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav
                aria-label="Paginação da lista de treinos"
                className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs flex items-center justify-between gap-2"
              >
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  Página {validPage} de {totalPages}
                </span>

                <div className="flex items-center gap-2">
                  {validPage > 1 ? (
                    <Link
                      href={`/consultoria/${slug}/personal/treinos?status=${validStatus}&page=${validPage - 1}`}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] text-[var(--text-primary)] border border-[var(--border-default)] transition-colors focus-visible:outline-[var(--brand)]"
                    >
                      ← Anterior
                    </Link>
                  ) : (
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] cursor-not-allowed select-none">
                      ← Anterior
                    </span>
                  )}

                  {validPage < totalPages ? (
                    <Link
                      href={`/consultoria/${slug}/personal/treinos?status=${validStatus}&page=${validPage + 1}`}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] text-[var(--text-primary)] border border-[var(--border-default)] transition-colors focus-visible:outline-[var(--brand)]"
                    >
                      Próxima →
                    </Link>
                  ) : (
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] cursor-not-allowed select-none">
                      Próxima →
                    </span>
                  )}
                </div>
              </nav>
            )}
          </div>
        )}

        {/* Modal: Novo Plano DRAFT */}
        {isNewOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create_plan_modal_title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          >
            <div className="w-full max-w-[520px] bg-[var(--surface)] rounded-2xl border border-[var(--border-default)] shadow-xl p-5 sm:p-6 space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <h2 id="create_plan_modal_title" className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                  Novo Plano de Treino
                </h2>
                <Link
                  href={`/consultoria/${slug}/personal/treinos?status=${validStatus}`}
                  aria-label="Fechar modal de novo plano"
                  className="flex items-center justify-center min-h-[44px] min-w-[44px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-[var(--brand)] text-base font-semibold"
                >
                  ✕
                </Link>
              </div>

              <form action={handleCreateAction} className="space-y-4">
                <input type="hidden" name="slug" value={slug} />

                <FormField
                  label="Selecione o Aluno"
                  id="create_plan_student_select"
                  required
                >
                  <Select
                    id="create_plan_student_select"
                    name="studentMembershipPublicId"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>Selecione um aluno cadastrado...</option>
                    {(students || []).map((st) => (
                      <option key={st.membershipPublicId} value={st.membershipPublicId}>
                        {st.studentName} ({st.studentEmail})
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField
                  label="Título do Plano"
                  id="create_plan_title_input"
                  required
                >
                  <Input
                    id="create_plan_title_input"
                    type="text"
                    name="title"
                    required
                    placeholder="Ex: Ficha de Hipertrofia - Fase 1"
                    maxLength={255}
                  />
                </FormField>

                <FormField
                  label="Subtítulo (opcional)"
                  id="create_plan_subtitle_input"
                >
                  <Input
                    id="create_plan_subtitle_input"
                    type="text"
                    name="subtitle"
                    placeholder="Ex: Adaptação neuromuscular e força"
                    maxLength={255}
                  />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    label="Data Inicial"
                    id="create_plan_starts_on"
                  >
                    <Input
                      id="create_plan_starts_on"
                      type="date"
                      name="startsOn"
                    />
                  </FormField>

                  <FormField
                    label="Data Final"
                    id="create_plan_ends_on"
                  >
                    <Input
                      id="create_plan_ends_on"
                      type="date"
                      name="endsOn"
                    />
                  </FormField>
                </div>

                <FormField
                  label="Descrição / Metas do Plano"
                  id="create_plan_description_input"
                >
                  <Textarea
                    id="create_plan_description_input"
                    name="description"
                    rows={2}
                    placeholder="Orientações e objetivos gerais do plano..."
                  />
                </FormField>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
                  <Link
                    href={`/consultoria/${slug}/personal/treinos?status=${validStatus}`}
                    className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border-default)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
                  >
                    Cancelar
                  </Link>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                  >
                    Criar Rascunho
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
