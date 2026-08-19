"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlatformChargeAction } from "../../actions";

interface ChargeFormProps {
  consultancies: {
    publicId: string;
    name: string;
    slug: string;
  }[];
  defaultConsultancyPublicId?: string;
}

export function ChargeForm({ consultancies, defaultConsultancyPublicId }: ChargeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [consultancyPublicId, setConsultancyPublicId] = useState(
    defaultConsultancyPublicId || consultancies[0]?.publicId || ""
  );
  const [title, setTitle] = useState("Mensalidade Plataforma");
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("149,90");
  const [dueOn, setDueOn] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().slice(0, 10);
  });
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Parse BRL amount string into cents
    const cleaned = amountStr.replace(/[^\d,.-]/g, "").replace(".", "").replace(",", ".");
    const val = Number(cleaned);
    if (Number.isNaN(val) || val <= 0) {
      setError("Informe um valor válido em reais (ex: 149,90).");
      return;
    }
    const amountCents = Math.round(val * 100);

    startTransition(async () => {
      const res = await createPlatformChargeAction({
        consultancyPublicId,
        title,
        description: description || null,
        amountCents,
        dueOn,
        periodStart: periodStart || null,
        periodEnd: periodEnd || null,
      });

      if (!res.success) {
        setError(res.error || "Erro ao criar cobrança.");
      } else {
        router.push(`/admin/cobranca-plataforma/consultorias/${consultancyPublicId}`);
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

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-zinc-700">
          Consultoria Destinatária
        </label>
        <select
          value={consultancyPublicId}
          onChange={(e) => setConsultancyPublicId(e.target.value)}
          disabled={isPending}
          required
          className="w-full h-10 px-3 rounded-xl border border-zinc-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00A859]"
        >
          {consultancies.map((c) => (
            <option key={c.publicId} value={c.publicId}>
              {c.name} ({c.slug})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-700">
            Título da Cobrança
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Mensalidade Trevo One - Agosto/2026"
            disabled={isPending}
            required
            className="w-full h-10 px-3 rounded-xl border border-zinc-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00A859]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-700">
            Valor (R$)
          </label>
          <input
            type="text"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="149,90"
            disabled={isPending}
            required
            className="w-full h-10 px-3 rounded-xl border border-zinc-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00A859]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-700">
            Data de Vencimento
          </label>
          <input
            type="date"
            value={dueOn}
            onChange={(e) => setDueOn(e.target.value)}
            disabled={isPending}
            required
            className="w-full h-10 px-3 rounded-xl border border-zinc-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00A859]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-700">
            Início do Período (Opcional)
          </label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            disabled={isPending}
            className="w-full h-10 px-3 rounded-xl border border-zinc-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00A859]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-700">
            Fim do Período (Opcional)
          </label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            disabled={isPending}
            className="w-full h-10 px-3 rounded-xl border border-zinc-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00A859]"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-zinc-700">
          Descrição / Detalhes (Opcional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Ex: Fatura referente ao plano Pro de 50 alunos ativos."
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
          {isPending ? "Criando cobrança..." : "Emitir Cobrança"}
        </button>
      </div>
    </form>
  );
}
