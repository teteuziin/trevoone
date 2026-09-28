"use client";

import React, { useState } from "react";
import { UserAvatar } from "@/components/account/user-avatar";
import {
  approveCommissionAction,
  cancelCommissionAction,
  markCommissionPaidAction,
  revealPixKeyAction,
  updateReferralSettingsAction,
} from "@/app/consultoria/[slug]/indicacoes/actions";
import type {
  ConsultancyReferralSettings,
  CommissionStatus,
  CommissionType,
  PixKeyType,
} from "@/lib/referrals/service";

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
}

export function AdminReferralsView({
  consultancySlug,
  settings,
  kpis,
  referrers,
  commissions,
}: AdminReferralsViewProps) {
  const [activeTab, setActiveTab] = useState<"commissions" | "referrers" | "settings">("commissions");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchFilter, setSearchFilter] = useState("");

  // Settings state
  const [isEnabled, setIsEnabled] = useState(settings.isEnabled);
  const [commissionType, setCommissionType] = useState<CommissionType>(settings.commissionType);
  const [commissionValue, setCommissionValue] = useState<number>(settings.commissionValue);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Modal states for actions
  const [selectedCommission, setSelectedCommission] = useState<(typeof commissions)[0] | null>(null);
  const [actionType, setActionType] = useState<"approve" | "cancel" | "pay" | "reveal_pix" | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [baseAmountInput, setBaseAmountInput] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Revealed PIX state
  const [revealedPix, setRevealedPix] = useState<{
    pixKey: string;
    pixKeyType: PixKeyType;
    receiverName?: string | null;
  } | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

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

  const statusBadges: Record<CommissionStatus, { label: string; className: string }> = {
    PENDING: { label: "Pendente", className: "bg-[var(--warning-soft)] text-[var(--warning-foreground)] border-[var(--warning-border)]" },
    APPROVED: { label: "Aprovada", className: "bg-[var(--brand-soft)] text-[var(--brand-foreground)] border-[var(--brand-border)]" },
    PAID: { label: "Paga", className: "bg-[var(--success-soft)] text-[var(--success-foreground)] border-[var(--success-border)]" },
    CANCELLED: { label: "Cancelada", className: "bg-[var(--danger-soft)] text-[var(--danger-foreground)] border-[var(--danger-border)]" },
  };

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs depth-base">
          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Indicadores
          </span>
          <span className="text-xl font-bold text-[var(--text-primary)] mt-1 block">
            {kpis.totalReferrers}
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs depth-base">
          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Cadastros
          </span>
          <span className="text-xl font-bold text-[var(--text-primary)] mt-1 block">
            {kpis.totalRegistrations}
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs depth-base">
          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Conversões
          </span>
          <span className="text-xl font-bold text-[var(--brand)] mt-1 block">
            {kpis.totalConversions}
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs depth-base">
          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Aguardando Aprovação
          </span>
          <span className="text-xl font-bold text-[var(--warning-foreground)] mt-1 block">
            R$ {kpis.pendingAmount.toFixed(2)}
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs depth-base">
          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Aprovadas (A Pagar)
          </span>
          <span className="text-xl font-bold text-[var(--brand)] mt-1 block">
            R$ {kpis.approvedAmount.toFixed(2)}
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs depth-base">
          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Total Liquidado
          </span>
          <span className="text-xl font-bold text-[var(--success-foreground)] mt-1 block">
            R$ {kpis.paidAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("commissions")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "commissions"
              ? "bg-[var(--brand)] text-white shadow-xs"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          }`}
        >
          Comissões &amp; Liquidações ({commissions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("referrers")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "referrers"
              ? "bg-[var(--brand)] text-white shadow-xs"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          }`}
        >
          Indicadores Ativos ({referrers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "settings"
              ? "bg-[var(--brand)] text-white shadow-xs"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          }`}
        >
          Regras &amp; Configurações
        </button>
      </div>

      {/* TAB 1: COMMISSIONS */}
      {activeTab === "commissions" && (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-xs depth-base space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {["ALL", "PENDING", "APPROVED", "PAID", "CANCELLED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs rounded-xl border transition-all cursor-pointer ${
                    statusFilter === st
                      ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] font-bold shadow-2xs"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)] font-medium"
                  }`}
                >
                  {st === "ALL" ? "Todos" : statusBadges[st as CommissionStatus].label}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Buscar por indicador ou aluno..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="text-xs p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)] w-full sm:w-64"
            />
          </div>

          {/* Table */}
          {filteredCommissions.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-tertiary)] border border-dashed border-[var(--border-default)] rounded-2xl">
              Nenhuma comissão encontrada para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                    <th className="pb-3 font-semibold">Indicador</th>
                    <th className="pb-3 font-semibold">Novo Aluno</th>
                    <th className="pb-3 font-semibold">Valor</th>
                    <th className="pb-3 font-semibold">PIX (Mascarado)</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredCommissions.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 font-medium text-[var(--text-primary)]">
                        <div>
                          <span>{c.referrerName}</span>
                          <span className="text-[10px] text-[var(--text-tertiary)] block">
                            {c.referrerRole === "INFLUENCER" ? "Influenciador / VIP" : "Aluno"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-[var(--text-secondary)]">
                        {c.studentName}
                      </td>
                      <td className="py-3 font-bold text-[var(--text-primary)]">
                        {c.amount !== null ? (
                          <span>R$ {c.amount.toFixed(2)}</span>
                        ) : (
                          <span className="text-[var(--warning-foreground)]">
                            {c.rateBasisPoints ? (c.rateBasisPoints / 100).toFixed(2) : 10}% (Base pendente)
                          </span>
                        )}
                        {c.baseAmount !== null && (
                          <span className="text-[10px] text-[var(--text-tertiary)] block font-normal">
                            Base: R$ {c.baseAmount.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-[11px] text-[var(--text-secondary)]">
                        {c.pixMasked}
                      </td>
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
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--brand)] text-white hover:brightness-110 cursor-pointer depth-interactive"
                              >
                                Aprovar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCommission(c);
                                  setActionType("cancel");
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--border-default)] text-[var(--danger-foreground)] hover:bg-[var(--danger-soft)] cursor-pointer"
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
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] cursor-pointer"
                              >
                                Ver PIX
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCommission(c);
                                  setActionType("pay");
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--success-foreground)] text-white hover:brightness-110 cursor-pointer depth-interactive"
                              >
                                Marcar Pago
                              </button>
                            </>
                          )}

                          {c.status === "PAID" && (
                            <span className="text-[10px] text-[var(--success-foreground)] font-semibold">
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

      {/* TAB 2: REFERRERS */}
      {activeTab === "referrers" && (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-xs depth-base space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                  <th className="pb-3 font-semibold">Participante</th>
                  <th className="pb-3 font-semibold">Papel</th>
                  <th className="pb-3 font-semibold">Código</th>
                  <th className="pb-3 font-semibold">Cadastros</th>
                  <th className="pb-3 font-semibold">Conversões</th>
                  <th className="pb-3 font-semibold">Pendente</th>
                  <th className="pb-3 font-semibold">Pago</th>
                  <th className="pb-3 font-semibold">PIX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {referrers.map((r) => (
                  <tr key={r.memberId}>
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar fullName={r.name} userPublicId={r.userPublicId} size="xs" />
                        <span className="font-semibold text-[var(--text-primary)]">{r.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-[var(--text-secondary)]">
                      {r.role === "INFLUENCER" ? "Influenciador / VIP" : "Aluno"}
                    </td>
                    <td className="py-3 font-mono font-bold text-[var(--text-primary)]">
                      {r.code}
                    </td>
                    <td className="py-3 text-[var(--text-primary)]">{r.registrations}</td>
                    <td className="py-3 font-bold text-[var(--brand)]">{r.conversions}</td>
                    <td className="py-3 text-[var(--warning-foreground)]">R$ {r.pendingAmount.toFixed(2)}</td>
                    <td className="py-3 text-[var(--success-foreground)] font-bold">R$ {r.paidAmount.toFixed(2)}</td>
                    <td className="py-3">
                      {r.hasPix ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[var(--success-soft)] text-[var(--success-foreground)] border border-[var(--success-border)]">
                          Cadastrado
                        </span>
                      ) : (
                        <span className="text-[10px] text-[var(--text-tertiary)]">Pendente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SETTINGS */}
      {activeTab === "settings" && (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-xs depth-base max-w-2xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Configurações do Programa de Indicações
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Defina se o programa está ativo e qual regra de comissionamento será aplicada para futuras conversões.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  Status do Programa
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {isEnabled ? "Ativo — novos cadastros geram comissões normalmente" : "Pausado — novos links não gerarão comissões"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEnabled(!isEnabled)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isEnabled
                    ? "bg-[var(--success-soft)] text-[var(--success-foreground)] border-[var(--success-border)]"
                    : "bg-[var(--danger-soft)] text-[var(--danger-foreground)] border-[var(--danger-border)]"
                }`}
              >
                {isEnabled ? "Ativo" : "Pausado"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                  Tipo de Comissão
                </label>
                <select
                  value={commissionType}
                  onChange={(e) => setCommissionType(e.target.value as CommissionType)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
                >
                  <option value="FIXED_AMOUNT">Valor Fixo (R$ BRL)</option>
                  <option value="PERCENTAGE">Percentual (%)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                  {commissionType === "FIXED_AMOUNT" ? "Valor por conversão (R$)" : "Percentual (%)"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={commissionType === "PERCENTAGE" ? "100" : "10000"}
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
                />
              </div>
            </div>

            {settingsError && (
              <div className="p-3 text-xs rounded-xl bg-[var(--danger-soft)] text-[var(--danger-foreground)] border border-[var(--danger-border)]">
                {settingsError}
              </div>
            )}
            {settingsSuccess && (
              <div className="p-3 text-xs rounded-xl bg-[var(--success-soft)] text-[var(--success-foreground)] border border-[var(--success-border)]">
                {settingsSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-6 py-2.5 rounded-xl bg-[var(--brand)] text-white text-xs font-bold hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 cursor-pointer shadow-xs depth-interactive"
            >
              {isSavingSettings ? "Salvando..." : "Salvar Configurações"}
            </button>
          </form>
        </div>
      )}

      {/* ACTION MODAL: APPROVE / CANCEL / PAY / REVEAL PIX */}
      {actionType && selectedCommission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4">
            {actionType === "approve" && (
              <>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Aprovar Comissão
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {selectedCommission.commissionType === "PERCENTAGE" ? (
                    <>
                      Comissão percentual de <strong>{selectedCommission.rateBasisPoints ? (selectedCommission.rateBasisPoints / 100).toFixed(2) : 10}%</strong> para <strong>{selectedCommission.referrerName}</strong> referente à adesão de {selectedCommission.studentName}.
                    </>
                  ) : (
                    <>
                      Confirmar a aprovação da comissão de <strong className="text-[var(--text-primary)]">R$ {selectedCommission.amount !== null ? selectedCommission.amount.toFixed(2) : "0.00"}</strong> para <strong className="text-[var(--text-primary)]">{selectedCommission.referrerName}</strong> referente à adesão de {selectedCommission.studentName}?
                    </>
                  )}
                </p>

                {selectedCommission.commissionType === "PERCENTAGE" && (
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-semibold text-[var(--text-primary)] block">
                      Valor base da comissão (R$)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 250,00"
                      value={baseAmountInput}
                      onChange={(e) => setBaseAmountInput(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
                    />
                    {baseAmountInput && !isNaN(parseFloat(baseAmountInput.replace(',', '.'))) && (
                      <p className="text-[11px] text-[var(--brand)] font-medium">
                        Comissão projetada: R$ {(
                          (parseFloat(baseAmountInput.replace(',', '.')) *
                            (selectedCommission.rateBasisPoints ? selectedCommission.rateBasisPoints / 10000 : 0.1))
                        ).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}

                {actionError && (
                  <div className="p-3 text-xs rounded-xl bg-[var(--danger-soft)] text-[var(--danger-foreground)] border border-[var(--danger-border)]">
                    {actionError}
                  </div>
                )}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActionType(null);
                      setBaseAmountInput("");
                    }}
                    className="px-4 py-2 text-xs rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={() => {
                      if (selectedCommission.commissionType === "PERCENTAGE") {
                        const parsed = parseFloat(baseAmountInput.replace(',', '.'));
                        if (isNaN(parsed) || parsed <= 0) {
                          setActionError("Informe um valor base legítimo e positivo.");
                          return;
                        }
                        const cents = Math.round(parsed * 100);
                        handleApprove(selectedCommission.id, cents);
                      } else {
                        handleApprove(selectedCommission.id);
                      }
                    }}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-[var(--brand)] text-white hover:brightness-110 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingAction ? "Aprovando..." : "Confirmar Aprovação"}
                  </button>
                </div>
              </>
            )}

            {actionType === "cancel" && (
              <>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Cancelar Comissão
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Informe o motivo do cancelamento da comissão de R$ {selectedCommission.amount !== null ? selectedCommission.amount.toFixed(2) : "0.00"}:
                </p>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="Ex: Cancelamento de matrícula pelo aluno, auto-indicação indevida..."
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
                />
                {actionError && (
                  <div className="p-3 text-xs rounded-xl bg-[var(--danger-soft)] text-[var(--danger-foreground)] border border-[var(--danger-border)]">
                    {actionError}
                  </div>
                )}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActionType(null)}
                    className="px-4 py-2 text-xs rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={() => handleCancel(selectedCommission.id)}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-[var(--danger-soft)] text-[var(--danger-foreground)] border border-[var(--danger-border)] hover:bg-[var(--danger-soft)] cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingAction ? "Cancelando..." : "Confirmar Cancelamento"}
                  </button>
                </div>
              </>
            )}

            {actionType === "pay" && (
              <>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Liquidar Comissão (Marcar como Paga)
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Confirma que a transferência externa no valor de <strong className="text-[var(--text-primary)]">R$ {selectedCommission.amount !== null ? selectedCommission.amount.toFixed(2) : "0.00"}</strong> foi realizada via PIX para {selectedCommission.referrerName}?
                </p>
                <input
                  type="text"
                  placeholder="Nota/comprovante opcional (ex: TXID 982341)..."
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
                />
                {actionError && (
                  <div className="p-3 text-xs rounded-xl bg-[var(--danger-soft)] text-[var(--danger-foreground)] border border-[var(--danger-border)]">
                    {actionError}
                  </div>
                )}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActionType(null)}
                    className="px-4 py-2 text-xs rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={() => handleMarkPaid(selectedCommission.id)}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-[var(--success-foreground)] text-white hover:brightness-110 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingAction ? "Salvando..." : "Confirmar Pagamento"}
                  </button>
                </div>
              </>
            )}

            {actionType === "reveal_pix" && (
              <>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Dados PIX para Pagamento
                </h3>
                {isProcessingAction ? (
                  <p className="text-xs text-[var(--text-secondary)]">Consultando chave PIX segura...</p>
                ) : revealedPix ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-1">
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
                          className="px-3 py-1 text-xs rounded-lg bg-[var(--brand)] text-white font-bold shrink-0 cursor-pointer"
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
                    <div className="p-3 text-xs rounded-xl bg-[var(--danger-soft)] text-[var(--danger-foreground)] border border-[var(--danger-border)]">
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
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-[var(--brand)] text-white hover:brightness-110 cursor-pointer"
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
