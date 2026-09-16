import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { listPlatformConsultancies } from "@/lib/platform-admin/consultancies";
import { ConsultancyForm } from "./consultancy-form";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

function formatDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  } catch {
    return "-";
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return <Badge variant="success" size="sm">Ativa</Badge>;
    case "SUSPENDED":
      return <Badge variant="warning" size="sm">Suspensa</Badge>;
    case "ARCHIVED":
      return <Badge variant="neutral" size="sm">Arquivada</Badge>;
    default:
      return <Badge variant="neutral" size="sm">Status indisponível</Badge>;
  }
}

export default async function AdminConsultoriasPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);

  if (!isPlatformAdmin) {
    redirect("/selecionar-consultoria");
  }

  const consultancies = await listPlatformConsultancies();

  return (
    <div className="w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        <PageHeader
          title="Gestão de Consultorias"
          description="Controle e administração central de organizações e consultorias cadastradas na plataforma."
          backHref="/admin"
          backLabel="Painel de Governança"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Formulário de Criação de Nova Consultoria */}
          <div className="lg:col-span-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-default)] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="space-y-1 pb-3 border-b border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
                Nova Organização
              </span>
              <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                Cadastrar Consultoria
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Configure os dados canônicos da nova consultoria parceira e defina seu administrador inicial.
              </p>
            </div>

            <ConsultancyForm />
          </div>

          {/* Listagem de Consultorias Cadastradas */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Consultorias Cadastradas ({consultancies.length})
              </h2>
            </div>

            {consultancies.length === 0 ? (
              <EmptyState
                title="Nenhuma consultoria encontrada"
                description="Cadastre uma consultoria utilizando o formulário ao lado para iniciar a operação."
              />
            ) : (
              <div className="space-y-3">
                {consultancies.map((c) => (
                  <div
                    key={c.publicId}
                    className="bg-[var(--surface)] rounded-2xl border border-[var(--border-default)] p-4 sm:p-5 shadow-xs space-y-3 hover:border-[var(--border-strong)] transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                            {c.name}
                          </h3>
                          {getStatusBadge(c.status)}
                        </div>
                        <p className="text-xs font-mono text-[var(--text-secondary)]">
                          /consultoria/<span className="text-[var(--text-primary)] font-semibold">{c.slug}</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                      <span>Criada em {formatDate(c.createdAt)}</span>
                      <span className="font-mono text-[10px] text-[var(--text-secondary)] bg-[var(--surface-subtle)] px-2 py-1 rounded-md border border-[var(--border-default)] shrink-0 shadow-2xs">
                        {c.timezone}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
