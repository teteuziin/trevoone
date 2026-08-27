import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import {
  listAllPlatformSubscriptions,
  listPendingPlatformReceipts,
  getPlatformBillingSettings,
  formatBrlCents,
  formatIsoDateToBr,
} from "@/lib/platform-admin/billing";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { BetaBadge } from "@/components/brand/beta-badge";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function getSubscriptionBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "GRACE":
      return "warning";
    case "SUSPENDED":
      return "danger";
    case "CANCELED":
      return "neutral";
    default:
      return "neutral";
  }
}

function getSubscriptionLabel(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Ativa";
    case "GRACE":
      return "Carência";
    case "SUSPENDED":
      return "Suspensa";
    case "CANCELED":
      return "Cancelada";
    default:
      return status;
  }
}

export default async function PlatformBillingOverviewPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);
  if (!isPlatformAdmin) {
    redirect("/selecionar-consultoria");
  }

  const [subscriptions, pendingReceipts, platformSettings] = await Promise.all([
    listAllPlatformSubscriptions(),
    listPendingPlatformReceipts(),
    getPlatformBillingSettings(),
  ]);

  return (
    <main className="min-h-svh w-full bg-zinc-50 text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
      {/* Platform Admin Header */}
      <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-xs border-b border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link href="/admin" className="w-[110px] sm:w-[130px] shrink-0">
              <TrevoOneLogo priority size={130} />
            </Link>
            <BetaBadge />
            <span className="hidden sm:inline-block text-zinc-300">|</span>
            <span className="hidden sm:inline-block text-xs font-semibold text-zinc-600 truncate uppercase tracking-wider">
              Cobrança da Plataforma
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/admin/cobranca-plataforma/configuracoes">
              <Button variant="outline" size="sm">
                Configurar Pix
              </Button>
            </Link>
            <Link href="/admin/cobranca-plataforma/cobrancas/nova">
              <Button variant="primary" size="sm">
                + Nova Cobrança
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner Pix Não Configurado */}
        {!platformSettings && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-bold text-sm">Chave Pix da plataforma não configurada</p>
              <p className="text-amber-800">
                Configure a chave Pix oficial do Trevo One para que as consultorias possam visualizar os dados de pagamento.
              </p>
            </div>
            <Link href="/admin/cobranca-plataforma/configuracoes">
              <Button variant="primary" size="sm" className="shrink-0 bg-amber-600 hover:bg-amber-700">
                Configurar Pix Agora
              </Button>
            </Link>
          </div>
        )}

        {/* Dashboard Title & Overview Metrics */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
              PLATFORM ADMIN
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Gestão de Faturamento das Consultorias
            </h1>
            <p className="text-xs text-zinc-500">
              Controle global de assinaturas, recebimento Pix, carência e liberação dos acessos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1">
              <span className="text-zinc-500 font-medium block">Total de Consultorias</span>
              <p className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                {subscriptions.length}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1">
              <span className="text-zinc-500 font-medium block">Comprovantes em Análise</span>
              <p className="text-xl sm:text-2xl font-bold text-amber-600 tracking-tight">
                {pendingReceipts.length}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1">
              <span className="text-zinc-500 font-medium block">Chave Pix da Plataforma</span>
              <p className="text-xs font-mono font-bold text-zinc-900 truncate">
                {platformSettings ? `${platformSettings.pixKeyType}: ${platformSettings.pixKey}` : "Não configurada"}
              </p>
            </div>
          </div>
        </div>

        {/* Fila de Comprovantes em Análise */}
        {pendingReceipts.length > 0 && (
          <div className="bg-white border border-amber-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-amber-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                  Comprovantes Aguardando Análise ({pendingReceipts.length})
                </h2>
                <p className="text-xs text-zinc-500">
                  Comprovantes enviados pelas consultorias que precisam de validação da equipe Trevo One.
                </p>
              </div>
            </div>

            <div className="divide-y divide-zinc-100">
              {pendingReceipts.map((rc) => (
                <div
                  key={rc.publicId}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-zinc-900 text-sm truncate">{rc.consultancyName}</span>
                      <Badge variant="warning" size="sm">
                        Em análise
                      </Badge>
                    </div>
                    <p className="text-zinc-600 font-medium truncate">
                      Fatura: <strong>{rc.chargeTitle}</strong> ({formatBrlCents(rc.chargeAmountCents)}) • Vencimento: {formatIsoDateToBr(rc.chargeDueOn)}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Enviado por {rc.submitterName} em {formatIsoDateToBr(rc.createdAt.toISOString().slice(0, 10))} • Arquivo: {rc.fileName}
                    </p>
                  </div>

                  <Link
                    href={`/admin/cobranca-plataforma/comprovantes/${rc.publicId}`}
                    className="shrink-0"
                  >
                    <Button variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-700">
                      Avaliar Comprovante →
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Consultorias & Assinaturas */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-zinc-100 pb-3">
            <h2 className="text-sm font-bold text-zinc-900">
              Assinaturas das Consultorias
            </h2>
            <p className="text-xs text-zinc-500">
              Status de faturamento e acesso de cada consultoria cadastrada.
            </p>
          </div>

          <div className="divide-y divide-zinc-100">
            {subscriptions.map((s) => (
              <div
                key={s.consultancyPublicId}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-zinc-900 text-sm sm:text-base truncate">{s.consultancyName}</span>
                    <Badge variant={getSubscriptionBadgeVariant(s.effectiveStatus)} size="sm">
                      {getSubscriptionLabel(s.effectiveStatus)}
                    </Badge>
                  </div>
                  <p className="text-zinc-500 text-[11px]">
                    Slug: <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-700">{s.consultancySlug}</code> • Timezone: {s.consultancyTimezone}
                  </p>
                  <p className="text-zinc-600">
                    Faturas em aberto: <strong className="text-zinc-900 font-semibold">{s.openChargesCount}</strong>
                    {s.pendingReceiptsCount > 0 && (
                      <span className="text-amber-700 font-semibold ml-2">
                        • {s.pendingReceiptsCount} comprovante(s) pendente(s)
                      </span>
                    )}
                  </p>
                </div>

                <div className="shrink-0 pt-2 sm:pt-0 border-t border-zinc-100 sm:border-t-0">
                  <Link href={`/admin/cobranca-plataforma/consultorias/${s.consultancyPublicId}`}>
                    <Button variant="outline" size="sm">
                      Detalhes & Faturas →
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
