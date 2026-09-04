"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TemplatePickerItemDto } from "@/lib/training-v2/workout-repository";
import {
  listPublishedTemplatesAction,
  createWorkoutFromTemplateAction,
} from "@/app/consultoria/[slug]/rotinas/actions";

function Search({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
    </svg>
  );
}

function Layers({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="2 12 12 17 22 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Clock({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function X({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function Loader2({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
    </svg>
  );
}

function Sparkles({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z" />
    </svg>
  );
}

type WorkoutTemplatePickerProps = {
  consultancySlug: string;
  isOpen: boolean;
  onClose: () => void;
};

export function WorkoutTemplatePicker({
  consultancySlug,
  isOpen,
  onClose,
}: WorkoutTemplatePickerProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplatePickerItemDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCloning, startCloning] = useTransition();

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const timerId = setTimeout(() => {
      setIsLoading(true);
      setErrorMessage(null);

      listPublishedTemplatesAction(consultancySlug, searchQuery)
        .then((res) => {
          if (isMounted) {
            if (res.ok && res.data) {
              setTemplates(res.data);
            } else {
              setErrorMessage(res.error || "Erro ao carregar modelos.");
            }
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setErrorMessage("Erro de conexão ao carregar modelos.");
            setIsLoading(false);
          }
        });
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [isOpen, consultancySlug, searchQuery]);

  if (!isOpen) return null;

  const handleSelectTemplate = (templatePublicId: string) => {
    setSelectedTemplateId(templatePublicId);
    setErrorMessage(null);

    startCloning(async () => {
      const res = await createWorkoutFromTemplateAction(consultancySlug, templatePublicId);
      if (!res.ok || !res.data) {
        setErrorMessage(res.error || "Erro ao criar treino a partir do modelo.");
        setSelectedTemplateId(null);
      } else {
        onClose();
        router.push(`/consultoria/${consultancySlug}/rotinas/${res.data.workoutPublicId}`);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                Criar a partir de um Modelo
              </h3>
              <p className="text-xs text-[var(--foreground-muted)]">
                Escolha um modelo publicado para clonar uma nova rotina
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isCloning}
            className="p-2 rounded-xl text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--foreground-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar modelo publicado por título..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-purple-500 text-[var(--foreground)]"
            />
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Templates List */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-[var(--foreground-muted)] gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              <span className="text-xs">Carregando modelos disponíveis...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="py-12 text-center text-[var(--foreground-muted)] space-y-1">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Nenhum modelo publicado encontrado.
              </p>
              <p className="text-xs max-w-sm mx-auto">
                Apenas modelos com versões publicadas podem ser utilizados para gerar treinos. Crie ou publique um modelo na aba &ldquo;Modelos&rdquo;.
              </p>
            </div>
          ) : (
            templates.map((tpl) => {
              const isSelected = selectedTemplateId === tpl.publicId;

              return (
                <div
                  key={tpl.publicId}
                  className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-purple-500/40 hover:bg-purple-500/5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-[var(--foreground)]">
                        {tpl.title}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        V{tpl.publishedVersionNumber} Publicado
                      </span>
                    </div>

                    {tpl.subtitle && (
                      <p className="text-xs text-[var(--foreground-muted)]">
                        {tpl.subtitle}
                      </p>
                    )}

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-[var(--foreground-muted)]">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {tpl.blocksCount} {tpl.blocksCount === 1 ? "bloco" : "blocos"}
                      </span>
                      {tpl.estimatedDurationMinutes != null && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~{tpl.estimatedDurationMinutes} min
                        </span>
                      )}
                      <span>
                        {tpl.difficultyLevel === "BEGINNER"
                          ? "Iniciante"
                          : tpl.difficultyLevel === "ADVANCED"
                          ? "Avançado"
                          : "Intermediário"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectTemplate(tpl.publicId)}
                    disabled={isCloning}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors shrink-0 disabled:opacity-50 min-h-[36px]"
                  >
                    {isSelected && isCloning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Clonando...
                      </>
                    ) : (
                      "Usar este Modelo"
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isCloning}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export function WorkoutTemplatePickerTrigger({
  consultancySlug,
  className,
}: {
  consultancySlug: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ||
          "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-[var(--foreground)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-sunken)] border border-[var(--border-default)] transition-colors shrink-0"
        }
      >
        <Sparkles className="w-4 h-4 text-purple-500" />
        Usar modelo
      </button>
      {isOpen && (
        <WorkoutTemplatePicker
          consultancySlug={consultancySlug}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
