"use client";

import React, { useState, useEffect, useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createStudentChargeAction,
  searchStudentsAction,
  type ActionState,
} from "@/app/consultoria/[slug]/financeiro/actions";
import type { StudentSearchItem } from "@/lib/consultancies/finance";
import { FormField, Input, Textarea } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";

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
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5"
        >
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="leading-relaxed">{state.error}</span>
        </div>
      )}

      {/* 1. Seleção do Aluno */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-[var(--text-primary)] tracking-tight">
          Aluno <span className="text-[var(--danger)]">*</span>
        </label>

        {selectedStudent ? (
          <div className="flex items-center justify-between p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#008f4c] font-semibold flex items-center justify-center text-sm shrink-0">
                {selectedStudent.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">{selectedStudent.fullName}</p>
                <p className="text-xs text-zinc-500">{selectedStudent.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedStudent(null);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900 px-2.5 py-1 bg-white border border-zinc-200 rounded-md transition-colors cursor-pointer"
            >
              Trocar aluno
            </button>
          </div>
        ) : (
          <div className="relative">
            <Input
              type="text"
              placeholder="Digite o nome ou e-mail do aluno..."
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (!val.trim() || val.trim().length < 2) {
                  setSearchResults([]);
                  setIsSearching(false);
                }
              }}
              autoComplete="off"
              disabled={isSubmitting}
            />

            {isSearching && (
              <div className="absolute right-3 top-3 text-xs text-zinc-400">Buscando...</div>
            )}

            {searchResults.length > 0 && (
              <ul className="absolute z-20 w-full mt-1.5 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-zinc-100">
                {searchResults.map((student) => (
                  <li key={student.membershipPublicId}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(student);
                        setSearchResults([]);
                      }}
                      className="w-full text-left p-3 hover:bg-emerald-50/60 transition-colors flex items-center justify-between gap-2 text-sm cursor-pointer"
                    >
                      <div>
                        <p className="font-medium text-zinc-900">{student.fullName}</p>
                        <p className="text-xs text-zinc-500">{student.email}</p>
                      </div>
                      <span className="text-xs text-emerald-600 font-medium">Selecionar</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
              <p className="text-xs text-zinc-500 mt-1.5">Nenhum aluno ativo encontrado com este nome ou e-mail.</p>
            )}
          </div>
        )}

        <input
          type="hidden"
          name="studentMembershipPublicId"
          value={selectedStudent?.membershipPublicId || ""}
        />
      </div>

      {/* 2. Título da Cobrança */}
      <FormField label="Título da Cobrança" required id="title">
        <Input
          name="title"
          type="text"
          placeholder="Ex: Mensalidade Consultoria Premium — Agosto/2026"
          disabled={isSubmitting}
          maxLength={150}
        />
      </FormField>

      {/* 3. Descrição Opcional */}
      <FormField label="Descrição" optional id="description">
        <Textarea
          name="description"
          rows={2}
          placeholder="Detalhes adicionais sobre os serviços inclusos na cobrança"
          disabled={isSubmitting}
          maxLength={500}
        />
      </FormField>

      {/* 4. Valor e Vencimento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Valor (R$)" required helperText="Exemplo: 297,00 ou 1.250,00" id="amountBrl">
          <Input
            name="amountBrl"
            type="text"
            placeholder="0,00"
            autoComplete="off"
            disabled={isSubmitting}
          />
        </FormField>

        <FormField label="Data de Vencimento" required id="dueOn">
          <Input
            name="dueOn"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            disabled={isSubmitting}
          />
        </FormField>
      </div>

      {/* 5. Período de Referência */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-[var(--text-primary)] tracking-tight">
          Período de Referência <span className="text-[var(--text-tertiary)] font-normal text-[11px] ml-1.5">(opcional)</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField helperText="Início do período atendido" id="referencePeriodStart">
            <Input
              name="referencePeriodStart"
              type="date"
              disabled={isSubmitting}
            />
          </FormField>

          <FormField helperText="Fim do período atendido" id="referencePeriodEnd">
            <Input
              name="referencePeriodEnd"
              type="date"
              disabled={isSubmitting}
            />
          </FormField>
        </div>
      </div>

      {/* 6. Bloqueio de Acesso */}
      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            name="blocksAccess"
            value="true"
            defaultChecked={hasFinanceSettings}
            disabled={isSubmitting}
            className="w-4 h-4 mt-0.5 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
          />
          <div>
            <span className="text-sm font-semibold text-zinc-900 block">
              Pode restringir acesso ao vencer
            </span>
            <span className="text-xs text-zinc-500 leading-relaxed block mt-0.5">
              Se habilitado e a cobrança vencer sem confirmação de pagamento, o aluno poderá ter restrições de acesso aos treinos e dietas.
            </span>
          </div>
        </label>
        {!hasFinanceSettings && (
          <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
            Atenção: Configure a chave Pix da consultoria antes de emitir cobranças que restringem acesso.
          </p>
        )}
      </div>

      {/* 7. Ações */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-zinc-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/consultoria/${slug}/financeiro`)}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || !selectedStudent}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? "Criando cobrança..." : "Emitir Cobrança"}
        </Button>
      </div>
    </form>
  );
}
