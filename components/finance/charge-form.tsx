"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createStudentPlanChargeAction,
  createCustomStudentChargeAction,
  searchStudentsAction,
} from "@/app/consultoria/[slug]/financeiro/actions";
import type { StudentSearchItem } from "@/lib/consultancies/finance";
import type { ConsultancyPlan } from "@/lib/infinitepay/types";
import type { StudentFeatureKey } from "@/lib/consultancies/student-features";

interface ChargeFormProps {
  slug: string;
  hasFinanceSettings: boolean;
  availablePlans?: ConsultancyPlan[];
}

const FEATURE_DEFINITIONS: {
  key: StudentFeatureKey;
  label: string;
  subtitle: string;
  description: string;
}[] = [
  {
    key: "training",
    label: "Treinos e Exercícios",
    subtitle: "Acesso a treinos prescritos e vídeos",
    description: "Permite ao aluno visualizar e registrar suas fichas de treino, catálogo de exercícios e vídeos de execução.",
  },
  {
    key: "nutrition",
    label: "Nutrição e Dietas",
    subtitle: "Planos alimentares e refeições",
    description: "Permite ao aluno consultar planos nutricionais, detalhamento de refeições, calorias e orientações alimentares.",
  },
  {
    key: "evolution",
    label: "Evolução e Fotos",
    subtitle: "Histórico físico, medidas e peso",
    description: "Permite ao aluno registrar fotos de evolução física, peso e acompanhar gráficos de métricas corporais.",
  },
  {
    key: "consultations",
    label: "Consultas e Check-ins",
    subtitle: "Check-ins periódicos e avaliações",
    description: "Acompanhamento de consultas, check-ins de rotina e metas estabelecidas com a equipe.",
  },
  {
    key: "chat",
    label: "TrevoChat",
    subtitle: "Mensagens com o treinador",
    description: "Canal direto de comunicação por chat entre o aluno e os profissionais da consultoria.",
  },
];

const DURATION_MONTH_OPTIONS = [
  { label: "1 mês (Mensal)", months: 1, days: null },
  { label: "2 meses (Bimestral)", months: 2, days: null },
  { label: "3 meses (Trimestral)", months: 3, days: null },
  { label: "6 meses (Semestral)", months: 6, days: null },
  { label: "12 meses (Anual)", months: 12, days: null },
  { label: "Personalizado (dias)", months: null, days: 30 },
];

export function ChargeForm({
  slug,
  hasFinanceSettings,
  availablePlans = [],
}: ChargeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Mode: "PLAN" (commercial plan) vs "CUSTOM" (custom charge with granular features)
  const [chargeMode, setChargeMode] = useState<"PLAN" | "CUSTOM">("CUSTOM");

  // Student search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudentSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchItem | null>(null);

  // Commercial Plan selection state
  const [selectedPlanPublicId, setSelectedPlanPublicId] = useState<string>(() => {
    return availablePlans.length > 0 ? availablePlans[0].publicId : "";
  });

  // Custom Charge state
  const [customTitle, setCustomTitle] = useState("Consultoria Personalizada");
  const [customDescription, setCustomDescription] = useState("");
  const [customAmountBrl, setCustomAmountBrl] = useState("150,00");
  const [customDueOn, setCustomDueOn] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [durationPreset, setDurationPreset] = useState<number>(1); // months
  const [customDays, setCustomDays] = useState<number>(30);
  const [isCustomDaysActive, setIsCustomDaysActive] = useState(false);
  const [billingMethod, setBillingMethod] = useState<"MANUAL" | "INFINITEPAY">("MANUAL");
  const [blocksAccess, setBlocksAccess] = useState(true);

  // Granular features state
  const [features, setFeatures] = useState<Record<StudentFeatureKey, boolean>>({
    training: true,
    nutrition: true,
    evolution: true,
    consultations: false,
    chat: true,
  });

  // Review confirmation checkbox
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Error and Result states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{
    chargePublicId: string;
    checkoutUrl?: string;
    whatsAppHref?: string;
    billingMethod: "MANUAL" | "INFINITEPAY";
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Debounced search for students
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2 || selectedStudent) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchStudentsAction(slug, trimmed);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedStudent, slug]);

  const activeFeatureCount = Object.values(features).filter(Boolean).length;

  const toggleFeature = (key: StudentFeatureKey) => {
    setFeatures((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleCopyLink = () => {
    if (!createdResult?.checkoutUrl) return;
    navigator.clipboard.writeText(createdResult.checkoutUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const formatCentsToBrlDisplay = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Submit Commercial Plan Charge
  const handleCommercialPlanSubmit = () => {
    if (!selectedStudent) {
      setErrorMessage("Selecione um aluno destinatário.");
      return;
    }
    if (!selectedPlanPublicId) {
      setErrorMessage("Selecione um plano comercial para emitir a cobrança.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("studentMembershipPublicId", selectedStudent.membershipPublicId);
      formData.set("planPublicId", selectedPlanPublicId);

      try {
        const res = await createStudentPlanChargeAction(slug, null, formData);
        if (res.success && res.chargePublicId) {
          setCreatedResult({
            chargePublicId: res.chargePublicId,
            checkoutUrl: res.checkoutUrl,
            whatsAppHref: res.whatsAppHref,
            billingMethod: "INFINITEPAY",
          });
        } else {
          setErrorMessage(res.error || "Não foi possível emitir a cobrança do plano.");
        }
      } catch {
        setErrorMessage("Erro de conexão ao emitir a cobrança.");
      }
    });
  };

  // Submit Custom Charge
  const handleCustomChargeSubmit = () => {
    if (!selectedStudent) {
      setErrorMessage("Selecione um aluno destinatário.");
      return;
    }

    if (!customTitle.trim()) {
      setErrorMessage("Informe o título da cobrança.");
      return;
    }

    if (!customAmountBrl.trim()) {
      setErrorMessage("Informe o valor da cobrança.");
      return;
    }

    if (!customDueOn) {
      setErrorMessage("Informe a data de vencimento.");
      return;
    }

    if (activeFeatureCount === 0) {
      setErrorMessage("Selecione ao menos um recurso permitido para o aluno.");
      return;
    }

    if (!isConfirmed) {
      setErrorMessage("Confirme a revisão dos dados antes de emitir a cobrança.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("studentMembershipPublicId", selectedStudent.membershipPublicId);
      formData.set("title", customTitle.trim());
      if (customDescription.trim()) {
        formData.set("description", customDescription.trim());
      }
      formData.set("amountBrl", customAmountBrl.trim());
      formData.set("dueOn", customDueOn);
      formData.set("billingMethod", billingMethod);
      formData.set("blocksAccess", blocksAccess ? "true" : "false");

      if (isCustomDaysActive) {
        formData.set("durationDays", String(customDays || 30));
      } else {
        formData.set("durationMonths", String(durationPreset || 1));
      }

      // Feature keys
      formData.set("featuresJson", JSON.stringify(features));

      try {
        const res = await createCustomStudentChargeAction(slug, null, formData);
        if (res.success && res.chargePublicId) {
          if (billingMethod === "INFINITEPAY") {
            setCreatedResult({
              chargePublicId: res.chargePublicId,
              checkoutUrl: res.checkoutUrl,
              whatsAppHref: res.whatsAppHref,
              billingMethod: "INFINITEPAY",
            });
          } else {
            // Manual mode: redirect to charge details
            router.push(`/consultoria/${slug}/financeiro/cobrancas/${res.chargePublicId}`);
          }
        } else {
          setErrorMessage(res.error || "Não foi possível emitir a cobrança personalizada.");
        }
      } catch {
        setErrorMessage("Erro de conexão ao emitir a cobrança.");
      }
    });
  };

  // SUCCESS SCREEN
  if (createdResult) {
    return (
      <div className="space-y-6 py-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-[#E2F5EC] text-[#176B49] border border-[#B8E6D0] flex items-center justify-center mx-auto shadow-xs">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <div className="space-y-1.5">
          <h2 className="font-heading text-xl sm:text-2xl font-black text-[#102E23]">
            Cobrança Emitida com Sucesso!
          </h2>
          <p className="text-xs sm:text-sm text-[#526058] max-w-md mx-auto">
            {createdResult.billingMethod === "INFINITEPAY"
              ? "O link de pagamento foi gerado via InfinitePay. O aluno poderá efetuar o pagamento por Pix ou Cartão parcelado, e a ativação ocorrerá automaticamente."
              : "A cobrança foi registrada no painel. O pagamento será confirmado manualmente assim que o aluno realizar a transferência."}
          </p>
        </div>

        {createdResult.checkoutUrl && (
          <div className="max-w-lg mx-auto p-4 bg-[#F5F5F0] border border-[#DEE2DA] rounded-2xl space-y-2 text-left">
            <span className="text-[11px] font-bold text-[#526058] uppercase tracking-wider block">
              Link de Pagamento InfinitePay
            </span>
            <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-[#D5DDD6]">
              <span className="text-xs font-mono text-[#102E23] truncate select-all">
                {createdResult.checkoutUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#176B49] hover:bg-[#125438] text-white transition-colors cursor-pointer"
              >
                {copiedLink ? "✓ Copiado!" : "Copiar"}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          {createdResult.whatsAppHref && (
            <a
              href={createdResult.whatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#25D366] hover:bg-[#1EBE5D] transition-colors min-h-[46px] shadow-xs"
            >
              <span>Enviar por WhatsApp</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
              </svg>
            </a>
          )}

          <Link
            href={`/consultoria/${slug}/financeiro/cobrancas/${createdResult.chargePublicId}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-[#102E23] bg-white border border-[#D5DDD6] hover:bg-[#F5F5F0] transition-colors min-h-[46px]"
          >
            Ver detalhes da cobrança
          </Link>

          <button
            type="button"
            onClick={() => {
              setCreatedResult(null);
              setSelectedStudent(null);
              setSearchQuery("");
              setIsConfirmed(false);
            }}
            className="w-full sm:w-auto px-5 py-3 rounded-xl font-semibold text-xs text-[#526058] hover:text-[#102E23] transition-colors min-h-[46px] cursor-pointer"
          >
            Emitir outra cobrança
          </button>
        </div>
      </div>
    );
  }

  const selectedPlan = availablePlans.find((p) => p.publicId === selectedPlanPublicId);

  return (
    <div className="space-y-6 text-[#102E23]">
      {/* Modality Selector Tab */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-[#526058] uppercase tracking-wider block">
          Modalidade de Emissão
        </label>
        <div className="grid grid-cols-2 p-1 bg-[#F5F5F0] rounded-2xl border border-[#DEE2DA]">
          <button
            type="button"
            onClick={() => {
              setChargeMode("CUSTOM");
              setErrorMessage(null);
            }}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              chargeMode === "CUSTOM"
                ? "bg-white text-[#102E23] shadow-xs border border-[#DEE2DA]"
                : "text-[#526058] hover:text-[#102E23]"
            }`}
          >
            <svg className="w-4 h-4 text-[#176B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            <span>Cobrança personalizada</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setChargeMode("PLAN");
              setErrorMessage(null);
            }}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              chargeMode === "PLAN"
                ? "bg-white text-[#102E23] shadow-xs border border-[#DEE2DA]"
                : "text-[#526058] hover:text-[#102E23]"
            }`}
          >
            <svg className="w-4 h-4 text-[#176B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
            <span>Plano comercial</span>
          </button>
        </div>
      </div>

      {!hasFinanceSettings && billingMethod === "MANUAL" && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-950 flex items-start gap-2.5 text-xs shadow-2xs">
          <svg className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p className="font-bold text-amber-950">Atenção: Chave Pix não cadastrada</p>
            <p className="text-amber-900/80 mt-0.5">
              Sua consultoria ainda não cadastrou uma chave Pix no painel. O aluno só visualizará os dados de transferência após a configuração na aba Recebimento.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs shadow-2xs">
          <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p className="font-bold text-rose-900">Erro na emissão</p>
            <p className="text-rose-800 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* =========================================================================
          ETAPA 1: ESCOLHER ALUNO
          ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#176B49] text-white text-xs font-bold flex items-center justify-center shrink-0">
            1
          </div>
          <div>
            <h2 className="font-bold text-sm text-[#102E23]">Escolher aluno destinatário</h2>
            <p className="text-xs text-[#526058]">Selecione o aluno cadastrado na consultoria</p>
          </div>
        </div>

        {selectedStudent ? (
          <div className="flex items-center justify-between p-3.5 bg-[#E2F5EC]/50 border border-[#B8E6D0] rounded-2xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#176B49] text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-2xs">
                {selectedStudent.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#102E23] truncate">{selectedStudent.fullName}</p>
                <p className="text-xs text-[#526058] truncate">{selectedStudent.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedStudent(null);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="text-xs text-[#176B49] hover:text-[#125438] font-bold px-3 py-2 rounded-xl bg-white border border-[#B8E6D0] hover:bg-[#E2F5EC] transition-colors min-h-[44px] inline-flex items-center shrink-0 cursor-pointer"
            >
              Trocar aluno
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Digite o nome ou e-mail do aluno..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isPending}
                className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-[#D5DDD6] bg-white text-[#102E23] placeholder:text-[#526058]/60 focus:outline-none focus:border-[#176B49] focus:ring-2 focus:ring-[#176B49]/15 text-sm transition-all shadow-2xs"
              />
              <svg className="w-4 h-4 text-[#526058]/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>

            {isSearching && (
              <div className="absolute right-3.5 top-3 text-xs text-[#526058] font-medium">
                Buscando...
              </div>
            )}

            {!selectedStudent && searchQuery.trim().length >= 2 && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#D5DDD6] rounded-2xl shadow-xl max-h-56 overflow-y-auto z-30 divide-y divide-[#E5E8E2]">
                {searchResults.map((student) => (
                  <button
                    key={student.membershipPublicId}
                    type="button"
                    onClick={() => {
                      setSelectedStudent(student);
                      setSearchResults([]);
                    }}
                    className="w-full text-left p-3.5 hover:bg-[#F5F5F0] transition-colors flex items-center justify-between min-h-[44px] cursor-pointer group"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#102E23] group-hover:text-[#176B49] transition-colors">{student.fullName}</p>
                      <p className="text-[11px] text-[#526058]">{student.email}</p>
                    </div>
                    <span className="text-xs font-bold text-[#176B49] bg-[#E2F5EC] px-2.5 py-1 rounded-lg">Selecionar</span>
                  </button>
                ))}
              </div>
            )}

            {!selectedStudent && searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#D5DDD6] rounded-2xl p-3.5 shadow-xl z-30 text-xs text-[#526058] text-center">
                Nenhum aluno encontrado com esse nome ou e-mail.
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          FLUXO A: PLANO COMERCIAL
          ========================================================================= */}
      {chargeMode === "PLAN" && (
        <div className="space-y-6 pt-3 border-t border-[#E5E8E2]">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#176B49] text-white text-xs font-bold flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <h2 className="font-bold text-sm text-[#102E23]">Selecionar Plano Comercial</h2>
                <p className="text-xs text-[#526058]">Escolha um dos planos vigentes cadastrados na consultoria</p>
              </div>
            </div>

            {availablePlans.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#F5F5F0] border border-[#DEE2DA] text-center space-y-2">
                <p className="text-xs font-bold text-[#102E23]">Nenhum plano comercial ativo cadastrado.</p>
                <p className="text-[11px] text-[#526058]">
                  Você pode emitir uma cobrança personalizada ou cadastrar planos na aba de Planos do Financeiro.
                </p>
                <button
                  type="button"
                  onClick={() => setChargeMode("CUSTOM")}
                  className="mt-2 text-xs font-bold text-[#176B49] hover:underline cursor-pointer"
                >
                  Alternar para cobrança personalizada →
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {availablePlans.map((plan) => {
                  const isSelected = selectedPlanPublicId === plan.publicId;
                  const durationText = plan.durationMonths
                    ? `${plan.durationMonths} ${plan.durationMonths === 1 ? "mês" : "meses"}`
                    : plan.durationDays
                    ? `${plan.durationDays} dias`
                    : "Mensal";

                  return (
                    <div
                      key={plan.publicId}
                      onClick={() => setSelectedPlanPublicId(plan.publicId)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        isSelected
                          ? "bg-[#E2F5EC] border-[#176B49] shadow-xs"
                          : "bg-white border-[#E5E8E2] hover:border-zinc-300"
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? "border-[#176B49] bg-[#176B49]" : "border-[#A0ABA4]"
                            }`}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <p className="font-bold text-xs sm:text-sm text-[#102E23] truncate">
                            {plan.name}
                          </p>
                        </div>
                        <p className="text-xs text-[#526058] pl-5.5">
                          Duração: {durationText}
                          {plan.assuredInstallments > 0
                            ? ` • Parcelamento sem juros até ${plan.assuredInstallments}x`
                            : " • Parcelamento no cartão"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end sm:text-right gap-2 pt-1.5 sm:pt-0 border-t border-black/5 sm:border-t-0 shrink-0 pl-5.5 sm:pl-0">
                        <span className="font-extrabold text-sm sm:text-base text-[#176B49] font-sans tabular-nums">
                          {formatCentsToBrlDisplay(plan.amountCents)}
                        </span>
                        <span className="text-[10px] text-[#526058] font-semibold">InfinitePay</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Review & Submit Commercial Plan */}
          <div className="space-y-3 pt-3 border-t border-[#E5E8E2]">
            <div className="p-3.5 rounded-2xl bg-[#F5F5F0] border border-[#DEE2DA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[11px] text-[#526058] block">Destinatário:</span>
                <strong className="text-[#102E23] font-bold">
                  {selectedStudent ? selectedStudent.fullName : "Nenhum aluno selecionado"}
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-[#526058] block">Plano Selecionado:</span>
                <strong className="text-[#102E23] font-bold">
                  {selectedPlan ? selectedPlan.name : "Nenhum selecionado"}
                </strong>
              </div>
              <div className="sm:text-right">
                <span className="text-[11px] text-[#526058] block">Valor:</span>
                <strong className="text-[#176B49] font-black text-sm font-sans tabular-nums">
                  {selectedPlan ? formatCentsToBrlDisplay(selectedPlan.amountCents) : "R$ 0,00"}
                </strong>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleCommercialPlanSubmit}
                disabled={!selectedStudent || !selectedPlanPublicId || isPending}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#176B49] hover:bg-[#125438] disabled:opacity-40 disabled:cursor-not-allowed transition-all min-h-[48px] shadow-xs cursor-pointer select-none"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Gerando cobrança do plano...</span>
                  </span>
                ) : (
                  <span>Emitir Cobrança do Plano</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FLUXO B: COBRANÇA PERSONALIZADA
          ========================================================================= */}
      {chargeMode === "CUSTOM" && (
        <div className="space-y-6 pt-3 border-t border-[#E5E8E2]">
          {/* Informações da Cobrança */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#176B49] text-white text-xs font-bold flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <h2 className="font-bold text-sm text-[#102E23]">Definir valor, vencimento e duração</h2>
                <p className="text-xs text-[#526058]">Condições comerciais específicas desta contratação</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="custom-charge-title" className="block text-xs font-bold text-[#102E23]">
                  Título da Cobrança <span className="text-rose-500">*</span>
                </label>
                <input
                  id="custom-charge-title"
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Ex: Consultoria Personalizada - Trimestral"
                  disabled={isPending}
                  maxLength={150}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#D5DDD6] bg-white text-[#102E23] placeholder:text-[#526058]/60 focus:outline-none focus:border-[#176B49] focus:ring-2 focus:ring-[#176B49]/15 text-sm transition-all shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label htmlFor="custom-charge-amount" className="block text-xs font-bold text-[#102E23]">
                    Valor (R$) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="custom-charge-amount"
                    type="text"
                    value={customAmountBrl}
                    onChange={(e) => setCustomAmountBrl(e.target.value)}
                    placeholder="150,00"
                    disabled={isPending}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#D5DDD6] bg-white text-[#102E23] font-bold placeholder:text-[#526058]/60 focus:outline-none focus:border-[#176B49] focus:ring-2 focus:ring-[#176B49]/15 text-sm transition-all shadow-2xs tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="custom-charge-due" className="block text-xs font-bold text-[#102E23]">
                    Data de Vencimento <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="custom-charge-due"
                    type="date"
                    value={customDueOn}
                    onChange={(e) => setCustomDueOn(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    disabled={isPending}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#D5DDD6] bg-white text-[#102E23] text-sm focus:outline-none focus:border-[#176B49] focus:ring-2 focus:ring-[#176B49]/15 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Duração do Acesso */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-[#102E23]">
                  Duração do Acesso <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DURATION_MONTH_OPTIONS.map((opt, idx) => {
                    const isSelected = opt.months !== null ? !isCustomDaysActive && durationPreset === opt.months : isCustomDaysActive;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (opt.months !== null) {
                            setIsCustomDaysActive(false);
                            setDurationPreset(opt.months);
                          } else {
                            setIsCustomDaysActive(true);
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                          isSelected
                            ? "bg-[#E2F5EC] border-[#176B49] text-[#102E23] shadow-2xs"
                            : "bg-white border-[#D5DDD6] text-[#526058] hover:border-zinc-400"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {isCustomDaysActive && (
                  <div className="p-3 bg-[#F5F5F0] border border-[#DEE2DA] rounded-xl flex items-center gap-3 mt-2">
                    <label htmlFor="custom-days-input" className="text-xs font-bold text-[#102E23] shrink-0">
                      Número de dias:
                    </label>
                    <input
                      id="custom-days-input"
                      type="number"
                      min={1}
                      max={3650}
                      value={customDays}
                      onChange={(e) => setCustomDays(Number(e.target.value))}
                      disabled={isPending}
                      className="w-24 h-9 px-3 rounded-lg border border-[#D5DDD6] bg-white text-xs font-bold text-[#102E23] focus:outline-none focus:border-[#176B49]"
                    />
                    <span className="text-xs text-[#526058]">dias de vigência após quitação</span>
                  </div>
                )}
              </div>

              {/* Descrição opcional */}
              <div className="space-y-1 pt-1">
                <label htmlFor="custom-charge-desc" className="block text-xs font-bold text-[#102E23]">
                  Observações da Cobrança <span className="text-[#526058] font-normal text-[11px]">(opcional)</span>
                </label>
                <textarea
                  id="custom-charge-desc"
                  rows={2}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Ex: Inclui acompanhamento nutricional personalizado e 2 avaliações físicas."
                  disabled={isPending}
                  maxLength={500}
                  className="w-full p-3 rounded-xl border border-[#D5DDD6] bg-white text-[#102E23] placeholder:text-[#526058]/60 focus:outline-none focus:border-[#176B49] text-xs resize-none shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* =========================================================================
              ETAPA 3: RECURSOS INDIVIDUAIS CONTRATADOS
              ========================================================================= */}
          <div className="space-y-3 pt-3 border-t border-[#E5E8E2]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#176B49] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h2 className="font-bold text-sm text-[#102E23]">Recursos permitidos ao aluno</h2>
                  <p className="text-xs text-[#526058]">Selecione os módulos disponíveis nesta contratação</p>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${activeFeatureCount > 0 ? "bg-[#E2F5EC] text-[#176B49] border-[#B8E6D0]" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                {activeFeatureCount} de 5 selecionados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FEATURE_DEFINITIONS.map((feat) => {
                const isEnabled = features[feat.key];
                return (
                  <div
                    key={feat.key}
                    onClick={() => toggleFeature(feat.key)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isEnabled
                        ? "bg-[#E2F5EC]/60 border-[#176B49] shadow-2xs"
                        : "bg-white border-[#E5E8E2] hover:border-zinc-300 opacity-75"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => toggleFeature(feat.key)}
                      className="mt-1 w-4 h-4 rounded border-[#D5DDD6] text-[#176B49] focus:ring-[#176B49] cursor-pointer shrink-0"
                    />
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs font-bold text-[#102E23] block">
                          {feat.label}
                        </strong>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isEnabled ? "text-[#176B49]" : "text-[#526058]"}`}>
                          {isEnabled ? "Ativo" : "Bloqueado"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#526058] leading-tight">
                        {feat.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {activeFeatureCount === 0 && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium">
                ⚠️ Selecione ao menos um recurso para que o aluno tenha acesso a módulos do aplicativo.
              </p>
            )}
          </div>

          {/* =========================================================================
              ETAPA 4: MODALIDADE DE RECEBIMENTO
              ========================================================================= */}
          <div className="space-y-3 pt-3 border-t border-[#E5E8E2]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#176B49] text-white text-xs font-bold flex items-center justify-center shrink-0">
                4
              </div>
              <div>
                <h2 className="font-bold text-sm text-[#102E23]">Modalidade de recebimento</h2>
                <p className="text-xs text-[#526058]">Defina como o aluno realizará o pagamento</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* MANUAL */}
              <div
                onClick={() => setBillingMethod("MANUAL")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  billingMethod === "MANUAL"
                    ? "bg-[#E2F5EC] border-[#176B49] shadow-xs"
                    : "bg-white border-[#E5E8E2] hover:border-zinc-300"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        billingMethod === "MANUAL" ? "border-[#176B49] bg-[#176B49]" : "border-[#A0ABA4]"
                      }`}
                    >
                      {billingMethod === "MANUAL" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <strong className="text-xs sm:text-sm font-bold text-[#102E23]">
                      Recebimento Manual
                    </strong>
                  </div>
                  <p className="text-xs text-[#526058] pl-6 leading-relaxed">
                    Você recebe diretamente do aluno (Pix chave direta, dinheiro, transferência ou maquininha externa) e dá baixa manual pelo painel para liberar o acesso.
                  </p>
                </div>
                <div className="pl-6">
                  <span className="text-[10px] font-bold text-[#176B49] bg-white px-2.5 py-1 rounded-md border border-[#B8E6D0]">
                    Baixa manual pelo administrador
                  </span>
                </div>
              </div>

              {/* INFINITEPAY */}
              <div
                onClick={() => setBillingMethod("INFINITEPAY")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  billingMethod === "INFINITEPAY"
                    ? "bg-[#E2F5EC] border-[#176B49] shadow-xs"
                    : "bg-white border-[#E5E8E2] hover:border-zinc-300"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        billingMethod === "INFINITEPAY" ? "border-[#176B49] bg-[#176B49]" : "border-[#A0ABA4]"
                      }`}
                    >
                      {billingMethod === "INFINITEPAY" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <strong className="text-xs sm:text-sm font-bold text-[#102E23]">
                      Checkout InfinitePay
                    </strong>
                  </div>
                  <p className="text-xs text-[#526058] pl-6 leading-relaxed">
                    Gera link seguro para pagamento via Pix ou Cartão de Crédito. A confirmação e liberação de acesso ocorrem de forma 100% automática.
                  </p>
                </div>
                <div className="pl-6">
                  <span className="text-[10px] font-bold text-[#176B49] bg-white px-2.5 py-1 rounded-md border border-[#B8E6D0]">
                    Link online + Ativação automática
                  </span>
                </div>
              </div>
            </div>

            {/* Regra de Bloqueio por Inadimplência */}
            <div className="p-3.5 bg-white rounded-xl border border-[#D5DDD6] flex items-start gap-2.5 mt-2">
              <input
                type="checkbox"
                id="custom-blocks-access"
                checked={blocksAccess}
                onChange={(e) => setBlocksAccess(e.target.checked)}
                disabled={isPending}
                className="mt-0.5 w-4 h-4 rounded border-[#D5DDD6] text-[#176B49] focus:ring-[#176B49]"
              />
              <label htmlFor="custom-blocks-access" className="text-xs leading-relaxed cursor-pointer select-none">
                <strong className="text-[#102E23] font-bold block">Restringir acesso em caso de atraso</strong>
                <span className="text-[#526058] text-[11px]">
                  Se marcado, o aluno terá acesso restrito aos módulos contratados após a data de vencimento até que o pagamento seja confirmado.
                </span>
              </label>
            </div>
          </div>

          {/* =========================================================================
              ETAPA 5: RESUMO DE REVISÃO E CONFIRMAÇÃO
              ========================================================================= */}
          <div className="space-y-4 pt-3 border-t border-[#E5E8E2]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#176B49] text-white text-xs font-bold flex items-center justify-center shrink-0">
                5
              </div>
              <div>
                <h2 className="font-bold text-sm text-[#102E23]">Revisar condições e emitir</h2>
                <p className="text-xs text-[#526058]">Confira todos os dados antes de gerar a cobrança</p>
              </div>
            </div>

            {/* Summary Card */}
            <div className="p-4 rounded-2xl bg-[#F5F5F0] border border-[#DEE2DA] space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b border-[#E5E8E2]">
                <div>
                  <span className="text-[11px] text-[#526058] block">Destinatário:</span>
                  <strong className="text-[#102E23] font-bold">
                    {selectedStudent ? selectedStudent.fullName : "Nenhum aluno selecionado"}
                  </strong>
                </div>
                <div>
                  <span className="text-[11px] text-[#526058] block">Vencimento:</span>
                  <strong className="text-[#102E23] font-bold">
                    {customDueOn ? customDueOn.split("-").reverse().join("/") : "Não informado"}
                  </strong>
                </div>
                <div>
                  <span className="text-[11px] text-[#526058] block">Duração:</span>
                  <strong className="text-[#102E23] font-bold">
                    {isCustomDaysActive ? `${customDays} dias` : `${durationPreset} ${durationPreset === 1 ? "mês" : "meses"}`}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-[#E5E8E2]">
                <div>
                  <span className="text-[11px] text-[#526058] block">Modalidade de Recebimento:</span>
                  <strong className="text-[#102E23] font-bold">
                    {billingMethod === "MANUAL" ? "Recebimento Manual (Baixa no painel)" : "InfinitePay (Link com Pix e Cartão)"}
                  </strong>
                </div>
                <div>
                  <span className="text-[11px] text-[#526058] block">Regra de Inadimplência:</span>
                  <span className={`font-bold inline-flex items-center gap-1.5 ${blocksAccess ? "text-amber-800" : "text-[#526058]"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${blocksAccess ? "bg-amber-500" : "bg-zinc-400"}`} />
                    <span>{blocksAccess ? "Restringe acesso no atraso" : "Acesso contínuo"}</span>
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-[#526058] block mb-1">Recursos Liberados:</span>
                <div className="flex flex-wrap gap-1.5">
                  {FEATURE_DEFINITIONS.filter((f) => features[f.key]).map((f) => (
                    <span
                      key={f.key}
                      className="text-[11px] font-bold text-[#176B49] bg-[#E2F5EC] border border-[#B8E6D0] px-2.5 py-0.5 rounded-full"
                    >
                      ✓ {f.label}
                    </span>
                  ))}
                  {activeFeatureCount === 0 && (
                    <span className="text-xs text-rose-600 font-bold">Nenhum recurso selecionado!</span>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-[#E5E8E2]">
                <span className="text-xs font-bold text-[#526058]">Valor Total da Cobrança:</span>
                <strong className="text-[#176B49] font-black text-lg font-sans tabular-nums">
                  R$ {customAmountBrl}
                </strong>
              </div>
            </div>

            {/* Checkbox de confirmação explícita */}
            <div className="p-3.5 bg-white rounded-xl border border-[#D5DDD6] flex items-start gap-2.5">
              <input
                type="checkbox"
                id="custom-confirm-checkbox"
                checked={isConfirmed}
                onChange={(e) => {
                  setIsConfirmed(e.target.checked);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isPending}
                className="mt-0.5 w-4 h-4 rounded border-[#D5DDD6] text-[#176B49] focus:ring-[#176B49] cursor-pointer"
              />
              <label htmlFor="custom-confirm-checkbox" className="text-xs text-[#102E23] leading-relaxed cursor-pointer select-none">
                <strong className="font-bold block">Confirmo as condições e permissões selecionadas</strong>
                <span className="text-[#526058] text-[11px]">
                  Os recursos selecionados serão associados a este aluno pelo prazo acordado após a quitação da cobrança.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleCustomChargeSubmit}
                disabled={!selectedStudent || activeFeatureCount === 0 || !isConfirmed || isPending}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#176B49] hover:bg-[#125438] disabled:opacity-40 disabled:cursor-not-allowed transition-all min-h-[48px] shadow-xs cursor-pointer select-none"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Emitindo cobrança personalizada...</span>
                  </span>
                ) : (
                  <span>Emitir Cobrança Personalizada</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
