"use client";

import React, { useState } from "react";
import { UserAvatar } from "@/components/account/user-avatar";
import {
  approveCommissionAction,
  cancelCommissionAction,
  markCommissionPaidAction,
  revealPixKeyAction,
  updateReferralSettingsAction,
  toggleParticipantPromotionAction,
  archiveMarketingMaterialAction,
} from "@/app/consultoria/[slug]/indicacoes/actions";
import type {
  ConsultancyReferralSettings,
  CommissionStatus,
  CommissionType,
  PixKeyType,
} from "@/lib/referrals/service";
import type {
  PromotionalCampaignLinkRecord,
  EligiblePromotionParticipant,
  PromotionalMarketingMaterialRecord,
} from "@/lib/referrals/campaigns";
import { CampaignLinkModal } from "./campaign-link-modal";
import { MarketingMaterialModal } from "./marketing-material-modal";

function formatBrl(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

interface AdminReferralsViewProps {
  consultancySlug: string;
  settings: ConsultancyReferralSettings;
  kpis: {
    totalReferrers: number;
    totalRegistrations: number;
    totalConversions: number;
    pendingAmount: number;
    approvedAmount: number;
    paidAmount: number;
  };
  referrers: Array<{
    memberId: number;
    userPublicId: string;
    name: string;
    role: string;
    code: string;
    registrations: number;
    conversions: number;
    pendingAmount: number;
    paidAmount: number;
    hasPix: boolean;
  }>;
  commissions: Array<{
    id: number;
    publicId: string;
    referrerMemberId: number;
    referrerName: string;
    referrerRole: string;
    studentName: string;
    commissionType: CommissionType;
    rateBasisPoints: number | null;
    baseAmount: number | null;
    amount: number | null;
    status: CommissionStatus;
    pixMasked: string;
    createdAt: Date;
    approvedAt: Date | null;
    paidAt: Date | null;
  }>;
  eligibleParticipants?: EligiblePromotionParticipant[];
  campaignLinks?: PromotionalCampaignLinkRecord[];
  materials?: PromotionalMarketingMaterialRecord[];
}

export function AdminReferralsView({
  consultancySlug,
  settings,
  kpis,
  commissions,
  eligibleParticipants = [],
  campaignLinks = [],
  materials = [],
}: AdminReferralsViewProps) {
  const [activeTab, setActiveTab] = useState<
    "campaigns" | "participants" | "materials" | "commissions" | "settings"
  >("campaigns");

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchFilter, setSearchFilter] = useState("");
  const [participantFilter, setParticipantFilter] = useState<number>(0);
  const [materialFormatFilter, setMaterialFormatFilter] = useState<string>("ALL");

  // Modals state
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaignLink, setEditingCampaignLink] = useState<PromotionalCampaignLinkRecord | null>(null);
  const [campaignModalDefaultMemberId, setCampaignModalDefaultMemberId] = useState<number | null>(null);

  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);

  // Settings state
  const [isEnabled, setIsEnabled] = useState(settings.isEnabled);
  const [commissionType, setCommissionType] = useState<CommissionType>(settings.commissionType);
  const [commissionValue, setCommissionValue] = useState<number>(settings.commissionValue);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Modal states for commission actions
  const [selectedCommission, setSelectedCommission] = useState<(typeof commissions)[0] | null>(null);
  const [actionType, setActionType] = useState<"approve" | "cancel" | "pay" | "reveal_pix" | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [baseAmountInput, setBaseAmountInput] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Toggling participant status
  const [togglingParticipantId, setTogglingParticipantId] = useState<number | null>(null);
  const [participantActionFeedback, setParticipantActionFeedback] = useState<string | null>(null);

  // Archiving material
  const [archivingMaterialId, setArchivingMaterialId] = useState<number | null>(null);

  // Revealed PIX state
  const [revealedPix, setRevealedPix] = useState<{
    pixKey: string;
    pixKeyType: PixKeyType;
    receiverName?: string | null;
  } | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedLinkUrl, setCopiedLinkUrl] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://trevoone.com";

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsError(null);
    setSettingsSuccess(null);

    const res = await updateReferralSettingsAction(
      consultancySlug,
      isEnabled,
      commissionType,
      commissionValue
    );
    setIsSavingSettings(false);

    if (!res.success) {
      setSettingsError(res.error || "Erro ao salvar configurações.");
    } else {
      setSettingsSuccess("Configurações atualizadas com sucesso!");
    }
  }

  async function handleApprove(commissionId: number, baseAmountCents?: number) {
    setIsProcessingAction(true);
    setActionError(null);
    const res = await approveCommissionAction(consultancySlug, commissionId, baseAmountCents);
    setIsProcessingAction(false);
    if (!res.success) {
      setActionError(res.error || "Erro ao aprovar comissão.");
    } else {
      setActionType(null);
      setSelectedCommission(null);
      setBaseAmountInput("");
    }
  }

  async function handleCancel(commissionId: number) {
    if (!cancelReason.trim()) {
      setActionError("Informe o motivo do cancelamento.");
      return;
    }
    setIsProcessingAction(true);
    setActionError(null);
    const res = await cancelCommissionAction(consultancySlug, commissionId, cancelReason);
    setIsProcessingAction(false);
    if (!res.success) {
      setActionError(res.error || "Erro ao cancelar comissão.");
    } else {
      setActionType(null);
      setSelectedCommission(null);
      setCancelReason("");
    }
  }

  async function handleMarkPaid(commissionId: number) {
    setIsProcessingAction(true);
    setActionError(null);
    const res = await markCommissionPaidAction(consultancySlug, commissionId, paymentNote);
    setIsProcessingAction(false);
    if (!res.success) {
      setActionError(res.error || "Erro ao marcar como pago.");
    } else {
      setActionType(null);
      setSelectedCommission(null);
      setPaymentNote("");
    }
  }

  async function handleRevealPix(referrerMemberId: number) {
    setIsProcessingAction(true);
    setActionError(null);
    const res = await revealPixKeyAction(consultancySlug, referrerMemberId);
    setIsProcessingAction(false);
    if (!res.success || !res.pixKey) {
      setActionError(res.error || "Não foi possível consultar os dados PIX.");
    } else {
      setRevealedPix({
        pixKey: res.pixKey,
        pixKeyType: res.pixKeyType || "CPF",
        receiverName: res.receiverName,
      });
    }
  }

  async function handleToggleParticipant(memberId: number, currentlyEnabled: boolean) {
    setTogglingParticipantId(memberId);
    setParticipantActionFeedback(null);
    const res = await toggleParticipantPromotionAction(consultancySlug, memberId, !currentlyEnabled);
    setTogglingParticipantId(null);
    if (!res.success) {
      setParticipantActionFeedback(res.error || "Erro ao atualizar participante.");
    } else {
      setParticipantActionFeedback(
        currentlyEnabled ? "Participação pausada com sucesso." : "Participação habilitada com sucesso."
      );
      setTimeout(() => setParticipantActionFeedback(null), 3000);
    }
  }

  async function handleArchiveMaterial(materialId: number) {
    if (!confirm("Tem certeza que deseja retirar este material de circulação?")) return;
    setArchivingMaterialId(materialId);
    await archiveMarketingMaterialAction(consultancySlug, materialId);
    setArchivingMaterialId(null);
  }

  function handleCopyShareableUrl(code: string) {
    const full = `${baseUrl}/r/${code}`;
    navigator.clipboard.writeText(full);
    setCopiedLinkUrl(code);
    setTimeout(() => setCopiedLinkUrl(null), 2500);
  }

  // Filter commissions
  const filteredCommissions = commissions.filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        c.referrerName.toLowerCase().includes(q) ||
        c.studentName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filter campaign links
  const filteredLinks = campaignLinks.filter((l) => {
    if (participantFilter > 0 && l.referrerMemberId !== participantFilter) return false;
    if (statusFilter !== "ALL" && l.status !== statusFilter) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) ||
        (l.referrerName && l.referrerName.toLowerCase().includes(q)) ||
        l.code.toLowerCase().includes(q) ||
        l.destinationUrl.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filter participants
  const filteredParticipants = eligibleParticipants.filter((p) => {
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.defaultCode && p.defaultCode.toLowerCase().includes(q));
    }
    return true;
  });

  // Filter materials
  const filteredMaterials = materials.filter((m) => {
    if (materialFormatFilter !== "ALL" && m.mediaFormat !== materialFormatFilter) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return m.title.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q));
    }
    return true;
  });

  const statusBadges: Record<CommissionStatus, { label: string; className: string }> = {
    PENDING: { label: "Pendente", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
    APPROVED: { label: "Aprovada", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
    PAID: { label: "Paga", className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30" },
    CANCELLED: { label: "Cancelada", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20" },
  };

  return (
    <div className="space-y-6">
      {/* Top KPIs — Standardized Executive 6-Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Membros Indicadores
          </span>
          <span className="text-2xl font-bold text-[var(--text-primary)] mt-1 block">
            {kpis.totalReferrers}
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Cadastros Realizados
          </span>
          <span className="text-2xl font-bold text-[var(--text-primary)] mt-1 block">
            {kpis.totalRegistrations}
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Matrículas Confirmadas
          </span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {kpis.totalConversions}
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            Comissões Pendentes
          </span>
          <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
            {formatBrl(kpis.pendingAmount)}
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Aprovadas (A Pagar)
          </span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {formatBrl(kpis.approvedAmount)}
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-[#8E95A2] uppercase tracking-wider block">
            Total Pago (PIX)
          </span>
          <span className="text-xl font-bold text-zinc-900 dark:text-white mt-1 block">
            {formatBrl(kpis.paidAmount)}
          </span>
        </div>
      </div>

      {/* Main Tab Bar */}
      <div className="flex items-center gap-1 border-b border-[var(--border-default)] overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => {
            setActiveTab("campaigns");
            setStatusFilter("ALL");
            setSearchFilter("");
          }}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-2 ${
            activeTab === "campaigns"
              ? "border-[var(--brand)] text-[var(--brand)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <span>🔗 Links &amp; Campanhas</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)]">
            {campaignLinks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("participants");
            setSearchFilter("");
          }}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-2 ${
            activeTab === "participants"
              ? "border-[var(--brand)] text-[var(--brand)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <span>👥 Participantes &amp; VIPs</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)]">
            {eligibleParticipants.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("materials");
            setSearchFilter("");
          }}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-2 ${
            activeTab === "materials"
              ? "border-[var(--brand)] text-[var(--brand)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <span>🎨 Materiais de Divulgação</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)]">
            {materials.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("commissions");
            setStatusFilter("ALL");
            setSearchFilter("");
          }}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-2 ${
            activeTab === "commissions"
              ? "border-[var(--brand)] text-[var(--brand)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <span>💰 Comissões &amp; Pagamentos</span>
          {commissions.some((c) => c.status === "PENDING") && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer min-h-[44px] ${
            activeTab === "settings"
              ? "border-[var(--brand)] text-[var(--brand)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          ⚙ Configurações Gerais
        </button>
      </div>

      {/* ==================================================================== */}
      {/* ABA 1: LINKS & CAMPANHAS INDIVIDUAIS                                 */}
      {/* ==================================================================== */}
      {activeTab === "campaigns" && (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Links Individuais de Divulgação</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Cadastre e controle links manuais com URLs específicas por parceiro.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingCampaignLink(null);
                setCampaignModalDefaultMemberId(null);
                setIsCampaignModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-[var(--brand)] hover:brightness-110 active:scale-98 text-white text-xs font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-2 shadow-xs self-start sm:self-center"
            >
              <span>+ Novo link de divulgação</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <input
              type="text"
              placeholder="Buscar por título, parceiro, código ou URL..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] min-h-[40px] focus:outline-hidden focus:border-[var(--brand)]"
            />

            <select
              value={participantFilter}
              onChange={(e) => setParticipantFilter(Number(e.target.value))}
              className="px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] min-h-[40px]"
            >
              <option value={0}>Todos os Participantes</option>
              {eligibleParticipants.map((p) => (
                <option key={p.memberId} value={p.memberId}>
                  {p.name} ({p.role === "INFLUENCER" ? "VIP" : "Aluno"})
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] min-h-[40px]"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ACTIVE">Ativo</option>
              <option value="PAUSED">Pausado</option>
              <option value="DRAFT">Rascunho</option>
              <option value="ENDED">Encerrado</option>
            </select>
          </div>

          {/* Links List */}
          {filteredLinks.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-secondary)] space-y-2">
              <span className="text-2xl block">🔗</span>
              <p className="font-semibold text-[var(--text-primary)]">Nenhum link encontrado</p>
              <p className="max-w-md mx-auto">
                Clique no botão &quot;+ Novo link de divulgação&quot; acima para cadastrar a primeira campanha individual para um participante.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                    <th className="pb-3 font-semibold">Campanha</th>
                    <th className="pb-3 font-semibold">Participante</th>
                    <th className="pb-3 font-semibold">Destino Configurado</th>
                    <th className="pb-3 font-semibold">Desconto</th>
                    <th className="pb-3 font-semibold">Comissão</th>
                    <th className="pb-3 font-semibold">Cliques</th>
                    <th className="pb-3 font-semibold">Conversões</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredLinks.map((link) => {
                    const isCopied = copiedLinkUrl === link.code;
                    return (
                      <tr key={link.id} className="hover:bg-[var(--surface-subtle)] transition-colors">
                        <td className="py-3">
                          <div>
                            <span className="font-bold text-[var(--text-primary)] block">
                              {link.title}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] font-bold text-[var(--brand)] bg-[var(--surface-subtle)] px-1.5 py-0.5 rounded border border-[var(--border-default)]">
                                {link.code}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyShareableUrl(link.code)}
                                className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                                title="Copiar link"
                              >
                                {isCopied ? "✓ Copiado" : "Copiar"}
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              fullName={link.referrerName}
                              userPublicId={link.referrerUserPublicId}
                              hasProfilePhoto={link.referrerHasProfilePhoto}
                              profilePhotoUpdatedAt={link.referrerProfilePhotoUpdatedAt}
                              size="xs"
                            />
                            <div>
                              <span className="font-semibold text-[var(--text-primary)] block">
                                {link.referrerName}
                              </span>
                              <span className="text-[10px] text-[var(--text-tertiary)] uppercase">
                                {link.referrerRole === "INFLUENCER" ? "VIP" : "Aluno"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 max-w-xs truncate" title={link.destinationUrl}>
                          <span className="font-mono text-[11px] text-[var(--text-secondary)] truncate block">
                            {link.destinationUrl}
                          </span>
                        </td>

                        <td className="py-3">
                          {link.announcedDiscountValue ? (
                            <span className="font-bold text-[11px] px-2 py-0.5 rounded-lg bg-[var(--brand-soft)] border border-[var(--brand-border)] text-[var(--brand-foreground)]">
                              {link.announcedDiscountValue}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--text-tertiary)]">Sem desconto</span>
                          )}
                        </td>

                        <td className="py-3 font-semibold text-[var(--text-primary)]">
                          <div>
                            <span>{link.commissionValueFormatted}</span>
                            {link.commissionConditions && (
                              <span className="text-[10px] text-[var(--text-tertiary)] block truncate max-w-[120px]">
                                {link.commissionConditions}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 font-mono font-bold text-[var(--text-primary)]">
                          {link.clickCount}
                        </td>

                        <td className="py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {link.conversionsCount || 0}
                        </td>

                        <td className="py-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                              link.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : link.status === "PAUSED"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                            }`}
                          >
                            {link.status === "ACTIVE"
                              ? "Ativo"
                              : link.status === "PAUSED"
                              ? "Pausado"
                              : link.status === "DRAFT"
                              ? "Rascunho"
                              : "Encerrado"}
                          </span>
                        </td>

                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCampaignLink(link);
                              setIsCampaignModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer min-h-[36px]"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 2: GESTÃO DE PARTICIPANTES                                       */}
      {/* ==================================================================== */}
      {activeTab === "participants" && (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Participantes Elegíveis</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Controle o acesso, habilite ou pause a participação e crie links para alunos e VIPs desta consultoria.
              </p>
            </div>

            <input
              type="text"
              placeholder="Buscar por nome ou código..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] min-h-[40px] focus:outline-hidden focus:border-[var(--brand)] w-full sm:w-64"
            />
          </div>

          {participantActionFeedback && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              {participantActionFeedback}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                  <th className="pb-3 font-semibold">Participante</th>
                  <th className="pb-3 font-semibold">Papel</th>
                  <th className="pb-3 font-semibold">Links Criados</th>
                  <th className="pb-3 font-semibold">Cliques</th>
                  <th className="pb-3 font-semibold">Matrículas</th>
                  <th className="pb-3 font-semibold">Pendente</th>
                  <th className="pb-3 font-semibold">Pago</th>
                  <th className="pb-3 font-semibold">Participação</th>
                  <th className="pb-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredParticipants.map((p) => {
                  const isToggling = togglingParticipantId === p.memberId;
                  return (
                    <tr key={p.memberId} className="hover:bg-[var(--surface-subtle)] transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            fullName={p.name}
                            userPublicId={p.userPublicId}
                            hasProfilePhoto={p.hasProfilePhoto}
                            profilePhotoUpdatedAt={p.profilePhotoUpdatedAt}
                            size="sm"
                          />
                          <div>
                            <span className="font-semibold text-[var(--text-primary)] block">
                              {p.name}
                            </span>
                            {p.defaultCode && (
                              <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                                Cód: {p.defaultCode}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 text-[var(--text-secondary)] font-medium">
                        {p.role === "INFLUENCER" ? "Influenciador / VIP" : "Aluno"}
                      </td>

                      <td className="py-3 font-bold text-[var(--text-primary)]">
                        {p.totalCampaignLinks}
                      </td>

                      <td className="py-3 font-mono font-bold text-[var(--text-primary)]">
                        {p.totalClicks}
                      </td>

                      <td className="py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {p.totalConversions}
                      </td>

                      <td className="py-3 font-medium text-amber-600 dark:text-amber-400">
                        {formatBrl(p.pendingAmount)}
                      </td>

                      <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {formatBrl(p.paidAmount)}
                      </td>

                      <td className="py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                            p.isPromotionEnabled
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {p.isPromotionEnabled ? "Habilitado" : "Pausado"}
                        </span>
                      </td>

                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCampaignLink(null);
                              setCampaignModalDefaultMemberId(p.memberId);
                              setIsCampaignModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] transition-colors cursor-pointer min-h-[36px]"
                            title="Cadastrar link para este participante"
                          >
                            + Link
                          </button>

                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleToggleParticipant(p.memberId, p.isPromotionEnabled)}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer min-h-[36px] ${
                              p.isPromotionEnabled
                                ? "border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white"
                            }`}
                          >
                            {isToggling ? "..." : p.isPromotionEnabled ? "Pausar" : "Habilitar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 3: MATERIAIS DE DIVULGAÇÃO                                       */}
      {/* ==================================================================== */}
      {activeTab === "materials" && (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Gestão de Materiais de Divulgação</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Disponibilize artes oficiais, Stories 9:16, Feed 1:1 e legendas prontas para seus parceiros.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsMaterialModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-[var(--brand)] hover:brightness-110 active:scale-98 text-white text-xs font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-2 shadow-xs self-start sm:self-center"
            >
              <span>+ Adicionar Material</span>
            </button>
          </div>

          {/* Formats filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(
              [
                { id: "ALL", label: "Todos os Materiais" },
                { id: "STORY", label: "Stories (9:16)" },
                { id: "FEED", label: "Feed / Posts (1:1)" },
                { id: "BANNER", label: "Banners" },
                { id: "VIDEO", label: "Vídeos" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setMaterialFormatFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[36px] ${
                  materialFormatFilter === f.id
                    ? "bg-[var(--brand)] text-white shadow-xs"
                    : "bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredMaterials.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-secondary)] space-y-2">
              <span className="text-2xl block">🎨</span>
              <p className="font-semibold text-[var(--text-primary)]">Nenhum material cadastrado</p>
              <p className="max-w-md mx-auto">
                Clique no botão &quot;+ Adicionar Material&quot; acima para cadastrar artes de Stories ou Feed.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMaterials.map((mat) => {
                const isStory = mat.mediaFormat === "STORY";
                const isArchiving = archivingMaterialId === mat.id;

                return (
                  <div
                    key={mat.id}
                    className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2.5">
                      <div
                        className={`w-full rounded-xl bg-[var(--surface)] border border-[var(--border-default)] flex items-center justify-center overflow-hidden relative ${
                          isStory ? "aspect-[9/16] max-h-56" : "aspect-square max-h-44"
                        }`}
                      >
                        {mat.fileUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mat.fileUrl}
                            alt={mat.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="p-4 text-center text-zinc-400 space-y-1">
                            <span className="text-2xl block">🎨</span>
                            <span className="text-[11px] font-semibold block">{mat.mediaFormat}</span>
                          </div>
                        )}
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-black/70 text-white">
                          {mat.mediaFormat}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">{mat.title}</h4>
                        {mat.description && (
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                            {mat.description}
                          </p>
                        )}
                      </div>

                      {mat.suggestedCaption && (
                        <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] text-[11px] text-[var(--text-secondary)] italic line-clamp-2">
                          &quot;{mat.suggestedCaption}&quot;
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        {mat.isGlobal ? "Todos os parceiros" : "Pessoa específica"}
                      </span>
                      <button
                        type="button"
                        disabled={isArchiving}
                        onClick={() => handleArchiveMaterial(mat.id)}
                        className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                      >
                        {isArchiving ? "..." : "Retirar arte"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 4: COMISSÕES & LIQUIDAÇÃO PIX                                    */}
      {/* ==================================================================== */}
      {activeTab === "commissions" && (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Fila de Comissões e Pagamentos</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Aprove comissões pendentes, consulte dados PIX protegidos e liquide repasses manualmente.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] min-h-[40px]"
              >
                <option value="ALL">Todos os status</option>
                <option value="PENDING">Pendentes</option>
                <option value="APPROVED">Aprovadas</option>
                <option value="PAID">Pagas</option>
                <option value="CANCELLED">Canceladas</option>
              </select>

              <input
                type="text"
                placeholder="Filtrar por nome..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] min-h-[40px] focus:outline-hidden focus:border-[var(--brand)]"
              />
            </div>
          </div>

          {filteredCommissions.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-secondary)]">
              Nenhuma comissão encontrada para este filtro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                    <th className="pb-3 font-semibold">Data</th>
                    <th className="pb-3 font-semibold">Indicador</th>
                    <th className="pb-3 font-semibold">Aluno Convertido</th>
                    <th className="pb-3 font-semibold">Regra</th>
                    <th className="pb-3 font-semibold">Valor</th>
                    <th className="pb-3 font-semibold">Chave PIX</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredCommissions.map((c) => (
                    <tr key={c.id} className="hover:bg-[var(--surface-subtle)] transition-colors">
                      <td className="py-3 text-[var(--text-secondary)]">
                        {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3 font-semibold text-[var(--text-primary)]">
                        <div>
                          <span>{c.referrerName}</span>
                          <span className="text-[10px] text-[var(--text-tertiary)] block">
                            {c.referrerRole === "INFLUENCER" ? "VIP" : "Aluno"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 font-medium text-[var(--text-primary)]">{c.studentName}</td>
                      <td className="py-3 text-[var(--text-secondary)]">
                        {c.commissionType === "PERCENTAGE" ? (
                          <span>{(c.rateBasisPoints || 1000) / 100}%</span>
                        ) : (
                          <span>Fixo</span>
                        )}
                      </td>
                      <td className="py-3 font-bold text-[var(--brand)]">
                        {c.amount != null ? formatBrl(c.amount) : "A calcular"}
                      </td>
                      <td className="py-3 font-mono text-[11px] text-[var(--text-secondary)]">{c.pixMasked}</td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${statusBadges[c.status].className}`}>
                          {statusBadges[c.status].label}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCommission(c);
                                  setActionType("approve");
                                }}
                                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer min-h-[36px]"
                              >
                                Aprovar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCommission(c);
                                  setActionType("cancel");
                                }}
                                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer min-h-[36px]"
                              >
                                Cancelar
                              </button>
                            </>
                          )}

                          {c.status === "APPROVED" && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCommission(c);
                                  setActionType("reveal_pix");
                                  handleRevealPix(c.referrerMemberId);
                                }}
                                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] cursor-pointer min-h-[36px]"
                              >
                                Ver PIX
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCommission(c);
                                  setActionType("pay");
                                }}
                                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer min-h-[36px]"
                              >
                                Marcar Pago
                              </button>
                            </>
                          )}

                          {c.status === "PAID" && (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              ✓ Liquidado
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 5: CONFIGURAÇÕES GERAIS                                          */}
      {/* ==================================================================== */}
      {activeTab === "settings" && (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 sm:p-8 shadow-xs max-w-2xl space-y-6">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Configurações Gerais do Programa de Indicações
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Configure os valores padrões e habilite ou desabilite o programa em nível da consultoria.
            </p>
          </div>

          {settingsSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              {settingsSuccess}
            </div>
          )}

          {settingsError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-500/20">
              {settingsError}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
              <div>
                <span className="font-bold text-sm text-[var(--text-primary)] block">
                  Programa Ativo na Consultoria
                </span>
                <span className="text-xs text-[var(--text-secondary)] mt-0.5 block">
                  Quando desativado, nenhum novo link de indicação gerará comissão.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="space-y-4 p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
              <span className="font-bold text-sm text-[var(--text-primary)] block">
                Regra Geral de Comissão Padrão
              </span>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCommissionType("FIXED_AMOUNT")}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer min-h-[44px] ${
                    commissionType === "FIXED_AMOUNT"
                      ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-foreground)] font-bold shadow-xs"
                      : "border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)]"
                  }`}
                >
                  Valor Fixo (R$)
                </button>
                <button
                  type="button"
                  onClick={() => setCommissionType("PERCENTAGE")}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer min-h-[44px] ${
                    commissionType === "PERCENTAGE"
                      ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-foreground)] font-bold shadow-xs"
                      : "border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)]"
                  }`}
                >
                  Percentual (%)
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  {commissionType === "FIXED_AMOUNT"
                    ? "Valor da Comissão Padrão por Aluno (R$)"
                    : "Percentual Padrão sobre a Contratação (%)"}
                </label>
                <input
                  type="number"
                  min="0"
                  max={commissionType === "PERCENTAGE" ? "100" : undefined}
                  step={commissionType === "PERCENTAGE" ? "0.1" : "1"}
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-bold focus:outline-hidden focus:border-[var(--brand)] min-h-[44px]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-6 py-2.5 rounded-2xl bg-[var(--brand)] hover:brightness-110 text-white text-xs font-bold transition-all cursor-pointer min-h-[44px]"
            >
              {isSavingSettings ? "Salvando..." : "Salvar Configurações Gerais"}
            </button>
          </form>
        </div>
      )}

      {/* MODAL: CADASTRO / EDIÇÃO DE LINK DE CAMPANHA */}
      <CampaignLinkModal
        isOpen={isCampaignModalOpen}
        onClose={() => {
          setIsCampaignModalOpen(false);
          setEditingCampaignLink(null);
          setCampaignModalDefaultMemberId(null);
        }}
        consultancySlug={consultancySlug}
        participants={eligibleParticipants}
        materials={materials}
        initialData={editingCampaignLink}
        defaultParticipantId={campaignModalDefaultMemberId}
        onSuccess={() => {
          window.location.reload();
        }}
      />

      {/* MODAL: CADASTRO DE MATERIAL DE DIVULGAÇÃO */}
      <MarketingMaterialModal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        consultancySlug={consultancySlug}
        participants={eligibleParticipants}
        links={campaignLinks}
        onSuccess={() => {
          window.location.reload();
        }}
      />

      {/* MODAL DE AÇÕES DE COMISSÃO (APROVAR, CANCELAR, PAGAR, VER PIX) */}
      {actionType && selectedCommission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-2xl space-y-4">
            {actionType === "approve" && (
              <>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Aprovar Comissão</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Confirme a aprovação da comissão para{" "}
                  <strong>{selectedCommission.referrerName}</strong> pela indicação de{" "}
                  <strong>{selectedCommission.studentName}</strong>.
                </p>

                {selectedCommission.commissionType === "PERCENTAGE" && (
                  <div className="space-y-1 pt-1">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">
                      Valor Base da Contratação (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 150.00"
                      value={baseAmountInput}
                      onChange={(e) => setBaseAmountInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] min-h-[44px]"
                      required
                    />
                    <span className="text-[10px] text-[var(--text-tertiary)] block">
                      A comissão de {(selectedCommission.rateBasisPoints || 1000) / 100}% será calculada exatamente sobre este valor base.
                    </span>
                  </div>
                )}

                {actionError && (
                  <div className="p-3 text-xs rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    {actionError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActionType(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--surface-subtle)] text-[var(--text-secondary)] min-h-[44px]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={() => {
                      const baseCents = baseAmountInput
                        ? Math.round(parseFloat(baseAmountInput) * 100)
                        : undefined;
                      handleApprove(selectedCommission.id, baseCents);
                    }}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer disabled:opacity-50 min-h-[44px]"
                  >
                    {isProcessingAction ? "Aprovando..." : "Confirmar Aprovação"}
                  </button>
                </div>
              </>
            )}

            {actionType === "cancel" && (
              <>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Cancelar Comissão</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  A comissão deixará de ser elegível para recebimento. É obrigatório informar o motivo.
                </p>

                <div className="space-y-1 pt-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Motivo do cancelamento *</label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Cancelamento da matrícula no período de garantia."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] resize-none"
                    required
                  />
                </div>

                {actionError && (
                  <div className="p-3 text-xs rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    {actionError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActionType(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--surface-subtle)] text-[var(--text-secondary)] min-h-[44px]"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={() => handleCancel(selectedCommission.id)}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer disabled:opacity-50 min-h-[44px]"
                  >
                    {isProcessingAction ? "Cancelando..." : "Confirmar Cancelamento"}
                  </button>
                </div>
              </>
            )}

            {actionType === "pay" && (
              <>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Marcar como Pago</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Confirme a liquidação do pagamento de{" "}
                  <strong className="text-emerald-500 font-bold">{formatBrl(selectedCommission.amount)}</strong> para{" "}
                  <strong>{selectedCommission.referrerName}</strong>.
                </p>

                <div className="space-y-1 pt-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Nota de Pagamento (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Transferido via PIX chave celular"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] min-h-[44px]"
                  />
                </div>

                {actionError && (
                  <div className="p-3 text-xs rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    {actionError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActionType(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--surface-subtle)] text-[var(--text-secondary)] min-h-[44px]"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={() => handleMarkPaid(selectedCommission.id)}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer disabled:opacity-50 min-h-[44px]"
                  >
                    {isProcessingAction ? "Salvando..." : "Confirmar Pagamento"}
                  </button>
                </div>
              </>
            )}

            {actionType === "reveal_pix" && (
              <>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Dados PIX para Pagamento</h3>
                {isProcessingAction ? (
                  <p className="text-xs text-[var(--text-secondary)]">Consultando chave PIX segura...</p>
                ) : revealedPix ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block">
                        {revealedPix.pixKeyType}
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-bold text-[var(--text-primary)] select-all break-all">
                          {revealedPix.pixKey}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(revealedPix.pixKey);
                            setCopiedPix(true);
                            setTimeout(() => setCopiedPix(false), 2000);
                          }}
                          className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0 cursor-pointer min-h-[36px]"
                        >
                          {copiedPix ? "Copiado!" : "Copiar"}
                        </button>
                      </div>
                      {revealedPix.receiverName && (
                        <p className="text-xs text-[var(--text-secondary)] pt-1">
                          Titular: {revealedPix.receiverName}
                        </p>
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--text-tertiary)]">
                      🔒 O acesso a esta chave foi registrado no histórico de auditoria da consultoria.
                    </p>
                  </div>
                ) : (
                  actionError && (
                    <div className="p-3 text-xs rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                      {actionError}
                    </div>
                  )
                )}
                <div className="flex items-center justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActionType(null);
                      setRevealedPix(null);
                    }}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer min-h-[44px]"
                  >
                    Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
