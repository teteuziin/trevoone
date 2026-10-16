"use client";

import React, { useActionState } from "react";
import {
  saveFinanceSettingsAction,
  type ActionState,
} from "@/app/consultoria/[slug]/financeiro/actions";
import type { ConsultancyFinanceSettings, PixKeyType } from "@/lib/consultancies/finance";
import { FormField, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface FinanceSettingsFormProps {
  slug: string;
  initialSettings: ConsultancyFinanceSettings | null;
  onSuccess?: () => void;
}

const VALID_PIX_KEY_TYPES: readonly PixKeyType[] = [
  "CPF",
  "CNPJ",
  "EMAIL",
  "PHONE",
  "RANDOM",
] as const;

const PIX_KEY_TYPE_LABELS: Record<PixKeyType, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  PHONE: "Telefone / Celular",
  RANDOM: "Chave Aleatória (EVP)",
};

const COMMON_TIMEZONES = [
  { value: "America/Sao_Paulo", label: "Brasília (America/Sao_Paulo, UTC-3)" },
  { value: "America/Fortaleza", label: "Nordeste (America/Fortaleza, UTC-3)" },
  { value: "America/Manaus", label: "Manaus (America/Manaus, UTC-4)" },
  { value: "America/Cuiaba", label: "Cuiabá (America/Cuiaba, UTC-4)" },
  { value: "America/Rio_Branco", label: "Acre (America/Rio_Branco, UTC-5)" },
  { value: "America/Noronha", label: "Fernando de Noronha (America/Noronha, UTC-2)" },
];

export function FinanceSettingsForm({
  slug,
  initialSettings,
  onSuccess,
}: FinanceSettingsFormProps) {
  const boundAction = saveFinanceSettingsAction.bind(null, slug);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (prevState, formData) => {
      const res = await boundAction(prevState, formData);
      if (res.success && onSuccess) {
        onSuccess();
      }
      return res;
    },
    {}
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <Alert variant="danger" title="Erro ao salvar">
          <p className="text-xs">{state.error}</p>
        </Alert>
      )}

      {state.success && (
        <Alert variant="success" title="Configurações Salvas">
          <p className="text-xs">{state.message || "As configurações financeiras foram atualizadas com sucesso!"}</p>
        </Alert>
      )}

      {/* =========================================================================
          PASSO 1: QUEM RECEBE?
          ========================================================================= */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0">
            1
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Quem recebe os pagamentos?
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Dados do titular e chave Pix para onde os alunos farão as transferências.
            </p>
          </div>
        </div>

        {/* Nome do Favorecido */}
        <FormField label="Nome do Favorecido / Recebedor" required id="pixReceiverName">
          <Input
            name="pixReceiverName"
            type="text"
            placeholder="Ex: João da Silva Personal Trainer Ltda"
            defaultValue={initialSettings?.pixReceiverName || ""}
            disabled={isPending}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tipo da Chave Pix */}
          <FormField label="Tipo de Chave Pix" required id="pixKeyType">
            <Select
              name="pixKeyType"
              defaultValue={initialSettings?.pixKeyType || "CPF"}
              disabled={isPending}
            >
              {VALID_PIX_KEY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PIX_KEY_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Chave Pix */}
          <FormField label="Chave Pix Oficial" required id="pixKey">
            <Input
              name="pixKey"
              type="text"
              placeholder="Ex: 123.456.789-00 ou pix@consultoria.com"
              defaultValue={initialSettings?.pixKey || ""}
              disabled={isPending}
            />
          </FormField>
        </div>
      </div>

      {/* =========================================================================
          PASSO 2: CONFIGURAÇÕES DA COBRANÇA
          ========================================================================= */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0">
            2
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Regras e Instruções da Cobrança
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Fuso horário para cálculo de vencimento e orientações exibidas aos alunos.
            </p>
          </div>
        </div>

        {/* Fuso Horário de Cobrança */}
        <FormField
          label="Fuso Horário Operacional para Cobranças"
          required
          id="billingTimezone"
          helperText="Utilizado para determinar exatamente o horário limite de vencimento das mensalidades."
        >
          <Select
            name="billingTimezone"
            defaultValue={initialSettings?.billingTimezone || "America/Sao_Paulo"}
            disabled={isPending}
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </Select>
        </FormField>

        {/* Instruções de Pagamento */}
        <FormField
          label="Instruções Adicionais de Pagamento"
          optional
          id="paymentInstructions"
          helperText="Orientação exibida ao aluno no aplicativo ao visualizar a cobrança."
        >
          <Textarea
            name="paymentInstructions"
            rows={3}
            placeholder="Ex: Após a transferência, envie o comprovante diretamente pelo aplicativo para liberação imediata."
            defaultValue={initialSettings?.paymentInstructions || ""}
            disabled={isPending}
            maxLength={1000}
          />
        </FormField>
      </div>

      {/* =========================================================================
          PASSO 3: SALVAR E ATIVAR
          ========================================================================= */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0">
            3
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Salvar e Ativar Configurações
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              As novas informações entram em vigor imediatamente para todas as cobranças da consultoria.
            </p>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isPending}
          className="shrink-0 font-bold min-h-[44px] px-6"
        >
          {isPending ? "Salvando configurações..." : "Salvar Configurações Pix"}
        </Button>
      </div>
    </form>
  );
}
