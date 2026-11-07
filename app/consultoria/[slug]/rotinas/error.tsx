"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface RotinasErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RotinasError({ error, reset }: RotinasErrorProps) {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  useEffect(() => {
    console.error("[Rotinas Error Boundary]", {
      digest: error.digest,
      message: error.message,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4 sm:px-6 font-sans">
      <div className="p-8 sm:p-12 text-center rounded-3xl border border-[#E5E8E2] bg-white shadow-xs space-y-4">
        {/* Warning Icon */}
        <div className="w-14 h-14 rounded-2xl bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] flex items-center justify-center mx-auto shadow-2xs">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <div className="space-y-1.5 max-w-md mx-auto">
          <h2 className="text-lg sm:text-xl font-extrabold text-[#102E23] tracking-tight">
            Não foi possível carregar as rotinas de treino
          </h2>
          <p className="text-xs sm:text-sm text-[#526058] leading-relaxed">
            Ocorreu uma instabilidade ao processar a listagem. Seus dados e treinos permanecem intactos e seguros.
          </p>
          {error.digest && (
            <p className="text-[11px] font-mono text-[#8C9890] pt-1">
              Ref: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#176B49] hover:bg-[#12583B] text-white shadow-2xs transition-all cursor-pointer min-h-[42px]"
          >
            Tentar novamente
          </button>
          {slug && (
            <Link
              href={`/consultoria/${slug}`}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#F5F5F0] hover:bg-[#EAECE6] text-[#102E23] border border-[#E5E8E2] transition-colors cursor-pointer min-h-[42px] flex items-center justify-center"
            >
              Voltar ao Início
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
