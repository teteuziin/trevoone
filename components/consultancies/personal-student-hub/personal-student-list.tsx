"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/account/user-avatar";
import {
  MobileSearchBar,
  MobileBottomSheet,
  MobileActionSheet,
  MobileEmptyState,
  MobileSegmentedControl,
  type ActionSheetOption,
} from "@/components/ui/mobile";
import type { PersonalStudentSummary } from "@/lib/consultancies/personal-student-hub";

interface PersonalStudentListProps {
  consultancySlug: string;
  students: PersonalStudentSummary[];
  effectiveMode?: string;
  userRoles?: string[];
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

function MoreDotsIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
    </svg>
  );
}

function AppleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v2m0 0a4.5 4.5 0 014.5 4.5c0 3-2 6-4.5 8.5C9.5 17 7.5 14 7.5 11a4.5 4.5 0 014.5-4.5zm0-2c1.5-1 3-.5 3-.5" />
    </svg>
  );
}

function ChartIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function MailIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

export function PersonalStudentList({
  consultancySlug,
  students,
  effectiveMode,
  userRoles = [],
}: PersonalStudentListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [workoutFilter, setWorkoutFilter] = useState<"ALL" | "WITH_WORKOUT" | "WITHOUT_WORKOUT">("ALL");
  const [selectedObjective, setSelectedObjective] = useState<string>("ALL");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [actionSheetStudent, setActionSheetStudent] = useState<PersonalStudentSummary | null>(null);

  const isNutritionist = effectiveMode === "NUTRITIONIST" || userRoles.includes("NUTRITIONIST");
  const isPersonal = effectiveMode === "PERSONAL" || userRoles.includes("PERSONAL");
  const isAdmin = effectiveMode === "ADMIN" || effectiveMode === "CONSULTANCY_ADMIN" || userRoles.includes("CONSULTANCY_ADMIN");
  const isEffectiveNutritionist = effectiveMode === "NUTRITIONIST" || (!effectiveMode && isNutritionist && !isPersonal);

  // Distinct objectives
  const availableObjectives = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      if (s.objective && s.objective.trim()) {
        set.add(s.objective.trim());
      }
    }
    return Array.from(set);
  }, [students]);

  // Operational Counters
  const withWorkoutCount = useMemo(
    () => students.filter((s) => s.latestAssignmentStatus === "ACTIVE" && !!s.latestWorkoutTitle).length,
    [students]
  );
  const withoutWorkoutCount = useMemo(
    () => students.filter((s) => !s.latestWorkoutTitle || s.latestAssignmentStatus !== "ACTIVE").length,
    [students]
  );

  const activeFiltersCount = (workoutFilter !== "ALL" ? 1 : 0) + (selectedObjective !== "ALL" ? 1 : 0);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // 1. Text Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesEmail = s.email.toLowerCase().includes(q);
        const matchesObjective = s.objective ? s.objective.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesEmail && !matchesObjective) return false;
      }

      // 2. Workout status filter
      if (workoutFilter === "WITH_WORKOUT") {
        if (!(s.latestAssignmentStatus === "ACTIVE" && !!s.latestWorkoutTitle)) return false;
      } else if (workoutFilter === "WITHOUT_WORKOUT") {
        if (s.latestAssignmentStatus === "ACTIVE" && !!s.latestWorkoutTitle) return false;
      }

      // 3. Objective filter
      if (selectedObjective !== "ALL") {
        if (!s.objective || s.objective.trim() !== selectedObjective) return false;
      }

      return true;
    });
  }, [students, search, workoutFilter, selectedObjective]);

  function handleResetFilters() {
    setSearch("");
    setWorkoutFilter("ALL");
    setSelectedObjective("ALL");
    setIsFilterSheetOpen(false);
  }

  // Action sheet options generator for mobile
  const actionSheetOptions: ActionSheetOption[] = useMemo(() => {
    if (!actionSheetStudent) return [];
    const student = actionSheetStudent;
    const studentProfileHref = isEffectiveNutritionist
      ? `/consultoria/${consultancySlug}/planos-v2/prontuario/${student.membershipPublicId}`
      : `/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}`;
    const studentEvolutionHref = isEffectiveNutritionist
      ? `/consultoria/${consultancySlug}/planos-v2/prontuario/${student.membershipPublicId}?tab=evolucao`
      : `/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}`;
    const newWorkoutHref = `/consultoria/${consultancySlug}/rotinas/novo?student=${student.membershipPublicId}`;
    const newPlanHref = `/consultoria/${consultancySlug}/planos-v2/novo?student=${student.membershipPublicId}`;

    const opts: ActionSheetOption[] = [
      {
        id: "view-profile",
        label: isEffectiveNutritionist ? "Ver paciente" : "Ver perfil completo",
        icon: <UserIcon className="w-5 h-5 text-[var(--brand)]" />,
        onClick: () => router.push(studentProfileHref),
      },
    ];

    if (isPersonal || isAdmin) {
      opts.push({
        id: "create-workout",
        label: "Criar treino personalizado",
        icon: <DumbbellIcon className="w-5 h-5 text-[var(--text-secondary)]" />,
        onClick: () => router.push(newWorkoutHref),
      });
    }

    if (isNutritionist || isAdmin) {
      opts.push({
        id: "create-nutrition",
        label: "Criar plano alimentar",
        icon: <AppleIcon className="w-5 h-5 text-[var(--text-secondary)]" />,
        onClick: () => router.push(newPlanHref),
      });
    }

    opts.push({
      id: "view-evolution",
      label: isEffectiveNutritionist ? "Evolução do paciente" : "Evolução do aluno",
      icon: <ChartIcon className="w-5 h-5 text-[var(--text-secondary)]" />,
      onClick: () => router.push(studentEvolutionHref),
    });

    if (student.email) {
      opts.push({
        id: "send-email",
        label: isEffectiveNutritionist ? "Enviar e-mail para paciente" : "Enviar e-mail para aluno",
        icon: <MailIcon className="w-5 h-5 text-[var(--text-tertiary)]" />,
        onClick: () => {
          window.location.href = `mailto:${student.email}`;
        },
      });
    }

    return opts;
  }, [actionSheetStudent, consultancySlug, isPersonal, isNutritionist, isEffectiveNutritionist, isAdmin, router]);

  // If no students in consultancy at all
  if (students.length === 0) {
    return (
      <div className="space-y-4">
        {/* Mobile-native empty state */}
        <div className="md:hidden">
          <MobileEmptyState
            title={isEffectiveNutritionist ? "Nenhum paciente cadastrado" : "Nenhum aluno cadastrado"}
            description={
              isEffectiveNutritionist
                ? "Assim que novos pacientes forem vinculados à consultoria, eles aparecerão aqui para prontuário, planos e evolução."
                : "Assim que novos alunos forem vinculados à consultoria, eles aparecerão aqui para acompanhamento, treinos e evolução."
            }
            icon={<UserIcon className="w-7 h-7 text-emerald-400" />}
            action={
              isAdmin ? (
                <Link
                  href={`/consultoria/${consultancySlug}/membros`}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-zinc-950 bg-emerald-500 hover:bg-emerald-400 min-h-[48px] shadow-sm"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>+ Convidar primeiro {isEffectiveNutritionist ? "paciente" : "aluno"}</span>
                </Link>
              ) : undefined
            }
          />
        </div>

        {/* Preserved desktop container */}
        <div className="hidden md:block p-8 sm:p-12 rounded-3xl border border-white/[0.08] bg-zinc-900/60 text-center space-y-4 shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-emerald-400">
            <UserIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <p className="font-heading text-base font-bold text-white">
              Nenhum {isEffectiveNutritionist ? "paciente" : "aluno"} disponível nesta consultoria
            </p>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              {isEffectiveNutritionist
                ? "Assim que novos pacientes forem cadastrados ou vinculados à consultoria, eles aparecerão aqui para prontuário, planos alimentares e evolução."
                : "Assim que novos alunos forem cadastrados ou vinculados à consultoria, eles aparecerão aqui para acompanhamento e montagem de treinos."}
            </p>
          </div>
          {isAdmin && (
            <div className="pt-2">
              <Link
                href={`/consultoria/${consultancySlug}/membros`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 min-h-[44px]"
              >
                <PlusIcon className="w-4 h-4" />
                <span>+ Convidar {isEffectiveNutritionist ? "paciente" : "aluno"}</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* =========================================================================
          HERO BANNER "SPOTLIGHT" CINEMATOGRÁFICO (NETFLIX / APPLE FITNESS+ EDITION)
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] dark:border-white/[0.08] border-zinc-200/80 bg-gradient-to-br from-zinc-900/95 via-zinc-950 to-emerald-950/30 p-5 sm:p-7 shadow-2xl transition-all">
        {/* Ambient Glow Orbs */}
        <div className="absolute -top-16 -right-16 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4">
          {/* Top Row: Back navigation & Pill Badge */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Link
              href={`/consultoria/${consultancySlug}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-emerald-400 transition-colors group cursor-pointer"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
              <span>Visão geral</span>
            </Link>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] sm:text-xs font-bold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full animate-pulse bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span>{isEffectiveNutritionist ? "GESTÃO DE PACIENTES ATIVA" : "GESTÃO DE ALUNOS ATIVA"}</span>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans">
              {isEffectiveNutritionist ? "Pacientes da Consultoria" : "Alunos da Consultoria"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed max-w-2xl">
              {isEffectiveNutritionist
                ? "Acompanhe prontuário, planos alimentares e a evolução clínica de cada paciente."
                : "Acompanhe seus alunos, informações, avaliações e crie rotinas de treino."}
            </p>
          </div>

          {/* Bento Strip Compacto de KPIs */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 pt-1">
            {/* KPI 1: Total */}
            <button
              type="button"
              onClick={() => setWorkoutFilter("ALL")}
              className={`p-3 sm:p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                workoutFilter === "ALL"
                  ? "bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-950/20"
                  : "bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-zinc-400">Total</span>
              </div>
              <div className="pt-2">
                <span className="text-xl sm:text-2xl font-black text-white tabular-nums block font-sans">
                  {students.length}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mt-0.5 truncate">
                  {isEffectiveNutritionist ? "Pacientes" : "Alunos Ativos"}
                </span>
              </div>
            </button>

            {/* KPI 2: Com Treino */}
            <button
              type="button"
              onClick={() => setWorkoutFilter("WITH_WORKOUT")}
              className={`p-3 sm:p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                workoutFilter === "WITH_WORKOUT"
                  ? "bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-950/20"
                  : "bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <DumbbellIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-emerald-400">Ativos</span>
              </div>
              <div className="pt-2">
                <span className="text-xl sm:text-2xl font-black text-emerald-400 tabular-nums block font-sans">
                  {withWorkoutCount}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mt-0.5 truncate">
                  Com treino
                </span>
              </div>
            </button>

            {/* KPI 3: Sem Treino */}
            <button
              type="button"
              onClick={() => setWorkoutFilter("WITHOUT_WORKOUT")}
              className={`p-3 sm:p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                workoutFilter === "WITHOUT_WORKOUT"
                  ? "bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-950/20"
                  : "bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                  !
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-amber-400">Pendente</span>
              </div>
              <div className="pt-2">
                <span className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums block font-sans">
                  {withoutWorkoutCount}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mt-0.5 truncate">
                  Sem treino
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BARRA DE CONTROLE AVANÇADA (MOBILE SEARCH & FILTERS)
          ========================================================================= */}
      <div className="md:hidden space-y-2.5">
        <MobileSearchBar
          value={search}
          onChange={setSearch}
          placeholder={isEffectiveNutritionist ? "Buscar pacientes por nome, e-mail..." : "Buscar por nome, e-mail ou objetivo..."}
          onFilterClick={() => setIsFilterSheetOpen(true)}
          activeFiltersCount={activeFiltersCount}
        />

        {/* Mobile Segmented Control for fast 1-tap thumb filtering */}
        {!isEffectiveNutritionist && (
          <MobileSegmentedControl
            options={[
              { id: "ALL", label: `Todos (${students.length})` },
              { id: "WITH_WORKOUT", label: `Com treino (${withWorkoutCount})` },
              { id: "WITHOUT_WORKOUT", label: `Sem treino (${withoutWorkoutCount})` },
            ]}
            value={workoutFilter}
            onChange={(val) => setWorkoutFilter(val as "ALL" | "WITH_WORKOUT" | "WITHOUT_WORKOUT")}
          />
        )}

        {/* Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">Filtros:</span>
            {!isEffectiveNutritionist && workoutFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setWorkoutFilter("ALL")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 min-h-[32px] cursor-pointer"
              >
                <span>{workoutFilter === "WITH_WORKOUT" ? "Com treino ativo" : "Sem treino prescrito"}</span>
                <span className="text-xs">✕</span>
              </button>
            )}
            {selectedObjective !== "ALL" && (
              <button
                type="button"
                onClick={() => setSelectedObjective("ALL")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/[0.06] text-zinc-200 border border-white/[0.08] min-h-[32px] cursor-pointer"
              >
                <span>Objetivo: {selectedObjective}</span>
                <span className="text-xs">✕</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-semibold text-zinc-400 hover:text-white underline ml-1 cursor-pointer min-h-[32px] flex items-center"
            >
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          BARRA DE CONTROLE AVANÇADA (DESKTOP SEARCH & FILTER BAR)
          ========================================================================= */}
      <div className="hidden md:flex flex-col gap-3.5 bg-gradient-to-r from-zinc-900/90 to-zinc-950 p-4 rounded-2xl border border-white/[0.08] dark:border-white/[0.08] border-zinc-200/80 shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <SearchIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isEffectiveNutritionist ? "Buscar pacientes por nome, e-mail..." : "Buscar por nome, e-mail ou objetivo..."}
              aria-label={isEffectiveNutritionist ? "Buscar pacientes" : "Buscar alunos"}
              className="w-full pl-10 pr-16 py-2.5 text-xs sm:text-sm rounded-xl border border-white/[0.08] bg-zinc-900/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-zinc-500 transition-all min-h-[44px]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
          <div className="shrink-0 text-xs font-semibold text-zinc-400">
            {filteredStudents.length}{" "}
            {isEffectiveNutritionist
              ? filteredStudents.length === 1
                ? "paciente encontrado"
                : "pacientes encontrados"
              : filteredStudents.length === 1
                ? "aluno encontrado"
                : "alunos encontrados"}
          </div>
        </div>

        {/* Desktop Filter Chips */}
        {!isEffectiveNutritionist && (
          <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setWorkoutFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
                workoutFilter === "ALL"
                  ? "bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/20"
                  : "bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
              }`}
            >
              Todos ({students.length})
            </button>
            <button
              type="button"
              onClick={() => setWorkoutFilter("WITH_WORKOUT")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
                workoutFilter === "WITH_WORKOUT"
                  ? "bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/20"
                  : "bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
              }`}
            >
              Com treino ({withWorkoutCount})
            </button>
            <button
              type="button"
              onClick={() => setWorkoutFilter("WITHOUT_WORKOUT")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
                workoutFilter === "WITHOUT_WORKOUT"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20"
                  : "bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
              }`}
            >
              Sem treino ({withoutWorkoutCount})
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          ESTADO VAZIO (ZERO RESULTADOS)
          ========================================================================= */}
      {filteredStudents.length === 0 ? (
        <div className="space-y-3">
          <div className="p-8 sm:p-12 rounded-2xl border border-white/[0.08] dark:border-white/[0.08] border-zinc-200/80 bg-zinc-900/60 text-center space-y-3 shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-400">
              <UserIcon className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <p className="font-heading text-sm sm:text-base font-bold text-white">
                Nenhum {isEffectiveNutritionist ? "paciente" : "aluno"} encontrado
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {search
                  ? `Nenhum resultado corresponde à busca "${search}".`
                  : `Nenhum ${isEffectiveNutritionist ? "paciente" : "aluno"} corresponde aos filtros aplicados.`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-emerald-400 hover:underline pt-1 inline-block cursor-pointer min-h-[44px]"
            >
              Limpar busca e filtros
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* =====================================================================
              MOBILE STUDENT CARDS (md:hidden)
              Thumb-friendly, full card tap, contextual actions, touch >= 44px
              ===================================================================== */}
          <div className="md:hidden space-y-3" data-testid="mobile-student-list">
            {filteredStudents.map((student) => {
              const hasActiveWorkout =
                student.latestAssignmentStatus === "ACTIVE" && !!student.latestWorkoutTitle;
              const studentDetailHref = isEffectiveNutritionist
                ? `/consultoria/${consultancySlug}/planos-v2/prontuario/${student.membershipPublicId}`
                : `/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}`;

              return (
                <div
                  key={student.membershipPublicId}
                  data-testid="mobile-student-card"
                  onClick={() => router.push(studentDetailHref)}
                  className="p-4 rounded-2xl border border-white/[0.08] dark:border-white/[0.08] border-zinc-200/80 bg-gradient-to-b from-zinc-900/95 via-zinc-900/90 to-zinc-950 shadow-md space-y-3 active:scale-[0.99] transition-all cursor-pointer relative overflow-hidden group select-none"
                >
                  {/* Subtle top ambient glow */}
                  <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />

                  {/* Card Top: Avatar, Name, Email, Objective */}
                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <UserAvatar
                          fullName={student.name}
                          userPublicId={student.userPublicId}
                          size="md"
                          className="shrink-0 ring-1 ring-white/10"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-950 ${
                            hasActiveWorkout ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-amber-400"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <span className="font-heading text-sm font-bold text-white group-hover:text-emerald-300 transition-colors block truncate">
                          {student.name}
                        </span>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {student.email}
                        </p>
                      </div>
                    </div>

                    {student.objective && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-300 border border-white/[0.08] shrink-0 max-w-[120px] truncate">
                        {student.objective}
                      </span>
                    )}
                  </div>

                  {/* Contextual Info Banner: Workout status */}
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1 text-xs relative z-10">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isEffectiveNutritionist ? (
                        <>
                          <AppleIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-zinc-300 font-medium">Acompanhamento nutricional</span>
                        </>
                      ) : (
                        <>
                          <DumbbellIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          {hasActiveWorkout ? (
                            <div className="flex items-center gap-1 min-w-0 truncate">
                              <span className="font-semibold text-emerald-400">
                                Treino:
                              </span>
                              <span className="text-zinc-200 font-medium truncate">
                                {student.latestWorkoutTitle}
                              </span>
                            </div>
                          ) : student.latestWorkoutTitle ? (
                            <div className="flex items-center gap-1 min-w-0 text-zinc-400 truncate">
                              <span>Último:</span>
                              <span className="truncate">{student.latestWorkoutTitle}</span>
                            </div>
                          ) : (
                            <span className="text-amber-400/90 font-medium">Nenhum treino prescrito</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions: Primary CTA + Contextual Action + More Sheet */}
                  <div
                    className="flex items-center gap-2 pt-0.5 relative z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      href={`/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}`}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-xl font-bold text-xs text-zinc-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors min-h-[44px] cursor-pointer"
                    >
                      <span>{isEffectiveNutritionist ? "Ver paciente" : "Ver perfil"}</span>
                      <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-400" />
                    </Link>

                    {!isEffectiveNutritionist && (
                      <Link
                        href={`/consultoria/${consultancySlug}/rotinas/novo?student=${student.membershipPublicId}`}
                        className="inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-xl font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 shadow-md shadow-emerald-500/20 transition-all min-h-[44px] cursor-pointer shrink-0"
                        title="Criar novo treino"
                      >
                        <PlusIcon className="w-3.5 h-3.5" />
                        <span>Treino</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      aria-label={isEffectiveNutritionist ? "Mais opções para este paciente" : "Mais opções para este aluno"}
                      onClick={() => setActionSheetStudent(student)}
                      className="inline-flex items-center justify-center rounded-xl p-2.5 text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors min-h-[44px] min-w-[44px] cursor-pointer shrink-0"
                    >
                      <MoreDotsIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* =====================================================================
              DESKTOP STUDENT CARDS GRID (hidden md:grid)
              Rich Bento Poster cards with subtle glowing border & rapid CTAs
              ===================================================================== */}
          <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-3.5" data-testid="desktop-student-grid">
            {filteredStudents.map((student) => {
              const hasActiveWorkout =
                student.latestAssignmentStatus === "ACTIVE" && !!student.latestWorkoutTitle;

              return (
                <div
                  key={student.membershipPublicId}
                  className="p-4 sm:p-5 rounded-2xl border border-white/[0.08] dark:border-white/[0.08] border-zinc-200/80 bg-gradient-to-b from-zinc-900/95 via-zinc-900/90 to-zinc-950 shadow-md hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-950/20 hover:-translate-y-0.5 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[175px]"
                >
                  {/* Subtle top ambient glow */}
                  <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity" />

                  {/* Top: Avatar, Name, Email and Objective */}
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <UserAvatar
                            fullName={student.name}
                            userPublicId={student.userPublicId}
                            size="md"
                            className="shrink-0 ring-1 ring-white/10 group-hover:scale-105 transition-transform"
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-950 ${
                              hasActiveWorkout ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-amber-400"
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <Link
                            href={`/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}`}
                            className="font-semibold text-white group-hover:text-emerald-300 transition-colors block truncate text-sm sm:text-base font-sans"
                          >
                            {student.name}
                          </Link>
                          <p className="text-xs text-zinc-400 truncate">
                            {student.email}
                          </p>
                        </div>
                      </div>

                      {student.objective && (
                        <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/[0.08] shrink-0 max-w-[130px] truncate">
                          {student.objective}
                        </span>
                      )}
                    </div>

                    {/* Workout Status Banner */}
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        <DumbbellIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        {hasActiveWorkout ? (
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-semibold text-emerald-400">
                              Treino ativo:
                            </span>
                            <span className="text-zinc-200 truncate font-medium">
                              {student.latestWorkoutTitle}
                            </span>
                          </div>
                        ) : student.latestWorkoutTitle ? (
                          <div className="flex items-center gap-1.5 truncate text-zinc-400">
                            <span>Último:</span>
                            <span className="truncate">{student.latestWorkoutTitle}</span>
                          </div>
                        ) : (
                          <span className="text-amber-400/90 font-medium">Sem treino prescrito</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.06] mt-3 relative z-10">
                    <Link
                      href={`/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-emerald-500/30 transition-all min-h-[38px] cursor-pointer"
                    >
                      <span>Ver perfil</span>
                      <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                    </Link>

                    {!isEffectiveNutritionist && (
                      <Link
                        href={`/consultoria/${consultancySlug}/rotinas/novo?student=${student.membershipPublicId}`}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 shadow-md shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all min-h-[38px] cursor-pointer shrink-0"
                        title="Criar novo treino"
                      >
                        <PlusIcon className="w-3.5 h-3.5" />
                        <span>+ Treino</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      aria-label="Mais opções"
                      onClick={() => setActionSheetStudent(student)}
                      className="inline-flex items-center justify-center rounded-xl p-2 text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors min-h-[38px] min-w-[38px] cursor-pointer shrink-0"
                    >
                      <MoreDotsIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* MOBILE FILTER BOTTOM SHEET */}
      <MobileBottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filtros de Alunos"
        subtitle="Refine a lista por situação de treino ou objetivo"
      >
        <div className="space-y-4 py-2">
          {!isEffectiveNutritionist && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Situação do Treino
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "ALL", label: "Todos" },
                  { id: "WITH_WORKOUT", label: "Com treino" },
                  { id: "WITHOUT_WORKOUT", label: "Sem treino" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setWorkoutFilter(opt.id as "ALL" | "WITH_WORKOUT" | "WITHOUT_WORKOUT")}
                    className={`py-2 px-2 text-xs rounded-xl font-semibold border transition-all ${
                      workoutFilter === opt.id
                        ? "bg-emerald-500 text-zinc-950 border-emerald-500 font-bold"
                        : "bg-white/[0.04] text-zinc-300 border-white/[0.08]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {availableObjectives.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Objetivo
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedObjective("ALL")}
                  className={`py-1.5 px-3 text-xs rounded-xl font-semibold border transition-all ${
                    selectedObjective === "ALL"
                      ? "bg-emerald-500 text-zinc-950 border-emerald-500 font-bold"
                      : "bg-white/[0.04] text-zinc-300 border-white/[0.08]"
                  }`}
                >
                  Todos
                </button>
                {availableObjectives.map((obj) => (
                  <button
                    key={obj}
                    type="button"
                    onClick={() => setSelectedObjective(obj)}
                    className={`py-1.5 px-3 text-xs rounded-xl font-semibold border transition-all ${
                      selectedObjective === obj
                        ? "bg-emerald-500 text-zinc-950 border-emerald-500 font-bold"
                        : "bg-white/[0.04] text-zinc-300 border-white/[0.08]"
                    }`}
                  >
                    {obj}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex-1 py-2.5 rounded-xl font-semibold text-xs text-zinc-400 hover:text-white bg-white/[0.04] border border-white/[0.08]"
            >
              Limpar filtros
            </button>
            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(false)}
              className="flex-1 py-2.5 rounded-xl font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400"
            >
              Aplicar
            </button>
          </div>
        </div>
      </MobileBottomSheet>

      {/* MOBILE ACTION SHEET FOR CONTEXTUAL STUDENT ACTIONS */}
      <MobileActionSheet
        isOpen={Boolean(actionSheetStudent)}
        onClose={() => setActionSheetStudent(null)}
        title={actionSheetStudent?.name || "Opções do Aluno"}
        options={actionSheetOptions}
      />
    </div>
  );
}
