"use client";

import React, { useState, useTransition } from "react";
import type { PatientLabExamRecord, LabExamResultItem } from "@/lib/nutrition-v2/clinical-measurements-catalog";
import { CANONICAL_LAB_EXAMS } from "@/lib/nutrition-v2/clinical-measurements-catalog";
import { savePatientLabExamAction, deletePatientLabExamAction } from "@/app/consultoria/[slug]/planos-v2/patient-actions";

interface PlanningLabExamsSectionProps {
  slug: string;
  studentMembershipPublicId: string;
  exams: PatientLabExamRecord[];
  canAuthor?: boolean;
}

export function PlanningLabExamsSection({
  slug,
  studentMembershipPublicId,
  exams: initialExams,
  canAuthor = true,
}: PlanningLabExamsSectionProps) {
  const [exams, setExams] = useState<PatientLabExamRecord[]>(initialExams || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<PatientLabExamRecord | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states for modal
  const [examDate, setExamDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [laboratoryName, setLaboratoryName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [resultsState, setResultsState] = useState<Array<{
    catalogKey: string;
    customName?: string;
    rawInput: string;
    unit: string;
    refMin?: string;
    refMax?: string;
    isLdlCalculated?: boolean;
  }>>([
    { catalogKey: "TOTAL_CHOLESTEROL", rawInput: "", unit: "mg/dL", refMax: "190" },
    { catalogKey: "HDL_CHOLESTEROL", rawInput: "", unit: "mg/dL", refMin: "40" },
    { catalogKey: "LDL_CHOLESTEROL", rawInput: "", unit: "mg/dL", refMax: "130", isLdlCalculated: true },
    { catalogKey: "TRIGLYCERIDES", rawInput: "", unit: "mg/dL", refMax: "150" },
    { catalogKey: "SERUM_IRON", rawInput: "", unit: "µg/dL", refMin: "50", refMax: "170" },
    { catalogKey: "FERRITIN", rawInput: "", unit: "ng/mL", refMin: "30", refMax: "400" },
    { catalogKey: "VITAMIN_D_25_OH", rawInput: "", unit: "ng/mL", refMin: "30", refMax: "100" },
  ]);

  const handleOpenAdd = () => {
    setEditingExam(null);
    setExamDate(new Date().toISOString().slice(0, 10));
    setLaboratoryName("");
    setNotes("");
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleAddCustomExamRow = () => {
    setResultsState((prev) => [
      ...prev,
      {
        catalogKey: "custom",
        customName: "",
        rawInput: "",
        unit: "",
      },
    ]);
  };

  const handleUpdateRow = (index: number, patch: Partial<(typeof resultsState)[0]>) => {
    setResultsState((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleRemoveRow = (index: number) => {
    setResultsState((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examDate) {
      setFeedback({ type: "error", text: "Informe a data de realização dos exames." });
      return;
    }

    const filledResults = resultsState
      .filter((r) => r.rawInput.trim().length > 0)
      .map((r) => {
        const canonical = CANONICAL_LAB_EXAMS.find((c) => c.canonicalKey === r.catalogKey);
        const examName = r.catalogKey === "custom" ? (r.customName || "Exame Personalizado") : (canonical?.name || r.catalogKey);

        const refMin = r.refMin ? Number(r.refMin) : null;
        const refMax = r.refMax ? Number(r.refMax) : null;
        const refText = refMin != null || refMax != null ? `${refMin != null ? `Min ${refMin}` : ""} ${refMax != null ? `Max ${refMax}` : ""}`.trim() : null;

        return {
          canonicalKey: r.catalogKey === "custom" ? null : (r.catalogKey || null),
          name: examName,
          resultRaw: r.rawInput.trim(),
          unit: r.unit || canonical?.defaultUnit || "",
          referenceMin: refMin,
          referenceMax: refMax,
          referenceText: refText,
          method: r.catalogKey === "LDL_CHOLESTEROL" ? (r.isLdlCalculated ? "CALCULATED" : "MEASURED") : undefined,
          isMeasuredDirectly: r.catalogKey === "LDL_CHOLESTEROL" ? !r.isLdlCalculated : null,
        };
      });

    if (filledResults.length === 0) {
      setFeedback({ type: "error", text: "Preencha o resultado de pelo menos um exame." });
      return;
    }

    startTransition(async () => {
      const res = await savePatientLabExamAction(slug, studentMembershipPublicId, {
        publicId: editingExam?.publicId,
        collectionDate: examDate,
        laboratoryName: laboratoryName.trim() || undefined,
        notes: notes.trim() || undefined,
        results: filledResults,
      });

      if (res.success && res.exam) {
        setExams((prev) => {
          const idx = prev.findIndex((e) => e.publicId === res.exam!.publicId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = res.exam!;
            return next;
          }
          return [res.exam!, ...prev];
        });
        setFeedback({ type: "success", text: "Exame registrado com sucesso." });
        setIsModalOpen(false);
      } else {
        setFeedback({ type: "error", text: res.error || "Erro ao salvar exame." });
      }
    });
  };

  const handleDelete = (examPublicId: string, eDate: string) => {
    if (!window.confirm(`Confirma a exclusão do laudo de exames de ${eDate}?`)) return;

    startTransition(async () => {
      const res = await deletePatientLabExamAction(slug, studentMembershipPublicId, examPublicId);
      if (res.success) {
        setExams((prev) => prev.filter((e) => e.publicId !== examPublicId));
        setFeedback({ type: "success", text: "Exame excluído com sucesso." });
      } else {
        setFeedback({ type: "error", text: res.error || "Erro ao excluir exame." });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
            Acompanhamento Clínico & Bioquímico
          </span>
          <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
            Exames Laboratoriais
          </h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            Registro de laudos bioquímicos com qualificadores, referências clínicas e isolamento seguro de laudos.
          </p>
        </div>

        {canAuthor && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5 min-h-[44px] shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>+ Adicionar Laudo de Exames</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs sm:text-sm border font-medium ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Privacy Notice */}
      <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          <strong>Privacidade Médica & Nutricional:</strong> Os laudos laboratoriais e parâmetros bioquímicos permanecem sob guarda confidencial do profissional e não são publicados automaticamente na área pública do paciente.
        </span>
      </div>

      {/* List of Registered Exam Sessions */}
      {exams.length === 0 ? (
        <div className="p-8 rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] text-center space-y-2">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            Nenhum exame laboratorial registrado até o momento.
          </p>
          {canAuthor && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
            >
              Clique para cadastrar o primeiro laudo
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <div
              key={exam.publicId}
              className="p-5 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4"
            >
              {/* Exam Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      Coleta em {new Date(exam.collectionDate.includes("T") ? exam.collectionDate : `${exam.collectionDate}T12:00:00`).toLocaleDateString("pt-BR")}
                    </h4>
                    <span className="text-[11px] text-[var(--text-tertiary)] block">
                      {exam.laboratoryName ? `Laboratório: ${exam.laboratoryName}` : "Laboratório não informado"}
                      {exam.createdByName && ` • Lançado por ${exam.createdByName}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canAuthor && (
                    <button
                      type="button"
                      onClick={() => handleDelete(exam.publicId, exam.collectionDate)}
                      disabled={isPending}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 border border-destructive/20 transition-all cursor-pointer min-h-[36px]"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>

              {/* Exam Results Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {exam.results.map((res: LabExamResultItem, rIdx: number) => {
                  const isOutOfRange = res.isOutOfRange;
                  const statusColor = isOutOfRange === true
                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                    : isOutOfRange === false
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border-[var(--border-subtle)]";

                  const statusLabel = isOutOfRange === true
                    ? "Fora da Ref."
                    : isOutOfRange === false
                    ? "Dentro da Ref."
                    : "Sem Ref.";

                  return (
                    <div
                      key={rIdx}
                      className="p-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[var(--text-primary)] truncate" title={res.name}>
                          {res.name}
                        </span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-extrabold text-[var(--text-primary)] tabular-nums">
                          {res.resultRaw || (res.resultNumeric != null ? String(res.resultNumeric) : "—")}
                        </span>
                        {res.unit && (
                          <span className="text-xs text-[var(--text-tertiary)] font-medium">
                            {res.unit}
                          </span>
                        )}
                      </div>

                      {/* Reference range & method */}
                      <div className="text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-[var(--border-subtle)] space-y-0.5">
                        {(res.referenceMin != null || res.referenceMax != null || res.referenceText) && (
                          <p>
                            Ref: {res.referenceText || `${res.referenceMin != null ? `Min ${res.referenceMin}` : ""} ${res.referenceMax != null ? `Max ${res.referenceMax}` : ""}`.trim()}
                          </p>
                        )}
                        {res.isMeasuredDirectly !== null && res.isMeasuredDirectly !== undefined && (
                          <p className="font-semibold text-[var(--text-secondary)]">
                            Método: {res.isMeasuredDirectly === false ? "Calculado pelo Laboratório" : "Medido diretamente"}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {exam.notes && (
                <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                  <span className="font-bold text-[var(--text-primary)]">Observações do laudo: </span>
                  {exam.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal for adding/editing lab exam */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="max-w-3xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-2xl rounded-3xl">
            <div className="p-5 pb-3 border-b border-[var(--border-subtle)] flex items-start justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  <span>Lançar Laudo de Exames Laboratoriais</span>
                </h3>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  Informe a data da coleta e os valores obtidos. Qualificadores como &quot;&lt;&quot; e &quot;&gt;&quot; são suportados (ex: &quot;&lt; 0.05&quot;).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm font-bold min-h-[36px] min-w-[36px] cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Header info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1">
                  Data da Coleta / Realização *
                </label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1">
                  Nome do Laboratório (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Fleury, Dasa, Hermes Pardini..."
                  value={laboratoryName}
                  onChange={(e) => setLaboratoryName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>
            </div>

            {/* Results Table / Rows */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Parâmetros Laboratoriais
                </span>
                <button
                  type="button"
                  onClick={handleAddCustomExamRow}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer min-h-[36px]"
                >
                  + Adicionar Exame Personalizado
                </button>
              </div>

              <div className="space-y-2">
                {resultsState.map((row, idx) => {
                  const canonical = CANONICAL_LAB_EXAMS.find((c) => c.canonicalKey === row.catalogKey);
                  const isCustom = row.catalogKey === "custom";

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      {/* Name */}
                      <div className="sm:col-span-4">
                        {isCustom ? (
                          <input
                            type="text"
                            placeholder="Nome do exame..."
                            value={row.customName || ""}
                            onChange={(e) => handleUpdateRow(idx, { customName: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-xs font-bold min-h-[40px]"
                          />
                        ) : (
                          <div>
                            <span className="text-xs font-bold text-[var(--text-primary)] block">
                              {canonical?.name}
                            </span>
                            <span className="text-[10px] text-[var(--text-tertiary)] block">
                              {canonical?.notes}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Value Input */}
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          placeholder="Ex: 145 ou < 0.05"
                          value={row.rawInput}
                          onChange={(e) => handleUpdateRow(idx, { rawInput: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-xs font-extrabold tabular-nums min-h-[40px]"
                        />
                      </div>

                      {/* Unit */}
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Unidade"
                          value={row.unit}
                          onChange={(e) => handleUpdateRow(idx, { unit: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-xs font-medium min-h-[40px]"
                        />
                      </div>

                      {/* Extra options (like LDL calculated/measured toggle) or delete */}
                      <div className="sm:col-span-3 flex items-center justify-end gap-2">
                        {row.catalogKey === "LDL_CHOLESTEROL" && (
                          <label className="text-[10px] font-bold text-[var(--text-secondary)] flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={row.isLdlCalculated}
                              onChange={(e) => handleUpdateRow(idx, { isLdlCalculated: e.target.checked })}
                              className="w-3.5 h-3.5 accent-emerald-600 rounded"
                            />
                            <span>Calc. Lab</span>
                          </label>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="p-1 rounded-lg text-[var(--text-tertiary)] hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Remover linha"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1">
                Observações do Laudo ou Orientações Clínicas
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Paciente em jejum de 12 horas. Dosagem de ferritina correlacionada com PCR normal..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </form>

            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[var(--border-default)] hover:bg-[var(--surface-hover)] text-xs font-bold transition-all min-h-[44px] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs min-h-[44px] transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Salvando..." : "Salvar Laudo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
