"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PersonalRequestModal, type RequestModalType } from "./personal-request-modal";
import type {
  PersonalStudentDetail,
  StudentFormAnswer,
} from "@/lib/consultancies/personal-student-hub";

interface PersonalStudentDetailViewProps {
  consultancySlug: string;
  detail: PersonalStudentDetail;
}

type TabKey = "visao-geral" | "fotos" | "anamnese" | "formularios" | "treinos" | "avaliacoes";

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

function XIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function PersonalStudentDetailView({
  consultancySlug,
  detail,
}: PersonalStudentDetailViewProps) {
  const {
    student,
    overview,
    photos,
    anamnesis,
    forms,
    workouts,
    completedSessions,
    measurements,
  } = detail;

  const [activeTab, setActiveTab] = useState<TabKey>("visao-geral");
  const [selectedFormForModal, setSelectedFormForModal] = useState<StudentFormAnswer | null>(null);
  const [requestModal, setRequestModal] = useState<{ isOpen: boolean; type: RequestModalType }>({
    isOpen: false,
    type: "PHOTOS",
  });

  const initial = student.name.charAt(0).toUpperCase() || "A";

  const tabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }> = [
    { key: "visao-geral", label: "Visão Geral", icon: FileTextIcon },
    { key: "fotos", label: "Fotos", icon: PhotoIcon, count: photos.length },
    { key: "anamnese", label: "Anamnese", icon: ClipboardCheckIcon },
    { key: "formularios", label: "Formulários", icon: FileTextIcon, count: forms.length },
    { key: "treinos", label: "Treinos", icon: DumbbellIcon, count: workouts.length },
  ];

  if (measurements.length > 0) {
    tabs.push({ key: "avaliacoes", label: "Avaliações", icon: ScaleIcon, count: measurements.length });
  }

  const createWorkoutHref = `/consultoria/${consultancySlug}/rotinas/novo?student=${student.membershipPublicId}`;

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
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
          <div className="w-16 h-16 sm:w-20 sm:w-20 rounded-3xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-xl sm:text-2xl font-bold text-[var(--brand)] shrink-0 shadow-sm">
            {initial}
          </div>
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

          <Link
            href={createWorkoutHref}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] transition-all min-h-[44px] shadow-sm depth-interactive cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>+ Criar treino</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs (Mobile scrollable, Desktop aligned) */}
      <div className="border-b border-[var(--border-default)] -mx-4 px-4 sm:mx-0 sm:px-0">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto scrollbar-none pb-px" aria-label="Abas do Aluno">
          {tabs.map((tab) => {
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

      {/* =========================================================================
          TAB 1: VISÃO GERAL
          ========================================================================= */}
      {activeTab === "visao-geral" && (
        <div className="space-y-6">
          {/* Key Objective Banner */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs depth-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
                Foco & Metas
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
                    Anamnese & Limitações
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

      {/* =========================================================================
          TAB 2: FOTOS
          ========================================================================= */}
      {activeTab === "fotos" && (
        <div className="space-y-6">
          {/* Header Action */}
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

                  {/* Poses Images */}
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

      {/* =========================================================================
          TAB 3: ANAMNESE
          ========================================================================= */}
      {activeTab === "anamnese" && (
        <div className="space-y-6">
          {/* Header Action */}
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading text-sm font-bold text-[var(--text-primary)]">
              Anamnese & Histórico Clínico
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

      {/* =========================================================================
          TAB 4: FORMULÁRIOS
          ========================================================================= */}
      {activeTab === "formularios" && (
        <div className="space-y-6">
          {/* Header Action */}
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading text-sm font-bold text-[var(--text-primary)]">
              Formulários & Questionários
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

      {/* =========================================================================
          TAB 5: TREINOS
          ========================================================================= */}
      {activeTab === "treinos" && (
        <div className="space-y-6">
          {/* Header Action */}
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading text-sm font-bold text-[var(--text-primary)]">
              Treinos Atribuídos ao Aluno
            </h2>
            <Link
              href={createWorkoutHref}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] transition-all min-h-[44px] shadow-xs cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>+ Criar treino</span>
            </Link>
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
              <Link href={createWorkoutHref}>
                <Button variant="primary" size="sm" className="font-bold min-h-[44px]">
                  Criar primeiro treino
                </Button>
              </Link>
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
                        <div className="min-w-0">
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

      {/* =========================================================================
          TAB 6: AVALIAÇÕES (MEASUREMENTS)
          ========================================================================= */}
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

      {/* =========================================================================
          MODAL: SOLICITAÇÃO AO ALUNO (FOTOS, ANAMNESE, FORMULÁRIO, AVALIAÇÃO)
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
          MODAL: VER RESPOSTAS DO FORMULÁRIO
          ========================================================================= */}
      {selectedFormForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xl p-6 sm:p-7 space-y-5"
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

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
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
    </div>
  );
}
