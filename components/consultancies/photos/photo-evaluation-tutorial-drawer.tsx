"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface PhotoEvaluationTutorialDrawerProps {
  trigger?: React.ReactNode;
}

export function PhotoEvaluationTutorialDrawer({ trigger }: PhotoEvaluationTutorialDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="gap-2 text-xs sm:text-sm font-medium"
        >
          <svg className="w-4 h-4 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Guia de fotos
        </Button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-modal-title"
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center text-[var(--brand-foreground)] font-bold">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 id="tutorial-modal-title" className="text-base font-semibold text-[var(--text-primary)]">
                    Guia de Padronização de Fotos
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    5 pilares para fotos consistentes e comparáveis ao longo da sua evolução
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                aria-label="Fechar guia"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* 4 Poses Overview Cards */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  As 4 Poses Obrigatórias
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Front */}
                  <div className="p-3.5 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-xl text-center space-y-2">
                    <div className="w-12 h-16 mx-auto rounded-lg bg-[var(--surface)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-tertiary)]">
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="5" r="2.5" />
                        <path d="M12 7.5v8M9 9.5l3 2 3-2M9 21l3-5.5 3 5.5" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[var(--text-primary)] block">1. Frente</span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block">Olhar reto, braços soltos</span>
                    </div>
                  </div>

                  {/* Right Side */}
                  <div className="p-3.5 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-xl text-center space-y-2">
                    <div className="w-12 h-16 mx-auto rounded-lg bg-[var(--surface)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-tertiary)]">
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="5" r="2.5" />
                        <path d="M12 7.5v8M12 11l2 2M12 21l1-5.5" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[var(--text-primary)] block">2. Lado Direito</span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block">Perfil direito ereto</span>
                    </div>
                  </div>

                  {/* Back */}
                  <div className="p-3.5 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-xl text-center space-y-2">
                    <div className="w-12 h-16 mx-auto rounded-lg bg-[var(--surface)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-tertiary)]">
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="5" r="2.5" />
                        <path d="M12 7.5v8M8.5 10l3.5 1.5 3.5-1.5M9.5 21l2.5-5.5 2.5 5.5" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[var(--text-primary)] block">3. Costas</span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block">Costas voltadas à câmera</span>
                    </div>
                  </div>

                  {/* Left Side */}
                  <div className="p-3.5 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-xl text-center space-y-2">
                    <div className="w-12 h-16 mx-auto rounded-lg bg-[var(--surface)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-tertiary)]">
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="5" r="2.5" />
                        <path d="M12 7.5v8M12 11l-2 2M12 21l-1-5.5" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[var(--text-primary)] block">4. Lado Esquerdo</span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block">Perfil esquerdo ereto</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* The 5 Pillars */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Os 5 Pilares da Foto de Avaliação
                </h4>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-[var(--brand-soft)] text-[var(--brand-foreground)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-[var(--text-primary)]">Vestimenta Adequada</h5>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        Use roupas justas (como top esportivo e bermuda de treino) ou trajes de banho para que o profissional possa avaliar com precisão a sua postura, contorno e simetria muscular.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-[var(--brand-soft)] text-[var(--brand-foreground)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-[var(--text-primary)]">Iluminação e Fundo Neutro</h5>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        Fique contra uma parede clara e lisa, sem objetos ou espelhos atrás de você. Garanta boa iluminação frontal e uniforme, evitando contraluz ou sombras duras.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-[var(--brand-soft)] text-[var(--brand-foreground)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-[var(--text-primary)]">Posição da Câmera</h5>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        Apoie o celular na altura do peito ou umbigo (aproximadamente 1 metro do chão), mantendo a câmera reta, sem inclinar para cima ou para baixo. Peça ajuda a alguém ou use o timer do celular.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-[var(--brand-soft)] text-[var(--brand-foreground)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      4
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-[var(--text-primary)]">Postura Natural</h5>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        Mantenha uma postura ereta, porém relaxada. Não contraia excessivamente nem encolha a barriga. Os braços devem repousar suavemente ao lado do corpo para manter o padrão.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-[var(--brand-soft)] text-[var(--brand-foreground)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      5
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-[var(--text-primary)]">Consistência para Comparações</h5>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        Procure tirar as fotos sempre no mesmo horário do dia (preferencialmente pela manhã em jejum), no mesmo local e com a mesma distância (cerca de 2 a 2,5 metros da câmera).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] flex justify-end">
              <Button type="button" variant="primary" onClick={() => setIsOpen(false)}>
                Entendi as Orientações
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
