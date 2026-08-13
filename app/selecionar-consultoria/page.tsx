import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import {
  listUserConsultancies,
  ROLE_LABELS,
} from "@/lib/consultancies/context";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { logoutFromConsultancyArea } from "./actions";

export default async function SelecionarConsultoriaPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const [{ accessible, configuring }, { isPlatformAdmin }] = await Promise.all([
    listUserConsultancies(session.userId),
    getPlatformAdminAccess(session.userId),
  ]);

  // Se o usuário for PLATFORM_ADMIN
  if (isPlatformAdmin) {
    // Caso não possua consultorias acessíveis: redirect direto para o painel global
    if (accessible.length === 0) {
      redirect("/admin");
    }

    // Caso possua 1 ou mais consultorias acessíveis: exibir seletor de ambientes
    return (
      <main className="min-h-svh w-full flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 md:p-8 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))] bg-white text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
        <div className="w-full max-w-[520px] mx-auto flex flex-col items-center space-y-6 sm:space-y-8">
          <div className="w-[130px] sm:w-[150px] shrink-0">
            <TrevoOneLogo priority size={150} />
          </div>

          <div className="w-full text-center space-y-1.5 px-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
              Escolha seu ambiente
            </h1>
            <p className="text-sm text-zinc-500 font-normal leading-relaxed">
              Selecione o ambiente que você deseja acessar neste momento.
            </p>
          </div>

          <div className="w-full space-y-3">
            {/* Card Global: Administração Trevo One */}
            <Link
              href="/admin"
              className="group block w-full p-4 sm:p-5 rounded-xl border border-zinc-200 hover:border-[#00A859] bg-white hover:bg-emerald-50/30 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859]"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-semibold text-zinc-900 group-hover:text-[#00A859] transition-colors">
                      Administração Trevo One
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100/70 text-[#008f4c]">
                      Administrador global
                    </span>
                  </div>
                </div>

                <div className="text-zinc-400 group-hover:text-[#00A859] transition-colors shrink-0 pl-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Cards de Consultorias acessíveis */}
            {accessible.map((item) => (
              <Link
                key={item.membershipId}
                href={`/consultoria/${item.consultancySlug}`}
                className="group block w-full p-4 sm:p-5 rounded-xl border border-zinc-200 hover:border-[#00A859] bg-white hover:bg-emerald-50/30 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859]"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-2 text-left">
                    <h2 className="text-base sm:text-lg font-semibold text-zinc-900 group-hover:text-[#00A859] transition-colors">
                      {item.consultancyName}
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {item.roles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100/70 text-[#008f4c]"
                        >
                          {ROLE_LABELS[role]}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-zinc-400 group-hover:text-[#00A859] transition-colors shrink-0 pl-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="w-full pt-2">
            <form action={logoutFromConsultancyArea}>
              <button
                type="submit"
                className="w-full h-11 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-semibold text-sm rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  // Usuário comum (isPlatformAdmin === false)

  // 1. Caso haja exatamente 1 consultoria acessível: redirect automático
  if (accessible.length === 1) {
    redirect(`/consultoria/${accessible[0].consultancySlug}`);
  }

  // 2. Caso haja 0 consultorias acessíveis e 0 em configuração
  if (accessible.length === 0 && configuring.length === 0) {
    return (
      <main className="min-h-svh w-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-white text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
        <div className="w-full max-w-[420px] mx-auto flex flex-col items-center space-y-6 sm:space-y-8">
          <div className="w-[130px] sm:w-[150px] shrink-0">
            <TrevoOneLogo priority size={150} />
          </div>

          <div className="w-full text-center space-y-2">
            <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900">
              Nenhuma consultoria vinculada
            </h1>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Sua conta está ativa, mas você ainda não está vinculado a uma consultoria parceira no Trevo One.
            </p>
          </div>

          <form action={logoutFromConsultancyArea} className="w-full">
            <button
              type="submit"
              className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white font-semibold text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
            >
              Sair
            </button>
          </form>
        </div>
      </main>
    );
  }

  // 3. Caso haja 0 consultorias acessíveis e 1+ em configuração (sem roles)
  if (accessible.length === 0 && configuring.length > 0) {
    return (
      <main className="min-h-svh w-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-white text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
        <div className="w-full max-w-[420px] mx-auto flex flex-col items-center space-y-6 sm:space-y-8">
          <div className="w-[130px] sm:w-[150px] shrink-0">
            <TrevoOneLogo priority size={150} />
          </div>

          <div className="w-full text-center space-y-2">
            <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900">
              Acesso em configuração
            </h1>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Seu vínculo com a consultoria existe, mas suas permissões ainda não foram definidas. Entre em contato com o administrador da consultoria.
            </p>
          </div>

          <form action={logoutFromConsultancyArea} className="w-full">
            <button
              type="submit"
              className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white font-semibold text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
            >
              Sair
            </button>
          </form>
        </div>
      </main>
    );
  }

  // 4. Caso haja 2 ou mais consultorias acessíveis para usuário comum
  return (
    <main className="min-h-svh w-full flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 md:p-8 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))] bg-white text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
      <div className="w-full max-w-[520px] mx-auto flex flex-col items-center space-y-6 sm:space-y-8">
        <div className="w-[130px] sm:w-[150px] shrink-0">
          <TrevoOneLogo priority size={150} />
        </div>

        <div className="w-full text-center space-y-1.5 px-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
            Escolha sua consultoria
          </h1>
          <p className="text-sm text-zinc-500 font-normal leading-relaxed">
            Selecione a consultoria que você deseja acessar neste momento.
          </p>
        </div>

        <div className="w-full space-y-3">
          {accessible.map((item) => (
            <Link
              key={item.membershipId}
              href={`/consultoria/${item.consultancySlug}`}
              className="group block w-full p-4 sm:p-5 rounded-xl border border-zinc-200 hover:border-[#00A859] bg-white hover:bg-emerald-50/30 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859]"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2 text-left">
                  <h2 className="text-base sm:text-lg font-semibold text-zinc-900 group-hover:text-[#00A859] transition-colors">
                    {item.consultancyName}
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {item.roles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100/70 text-[#008f4c]"
                      >
                        {ROLE_LABELS[role]}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-zinc-400 group-hover:text-[#00A859] transition-colors shrink-0 pl-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="w-full pt-2">
          <form action={logoutFromConsultancyArea}>
            <button
              type="submit"
              className="w-full h-11 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-semibold text-sm rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
