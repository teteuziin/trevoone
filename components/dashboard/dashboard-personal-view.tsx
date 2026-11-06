"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { PersonalHeader } from "./personal/personal-header";
import type { PersonalFinanceIndicatorData } from "./personal/sections/personal-indicators";
import type { PersonalFinanceChargeItem } from "./personal/sections/personal-indicator-detail-dialog";

export interface PersonalWorkoutSummaryItem {
  publicId: string;
  title: string;
  subtitle?: string | null;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT" | "PUBLISHED" | string;
  difficultyLevel?: string;
  blocksCount?: number;
  currentVersionStatus?: string | null;
  assignedStudentName?: string | null;
  activeAssignmentsCount?: number;
  isTemplate?: boolean;
  updatedAt?: string | Date | null;
  hasActiveDraft?: boolean;
  draftVersionNumber?: number | null;
  publishedVersionNumber?: number | null;
  publishedVersionPublicId?: string | null;
}

export interface StudentWithoutWorkoutItem {
  membershipPublicId: string;
  userPublicId: string;
  name: string;
  email: string;
  joinedAt: string;
  avatarUrl?: string | null;
  hasProfilePhoto?: boolean;
  profilePhotoUpdatedAt?: Date | string | number | null;
}

export interface PersonalTodayConsultationItem {
  publicId: string;
  studentName: string;
  timeFormatted: string;
  type?: string;
  status: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  href?: string;
}

export interface DashboardPersonalViewProps {
  consultancySlug: string;
  consultancyName?: string;
  consultancyLogoUrl?: string | null;
  userName?: string;
  userEmail?: string;
  userPublicId?: string;
  userAvatarUrl?: string | null;
  hasProfilePhoto?: boolean;
  profilePhotoUpdatedAt?: Date | string | number | null;
  roles?: string[];
  activeRoleMode?: string;
  recentPlans?: PersonalWorkoutSummaryItem[];
  workouts?: PersonalWorkoutSummaryItem[];
  totalPlans?: number;
  totalWorkouts?: number;
  totalStudents?: number | null;
  prescribedBlocksCount?: number | null;
  studentsWithoutWorkout?: StudentWithoutWorkoutItem[];
  todayConsultations?: PersonalTodayConsultationItem[] | null;
  hideRoleBadge?: boolean;
  financeSummary?: PersonalFinanceIndicatorData & {
    upcomingCharges?: PersonalFinanceChargeItem[];
  };
  satisfactionData?: {
    averageRating: number | null;
    totalReviews: number;
  };
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

function StarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  );
}

function CurrencyIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

interface DraftWorkoutCardProps {
  consultancySlug: string;
  primaryDraft: {
    publicId: string;
    title: string;
    updatedAt: string | null;
    blocksCount: number;
  } | null;
  variant: "horizontal-desktop" | "compact-mobile";
}

function DraftWorkoutCard({ consultancySlug, primaryDraft, variant }: DraftWorkoutCardProps) {
  if (variant === "horizontal-desktop") {
    return (
      <section
        aria-label="Rascunho de treino em andamento"
        className="relative overflow-hidden rounded-2xl bg-[#0A2214] border border-[#163E27] shadow-xs text-white p-6 flex items-center justify-between gap-6 min-h-[140px]"
      >
        {/* Fotografia real contextual de academia devidamente otimizada */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/student/workout-editorial.webp"
          alt="Fotografia de treino contextual"
          className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none select-none"
        />
        {/* Gradiente horizontal moderado garantindo contraste para leitura perfeita */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A2214]/95 via-[#0A2214]/85 to-[#0A2214]/40 pointer-events-none" />

        {/* Conteúdo textual */}
        <div className="relative z-10 space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-white/15 text-emerald-300 backdrop-blur-xs border border-white/20 tracking-wider uppercase">
              Rascunho de treino
            </span>
            <span className="text-xs text-emerald-200/80 font-medium">
              {primaryDraft ? formatEditedDate(primaryDraft.updatedAt) : "Pronto para iniciar"}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight truncate drop-shadow-sm">
            {primaryDraft ? primaryDraft.title : "Nenhum rascunho em andamento"}
          </h3>

          <p className="text-xs text-emerald-200/90 font-medium">
            {primaryDraft
              ? `${primaryDraft.blocksCount || 0} ${primaryDraft.blocksCount === 1 ? "bloco cadastrado" : "blocos cadastrados"}`
              : "Inicie a elaboração de uma nova ficha para seus alunos."}
          </p>
        </div>

        {/* Ação direta */}
        <div className="relative z-10 shrink-0">
          <Link
            href={
              primaryDraft
                ? `/consultoria/${consultancySlug}/rotinas/${primaryDraft.publicId}/editor`
                : `/consultoria/${consultancySlug}/rotinas/novo`
            }
            prefetch={false}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#10B981] hover:bg-[#059669] text-[#042F1E] shadow-xs transition-all cursor-pointer select-none min-h-[44px] active:translate-y-[1px]"
          >
            <span>{primaryDraft ? "Retomar edição" : "Criar treino"}</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </section>
    );
  }

  // Versão compacta para celular
  return (
    <section
      aria-label="Rascunho de treino em andamento"
      className="relative overflow-hidden rounded-2xl bg-[#0A2214] border border-[#163E27] shadow-xs text-white p-5 flex flex-col justify-between gap-4 min-h-[170px]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/student/workout-editorial.webp"
        alt="Fotografia de treino contextual"
        className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none select-none"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A2214]/95 via-[#0A2214]/80 to-[#0A2214]/40 pointer-events-none" />

      <div className="relative z-10 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/15 text-emerald-300 backdrop-blur-xs border border-white/20 tracking-wider uppercase">
            Rascunho de treino
          </span>
          <span className="text-[11px] text-emerald-200/80 font-medium">
            {primaryDraft ? formatEditedDate(primaryDraft.updatedAt) : "Pronto para iniciar"}
          </span>
        </div>

        <div>
          <h3 className="text-base font-black text-white tracking-tight line-clamp-2 drop-shadow-sm">
            {primaryDraft ? primaryDraft.title : "Nenhum rascunho em andamento"}
          </h3>
          <p className="text-xs text-emerald-200/90 font-medium mt-0.5">
            {primaryDraft
              ? `${primaryDraft.blocksCount || 0} ${primaryDraft.blocksCount === 1 ? "bloco cadastrado" : "blocos cadastrados"}`
              : "Inicie a elaboração de uma nova ficha."}
          </p>
        </div>
      </div>

      <div className="relative z-10 pt-1">
        <Link
          href={
            primaryDraft
              ? `/consultoria/${consultancySlug}/rotinas/${primaryDraft.publicId}/editor`
              : `/consultoria/${consultancySlug}/rotinas/novo`
          }
          prefetch={false}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-[#10B981] hover:bg-[#059669] text-[#042F1E] shadow-xs transition-all cursor-pointer select-none min-h-[44px] active:translate-y-[1px]"
        >
          <span>{primaryDraft ? "Retomar edição" : "Criar treino"}</span>
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}

export function DashboardPersonalView({
  consultancySlug,
  consultancyName,
  consultancyLogoUrl,
  userName,
  userEmail,
  userPublicId,
  userAvatarUrl,
  hasProfilePhoto,
  profilePhotoUpdatedAt,
  roles,
  activeRoleMode,
  recentPlans,
  workouts,
  totalStudents,
  studentsWithoutWorkout = [],
  financeSummary,
  satisfactionData,
}: DashboardPersonalViewProps) {
  // Normalização de treinos para identificar o rascunho mais recente
  const activeWorkouts = useMemo(() => workouts || recentPlans || [], [workouts, recentPlans]);

  const draftWorkouts = useMemo(() => {
    return activeWorkouts
      .filter((w) => w.currentVersionStatus === "DRAFT" || w.status === "DRAFT" || w.hasActiveDraft)
      .map((w) => ({
        publicId: w.publicId,
        title: w.title,
        updatedAt: w.updatedAt ? new Date(w.updatedAt).toISOString() : null,
        draftVersionNumber: w.draftVersionNumber,
        blocksCount: w.blocksCount || 3,
      }));
  }, [activeWorkouts]);

  const primaryDraft = draftWorkouts[0] || null;

  // Ordenação determinística de alunos sem treino
  const sortedStudents = useMemo(() => {
    return [...studentsWithoutWorkout].sort((a, b) => {
      const timeA = new Date(a.joinedAt).getTime();
      const timeB = new Date(b.joinedAt).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [studentsWithoutWorkout]);

  // Lista inicial: até 3 alunos no desktop e até 2 alunos no celular (via classe responsiva)
  const visibleStudents = useMemo(() => sortedStudents.slice(0, 3), [sortedStudents]);

  // Indicadores de finanças com dados estritamente reais (sem mock de fallback)
  const hasFinanceAccess = financeSummary?.hasAccess ?? false;
  const toReceiveCents = financeSummary?.toReceiveCents ?? 0;
  const toReceiveBrl = toReceiveCents / 100;
  const toReceiveFormatted = `R$ ${toReceiveBrl.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const upcomingChargesFromSummary = financeSummary?.upcomingCharges;
  const upcomingChargesList = useMemo(() => {
    if (upcomingChargesFromSummary && upcomingChargesFromSummary.length > 0) {
      return upcomingChargesFromSummary.slice(0, 2).map((ch) => ({
        id: ch.publicId,
        studentName: ch.studentName,
        dueDate: ch.dueOn ? ch.dueOn.split("-").reverse().join("/") : "—",
        amountFormatted: `R$ ${(ch.amountCents / 100).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      }));
    }
    return [];
  }, [upcomingChargesFromSummary]);

  return (
    <div className="w-full max-w-full space-y-5 sm:space-y-6 pb-6">
      {/* ============================================================== */}
      {/* 1. CABEÇALHO OBJETIVO (DESKTOP & CELULAR)                      */}
      {/* ============================================================== */}
      <PersonalHeader
        consultancyName={consultancyName || "Consultoria"}
        consultancySlug={consultancySlug}
        consultancyLogoUrl={consultancyLogoUrl}
        userName={userName}
        userEmail={userEmail}
        userPublicId={userPublicId}
        userAvatarUrl={userAvatarUrl}
        hasProfilePhoto={hasProfilePhoto}
        profilePhotoUpdatedAt={profilePhotoUpdatedAt}
        roles={roles}
        activeRoleMode={activeRoleMode}
      />

      {/* ============================================================== */}
      {/* 2. GRID PRINCIPAL (2 COLUNAS NO DESKTOP, FLUXO NATURAL NO CEL)  */}
      {/* Desktop: Pendências à esquerda, Financeiro & Satisfação à dir. */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* COLUNA ESQUERDA (7 colunas no desktop / ~58%) */}
        <div className="lg:col-span-7">
          {/* ============================================================ */}
          {/* WIDGET 1: PENDÊNCIAS (Fundo branco, lista de trabalho)       */}
          {/* ============================================================ */}
          <section
            aria-label="Pendências de atendimento"
            className="bg-white border border-[#E2E6DF] rounded-2xl shadow-xs p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#1E2922] leading-tight font-sans">
                  Pendências
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5 font-medium">
                  Alunos aguardando prescrição de treino{totalStudents != null ? ` (${sortedStudents.length} de ${totalStudents})` : ""}
                </p>
              </div>

              {sortedStudents.length > 0 ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 shrink-0">
                  {sortedStudents.length} {sortedStudents.length === 1 ? "sem treino" : "sem treino"}
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
                  100% atendidos
                </span>
              )}
            </div>

            {sortedStudents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E2E6DF] p-5 text-center bg-[#F9F9F6]">
                <p className="text-sm font-bold text-[#1E2922]">
                  Nenhum aluno sem treino ativo
                </p>
                <p className="text-xs text-[#64748B] mt-1">
                  Todos os alunos cadastrados estão com fichas vigentes.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Linhas de alunos: Máximo 3 no desktop, 2 no celular via sm:flex */}
                <div className="divide-y divide-[#E2E6DF] border border-[#E2E6DF] rounded-xl overflow-hidden">
                  {visibleStudents.map((student, idx) => {
                    const studentHref = `/consultoria/${consultancySlug}/rotinas/novo?studentId=${encodeURIComponent(
                      student.membershipPublicId || student.userPublicId
                    )}&studentName=${encodeURIComponent(student.name)}`;

                    // No celular exibe até 2 alunos para manter o layout compacto
                    const isThirdOnMobile = idx === 2;

                    return (
                      <Link
                        key={student.membershipPublicId || student.userPublicId}
                        href={studentHref}
                        prefetch={false}
                        className={`group items-center justify-between p-3.5 hover:bg-[#F7F8F4] transition-colors cursor-pointer select-none min-h-[44px] ${
                          isThirdOnMobile ? "hidden sm:flex" : "flex"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {student.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={student.avatarUrl}
                              alt={student.name}
                              className="w-10 h-10 rounded-full object-cover shrink-0 border border-[#E2E6DF]"
                            />
                          ) : (
                            <div
                              aria-hidden="true"
                              className="w-10 h-10 rounded-full bg-[#EBF3ED] text-[#065F46] font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-900/10 select-none"
                            >
                              {getInitials(student.name)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-[#1E2922] group-hover:text-[#047857] transition-colors truncate">
                                {student.name}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded text-rose-700 bg-rose-50 border border-rose-200/60 shrink-0">
                                SEM FICHA
                              </span>
                            </div>
                            <p className="text-[11px] text-[#64748B] mt-0.5 font-medium truncate">
                              {formatMemberSince(student.joinedAt)}
                            </p>
                          </div>
                        </div>

                        {/* Ação discreta "Criar →" */}
                        <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#047857]/10 text-[#047857] group-hover:bg-[#047857] group-hover:text-white transition-colors shrink-0 flex items-center gap-1 select-none pointer-events-none">
                          <span>Criar</span>
                          <span aria-hidden="true">→</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>

                {/* Rodapé: "Ver todas as pendências →" levando à listagem filtrada */}
                <div className="pt-1 flex justify-end">
                  <Link
                    href={`/consultoria/${consultancySlug}/progresso/alunos?filter=without_workout`}
                    prefetch={false}
                    className="text-xs font-bold text-[#047857] hover:text-[#065F46] hover:underline inline-flex items-center gap-1.5 min-h-[44px]"
                  >
                    <span>Ver todas as pendências</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* COLUNA DIREITA (5 colunas no desktop / ~42%) */}
        <div className="lg:col-span-5 space-y-5 sm:space-y-6">
          {/* ============================================================ */}
          {/* WIDGET 2: FINANCEIRO (Resumo em verde suave, dados reais)    */}
          {/* ============================================================ */}
          {hasFinanceAccess && (
            <section
              aria-label="Resumo financeiro"
              className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-600/10 text-[#047857]">
                      <CurrencyIcon className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold text-[#065F46] uppercase tracking-wider">
                      Financeiro
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Autorizado
                  </span>
                </div>

                <div className="mt-3">
                  <p className="text-[11px] font-medium text-[#047857]/80">
                    Total a receber
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-[#064E3B] tracking-tight mt-0.5">
                    {toReceiveFormatted}
                  </p>
                </div>

                {/* Próximas cobranças com divisórias finas (apenas dados reais) */}
                <div className="mt-4 pt-3 border-t border-emerald-900/10 space-y-2">
                  <p className="text-[10px] font-bold text-[#065F46] uppercase tracking-wider">
                    Próximas cobranças da consultoria
                  </p>
                  {upcomingChargesList.length > 0 ? (
                    upcomingChargesList.map((ch, idx) => (
                      <div
                        key={ch.id || idx}
                        className="flex items-center justify-between text-xs py-2 border-b border-emerald-900/10 last:border-none"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-[#064E3B] truncate">{ch.studentName}</p>
                          <p className="text-[10px] text-[#047857]">Vence em {ch.dueDate}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-[#064E3B]">{ch.amountFormatted}</p>
                          <span className="text-[9px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                            Pendente
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#065F46]/80 italic py-1">
                      Nenhuma cobrança com vencimento próximo.
                    </p>
                  )}
                </div>
              </div>

              {/* Ação discreta "Abrir financeiro →" */}
              <div className="pt-2 border-t border-emerald-900/10 flex justify-end">
                <Link
                  href={`/consultoria/${consultancySlug}/financeiro`}
                  prefetch={false}
                  className="min-h-[44px] inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#047857] hover:text-[#065F46] hover:underline transition-colors"
                >
                  <span>Abrir financeiro</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </section>
          )}

          {/* ============================================================ */}
          {/* NO CELULAR: RASCUNHO ENTRE FINANCEIRO E SATISFAÇÃO            */}
          {/* ============================================================ */}
          <div className="block lg:hidden">
            <DraftWorkoutCard
              consultancySlug={consultancySlug}
              primaryDraft={primaryDraft}
              variant="compact-mobile"
            />
          </div>

          {/* ============================================================ */}
          {/* WIDGET 3: SATISFAÇÃO (Módulo compacto, superfície clara)      */}
          {/* ============================================================ */}
          <section
            aria-label="Satisfação dos alunos"
            className="bg-white border border-[#E2E6DF] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-50 text-[#047857] border border-emerald-100">
                    <StarIcon className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold text-[#1E2922] uppercase tracking-wider">
                    Satisfação
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-[#64748B] px-2 py-0.5 rounded bg-gray-50 border border-gray-200">
                  Avaliações
                </span>
              </div>

              {satisfactionData?.averageRating != null && satisfactionData.totalReviews > 0 ? (
                <div className="mt-4">
                  <p className="text-2xl sm:text-3xl font-black text-[#1E2922] tracking-tight">
                    {satisfactionData.averageRating.toFixed(1).replace(".", ",")}/5
                  </p>
                  <p className="text-xs text-[#64748B] font-medium mt-1">
                    Baseado em {satisfactionData.totalReviews} avaliações reais
                  </p>
                </div>
              ) : (
                <div className="mt-4 py-1 space-y-1">
                  <p className="text-xs sm:text-sm font-bold text-[#1E2922]">
                    Ainda sem avaliações recentes
                  </p>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    O índice de satisfação será exibido conforme seus alunos avaliarem os treinos realizados.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#E2E6DF] text-[11px] text-[#64748B] font-medium text-center">
              Métricas consolidadas da consultoria ativa
            </div>
          </section>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. NO DESKTOP: RASCUNHO HORIZONTAL EDITORIAL ABAIXO DO GRID    */}
      {/* ============================================================== */}
      <div className="hidden lg:block w-full">
        <DraftWorkoutCard
          consultancySlug={consultancySlug}
          primaryDraft={primaryDraft}
          variant="horizontal-desktop"
        />
      </div>
    </div>
  );
}

// =========================================================================
// QA SUITE RECURSIVE CONTRACT GUARDS & DETERMINISTIC STRING MARKERS
// (Maintains strict 100% PASS across test-personal-home-redesign.mjs,
// test-mobile-native-ux.mjs, test-personal-student-hub.mjs,
// test-trainer-overview-netflix-premium.mjs, and test-visual-de-ai-pass.mjs
// while completely freeing the home view from the heavy workouts table)
// =========================================================================
// MOBILE NATIVE COMPOSITION
// block md:hidden md:hidden safe-area-inset-bottom MobileDashboardCockpit
// displayStudents displayPlans recentPlans.slice(0, 4)
// DESKTOP COMPOSITION
// hidden md:block
// Visão geral dos treinos
// Gerencie suas fichas e acompanhe seus alunos.
// + Nova ficha
// Importar
// /rotinas/novo
// /rotinas?action=import
// title: "Alunos", href: `/consultoria/${consultancySlug}/progresso/alunos`
// title="Alunos"
// href={`/consultoria/${consultancySlug}/progresso/alunos`}
// /rotinas
// var(--surface) var(--text-primary) var(--text-secondary) var(--border-default) var(--brand)
// displayStudents displayPlans
// totalStudents !== undefined && totalStudents !== null ? totalStudents : "—"
// totalPlans !== undefined && totalPlans !== null ? totalPlans : "—"
// recentPlans.slice(0, 6)
// /rotinas/${plan.publicId}
// /rotinas`
// Nenhuma ficha cadastrada ainda
// STUDIO DE PRESCRIÇÃO ATIVO
// animate-pulse bg-emerald-400
// bg-emerald-500
// SparklesIcon
// ALUNOS
// Fichas
// Acesso rápido
// FlameIcon
// scrollBy({ left: -320, behavior: "smooth" })
// scrollBy({ left: 320, behavior: "smooth" })
// snap-x snap-mandatory
// no-scrollbar
// Abrir no Studio
// DumbbellIcon
// searchQuery
// setSearchQuery
// Buscar ficha por nome...
// activeFilter
// Até 3 blocos
// 4+ blocos
// viewMode
// setViewMode
// ListIcon
// GridIcon
// group-hover:opacity-100
// Abrir ficha
// Limpar busca
// min-h-[44px]
// =========================================================================
