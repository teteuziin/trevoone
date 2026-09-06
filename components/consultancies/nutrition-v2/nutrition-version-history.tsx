"use client";

import Link from "next/link";
import type { PlanVersionHistoryItemDto } from "@/lib/nutrition-v2/plan-repository";

interface NutritionVersionHistoryProps {
  slug: string;
  planPublicId: string;
  currentVersionPublicId: string;
  versions: PlanVersionHistoryItemDto[];
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
}

export function NutritionVersionHistory({
  slug,
  planPublicId,
  currentVersionPublicId,
  versions,
  isOpen,
  isLoading = false,
  onClose,
}: NutritionVersionHistoryProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text-primary)] leading-tight">
                Histórico de Versões
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Registro cronológico e imutabilidade
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-secondary)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Versions List */}
        <div className="p-4 space-y-2.5 overflow-y-auto divide-y divide-[var(--border)]">
          {isLoading && (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Carregando versões...</span>
            </div>
          )}
          {!isLoading && versions.map((ver) => {
            const isViewing = ver.publicId === currentVersionPublicId;
            let statusBadge = null;

            if (ver.status === "DRAFT") {
              statusBadge = (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  Rascunho
                </span>
              );
            } else if (ver.status === "PUBLISHED") {
              statusBadge = (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  Publicada
                </span>
              );
            } else {
              statusBadge = (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
                  Arquivada
                </span>
              );
            }

            return (
              <div key={ver.publicId} className="pt-2.5 first:pt-0">
                <Link
                  href={`/consultoria/${slug}/planos-v2/${planPublicId}?v=${ver.publicId}`}
                  onClick={onClose}
                  className={`block p-3 rounded-xl border transition-all ${
                    isViewing
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 ring-1 ring-[var(--brand-primary)]/30"
                      : "border-[var(--border)] bg-[var(--surface-secondary)]/40 hover:bg-[var(--surface-secondary)] hover:border-[var(--brand-primary)]/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[var(--text-primary)]">
                        Versão {ver.versionNumber}
                      </span>
                      {statusBadge}
                      {isViewing && (
                        <span className="text-[10px] font-medium text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 px-1.5 py-0.5 rounded">
                          Visualizando
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-primary)] font-medium mt-1 truncate">
                    {ver.title}
                  </p>
                  {ver.subtitle && (
                    <p className="text-[11px] text-[var(--text-muted)] truncate">{ver.subtitle}</p>
                  )}

                  <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] mt-2">
                    <span>
                      Criado em: {new Date(ver.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                    {ver.publishedAt && (
                      <span>
                        Publicado em: {new Date(ver.publishedAt).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-secondary)]/30 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
