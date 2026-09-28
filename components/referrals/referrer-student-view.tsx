"use client";

import React, { useState } from "react";
import { savePixProfileAction } from "@/app/consultoria/[slug]/indicacoes/actions";
import type { MemberPayoutProfile, CommissionStatus, PixKeyType } from "@/lib/referrals/service";

interface ReferrerStudentViewProps {
  consultancySlug: string;
  code: string;
  referralUrl: string;
  registrationsCount: number;
  conversionsCount: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  pixProfile: MemberPayoutProfile | null;
  commissions: Array<{
    id: number;
    publicId: string;
    amount: number;
    status: CommissionStatus;
    createdAt: Date;
    paidAt: Date | null;
  }>;
}

export function ReferrerStudentView({
  consultancySlug,
  code,
  referralUrl,
  registrationsCount,
  conversionsCount,
  pendingAmount,
  approvedAmount,
  paidAmount,
  pixProfile,
  commissions,
}: ReferrerStudentViewProps) {
  const [copied, setCopied] = useState(false);
  const [isEditingPix, setIsEditingPix] = useState(!pixProfile);
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>(pixProfile?.pixKeyType || "CPF");
  const [pixKey, setPixKey] = useState(pixProfile?.pixKey || "");
  const [receiverName, setReceiverName] = useState(pixProfile?.receiverName || "");
  const [isSavingPix, setIsSavingPix] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [pixSuccess, setPixSuccess] = useState<string | null>(null);

  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}${referralUrl}`
    : `https://trevo.app${referralUrl}`;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  }

  async function handleSavePix(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingPix(true);
    setPixError(null);
    setPixSuccess(null);

    const res = await savePixProfileAction(consultancySlug, pixKeyType, pixKey, receiverName);
    setIsSavingPix(false);

    if (!res.success) {
      setPixError(res.error || "Erro ao salvar dados PIX.");
    } else {
      setPixSuccess("Dados PIX salvos com sucesso!");
      setIsEditingPix(false);
    }
  }

  const statusBadges: Record<CommissionStatus, { label: string; className: string }> = {
    PENDING: { label: "Pendente", className: "bg-[var(--warning-soft)] text-[var(--warning-foreground)] border-[var(--warning-border)]" },
    APPROVED: { label: "Aprovada", className: "bg-[var(--brand-soft)] text-[var(--brand-foreground)] border-[var(--brand-border)]" },
    PAID: { label: "Paga", className: "bg-[var(--success-soft)] text-[var(--success-foreground)] border-[var(--success-border)]" },
    CANCELLED: { label: "Cancelada", className: "bg-[var(--danger-soft)] text-[var(--danger-foreground)] border-[var(--danger-border)]" },
  };

  return (
    <div className="space-y-6">
      {/* Hero: Referral Link & Code */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-xs depth-base space-y-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
            Programa de Parceria &amp; Indicação
          </span>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-1">
            Indique amigos e ganhe recompensas
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">
            Compartilhe seu link exclusivo. Quando um amigo se cadastrar e iniciar o plano com a consultoria, sua comissão será gerada automaticamente.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <div className="flex-1 flex items-center bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-2xl px-4 py-2.5 font-mono text-xs text-[var(--text-primary)] select-all truncate">
            {fullUrl}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-5 py-2.5 rounded-2xl bg-[var(--brand)] text-white text-xs font-bold hover:brightness-110 active:scale-98 transition-all cursor-pointer shadow-xs depth-interactive flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <span>✓</span>
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copiar Link</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-[var(--text-tertiary)]">Seu código exclusivo:</span>
          <span className="font-mono font-bold text-xs bg-[var(--surface-subtle)] px-2.5 py-1 rounded-lg border border-[var(--border-default)] text-[var(--text-primary)]">
            {code}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs depth-base">
          <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Cadastros
          </span>
          <span className="text-2xl font-black text-[var(--text-primary)] mt-1 block">
            {registrationsCount}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 block">
            Amigos que clicaram e cadastraram
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs depth-base">
          <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Conversões
          </span>
          <span className="text-2xl font-black text-[var(--brand)] mt-1 block">
            {conversionsCount}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 block">
            Alunos ativos confirmados
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs depth-base">
          <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Pendente
          </span>
          <span className="text-2xl font-black text-[var(--warning-foreground)] mt-1 block">
            R$ {pendingAmount.toFixed(2)}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 block">
            Em validação
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs depth-base">
          <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Aprovado
          </span>
          <span className="text-2xl font-black text-[var(--brand)] mt-1 block">
            R$ {approvedAmount.toFixed(2)}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 block">
            Pronto para PIX
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs depth-base">
          <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Recebido via PIX
          </span>
          <span className="text-2xl font-black text-[var(--success-foreground)] mt-1 block">
            R$ {paidAmount.toFixed(2)}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 block">
            Total pago com sucesso
          </span>
        </div>
      </div>

      {/* PIX Profile Card */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-xs depth-base space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Chave PIX para Recebimento
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Cadastre sua chave PIX para que a consultoria possa transferir suas comissões.
            </p>
          </div>
          {pixProfile && !isEditingPix && (
            <button
              type="button"
              onClick={() => setIsEditingPix(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-all cursor-pointer depth-interactive"
            >
              Alterar PIX
            </button>
          )}
        </div>

        {!isEditingPix && pixProfile ? (
          <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                {pixProfile.pixKeyType}
              </span>
              <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
                {pixProfile.pixKeyMasked}
              </span>
              {pixProfile.receiverName && (
                <p className="text-xs text-[var(--text-secondary)]">
                  Favorecido: {pixProfile.receiverName}
                </p>
              )}
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--success-soft)] text-[var(--success-foreground)] border border-[var(--success-border)]">
              PIX Configurado
            </span>
          </div>
        ) : (
          <form onSubmit={handleSavePix} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                  Tipo de Chave
                </label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value as PixKeyType)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="PHONE">Telefone</option>
                  <option value="RANDOM_KEY">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                  Chave PIX
                </label>
                <input
                  type="text"
                  required
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Informe sua chave PIX..."
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                Nome completo do titular (opcional)
              </label>
              <input
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="Nome como consta na conta bancária..."
                className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
              />
            </div>

            {pixError && (
              <div className="p-3 text-xs rounded-xl bg-[var(--danger-soft)] text-[var(--danger-foreground)] border border-[var(--danger-border)]">
                {pixError}
              </div>
            )}
            {pixSuccess && (
              <div className="p-3 text-xs rounded-xl bg-[var(--success-soft)] text-[var(--success-foreground)] border border-[var(--success-border)]">
                {pixSuccess}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSavingPix}
                className="px-5 py-2 rounded-xl bg-[var(--brand)] text-white text-xs font-bold hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 cursor-pointer shadow-xs depth-interactive"
              >
                {isSavingPix ? "Salvando..." : "Salvar Chave PIX"}
              </button>
              {pixProfile && (
                <button
                  type="button"
                  onClick={() => setIsEditingPix(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-default)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Commissions History Table */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-xs depth-base space-y-4">
        <h3 className="text-base font-bold text-[var(--text-primary)]">
          Histórico de Comissões
        </h3>

        {commissions.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-tertiary)] border border-dashed border-[var(--border-default)] rounded-2xl">
            Nenhuma comissão gerada ainda. Compartilhe seu link para começar!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                  <th className="pb-2.5 font-semibold">Data</th>
                  <th className="pb-2.5 font-semibold">Valor</th>
                  <th className="pb-2.5 font-semibold">Status</th>
                  <th className="pb-2.5 font-semibold">Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {commissions.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 text-[var(--text-secondary)]">
                      {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3 font-bold text-[var(--text-primary)]">
                      R$ {c.amount.toFixed(2)}
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${statusBadges[c.status].className}`}>
                        {statusBadges[c.status].label}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--text-secondary)]">
                      {c.paidAt ? new Date(c.paidAt).toLocaleDateString("pt-BR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
