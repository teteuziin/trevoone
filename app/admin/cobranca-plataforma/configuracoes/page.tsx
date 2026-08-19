import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { getPlatformBillingSettings } from "@/lib/platform-admin/billing";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { PixSettingsForm } from "./pix-form";

export default async function PlatformBillingSettingsPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);
  if (!isPlatformAdmin) {
    redirect("/selecionar-consultoria");
  }

  const settings = await getPlatformBillingSettings();

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
              Configurações Pix
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
              Configurações Pix da plataforma
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600">
              Defina os dados da conta bancária / chave Pix oficial do Trevo One para recebimento de faturas das consultorias.
            </p>
          </div>

          <PixSettingsForm initialData={settings} />
        </div>
      </div>
    </main>
  );
}
