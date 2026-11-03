"use client";

import React, { useState } from "react";
import {
  Link2,
  Share2,
  Copy,
  Check,
  Image as ImageIcon,
  FileText,
  Download,
  DollarSign,
  MousePointerClick,
  Clock,
  CheckCircle2,
  KeyRound,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
  MessageCircle,
} from "@/components/referrals/referral-icons";
import { isWhatsAppUrl } from "@/lib/referrals/url-utils";
import type {
  PromotionalCampaignLinkRecord,
  PromotionalMarketingMaterialRecord,
} from "@/lib/referrals/campaigns";
import type { MemberPayoutProfile, PixKeyType } from "@/lib/referrals/service";
import { savePixProfileAction } from "@/app/consultoria/[slug]/indicacoes/actions";

function formatBrl(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

function maskClientName(fullName: string | null | undefined): string {
  if (!fullName || !fullName.trim()) return "Cliente indicado";
  const clean = fullName.trim();
  if (clean.toLowerCase().startsWith("cliente")) return clean;
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0].toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

interface PromotionalHubViewProps {
  consultancySlug: string;
  isEnrolled: boolean;
  participantName: string;
  defaultCode: string;
  links: PromotionalCampaignLinkRecord[];
  materials: PromotionalMarketingMaterialRecord[];
  results: {
    totalClicks: number;
    registrationsCount: number;
    conversionsCount: number;
    pendingAmount: number;
    approvedAmount: number;
    paidAmount: number;
  };
  commissions: Array<{
    id: number;
    publicId: string;
    campaignTitle: string | null;
    studentName: string;
    amount: number;
    status: string;
    createdAt: Date;
    paidAt: Date | null;
  }>;
  pixProfile: MemberPayoutProfile | null;
}

export function PromotionalHubView({
  consultancySlug,
  isEnrolled,
  participantName,
  defaultCode,
  links,
  materials,
  results,
  commissions,
  pixProfile,
}: PromotionalHubViewProps) {
  const [activeTab, setActiveTab] = useState<"links" | "materials" | "results">("links");
  const [materialFilter, setMaterialFilter] = useState<string>("ALL");
  const [copiedLinkId, setCopiedLinkId] = useState<number | null>(null);
  const [copiedCaptionId, setCopiedCaptionId] = useState<number | null>(null);
  const [expandedDetailsId, setExpandedDetailsId] = useState<number | null>(null);

  // PIX Modal state
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>(pixProfile?.pixKeyType || "CPF");
  const [pixKey, setPixKey] = useState(pixProfile?.pixKey || "");
  const [receiverName, setReceiverName] = useState(pixProfile?.receiverName || "");
  const [isSavingPix, setIsSavingPix] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [pixSuccess, setPixSuccess] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://trevoone.com";

  async function handleCopyLink(link: PromotionalCampaignLinkRecord) {
    const fullUrl = `${baseUrl}/r/${link.code}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLinkId(link.id);
      setTimeout(() => setCopiedLinkId(null), 2500);
    } catch {
      // Fallback
    }
  }

  function handleShareWhatsApp(link: PromotionalCampaignLinkRecord) {
    const fullUrl = `${baseUrl}/r/${link.code}`;
    const text = link.announcedDiscountValue
      ? `Acesse com meu cupom especial de ${link.announcedDiscountValue}: ${fullUrl}`
      : `Acesse meu link exclusivo: ${fullUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  async function handleCopyCaption(materialId: number, caption: string) {
    try {
      await navigator.clipboard.writeText(caption);
      setCopiedCaptionId(materialId);
      setTimeout(() => setCopiedCaptionId(null), 2500);
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
      setPixSuccess("Chave PIX atualizada com sucesso!");
      setTimeout(() => {
        setIsPixModalOpen(false);
        setPixSuccess(null);
      }, 1500);
    }
  }

  const filteredMaterials = materials.filter((m) => {
    if (materialFilter === "ALL") return true;
    return m.mediaFormat === materialFilter;
  });

  const statusBadges: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: "Em análise",
      className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
    APPROVED: {
      label: "Aprovada",
      className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
    PAID: {
      label: "Paga",
      className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    CANCELLED: {
      label: "Cancelada",
      className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    },
  };

  // EMPTY STATE: NOT ENROLLED
  if (!isEnrolled && links.length === 0) {
    return (
      <div className="bg-white dark:bg-[#111312] border border-slate-200 dark:border-white/10 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Programa Divulgue e Ganhe
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
          Você ainda não possui campanhas de divulgação ativas nesta consultoria. Entre em contato com a equipe da consultoria para habilitar seus links individuais e materiais de divulgação.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* TOP HEADER: HIERARQUIA OFICIAL COM BOTÃO PÍLULA DE PIX              */}
      {/* ==================================================================== */}
      <div className="bg-white dark:bg-[#111312] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Parceria Oficial · Divulgue e Ganhe {participantName ? `· ${participantName}` : ""}
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Divulgue e ganhe
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xl">
              Compartilhe seus links exclusivos e acompanhe suas comissões.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* PIX PILL BUTTON */}
            <button
              type="button"
              onClick={() => setIsPixModalOpen(true)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 min-h-[42px] ${
                pixProfile?.pixKey
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-500/15"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-400 hover:bg-amber-500/15"
              }`}
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold block leading-none">
                  Chave PIX
                </span>
                <span className="text-[11px] font-mono leading-tight block">
                  {pixProfile?.pixKey ? `${pixProfile.pixKeyType}: ${pixProfile.pixKeyMasked}` : "Cadastrar Chave"}
                </span>
              </div>
            </button>

            {defaultCode && (
              <div className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center gap-2 min-h-[42px]">
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-semibold">
                  Código:
                </span>
                <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                  {defaultCode}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 4 KPI CARDS COMPACTOS NO TOPO */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-6 border-t border-slate-100 dark:border-white/5 mt-6">
          {/* KPI 1: Cliques nos links */}
          <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                Cliques nos links
              </span>
              <MousePointerClick className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white block">
                {results.totalClicks}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 block mt-0.5">
                Acessos aos seus links
              </span>
            </div>
          </div>

          {/* KPI 2: Indicações em análise */}
          <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                Indicações em análise
              </span>
              <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 block">
                {formatBrl(results.pendingAmount)}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 block mt-0.5">
                {results.registrationsCount} cadastro(s) identificado(s)
              </span>
            </div>
          </div>

          {/* KPI 3: A receber (Aprovado) - DESTAQUE EM ESMERALDA */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400">
                A receber (Aprovado)
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-[#10b981] block">
                {formatBrl(results.approvedAmount)}
              </span>
              <span className="text-[10px] text-emerald-800/80 dark:text-emerald-400/80 block mt-0.5">
                Aprovado pela consultoria
              </span>
            </div>
          </div>

          {/* KPI 4: Total já recebido */}
          <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                Total já recebido
              </span>
              <DollarSign className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white block">
                {formatBrl(results.paidAmount)}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 block mt-0.5">
                Comissões pagas via PIX
              </span>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS: 3 MAIN CLEAN AREAS */}
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pt-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("links")}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-2 ${
              activeTab === "links"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Meus Links</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300">
              {links.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("materials")}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-2 ${
              activeTab === "materials"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Materiais de Divulgação</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300">
              {materials.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("results")}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-2 ${
              activeTab === "results"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Minhas Indicações e Comissões</span>
            {commissions.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold">
                {commissions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ABA 1: MEUS LINKS (CARDS EM 2 LINHAS COMPACTAS)                      */}
      {/* ==================================================================== */}
      {activeTab === "links" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Links Exclusivos Ativos
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Compartilhe seus links com clientes e seguidores para registrar suas indicações.
              </p>
            </div>
          </div>

          {links.length === 0 ? (
            <div className="bg-white dark:bg-[#111312] border border-slate-200 dark:border-white/10 rounded-3xl p-8 text-center text-xs text-slate-500 dark:text-zinc-400 space-y-2">
              <Link2 className="w-8 h-8 text-slate-400 dark:text-zinc-400 mx-auto" />
              <p className="font-semibold text-slate-900 dark:text-white">Nenhum link configurado no momento</p>
              <p className="max-w-sm mx-auto text-slate-500 dark:text-zinc-400">
                O administrador da sua consultoria ainda não cadastrou links individuais para você. Assim que disponíveis, eles aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {links.map((link) => {
                const isCopied = copiedLinkId === link.id;
                const fullShareUrl = `${baseUrl}/r/${link.code}`;
                const isPaused = link.status !== "ACTIVE";
                const isExpanded = expandedDetailsId === link.id;

                return (
                  <div
                    key={link.id}
                    className={`bg-white dark:bg-[#111312] border rounded-2xl p-4 sm:p-5 shadow-xs transition-all ${
                      isPaused
                        ? "border-slate-200 dark:border-white/5 opacity-75"
                        : "border-slate-200 dark:border-white/10 hover:border-emerald-500/40"
                    }`}
                  >
                    {/* LINHA 1: TÍTULO, STATUS, BADGE DE COMISSÃO E DESCONTO */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {link.title}
                        </h3>
                        {link.status === "ACTIVE" ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            Ativo
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border border-zinc-500/20">
                            {link.status === "PAUSED" ? "Pausado" : "Encerrado"}
                          </span>
                        )}
                        {/* BADGE DE COMISSÃO EM VERDE SUAVE */}
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30">
                          {link.commissionValueFormatted}
                        </span>
                        {/* BADGE NEUTRO DE DESCONTO */}
                        {link.announcedDiscountValue && (
                          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-white/10">
                            Cupom: {link.announcedDiscountValue}
                          </span>
                        )}
                        {/* BADGE DESTINO WHATSAPP */}
                        {isWhatsAppUrl(link.destinationUrl) && (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25 flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-[#25D366]" />
                            <span>Destino: WhatsApp</span>
                          </span>
                        )}
                      </div>

                      {(link.commissionConditions || link.eligiblePlans || link.description) && (
                        <button
                          type="button"
                          onClick={() => setExpandedDetailsId(isExpanded ? null : link.id)}
                          className="text-[11px] text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>{isExpanded ? "Ocultar detalhes" : "Ver regras"}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* DETALHES EXPANSÍVEIS (SE HOUVER) */}
                    {isExpanded && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1.5 text-xs text-slate-600 dark:text-zinc-400">
                        {link.description && (
                          <p className="text-slate-700 dark:text-zinc-300 leading-relaxed">{link.description}</p>
                        )}
                        {link.commissionConditions && (
                          <div className="flex items-start gap-1.5 text-[11px]">
                            <span className="text-slate-500 dark:text-zinc-400 font-semibold">Condição:</span>
                            <span className="text-slate-700 dark:text-zinc-300">{link.commissionConditions}</span>
                          </div>
                        )}
                        {link.eligiblePlans && (
                          <div className="flex items-start gap-1.5 text-[11px]">
                            <span className="text-slate-500 dark:text-zinc-400 font-semibold">Planos:</span>
                            <span className="text-slate-700 dark:text-zinc-300">{link.eligiblePlans}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* LINHA 2: URL AMIGÁVEL + BOTÕES DE AÇÃO */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* URL Display */}
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 font-mono text-xs text-slate-800 dark:text-zinc-300 flex-1 truncate">
                        <Link2 className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 shrink-0" />
                        <span className="truncate select-all">{fullShareUrl}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-zinc-300 shrink-0 ml-auto">
                          {link.code}
                        </span>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(link)}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 transition-all cursor-pointer min-h-[40px] flex items-center justify-center gap-1.5"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-600 dark:text-emerald-400">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar link</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(link)}
                          className="px-3.5 py-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#1e8a45] dark:text-[#25D366] border border-[#25D366]/30 text-xs font-bold transition-all cursor-pointer min-h-[40px] flex items-center justify-center gap-1.5"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>
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
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Artes e Legendas Oficiais</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Materiais preparados para Stories e publicações. Baixe a arte ou copie a legenda pronta.
              </p>
            </div>

            {/* FILTRO DE FORMATO */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-x-auto">
              {(
                [
                  { id: "ALL", label: "Todos" },
                  { id: "STORY", label: "Stories (9:16)" },
                  { id: "FEED", label: "Feed (1:1)" },
                  { id: "BANNER", label: "Banners" },
                  { id: "VIDEO", label: "Vídeos" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setMaterialFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[36px] ${
                    materialFilter === f.id
                      ? "bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-xs"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredMaterials.length === 0 ? (
            <div className="bg-white dark:bg-[#111312] border border-slate-200 dark:border-white/10 rounded-3xl p-8 text-center text-xs text-slate-500 dark:text-zinc-400 space-y-2">
              <ImageIcon className="w-8 h-8 text-slate-400 dark:text-zinc-400 mx-auto" />
              <p className="font-semibold text-slate-900 dark:text-white">Nenhum material encontrado</p>
              <p className="max-w-sm mx-auto text-slate-500 dark:text-zinc-400">
                Não há artes disponíveis nesta categoria no momento. Assim que a equipe disponibilizar materiais, eles aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMaterials.map((mat) => {
                const isStory = mat.mediaFormat === "STORY";
                const isCaptionCopied = copiedCaptionId === mat.id;
                const formatLabel = isStory ? "Story (9:16)" : mat.mediaFormat === "FEED" ? "Feed (1:1)" : mat.mediaFormat;
                const isExclusive = mat.targetMemberId != null;

                // Download URL: route handler streaming file
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
                      {/* PREVIEW CONTAINER */}
                      <div
                        className={`w-full rounded-2xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden relative ${
                          isStory ? "aspect-[9/16] max-h-72" : "aspect-square max-h-56"
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
                          <div className="p-4 text-center text-slate-400 dark:text-zinc-400 space-y-1">
                            <ImageIcon className="w-8 h-8 mx-auto text-slate-400 dark:text-zinc-400" />
                            <span className="text-xs font-semibold block">{formatLabel}</span>
                          </div>
                        )}

                        <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-black/80 text-white backdrop-blur-xs border border-white/20">
                            {formatLabel}
                          </span>
                          {isExclusive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/80 text-white backdrop-blur-xs flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Exclusivo
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

                      {/* LEGENDA PRONTA */}
                      {mat.suggestedCaption && (
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Legenda Pronta
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCaption(mat.id, mat.suggestedCaption!)}
                              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                            >
                              {isCaptionCopied ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Copiada!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-zinc-300 italic leading-relaxed line-clamp-3">
                            &quot;{mat.suggestedCaption}&quot;
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ACTIONS */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                      {downloadUrl ? (
                        <a
                          href={downloadUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-white transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 text-xs font-bold text-slate-400 dark:text-zinc-400 opacity-60 min-h-[44px]"
                        >
                          Sem arquivo
                        </button>
                      )}

                      {mat.suggestedCaption ? (
                        <button
                          type="button"
                          onClick={() => handleCopyCaption(mat.id, mat.suggestedCaption!)}
                          className="px-3 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          {isCaptionCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copiada</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar texto</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (links[0]) handleShareWhatsApp(links[0]);
                          }}
                          className="px-3 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Compartilhar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 3: MINHAS INDICAÇÕES E COMISSÕES                                  */}
      {/* ==================================================================== */}
      {activeTab === "results" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Minhas Indicações e Comissões</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Histórico de clientes atribuídos e comissões geradas por suas divulgações oficiais.
            </p>
          </div>

          <div className="bg-white dark:bg-[#111312] border border-slate-200 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            {commissions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-zinc-400 space-y-2">
                <DollarSign className="w-8 h-8 text-slate-400 dark:text-zinc-400 mx-auto" />
                <p className="font-semibold text-slate-900 dark:text-white">Nenhuma comissão registrada ainda</p>
                <p className="max-w-sm mx-auto text-slate-500 dark:text-zinc-400">
                  Compartilhe seus links exclusivos para começar a registrar indicações e acumular comissões.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 text-slate-500 dark:text-zinc-400">
                      <th className="pb-3 font-semibold">Data</th>
                      <th className="pb-3 font-semibold">Cliente Indicado</th>
                      <th className="pb-3 font-semibold">Campanha / Link</th>
                      <th className="pb-3 font-semibold">Comissão</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {commissions.map((c) => {
                      const badge = statusBadges[c.status] || {
                        label: c.status,
                        className: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20",
                      };
                      const maskedName = maskClientName(c.studentName);

                      return (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3 text-slate-500 dark:text-zinc-400">
                            {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-3 font-semibold text-slate-900 dark:text-white">
                            {maskedName}
                          </td>
                          <td className="py-3 text-slate-600 dark:text-zinc-300">
                            {c.campaignTitle || "Indicação Geral"}
                          </td>
                          <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">
                            {formatBrl(c.amount)}
                          </td>
                          <td className="py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${badge.className}`}>
                              {badge.label}
                            </span>
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
      {/* MODAL: CHAVE PIX PARA RECEBIMENTO                                     */}
      {/* ==================================================================== */}
      {isPixModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Chave PIX</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Para recebimento de comissões aprovadas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPixModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pixError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {pixError}
              </div>
            )}

            {pixSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                {pixSuccess}
              </div>
            )}

            <form onSubmit={handleSavePix} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Tipo de Chave</label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value as PixKeyType)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition-colors min-h-[44px]"
                >
                  <option value="CPF" className="bg-white dark:bg-[#151619] text-slate-900 dark:text-white">CPF</option>
                  <option value="CNPJ" className="bg-white dark:bg-[#151619] text-slate-900 dark:text-white">CNPJ</option>
                  <option value="EMAIL" className="bg-white dark:bg-[#151619] text-slate-900 dark:text-white">E-mail</option>
                  <option value="PHONE" className="bg-white dark:bg-[#151619] text-slate-900 dark:text-white">Telefone</option>
                  <option value="RANDOM_KEY" className="bg-white dark:bg-[#151619] text-slate-900 dark:text-white">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Chave PIX</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Digite sua chave PIX com atenção"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-hidden focus:border-emerald-500 transition-colors min-h-[44px]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Nome do Titular da Conta (Opcional)</label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="Nome completo para conferência do PIX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-hidden focus:border-emerald-500 transition-colors min-h-[44px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPixModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors min-h-[42px] cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPix}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer min-h-[42px] shadow-xs"
                >
                  {isSavingPix ? "Salvando..." : "Salvar Chave PIX"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
