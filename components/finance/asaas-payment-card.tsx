"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export interface AsaasPaymentCardProps {
  invoiceUrl: string | null;
  pixQrCodeImage?: string | null;
  pixCopiaECola?: string | null;
  amountFormatted: string;
  dueOnFormatted: string;
  isPaid?: boolean;
}

export function AsaasPaymentCard({
  invoiceUrl,
  pixQrCodeImage,
  pixCopiaECola,
  amountFormatted,
  dueOnFormatted,
  isPaid = false,
}: AsaasPaymentCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // Polling automático e discreto: revalida a página a cada 4s enquanto o pagamento estiver pendente
  // Assim que o webhook do Asaas confirmar, a UI transiciona automaticamente para "Pago" sem ação do aluno
  useEffect(() => {
    if (isPaid) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaid, router]);

  async function handleCopyPix() {
    if (!pixCopiaECola) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(pixCopiaECola);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback: clipboard permission denied
    }
  }

  if (isPaid) {
    return (
      <div className="bg-white dark:bg-[#151619] border border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Pagamento Confirmado via Asaas</h3>
            <p className="text-xs text-zinc-500 dark:text-[#8E95A2]">
              Compensação automática realizada com sucesso. Seus acessos aos treinos e consultas estão liberados.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-[#303238] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Cobrança Digital Integrada · Saiya Shape (Sandbox)
            </span>
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            Pague via Pix ou Checkout Asaas
          </h2>
          <p className="text-xs text-zinc-500 dark:text-[#8E95A2]">
            Valor: <strong className="text-zinc-900 dark:text-white font-semibold">{amountFormatted}</strong> · Vencimento: <strong className="text-zinc-900 dark:text-white font-semibold">{dueOnFormatted}</strong>
          </p>
        </div>

        <span className="self-start sm:self-auto px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
          Baixa Automática
        </span>
      </div>

      {/* Reassurance Notice */}
      <div className="flex items-start gap-3 p-3.5 bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl text-xs text-emerald-900 dark:text-emerald-300">
        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="leading-relaxed">
          <strong>Não é necessário enviar comprovante!</strong> Assim que o pagamento for realizado no seu banco ou aplicativo, o Asaas avisa nosso sistema e seu acesso é liberado instantaneamente.
        </p>
      </div>

      {/* QR Code Pix (se disponível) */}
      {pixQrCodeImage && (
        <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-[#1B1D21] rounded-2xl border border-zinc-200/80 dark:border-[#303238] space-y-3">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-zinc-200/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${pixQrCodeImage}`}
              alt="QR Code Pix Asaas"
              className="w-48 h-48 object-contain"
            />
          </div>
          <p className="text-xs text-zinc-600 dark:text-[#8E95A2] text-center max-w-xs">
            Abra o aplicativo do seu banco, escolha <strong>Pix</strong> e aponte a câmera para o QR Code acima.
          </p>
        </div>
      )}

      {/* Pix Copia e Cola (se disponível) */}
      {pixCopiaECola && (
        <div className="space-y-2 bg-zinc-50 dark:bg-[#1B1D21] p-4 rounded-xl border border-zinc-200/80 dark:border-[#303238]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-[#8E95A2]">
              Código Pix Copia e Cola
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="p-2.5 bg-white dark:bg-[#151619] rounded-lg border border-zinc-200 dark:border-[#303238] font-mono text-xs text-zinc-800 dark:text-[#E5E7EB] select-all break-all flex-1 max-h-24 overflow-y-auto">
              {pixCopiaECola}
            </div>
            <Button
              type="button"
              variant={copied ? "primary" : "outline"}
              size="sm"
              onClick={handleCopyPix}
              className={`min-h-[44px] shrink-0 ${
                copied
                  ? "!bg-emerald-700 hover:!bg-emerald-800 active:!bg-emerald-900 !text-white font-bold"
                  : ""
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  <span>Copiar código Pix</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Botão de Fatura Hospedada Asaas */}
      {invoiceUrl && (
        <div className="pt-2">
          <a
            href={invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[50px] px-6 py-3 rounded-xl font-bold text-sm bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:focus-visible:outline-emerald-400"
          >
            <span>Pagar com Asaas (Fatura / Pix / Cartão)</span>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
          <p className="text-[11px] text-zinc-500 dark:text-[#8E95A2] text-center mt-2">
            A fatura oficial abre em nova aba com ambiente seguro gerenciado pelo Asaas.
          </p>
        </div>
      )}
    </div>
  );
}
