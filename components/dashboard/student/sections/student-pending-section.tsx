"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  DuotoneFormsIcon,
  DuotoneAnamnesisIcon,
  DuotonePhotosIcon,
  DuotoneConsultationsIcon,
  DuotoneActivityIcon,
} from "@/components/ui/icons/duotone-icons";

export interface StudentPendingItem {
  id: string;
  type: "CHECKIN" | "ANAMNESIS" | "FORM" | "PHOTO_EVALUATION" | "CONSULTATION_CONFIRM";
  title: string;
  subtitle?: string | null;
  requestedByName?: string | null;
  requestedAtFormatted?: string | null;
  dueAtFormatted?: string | null;
  ctaLabel: "Responder" | "Preencher" | "Confirmar";
  href: string;
}

export interface StudentPendingSectionProps {
  consultancySlug: string;
  items: StudentPendingItem[];
}

function getItemIcon(type: StudentPendingItem["type"]) {
  switch (type) {
    case "CHECKIN":
      return <DuotoneActivityIcon className="w-5 h-5 text-amber-500" />;
    case "ANAMNESIS":
      return <DuotoneAnamnesisIcon className="w-5 h-5 text-amber-500" />;
    case "PHOTO_EVALUATION":
      return <DuotonePhotosIcon className="w-5 h-5 text-indigo-400" />;
    case "CONSULTATION_CONFIRM":
      return <DuotoneConsultationsIcon className="w-5 h-5 text-emerald-400" />;
    case "FORM":
    default:
      return <DuotoneFormsIcon className="w-5 h-5 text-emerald-400" />;
  }
}

export function StudentPendingSection({
  items,
}: StudentPendingSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalItems = items.length;
  const visibleItems = isExpanded ? items : items.slice(0, 3);

  return (
    <section id="para-responder" className="w-full space-y-3">
      {/* Cabeçalho da Seção */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight">
            Para responder
          </h2>
          {totalItems > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              {totalItems} {totalItems === 1 ? "pendência" : "pendências"}
            </span>
          )}
        </div>
      </div>

      {/* Lista de Pendências Compactas */}
      {totalItems > 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] shadow-sm overflow-hidden divide-y divide-zinc-100 dark:divide-[#303238] transition-colors">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-[#1B1D21] transition-colors"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-[#20232B] border border-zinc-200 dark:border-zinc-800 shrink-0 mt-0.5 sm:mt-0">
                  {getItemIcon(item.type)}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                      {item.title}
                    </span>
                    {item.dueAtFormatted && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                        Prazo: {item.dueAtFormatted}
                      </span>
                    )}
                  </div>

                  {item.subtitle && (
                    <p className="text-xs text-zinc-600 dark:text-[#8E95A2] line-clamp-2">
                      {item.subtitle}
                    </p>
                  )}

                  {(item.requestedByName || item.requestedAtFormatted) && (
                    <p className="text-[11px] text-zinc-500 dark:text-[#6B7280]">
                      {item.requestedByName && (
                        <span>
                          Solicitado por{" "}
                          <strong className="text-zinc-700 dark:text-zinc-300 font-semibold">
                            {item.requestedByName}
                          </strong>
                        </span>
                      )}
                      {item.requestedByName && item.requestedAtFormatted && <span> em </span>}
                      {item.requestedAtFormatted && <span>{item.requestedAtFormatted}</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Ação Específica (Responder / Preencher / Confirmar) */}
              <div className="shrink-0 pt-2 sm:pt-0 self-end sm:self-center w-full sm:w-auto">
                <Link
                  href={item.href}
                  className="w-full sm:w-auto px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer select-none"
                >
                  <span>{item.ctaLabel}</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}

          {/* Expansor se houver mais de 3 itens */}
          {totalItems > 3 && (
            <div className="p-3 text-center bg-zinc-50 dark:bg-[#1B1D21]">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline min-h-[44px] px-4 cursor-pointer inline-flex items-center justify-center"
              >
                {isExpanded
                  ? "Recolher lista"
                  : `Ver todas as ${totalItems} pendências →`}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] shadow-sm p-5 text-center space-y-1.5 transition-colors">
          <p className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Nenhuma pendência no momento.
          </p>
          <p className="text-xs text-zinc-500 dark:text-[#8E95A2]">
            Você está em dia com todas as solicitações do seu acompanhamento.
          </p>
        </div>
      )}
    </section>
  );
}
