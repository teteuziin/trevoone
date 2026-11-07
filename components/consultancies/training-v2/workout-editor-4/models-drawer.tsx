"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  listPublishedTemplatesAction,
  getTemplatePreviewAction,
} from "@/app/consultoria/[slug]/rotinas/actions";
import type {
  TemplatePickerItemDto,
  TemplatePreviewDto,
} from "@/lib/training-v2/workout-repository";

interface ModelsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  currentWorkoutPublicId: string;
  hasExistingItems: boolean;
  onApplyWholeTemplate: (templatePublicId: string, replace: boolean) => Promise<void>;
  onApplySplitFromTemplate: (templatePublicId: string, blockPublicId: string) => Promise<void>;
  onSaveCurrentAsTemplate: () => Promise<void>;
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function BookmarkIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
    </svg>
  );
}

export function ModelsDrawer({
  isOpen,
  onClose,
  consultancySlug,
  hasExistingItems,
  onApplyWholeTemplate,
  onApplySplitFromTemplate,
  onSaveCurrentAsTemplate,
}: ModelsDrawerProps) {
  const [templates, setTemplates] = useState<TemplatePickerItemDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplatePreviewDto | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Load published templates
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    async function fetchTemplates() {
      setIsLoadingList(true);
      try {
        const res = await listPublishedTemplatesAction(consultancySlug);
        if (!isCancelled && res.ok && res.data) {
          setTemplates(res.data);
        }
      } catch (err) {
        console.error("Erro ao carregar modelos:", err);
      } finally {
        if (!isCancelled) setIsLoadingList(false);
      }
    }

    fetchTemplates();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, consultancySlug]);

  const handleSelectTemplate = async (templatePublicId: string) => {
    setIsLoadingPreview(true);
    try {
      const res = await getTemplatePreviewAction(consultancySlug, templatePublicId);
      if (res.ok && res.data) {
        setSelectedTemplate(res.data);
      }
    } catch (err) {
      console.error("Erro ao buscar prévia do modelo:", err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const filteredTemplates = templates.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#E8F0EA] text-[#176B49] flex items-center justify-center text-sm">
              📚
            </span>
            <div>
              <h2 className="text-base font-extrabold text-[#102E23]">
                Biblioteca de Modelos de Treino
              </h2>
              <p className="text-xs text-[#526058]">
                Aproveite fichas prontas inteiras ou divisões específicas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F0] hover:bg-[#EAEFEA] text-[#526058] flex items-center justify-center transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body: Two Column (List on left, Preview on right) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[#E5E8E2]">
          {/* Left Column: Template List */}
          <div className="md:col-span-5 flex flex-col h-full overflow-hidden">
            <div className="p-3 border-b border-[#F0F2ED]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar modelo..."
                className="w-full px-3 py-2 text-xs bg-[#F5F5F0] border border-[#E5E8E2] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#176B49]"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-[#F5F7F4]">
              {isLoadingList ? (
                <div className="py-8 text-center text-xs text-[#6B7870] animate-pulse">
                  Carregando modelos...
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#6B7870]">
                  Nenhum modelo encontrado.
                </div>
              ) : (
                filteredTemplates.map((tmpl) => {
                  const isSelected = selectedTemplate?.publicId === tmpl.publicId;

                  return (
                    <div
                      key={tmpl.publicId}
                      onClick={() => handleSelectTemplate(tmpl.publicId)}
                      className={`p-3 rounded-2xl cursor-pointer transition-all ${
                        isSelected
                          ? "bg-[#102E23] text-white shadow-xs"
                          : "hover:bg-[#F0F5F2] text-[#102E23]"
                      }`}
                    >
                      <h4 className="text-xs sm:text-sm font-bold truncate">
                        {tmpl.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-[11px] opacity-80">
                        <span>{tmpl.blocksCount || 1} divisões</span>
                        {tmpl.difficultyLevel && (
                          <>
                            <span>•</span>
                            <span>{tmpl.difficultyLevel}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Ação Salvar Atual como Modelo */}
            <div className="p-3 border-t border-[#E5E8E2] bg-[#FAFBF9]">
              <button
                type="button"
                onClick={onSaveCurrentAsTemplate}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-white hover:bg-[#E8F0EA] border border-[#D5E2D7] text-[#102E23] transition-colors shadow-2xs cursor-pointer"
              >
                <BookmarkIcon className="w-3.5 h-3.5 text-[#176B49]" />
                <span>Salvar treino atual como modelo</span>
              </button>
            </div>
          </div>

          {/* Right Column: Template Preview & Apply Actions */}
          <div className="md:col-span-7 flex flex-col h-full overflow-hidden bg-[#FAFBF9]">
            {isLoadingPreview ? (
              <div className="py-20 text-center text-xs text-[#6B7870] animate-pulse">
                Carregando detalhes do modelo...
              </div>
            ) : !selectedTemplate ? (
              <div className="py-20 text-center text-xs text-[#6B7870] space-y-1">
                <p className="font-semibold text-[#102E23]">Selecione um modelo à esquerda</p>
                <p>Veja os exercícios, divisões e configurações antes de aplicar.</p>
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Preview Header */}
                <div className="p-4 border-b border-[#E5E8E2] space-y-1 bg-white">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#176B49]">
                    PRÉVIA DO MODELO
                  </span>
                  <h3 className="text-base font-extrabold text-[#102E23]">
                    {selectedTemplate.title}
                  </h3>
                  {selectedTemplate.objective && (
                    <p className="text-xs text-[#526058]">
                      Objetivo: {selectedTemplate.objective}
                    </p>
                  )}
                </div>

                {/* Divisões e Exercícios do Modelo */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {(selectedTemplate.blocks || []).map((cat, catIdx) => (
                    <div
                      key={catIdx}
                      className="p-3.5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-[#102E23] uppercase tracking-wide">
                          {cat.title} ({cat.itemsCount} exercícios)
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            startTransition(async () => {
                              await onApplySplitFromTemplate(
                                selectedTemplate.publicId,
                                cat.title
                              );
                              onClose();
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#176B49] bg-[#E8F0EA] hover:bg-[#176B49] hover:text-white transition-colors cursor-pointer"
                        >
                          Usar apenas esta divisão →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Footer */}
                <div className="p-4 border-t border-[#E5E8E2] bg-white flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="text-xs text-[#526058]">
                    {hasExistingItems ? (
                      <span className="text-amber-700 font-medium">
                        ⚠️ O treino atual já possui exercícios.
                      </span>
                    ) : (
                      <span>Pronto para aplicar a ficha completa.</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {hasExistingItems ? (
                      <>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            startTransition(async () => {
                              await onApplyWholeTemplate(selectedTemplate.publicId, false);
                              onClose();
                            });
                          }}
                          className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold bg-[#E8F0EA] text-[#176B49] hover:bg-[#C6E2D1] transition-colors cursor-pointer"
                        >
                          Adicionar ao atual
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            if (confirm("Substituir o conteúdo atual pelo modelo?")) {
                              startTransition(async () => {
                                await onApplyWholeTemplate(selectedTemplate.publicId, true);
                                onClose();
                              });
                            }
                          }}
                          className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold bg-[#DC2626] text-white hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          Substituir tudo
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          startTransition(async () => {
                            await onApplyWholeTemplate(selectedTemplate.publicId, false);
                            onClose();
                          });
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-[#176B49] text-white hover:bg-[#102E23] transition-colors shadow-xs cursor-pointer"
                      >
                        Usar modelo inteiro →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
