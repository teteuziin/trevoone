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
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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
  if (isLoading) {
    return (
      <section aria-label="Precisa de atenção" className="w-full space-y-3">
        <h2 className="text-lg font-bold text-white leading-tight">
          Precisa de atenção
        </h2>
        <div className="bg-[#151619] border border-[#303238] rounded-2xl p-5 space-y-3 animate-pulse">
          <div className="h-4 bg-[#1B1D21] rounded w-1/4" />
          <div className="h-12 bg-[#1B1D21] rounded w-full" />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section aria-label="Precisa de atenção" className="w-full space-y-3">
        <h2 className="text-lg font-bold text-white leading-tight">
          Precisa de atenção
        </h2>
        <div className="bg-[#151619] border border-red-500/30 rounded-2xl p-5 flex items-center justify-between gap-4">
          <p className="text-sm font-normal text-red-300">
            Não foi possível carregar as pendências no momento.
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1B1D21] text-white border border-[#303238] hover:border-red-500/40 cursor-pointer"
            >
              Tentar novamente
            </button>
          )}
        </div>
      </section>
    );
  }

  // 1. Algoritmo de Ordenação Determinística:
  // P1: Alunos sem treino ordenados por joinedAt ASC (mais antigos primeiro), desempate por nome alfabético
  const sortedStudents = [...studentsWithoutWorkout].sort((a, b) => {
    const timeA = new Date(a.joinedAt).getTime();
    const timeB = new Date(b.joinedAt).getTime();
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
    <section aria-label="Precisa de atenção" className="w-full space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-tight">
          Precisa de atenção
        </h2>
        {totalPendencias > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {totalPendencias} pendência(s)
          </span>
        )}
      </div>

      {totalPendencias === 0 ? (
        <div className="bg-[#151619] border border-[#303238] rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-normal text-[#C2C8CF]">
            Nenhuma pendência identificada.
          </p>
        </div>
      ) : (
        <div className="bg-[#151619] border border-[#303238] rounded-2xl divide-y divide-[#303238] overflow-hidden shadow-sm">
          {/* Grupo 1: Alunos Ativos sem Ficha */}
          {selectedStudents.map((student) => (
            <div
              key={student.membershipPublicId}
              className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 transition-colors hover:bg-[#1B1D21]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  aria-hidden="true"
                  className="w-9 h-9 rounded-xl bg-[#1B1D21] border border-[#303238] flex items-center justify-center text-xs font-bold text-white shrink-0 select-none"
                >
                  {getInitials(student.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">
                      {student.name}
                    </p>
                    {/* Badge com Alta Cor de Hierarquia: Vermelho/Coral */}
                    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-rose-300 bg-rose-500/20 border border-rose-500/30 select-none">
                      Sem ficha ativa
                    </span>
                  </div>
                  <p className="text-xs text-[#C2C8CF] mt-0.5 font-normal">
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
                  className="inline-flex items-center justify-center min-h-[44px] sm:min-h-0 px-3.5 py-1.5 text-xs font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#10B981]"
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
              className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 transition-colors hover:bg-[#1B1D21]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  aria-hidden="true"
                  className="w-9 h-9 rounded-xl bg-[#1B1D21] border border-[#303238] flex items-center justify-center text-[#C2C8CF] shrink-0 select-none"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">
                      {draft.title}
                    </p>
                    {/* Badge com Alta Cor de Hierarquia: Âmbar */}
                    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-amber-300 bg-amber-500/20 border border-amber-500/30 select-none">
                      Rascunho não publicado
                    </span>
                  </div>
                  <p className="text-xs text-[#C2C8CF] mt-0.5 font-normal">
                    {formatEditedDate(draft.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end sm:shrink-0 pt-1 sm:pt-0">
                <Link
                  href={`/consultoria/${consultancySlug}/rotinas/${draft.publicId}`}
                  prefetch={false}
                  className="inline-flex items-center justify-center min-h-[44px] sm:min-h-0 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] hover:border-[#10B981]/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                >
                  Revisar ficha
                </Link>
              </div>
            </div>
          ))}

          {/* Rodapé Honesto de Paginação e Navegação */}
          <div className="p-3 sm:p-3.5 bg-[#121316] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-[#C2C8CF] font-normal">
            <span>
              {visibleCount} de {totalPendencias} pendências
            </span>

            <div className="flex items-center gap-4">
              <Link
                href={`/consultoria/${consultancySlug}/progresso/alunos`}
                prefetch={false}
                className="text-[#10B981] hover:text-emerald-300 font-semibold transition-colors"
              >
                Ver todos os alunos ({totalStudents})
              </Link>

              {sortedDrafts.length > 0 && (
                <Link
                  href={`/consultoria/${consultancySlug}/rotinas?status=draft`}
                  prefetch={false}
                  className="text-[#10B981] hover:text-emerald-300 font-semibold transition-colors"
                >
                  Ver rascunhos ({sortedDrafts.length})
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
