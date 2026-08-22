"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePlatformBillingSettingsAction } from "../actions";
import { FormField, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const PIX_KEY_TYPES = ["CPF", "CNPJ", "EMAIL", "PHONE", "RANDOM"] as const;
type PixKeyType = (typeof PIX_KEY_TYPES)[number];

interface PixFormProps {
  initialData?: {
    pixKeyType: PixKeyType;
    pixKey: string;
    receiverName: string;
    instructions: string | null;
  } | null;
}

export function PixSettingsForm({ initialData }: PixFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [pixKeyType, setPixKeyType] = useState<PixKeyType>(initialData?.pixKeyType || "CNPJ");
  const [pixKey, setPixKey] = useState(initialData?.pixKey || "");
  const [receiverName, setReceiverName] = useState(initialData?.receiverName || "Trevo One Tecnologia Ltda");
  const [instructions, setInstructions] = useState(initialData?.instructions || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const res = await updatePlatformBillingSettingsAction({
        pixKeyType,
        pixKey,
        receiverName,
        instructions: instructions || null,
      });

      if (!res.success) {
        setError(res.error || "Erro ao salvar configurações Pix.");
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert variant="danger" title="Erro ao salvar">
          <p className="text-xs">{error}</p>
        </Alert>
      )}

      {success && (
        <Alert variant="success" title="Configurações Atualizadas">
          <p className="text-xs">Chave Pix oficial da plataforma salva com sucesso!</p>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Tipo de Chave Pix" required id="pixKeyType">
          <Select
            id="pixKeyType"
            value={pixKeyType}
            onChange={(e) => setPixKeyType(e.target.value as PixKeyType)}
            disabled={isPending}
          >
            {PIX_KEY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Chave Pix Oficial" required id="pixKey">
          <Input
            id="pixKey"
            type="text"
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            placeholder="Ex: 00.000.000/0001-00 ou pix@trevo.one"
            disabled={isPending}
          />
        </FormField>
      </div>

      <FormField label="Nome do Favorecido / Razão Social" required id="receiverName">
        <Input
          id="receiverName"
          type="text"
          value={receiverName}
          onChange={(e) => setReceiverName(e.target.value)}
          placeholder="Ex: Trevo One Tecnologia Ltda"
          disabled={isPending}
        />
      </FormField>

      <FormField label="Instruções Adicionais de Pagamento" optional id="instructions">
        <Textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          placeholder="Ex: Envie o comprovante em PDF ou imagem legível constando a identificação da consultoria."
          disabled={isPending}
        />
      </FormField>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isPending}
        >
          {isPending ? "Salvando..." : "Salvar Configurações Pix"}
        </Button>
      </div>
    </form>
  );
}
