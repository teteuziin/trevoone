"use client";

import React, { useState, useEffect } from "react";
import {
  listTemplatesAction,
  renameTemplateAction,
  archiveTemplateAction,
} from "@/app/consultoria/[slug]/planos-v2/actions";
import { Button } from "@/components/ui/button";
import type { NutritionV2PlanTemplateListItemDto } from "@/lib/nutrition-v2/types";
import { NutritionUseTemplateDialog } from "./nutrition-use-template-dialog";

interface NutritionTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
}

export function NutritionTemplatesModal({
  isOpen,
  onClose,
  consultancySlug,
}: NutritionTemplatesModalProps) {
  const [templates, setTemplates] = useState<NutritionV2PlanTemplateListItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use Template dialog state
  const [templateToUse, setTemplateToUse] = useState<NutritionV2PlanTemplateListItemDto | null>(null);
  const [isUseDialogOpen, setIsUseDialogOpen] = useState(false);

  // Rename inline state
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameDescription, setRenameDescription] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Archive state
  const [archivingId, setArchivingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      setEditingTemplateId(null);
      try {
        const res = await listTemplatesAction(consultancySlug, false);
        if (active) {
          if (res.success && res.data) {
            setTemplates(res.data);
          } else {
            setError(res.error || "Erro ao carregar modelos.");
          }
        }
      } catch {
        if (active) {
          setError("Falha de conexão ao buscar modelos.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, consultancySlug]);

  if (!isOpen) return null;

  function handleOpenUse(tmpl: NutritionV2PlanTemplateListItemDto) {
    setTemplateToUse(tmpl);
    setIsUseDialogOpen(true);
  }

  function handleStartRename(tmpl: NutritionV2PlanTemplateListItemDto) {
    setEditingTemplateId(tmpl.publicId);
    setRenameName(tmpl.name);
    setRenameDescription(tmpl.description || "");
  }

  async function handleSaveRename(publicId: string) {
    if (!renameName.trim()) return;
    setIsRenaming(true);
    try {
      const formData = new FormData();
      formData.set("templatePublicId", publicId);
      formData.set("name", renameName.trim());
      if (renameDescription.trim()) {
        formData.set("description", renameDescription.trim());
      }

      const res = await renameTemplateAction(consultancySlug, formData);
      if (res.success) {
        setTemplates((prev) =>
          prev.map((t) =>
            t.publicId === publicId
              ? { ...t, name: renameName.trim(), description: renameDescription.trim() || null }
              : t
          )
        );
        setEditingTemplateId(null);
      } else {
        alert(res.error || "Erro ao renomear modelo.");
      }
    } catch {
      alert("Falha ao salvar alteração.");
    } finally {
      setIsRenaming(false);
    }
  }

  async function handleArchive(publicId: string) {
    const confirmArchive = window.confirm("Deseja realmente arquivar este modelo?");
    if (!confirmArchive) return;

    setArchivingId(publicId);
    try {
      const res = await archiveTemplateAction(consultancySlug, publicId);
      if (res.success) {
        setTemplates((prev) => prev.filter((t) => t.publicId !== publicId));
      } else {
        alert(res.error || "Erro ao arquivar modelo.");
      }
    } catch {
      alert("Falha de conexão ao arquivar modelo.");
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-3xl bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-[var(--border-default)] flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
                  Modelos de Prescrição
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  {templates.length} {templates.length === 1 ? "modelo" : "modelos"}
                </span>
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                Modelos Reutilizáveis
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                Selecione um modelo para criar um novo plano alimentar rascunho independente.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
              aria-label="Fechar"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {error && (
              <div className="p-3.5 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-medium">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="py-16 text-center space-y-2">
                <div className="inline-block w-6 h-6 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-[var(--text-secondary)] font-medium">Carregando modelos...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="py-16 text-center space-y-3 px-4">
                <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    Nenhum modelo cadastrado
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Você pode salvar a estrutura nutricional de qualquer plano alimentar existente como modelo usando a opção &quot;Salvar como modelo&quot; dentro do editor.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.publicId}
                    className="p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:border-[var(--brand-soft-border)] transition-all flex flex-col justify-between gap-3 depth-surface"
                  >
                    {editingTemplateId === tmpl.publicId ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                            Nome do modelo
                          </label>
                          <input
                            type="text"
                            value={renameName}
                            onChange={(e) => setRenameName(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                            Descrição
                          </label>
                          <textarea
                            rows={2}
                            value={renameDescription}
                            onChange={(e) => setRenameDescription(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] resize-none"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isRenaming}
                            onClick={() => setEditingTemplateId(null)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={isRenaming || !renameName.trim()}
                            onClick={() => handleSaveRename(tmpl.publicId)}
                            className="font-bold shadow-sm"
                          >
                            {isRenaming ? "Salvando..." : "Salvar"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <h4 className="font-bold text-base text-[var(--text-primary)] leading-snug">
                              {tmpl.name}
                            </h4>
                            {tmpl.description && (
                              <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                                {tmpl.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 pt-1 text-[11px] text-[var(--text-tertiary)] font-medium flex-wrap">
                              <span className="flex items-center gap-1 text-[var(--text-secondary)] font-semibold">
                                <svg className="w-3.5 h-3.5 text-[var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <circle cx="12" cy="12" r="10" />
                                  <polyline points="12 6 12 12 16 14" />
                                </svg>
                                {tmpl.mealCount} {tmpl.mealCount === 1 ? "refeição" : "refeições"}
                              </span>
                              <span>•</span>
                              <span>{tmpl.itemCount} alimentos/itens</span>
                              <span>•</span>
                              <span>Criado em {new Date(tmpl.createdAt).toLocaleDateString("pt-BR")}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions Row */}
                        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartRename(tmpl)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
                            >
                              Renomear
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArchive(tmpl.publicId)}
                              disabled={archivingId === tmpl.publicId}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                            >
                              {archivingId === tmpl.publicId ? "Arquivando..." : "Arquivar"}
                            </button>
                          </div>

                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenUse(tmpl)}
                            className="font-bold shadow-xs min-h-[36px]"
                          >
                            <svg className="w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                              <path d="M12 5v14m-7-7h14" />
                            </svg>
                            <span>Usar modelo</span>
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-[var(--border-default)] bg-[var(--surface-subtle)] flex items-center justify-end">
            <Button variant="secondary" size="md" onClick={onClose} className="min-h-[40px] px-5">
              Fechar
            </Button>
          </div>
        </div>
      </div>

      {/* Use Template Modal */}
      {isUseDialogOpen && templateToUse && (
        <NutritionUseTemplateDialog
          key={templateToUse.publicId}
          isOpen={isUseDialogOpen}
        onClose={() => {
          setIsUseDialogOpen(false);
          setTemplateToUse(null);
        }}
        consultancySlug={consultancySlug}
        template={templateToUse}
        />
      )}
    </>
  );
}
