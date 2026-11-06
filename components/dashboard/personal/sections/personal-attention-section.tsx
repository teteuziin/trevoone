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
  title?: string;
  maxStudentsMobile?: number;
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
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function DocumentPencilIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
      />
    </svg>
  );
}

export function PersonalAttentionSection({
  consultancySlug,
  studentsWithoutWorkout = [],
  draftWorkouts = [],
  isLoading = false,
  isError = false,
  onRetry,
  title = "Resolver agora",
  maxStudentsMobile = 3,
}: PersonalAttentionSectionProps) {
  if (isLoading) {
    return (
      <section aria-label={title} className="w-full space-y-3">
        <h2 className="text-base font-bold text-[var(--text-primary)] leading-tight">
          {title}
        </h2>
        <div className="bg-[#151619] border border-[#303238] rounded-xl p-5 space-y-3 animate-pulse">
          <div className="h-4 bg-[#1B1D21] rounded w-1/4" />
          <div className="h-12 bg-[#1B1D21] rounded w-full" />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section aria-label={title} className="w-full space-y-3">
        <h2 className="text-base font-bold text-[var(--text-primary)] leading-tight">
          {title}
        </h2>
        <div className="bg-[#151619] border border-red-500/30 rounded-xl p-5 flex items-center justify-between gap-4">
          <p className="text-sm font-normal text-red-300">
            Não foi possível carregar as pendências no momento.
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1B1D21] text-white border border-[#303238] hover:border-red-500/40 cursor-pointer active:translate-y-[1px]"
            >
              Tentar novamente
            </button>
          )}
        </div>
      </section>
    );
  }

  // Ordenação determinística de alunos
  const sortedStudents = [...studentsWithoutWorkout].sort((a, b) => {
    const timeA = new Date(a.joinedAt).getTime();
    const timeB = new Date(b.joinedAt).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  const sortedDrafts = [...draftWorkouts].sort((a, b) => {
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    return a.title.localeCompare(b.title, "pt-BR");
  });

  // Lista curta no mobile (máximo 3) e até 5 no desktop
  const visibleStudents = sortedStudents.slice(0, 5);
  const remainingStudentsCount = Math.max(0, sortedStudents.length - maxStudentsMobile);

  return (
    <section aria-label={title} className="w-full space-y-5">
      {/* ============================================================== */}
      {/* 1. BLOCO DE PENDÊNCIAS DE ATENDIMENTO (ALUNOS SEM TREINO)      */}
      {/* ============================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] leading-tight flex items-center gap-2">
              <span>{title}</span>
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-medium">
              Alunos aguardando prescrição de treino
            </p>
          </div>

          {sortedStudents.length > 0 ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 shrink-0">
              {sortedStudents.length} {sortedStudents.length === 1 ? "aluno sem treino" : "alunos sem treino"}
            </span>
          ) : (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              100% atendidos
            </span>
          )}
        </div>

        {sortedStudents.length === 0 ? (
          <div className="bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-xl p-4 sm:p-5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[#10B981] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                Nenhum aluno sem treino ativo
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Todos os seus alunos ativos estão com rotinas prescritas.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-xl divide-y divide-[#E5E7EB] dark:divide-[#303238] overflow-hidden shadow-xs">
            {visibleStudents.map((student, idx) => (
              <div
                key={student.membershipPublicId}
                className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-colors hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21]/50 ${
                  idx >= maxStudentsMobile ? "hidden sm:flex" : "flex"
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div
                    aria-hidden="true"
                    className="w-9 h-9 rounded-lg bg-[#F3F4F6] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] flex items-center justify-center text-xs font-bold text-[var(--text-primary)] shrink-0 select-none"
                  >
                    {getInitials(student.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate leading-snug">
                        {student.name}
                      </p>
                      <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded text-rose-700 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 select-none">
                        Sem ficha ativa
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-medium truncate">
                      {formatMemberSince(student.joinedAt)}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/consultoria/${consultancySlug}/rotinas/novo?student=${encodeURIComponent(
                    student.membershipPublicId
                  )}`}
                  prefetch={false}
                  className="inline-flex items-center justify-center min-h-[44px] px-3 sm:px-4 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs active:translate-y-[1px] transition-colors cursor-pointer shrink-0"
                >
                  + Criar treino
                </Link>
              </div>
            ))}

            {/* Link para ver todos os alunos no mobile quando houver mais de 3 */}
            {remainingStudentsCount > 0 && (
              <div className="p-2.5 sm:hidden text-center bg-[#F9FAFB] dark:bg-[#1B1D21]/40 border-t border-[#E5E7EB] dark:border-[#303238]">
                <Link
                  href={`/consultoria/${consultancySlug}/progresso/alunos`}
                  prefetch={false}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  Ver todos os {sortedStudents.length} alunos sob gestão →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. BLOCO SEPARADO DE TRABALHO INTERNO: RASCUNHOS EM ANDAMENTO   */}
      {/* ============================================================== */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-0.5">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
              <span>Rascunhos de treino</span>
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Fichas em elaboração não publicadas (trabalho interno do treinador)
            </p>
          </div>

          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#F3F4F6] dark:bg-[#1B1D21] text-[var(--text-secondary)] border border-[#E5E7EB] dark:border-[#303238] shrink-0">
            {sortedDrafts.length} {sortedDrafts.length === 1 ? "rascunho" : "rascunhos"}
          </span>
        </div>

        {sortedDrafts.length === 0 ? (
          <div className="bg-[#F9FAFB] dark:bg-[#1B1D21]/30 border border-dashed border-[#E5E7EB] dark:border-[#303238] rounded-xl p-3.5 text-center text-xs text-[var(--text-secondary)]">
            Nenhum rascunho de treino pendente.
          </div>
        ) : (
          <div className="bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-xl divide-y divide-[#E5E7EB] dark:divide-[#303238] overflow-hidden shadow-xs">
            {sortedDrafts.slice(0, 3).map((draft) => (
              <div
                key={draft.publicId}
                className="p-3 sm:p-3.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] dark:bg-[#1B1D21] text-[var(--text-secondary)] flex items-center justify-center shrink-0 border border-[#E5E7EB] dark:border-[#303238]">
                    <DocumentPencilIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--text-primary)] truncate">
                      {draft.title}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {formatEditedDate(draft.updatedAt)}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/consultoria/${consultancySlug}/rotinas/${draft.publicId}`}
                  prefetch={false}
                  className="px-3 py-1.5 rounded-lg font-bold text-xs bg-[#F3F4F6] hover:bg-[#E5E7EB] dark:bg-[#1B1D21] dark:hover:bg-[#252830] text-[var(--text-primary)] border border-[#E5E7EB] dark:border-[#303238] shrink-0 min-h-[44px] flex items-center justify-center transition-colors cursor-pointer"
                >
                  Continuar edição
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
