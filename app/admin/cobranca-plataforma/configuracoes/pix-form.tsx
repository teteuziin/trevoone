"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePlatformBillingSettingsAction } from "../actions";

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm">
          Configurações Pix salvas com sucesso!
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-700">
            Tipo de Chave Pix
          </label>
          <select
            value={pixKeyType}
            onChange={(e) => setPixKeyType(e.target.value as PixKeyType)}
            disabled={isPending}
            className="w-full h-10 px-3 rounded-xl border border-zinc-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00A859]"
          >
            {PIX_KEY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-700">
            Chave Pix Oficial
          </label>
          <input
            type="text"
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            placeholder="Ex: 00.000.000/0001-00 ou pix@trevo.one"
            disabled={isPending}
            required
            className="w-full h-10 px-3 rounded-xl border border-zinc-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00A859]"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-zinc-700">
          Nome do Favorecido / Razão Social
        </label>
        <input
          type="text"
          value={receiverName}
          onChange={(e) => setReceiverName(e.target.value)}
          placeholder="Ex: Trevo One Tecnologia Ltda"
          disabled={isPending}
          required
          className="w-full h-10 px-3 rounded-xl border border-zinc-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00A859]"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-zinc-700">
          Instruções Adicionais de Pagamento (Opcional)
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          placeholder="Ex: Envie o comprovante em PDF ou imagem legível constando o ID da transação."
          disabled={isPending}
          className="w-full p-3 rounded-xl border border-zinc-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00A859]"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#00A859] hover:bg-[#008f4c] text-white transition-colors disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Salvar Configurações"}
        </button>
      </div>
    </form>
  );
}
