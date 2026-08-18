"use client";

import React, { useActionState } from "react";
import {
  saveFinanceSettingsAction,
  type ActionState,
} from "@/app/consultoria/[slug]/financeiro/actions";
import type { ConsultancyFinanceSettings, PixKeyType } from "@/lib/consultancies/finance";
import { FormField, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";

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
    <form action={formAction} className="space-y-5">
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

      {state.success && (
        <div
          role="status"
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2.5"
        >
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="leading-relaxed">{state.message || "Configurações salvas com sucesso!"}</span>
        </div>
      )}

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
        <FormField label="Chave Pix" required id="pixKey">
          <Input
            name="pixKey"
            type="text"
            autoComplete="off"
            placeholder="Digite a chave Pix exata"
            defaultValue={initialSettings?.pixKey || ""}
            disabled={isPending}
            maxLength={255}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nome do Titular / Recebedor */}
        <FormField label="Nome do Titular / Recebedor" required id="pixReceiverName">
          <Input
            name="pixReceiverName"
            type="text"
            autoComplete="off"
            placeholder="Nome completo ou Razão Social"
            defaultValue={initialSettings?.pixReceiverName || ""}
            disabled={isPending}
            maxLength={150}
          />
        </FormField>

        {/* Fuso Horário Financeiro */}
        <FormField
          label="Fuso Horário de Cobrança"
          required
          helperText="Utilizado para determinar as datas de vencimento e pagamentos."
          id="billingTimezone"
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
      </div>

      {/* Instruções de Pagamento */}
      <FormField
        label="Instruções de Pagamento"
        optional
        helperText="Orientações adicionais que serão exibidas ao aluno (ex: enviar comprovante até as 18h)."
        id="paymentInstructions"
      >
        <Textarea
          name="paymentInstructions"
          rows={3}
          placeholder="Ex: Pagamento exclusivo via Pix para o titular acima. Após transferir, anexe o comprovante."
          defaultValue={initialSettings?.paymentInstructions || ""}
          disabled={isPending}
          maxLength={1000}
        />
      </FormField>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="submit"
          variant="primary"
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          {isPending ? "Salvando configurações..." : "Salvar configurações Pix"}
        </Button>
      </div>
    </form>
  );
}
