"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/account/user-avatar";
import {
  MobileTabs,
  MobileCard,
  MobileActionSheet,
  MobileEmptyState,
  MobilePageHeader,
  type ActionSheetOption,
} from "@/components/ui/mobile";
import { PersonalRequestModal, type RequestModalType } from "./personal-request-modal";
import { StudentNewWorkoutSheet } from "./student-new-workout-sheet";
import type { StudentEvaluationResult } from "@/lib/monitoring/evaluator";
import type {
  PersonalStudentDetail,
  StudentFormAnswer,
} from "@/lib/consultancies/personal-student-hub";

interface PersonalStudentDetailViewProps {
  consultancySlug: string;
  detail: PersonalStudentDetail;
  studentMonitoring?: StudentEvaluationResult | null;
  effectiveMode?: string;
  userRoles?: string[];
}

type TabKey = "visao-geral" | "radar" | "fotos" | "anamnese" | "formularios" | "treinos" | "avaliacoes";
type MobileTabKey = "resumo" | "treinos" | "nutricao" | "evolucao" | "mais";

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
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

function PhotoIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function FileTextIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function ClipboardCheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function ScaleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
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

function XIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function PersonalStudentDetailView({
  consultancySlug,
  detail,
  studentMonitoring,
  effectiveMode,
  userRoles = [],
}: PersonalStudentDetailViewProps) {
  const router = useRouter();
  const {
    student,
    overview,
    photos,
    anamnesis,
    forms,
    workouts,
    completedSessions,
    measurements,
    nutrition = [],
  } = detail;

  // Desktop active tab
  const [activeTab, setActiveTab] = useState<TabKey>("visao-geral");

  // Mobile active tab
  const [mobileTab, setMobileTab] = useState<MobileTabKey>("resumo");

  const [selectedFormForModal, setSelectedFormForModal] = useState<StudentFormAnswer | null>(null);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
  const [isNewWorkoutSheetOpen, setIsNewWorkoutSheetOpen] = useState(false);
  const [requestModal, setRequestModal] = useState<{ isOpen: boolean; type: RequestModalType }>({
    isOpen: false,
    type: "PHOTOS",
  });

  const isNutritionist = effectiveMode === "NUTRITIONIST" || userRoles.includes("NUTRITIONIST");
  const isPersonal = effectiveMode === "PERSONAL" || userRoles.includes("PERSONAL");
  const isAdmin = effectiveMode === "ADMIN" || effectiveMode === "CONSULTANCY_ADMIN" || userRoles.includes("CONSULTANCY_ADMIN");

  const createWorkoutHref = `/consultoria/${consultancySlug}/rotinas/novo?student=${student.membershipPublicId}`;
  const createPlanHref = `/consultoria/${consultancySlug}/planos-v2/novo?student=${student.membershipPublicId}`;

  // Desktop tabs list
  const desktopTabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }> = [
    { key: "visao-geral", label: "Visão Geral", icon: FileTextIcon },
    { key: "fotos", label: "Fotos", icon: PhotoIcon, count: photos.length },
    { key: "anamnese", label: "Anamnese", icon: ClipboardCheckIcon },
    { key: "formularios", label: "Formulários", icon: FileTextIcon, count: forms.length },
    { key: "treinos", label: "Treinos", icon: DumbbellIcon, count: workouts.length },
  ];

  if (measurements.length > 0) {
    desktopTabs.push({ key: "avaliacoes", label: "Avaliações", icon: ScaleIcon, count: measurements.length });
  }

  // Active workout
  const activeWorkout = workouts.find((w) => w.status === "ACTIVE") || (workouts.length > 0 ? workouts[0] : null);
  // Active nutrition plan
  const activeNutritionPlan = nutrition.find((n) => n.status === "ACTIVE") || (nutrition.length > 0 ? nutrition[0] : null);

  // Mobile action sheet options
  const mobileActionSheetOptions: ActionSheetOption[] = [
    ...(isPersonal || isAdmin
      ? [
          {
            id: "new-workout",
            label: "Criar novo treino",
            icon: <DumbbellIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
            onClick: () => setIsNewWorkoutSheetOpen(true),
          },
        ]
      : []),
    ...(isNutritionist || isAdmin
      ? [
          {
            id: "new-plan",
            label: "Criar plano alimentar",
            icon: <AppleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
            onClick: () => router.push(createPlanHref),
          },
        ]
      : []),
    {
      id: "req-photos",
      label: "Solicitar fotos de evolução",
      icon: <PhotoIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      onClick: () => setRequestModal({ isOpen: true, type: "PHOTOS" }),
    },
    {
      id: "req-anamnesis",
      label: "Solicitar anamnese",
      icon: <ClipboardCheckIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      onClick: () => setRequestModal({ isOpen: true, type: "ANAMNESIS" }),
    },
    {
      id: "req-form",
      label: "Solicitar questionário / formulário",
      icon: <FileTextIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      onClick: () => setRequestModal({ isOpen: true, type: "FORM" }),
    },
    ...(student.email
      ? [
          {
            id: "email-student",
            label: "Enviar e-mail para o aluno",
            icon: <span className="text-base">✉</span>,
            onClick: () => {
              window.location.href = `mailto:${student.email}`;
            },
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* =========================================================================
          MOBILE-NATIVE STUDENT PROFILE VIEW (md:hidden)
          No infinite scroll, 4-tab thumb navigation, dedicated header & actions
          ========================================================================= */}
      <div className="md:hidden space-y-4" data-testid="mobile-student-profile">
        {/* Mobile Page Header with prominent Back touch target & More button */}
        <MobilePageHeader
          backHref={`/consultoria/${consultancySlug}/progresso/alunos`}
          backLabel="Alunos"
          eyebrow="Perfil do Aluno"
          title={student.name}
          subtitle={overview.objective || "Aluno ativo"}
          actions={
            <button
              type="button"
              aria-label="Mais opções do aluno"
              onClick={() => setIsMobileActionSheetOpen(true)}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
            >
              <MoreDotsIcon className="w-5 h-5" />
            </button>
          }
        />

        {/* Mobile Student Hero Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3.5 depth-surface">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <UserAvatar
                fullName={student.name}
                userPublicId={student.userPublicId}
                size="lg"
                className="shrink-0 shadow-xs"
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <h1 className="font-heading text-base font-bold text-[var(--text-primary)] truncate">
                  {student.name}
                </h1>
                <p className="text-[11px] text-[var(--text-secondary)] truncate">
                  {student.email}
                </p>
                {student.phone && (
                  <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                    {student.phone}
                  </p>
                )}
              </div>
            </div>

            <Badge variant="success" size="sm" className="shrink-0 font-bold text-[10px]">
              Ativo
            </Badge>
          </div>

          {/* Objective Tag & Quick Status */}
          {overview.objective && (
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs">
              <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
                Objetivo:
              </span>
              <span className="font-medium text-[var(--text-primary)] truncate">
                {overview.objective}
              </span>
            </div>
          )}

          {/* Primary Mobile Contextual Action (>= 48px touch target) */}
          <div className="flex items-center gap-2 pt-0.5">
            {isNutritionist && !isPersonal ? (
              <Link
                href={createPlanHref}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[48px] shadow-sm depth-interactive cursor-pointer"
              >
                <AppleIcon className="w-4 h-4" />
                <span>+ Criar plano alimentar</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setIsNewWorkoutSheetOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[48px] shadow-sm depth-interactive cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" />
                <span>+ Criar treino</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMobileActionSheetOpen(true)}
              aria-label="Ações secundárias do aluno"
              className="inline-flex items-center justify-center p-3 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] min-h-[48px] min-w-[48px] cursor-pointer shrink-0"
            >
              <MoreDotsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Tabs: 4-5 focused categories >= 44px touch targets */}
        <MobileTabs
          tabs={[
            { id: "resumo", label: "Resumo", icon: <FileTextIcon className="w-4 h-4" /> },
            { id: "treinos", label: "Treinos", icon: <DumbbellIcon className="w-4 h-4" />, count: workouts.length },
            { id: "nutricao", label: "Nutrição", icon: <AppleIcon className="w-4 h-4" />, count: nutrition.length },
            { id: "evolucao", label: "Evolução", icon: <ScaleIcon className="w-4 h-4" />, count: measurements.length + photos.length },
            { id: "mais", label: "Mais", icon: <MoreDotsIcon className="w-4 h-4" />, count: forms.length + (anamnesis.length > 0 ? 1 : 0) },
          ]}
          activeId={mobileTab}
          onChange={(id) => setMobileTab(id as MobileTabKey)}
        />

        {/* =====================================================================
            MOBILE TAB 1: RESUMO (Quick overview, key status, no infinite scroll)
            ===================================================================== */}
        {mobileTab === "resumo" && (
          <div className="space-y-3.5" data-testid="mobile-tab-resumo">
            {/* Radar / Alert Banner (if any) */}
            {studentMonitoring && studentMonitoring.state !== "OK" && (
              <div
                className={`p-3.5 rounded-2xl border space-y-1.5 ${
                  studentMonitoring.state === "CRITICAL"
                    ? "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {studentMonitoring.state === "CRITICAL" ? "Alerta Crítico" : "Requer Atenção"}
                  </span>
                  <Badge variant={studentMonitoring.state === "CRITICAL" ? "danger" : "warning"} size="sm">
                    Radar
                  </Badge>
                </div>
                <p className="text-xs font-semibold">
                  {studentMonitoring.alerts.find((a) => a.status === "OPEN")?.statement ||
                    "Aluno com queda de frequência ou pendências registradas."}
                </p>
              </div>
            )}

            {/* Quick Metrics 2x2 Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                  Peso Atual
                </span>
                <p className="text-base font-bold text-[var(--text-primary)]">
                  {overview.weightKg ? `${overview.weightKg} kg` : "—"}
                </p>
                {overview.lastWeightRecordedOn && (
                  <p className="text-[10px] text-[var(--text-secondary)]">em {overview.lastWeightRecordedOn}</p>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                  Altura
                </span>
                <p className="text-base font-bold text-[var(--text-primary)]">
                  {overview.heightCm ? `${overview.heightCm} cm` : "—"}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                  Idade
                </span>
                <p className="text-base font-bold text-[var(--text-primary)]">
                  {overview.age ? `${overview.age} anos` : "—"}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                  Sessões Feitas
                </span>
                <p className="text-base font-bold text-[var(--text-primary)]">
                  {overview.completedWorkoutsCount}
                </p>
              </div>
            </div>

            {/* Treino Atual Card */}
            <MobileCard className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                  <DumbbellIcon className="w-4 h-4 text-[var(--brand)]" />
                  <span>Treino Atual</span>
                </div>
                <Badge variant={activeWorkout ? "success" : "neutral"} size="sm">
                  {activeWorkout ? "Ativo" : "Sem treino"}
                </Badge>
              </div>

              {activeWorkout ? (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {activeWorkout.title}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Versão {activeWorkout.versionNumber} • Início: {activeWorkout.startsOn}
                  </p>
                  <Link
                    href={`/consultoria/${consultancySlug}/rotinas/${activeWorkout.workoutPublicId}?version=${activeWorkout.versionPublicId}&student=${student.membershipPublicId}`}
                    className="w-full inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px] transition-colors"
                  >
                    <span>Abrir no Criador</span>
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Nenhum treino prescrito no momento.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsNewWorkoutSheetOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px] transition-colors cursor-pointer"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>+ Prescrever treino</span>
                  </button>
                </div>
              )}
            </MobileCard>

            {/* Nutrição / Plano Alimentar Card */}
            <MobileCard className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                  <AppleIcon className="w-4 h-4 text-amber-500" />
                  <span>Plano Alimentar</span>
                </div>
                <Badge variant={activeNutritionPlan ? "success" : "neutral"} size="sm">
                  {activeNutritionPlan ? "Ativo" : "Sem plano"}
                </Badge>
              </div>

              {activeNutritionPlan ? (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {activeNutritionPlan.title}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Versão {activeNutritionPlan.versionNumber} • Início: {activeNutritionPlan.startsOn}
                  </p>
                  <Link
                    href={`/consultoria/${consultancySlug}/planos-v2/${activeNutritionPlan.planPublicId}`}
                    className="w-full inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl font-bold text-xs text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] min-h-[44px] transition-colors"
                  >
                    <span>Ver plano alimentar</span>
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Nenhum plano alimentar prescrito no momento.
                  </p>
                  <Link
                    href={createPlanHref}
                    className="w-full inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl font-bold text-xs text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] min-h-[44px] transition-colors"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>+ Prescrever plano alimentar</span>
                  </Link>
                </div>
              )}
            </MobileCard>

            {/* Evolução & Fotos Summary Card */}
            <MobileCard className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                  <ScaleIcon className="w-4 h-4 text-blue-500" />
                  <span>Evolução &amp; Fotos</span>
                </div>
                <Badge variant={photos.length > 0 ? "brand" : "neutral"} size="sm">
                  {photos.length} avaliação(ões)
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {photos.length > 0
                    ? `${photos.length} envio(s) de fotos e ${measurements.length} registro(s) de medidas corporais.`
                    : "Nenhuma avaliação fotográfica anexada até o momento."}
                </p>
                <button
                  type="button"
                  onClick={() => setMobileTab("evolucao")}
                  className="w-full inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl font-bold text-xs text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] min-h-[44px] transition-colors cursor-pointer"
                >
                  <span>Ver evolução e fotos</span>
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </MobileCard>
          </div>
        )}

        {/* =====================================================================
            MOBILE TAB 2: TREINOS (Prescribed workouts & execution history)
            ===================================================================== */}
        {mobileTab === "treinos" && (
          <div className="space-y-4" data-testid="mobile-tab-treinos">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                Rotinas de Treino ({workouts.length})
              </h2>
              <button
                type="button"
                onClick={() => setIsNewWorkoutSheetOpen(true)}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px] shadow-xs cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>+ Criar treino</span>
              </button>
            </div>

            {workouts.length === 0 ? (
              <MobileEmptyState
                title="Nenhum treino prescrito"
                description="Monte o primeiro treino personalizado do aluno usando o Criador Modular."
                icon={<DumbbellIcon className="w-7 h-7 text-[var(--brand)]" />}
                action={
                  <button
                    type="button"
                    onClick={() => setIsNewWorkoutSheetOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[48px] cursor-pointer"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Criar primeiro treino</span>
                  </button>
                }
              />
            ) : (
              <div className="space-y-3">
                {workouts.map((w) => (
                  <MobileCard key={w.assignmentPublicId} className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={w.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                        {w.status === "ACTIVE" ? "Em andamento" : "Encerrado"}
                      </Badge>
                      <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">
                        Versão {w.versionNumber}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        {w.title}
                      </h3>
                      {w.subtitle && (
                        <p className="text-xs text-[var(--text-secondary)]">{w.subtitle}</p>
                      )}
                    </div>

                    <div className="text-[11px] text-[var(--text-tertiary)] space-y-0.5">
                      <p>Início: {w.startsOn} {w.endsOn ? `• Término: ${w.endsOn}` : ""}</p>
                      {w.notesForStudent && (
                        <p className="italic text-[var(--text-secondary)] line-clamp-2">
                          &quot;{w.notesForStudent}&quot;
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/consultoria/${consultancySlug}/rotinas/${w.workoutPublicId}?version=${w.versionPublicId}&student=${student.membershipPublicId}`}
                      className="w-full inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px] transition-colors"
                    >
                      <span>Abrir no Criador</span>
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  </MobileCard>
                ))}
              </div>
            )}

            {/* Completed Execution Sessions */}
            {completedSessions.length > 0 && (
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-3">
                <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Histórico de Execuções ({completedSessions.length})
                </h3>
                <div className="divide-y divide-[var(--border-subtle)]">
                  {completedSessions.map((session) => (
                    <div key={session.publicId} className="py-2.5 flex items-center justify-between text-xs gap-2">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="font-bold text-[var(--text-primary)] truncate">
                          {session.workoutTitle}
                        </p>
                        <p className="text-[10px] text-[var(--text-tertiary)]">
                          {new Date(session.completedAt).toLocaleDateString("pt-BR")} às{" "}
                          {new Date(session.completedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <Badge variant="success" size="sm" className="shrink-0 text-[10px]">
                        {session.completedSetsCount} séries
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            MOBILE TAB 3: NUTRIÇÃO (Nutrition plans & prescribed diets)
            ===================================================================== */}
        {mobileTab === "nutricao" && (
          <div className="space-y-4" data-testid="mobile-tab-nutricao">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                Planos Nutricionais ({nutrition.length})
              </h2>
              <Link
                href={createPlanHref}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px] shadow-xs cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>+ Criar plano</span>
              </Link>
            </div>

            {nutrition.length === 0 ? (
              <MobileEmptyState
                title="Nenhum plano alimentar"
                description="Prescreva um cardápio ou plano alimentar nutricional para este aluno."
                icon={<AppleIcon className="w-7 h-7 text-amber-500" />}
                action={
                  <Link
                    href={createPlanHref}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[48px]"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Prescrever primeiro plano</span>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {nutrition.map((n) => (
                  <MobileCard key={n.assignmentPublicId} className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={n.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                        {n.status === "ACTIVE" ? "Ativo" : "Encerrado"}
                      </Badge>
                      <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">
                        Versão {n.versionNumber}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        {n.title}
                      </h3>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Início: {n.startsOn} {n.endsOn ? `• Término: ${n.endsOn}` : ""}
                      </p>
                    </div>

                    {n.notesForStudent && (
                      <p className="text-[11px] italic text-[var(--text-tertiary)] line-clamp-2">
                        &quot;{n.notesForStudent}&quot;
                      </p>
                    )}

                    <Link
                      href={`/consultoria/${consultancySlug}/planos-v2/${n.planPublicId}`}
                      className="w-full inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl font-bold text-xs text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] min-h-[44px] transition-colors"
                    >
                      <span>Abrir plano alimentar</span>
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  </MobileCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            MOBILE TAB 4: EVOLUÇÃO (Measurements & standardized photos)
            ===================================================================== */}
        {mobileTab === "evolucao" && (
          <div className="space-y-4" data-testid="mobile-tab-evolucao">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                Evolução &amp; Avaliações
              </h2>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setRequestModal({ isOpen: true, type: "PHOTOS" })}
                className="font-bold min-h-[44px] text-xs"
              >
                + Solicitar fotos
              </Button>
            </div>

            {/* Medições corporais (Individual touch cards, no broken horizontal table) */}
            {measurements.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] block">
                  Medições Recentes ({measurements.length})
                </span>
                {measurements.map((m, idx) => (
                  <MobileCard key={`${m.recordedOn}-${idx}`} className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[var(--text-primary)]">
                        {m.recordedOn}
                      </span>
                      {m.weightKg && (
                        <span className="font-extrabold text-sm text-[var(--brand)]">
                          {m.weightKg} kg
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-[var(--text-secondary)] pt-1 border-t border-[var(--border-subtle)]">
                      {m.waistCm && <div>Cintura: <span className="font-semibold text-[var(--text-primary)]">{m.waistCm}cm</span></div>}
                      {m.abdomenCm && <div>Abdômen: <span className="font-semibold text-[var(--text-primary)]">{m.abdomenCm}cm</span></div>}
                      {m.hipCm && <div>Quadril: <span className="font-semibold text-[var(--text-primary)]">{m.hipCm}cm</span></div>}
                      {m.armCm && <div>Braço: <span className="font-semibold text-[var(--text-primary)]">{m.armCm}cm</span></div>}
                      {m.thighCm && <div>Coxa: <span className="font-semibold text-[var(--text-primary)]">{m.thighCm}cm</span></div>}
                    </div>
                    {m.note && (
                      <p className="text-[10px] text-[var(--text-tertiary)] italic">{m.note}</p>
                    )}
                  </MobileCard>
                ))}
              </div>
            )}

            {/* Fotos de Evolução */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] block">
                Fotos de Evolução ({photos.length})
              </span>

              {photos.length === 0 ? (
                <MobileEmptyState
                  title="Nenhuma foto registrada"
                  description="Solicite as 4 fotos padronizadas do aluno para acompanhar a evolução corporal."
                  icon={<PhotoIcon className="w-7 h-7 text-blue-500" />}
                  action={
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setRequestModal({ isOpen: true, type: "PHOTOS" })}
                      className="w-full min-h-[48px] font-bold text-xs"
                    >
                      Solicitar fotos
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {photos.map((item, idx) => (
                    <MobileCard key={item.requestPublicId} className="space-y-3">
                      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          Avaliação #{photos.length - idx}
                        </span>
                        <Badge variant={item.status === "APPROVED" ? "success" : "neutral"} size="sm">
                          {item.status === "APPROVED" ? "Aprovada" : item.status}
                        </Badge>
                      </div>

                      {/* 2x2 grid of poses for mobile */}
                      <div className="grid grid-cols-2 gap-2">
                        {item.images.map((img) => (
                          <div
                            key={img.imagePublicId}
                            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-1.5 space-y-1 overflow-hidden"
                          >
                            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-black/5 relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={img.imageUrl}
                                alt={`Pose ${img.pose}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            <p className="text-[10px] font-semibold text-[var(--text-secondary)] text-center capitalize">
                              {img.pose.replace(/_/g, " ")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </MobileCard>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            MOBILE TAB 5: MAIS (Anamnese, Questionários, Dados Cadastrais)
            ===================================================================== */}
        {mobileTab === "mais" && (
          <div className="space-y-4" data-testid="mobile-tab-mais">
            {/* Anamnese Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Anamnese &amp; Histórico
                </h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRequestModal({ isOpen: true, type: "ANAMNESIS" })}
                  className="font-bold min-h-[40px] text-[11px]"
                >
                  {anamnesis.length === 0 ? "Solicitar" : "Atualizar"}
                </Button>
              </div>

              {anamnesis.length === 0 ? (
                <MobileEmptyState
                  title="Anamnese pendente"
                  description="Solicite o preenchimento da anamnese médica e rotina do aluno."
                  icon={<ClipboardCheckIcon className="w-7 h-7 text-purple-500" />}
                />
              ) : (
                <div className="space-y-2.5">
                  {anamnesis.map((section) => (
                    <MobileCard key={section.title} className="space-y-2.5">
                      <h4 className="text-[11px] font-bold text-[var(--brand)] uppercase tracking-wider border-b border-[var(--border-subtle)] pb-1.5">
                        {section.title}
                      </h4>
                      <div className="space-y-2">
                        {section.items.map((item) => (
                          <div key={item.label} className="space-y-0.5">
                            <span className="text-[10px] font-semibold text-[var(--text-tertiary)] block">
                              {item.label}
                            </span>
                            <p className="text-xs font-medium text-[var(--text-primary)] leading-relaxed">
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </MobileCard>
                  ))}
                </div>
              )}
            </div>

            {/* Formulários Section */}
            <div className="space-y-2.5 pt-2 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Formulários ({forms.length})
                </h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRequestModal({ isOpen: true, type: "FORM" })}
                  className="font-bold min-h-[40px] text-[11px]"
                >
                  + Solicitar
                </Button>
              </div>

              {forms.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] italic">
                  Nenhum questionário respondido.
                </p>
              ) : (
                <div className="space-y-2">
                  {forms.map((form) => (
                    <MobileCard key={form.id} className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          {form.title}
                        </span>
                        <Badge variant="success" size="sm" className="text-[10px]">
                          {form.status}
                        </Badge>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFormForModal(form)}
                        className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-[var(--brand)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] min-h-[44px] cursor-pointer"
                      >
                        <span>Ver respostas</span>
                        <ChevronRightIcon className="w-3.5 h-3.5" />
                      </button>
                    </MobileCard>
                  ))}
                </div>
              )}
            </div>

            {/* Dados Cadastrais Section */}
            <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2 pt-3">
              <h3 className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                Dados Cadastrais
              </h3>
              <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                <p>Nome: <span className="font-semibold text-[var(--text-primary)]">{student.name}</span></p>
                <p>E-mail: <span className="font-semibold text-[var(--text-primary)]">{student.email}</span></p>
                {student.phone && <p>Telefone: <span className="font-semibold text-[var(--text-primary)]">{student.phone}</span></p>}
                <p>Status: <span className="font-semibold text-emerald-600 dark:text-emerald-400">Ativo</span></p>
                <p>Membro desde: <span className="font-semibold text-[var(--text-primary)]">{new Date(student.joinedAt).toLocaleDateString("pt-BR")}</span></p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          DESKTOP-PRESERVED STUDENT PROFILE VIEW (hidden md:block)
          Preserved 100% without modification for desktop screens
          ========================================================================= */}
      <div className="hidden md:block space-y-6 sm:space-y-8">
        {/* Top Breadcrumb */}
        <div>
          <Link
            href={`/consultoria/${consultancySlug}/progresso/alunos`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-h-[36px] depth-interactive"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Voltar para lista de alunos</span>
          </Link>
        </div>

        {/* Header Cockpit Card */}
        <div className="p-6 sm:p-8 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs depth-surface flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            <UserAvatar
              fullName={student.name}
              userPublicId={student.userPublicId}
              size="xl"
              className="shrink-0 shadow-sm"
            />
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight truncate">
                  {student.name}
                </h1>
                <Badge variant="success" size="sm" className="font-semibold">
                  Aluno ativo
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] truncate">
                {student.email}
                {student.phone ? ` • ${student.phone}` : ""}
              </p>
            </div>
          </div>

          {/* Primary CTAs */}
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("treinos")}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-colors min-h-[44px] depth-interactive cursor-pointer"
            >
              <DumbbellIcon className="w-4 h-4 text-[var(--text-tertiary)]" />
              <span>Ver treinos</span>
            </button>

            <button
              type="button"
              onClick={() => setIsNewWorkoutSheetOpen(true)}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] transition-all min-h-[44px] shadow-sm depth-interactive cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>+ Criar treino</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Desktop aligned) */}
        <div className="border-b border-[var(--border-default)]">
          <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto scrollbar-none pb-px" aria-label="Abas do Aluno">
            {desktopTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer min-h-[44px] ${
                    isActive
                      ? "border-[var(--brand)] text-[var(--brand)] font-extrabold"
                      : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? "bg-[var(--brand)] text-[var(--text-inverse)]"
                          : "bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* TAB 1: VISÃO GERAL */}
        {activeTab === "visao-geral" && (
          <div className="space-y-6">
            {/* RADAR DO ALUNO: Objective monitoring signals */}
            {studentMonitoring && (
              <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs depth-surface space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
                        Monitoramento &amp; Aderência
                      </span>
                      <Badge
                        variant={
                          studentMonitoring.state === "CRITICAL"
                            ? "danger"
                            : studentMonitoring.state === "ATTENTION"
                            ? "warning"
                            : "success"
                        }
                        size="sm"
                      >
                        {studentMonitoring.state === "CRITICAL"
                          ? "Estado Crítico"
                          : studentMonitoring.state === "ATTENTION"
                          ? "Requer Atenção"
                          : "Em Dia"}
                      </Badge>
                    </div>
                    <h3 className="font-heading text-base font-bold text-[var(--text-primary)]">
                      Radar do Aluno
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("radar")}
                    className="text-xs font-semibold text-[var(--brand)] hover:underline cursor-pointer"
                  >
                    Ver relatório completo &rarr;
                  </button>
                </div>

                {/* Objective Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                    <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase block">
                      Último Uso no Trevo
                    </span>
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      {studentMonitoring.metrics.lastActiveAt
                        ? new Date(studentMonitoring.metrics.lastActiveAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Sem registro"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                    <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase block">
                      Treinos (7d)
                    </span>
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      {studentMonitoring.metrics.completedWorkoutsLast7d} concluído(s)
                    </p>
                    {studentMonitoring.metrics.lastWorkoutDate && (
                      <span className="text-[10px] text-[var(--text-tertiary)] block">
                        Último: {studentMonitoring.metrics.lastWorkoutDate}
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                    <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase block">
                      Check-ins (7d)
                    </span>
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      {studentMonitoring.metrics.recentCheckinsCount} registrado(s)
                    </p>
                    {studentMonitoring.metrics.painReportedCount > 0 && (
                      <span className="text-[10px] text-[var(--danger-foreground)] font-semibold block">
                        {studentMonitoring.metrics.painReportedCount} com dor
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                    <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase block">
                      Nutrição (7d)
                    </span>
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      {studentMonitoring.metrics.offPlanDietCount > 0
                        ? `${studentMonitoring.metrics.offPlanDietCount} fora do plano`
                        : "No plano ou sem desvios"}
                    </p>
                  </div>
                </div>

                {/* Open Alerts (if any) */}
                {studentMonitoring.alerts.filter((a) => a.status === "OPEN").length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-[var(--border-subtle)]">
                    <span className="text-[11px] font-bold text-[var(--text-primary)] block">
                      Alertas em Aberto
                    </span>
                    <div className="space-y-1.5">
                      {studentMonitoring.alerts
                        .filter((a) => a.status === "OPEN")
                        .map((alert) => (
                          <div
                            key={alert.id}
                            className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-start gap-2.5 text-xs"
                          >
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 shrink-0 ${
                                alert.severity === "CRITICAL"
                                  ? "bg-[var(--danger-soft)] text-[var(--danger-foreground)] border border-[var(--danger-border)]"
                                  : "bg-[var(--warning-soft)] text-[var(--warning-foreground)] border border-[var(--warning-border)]"
                              }`}
                            >
                              {alert.severity === "CRITICAL" ? "Crítico" : "Atenção"}
                            </span>
                            <span className="text-[var(--text-primary)] font-medium">
                              {alert.statement}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Key Objective Banner */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs depth-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
                  Foco &amp; Metas
                </span>
                <h2 className="font-heading text-lg font-bold text-[var(--text-primary)]">
                  {overview.objective || "Objetivo não especificado"}
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Definido durante o preenchimento da anamnese ou prescrição inicial.
                </p>
              </div>
              <Link
                href={createWorkoutHref}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[var(--brand)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-colors min-h-[44px] shrink-0"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Montar rotina</span>
              </Link>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs depth-surface space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Idade
                </span>
                <p className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                  {overview.age ? `${overview.age} anos` : "Não informada"}
                </p>
                {overview.birthDate && (
                  <p className="text-[11px] text-[var(--text-secondary)]">{overview.birthDate}</p>
                )}
              </div>

              <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs depth-surface space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Sexo
                </span>
                <p className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                  {overview.sex || "Não informado"}
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs depth-surface space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Altura
                </span>
                <p className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                  {overview.heightCm ? `${overview.heightCm} cm` : "Não informada"}
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs depth-surface space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Peso Atual
                </span>
                <p className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                  {overview.weightKg ? `${overview.weightKg} kg` : "Não informado"}
                </p>
                {overview.lastWeightRecordedOn && (
                  <p className="text-[11px] text-[var(--text-secondary)]">em {overview.lastWeightRecordedOn}</p>
                )}
              </div>
            </div>

            {/* Module Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              {/* Treinos Card */}
              <div className="p-5 rounded-2xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs depth-surface space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Rotinas de Treino
                    </span>
                    <Badge variant={overview.activeWorkoutsCount > 0 ? "brand" : "neutral"} size="sm">
                      {overview.activeWorkoutsCount} ativo(s)
                    </Badge>
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-1">
                    {overview.latestWorkoutTitle || "Nenhum treino prescrito"}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {overview.completedWorkoutsCount} {overview.completedWorkoutsCount === 1 ? "sessão concluída" : "sessões concluídas"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("treinos")}
                  className="text-xs font-bold text-[var(--brand)] hover:underline flex items-center gap-1 pt-1 min-h-[44px]"
                >
                  <span>Gerenciar treinos</span>
                  <span>→</span>
                </button>
              </div>

              {/* Anamnese Card */}
              <div className="p-5 rounded-2xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs depth-surface space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Anamnese &amp; Limitações
                    </span>
                    <Badge variant={overview.hasAnamnesis ? "success" : "warning"} size="sm">
                      {overview.hasAnamnesis ? "Preenchida" : "Pendente"}
                    </Badge>
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {overview.hasAnamnesis ? `${anamnesis.length} seções registradas` : "Aguardando preenchimento"}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {overview.hasAnamnesis ? "Histórico de saúde e rotina" : "O aluno ainda não preencheu"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("anamnese")}
                  className="text-xs font-bold text-[var(--brand)] hover:underline flex items-center gap-1 pt-1 min-h-[44px]"
                >
                  <span>Ver anamnese</span>
                  <span>→</span>
                </button>
              </div>

              {/* Fotos Card */}
              <div className="p-5 rounded-2xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs depth-surface space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Fotos de Evolução
                    </span>
                    <Badge variant={overview.hasPhotos ? "brand" : "neutral"} size="sm">
                      {photos.length} avaliação(ões)
                    </Badge>
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {overview.hasPhotos ? "Avaliações registradas" : "Nenhuma foto anexada"}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {overview.hasPhotos ? "Registros fotográficos padronizados" : "Fotos ainda não enviadas"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("fotos")}
                  className="text-xs font-bold text-[var(--brand)] hover:underline flex items-center gap-1 pt-1 min-h-[44px]"
                >
                  <span>Ver fotos</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FOTOS */}
        {activeTab === "fotos" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-heading text-sm font-bold text-[var(--text-primary)]">
                Registros Fotográficos de Evolução
              </h2>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setRequestModal({ isOpen: true, type: "PHOTOS" })}
                className="font-bold min-h-[44px]"
              >
                {photos.length === 0 ? "Solicitar fotos" : "+ Solicitar novas fotos"}
              </Button>
            </div>

            {photos.length === 0 ? (
              <div className="p-8 sm:p-12 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-4 shadow-xs depth-surface">
                <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-tertiary)]">
                  <PhotoIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <p className="font-heading text-sm font-bold text-[var(--text-primary)]">
                    Nenhuma foto registrada
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Solicite o envio das 4 fotos padronizadas para acompanhar visualmente a transformação do aluno.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setRequestModal({ isOpen: true, type: "PHOTOS" })}
                  className="font-bold min-h-[44px]"
                >
                  Solicitar fotos
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {photos.map((item, idx) => (
                  <div
                    key={item.requestPublicId}
                    className="p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs depth-surface space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading text-sm font-bold text-[var(--text-primary)]">
                            Avaliação #{photos.length - idx}
                          </h3>
                          <Badge
                            variant={item.status === "APPROVED" ? "success" : "neutral"}
                            size="sm"
                          >
                            {item.status === "APPROVED" ? "Aprovada" : item.status}
                          </Badge>
                        </div>
                        {item.submittedAt && (
                          <p className="text-xs text-[var(--text-secondary)]">
                            Enviada em {new Date(item.submittedAt).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                      {item.reviewerNotes && (
                        <p className="text-xs text-[var(--text-secondary)] italic">
                          Obs: {item.reviewerNotes}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {item.images.map((img) => {
                        const poseLabels: Record<string, string> = {
                          FRONT: "Frente",
                          BACK: "Costas",
                          SIDE_LEFT: "Lateral Esquerda",
                          SIDE_RIGHT: "Lateral Direita",
                        };
                        return (
                          <div
                            key={img.imagePublicId}
                            className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2 space-y-1.5 overflow-hidden"
                          >
                            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 relative flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={img.imageUrl}
                                alt={`Pose ${img.pose}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            <p className="text-[11px] font-semibold text-[var(--text-primary)] text-center">
                              {poseLabels[img.pose] || img.pose}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ANAMNESE */}
        {activeTab === "anamnese" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-heading text-sm font-bold text-[var(--text-primary)]">
                Anamnese &amp; Histórico Clínico
              </h2>
              <Button
                variant={anamnesis.length === 0 ? "primary" : "secondary"}
                size="sm"
                onClick={() => setRequestModal({ isOpen: true, type: "ANAMNESIS" })}
                className="font-bold min-h-[44px]"
              >
                {anamnesis.length === 0 ? "Solicitar anamnese" : "Solicitar atualização"}
              </Button>
            </div>

            {anamnesis.length === 0 ? (
              <div className="p-8 sm:p-12 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-4 shadow-xs depth-surface">
                <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-tertiary)]">
                  <ClipboardCheckIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <p className="font-heading text-sm font-bold text-[var(--text-primary)]">
                    Anamnese ainda não preenchida
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Solicite o preenchimento da anamnese para registrar o histórico de saúde, lesões, rotina e objetivos do aluno.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setRequestModal({ isOpen: true, type: "ANAMNESIS" })}
                  className="font-bold min-h-[44px]"
                >
                  Solicitar anamnese
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {anamnesis.map((section) => (
                  <div
                    key={section.title}
                    className="p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs depth-surface space-y-3.5"
                  >
                    <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--brand)] border-b border-[var(--border-subtle)] pb-2">
                      {section.title}
                    </h3>
                    <div className="space-y-3">
                      {section.items.map((item) => (
                        <div key={item.label} className="space-y-0.5">
                          <span className="text-[11px] font-semibold text-[var(--text-tertiary)] block">
                            {item.label}
                          </span>
                          <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)] leading-relaxed">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FORMULÁRIOS */}
        {activeTab === "formularios" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-heading text-sm font-bold text-[var(--text-primary)]">
                Formulários &amp; Questionários
              </h2>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setRequestModal({ isOpen: true, type: "FORM" })}
                className="font-bold min-h-[44px]"
              >
                + Solicitar formulário
              </Button>
            </div>

            {forms.length === 0 ? (
              <div className="p-8 sm:p-12 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-4 shadow-xs depth-surface">
                <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-tertiary)]">
                  <FileTextIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <p className="font-heading text-sm font-bold text-[var(--text-primary)]">
                    Nenhum formulário respondido
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Envie questionários de rotina, acompanhamento ou termos personalizados para o aluno preencher.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setRequestModal({ isOpen: true, type: "FORM" })}
                  className="font-bold min-h-[44px]"
                >
                  + Solicitar formulário
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {forms.map((form) => (
                  <div
                    key={form.id}
                    className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs depth-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">
                          {form.title}
                        </h3>
                        <Badge variant="success" size="sm">
                          {form.status}
                        </Badge>
                      </div>
                      {form.submittedAt && (
                        <p className="text-xs text-[var(--text-secondary)]">
                          Respondido em {new Date(form.submittedAt).toLocaleDateString("pt-BR")} às{" "}
                          {new Date(form.submittedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedFormForModal(form)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[var(--brand)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-colors min-h-[44px] cursor-pointer shrink-0"
                    >
                      <span>Ver respostas</span>
                      <span>→</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: TREINOS */}
        {activeTab === "treinos" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-heading text-sm font-bold text-[var(--text-primary)]">
                Treinos Atribuídos ao Aluno
              </h2>
              <button
                type="button"
                onClick={() => setIsNewWorkoutSheetOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] transition-all min-h-[44px] shadow-xs cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>+ Criar treino</span>
              </button>
            </div>

            {workouts.length === 0 ? (
              <div className="p-8 sm:p-12 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-4 shadow-xs depth-surface">
                <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-tertiary)]">
                  <DumbbellIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <p className="font-heading text-sm font-bold text-[var(--text-primary)]">
                    Nenhum treino criado para este aluno
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Monte a primeira rotina de treino personalizada do zero com o Criador Modular.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsNewWorkoutSheetOpen(true)}
                  className="font-bold min-h-[44px] cursor-pointer"
                >
                  Criar primeiro treino
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                  {workouts.map((w) => (
                    <div
                      key={w.assignmentPublicId}
                      className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand)] shadow-xs transition-all flex flex-col justify-between space-y-4 depth-surface"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant={w.status === "ACTIVE" ? "success" : "neutral"}
                            size="sm"
                          >
                            {w.status === "ACTIVE" ? "Em andamento" : "Encerrado"}
                          </Badge>
                          <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                            Versão {w.versionNumber}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h3 className="font-heading text-base font-bold text-[var(--text-primary)] line-clamp-1">
                            {w.title}
                          </h3>
                          {w.subtitle && (
                            <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{w.subtitle}</p>
                          )}
                        </div>

                        <div className="text-xs text-[var(--text-secondary)] space-y-0.5 pt-1">
                          <p>Início: {w.startsOn} {w.endsOn ? `• Término: ${w.endsOn}` : ""}</p>
                          {w.notesForStudent && (
                            <p className="italic text-[var(--text-tertiary)] line-clamp-2">
                              &quot;{w.notesForStudent}&quot;
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                        <Link
                          href={`/consultoria/${consultancySlug}/rotinas/${w.workoutPublicId}?version=${w.versionPublicId}&student=${student.membershipPublicId}`}
                          className="w-full inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] transition-all min-h-[44px] cursor-pointer"
                        >
                          <span>Abrir no Criador</span>
                          <span>→</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Completed Execution Sessions */}
                {completedSessions.length > 0 && (
                  <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-3 mt-6">
                    <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Histórico Recente de Execução (Sessões Concluídas)
                    </h3>
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {completedSessions.map((session) => (
                        <div
                          key={session.publicId}
                          className="py-2.5 flex items-center justify-between text-xs gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[var(--text-primary)] truncate">
                              {session.workoutTitle}
                            </p>
                            <p className="text-[11px] text-[var(--text-tertiary)]">
                              {new Date(session.completedAt).toLocaleDateString("pt-BR")} às{" "}
                              {new Date(session.completedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <Badge variant="success" size="sm" className="shrink-0">
                            {session.completedSetsCount} séries concluídas
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: AVALIAÇÕES (MEASUREMENTS) */}
        {activeTab === "avaliacoes" && measurements.length > 0 && (
          <div className="space-y-4">
            <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs depth-surface space-y-4">
              <h3 className="font-heading text-sm font-bold text-[var(--text-primary)]">
                Medições Corporais Registradas
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                    <tr>
                      <th className="py-2 pr-3">Data</th>
                      <th className="py-2 px-3">Peso (kg)</th>
                      <th className="py-2 px-3">Cintura</th>
                      <th className="py-2 px-3">Abdômen</th>
                      <th className="py-2 px-3">Quadril</th>
                      <th className="py-2 px-3">Braço</th>
                      <th className="py-2 px-3">Coxa</th>
                      <th className="py-2 pl-3">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {measurements.map((m, idx) => (
                      <tr key={`${m.recordedOn}-${idx}`} className="text-[var(--text-primary)]">
                        <td className="py-2.5 pr-3 font-semibold">{m.recordedOn}</td>
                        <td className="py-2.5 px-3">{m.weightKg != null ? `${m.weightKg} kg` : "—"}</td>
                        <td className="py-2.5 px-3">{m.waistCm != null ? `${m.waistCm} cm` : "—"}</td>
                        <td className="py-2.5 px-3">{m.abdomenCm != null ? `${m.abdomenCm} cm` : "—"}</td>
                        <td className="py-2.5 px-3">{m.hipCm != null ? `${m.hipCm} cm` : "—"}</td>
                        <td className="py-2.5 px-3">{m.armCm != null ? `${m.armCm} cm` : "—"}</td>
                        <td className="py-2.5 px-3">{m.thighCm != null ? `${m.thighCm} cm` : "—"}</td>
                        <td className="py-2.5 pl-3 text-[var(--text-secondary)]">{m.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          SHARED MOBILE ACTION SHEET (••• Contextual actions)
          ========================================================================= */}
      <MobileActionSheet
        isOpen={isMobileActionSheetOpen}
        onClose={() => setIsMobileActionSheetOpen(false)}
        title={`Ações para ${student.name}`}
        options={mobileActionSheetOptions}
      />

      {/* =========================================================================
          MODAL: SOLICITAÇÃO AO ALUNO (FOTOS, ANAMNESE, FORMULÁRIO)
          ========================================================================= */}
      <PersonalRequestModal
        isOpen={requestModal.isOpen}
        onClose={() => setRequestModal((prev) => ({ ...prev, isOpen: false }))}
        type={requestModal.type}
        consultancySlug={consultancySlug}
        studentMembershipPublicId={student.membershipPublicId}
        studentName={student.name}
      />

      {/* =========================================================================
          MODAL: VER RESPOSTAS DO FORMULÁRIO (Responsive)
          ========================================================================= */}
      {selectedFormForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xl p-5 sm:p-7 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-[var(--text-primary)]">
                  {selectedFormForModal.title}
                </h3>
                {selectedFormForModal.submittedAt && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Enviado em {new Date(selectedFormForModal.submittedAt).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedFormForModal(null)}
                className="p-1 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Fechar modal"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {selectedFormForModal.questions.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)]">Nenhuma resposta registrada.</p>
              ) : (
                selectedFormForModal.questions.map((q, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] block">
                      {q.question}
                    </span>
                    <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                      {q.answer}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedFormForModal(null)}
                className="font-bold min-h-[44px]"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sheet to choose between new workout from scratch or reusable template */}
      <StudentNewWorkoutSheet
        isOpen={isNewWorkoutSheetOpen}
        onClose={() => setIsNewWorkoutSheetOpen(false)}
        consultancySlug={consultancySlug}
        studentMembershipPublicId={student.membershipPublicId}
        studentName={student.name}
      />
    </div>
  );
}
