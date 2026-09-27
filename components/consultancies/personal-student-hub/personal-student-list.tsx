"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { PersonalStudentSummary } from "@/lib/consultancies/personal-student-hub";

interface PersonalStudentListProps {
  consultancySlug: string;
  students: PersonalStudentSummary[];
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function UserIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function DumbbellIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5l11 11M6.5 17.5l11-11M3 8l3-3m0 0l3 3M3 16l3 3m0 0l3-3m9-8l3-3m0 0l3 3m-3 11l3-3m0 0l3 3" />
    </svg>
  );
}

export function PersonalStudentList({
  consultancySlug,
  students,
}: PersonalStudentListProps) {
  const [search, setSearch] = useState("");

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.objective && s.objective.toLowerCase().includes(q))
    );
  }, [students, search]);

  if (students.length === 0) {
    return (
      <div className="p-8 sm:p-12 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-4 shadow-xs depth-surface">
        <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-tertiary)]">
          <UserIcon className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-sm mx-auto">
          <p className="font-heading text-base font-bold text-[var(--text-primary)]">
            Nenhum aluno disponível nesta consultoria
          </p>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Assim que novos alunos forem cadastrados ou vinculados à consultoria, eles aparecerão aqui para acompanhamento e montagem de treinos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Search Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface)] p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-[var(--border-default)] shadow-xs depth-surface">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-tertiary)]">
            <SearchIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou objetivo..."
            aria-label="Buscar alunos"
            className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all min-h-[44px]"
          />
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 px-1 sm:px-0">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            {filteredStudents.length} {filteredStudents.length === 1 ? "aluno encontrado" : "alunos encontrados"}
          </span>
        </div>
      </div>

      {/* Empty Search Results */}
      {filteredStudents.length === 0 ? (
        <div className="p-8 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-2 shadow-xs depth-surface">
          <p className="font-heading text-sm font-bold text-[var(--text-primary)]">
            Nenhum aluno corresponde à busca &quot;{search}&quot;
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Verifique a grafia ou limpe o campo de busca para ver todos os alunos.
          </p>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-xs font-bold text-[var(--brand)] hover:underline pt-2 inline-block cursor-pointer min-h-[44px]"
          >
            Limpar busca
          </button>
        </div>
      ) : (
        /* Student Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {filteredStudents.map((student) => {
            const initial = student.name.charAt(0).toUpperCase() || "A";
            const hasActiveWorkout =
              student.latestAssignmentStatus === "ACTIVE" && !!student.latestWorkoutTitle;

            return (
              <div
                key={student.membershipPublicId}
                className="group p-5 sm:p-5.5 rounded-2xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand)] shadow-xs transition-all flex flex-col justify-between space-y-4 depth-surface"
              >
                {/* Header: Avatar, Name, Email, Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--brand)] font-bold text-sm shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                      {initial}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <Link
                        href={`/consultoria/${consultancySlug}/alunos/${student.membershipPublicId}`}
                        className="font-heading text-sm sm:text-base font-bold text-[var(--text-primary)] hover:text-[var(--brand)] transition-colors block truncate"
                      >
                        {student.name}
                      </Link>
                      <p className="text-xs text-[var(--text-secondary)] truncate">
                        {student.email}
                      </p>
                    </div>
                  </div>

                  <Badge variant="success" size="sm" className="shrink-0 font-medium">
                    Ativo
                  </Badge>
                </div>

                {/* Middle: Objective & Latest Workout */}
                <div className="space-y-2 py-1 border-y border-[var(--border-subtle)]">
                  {student.objective ? (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-tertiary)]">Objetivo:</span>
                      <span className="text-[var(--text-primary)] font-medium truncate">
                        {student.objective}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                      <span>Objetivo não informado</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs">
                    <DumbbellIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                    {hasActiveWorkout ? (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Treino ativo:
                        </span>
                        <span className="text-[var(--text-primary)] font-medium truncate">
                          {student.latestWorkoutTitle}
                        </span>
                      </div>
                    ) : student.latestWorkoutTitle ? (
                      <div className="flex items-center gap-1.5 min-w-0 text-[var(--text-secondary)]">
                        <span className="text-[var(--text-tertiary)]">Último treino:</span>
                        <span className="truncate">{student.latestWorkoutTitle}</span>
                      </div>
                    ) : (
                      <span className="text-[var(--text-tertiary)]">Nenhum treino prescrito</span>
                    )}
                  </div>
                </div>

                {/* Actions: Ver aluno & Criar treino */}
                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href={`/consultoria/${consultancySlug}/alunos/${student.membershipPublicId}`}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-xl font-bold text-xs text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-colors min-h-[44px] depth-interactive cursor-pointer"
                  >
                    <span>Ver aluno</span>
                    <ChevronRightIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                  </Link>

                  <Link
                    href={`/consultoria/${consultancySlug}/rotinas/novo?student=${student.membershipPublicId}`}
                    className="inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] transition-all min-h-[44px] shadow-xs depth-interactive cursor-pointer shrink-0"
                    title="Criar novo treino para este aluno"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Criar treino</span>
                    <span className="xs:hidden">Treino</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
