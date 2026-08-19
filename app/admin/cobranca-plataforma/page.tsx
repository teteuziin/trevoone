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
import { Badge } from "@/components/ui/badge";

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
      <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/admin" className="w-[110px] sm:w-[130px] shrink-0">
              <TrevoOneLogo priority size={130} />
            </Link>
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              |
            </span>
            <span className="hidden sm:inline-block text-xs font-medium text-zinc-600">
              Cobrança da Plataforma
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/cobranca-plataforma/configuracoes"
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
            >
              Configurar Pix →
            </Link>
            <Link
              href="/admin/cobranca-plataforma/cobrancas/nova"
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00A859] hover:bg-[#008f4c] text-white transition-colors"
            >
              + Nova Cobrança
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner Pix Não Configurado */}
        {!platformSettings && (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="font-semibold text-sm">Chave Pix da plataforma não configurada</p>
              <p className="text-xs text-amber-800">
                Configure a chave Pix oficial do Trevo One para que as consultorias possam visualizar os dados de pagamento.
              </p>
            </div>
            <Link
              href="/admin/cobranca-plataforma/configuracoes"
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors shrink-0"
            >
              Configurar Pix Agora
            </Link>
          </div>
        )}

        {/* Header & Resumo */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900">
                Cobrança da plataforma
              </h1>
              <p className="text-sm text-zinc-600">
                Gestão de faturamento, recebimento Pix, carência e assinaturas das consultorias.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
              <span className="text-xs text-zinc-500 font-medium">Total de Consultorias</span>
              <p className="text-xl font-bold text-zinc-900">{subscriptions.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
              <span className="text-xs text-zinc-500 font-medium">Comprovantes em Análise</span>
              <p className="text-xl font-bold text-amber-600">{pendingReceipts.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
              <span className="text-xs text-zinc-500 font-medium">Chave Pix da Plataforma</span>
              <p className="text-sm font-mono font-semibold text-zinc-900 truncate">
                {platformSettings ? `${platformSettings.pixKeyType}: ${platformSettings.pixKey}` : "Não configurada"}
              </p>
            </div>
          </div>
        </div>

        {/* Fila de Comprovantes em Análise */}
        {pendingReceipts.length > 0 && (
          <div className="bg-white rounded-2xl border border-amber-200 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                  Comprovantes aguardando análise ({pendingReceipts.length})
                </h2>
                <p className="text-xs text-zinc-500">
                  Comprovantes enviados pelas consultorias que precisam de validação.
                </p>
              </div>
            </div>

            <div className="divide-y divide-zinc-100">
              {pendingReceipts.map((rc) => (
                <div
                  key={rc.publicId}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs sm:text-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900">{rc.consultancyName}</span>
                      <Badge variant="warning" size="sm">
                        Em análise
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-600">
                      Cobrança: <strong>{rc.chargeTitle}</strong> ({formatBrlCents(rc.chargeAmountCents)}) • Vencimento: {formatIsoDateToBr(rc.chargeDueOn)}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Enviado por {rc.submitterName} em {formatIsoDateToBr(rc.createdAt.toISOString().slice(0, 10))} • Arquivo: {rc.fileName}
                    </p>
                  </div>

                  <Link
                    href={`/admin/cobranca-plataforma/comprovantes/${rc.publicId}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors shrink-0"
                  >
                    Avaliar Comprovante →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Consultorias & Assinaturas */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Assinaturas das consultorias
              </h2>
              <p className="text-xs text-zinc-500">
                Status de acesso e faturamento de cada tenant na plataforma.
              </p>
            </div>
          </div>

          <div className="divide-y divide-zinc-100">
            {subscriptions.map((s) => (
              <div
                key={s.consultancyPublicId}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs sm:text-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900 text-base">{s.consultancyName}</span>
                    <Badge
                      variant={
                        s.effectiveStatus === "ACTIVE"
                          ? "brand"
                          : s.effectiveStatus === "GRACE"
                          ? "warning"
                          : "danger"
                      }
                      size="sm"
                    >
                      {s.effectiveStatus === "ACTIVE"
                        ? "Ativa"
                        : s.effectiveStatus === "GRACE"
                        ? "Carência"
                        : s.effectiveStatus === "SUSPENDED"
                        ? "Suspensa"
                        : "Cancelada"}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Slug: <code>{s.consultancySlug}</code> • Timezone: {s.consultancyTimezone}
                  </p>
                  <p className="text-xs text-zinc-600">
                    Faturas em aberto: <strong>{s.openChargesCount}</strong>
                    {s.pendingReceiptsCount > 0 && (
                      <span className="text-amber-700 font-medium ml-2">
                        • {s.pendingReceiptsCount} comprovante(s) pendente(s)
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/admin/cobranca-plataforma/consultorias/${s.consultancyPublicId}`}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors"
                  >
                    Detalhes & Faturas →
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
