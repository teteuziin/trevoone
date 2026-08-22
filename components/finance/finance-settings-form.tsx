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
    <form action={formAction} className="space-y-5">
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

      <div className="pt-2 flex justify-end">
        <Button type="submit" variant="primary" size="md" disabled={isPending}>
          {isPending ? "Salvando configurações..." : "Salvar Configurações Pix"}
        </Button>
      </div>
    </form>
  );
}
