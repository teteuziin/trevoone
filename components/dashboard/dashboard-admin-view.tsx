import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ConsultancyAdminOverview } from "@/lib/consultancies/admin";
import type { PlatformEffectiveAccessState } from "@/lib/platform-admin/billing";

interface DashboardAdminViewProps {
  consultancySlug: string;
  overview: ConsultancyAdminOverview | null;
  platformAccess?: PlatformEffectiveAccessState;
}

/* =========================================================================
   VOLUMETRIC ICONS (Trevo Brand DNA - Local Inline SVG)
   ========================================================================= */

function VolumetricTeamIcon({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="teamGlow" cx="0%" cy="0%" r="90%">
          <stop offset="0%" stopColor="#34D399" stopOpacity="0.4" />
          <stop offset="60%" stopColor="#00A859" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#00A859" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="teamCardBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="50%" stopColor="#00A859" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="teamLayerBack" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="teamHighlight" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <filter id="teamShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Ambient Glow */}
      <circle cx="28" cy="28" r="26" fill="url(#teamGlow)" />

      {/* Background Secondary Avatars */}
      <circle cx="18" cy="22" r="6" fill="url(#teamLayerBack)" filter="url(#teamShadow)" />
      <path
        d="M10 38c0-4.418 3.582-8 8-8s8 3.582 8 8"
        stroke="url(#teamLayerBack)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      <circle cx="38" cy="22" r="6" fill="url(#teamLayerBack)" filter="url(#teamShadow)" />
      <path
        d="M30 38c0-4.418 3.582-8 8-8s8 3.582 8 8"
        stroke="url(#teamLayerBack)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Protagonist Central Avatar */}
      <circle cx="28" cy="19" r="7.5" fill="url(#teamCardBg)" filter="url(#teamShadow)" />
      <circle cx="28" cy="19" r="7" stroke="url(#teamHighlight)" strokeWidth="1" />
      <path
        d="M18 41c0-5.523 4.477-10 10-10s10 4.477 10 10"
        stroke="url(#teamCardBg)"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
        filter="url(#teamShadow)"
      />
      <path
        d="M18 41c0-5.523 4.477-10 10-10s10 4.477 10 10"
        stroke="url(#teamHighlight)"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />

      {/* Center Shield / Trevo Badge */}
      <circle cx="28" cy="34" r="3.5" fill="#34D399" />
      <path
        d="M26.5 34l1 1 2-2"
        stroke="#064E3B"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VolumetricFinanceIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="finBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="finCoin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="finHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <filter id="finShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.2" />
        </filter>
      </defs>
      {/* Wallet / Card Base */}
      <rect x="6" y="12" width="34" height="24" rx="6" fill="url(#finBg)" filter="url(#finShadow)" />
      <rect x="6" y="12" width="34" height="24" rx="6" stroke="url(#finHighlight)" strokeWidth="1" />
      {/* Flap */}
      <path d="M6 18h34" stroke="url(#finHighlight)" strokeWidth="1" />
      {/* Coin Accent */}
      <circle cx="33" cy="24" r="6.5" fill="url(#finCoin)" filter="url(#finShadow)" />
      <circle cx="33" cy="24" r="6" stroke="#FEF3C7" strokeWidth="0.75" />
      <text x="33" y="27" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#78350F">
        R$
      </text>
    </svg>
  );
}

function VolumetricMissionsIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="misBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
        <linearGradient id="misStar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#EAB308" />
        </linearGradient>
        <linearGradient id="misHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <filter id="misShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.2" />
        </filter>
      </defs>
      {/* Badge Shield */}
      <path
        d="M24 6l13 5v12c0 9.5-6 16-13 19-7-3-13-9.5-13-19V11l13-5z"
        fill="url(#misBg)"
        filter="url(#misShadow)"
      />
      <path
        d="M24 6l13 5v12c0 9.5-6 16-13 19-7-3-13-9.5-13-19V11l13-5z"
        stroke="url(#misHighlight)"
        strokeWidth="1"
      />
      {/* Star Emblem */}
      <path
        d="M24 16l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L24 16z"
        fill="url(#misStar)"
        filter="url(#misShadow)"
      />
    </svg>
  );
}

function VolumetricSubscriptionIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="subBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
        <linearGradient id="subSeal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="subHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <filter id="subShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.2" />
        </filter>
      </defs>
      {/* Verified Seal */}
      <rect x="8" y="10" width="32" height="28" rx="7" fill="url(#subBg)" filter="url(#subShadow)" />
      <rect x="8" y="10" width="32" height="28" rx="7" stroke="url(#subHighlight)" strokeWidth="1" />
      {/* Center Check / Trevo Seal */}
      <circle cx="24" cy="24" r="8" fill="url(#subSeal)" filter="url(#subShadow)" />
      <path
        d="M20.5 24l2.5 2.5 5-5"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================================
   MAIN VIEW
   ========================================================================= */

export function DashboardAdminView({
  consultancySlug,
  overview,
  platformAccess,
}: DashboardAdminViewProps) {
  const isSuspendedOrCanceled = platformAccess && !platformAccess.isOperationalAllowed;
  const isInGrace = platformAccess && platformAccess.effectiveStatus === "GRACE";
  const hasSubscriptionP0 = isSuspendedOrCanceled || isInGrace;

  return (
    <div className="space-y-6">
      {/* 1. Alertas P0 de Assinatura da Plataforma */}
      {isSuspendedOrCanceled && (
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-foreground)] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="danger" size="sm">
                  {platformAccess.effectiveStatus === "CANCELED"
                    ? "Assinatura Cancelada"
                    : "Serviços Suspensos"}
                </Badge>
                <span className="text-xs font-semibold text-[var(--danger-foreground)]">
                  Acesso operacional bloqueado
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--danger-foreground)] opacity-90">
                {platformAccess.effectiveStatus === "CANCELED"
                  ? "A assinatura desta consultoria foi cancelada. Regularize ou entre em contato com o suporte da plataforma."
                  : platformAccess.effectiveReason === "NONPAYMENT"
                  ? "O acesso aos módulos operacionais foi suspenso devido a faturas em atraso além do período de carência."
                  : `A consultoria foi suspensa administrativamente: ${
                      platformAccess.manualSuspensionReason || "Sem motivo informado."
                    }`}
              </p>
            </div>
            <Link href={`/consultoria/${consultancySlug}/assinatura`} className="shrink-0">
              <Button variant="danger" size="sm">
                Gerenciar Assinatura →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {isInGrace && (
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="warning" size="sm">
                  Carência de Pagamento
                </Badge>
                <span className="text-xs font-semibold text-[var(--warning-foreground)]">
                  Fatura da consultoria pendente
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--warning-foreground)] opacity-90">
                Há uma fatura da consultoria com período de carência ativo. Realize o pagamento para
                evitar a suspensão dos serviços.
              </p>
            </div>
            <Link href={`/consultoria/${consultancySlug}/assinatura`} className="shrink-0">
              <Button variant="secondary" size="sm">
                Ver Fatura e Pix →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 2. PROTAGONISTA OPERACIONAL: Equipe da Consultoria */}
      {overview ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--surface)] to-[var(--surface-subtle)] border border-[var(--border-default)] p-5 sm:p-7 shadow-xs">
          {/* Subtle Ambient Brand Glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-[var(--brand)]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="shrink-0">
                  <VolumetricTeamIcon className="w-12 h-12 sm:w-14 sm:h-14" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand)]">
                    Operação & Equipe
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                      {overview.activeMembers}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)]">
                      {overview.activeMembers === 1 ? "membro ativo" : "membros ativos"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Role Composition Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] font-medium shadow-2xs">
                  <strong className="text-[var(--text-primary)] font-bold">{overview.students}</strong>{" "}
                  {overview.students === 1 ? "Aluno" : "Alunos"}
                </span>
                <span className="px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] font-medium shadow-2xs">
                  <strong className="text-[var(--text-primary)] font-bold">{overview.personals}</strong>{" "}
                  {overview.personals === 1 ? "Personal" : "Personais"}
                </span>
                <span className="px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] font-medium shadow-2xs">
                  <strong className="text-[var(--text-primary)] font-bold">
                    {overview.nutritionists}
                  </strong>{" "}
                  {overview.nutritionists === 1 ? "Nutricionista" : "Nutricionistas"}
                </span>
                <span className="px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] font-medium shadow-2xs">
                  <strong className="text-[var(--text-primary)] font-bold">{overview.admins}</strong>{" "}
                  {overview.admins === 1 ? "Admin" : "Admins"}
                </span>
              </div>
            </div>

            {/* Protagonist CTA */}
            <div className="shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--border-subtle)]">
              <Link href={`/consultoria/${consultancySlug}/membros`}>
                <Button variant="primary" size="md" className="w-full sm:w-auto font-semibold shadow-xs">
                  Gerenciar Membros →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] text-center text-xs text-[var(--text-secondary)]">
          Dados da equipe indisponíveis no momento.
        </div>
      )}

      {/* 3. MÓDULOS OPERACIONAIS DE SUPORTE (Deduplicados e Asimétricos) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
          Central Operacional
        </h3>

        <div
          className={`grid gap-4 ${
            hasSubscriptionP0
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {/* Financeiro dos Alunos */}
          <Link
            href={`/consultoria/${consultancySlug}/financeiro`}
            className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand)] hover:bg-[var(--surface-hover)] transition-colors group flex flex-col justify-between space-y-4 focus-visible:outline-[var(--brand)]"
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <VolumetricFinanceIcon className="w-9 h-9 shrink-0 group-hover:scale-105 transition-transform" />
                <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                  Financeiro dos Alunos
                </h4>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                Controle de mensalidades, cobranças Pix e conciliação de pagamentos.
              </p>
            </div>
            <div className="text-xs font-semibold text-[var(--brand)] flex items-center gap-1 pt-1">
              <span>Acessar financeiro</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </div>
          </Link>

          {/* Missões (Influenciadores / VIP) */}
          <Link
            href={`/consultoria/${consultancySlug}/missoes/gestao`}
            className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand)] hover:bg-[var(--surface-hover)] transition-colors group flex flex-col justify-between space-y-4 focus-visible:outline-[var(--brand)]"
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <VolumetricMissionsIcon className="w-9 h-9 shrink-0 group-hover:scale-105 transition-transform" />
                <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                  Missões (Influenciadores)
                </h4>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                Criação, acompanhamento e revisão de entregas dos influenciadores VIP.
              </p>
            </div>
            <div className="text-xs font-semibold text-[var(--brand)] flex items-center gap-1 pt-1">
              <span>Gerenciar missões</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </div>
          </Link>

          {/* Assinatura Trevo One (Omitido se houver P0 ativo para evitar duplicação) */}
          {!hasSubscriptionP0 && (
            <Link
              href={`/consultoria/${consultancySlug}/assinatura`}
              className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand)] hover:bg-[var(--surface-hover)] transition-colors group flex flex-col justify-between space-y-4 focus-visible:outline-[var(--brand)] sm:col-span-2 lg:col-span-1"
            >
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <VolumetricSubscriptionIcon className="w-9 h-9 shrink-0 group-hover:scale-105 transition-transform" />
                  <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                    Assinatura Trevo One
                  </h4>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                  Gestão do plano da consultoria, faturas da plataforma e controle de carência.
                </p>
              </div>
              <div className="text-xs font-semibold text-[var(--brand)] flex items-center gap-1 pt-1">
                <span>Ver assinatura</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
