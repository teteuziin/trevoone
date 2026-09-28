"use client";

import React, { useState } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/account/user-avatar";
import {
  createAdminActionAction,
  resolveAdminActionAction,
  acknowledgeMonitoringAlertAction,
  resolveMonitoringAlertAction,
} from "@/app/consultoria/[slug]/operacoes/actions";
import {
} from "@/app/consultoria/[slug]/indicacoes/actions";
import type { SupervisorSummary } from "@/lib/monitoring/supervisor-summary";
import type { StudentEvaluationResult, StudentRadarState } from "@/lib/monitoring/evaluator";
import type { ProfessionalRadarItem, ProfessionalRadarStatus } from "@/lib/monitoring/professional-radar";
import type { ProfessionalAdminActionRecord, ProfessionalAdminActionType } from "@/lib/monitoring/admin-actions";

interface OperationsCenterViewProps {
  consultancySlug: string;
  supervisorSummary: SupervisorSummary;
  studentsResult: {
    totalStudents: number;
    studentsOk: number;
    studentsAttention: number;
    studentsCritical: number;
    criticalAlertsCount: number;
    openAlertsCount: number;
    students: StudentEvaluationResult[];
  };
  teamResult: {
    professionals: ProfessionalRadarItem[];
    kpis: {
      totalProfessionals: number;
      inGoodStandingCount: number;
      needingAttentionCount: number;
      criticalCount: number;
      totalOpenAlerts: number;
    };
  };
  referralsSummary: {
    pendingCommissionsCount: number;
    pendingPayoutsCount: number;
    pendingAmount: number;
    approvedAmount: number;
  };
  escalationsHistory: ProfessionalAdminActionRecord[];
}

export function OperationsCenterView({
  consultancySlug,
  supervisorSummary,
  studentsResult,
  teamResult,
  referralsSummary,
  escalationsHistory,
}: OperationsCenterViewProps) {
  const [activeTab, setActiveTab] = useState<"today" | "students" | "team" | "escalations">("today");
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>("ALL");
  const [studentSearch, setStudentSearch] = useState("");

  // Escalation Modal
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalRadarItem | null>(null);
  const [escalationActionType, setEscalationActionType] = useState<ProfessionalAdminActionType>("SEND_WARNING");
  const [escalationReason, setEscalationReason] = useState("");
  const [isSubmittingEscalation, setIsSubmittingEscalation] = useState(false);
  const [escalationError, setEscalationError] = useState<string | null>(null);

  // Resolve Escalation Modal
  const [resolvingAction, setResolvingAction] = useState<ProfessionalAdminActionRecord | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [isResolvingAction, setIsResolvingAction] = useState(false);

  // Student Evidence Drawer/Modal
  const [selectedStudentForEvidence, setSelectedStudentForEvidence] = useState<StudentEvaluationResult | null>(null);

  async function handleCreateEscalation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProfessional) return;
    if (!escalationReason.trim()) {
      setEscalationError("Informe o motivo da ação.");
      return;
    }

    setIsSubmittingEscalation(true);
    setEscalationError(null);

    const res = await createAdminActionAction(
      consultancySlug,
      selectedProfessional.professionalMemberId,
      escalationActionType,
      escalationReason
    );

    setIsSubmittingEscalation(false);
    if (!res.success) {
      setEscalationError(res.error || "Erro ao registrar ação.");
    } else {
      setSelectedProfessional(null);
      setEscalationReason("");
    }
  }

  async function handleResolveEscalation(actionId: number) {
    setIsResolvingAction(true);
    const res = await resolveAdminActionAction(consultancySlug, actionId, resolutionNote);
    setIsResolvingAction(false);
    if (res.success) {
      setResolvingAction(null);
      setResolutionNote("");
    }
  }

  async function handleAcknowledgeAlert(alertId: number) {
    await acknowledgeMonitoringAlertAction(consultancySlug, alertId);
  }

  async function handleResolveAlert(alertId: number) {
    await resolveMonitoringAlertAction(consultancySlug, alertId);
    if (selectedStudentForEvidence) {
      setSelectedStudentForEvidence({
        ...selectedStudentForEvidence,
        alerts: selectedStudentForEvidence.alerts.filter((a) => a.id !== alertId),
      });
    }
  }

  // Filter students
  const filteredStudents = studentsResult.students.filter((s) => {
    if (studentStatusFilter !== "ALL" && s.state !== studentStatusFilter) return false;
    if (studentSearch.trim()) {
      return s.studentName.toLowerCase().includes(studentSearch.toLowerCase());
    }
    return true;
  });

  const studentStateBadges: Record<StudentRadarState, { label: string; className: string }> = {
    OK: { label: "Em Dia", className: "bg-[var(--success-soft)] text-[var(--success-foreground)] border-[var(--success-border)]" },
    ATTENTION: { label: "Atenção", className: "bg-[var(--warning-soft)] text-[var(--warning-foreground)] border-[var(--warning-border)]" },
    CRITICAL: { label: "Crítico", className: "bg-[var(--danger-soft)] text-[var(--danger-foreground)] border-[var(--danger-border)]" },
  };

  const teamStatusBadges: Record<ProfessionalRadarStatus, { label: string; className: string }> = {
    EM_DIA: { label: "Em Dia", className: "bg-[var(--success-soft)] text-[var(--success-foreground)] border-[var(--success-border)]" },
    ATENCAO: { label: "Atenção", className: "bg-[var(--warning-soft)] text-[var(--warning-foreground)] border-[var(--warning-border)]" },
    CRITICO: { label: "Crítico", className: "bg-[var(--danger-soft)] text-[var(--danger-foreground)] border-[var(--danger-border)]" },
  };

  return (
    <div className="space-y-6">
      {/* Top Operations KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs depth-base">
          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Alunos Atenção
          </span>
          <span className="text-xl font-black text-[var(--warning-foreground)] mt-1 block">
            {studentsResult.studentsAttention}
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs depth-base">
          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Alertas Críticos
          </span>
          <span className="text-xl font-black text-[var(--danger-foreground)] mt-1 block">
            {studentsResult.criticalAlertsCount}
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs depth-base">
          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Equipe Pendente
          </span>
          <span className="text-xl font-black text-[var(--text-primary)] mt-1 block">
            {teamResult.kpis.needingAttentionCount + teamResult.kpis.criticalCount}
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs depth-base">
          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Relatos de Dor
          </span>
          <span className="text-xl font-black text-[var(--danger-foreground)] mt-1 block">
            {supervisorSummary.facts.painReportsCount}
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs depth-base">
          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Inativos &gt; 7d
          </span>
          <span className="text-xl font-black text-[var(--text-secondary)] mt-1 block">
            {supervisorSummary.facts.prolongedInactiveCount}
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs depth-base">
          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Comissões Pend.
          </span>
          <span className="text-xl font-black text-[var(--warning-foreground)] mt-1 block">
            {referralsSummary.pendingCommissionsCount}
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-xs depth-base">
          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
            Aguardando PIX
          </span>
          <span className="text-xl font-black text-[var(--brand)] mt-1 block">
            {referralsSummary.pendingPayoutsCount}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("today")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "today"
              ? "bg-[var(--brand)] text-white shadow-xs"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          }`}
        >
          Hoje (Prioridades)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("students")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "students"
              ? "bg-[var(--brand)] text-white shadow-xs"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          }`}
        >
          Radar do Aluno ({studentsResult.totalStudents})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("team")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "team"
              ? "bg-[var(--brand)] text-white shadow-xs"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          }`}
        >
          Radar da Equipe ({teamResult.professionals.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("escalations")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "escalations"
              ? "bg-[var(--brand)] text-white shadow-xs"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          }`}
        >
          Histórico de Ações ({escalationsHistory.length})
        </button>
      </div>

      {/* TAB 1: HOJE */}
      {activeTab === "today" && (
        <div className="space-y-6">
          {/* Supervisor Trevo Summary Card */}
          <div className="bg-gradient-to-br from-[var(--surface)] to-[var(--surface-subtle)] border border-[var(--border-strong)] rounded-3xl p-6 shadow-sm depth-base space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-border)] text-[var(--brand-foreground)] flex items-center justify-center font-bold text-sm">
                ✦
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
                  Resumo do Supervisor
                </span>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {supervisorSummary.headline}
                </h2>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed font-medium bg-[var(--surface)]/80 p-4 rounded-2xl border border-[var(--border-subtle)]">
              {supervisorSummary.narrative}
            </p>

            <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] pt-1">
              <span>Evidências objetivas baseadas em dados registrados no TREVO ONE</span>
              <span>Atualizado hoje</span>
            </div>
          </div>

          {/* Actionable Student Alerts */}
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-xs depth-base space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Alunos Demandando Ação Imediata
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Estudantes com relatos de dor, ausência prolongada ou baixa adesão.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("students")}
                className="text-xs text-[var(--brand)] hover:underline font-bold"
              >
                Ver todos os alunos →
              </button>
            </div>

            {studentsResult.students.filter((s) => s.state !== "OK").length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--success-foreground)] bg-[var(--success-soft)]/40 border border-[var(--success-border)] rounded-2xl">
                ✓ Nenhum aluno em estado crítico ou de atenção no momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {studentsResult.students
                  .filter((s) => s.state !== "OK")
                  .slice(0, 6)
                  .map((s) => (
                    <div
                      key={s.studentMemberId}
                      className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar fullName={s.studentName} userPublicId={s.userPublicId} size="sm" />
                          <div>
                            <span className="font-bold text-xs text-[var(--text-primary)] block">
                              {s.studentName}
                            </span>
                            <span className="text-[10px] text-[var(--text-tertiary)]">
                              Treinos 7d: {s.metrics.completedWorkoutsLast7d} | Check-ins 7d: {s.metrics.recentCheckinsCount}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${studentStateBadges[s.state].className}`}>
                          {studentStateBadges[s.state].label}
                        </span>
                      </div>

                      <div className="text-[11px] text-[var(--text-secondary)] space-y-1">
                        {s.reasons.map((r, i) => (
                          <p key={i} className="flex items-start gap-1.5 leading-snug">
                            <span className="text-[var(--danger-foreground)] font-bold">•</span>
                            <span>{r}</span>
                          </p>
                        ))}
                      </div>

                      <div className="pt-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentForEvidence(s)}
                          className="text-xs font-semibold px-3 py-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] cursor-pointer"
                        >
                          Ver Evidências
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Quick Team and Referrals Pending Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 shadow-xs depth-base space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Equipe: Pendências de Acompanhamento
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("team")}
                  className="text-xs text-[var(--brand)] hover:underline font-semibold"
                >
                  Ver equipe →
                </button>
              </div>

              {teamResult.professionals.filter((p) => p.status !== "EM_DIA").length === 0 ? (
                <p className="text-xs text-[var(--success-foreground)]">
                  ✓ Todos os profissionais estão com o acompanhamento em dia no TREVO ONE.
                </p>
              ) : (
                <div className="space-y-2">
                  {teamResult.professionals
                    .filter((p) => p.status !== "EM_DIA")
                    .map((p) => (
                      <div key={p.professionalMemberId} className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[var(--text-primary)]">{p.name}</span>
                          <span className="text-[10px] text-[var(--text-tertiary)] block">
                            {p.reasons[0]}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedProfessional(p)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--brand)] text-white hover:brightness-110 cursor-pointer"
                        >
                          Ação
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 shadow-xs depth-base space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Indicações: Comissões Pendentes
                </h3>
                <Link
                  href={`/consultoria/${consultancySlug}/indicacoes`}
                  className="text-xs text-[var(--brand)] hover:underline font-semibold"
                >
                  Gerenciar indicações →
                </Link>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[var(--text-primary)]">Comissões aguardando aprovação</span>
                    <span className="text-[10px] text-[var(--text-tertiary)] block">R$ {referralsSummary.pendingAmount.toFixed(2)} em aprovação</span>
                  </div>
                  <span className="font-black text-sm text-[var(--warning-foreground)]">
                    {referralsSummary.pendingCommissionsCount}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[var(--text-primary)]">Pagamentos aprovados aguardando PIX</span>
                    <span className="text-[10px] text-[var(--text-tertiary)] block">R$ {referralsSummary.approvedAmount.toFixed(2)} a transferir</span>
                  </div>
                  <span className="font-black text-sm text-[var(--brand)]">
                    {referralsSummary.pendingPayoutsCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ALUNOS (STUDENT RADAR) */}
      {activeTab === "students" && (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-xs depth-base space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {["ALL", "CRITICAL", "ATTENTION", "OK"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStudentStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs rounded-xl border transition-all cursor-pointer ${
                    studentStatusFilter === st
                      ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] font-bold shadow-2xs"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)] font-medium"
                  }`}
                >
                  {st === "ALL" ? "Todos" : studentStateBadges[st as StudentRadarState].label}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Buscar aluno por nome..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="text-xs p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)] w-full sm:w-64"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                  <th className="pb-3 font-semibold">Aluno</th>
                  <th className="pb-3 font-semibold">Status Radar</th>
                  <th className="pb-3 font-semibold">Motivos / Evidências</th>
                  <th className="pb-3 font-semibold">Treinos (7d)</th>
                  <th className="pb-3 font-semibold">Check-ins (7d)</th>
                  <th className="pb-3 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredStudents.map((s) => (
                  <tr key={s.studentMemberId}>
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar fullName={s.studentName} userPublicId={s.userPublicId} size="xs" />
                        <span className="font-semibold text-[var(--text-primary)]">{s.studentName}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${studentStateBadges[s.state].className}`}>
                        {studentStateBadges[s.state].label}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--text-secondary)] max-w-xs">
                      {s.reasons.length > 0 ? (
                        <span className="line-clamp-1">{s.reasons[0]}</span>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">Sem pendências</span>
                      )}
                    </td>
                    <td className="py-3 font-bold text-[var(--text-primary)]">
                      {s.metrics.completedWorkoutsLast7d}
                    </td>
                    <td className="py-3 font-bold text-[var(--text-primary)]">
                      {s.metrics.recentCheckinsCount}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentForEvidence(s)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] cursor-pointer"
                      >
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: EQUIPE (TEAM RADAR) */}
      {activeTab === "team" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamResult.professionals.map((p) => (
              <div
                key={p.professionalMemberId}
                className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 shadow-xs depth-base space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar fullName={p.name} userPublicId={p.userPublicId} size="md" />
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">{p.name}</h4>
                      <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">
                        {p.role === "PERSONAL" ? "Personal Trainer" : "Nutricionista"}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${teamStatusBadges[p.status].className}`}>
                    {teamStatusBadges[p.status].label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block">Alunos</span>
                    <span className="font-bold text-[var(--text-primary)]">{p.activeStudentsAssigned}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block">Em Dia</span>
                    <span className="font-bold text-[var(--success-foreground)]">{p.studentsOkCount}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block">Atenção</span>
                    <span className="font-bold text-[var(--warning-foreground)]">{p.studentsAttentionCount + p.studentsCriticalCount}</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="text-[11px] font-semibold text-[var(--text-secondary)]">Diagnóstico:</p>
                  {p.reasons.map((r, i) => (
                    <p key={i} className="text-[11px] text-[var(--text-secondary)] flex items-start gap-1">
                      <span>•</span>
                      <span>{r}</span>
                    </p>
                  ))}
                </div>

                {p.activeEscalation && (
                  <div className="p-2.5 rounded-xl bg-[var(--warning-soft)] text-[var(--warning-foreground)] border border-[var(--warning-border)] text-xs">
                    <span className="font-bold block">Ação em aberto:</span>
                    <span>{p.activeEscalation.actionTypeLabel} — {p.activeEscalation.reason}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {p.lastActiveAt ? `Último acesso: ${new Date(p.lastActiveAt).toLocaleDateString("pt-BR")}` : "Sem registro recente"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedProfessional(p)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[var(--brand)] text-white hover:brightness-110 cursor-pointer depth-interactive"
                  >
                    Registrar Ação
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: HISTÓRICO DE ESCALAÇÕES */}
      {activeTab === "escalations" && (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-xs depth-base space-y-4">
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            Registro Auditável de Ações da Coordenação
          </h3>

          {escalationsHistory.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-tertiary)] border border-dashed border-[var(--border-default)] rounded-2xl">
              Nenhuma ação administrativa registrada até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                    <th className="pb-3 font-semibold">Data</th>
                    <th className="pb-3 font-semibold">Profissional</th>
                    <th className="pb-3 font-semibold">Tipo de Ação</th>
                    <th className="pb-3 font-semibold">Justificativa / Motivo</th>
                    <th className="pb-3 font-semibold">Registrado Por</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {escalationsHistory.map((h) => (
                    <tr key={h.id}>
                      <td className="py-3 text-[var(--text-secondary)]">
                        {new Date(h.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3 font-bold text-[var(--text-primary)]">
                        {h.professionalName}
                      </td>
                      <td className="py-3 font-semibold text-[var(--brand)]">
                        {h.actionTypeLabel}
                      </td>
                      <td className="py-3 text-[var(--text-secondary)] max-w-xs truncate">
                        {h.reason}
                      </td>
                      <td className="py-3 text-[var(--text-secondary)]">
                        {h.adminName}
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                          h.status === "ACTIVE"
                            ? "bg-[var(--warning-soft)] text-[var(--warning-foreground)] border-[var(--warning-border)]"
                            : "bg-[var(--success-soft)] text-[var(--success-foreground)] border-[var(--success-border)]"
                        }`}>
                          {h.status === "ACTIVE" ? "Ativa" : "Resolvida"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {h.status === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() => setResolvingAction(h)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--brand)] text-white hover:brightness-110 cursor-pointer"
                          >
                            Resolver
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ESCALATE PROFESSIONAL ACTION */}
      {selectedProfessional && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Registrar Ação para {selectedProfessional.name}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              As ações manuais são auditadas e registradas no histórico da consultoria. Não há punição automática pelo sistema.
            </p>

            <form onSubmit={handleCreateEscalation} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                  Tipo de Ação
                </label>
                <select
                  value={escalationActionType}
                  onChange={(e) => setEscalationActionType(e.target.value as ProfessionalAdminActionType)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
                >
                  <option value="SEND_WARNING">Registrar aviso</option>
                  <option value="REQUEST_REVIEW">Solicitar revisão de rotinas</option>
                  <option value="REQUEST_JUSTIFICATION">Solicitar justificativa</option>
                  <option value="PAUSE_NEW_ASSIGNMENTS">Pausar novos alunos temporariamente</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                  Motivo / Justificativa detalhada
                </label>
                <textarea
                  required
                  rows={3}
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  placeholder="Ex: Alunos atribuídos sem acompanhamento registrado há mais de 10 dias..."
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
                />
              </div>

              {escalationError && (
                <div className="p-3 text-xs rounded-xl bg-[var(--danger-soft)] text-[var(--danger-foreground)] border border-[var(--danger-border)]">
                  {escalationError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProfessional(null)}
                  className="px-4 py-2 text-xs rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEscalation}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[var(--brand)] text-white hover:brightness-110 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEscalation ? "Registrando..." : "Confirmar Ação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESOLVE ESCALATION */}
      {resolvingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Resolver Ação Administrativa
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Profissional: {resolvingAction.professionalName} ({resolvingAction.actionTypeLabel})
            </p>

            <textarea
              rows={3}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Nota de resolução (ex: Profissional atualizou os treinos e justificou o atraso)..."
              className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResolvingAction(null)}
                className="px-4 py-2 text-xs rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isResolvingAction}
                onClick={() => handleResolveEscalation(resolvingAction.id)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[var(--success-foreground)] text-white hover:brightness-110 cursor-pointer disabled:opacity-50"
              >
                {isResolvingAction ? "Salvando..." : "Confirmar Resolução"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL: STUDENT EVIDENCE */}
      {selectedStudentForEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5">
                <UserAvatar fullName={selectedStudentForEvidence.studentName} userPublicId={selectedStudentForEvidence.userPublicId} size="sm" />
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {selectedStudentForEvidence.studentName}
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${studentStateBadges[selectedStudentForEvidence.state].className}`}>
                    {studentStateBadges[selectedStudentForEvidence.state].label}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForEvidence(null)}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] font-bold cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] block">Treinos (7d)</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedStudentForEvidence.metrics.completedWorkoutsLast7d}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] block">Check-ins (7d)</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedStudentForEvidence.metrics.recentCheckinsCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] block">Relatos Dor</span>
                <span className="font-bold text-[var(--danger-foreground)]">{selectedStudentForEvidence.metrics.painReportedCount}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Alertas Ativos &amp; Evidências
              </h4>
              {selectedStudentForEvidence.alerts.length === 0 ? (
                <p className="text-xs text-[var(--success-foreground)]">Nenhum alerta pendente para este aluno.</p>
              ) : (
                selectedStudentForEvidence.alerts.map((a) => (
                  <div key={a.id} className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--text-primary)]">{a.alertType}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                        a.severity === "CRITICAL"
                          ? "bg-[var(--danger-soft)] text-[var(--danger-foreground)] border-[var(--danger-border)]"
                          : "bg-[var(--warning-soft)] text-[var(--warning-foreground)] border-[var(--warning-border)]"
                      }`}>
                        {a.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)]">{a.statement}</p>
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      {a.status === "OPEN" && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledgeAlert(a.id)}
                          className="px-2.5 py-1 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                        >
                          Reconhecer
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleResolveAlert(a.id)}
                        className="px-2.5 py-1 text-xs rounded-lg bg-[var(--brand)] text-white hover:brightness-110 font-bold cursor-pointer"
                      >
                        Resolver
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
