"use client";

import React, { useState } from "react";
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

  // PIX state
  const [isEditingPix, setIsEditingPix] = useState(!pixProfile);
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

  async function handleShareLink(link: PromotionalCampaignLinkRecord) {
    const fullUrl = `${baseUrl}/r/${link.code}`;
    const text = link.announcedDiscountValue
      ? `Acesse com meu cupom especial de ${link.announcedDiscountValue}: ${fullUrl}`
      : `Acesse meu link exclusivo: ${fullUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: link.title,
          text,
          url: fullUrl,
        });
      } catch {
        handleCopyLink(link);
      }
    } else {
      handleCopyLink(link);
    }
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
      setPixSuccess("Dados PIX salvos com sucesso!");
      setIsEditingPix(false);
    }
  }

  const filteredMaterials = materials.filter((m) => {
    if (materialFilter === "ALL") return true;
    return m.mediaFormat === materialFilter;
  });

  const statusBadges: Record<string, { label: string; className: string }> = {
    PENDING: { label: "Em Análise", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
    APPROVED: { label: "Aprovada", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
    PAID: { label: "Paga via PIX", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
    CANCELLED: { label: "Cancelada", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  };

  // EMPTY STATE: NOT ENROLLED
  if (!isEnrolled && links.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto text-2xl font-bold">
          ★
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          Programa Divulgue e Ganhe
        </h2>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Você ainda não possui campanhas de divulgação ativas nesta consultoria. Entre em contato com a equipe da consultoria para habilitar seus links individuais e materiais de divulgação.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HERO SECTION */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
              Parceria Oficial · Divulgue &amp; Ganhe
            </span>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-1">
              Olá, {participantName || "Parceiro"}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">
              Compartilhe seus links exclusivos, acesse os materiais oficiais para Stories e acompanhe suas indicações e comissões registradas.
            </p>
          </div>

          {defaultCode && (
            <div className="flex items-center gap-2 self-start sm:self-center p-2 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold px-2">
                Código Geral:
              </span>
              <span className="font-mono font-black text-xs text-[var(--brand)] px-2 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border-default)]">
                {defaultCode}
              </span>
            </div>
          )}
        </div>

        {/* NAVIGATION TABS: 3 MAIN AREAS */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pt-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("links")}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-2 ${
              activeTab === "links"
                ? "border-[var(--brand)] text-[var(--brand)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span>🔗 Meus Links</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)]">
              {links.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("materials")}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-2 ${
              activeTab === "materials"
                ? "border-[var(--brand)] text-[var(--brand)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span>🎨 Materiais para Divulgar</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)]">
              {materials.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("results")}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-2 ${
              activeTab === "results"
                ? "border-[var(--brand)] text-[var(--brand)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span>📊 Meus Resultados</span>
            {results.conversionsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-500 font-black">
                {results.conversionsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ÁREA 1: MEUS LINKS                                                   */}
      {/* ==================================================================== */}
      {activeTab === "links" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Campanhas e Links Ativos</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Cada link possui seu próprio destino, desconto anunciado e regras de comissão.
              </p>
            </div>
          </div>

          {links.length === 0 ? (
            <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-8 text-center text-xs text-[var(--text-secondary)] space-y-2">
              <span className="text-xl block">🔗</span>
              <p className="font-semibold text-[var(--text-primary)]">Nenhum link configurado no momento</p>
              <p className="max-w-sm mx-auto">
                O administrador da sua consultoria ainda não cadastrou links individuais para você. Assim que disponíveis, eles aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {links.map((link) => {
                const isCopied = copiedLinkId === link.id;
                const fullShareUrl = `${baseUrl}/r/${link.code}`;
                const isPaused = link.status !== "ACTIVE";

                return (
                  <div
                    key={link.id}
                    className={`bg-[var(--surface)] border rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 transition-all ${
                      isPaused
                        ? "border-[var(--border-default)] opacity-75"
                        : "border-[var(--border-default)] hover:border-[var(--brand)]"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-[var(--text-primary)]">
                              {link.title}
                            </h3>
                            {link.status === "ACTIVE" ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Ativo
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">
                                {link.status === "PAUSED" ? "Pausado" : "Encerrado"}
                              </span>
                            )}
                          </div>
                          {link.description && (
                            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                              {link.description}
                            </p>
                          )}
                        </div>

                        {link.announcedDiscountValue && (
                          <div className="shrink-0 px-3 py-1.5 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-border)] text-[var(--brand-foreground)] text-xs font-black">
                            {link.announcedDiscountValue}
                          </div>
                        )}
                      </div>

                      {/* CONDIÇÕES E COMISSÃO */}
                      <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--text-secondary)]">Sua Comissão:</span>
                          <span className="font-bold text-[var(--brand)]">
                            {link.commissionValueFormatted}
                          </span>
                        </div>
                        {link.commissionConditions && (
                          <div className="flex items-start justify-between gap-2 pt-1 border-t border-[var(--border-subtle)] text-[11px]">
                            <span className="text-[var(--text-tertiary)]">Condição:</span>
                            <span className="text-[var(--text-secondary)] font-medium text-right">
                              {link.commissionConditions}
                            </span>
                          </div>
                        )}
                        {link.eligiblePlans && (
                          <div className="flex items-start justify-between gap-2 text-[11px]">
                            <span className="text-[var(--text-tertiary)]">Planos:</span>
                            <span className="text-[var(--text-secondary)] font-medium text-right">
                              {link.eligiblePlans}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* LINK URL DISPLAY */}
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] font-mono text-xs text-[var(--text-primary)] select-all truncate">
                        <span className="truncate">{fullShareUrl}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--text-tertiary)]">
                          {link.code}
                        </span>
                      </div>
                    </div>

                    {/* BOTÕES DE AÇÃO: COPIAR E COMPARTILHAR */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(link)}
                        className="px-4 py-2.5 rounded-2xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
                      >
                        {isCopied ? <span>✓ Copiado!</span> : <span>📋 Copiar link</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareLink(link)}
                        className="px-4 py-2.5 rounded-2xl bg-[var(--brand)] hover:brightness-110 active:scale-98 text-white text-xs font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <span>↗ Compartilhar</span>
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
      {/* ÁREA 2: MATERIAIS PARA DIVULGAR                                      */}
      {/* ==================================================================== */}
      {activeTab === "materials" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Artes e Legendas Oficiais</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Materiais preparados para Stories e publicações. Baixe a arte ou copie a legenda pronta.
              </p>
            </div>

            {/* FILTRO DE FORMATO */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] overflow-x-auto">
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
                      ? "bg-[var(--surface)] text-[var(--brand)] shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredMaterials.length === 0 ? (
            <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-8 text-center text-xs text-[var(--text-secondary)] space-y-2">
              <span className="text-xl block">🎨</span>
              <p className="font-semibold text-[var(--text-primary)]">Nenhum material encontrado</p>
              <p className="max-w-sm mx-auto">
                Não há artes disponíveis nesta categoria no momento. Assim que o administrador disponibilizar, você poderá baixá-las aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMaterials.map((mat) => {
                const isStory = mat.mediaFormat === "STORY";
                const isCaptionCopied = copiedCaptionId === mat.id;
                const formatLabel = isStory ? "Story (9:16)" : mat.mediaFormat === "FEED" ? "Feed (1:1)" : mat.mediaFormat;

                return (
                  <div
                    key={mat.id}
                    className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-[var(--brand)] transition-all"
                  >
                    <div className="space-y-3">
                      {/* PREVIEW CONTAINER */}
                      <div
                        className={`w-full rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center overflow-hidden relative ${
                          isStory ? "aspect-[9/16] max-h-72" : "aspect-square max-h-56"
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
                          <div className="p-4 text-center text-zinc-400 dark:text-[#8E95A2] space-y-1">
                            <span className="text-3xl block">🎨</span>
                            <span className="text-xs font-semibold block">{formatLabel}</span>
                          </div>
                        )}
                        <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-black/70 text-white backdrop-blur-xs border border-white/20">
                          {formatLabel}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">{mat.title}</h3>
                        {mat.description && (
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                            {mat.description}
                          </p>
                        )}
                      </div>

                      {/* LEGENDA PRONTA */}
                      {mat.suggestedCaption && (
                        <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                              Legenda Pronta
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCaption(mat.id, mat.suggestedCaption!)}
                              className="text-[11px] font-bold text-[var(--brand)] hover:underline cursor-pointer"
                            >
                              {isCaptionCopied ? "✓ Copiada!" : "Copiar legenda"}
                            </button>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed line-clamp-3">
                            &quot;{mat.suggestedCaption}&quot;
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ACTIONS */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-subtle)]">
                      {mat.fileUrl ? (
                        <a
                          href={mat.fileUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2.5 rounded-2xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
                        >
                          <span>⬇ Baixar arte</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="px-3 py-2.5 rounded-2xl bg-[var(--surface-subtle)] text-xs font-bold text-[var(--text-tertiary)] opacity-60 min-h-[44px]"
                        >
                          Sem arquivo
                        </button>
                      )}

                      {mat.suggestedCaption ? (
                        <button
                          type="button"
                          onClick={() => handleCopyCaption(mat.id, mat.suggestedCaption!)}
                          className="px-3 py-2.5 rounded-2xl bg-[var(--brand)] hover:brightness-110 active:scale-98 text-white text-xs font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          {isCaptionCopied ? <span>✓ Copiada</span> : <span>📝 Copiar texto</span>}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (links[0]) handleShareLink(links[0]);
                          }}
                          className="px-3 py-2.5 rounded-2xl bg-[var(--brand)] hover:brightness-110 active:scale-98 text-white text-xs font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <span>↗ Compartilhar</span>
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
      {/* ÁREA 3: MEUS RESULTADOS & PAGAMENTOS PIX                             */}
      {/* ==================================================================== */}
      {activeTab === "results" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Painel de Desempenho e Comissões</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Valores reais registrados e atribuídos às suas divulgações oficiais.
            </p>
          </div>

          {/* 6 INDICADORES REAIS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">
                Acessos Registrados
              </span>
              <span className="text-2xl font-black text-[var(--text-primary)] mt-1 block">
                {results.totalClicks}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 block">
                Cliques em seus links
              </span>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">
                Indicações Identificadas
              </span>
              <span className="text-2xl font-black text-[var(--text-primary)] mt-1 block">
                {results.registrationsCount}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 block">
                Cadastros ou contatos
              </span>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">
                Contratações Confirmadas
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                {results.conversionsCount}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 block">
                Matrículas validadas
              </span>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                Em Análise
              </span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                {formatBrl(results.pendingAmount)}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 block">
                Aguardando aprovação
              </span>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider block">
                A Receber
              </span>
              <span className="text-xl font-bold text-[var(--brand)] mt-1 block">
                {formatBrl(results.approvedAmount)}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 block">
                Aprovadas pelo admin
              </span>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                Comissões Pagas
              </span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                {formatBrl(results.paidAmount)}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 block">
                Liquidadas via PIX
              </span>
            </div>
          </div>

          {/* DADOS PIX PARA RECEBIMENTO */}
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>🔑 Chave PIX para Recebimento de Comissões</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Utilizada pelo administrador para transferir os valores de comissões aprovadas.
                </p>
              </div>

              {!isEditingPix && (
                <button
                  type="button"
                  onClick={() => setIsEditingPix(true)}
                  className="px-4 py-2 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer min-h-[40px]"
                >
                  Editar Chave PIX
                </button>
              )}
            </div>

            {pixError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
                {pixError}
              </div>
            )}
            {pixSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                {pixSuccess}
              </div>
            )}

            {isEditingPix ? (
              <form onSubmit={handleSavePix} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Tipo de Chave</label>
                    <select
                      value={pixKeyType}
                      onChange={(e) => setPixKeyType(e.target.value as PixKeyType)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] min-h-[44px]"
                    >
                      <option value="CPF">CPF</option>
                      <option value="CNPJ">CNPJ</option>
                      <option value="EMAIL">E-mail</option>
                      <option value="PHONE">Telefone</option>
                      <option value="RANDOM_KEY">Chave Aleatória (EVP)</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Chave PIX</label>
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="Digite sua chave PIX com atenção"
                      className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-mono text-[var(--text-primary)] min-h-[44px]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-primary)]">Nome do Titular da Conta (Opcional)</label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Nome completo para conferência do PIX"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] min-h-[44px]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSavingPix}
                    className="px-5 py-2.5 rounded-2xl bg-[var(--brand)] hover:brightness-110 text-white text-xs font-bold transition-all cursor-pointer min-h-[44px]"
                  >
                    {isSavingPix ? "Salvando..." : "Salvar Dados PIX"}
                  </button>
                  {pixProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditingPix(false)}
                      className="px-4 py-2.5 rounded-2xl bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-secondary)] min-h-[44px]"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[var(--text-tertiary)] block text-[11px]">Chave Cadastrada:</span>
                  <span className="font-mono font-bold text-[var(--text-primary)] text-sm mt-0.5 block">
                    {pixProfile?.pixKeyMasked || "Não cadastrado"}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">
                    Tipo: {pixProfile?.pixKeyType}
                  </span>
                </div>
                {pixProfile?.receiverName && (
                  <div>
                    <span className="text-[var(--text-tertiary)] block text-[11px]">Titular:</span>
                    <span className="font-semibold text-[var(--text-primary)] mt-0.5 block">
                      {pixProfile.receiverName}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* HISTÓRICO DE COMISSÕES */}
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Histórico de Movimentações</h3>
            {commissions.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--text-tertiary)]">
                Nenhuma comissão registrada ainda. Compartilhe seus links para iniciar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                      <th className="pb-3 font-semibold">Data</th>
                      <th className="pb-3 font-semibold">Campanha</th>
                      <th className="pb-3 font-semibold">Aluno Indicado</th>
                      <th className="pb-3 font-semibold">Valor</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {commissions.map((c) => {
                      const badge = statusBadges[c.status] || {
                        label: c.status,
                        className: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
                      };
                      return (
                        <tr key={c.id}>
                          <td className="py-3 text-[var(--text-secondary)]">
                            {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-3 font-medium text-[var(--text-primary)]">
                            {c.campaignTitle || "Indicação Geral"}
                          </td>
                          <td className="py-3 font-semibold text-[var(--text-primary)]">
                            {c.studentName}
                          </td>
                          <td className="py-3 font-bold text-[var(--brand)]">
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
    </div>
  );
}
