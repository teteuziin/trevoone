import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { getPlatformBillingSettings } from "@/lib/platform-admin/billing";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { Button } from "@/components/ui/button";
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
      <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-xs border-b border-zinc-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin" className="w-[110px] sm:w-[130px] shrink-0">
              <TrevoOneLogo priority size={130} />
            </Link>
            <span className="hidden sm:inline-block text-zinc-300">|</span>
            <Link
              href="/admin/cobranca-plataforma"
              className="hidden sm:inline-block text-xs font-semibold text-zinc-600 hover:text-zinc-900 truncate uppercase tracking-wider"
            >
              Cobrança da Plataforma
            </Link>
          </div>

          <Link href="/admin/cobranca-plataforma">
            <Button variant="outline" size="sm">
              ← Voltar
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              CONFIGURAÇÃO GLOBAL
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Chave Pix Oficial da Plataforma
            </h1>
            <p className="text-xs text-zinc-500">
              Defina a chave Pix e favorecido oficial do Trevo One para recebimento dos pagamentos de assinaturas das consultorias.
            </p>
          </div>

          <PixSettingsForm initialData={settings} />
        </div>
      </div>
    </main>
  );
}
