import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { listPlatformConsultancies } from "@/lib/platform-admin/consultancies";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { ChargeForm } from "./charge-form";

type PageProps = {
  searchParams: Promise<{
    consultancy?: string;
  }>;
};

export default async function NewPlatformChargePage({ searchParams }: PageProps) {
  const { consultancy } = await searchParams;

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/admin" className="w-[110px] sm:w-[130px] shrink-0">
              <TrevoOneLogo priority size={130} />
            </Link>
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              |
            </span>
            <Link
              href="/admin/cobranca-plataforma"
              className="hidden sm:inline-block text-xs font-medium text-zinc-600 hover:text-zinc-900"
            >
              Cobrança da Plataforma
            </Link>
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              /
            </span>
            <span className="hidden sm:inline-block text-xs font-medium text-zinc-900">
              Nova Cobrança
            </span>
          </div>

          <Link
            href="/admin/cobranca-plataforma"
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
          >
            ← Voltar
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-zinc-900">
              Emitir cobrança da plataforma
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600">
              Gere uma fatura avulsa ou mensal para uma consultoria parceira com vencimento e prazo de carência de 5 dias.
            </p>
          </div>

          <ChargeForm
            consultancies={consultancies.map((c) => ({
              publicId: c.publicId,
              name: c.name,
              slug: c.slug,
            }))}
            defaultConsultancyPublicId={consultancy}
          />
        </div>
      </div>
    </main>
  );
}
