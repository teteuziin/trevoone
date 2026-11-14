"use client";

import React, { useState, useEffect, useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createStudentChargeAction,
  searchStudentsAction,
  type ActionState,
} from "@/app/consultoria/[slug]/financeiro/actions";
import type { StudentSearchItem } from "@/lib/consultancies/finance";

interface ChargeFormProps {
  slug: string;
  hasFinanceSettings: boolean;
}

export function ChargeForm({ slug, hasFinanceSettings }: ChargeFormProps) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();

  // Student search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudentSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchItem | null>(null);
  const [blocksAccess, setBlocksAccess] = useState(true);

  // Debounced search (only triggers when query >= 2 and no student selected)
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

  const boundAction = createStudentChargeAction.bind(null, slug);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (prevState, formData) => {
      const res = await boundAction(prevState, formData);
      if (res.success && res.chargePublicId) {
        startNavigation(() => {
          router.push(`/consultoria/${slug}/financeiro/cobrancas/${res.chargePublicId}`);
        });
      }
      return res;
    },
    {}
  );

  const isSubmitting = isPending || isNavigating;

  return (
    <form action={formAction} className="space-y-6 text-[#102E23]">
      {!hasFinanceSettings && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-950 flex items-start gap-2.5 text-xs shadow-2xs">
          <svg className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p className="font-bold text-amber-950">Atenção: Chave Pix não configurada</p>
            <p className="text-amber-900/80 mt-0.5">
              Sua consultoria ainda não cadastrou uma chave Pix no painel. A cobrança poderá ser gerada, mas o aluno só visualizará os dados de transferência após a configuração.
            </p>
          </div>
        </div>
      )}

      {state.error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs shadow-2xs">
          <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p className="font-bold text-rose-900">Erro na emissão</p>
            <p className="text-rose-800 mt-0.5">{state.error}</p>
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
            <h2 className="font-bold text-sm text-[#102E23]">Escolher aluno</h2>
            <p className="text-xs text-[#526058]">Selecione o aluno que receberá a cobrança</p>
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
                disabled={isSubmitting}
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
                Nenhum aluno encontrado com essa busca.
              </div>
            )}
          </div>
        )}

        <input
          type="hidden"
          name="studentMembershipPublicId"
          value={selectedStudent ? selectedStudent.membershipPublicId : ""}
        />
      </div>

      {/* =========================================================================
          ETAPA 2: DEFINIR VALOR E VENCIMENTO
          ========================================================================= */}
      <div className="space-y-3 pt-3 border-t border-[#E5E8E2]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#176B49] text-white text-xs font-bold flex items-center justify-center shrink-0">
            2
          </div>
          <div>
            <h2 className="font-bold text-sm text-[#102E23]">Definir valor e vencimento</h2>
            <p className="text-xs text-[#526058]">Informe os detalhes principais da cobrança</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="charge-title" className="block text-xs font-bold text-[#102E23]">
              Título da Cobrança <span className="text-rose-500">*</span>
            </label>
            <input
              id="charge-title"
              name="title"
              type="text"
              placeholder="Ex: Mensalidade - Novembro 2026"
              defaultValue="Mensalidade de Consultoria"
              disabled={isSubmitting}
              maxLength={150}
              className="w-full h-11 px-3.5 rounded-xl border border-[#D5DDD6] bg-white text-[#102E23] placeholder:text-[#526058]/60 focus:outline-none focus:border-[#176B49] focus:ring-2 focus:ring-[#176B49]/15 text-sm transition-all shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label htmlFor="charge-amount" className="block text-xs font-bold text-[#102E23]">
                Valor (R$) <span className="text-rose-500">*</span>
              </label>
              <input
                id="charge-amount"
                name="amountBrl"
                type="text"
                placeholder="150,00"
                disabled={isSubmitting}
                className="w-full h-11 px-3.5 rounded-xl border border-[#D5DDD6] bg-white text-[#102E23] font-bold placeholder:text-[#526058]/60 focus:outline-none focus:border-[#176B49] focus:ring-2 focus:ring-[#176B49]/15 text-sm transition-all shadow-2xs tabular-nums"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="charge-due" className="block text-xs font-bold text-[#102E23]">
                Data de Vencimento <span className="text-rose-500">*</span>
              </label>
              <input
                id="charge-due"
                name="dueOn"
                type="date"
                disabled={isSubmitting}
                className="w-full h-11 px-3.5 rounded-xl border border-[#D5DDD6] bg-white text-[#102E23] text-sm focus:outline-none focus:border-[#176B49] focus:ring-2 focus:ring-[#176B49]/15 transition-all shadow-2xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          OPÇÕES AVANÇADAS (AGRUPADAS)
          ========================================================================= */}
      <details className="group rounded-2xl border border-[#DEE2DA] bg-[#FBFBFA] p-3.5 sm:p-4 text-xs transition-all">
        <summary className="flex items-center justify-between cursor-pointer list-none select-none font-bold text-[#102E23]">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#526058]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            <span>Opções avançadas (período, notas e bloqueio)</span>
          </div>
          <svg className="w-4 h-4 text-[#526058] group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </summary>

        <div className="pt-3 mt-3 border-t border-[#DEE2DA] space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="ref-start" className="block text-[11px] font-bold text-[#102E23]">
                Início do Período de Referência
              </label>
              <input
                id="ref-start"
                name="referencePeriodStart"
                type="date"
                disabled={isSubmitting}
                className="w-full h-10 px-3 rounded-xl border border-[#D5DDD6] bg-white text-[#102E23] text-xs focus:outline-none focus:border-[#176B49]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="ref-end" className="block text-[11px] font-bold text-[#102E23]">
                Fim do Período de Referência
              </label>
              <input
                id="ref-end"
                name="referencePeriodEnd"
                type="date"
                disabled={isSubmitting}
                className="w-full h-10 px-3 rounded-xl border border-[#D5DDD6] bg-white text-[#102E23] text-xs focus:outline-none focus:border-[#176B49]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="charge-desc" className="block text-[11px] font-bold text-[#102E23]">
              Observações da Cobrança (opcional)
            </label>
            <textarea
              id="charge-desc"
              name="description"
              rows={2}
              placeholder="Ex: Inclui acompanhamento nutricional e treino personalizado."
              disabled={isSubmitting}
              maxLength={500}
              className="w-full p-3 rounded-xl border border-[#D5DDD6] bg-white text-[#102E23] placeholder:text-[#526058]/60 focus:outline-none focus:border-[#176B49] text-xs resize-none"
            />
          </div>

          <div className="p-3 bg-white rounded-xl border border-[#D5DDD6] flex items-start gap-2.5">
            <input
              type="checkbox"
              id="blocksAccess"
              name="blocksAccess"
              value="true"
              checked={blocksAccess}
              onChange={(e) => setBlocksAccess(e.target.checked)}
              disabled={isSubmitting}
              className="mt-0.5 w-4 h-4 rounded border-[#D5DDD6] text-[#176B49] focus:ring-[#176B49]"
            />
            <label htmlFor="blocksAccess" className="text-xs leading-relaxed cursor-pointer select-none">
              <strong className="text-[#102E23] font-bold block">Restringir acesso em caso de atraso</strong>
              <span className="text-[#526058] text-[11px]">
                Se marcado, o aluno terá acesso restrito aos módulos da consultoria após o vencimento até a confirmação do pagamento.
              </span>
            </label>
          </div>
        </div>
      </details>

      {/* =========================================================================
          ETAPA 3: REVISAR E EMITIR COBRANÇA
          ========================================================================= */}
      <div className="space-y-3 pt-3 border-t border-[#E5E8E2]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#176B49] text-white text-xs font-bold flex items-center justify-center shrink-0">
            3
          </div>
          <div>
            <h2 className="font-bold text-sm text-[#102E23]">Revisar e emitir</h2>
            <p className="text-xs text-[#526058]">Confirme os dados antes de gerar a cobrança</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#F5F5F0] border border-[#DEE2DA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-[11px] text-[#526058] block">Destinatário:</span>
            <p className="font-bold text-[#102E23]">
              {selectedStudent ? selectedStudent.fullName : "Nenhum aluno selecionado"}
            </p>
          </div>

          <div className="space-y-0.5 sm:text-center">
            <span className="text-[11px] text-[#526058] block">Regra de Acesso:</span>
            <p className={`font-bold inline-flex items-center gap-1.5 ${blocksAccess ? "text-amber-800" : "text-[#526058]"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${blocksAccess ? "bg-amber-500" : "bg-zinc-400"}`} />
              <span>{blocksAccess ? "Restringe acesso ao vencer" : "Acesso contínuo"}</span>
            </p>
          </div>

          <div className="space-y-0.5 sm:text-right">
            <span className="text-[11px] text-[#526058] block">Recebimento:</span>
            <p className="font-bold text-[#176B49]">Pix e Cartão parcelado</p>
          </div>
        </div>

        <div className="pt-3 pb-1 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="submit"
            disabled={!selectedStudent || isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-[#176B49] hover:bg-[#125438] disabled:opacity-40 disabled:cursor-not-allowed transition-all min-h-[48px] shadow-xs cursor-pointer select-none touch-manipulation"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Emitindo cobrança...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>Emitir Cobrança</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
