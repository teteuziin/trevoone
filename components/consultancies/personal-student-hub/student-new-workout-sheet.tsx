"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  listPublishedTemplatesAction,
  createWorkoutFromTemplateAction,
} from "@/app/consultoria/[slug]/rotinas/actions";
import type { TemplatePickerItemDto } from "@/lib/training-v2/workout-repository";

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
    </svg>
  );
}

function LayersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="2 12 12 17 22 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export type StudentNewWorkoutSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  studentMembershipPublicId: string;
  studentName: string;
};

export function StudentNewWorkoutSheet({
  isOpen,
  onClose,
  consultancySlug,
  studentMembershipPublicId,
  studentName,
}: StudentNewWorkoutSheetProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"CHOICE" | "TEMPLATES">("CHOICE");
  const [templates, setTemplates] = useState<TemplatePickerItemDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isApplyingProgramId, setIsApplyingProgramId] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const handleClose = () => {
    setViewMode("CHOICE");
    setIsApplyingProgramId(null);
    setApplyError(null);
    setSearchQuery("");
    onClose();
  };

  const handleSelectProgram = async (templatePublicId: string) => {
    if (isApplyingProgramId) return;
    setIsApplyingProgramId(templatePublicId);
    setApplyError(null);
    try {
      const res = await createWorkoutFromTemplateAction(consultancySlug, templatePublicId, {
        targetStudentMembershipPublicId: studentMembershipPublicId,
      });
      if (res.ok && res.data) {
        handleClose();
        router.push(
          `/consultoria/${consultancySlug}/rotinas/${res.data.workoutPublicId}?student=${studentMembershipPublicId}`
        );
      } else {
        setApplyError(res.error || "Erro ao montar programa no Builder.");
        setIsApplyingProgramId(null);
      }
    } catch {
      setApplyError("Erro de conexão ao montar o programa de treino.");
      setIsApplyingProgramId(null);
    }
  };

  // Load templates when switching to TEMPLATES view
  useEffect(() => {
    if (!isOpen || viewMode !== "TEMPLATES") return;

    let isMounted = true;
    const timer = setTimeout(() => {
      setIsLoadingTemplates(true);
      listPublishedTemplatesAction(consultancySlug, searchQuery)
        .then((res) => {
          if (isMounted) {
            setIsLoadingTemplates(false);
            if (res.ok && res.data) {
              setTemplates(res.data);
            }
          }
        })
        .catch(() => {
          if (isMounted) setIsLoadingTemplates(false);
        });
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, viewMode, consultancySlug, searchQuery]);

  if (!isOpen) return null;

  const handleCreateFromScratch = () => {
    handleClose();
    router.push(
      `/consultoria/${consultancySlug}/rotinas/novo?student=${studentMembershipPublicId}`
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {viewMode === "TEMPLATES" ? (
                <button
                  type="button"
                  onClick={() => setViewMode("CHOICE")}
                  aria-label="Voltar para opções"
                  className="p-2 -ml-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
              ) : null}

              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-[var(--text-primary)] truncate">
                  {viewMode === "TEMPLATES" ? "Programas de Treino" : "Novo Treino"}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  Aluno: {studentName}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-3.5 overflow-y-auto flex-1">
            {applyError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold flex items-center justify-between gap-2">
                <span>{applyError}</span>
                <button
                  type="button"
                  onClick={() => setApplyError(null)}
                  className="text-xs underline cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            )}

            {viewMode === "CHOICE" ? (
              <div className="space-y-3">
                <p className="text-xs text-[var(--text-secondary)]">
                  Como você deseja criar o treino para este aluno?
                </p>

                {/* Option 1: From Scratch */}
                <button
                  type="button"
                  onClick={handleCreateFromScratch}
                  className="w-full p-4 rounded-2xl border border-[var(--border-default)] hover:border-[var(--brand)] bg-[var(--surface-subtle)] hover:bg-[var(--surface)] transition-all text-left flex items-start gap-3.5 group cursor-pointer min-h-[56px]"
                >
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <PlusIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                      Criar do zero
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      Monte uma ficha em branco adicionando categorias, grupos e exercícios passo a passo.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[var(--text-tertiary)] group-hover:text-[var(--brand)] shrink-0 self-center">
                    →
                  </span>
                </button>

                {/* Option 2: Reusable Template / Program */}
                <button
                  type="button"
                  onClick={() => setViewMode("TEMPLATES")}
                  className="w-full p-4 rounded-2xl border border-purple-500/20 hover:border-purple-500/50 bg-purple-500/5 hover:bg-purple-500/10 transition-all text-left flex items-start gap-3.5 group cursor-pointer min-h-[56px]"
                >
                  <div className="w-11 h-11 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <SparklesIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-purple-600 transition-colors">
                        Escolher programa
                      </h4>
                      <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-extrabold uppercase">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      Escolha um Programa de Treino pronto da consultoria. O Builder abrirá automaticamente com todas as divisões e exercícios já montados para este aluno, prontos para você revisar e personalizar.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-purple-500 shrink-0 self-center">
                    →
                  </span>
                </button>
              </div>
            ) : (
              /* ViewMode === "TEMPLATES" */
              <div className="space-y-3.5">
                <div className="relative">
                  <SearchIcon className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar programa pelo nome..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] text-[var(--text-primary)] min-h-[44px]"
                  />
                </div>

                {isLoadingTemplates ? (
                  <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                    Carregando programas de treino da consultoria...
                  </div>
                ) : templates.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-[var(--surface-subtle)] text-[var(--text-tertiary)] flex items-center justify-center mx-auto">
                      <LayersIcon className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      Nenhum programa de treino publicado encontrado.
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] max-w-xs mx-auto">
                      Crie treinos e utilize a opção &quot;Salvar como Programa&quot; para utilizá-los aqui.
                    </p>
                    <button
                      type="button"
                      onClick={handleCreateFromScratch}
                      className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--brand)] text-white shadow-xs cursor-pointer min-h-[40px]"
                    >
                      Criar treino do zero
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
                    {templates.map((tpl) => (
                      <div
                        key={tpl.publicId}
                        className="p-3.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:border-[var(--brand)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">
                            {tpl.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                            <span>
                              {tpl.blocksCount} {tpl.blocksCount === 1 ? "divisão" : "divisões"}
                            </span>
                            {tpl.estimatedDurationMinutes != null && (
                              <>
                                <span>•</span>
                                <span>~{tpl.estimatedDurationMinutes} min</span>
                              </>
                            )}
                            {tpl.objective && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[150px]">{tpl.objective}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={Boolean(isApplyingProgramId)}
                          onClick={() => handleSelectProgram(tpl.publicId)}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-[#176B49] hover:bg-[#12583B] text-white shadow-xs min-h-[44px] flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          {isApplyingProgramId === tpl.publicId ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                              <span>Montando no Builder...</span>
                            </>
                          ) : (
                            <>
                              <SparklesIcon className="w-3.5 h-3.5" />
                              <span>Usar programa</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
