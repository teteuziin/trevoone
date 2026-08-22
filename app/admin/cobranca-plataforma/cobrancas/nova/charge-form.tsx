"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlatformChargeAction } from "../../actions";
import { FormField, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

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
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert variant="danger" title="Erro na emissão">
          <p className="text-xs">{error}</p>
        </Alert>
      )}

      <FormField label="Consultoria Destinatária" required id="consultancyPublicId">
        <Select
          id="consultancyPublicId"
          value={consultancyPublicId}
          onChange={(e) => setConsultancyPublicId(e.target.value)}
          disabled={isPending}
        >
          {consultancies.map((c) => (
            <option key={c.publicId} value={c.publicId}>
              {c.name} ({c.slug})
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Título da Cobrança" required id="chargeTitle">
          <Input
            id="chargeTitle"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Mensalidade Trevo One - Setembro/2026"
            disabled={isPending}
          />
        </FormField>

        <FormField label="Valor (R$)" required id="chargeAmountStr">
          <Input
            id="chargeAmountStr"
            type="text"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="149,90"
            disabled={isPending}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField label="Data de Vencimento" required id="chargeDueOn">
          <Input
            id="chargeDueOn"
            type="date"
            value={dueOn}
            onChange={(e) => setDueOn(e.target.value)}
            disabled={isPending}
          />
        </FormField>

        <FormField label="Início do Período" optional id="chargePeriodStart">
          <Input
            id="chargePeriodStart"
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            disabled={isPending}
          />
        </FormField>

        <FormField label="Fim do Período" optional id="chargePeriodEnd">
          <Input
            id="chargePeriodEnd"
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            disabled={isPending}
          />
        </FormField>
      </div>

      <FormField label="Descrição / Detalhes Adicionais" optional id="chargeDescription">
        <Textarea
          id="chargeDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Ex: Fatura referente à licença operacional e suporte técnico."
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
          {isPending ? "Criando cobrança..." : "Emitir Cobrança"}
        </Button>
      </div>
    </form>
  );
}
