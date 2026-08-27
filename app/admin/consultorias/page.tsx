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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        <PageHeader
          title="Gestão de Consultorias"
          description="Gerencie as organizações e consultorias cadastradas na plataforma Trevo One."
          backHref="/admin"
          backLabel="Voltar ao Painel Admin"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Formulário de Criação */}
          <div className="lg:col-span-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-default)] p-6 sm:p-7 shadow-xs space-y-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                Nova consultoria
              </h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
                Cadastre uma nova organização e defina seu administrador inicial.
              </p>
            </div>

            <ConsultancyForm />
          </div>

          {/* Listagem de Consultorias */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                Consultorias cadastradas ({consultancies.length})
              </h2>
            </div>

            {consultancies.length === 0 ? (
              <EmptyState
                title="Nenhuma consultoria encontrada"
                description="Cadastre uma consultoria utilizando o formulário ao lado."
              />
            ) : (
              <div className="space-y-3">
                {consultancies.map((c) => (
                  <div
                    key={c.publicId}
                    className="bg-[var(--surface)] rounded-xl border border-[var(--border-default)] p-4 sm:p-5 shadow-xs space-y-2 hover:border-[var(--border-strong)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
                          {c.name}
                        </h3>
                        <p className="text-xs font-mono text-[var(--text-tertiary)]">
                          /consultoria/{c.slug}
                        </p>
                      </div>

                      <div className="shrink-0">{getStatusBadge(c.status)}</div>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                      <span>Criada em {formatDate(c.createdAt)}</span>
                      <span className="font-mono text-[11px] text-[var(--text-secondary)] bg-[var(--surface-subtle)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
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
