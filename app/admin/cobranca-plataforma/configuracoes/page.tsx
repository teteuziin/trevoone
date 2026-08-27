import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { getPlatformBillingSettings } from "@/lib/platform-admin/billing";
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
    <div className="w-full">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin/cobranca-plataforma">
            <Button variant="outline" size="sm">
              ← Voltar para Cobrança
            </Button>
          </Link>
        </div>

        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-default)] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
              CONFIGURAÇÃO GLOBAL
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Chave Pix Oficial da Plataforma
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Defina a chave Pix e favorecido oficial do Trevo One para recebimento dos pagamentos de assinaturas das consultorias.
            </p>
          </div>

          <PixSettingsForm initialData={settings} />
        </div>
      </div>
    </div>
  );
}
