"use client";

import React, { useState } from "react";
import {
  Users,
  MousePointerClick,
  CheckCircle2,
  Clock,
  DollarSign,
  Settings,
  Plus,
  Search,
  Copy,
  Check,
  Image as ImageIcon,
  FileText,
  Download,
  Archive,
  Eye,
  KeyRound,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  UserPlus,
  MessageCircle,
} from "@/components/referrals/referral-icons";
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
import { isWhatsAppUrl } from "@/lib/referrals/url-utils";
import type {
  PromotionalCampaignLinkRecord,
  EligiblePromotionParticipant,
  PromotionalMarketingMaterialRecord,
} from "@/lib/referrals/campaigns";
import { CampaignLinkModal } from "./campaign-link-modal";
import { MarketingMaterialModal } from "./marketing-material-modal";
import { ManualSaleModal } from "./manual-sale-modal";
import { EnrollParticipantModal } from "./enroll-participant-modal";

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
  // 3 Primary Tabs + Settings
  const [activeTab, setActiveTab] = useState<"participants" | "materials" | "commissions" | "settings">(
    "participants"
  );

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchFilter, setSearchFilter] = useState("");
  const [materialFormatFilter, setMaterialFormatFilter] = useState<string>("ALL");

  // Expanded participant links state
  const [expandedParticipantIds, setExpandedParticipantIds] = useState<number[]>([]);

  // Modals state
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaignLink, setEditingCampaignLink] = useState<PromotionalCampaignLinkRecord | null>(null);
  const [campaignModalDefaultMemberId, setCampaignModalDefaultMemberId] = useState<number | null>(null);

  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isManualSaleModalOpen, setIsManualSaleModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

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

  function toggleExpandParticipant(memberId: number) {
    setExpandedParticipantIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  }

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
      setActionType("reveal_pix");
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

  // Filter participants
  const filteredParticipants = eligibleParticipants.filter((p) => {
    if (statusFilter === "ACTIVE" && !p.isPromotionEnabled) return false;
    if (statusFilter === "PAUSED" && p.isPromotionEnabled) return false;
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
    PENDING: { label: "Pendente", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    APPROVED: { label: "Aprovada", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    PAID: { label: "Paga", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    CANCELLED: { label: "Cancelada", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  };

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* 4 KPIS SUMMARY NO TOPO                                               */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Total de Participantes */}
        <div className="bg-white dark:bg-[#111312] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              Total de participantes
            </span>
            <Users className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white block">
              {eligibleParticipants.filter((p) => p.isPromotionEnabled).length}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block mt-0.5">
              {eligibleParticipants.length} membros elegíveis
            </span>
          </div>
        </div>

        {/* KPI 2: Indicações / Cadastros */}
        <div className="bg-white dark:bg-[#111312] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              Indicações identificadas
            </span>
            <MousePointerClick className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white block">
              {kpis.totalRegistrations}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block mt-0.5">
              Cadastros via links oficiais
            </span>
          </div>
        </div>

        {/* KPI 3: Vendas Confirmadas */}
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              Vendas confirmadas
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 block">
              {kpis.totalConversions}
            </span>
            <span className="text-[10px] text-emerald-600/80 dark:text-zinc-400 block mt-0.5">
              Matrículas e vendas atribuídas
            </span>
          </div>
        </div>

        {/* KPI 4: Comissões Pendentes / A Pagar */}
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
              Comissões a liquidar
            </span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-400 block">
              {formatBrl(kpis.pendingAmount + kpis.approvedAmount)}
            </span>
            <span className="text-[10px] text-amber-600/80 dark:text-zinc-400 block mt-0.5">
              {formatBrl(kpis.approvedAmount)} aprovado para PIX
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3 CLEAN TABS DE NAVEGAÇÃO                                            */}
      {/* ==================================================================== */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 overflow-x-auto pb-px">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("participants");
              setStatusFilter("ALL");
              setSearchFilter("");
            }}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-2 ${
              activeTab === "participants"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Participantes e Links</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300">
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
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Materiais</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300">
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
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Vendas e Comissões</span>
            {commissions.some((c) => c.status === "PENDING") && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300">
              {commissions.length}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "settings"
              ? "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Configurações Globais</span>
        </button>
      </div>

      {participantActionFeedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{participantActionFeedback}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 1: PARTICIPANTES E LINKS                                         */}
      {/* ==================================================================== */}
      {activeTab === "participants" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Participantes e Links de Divulgação</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Gerencie os membros autorizados e configure URLs específicas com descontos e comissões.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(true)}
                className="px-3.5 py-2.5 rounded-2xl border border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-bold transition-all cursor-pointer min-h-[42px] flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>+ Adicionar participante</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingCampaignLink(null);
                  setCampaignModalDefaultMemberId(null);
                  setIsCampaignModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer min-h-[42px] flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Novo link de indicação</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar participante por nome ou código..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-emerald-500 transition-colors min-h-[42px]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-2xl bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 min-h-[42px]"
            >
              <option value="ALL" className="bg-white dark:bg-[#151619] text-slate-900 dark:text-white">Todos os status</option>
              <option value="ACTIVE" className="bg-white dark:bg-[#151619] text-slate-900 dark:text-white">Habilitados</option>
              <option value="PAUSED" className="bg-white dark:bg-[#151619] text-slate-900 dark:text-white">Pausados</option>
            </select>
          </div>

          {/* Participants List with Embedded Links */}
          {filteredParticipants.length === 0 ? (
            <div className="bg-white dark:bg-[#111312] border border-slate-200 dark:border-white/10 rounded-3xl p-8 text-center text-xs text-slate-500 dark:text-zinc-400 space-y-2">
              <Users className="w-8 h-8 text-slate-400 dark:text-zinc-400 mx-auto" />
              <p className="font-semibold text-slate-900 dark:text-white">Nenhum participante encontrado</p>
              <p className="max-w-sm mx-auto text-slate-500 dark:text-zinc-400">
                Adicione alunos ou influenciadores no botão acima para habilitar o programa.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredParticipants.map((p) => {
                const memberLinks = campaignLinks.filter((l) => l.referrerMemberId === p.memberId);
                const isExpanded = expandedParticipantIds.includes(p.memberId);
                const isToggling = togglingParticipantId === p.memberId;

                return (
                  <div
                    key={p.memberId}
                    className="bg-white dark:bg-[#111312] border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
                  >
                    {/* Participant Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          fullName={p.name}
                          userPublicId={p.userPublicId}
                          size="md"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{p.name}</h3>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                                p.role === "INFLUENCER"
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                              }`}
                            >
                              {p.role === "INFLUENCER" ? "Influenciador / VIP" : "Aluno"}
                            </span>
                            {p.hasPix ? (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                PIX Cadastrado
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                Sem PIX
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400 mt-1">
                            {p.defaultCode && (
                              <span className="font-mono text-slate-600 dark:text-zinc-300">
                                Código: <strong className="text-slate-900 dark:text-white">{p.defaultCode}</strong>
                              </span>
                            )}
                            <span>•</span>
                            <span>{p.totalClicks} cliques</span>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{p.totalConversions} vendas</span>
                            <span>•</span>
                            <span>Total pago: {formatBrl(p.paidAmount)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Participant Actions */}
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCampaignLink(null);
                            setCampaignModalDefaultMemberId(p.memberId);
                            setIsCampaignModalOpen(true);
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-white transition-all cursor-pointer min-h-[38px] flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Criar link</span>
                        </button>

                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleParticipant(p.memberId, p.isPromotionEnabled)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer min-h-[38px] ${
                            p.isPromotionEnabled
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                          }`}
                        >
                          {isToggling ? "..." : p.isPromotionEnabled ? "Pausar" : "Ativar"}
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleExpandParticipant(p.memberId)}
                          className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white text-xs font-medium cursor-pointer transition-colors min-h-[38px] flex items-center gap-1"
                        >
                          <span>{memberLinks.length} link(s)</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Participant Individual Links (Sublist) */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-200 dark:border-white/5 space-y-2">
                        {memberLinks.length === 0 ? (
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 text-center text-xs text-slate-500 dark:text-zinc-400">
                            Nenhum link cadastrado para este participante ainda. Clique em &quot;Criar link&quot; acima.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {memberLinks.map((link) => {
                              const isCopied = copiedLinkUrl === link.code;
                              const isWhatsApp = isWhatsAppUrl(link.destinationUrl);
                              return (
                                <div
                                  key={link.id}
                                  className="p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                                        {link.title}
                                      </span>
                                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-zinc-300">
                                        /r/{link.code}
                                      </span>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                        {link.commissionValueFormatted}
                                      </span>
                                      {link.announcedDiscountValue && (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-white/5 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-white/10">
                                          Cupom: {link.announcedDiscountValue}
                                        </span>
                                      )}
                                      {isWhatsApp && (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                          <MessageCircle className="w-3 h-3 text-[#25D366]" />
                                          <span>Destino: WhatsApp</span>
                                        </span>
                                      )}
                                      <span
                                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                          link.status === "ACTIVE"
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-slate-500 dark:text-zinc-500"
                                        }`}
                                      >
                                        {link.status === "ACTIVE" ? "● Ativo" : "○ Pausado"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono truncate max-w-lg">
                                      Destino: {link.destinationUrl}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyShareableUrl(link.code)}
                                      className="px-2.5 py-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-white/10 text-xs text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer flex items-center gap-1"
                                    >
                                      {isCopied ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                          <span className="text-emerald-600 dark:text-emerald-400">Copiado</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>Copiar</span>
                                        </>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCampaignLink(link);
                                        setIsCampaignModalOpen(true);
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-white/10 text-xs text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                                    >
                                      Editar
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 2: MATERIAIS DE DIVULGAÇÃO                                       */}
      {/* ==================================================================== */}
      {activeTab === "materials" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Materiais de Divulgação</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Disponibilize artes, vídeos, PDFs e legendas oficiais para os parceiros divulgarem.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsMaterialModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer min-h-[42px] flex items-center gap-1.5 shadow-xs self-start sm:self-center"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Novo material</span>
            </button>
          </div>

          {/* Formats filter */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {(
              [
                { id: "ALL", label: "Todos os formatos" },
                { id: "STORY", label: "Stories (9:16)" },
                { id: "FEED", label: "Feed (1:1)" },
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
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Materials Grid */}
          {filteredMaterials.length === 0 ? (
            <div className="bg-white dark:bg-[#111312] border border-slate-200 dark:border-white/10 rounded-3xl p-8 text-center text-xs text-slate-500 dark:text-zinc-400 space-y-2">
              <ImageIcon className="w-8 h-8 text-slate-400 dark:text-zinc-400 mx-auto" />
              <p className="font-semibold text-slate-900 dark:text-white">Nenhum material cadastrado</p>
              <p className="max-w-sm mx-auto text-slate-500 dark:text-zinc-400">
                Faça upload de artes ou insira links no botão acima para disponibilizar materiais aos divulgadores.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMaterials.map((mat) => {
                const isStory = mat.mediaFormat === "STORY";
                const isArchiving = archivingMaterialId === mat.id;
                const isExclusive = mat.targetMemberId != null;

                const downloadUrl = mat.fileUrl
                  ? mat.fileUrl.startsWith("http")
                    ? mat.fileUrl
                    : `/api/consultancies/${consultancySlug}/marketing-materials/file?key=${encodeURIComponent(mat.fileUrl)}&download=1`
                  : null;

                return (
                  <div
                    key={mat.id}
                    className="bg-white dark:bg-[#111312] border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-all"
                  >
                    <div className="space-y-3">
                      {/* Media preview */}
                      <div
                        className={`w-full rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden relative ${
                          isStory ? "aspect-[9/16] max-h-64" : "aspect-square max-h-52"
                        }`}
                      >
                        {mat.fileUrl ? (
                          mat.mediaFormat === "VIDEO" ? (
                            <video
                              src={`/api/consultancies/${consultancySlug}/marketing-materials/file?key=${encodeURIComponent(mat.fileUrl)}`}
                              controls
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/consultancies/${consultancySlug}/marketing-materials/file?key=${encodeURIComponent(mat.fileUrl)}`}
                              alt={mat.title}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          )
                        ) : (
                          <div className="p-4 text-center text-zinc-400 space-y-1">
                            <ImageIcon className="w-8 h-8 mx-auto text-zinc-400" />
                            <span className="text-xs font-semibold block">{mat.mediaFormat}</span>
                          </div>
                        )}

                        <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-black/80 text-white backdrop-blur-xs border border-white/20">
                            {mat.mediaFormat}
                          </span>
                          {isExclusive ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/80 text-white backdrop-blur-xs flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              {eligibleParticipants.find((p) => p.memberId === mat.targetMemberId)?.name || "Exclusivo"}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/20 text-white backdrop-blur-xs">
                              Todos
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{mat.title}</h3>
                        {mat.description && (
                          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                            {mat.description}
                          </p>
                        )}
                      </div>

                      {mat.suggestedCaption && (
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Legenda Pronta
                          </span>
                          <p className="text-slate-700 dark:text-zinc-300 italic line-clamp-2">
                            &quot;{mat.suggestedCaption}&quot;
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                      {downloadUrl ? (
                        <a
                          href={downloadUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-semibold text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 transition-colors flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-zinc-500">Sem arquivo</span>
                      )}

                      <button
                        type="button"
                        disabled={isArchiving}
                        onClick={() => handleArchiveMaterial(mat.id)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>{isArchiving ? "Arquivando..." : "Arquivar"}</span>
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
      {/* ABA 3: VENDAS E COMISSÕES                                            */}
      {/* ==================================================================== */}
      {activeTab === "commissions" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Vendas e Comissões</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Acompanhe as vendas atribuídas, aprove valores e liquide pagamentos via PIX.
              </p>
            </div>

            {/* BOTÃO EM DESTAQUE: REGISTRAR VENDA MANUAL */}
            <button
              type="button"
              onClick={() => setIsManualSaleModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer min-h-[44px] flex items-center gap-2 shadow-xs self-start sm:self-center"
            >
              <DollarSign className="w-4 h-4" />
              <span>+ Registrar venda manual</span>
            </button>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {(
              [
                { id: "ALL", label: "Todas" },
                { id: "PENDING", label: "Pendentes" },
                { id: "APPROVED", label: "Aprovadas" },
                { id: "PAID", label: "Pagas" },
                { id: "CANCELLED", label: "Canceladas" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[36px] ${
                  statusFilter === f.id
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por parceiro ou comprador..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-emerald-500 min-h-[42px]"
            />
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-[#111312] border border-slate-200 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            {filteredCommissions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-zinc-400 space-y-2">
                <DollarSign className="w-8 h-8 text-slate-400 dark:text-zinc-400 mx-auto" />
                <p className="font-semibold text-slate-900 dark:text-white">Nenhuma comissão encontrada</p>
                <p className="max-w-sm mx-auto text-slate-500 dark:text-zinc-400">
                  Cadastros ou vendas atribuídas a links oficiais aparecerão listados aqui.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/5 text-slate-500 dark:text-zinc-400">
                      <th className="pb-3 font-semibold">Data</th>
                      <th className="pb-3 font-semibold">Indicador / VIP</th>
                      <th className="pb-3 font-semibold">Comprador</th>
                      <th className="pb-3 font-semibold">Valor Venda</th>
                      <th className="pb-3 font-semibold">Comissão</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">PIX</th>
                      <th className="pb-3 font-semibold text-right">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {filteredCommissions.map((c) => {
                      const badge = statusBadges[c.status] || {
                        label: c.status,
                        className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
                      };

                      return (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3 text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                            {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                            {c.referrerName}
                          </td>
                          <td className="py-3 text-slate-700 dark:text-zinc-300">
                            {c.studentName}
                          </td>
                          <td className="py-3 text-slate-500 dark:text-zinc-400 font-mono">
                            {c.baseAmount ? formatBrl(c.baseAmount) : "-"}
                          </td>
                          <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {c.amount ? formatBrl(c.amount) : "A calcular"}
                          </td>
                          <td className="py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${badge.className}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-[11px] text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{c.pixMasked || "Não inf."}</span>
                              {c.pixMasked && (
                                <button
                                  type="button"
                                  onClick={() => handleRevealPix(c.referrerMemberId)}
                                  className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                  title="Ver chave PIX completa"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {c.status === "PENDING" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (c.commissionType === "PERCENTAGE" && !c.baseAmount) {
                                        setSelectedCommission(c);
                                        setActionType("approve");
                                      } else {
                                        handleApprove(c.id);
                                      }
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold cursor-pointer"
                                  >
                                    Aprovar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedCommission(c);
                                      setActionType("cancel");
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-bold cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              )}

                              {c.status === "APPROVED" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCommission(c);
                                    setActionType("pay");
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/20 text-[11px] font-bold cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Marcar paga</span>
                                </button>
                              )}

                              {c.status === "PAID" && (
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold">
                                  Liquidada
                                </span>
                              )}

                              {c.status === "CANCELLED" && (
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold">
                                  Cancelada
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 4: CONFIGURAÇÕES GERAIS                                          */}
      {/* ==================================================================== */}
      {activeTab === "settings" && (
        <div className="bg-white dark:bg-[#111312] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 max-w-2xl">
          <div className="border-b border-slate-200 dark:border-white/10 pb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-500" />
              <span>Configurações Globais do Programa</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Defina as regras padrão para novos divulgadores quando não houver links individuais configurados.
            </p>
          </div>

          {settingsError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold">
              {settingsError}
            </div>
          )}
          {settingsSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              {settingsSuccess}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Status do Programa</span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mt-0.5">
                  Permite aos membros visualizarem a aba e seus links exclusivos.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEnabled(!isEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  isEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    isEnabled ? "left-6.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Tipo de Comissão Padrão</label>
                <select
                  value={commissionType}
                  onChange={(e) => setCommissionType(e.target.value as CommissionType)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 min-h-[44px]"
                >
                  <option value="PERCENTAGE" className="bg-white dark:bg-[#151619] text-slate-900 dark:text-white">Percentual (%)</option>
                  <option value="FIXED" className="bg-white dark:bg-[#151619] text-slate-900 dark:text-white">Valor Fixo (R$)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  {commissionType === "PERCENTAGE" ? "Taxa (%)" : "Valor por Matrícula (R$)"}
                </label>
                <input
                  type="number"
                  min="0"
                  step={commissionType === "PERCENTAGE" ? "0.1" : "1"}
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white font-bold focus:outline-hidden focus:border-emerald-500 min-h-[44px]"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer min-h-[42px] shadow-xs"
              >
                {isSavingSettings ? "Salvando..." : "Salvar Configurações"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAIS DO MÓDULO                                                     */}
      {/* ==================================================================== */}

      {/* MODAL 1: ENROLL PARTICIPANT */}
      <EnrollParticipantModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        consultancySlug={consultancySlug}
        participants={eligibleParticipants}
        onSuccess={(enrolledMemberId) => {
          // Open link creation modal directly for this newly enrolled participant
          setCampaignModalDefaultMemberId(enrolledMemberId);
          setIsCampaignModalOpen(true);
        }}
      />

      {/* MODAL 2: CAMPAIGN LINK (CRIAR/EDITAR) */}
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
          setIsCampaignModalOpen(false);
          setEditingCampaignLink(null);
          setCampaignModalDefaultMemberId(null);
        }}
      />

      {/* MODAL 3: MARKETING MATERIAL (COM UPLOAD DIRETO) */}
      <MarketingMaterialModal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        consultancySlug={consultancySlug}
        participants={eligibleParticipants}
        links={campaignLinks}
        onSuccess={() => setIsMaterialModalOpen(false)}
      />

      {/* MODAL 4: MANUAL SALE MODAL */}
      <ManualSaleModal
        isOpen={isManualSaleModalOpen}
        onClose={() => setIsManualSaleModalOpen(false)}
        consultancySlug={consultancySlug}
        participants={eligibleParticipants}
        campaignLinks={campaignLinks}
        onSuccess={() => setIsManualSaleModalOpen(false)}
      />

      {/* MODAL 5: REVEAL PIX */}
      {actionType === "reveal_pix" && revealedPix && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Chave PIX do Membro</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActionType(null);
                  setRevealedPix(null);
                  setCopiedPix(false);
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-semibold block">
                  Tipo: {revealedPix.pixKeyType}
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm select-all block break-all">
                  {revealedPix.pixKey}
                </span>
                {revealedPix.receiverName && (
                  <span className="text-xs text-slate-600 dark:text-zinc-300 block pt-1 border-t border-slate-200 dark:border-white/5 mt-1">
                    Titular: <strong className="text-slate-900 dark:text-white">{revealedPix.receiverName}</strong>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(revealedPix.pixKey);
                  setCopiedPix(true);
                  setTimeout(() => setCopiedPix(false), 2000);
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                {copiedPix ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Chave PIX</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: APPROVE / CANCEL / PAY COMMISSION CONFIRMATION */}
      {(actionType === "approve" || actionType === "cancel" || actionType === "pay") && selectedCommission && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {actionType === "approve"
                  ? "Aprovar Comissão"
                  : actionType === "cancel"
                  ? "Cancelar Comissão"
                  : "Marcar Comissão como Paga"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActionType(null);
                  setSelectedCommission(null);
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-semibold">
                {actionError}
              </div>
            )}

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs space-y-1">
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Indicador:</span>{" "}
                <span className="font-semibold text-slate-900 dark:text-white">{selectedCommission.referrerName}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Comprador:</span>{" "}
                <span className="font-semibold text-slate-900 dark:text-white">{selectedCommission.studentName}</span>
              </div>
              {selectedCommission.amount && (
                <div>
                  <span className="text-slate-500 dark:text-zinc-400">Valor da Comissão:</span>{" "}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatBrl(selectedCommission.amount)}</span>
                </div>
              )}
            </div>

            {actionType === "approve" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Valor Base da Venda / Matrícula (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={baseAmountInput}
                  onChange={(e) => setBaseAmountInput(e.target.value)}
                  placeholder="Ex: 150.00"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-hidden focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  O valor da comissão será recalculado automaticamente com base na taxa percentual.
                </p>
              </div>
            )}

            {actionType === "cancel" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Motivo do Cancelamento <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex: Reembolso solicitado ou indicação duplicada"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-hidden focus:border-rose-500"
                  required
                />
              </div>
            )}

            {actionType === "pay" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Nota ou Código do Comprovante PIX (Opcional)
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Ex: Comprovante E2E... enviado no WhatsApp"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setActionType(null);
                  setSelectedCommission(null);
                }}
                disabled={isProcessingAction}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => {
                  if (actionType === "approve") {
                    const cents = baseAmountInput ? Math.round(parseFloat(baseAmountInput) * 100) : undefined;
                    handleApprove(selectedCommission.id, cents);
                  } else if (actionType === "cancel") {
                    handleCancel(selectedCommission.id);
                  } else if (actionType === "pay") {
                    handleMarkPaid(selectedCommission.id);
                  }
                }}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold cursor-pointer transition-all ${
                  actionType === "cancel"
                    ? "bg-rose-500 hover:bg-rose-600"
                    : "bg-emerald-500 hover:bg-emerald-600"
                }`}
              >
                {isProcessingAction ? "Processando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
