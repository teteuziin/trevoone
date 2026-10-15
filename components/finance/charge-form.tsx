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
import { Alert } from "@/components/ui/alert";

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
      {!hasFinanceSettings && (
        <Alert variant="warning" title="Atenção: Chave Pix não cadastrada">
          <p className="text-xs">
            Sua consultoria ainda não configurou uma chave Pix. A cobrança poderá ser gerada, mas o aluno não visualizará os dados de transferência até que você configure a chave no painel.
          </p>
        </Alert>
      )}

      {state.error && (
        <Alert variant="danger" title="Erro na emissão">
          <p className="text-xs">{state.error}</p>
        </Alert>
      )}

      {/* 1. Seleção do Aluno */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-[var(--text-primary)]">
          Aluno <span className="text-[var(--danger)]">*</span>
        </label>

        {selectedStudent ? (
          <div className="flex items-center justify-between p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-center text-sm shrink-0">
                {selectedStudent.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{selectedStudent.fullName}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{selectedStudent.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedStudent(null);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 font-semibold px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors min-h-[44px] inline-flex items-center"
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
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSubmitting}
            />

            {isSearching && (
              <div className="absolute right-3 top-3 text-xs text-zinc-500 dark:text-zinc-400">
                Buscando...
              </div>
            )}

            {!selectedStudent && searchQuery.trim().length >= 2 && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl max-h-56 overflow-y-auto z-20 divide-y divide-zinc-100 dark:divide-zinc-800">
                {searchResults.map((student) => (
                  <button
                    key={student.membershipPublicId}
                    type="button"
                    onClick={() => {
                      setSelectedStudent(student);
                      setSearchResults([]);
                    }}
                    className="w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between min-h-[44px]"
                  >
                    <div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{student.fullName}</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{student.email}</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Selecionar</span>
                  </button>
                ))}
              </div>
            )}

            {!selectedStudent && searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-xl z-20 text-xs text-zinc-600 dark:text-zinc-400 text-center">
                Nenhum aluno encontrado com essa busca.
              </div>
            )}
          </div>
        )}

        {/* Hidden Input for studentMembershipPublicId */}
        <input
          type="hidden"
          name="studentMembershipPublicId"
          value={selectedStudent ? selectedStudent.membershipPublicId : ""}
        />
      </div>

      {/* 2. Título da Cobrança */}
      <FormField label="Título da Cobrança" required id="title">
        <Input
          name="title"
          type="text"
          placeholder="Ex: Mensalidade - Setembro 2026"
          defaultValue="Mensalidade de Consultoria"
          disabled={isSubmitting}
          maxLength={150}
        />
      </FormField>

      {/* 3. Valor e Data de Vencimento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Valor (R$)" required id="amountBrl">
          <Input
            name="amountBrl"
            type="text"
            placeholder="Ex: 150,00"
            disabled={isSubmitting}
          />
        </FormField>

        <FormField label="Data de Vencimento" required id="dueOn">
          <Input
            name="dueOn"
            type="date"
            disabled={isSubmitting}
          />
        </FormField>
      </div>

      {/* 4. Período de Referência */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Início do Período de Referência" optional id="referencePeriodStart">
          <Input
            name="referencePeriodStart"
            type="date"
            disabled={isSubmitting}
          />
        </FormField>

        <FormField label="Fim do Período de Referência" optional id="referencePeriodEnd">
          <Input
            name="referencePeriodEnd"
            type="date"
            disabled={isSubmitting}
          />
        </FormField>
      </div>

      {/* 5. Descrição */}
      <FormField label="Observações da Cobrança" optional id="description">
        <Textarea
          name="description"
          rows={3}
          placeholder="Ex: Inclui acompanhamento nutricional e treino personalizado."
          disabled={isSubmitting}
          maxLength={500}
        />
      </FormField>

      {/* 6. Opção de Bloqueio de Acesso por Inadimplência */}
      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-3">
        <input
          type="checkbox"
          id="blocksAccess"
          name="blocksAccess"
          value="1"
          defaultChecked
          disabled={isSubmitting}
          className="mt-0.5 w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500"
        />
        <label htmlFor="blocksAccess" className="text-xs leading-relaxed cursor-pointer select-none">
          <strong className="text-zinc-900 dark:text-zinc-100 font-semibold block">Restringir acesso em caso de atraso</strong>
          <span className="text-zinc-600 dark:text-zinc-400">
            Se marcado, o aluno terá acesso restrito aos módulos da consultoria após o vencimento desta cobrança até a confirmação do pagamento.
          </span>
        </label>
      </div>

      <div className="pt-2 flex items-center justify-end gap-3">
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="min-h-[44px]"
          disabled={!selectedStudent || isSubmitting}
        >
          {isSubmitting ? "Emitindo cobrança..." : "Emitir Cobrança"}
        </Button>
      </div>
    </form>
  );
}
