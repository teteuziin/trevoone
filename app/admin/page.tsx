import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { logoutFromPlatformAdminArea } from "./actions";

export default async function AdminDashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);

  if (!isPlatformAdmin) {
    redirect("/selecionar-consultoria");
  }

  const modules = [
    {
      title: "Consultorias",
      description:
        "Gestão centralizada de consultorias parceiras, criação e configurações de tenant.",
      status: "Disponível",
      href: "/admin/consultorias",
      icon: (
        <svg
          className="w-5 h-5 text-[#00A859]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
    },
    {
      title: "Usuários",
      description:
        "Visão global de contas e acessos administrativos na plataforma.",
      status: "Em preparação",
      icon: (
        <svg
          className="w-5 h-5 text-[#00A859]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      title: "Auditoria",
      description:
        "Registro de eventos administrativos e trilha de auditoria do sistema.",
      status: "Em preparação",
      icon: (
        <svg
          className="w-5 h-5 text-[#00A859]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      title: "Configurações",
      description:
        "Parâmetros globais da infraestrutura e integrações da plataforma.",
      status: "Em preparação",
      icon: (
        <svg
          className="w-5 h-5 text-[#00A859]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
  ];

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

          <div className="flex items-center space-x-3 sm:space-x-4">
            <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-[#008f4c] border border-emerald-200/60">
              Administrador global
            </span>
            <form action={logoutFromPlatformAdminArea}>
              <button
                type="submit"
                className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
                  Administração da plataforma
                </h1>
                <span className="md:hidden inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-[#008f4c] border border-emerald-200/60">
                  Global
                </span>
              </div>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Bem-vindo,{" "}
                <span className="font-semibold text-zinc-900">
                  {session.fullName}
                </span>
                . Este é o ambiente de governança global do Trevo One.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Módulos do sistema
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500">
              Recursos de administração e gestão da plataforma.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {modules.map((m) => {
              if (m.href) {
                return (
                  <Link
                    key={m.title}
                    href={m.href}
                    className="group bg-white rounded-xl border border-zinc-200 hover:border-[#00A859] p-5 shadow-sm flex flex-col justify-between space-y-4 transition-all hover:bg-emerald-50/20 focus:outline-none focus:ring-2 focus:ring-[#00A859]"
                  >
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center group-hover:bg-emerald-100/60 transition-colors">
                        {m.icon}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-zinc-900 group-hover:text-[#00A859] transition-colors">
                          {m.title}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                          {m.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-[#008f4c]">
                        {m.status} →
                      </span>
                    </div>
                  </Link>
                );
              }

              return (
                <div
                  key={m.title}
                  className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      {m.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-zinc-900">
                        {m.title}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                        {m.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-600">
                      {m.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
