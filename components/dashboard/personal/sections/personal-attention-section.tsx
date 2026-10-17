"use client";

import React from "react";
import Link from "next/link";

export interface StudentAttentionItem {
  membershipPublicId: string;
  userPublicId: string;
  name: string;
  email: string;
  joinedAt: string; // ISO date string
}

export interface DraftAttentionItem {
  publicId: string;
  title: string;
  updatedAt?: string | null;
  draftVersionNumber?: number | null;
}

export interface PersonalAttentionSectionProps {
  consultancySlug: string;
  studentsWithoutWorkout?: StudentAttentionItem[];
  draftWorkouts?: DraftAttentionItem[];
  totalStudents?: number;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

function formatMemberSince(isoDateString?: string | null): string {
  if (!isoDateString) return "data não disponível";
  try {
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return "data não disponível";
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = d.getUTCFullYear();
    return `membro desde ${month}/${year}`;
  } catch {
    return "data não disponível";
  }
}

function formatEditedDate(isoDateString?: string | null): string {
  if (!isoDateString) return "data não disponível";
  try {
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return "data não disponível";
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = d.getUTCFullYear();
    return `editado em ${day}/${month}/${year}`;
  } catch {
    return "data não disponível";
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PersonalAttentionSection({
  consultancySlug,
  studentsWithoutWorkout = [],
  draftWorkouts = [],
  totalStudents = 0,
  isLoading = false,
  isError = false,
  onRetry,
}: PersonalAttentionSectionProps) {
  // Estado de Carregamento (Skeleton D3 / D4)
  if (isLoading) {
    return (
      <section aria-label="Precisa de atenção" className="w-full space-y-3">
        <h2 className="text-lg font-semibold text-[var(--cockpit-text-primary)] leading-tight">
          Precisa de atenção
        </h2>
        <div className="bg-[var(--cockpit-surface-default)] border border-[var(--cockpit-border-default)] rounded-lg p-4 space-y-3 animate-pulse">
          <div className="h-4 bg-[var(--cockpit-surface-subtle)] rounded w-1/3" />
          <div className="h-10 bg-[var(--cockpit-surface-subtle)] rounded w-full" />
          <div className="h-10 bg-[var(--cockpit-surface-subtle)] rounded w-full" />
        </div>
      </section>
    );
  }

  // Estado de Erro com Ação de Retentativa
  if (isError) {
    return (
      <section aria-label="Precisa de atenção" className="w-full space-y-3">
        <h2 className="text-lg font-semibold text-[var(--cockpit-text-primary)] leading-tight">
          Precisa de atenção
        </h2>
        <div className="bg-[var(--cockpit-surface-default)] border border-[var(--cockpit-border-default)] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm font-medium text-[var(--cockpit-text-secondary)]">
            Não foi possível carregar as pendências.
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center px-3.5 min-h-[44px] text-sm font-semibold text-[var(--cockpit-text-primary)] bg-[var(--cockpit-surface-subtle)] hover:bg-[var(--cockpit-border-default)] rounded-md transition-colors cursor-pointer select-none"
            >
              Tentar novamente
            </button>
          )}
        </div>
      </section>
    );
  }

  // 1. Ordenação Determinística das Filas:
  // P1: Alunos sem treino por cm.created_at ASC (mais antigos esperando primeiro), desempate por nome
  const sortedStudents = [...studentsWithoutWorkout].sort((a, b) => {
    const timeA = new Date(a.joinedAt).getTime() || 0;
    const timeB = new Date(b.joinedAt).getTime() || 0;
    if (timeA !== timeB) return timeA - timeB;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  // P2: Rascunhos por updatedAt DESC (trabalhado mais recentemente primeiro), desempate por título
  const sortedDrafts = [...draftWorkouts].sort((a, b) => {
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    return a.title.localeCompare(b.title, "pt-BR");
  });

  // 2. Algoritmo da Cota Dinâmica (Teto total = 5):
  const quota1 = Math.min(sortedStudents.length, 3);
  const quota2 = Math.min(sortedDrafts.length, 2);
  let remainingSlots = 5 - (quota1 + quota2);

  const extra1 = Math.min(sortedStudents.length - quota1, remainingSlots);
  remainingSlots -= extra1;

  const extra2 = Math.min(sortedDrafts.length - quota2, remainingSlots);

  const selectedStudents = sortedStudents.slice(0, quota1 + extra1);
  const selectedDrafts = sortedDrafts.slice(0, quota2 + extra2);

  const totalPendencias = sortedStudents.length + sortedDrafts.length;
  const visibleCount = selectedStudents.length + selectedDrafts.length;

  return (
    <section aria-label="Precisa de atenção" className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--cockpit-text-primary)] leading-tight">
          Precisa de atenção
        </h2>
      </div>

      {totalPendencias === 0 ? (
        <div className="bg-[var(--cockpit-surface-default)] border border-[var(--cockpit-border-default)] rounded-lg p-5">
          <p className="text-sm font-normal text-[var(--cockpit-text-secondary)]">
            Nenhuma pendência identificada.
          </p>
        </div>
      ) : (
        <div className="bg-[var(--cockpit-surface-default)] border border-[var(--cockpit-border-default)] rounded-lg divide-y divide-[var(--cockpit-border-default)] overflow-hidden">
          {/* Grupo 1: Alunos Ativos sem Ficha */}
          {selectedStudents.map((student) => (
            <div
              key={student.membershipPublicId}
              className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 transition-colors hover:bg-[var(--cockpit-surface-subtle)]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  aria-hidden="true"
                  className="w-9 h-9 rounded-md bg-[var(--cockpit-surface-subtle)] border border-[var(--cockpit-border-default)] flex items-center justify-center text-xs font-bold text-[var(--cockpit-text-primary)] shrink-0 select-none"
                >
                  {getInitials(student.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--cockpit-text-primary)] truncate">
                      {student.name}
                    </p>
                    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-[var(--cockpit-status-danger-text)] bg-[var(--cockpit-status-danger-bg)] border border-[var(--cockpit-status-danger-border)] select-none">
                      Sem ficha ativa
                    </span>
                  </div>
                  <p className="text-xs text-[var(--cockpit-text-secondary)] mt-0.5 font-normal">
                    {formatMemberSince(student.joinedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end sm:shrink-0 pt-1 sm:pt-0">
                <Link
                  href={`/consultoria/${consultancySlug}/rotinas/novo?student=${encodeURIComponent(
                    student.membershipPublicId
                  )}`}
                  prefetch={false}
                  className="inline-flex items-center justify-center min-h-[44px] sm:min-h-0 px-3 text-sm font-semibold text-[var(--cockpit-action-primary)] hover:underline rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--cockpit-accent-brand)]"
                >
                  Criar ficha
                </Link>
              </div>
            </div>
          ))}

          {/* Grupo 2: Rascunhos Pendentes */}
          {selectedDrafts.map((draft) => (
            <div
              key={draft.publicId}
              className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 transition-colors hover:bg-[var(--cockpit-surface-subtle)]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  aria-hidden="true"
                  className="w-9 h-9 rounded-md bg-[var(--cockpit-surface-subtle)] border border-[var(--cockpit-border-default)] flex items-center justify-center text-[var(--cockpit-text-secondary)] shrink-0 select-none"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--cockpit-text-primary)] truncate">
                      {draft.title}
                    </p>
                    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-[var(--cockpit-status-neutral-text)] bg-[var(--cockpit-status-neutral-bg)] border border-[var(--cockpit-border-default)] select-none">
                      Rascunho não publicado
                    </span>
                  </div>
                  <p className="text-xs text-[var(--cockpit-text-secondary)] mt-0.5 font-normal">
                    {formatEditedDate(draft.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end sm:shrink-0 pt-1 sm:pt-0">
                <Link
                  href={`/consultoria/${consultancySlug}/rotinas/${draft.publicId}`}
                  prefetch={false}
                  className="inline-flex items-center justify-center min-h-[44px] sm:min-h-0 px-3 text-sm font-semibold text-[var(--cockpit-action-primary)] hover:underline rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--cockpit-accent-brand)]"
                >
                  Revisar ficha
                </Link>
              </div>
            </div>
          ))}

          {/* Rodapé Informativo e de Navegação com Destinos Honestos */}
          {totalPendencias > 0 && (
            <div className="p-3 bg-[var(--cockpit-surface-subtle)] flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-[var(--cockpit-text-secondary)]">
              <span className="font-medium">
                {visibleCount === totalPendencias
                  ? `${totalPendencias} ${totalPendencias === 1 ? "pendência" : "pendências"}`
                  : `${visibleCount} de ${totalPendencias} pendências`}
              </span>

              <div className="flex flex-wrap items-center gap-3">
                {sortedStudents.length > 0 && (
                  <Link
                    href={`/consultoria/${consultancySlug}/progresso/alunos`}
                    prefetch={false}
                    className="min-h-[44px] sm:min-h-0 inline-flex items-center text-sm font-medium text-[var(--cockpit-action-primary)] hover:underline cursor-pointer"
                  >
                    Ver todos os alunos ({totalStudents})
                  </Link>
                )}
                {sortedStudents.length > 0 && sortedDrafts.length > 0 && (
                  <span aria-hidden="true" className="text-[var(--cockpit-border-default)]">·</span>
                )}
                {sortedDrafts.length > 0 && (
                  <Link
                    href={`/consultoria/${consultancySlug}/rotinas?status=DRAFT`}
                    prefetch={false}
                    className="min-h-[44px] sm:min-h-0 inline-flex items-center text-sm font-medium text-[var(--cockpit-action-primary)] hover:underline cursor-pointer"
                  >
                    Ver rascunhos ({sortedDrafts.length})
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
