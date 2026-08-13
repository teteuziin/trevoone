import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { listPlatformConsultancies } from "@/lib/platform-admin/consultancies";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { ConsultancyForm } from "./consultancy-form";

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
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-[#008f4c] border border-emerald-200/60">
          Ativa
        </span>
      );
    case "SUSPENDED":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
          Suspensa
        </span>
      );
    case "ARCHIVED":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
          Arquivada
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-500 border border-zinc-200">
          Status indisponível
        </span>
      );
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
    <main className="min-h-svh w-full bg-zinc-50 text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
      <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-[110px] sm:w-[130px] shrink-0">
              <TrevoOneLogo priority size={130} />
            </div>
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              |
            </span>
            <span className="hidden sm:inline-block text-xs font-medium text-zinc-600">
              Administração Global
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/admin"
              className="inline-flex items-center text-xs sm:text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              ← Painel Admin
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
            Consultorias
          </h1>
          <p className="text-sm text-zinc-600 mt-1 leading-relaxed">
            Gerencie as organizações e consultorias cadastradas na plataforma Trevo One.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Formulário de Criação */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-zinc-200 p-6 sm:p-7 shadow-sm space-y-5">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-zinc-900">
                Nova consultoria
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                Cadastre uma nova organização e defina seu administrador inicial.
              </p>
            </div>

            <ConsultancyForm />
          </div>

          {/* Listagem de Consultorias */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-zinc-900">
                Consultorias cadastradas ({consultancies.length})
              </h2>
            </div>

            {consultancies.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center space-y-2">
                <p className="text-sm font-medium text-zinc-800">
                  Nenhuma consultoria encontrada
                </p>
                <p className="text-xs text-zinc-500">
                  Cadastre uma consultoria utilizando o formulário ao lado.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {consultancies.map((c) => (
                  <div
                    key={c.publicId}
                    className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 shadow-sm space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-zinc-900">
                          {c.name}
                        </h3>
                        <p className="text-xs font-mono text-zinc-500 mt-0.5">
                          /consultoria/{c.slug}
                        </p>
                      </div>

                      <div>{getStatusBadge(c.status)}</div>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                      <span>Criada em {formatDate(c.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
