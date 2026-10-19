"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  listTemplatesAction,
  createPlanFromTemplateAction,
} from "@/app/consultoria/[slug]/planos-v2/actions";
import type { NutritionV2PlanTemplateListItemDto } from "@/lib/nutrition-v2/types";

interface NutritionTemplatePickerModalProps {
  consultancySlug: string;
  isOpen: boolean;
  onClose: () => void;
}

function CloseIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function Squares2x2Icon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

export function NutritionTemplatePickerModal({
  consultancySlug,
  isOpen,
  onClose,
}: NutritionTemplatePickerModalProps) {
  const router = useRouter();

  const [templates, setTemplates] = useState<NutritionV2PlanTemplateListItemDto[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load templates on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const res = await listTemplatesAction(consultancySlug, false);
        if (isMounted) {
          if (res.success && res.data) {
            setTemplates(res.data);
          } else {
            setErrorMessage(res.error || "Não foi possível carregar os modelos.");
          }
        }
      } catch {
        if (isMounted) setErrorMessage("Erro ao conectar com o servidor.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, consultancySlug]);

  // Keyboard escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !creatingTemplateId) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, creatingTemplateId]);

  if (!isOpen) return null;

  const filteredTemplates = templates.filter((t) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const nameMatch = (t.name || "").toLowerCase().includes(q);
    const descMatch = (t.description || "").toLowerCase().includes(q);
    return nameMatch || descMatch;
  });

  const handleSelectTemplate = async (template: NutritionV2PlanTemplateListItemDto) => {
    setCreatingTemplateId(template.publicId);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("templatePublicId", template.publicId);
      formData.append("title", template.name);

      const res = await createPlanFromTemplateAction(consultancySlug, formData);
      if (res.success && res.data) {
        onClose();
        router.push(`/consultoria/${consultancySlug}/planos-v2/${res.data.planPublicId}`);
      } else {
        setErrorMessage(res.error || "Falha ao criar plano a partir do modelo.");
        setCreatingTemplateId(null);
      }
    } catch {
      setErrorMessage("Erro inesperado ao aplicar modelo.");
      setCreatingTemplateId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-picker-title"
    >
      <div className="relative w-full sm:max-w-2xl bg-white dark:bg-[#151619] rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-[#E5E7EB] dark:border-[#303238] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-4 duration-200">
        {/* Mobile Drag Indicator */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden bg-slate-50/70 dark:bg-[#1B1D21]/70">
          <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-[#303238]" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-[#303238] flex items-center justify-between bg-slate-50/70 dark:bg-[#1B1D21]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/25">
              <Squares2x2Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 id="template-picker-title" className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white leading-tight">
                Usar modelo disponível
              </h2>
              <p className="text-xs text-[#6B7280] dark:text-[#8E95A2]">
                Comece com um modelo e personalize o rascunho sem alterar o original
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(creatingTemplateId)}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-[#6B7280] dark:text-[#8E95A2] hover:text-[#17191D] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Search bar */}
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-[#9CA3AF] dark:text-[#8E95A2] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar modelo por nome..."
              className="w-full h-[44px] pl-10 pr-4 text-xs sm:text-sm font-medium bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl text-[#17191D] dark:text-white placeholder:text-[#9CA3AF] dark:placeholder:text-[#8E95A2] focus:bg-white dark:focus:bg-[#151619] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Templates List */}
          {isLoading ? (
            <div className="py-12 text-center text-xs text-[#6B7280] dark:text-[#8E95A2] space-y-2">
              <svg className="animate-spin w-5 h-5 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Carregando modelos disponíveis...</span>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-[#E5E7EB] dark:border-[#303238] text-center space-y-3">
              <p className="text-sm font-semibold text-[#17191D] dark:text-white">
                {searchTerm.trim() ? "Nenhum modelo encontrado com esse nome." : "Nenhum modelo cadastrado ainda."}
              </p>
              <p className="text-xs text-[#6B7280] dark:text-[#8E95A2]">
                Você pode criar seu plano manualmente ou do zero com a IA.
              </p>
              <Link
                href={`/consultoria/${consultancySlug}/planos-v2/novo`}
                onClick={onClose}
                className="inline-flex mt-1 px-4 min-h-[44px] items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Criar plano manualmente
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTemplates.map((template) => {
                const isSelected = creatingTemplateId === template.publicId;

                return (
                  <div
                    key={template.publicId}
                    className="p-3.5 sm:p-4 rounded-xl border border-[#E5E7EB] dark:border-[#303238] bg-white dark:bg-[#1B1D21] hover:border-blue-500/40 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#17191D] dark:text-white truncate">
                          {template.name}
                        </h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 shrink-0">
                          {template.mealCount ? `${template.mealCount} refeições` : "Cardápio"}
                        </span>
                      </div>
                      {template.description && (
                        <p className="text-xs text-[#6B7280] dark:text-[#8E95A2] line-clamp-2">
                          {template.description}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F3F4F6] dark:border-[#282B32]">
                      <button
                        type="button"
                        onClick={() => handleSelectTemplate(template)}
                        disabled={Boolean(creatingTemplateId)}
                        className="w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-lg font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isSelected ? (
                          <>
                            <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            <span>Criando plano...</span>
                          </>
                        ) : (
                          <span>Usar este modelo</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] border-t border-[#E5E7EB] dark:border-[#303238] flex items-center justify-end bg-slate-50/70 dark:bg-[#1B1D21]/70">
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(creatingTemplateId)}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2 text-xs font-semibold text-[#4B5563] dark:text-[#C2C8CF] hover:text-[#17191D] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-center cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
