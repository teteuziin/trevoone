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
    <div className="w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        {/* Contextual Page Header with Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand)]">
                Faturamento Global
              </span>
              <span className="text-xs text-[var(--border-strong)]">•</span>
              <span className="text-xs text-[var(--text-tertiary)] font-medium">
                Controle Financeiro
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Cobrança da Plataforma
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-normal">
              Faturamento das consultorias parceiras, gestão de assinaturas, controle de carência e conciliação Pix.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            <Link href="/admin/cobranca-plataforma/configuracoes">
              <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-[40px] text-xs font-semibold">
                Configurar Pix
              </Button>
            </Link>
            <Link href="/admin/cobranca-plataforma/cobrancas/nova">
              <Button variant="primary" size="sm" className="min-h-[44px] sm:min-h-[40px] text-xs font-semibold shadow-xs">
                + Nova Cobrança
              </Button>
            </Link>
          </div>
        </div>

        {/* Banner Pix Não Configurado */}
        {!platformSettings && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--warning-soft)] border border-[var(--warning-border)] text-[var(--warning-foreground)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-sm text-[var(--warning-foreground)]">
                Chave Pix da plataforma não configurada
              </p>
              <p className="opacity-90">
                Configure a chave Pix oficial do Trevo One para que as consultorias parceiras possam visualizar os dados de pagamento.
              </p>
            </div>
            <Link href="/admin/cobranca-plataforma/configuracoes" className="shrink-0">
              <Button variant="primary" size="sm" className="min-h-[44px]">
                Configurar Pix Agora
              </Button>
            </Link>
          </div>
        )}

        {/* Authoritative Global KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 shadow-xs space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] block">
              Total de Consultorias
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
              {subscriptions.length}
            </p>
            <span className="text-[11px] text-[var(--text-tertiary)] block pt-1">
              Organizações com assinatura ativa no sistema
            </span>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 shadow-xs space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] block">
              Comprovantes em Análise
            </span>
            <p className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              pendingReceipts.length > 0 ? "text-[var(--warning-foreground)]" : "text-[var(--text-primary)]"
            }`}>
              {pendingReceipts.length}
            </p>
            <span className="text-[11px] text-[var(--text-tertiary)] block pt-1">
              {pendingReceipts.length > 0
                ? "Requer validação e quitação pela equipe"
                : "Nenhum comprovante pendente de conciliação"}
            </span>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 shadow-xs space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] block">
              Chave Pix Oficial
            </span>
            <p className="text-sm font-mono font-bold text-[var(--text-primary)] truncate pt-1">
              {platformSettings ? `${platformSettings.pixKeyType}: ${platformSettings.pixKey}` : "Não configurada"}
            </p>
            <span className="text-[11px] text-[var(--text-tertiary)] block pt-1">
              {platformSettings ? `Favorecido: ${platformSettings.receiverName}` : "Defina a chave nas configurações"}
            </span>
          </div>
        </div>

        {/* Fila de Comprovantes em Análise */}
        {pendingReceipts.length > 0 && (
          <div className="bg-[var(--surface)] border border-[var(--warning-border)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--warning-foreground)] inline-block animate-pulse" />
                  Comprovantes Aguardando Análise ({pendingReceipts.length})
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Comprovantes Pix enviados pelas consultorias que precisam de validação da equipe Trevo One.
                </p>
              </div>
            </div>

            <div className="divide-y divide-[var(--border-subtle)]">
              {pendingReceipts.map((rc) => (
                <div
                  key={rc.publicId}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[var(--text-primary)] text-sm truncate">
                        {rc.consultancyName}
                      </span>
                      <Badge variant="warning" size="sm">
                        Em análise
                      </Badge>
                    </div>
                    <p className="text-[var(--text-secondary)] font-medium truncate">
                      Fatura: <strong className="text-[var(--text-primary)]">{rc.chargeTitle}</strong> ({formatBrlCents(rc.chargeAmountCents)}) • Vencimento: {formatIsoDateToBr(rc.chargeDueOn)}
                    </p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      Enviado por {rc.submitterName} em {formatIsoDateToBr(rc.createdAt.toISOString().slice(0, 10))} • Arquivo: {rc.fileName}
                    </p>
                  </div>

                  <Link
                    href={`/admin/cobranca-plataforma/comprovantes/${rc.publicId}`}
                    className="shrink-0"
                  >
                    <Button variant="primary" size="sm" className="min-h-[44px] text-xs font-semibold shadow-xs">
                      Avaliar Comprovante →
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Consultorias & Assinaturas */}
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Assinaturas das Consultorias ({subscriptions.length})
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Status operacional de faturamento e controle de acesso por consultoria cadastrada.
            </p>
          </div>

          {subscriptions.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)] py-4 text-center">
              Nenhuma consultoria cadastrada para cobrança.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {subscriptions.map((s) => (
                <div
                  key={s.consultancyPublicId}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[var(--text-primary)] text-sm sm:text-base truncate">
                        {s.consultancyName}
                      </span>
                      <Badge variant={getSubscriptionBadgeVariant(s.effectiveStatus)} size="sm">
                        {getSubscriptionLabel(s.effectiveStatus)}
                      </Badge>
                    </div>
                    <p className="text-[var(--text-secondary)] text-[11px]">
                      Slug: <code className="bg-[var(--surface-subtle)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono">{s.consultancySlug}</code> • Fuso: {s.consultancyTimezone}
                    </p>
                    <p className="text-[var(--text-secondary)]">
                      Faturas em aberto: <strong className="text-[var(--text-primary)] font-semibold">{s.openChargesCount}</strong>
                      {s.pendingReceiptsCount > 0 && (
                        <span className="text-[var(--warning-foreground)] font-semibold ml-2">
                          • {s.pendingReceiptsCount} comprovante(s) em análise
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 pt-2 sm:pt-0 border-t border-[var(--border-subtle)] sm:border-t-0">
                    <Link href={`/admin/cobranca-plataforma/consultorias/${s.consultancyPublicId}`}>
                      <Button variant="outline" size="sm" className="min-h-[44px] text-xs font-medium">
                        Detalhes & Faturas →
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
