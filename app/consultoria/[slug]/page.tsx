import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import {
  resolveConsultancyContext,
  ROLE_LABELS,
} from "@/lib/consultancies/context";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { logoutFromConsultancyArea } from "../../selecionar-consultoria/actions";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ConsultancyPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  return (
    <main className="min-h-svh w-full flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 md:p-8 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))] bg-white text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
      <div className="w-full max-w-[480px] mx-auto flex flex-col items-center space-y-6 sm:space-y-8 text-center">
        <div className="w-[130px] sm:w-[150px] shrink-0">
          <TrevoOneLogo priority size={150} />
        </div>

        <div className="w-full space-y-2">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#00A859] border border-emerald-200">
            Acesso Confirmado
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            {context.consultancyName}
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Seu ambiente de consultoria está sendo preparado.
          </p>
        </div>

        <div className="w-full p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3 text-left">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Seus acessos nesta consultoria
          </h2>
          <div className="flex flex-wrap gap-2">
            {context.roles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-zinc-200 text-zinc-800 shadow-2xs"
              >
                {ROLE_LABELS[role]}
              </span>
            ))}
          </div>
        </div>

        <div className="w-full space-y-2.5 pt-2">
          <Link
            href="/selecionar-consultoria"
            className="block w-full py-2.5 px-4 bg-white hover:bg-zinc-50 active:bg-zinc-100 border border-zinc-300 text-zinc-800 font-semibold text-sm rounded-lg shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859]"
          >
            Minhas consultorias
          </Link>

          <form action={logoutFromConsultancyArea}>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white font-semibold text-sm rounded-lg shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
