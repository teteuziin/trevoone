"use client";

import React, { useState, useTransition, useMemo } from "react";
import { createPortal } from "react-dom";
import type {
  ConsultancyFormDto,
  ActiveStudentOption,
} from "@/lib/consultancies/forms";
import { assignFormAction } from "@/app/consultoria/[slug]/formularios/actions";

const emptySubscribe = () => () => {};
function useIsMounted() {
  return React.useSyncExternalStore(emptySubscribe, () => true, () => false);
}

interface AssignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  forms: ConsultancyFormDto[];
  students: ActiveStudentOption[];
  preselectedFormPublicId?: string;
  preselectedStudentMembershipPublicId?: string;
  onSuccess: () => void;
}

export function AssignFormModal({
  isOpen,
  onClose,
  consultancySlug,
  forms,
  students,
  preselectedFormPublicId,
  preselectedStudentMembershipPublicId,
  onSuccess,
}: AssignFormModalProps) {
  const isMounted = useIsMounted();

  const publishedForms = useMemo(
    () =>
      forms.filter(
        (f) =>
          f.status === "PUBLISHED" ||
          f.status === "DRAFT" ||
          f.publicId === preselectedFormPublicId
      ),
    [forms, preselectedFormPublicId]
  );

  const [selectedFormPublicId, setSelectedFormPublicId] = useState<string>(
    preselectedFormPublicId || publishedForms[0]?.publicId || ""
  );
  const [assignToAll, setAssignToAll] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(() => {
    if (preselectedStudentMembershipPublicId) return [preselectedStudentMembershipPublicId];
    return [];
  });
  const [studentSearch, setStudentSearch] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    assignedCount: number;
    whatsappLinks?: { name: string; url: string }[];
  } | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const term = studentSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        (s.phone && s.phone.includes(term))
    );
  }, [students, studentSearch]);

  if (!isMounted || !isOpen) return null;

  function toggleStudent(membershipPublicId: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(membershipPublicId)
        ? prev.filter((id) => id !== membershipPublicId)
        : [...prev, membershipPublicId]
    );
  }

  function handleAssign() {
    if (!selectedFormPublicId) {
      setGlobalError("Selecione um formulário para atribuir.");
      return;
    }

    if (!assignToAll && selectedStudentIds.length === 0) {
      setGlobalError("Selecione ao menos um aluno ou marque a opção de enviar para todos.");
      return;
    }

    setGlobalError(null);

    startTransition(async () => {
      try {
        const res = await assignFormAction(consultancySlug, {
          formPublicId: selectedFormPublicId,
          assignToAllActiveStudents: assignToAll,
          studentMembershipPublicIds: assignToAll ? undefined : selectedStudentIds,
          dueDate: dueDate ? dueDate : null,
        });

        if (!res.success) {
          setGlobalError(res.error || "Erro ao atribuir formulário.");
          return;
        }

        const count = "assignedCount" in res ? res.assignedCount : (assignToAll ? students.length : selectedStudentIds.length);
        const links = "whatsappLinks" in res ? res.whatsappLinks : undefined;

        setSuccessInfo({
          assignedCount: count || (assignToAll ? students.length : selectedStudentIds.length),
          whatsappLinks: links,
        });
        onSuccess();
      } catch (err: unknown) {
        console.error("[AssignFormModal] Erro ao atribuir formulário:", err);
        setGlobalError("Não foi possível atribuir o formulário aos alunos. Tente novamente mais tarde.");
      }
    });
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-[#151619] border-t sm:border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] sm:max-h-[85vh] overflow-hidden m-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MOBILE DRAG HANDLE */}
        <div className="w-full pt-3 pb-1 flex justify-center sm:hidden shrink-0 bg-white dark:bg-[#151619]">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* HEADER */}
        <div className="px-4 py-3 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-start justify-between shrink-0 bg-white dark:bg-[#151619]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Atribuição de Formulário
            </span>
            <h2
              id="assign-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5"
            >
              Enviar para Aluno(s)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
          {successInfo ? (
            /* SUCCESS STATE WITH WHATSAPP LINK */
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Formulário Atribuído com Sucesso!
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1">
                  Enviado para {successInfo.assignedCount} aluno(s). Notificação interna disparada automaticamente.
                </p>
              </div>

              {successInfo.whatsappLinks && successInfo.whatsappLinks.length > 0 && (
                <div className="text-left space-y-2 pt-2 border-t border-emerald-500/20">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Avisar no WhatsApp (1-Clique):
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {successInfo.whatsappLinks.map((wl, idx) => (
                      <a
                        key={idx}
                        href={wl.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-white/5 border border-emerald-500/30 hover:border-emerald-500 text-xs font-semibold text-slate-900 dark:text-white transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span className="truncate">{wl.name}</span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline shrink-0">
                          Abrir WhatsApp
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {globalError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  {globalError}
                </div>
              )}

              {/* 1. MODEL SELECTION */}
              <div className="space-y-1.5">
                <label className="text-sm sm:text-xs font-bold text-slate-800 dark:text-zinc-200 block">
                  Modelo do Formulário <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedFormPublicId}
                  onChange={(e) => setSelectedFormPublicId(e.target.value)}
                  className="w-full px-4 py-3 sm:py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-base sm:text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:border-emerald-500 transition-colors min-h-[48px] cursor-pointer"
                >
                  {publishedForms.length === 0 ? (
                    <option value="">Nenhum modelo disponível</option>
                  ) : (
                    publishedForms.map((f) => (
                      <option key={f.publicId} value={f.publicId}>
                        {f.title} ({f.questions?.length || 0} perguntas){f.status === "DRAFT" ? " — (Rascunho)" : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* 2. OPTIONAL DUE DATE */}
              <div className="space-y-1.5">
                <label className="text-sm sm:text-xs font-bold text-slate-800 dark:text-zinc-200 block">
                  Prazo para Resposta (opcional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 sm:py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-base sm:text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:border-emerald-500 transition-colors min-h-[48px]"
                />
              </div>

              {/* 3. TARGET RECIPIENTS */}
              {preselectedStudentMembershipPublicId ? (
                <div className="space-y-1.5 pt-1">
                  <label className="text-sm sm:text-xs font-bold text-slate-800 dark:text-zinc-200 block">
                    Aluno Destinatário
                  </label>
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white block">
                        {students.find((s) => s.membershipPublicId === preselectedStudentMembershipPublicId)?.name || "Aluno Selecionado"}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-zinc-400 block">
                        {students.find((s) => s.membershipPublicId === preselectedStudentMembershipPublicId)?.email || ""}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-xs">
                      Confirmado
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <div>
                      <span className="text-sm sm:text-xs font-bold text-slate-900 dark:text-white block">
                        Enviar para todos os alunos ativos
                      </span>
                      <span className="text-xs sm:text-[11px] text-slate-500 dark:text-zinc-400">
                        Dispara para a base inteira ({students.length} alunos) de uma vez
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={assignToAll}
                      onChange={(e) => setAssignToAll(e.target.checked)}
                      className="w-5 h-5 rounded-md text-emerald-500 focus:ring-emerald-500 border-slate-300 dark:border-white/20 bg-white dark:bg-zinc-800 cursor-pointer"
                    />
                  </div>

                  {!assignToAll && (
                    <div className="space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <label className="text-sm sm:text-xs font-bold text-slate-800 dark:text-zinc-200">
                          Selecionar Alunos ({selectedStudentIds.length} selecionado{selectedStudentIds.length !== 1 ? "s" : ""})
                        </label>
                        {students.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedStudentIds.length === students.length) {
                                setSelectedStudentIds([]);
                              } else {
                                setSelectedStudentIds(students.map((s) => s.membershipPublicId));
                              }
                            }}
                            className="text-xs sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            {selectedStudentIds.length === students.length ? "Desmarcar todos" : "Selecionar todos"}
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Buscar aluno por nome ou email..."
                        className="w-full px-4 py-3 sm:py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-base sm:text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 font-medium focus:outline-hidden focus:border-emerald-500 min-h-[48px]"
                      />

                      <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-white/10 rounded-2xl p-2 bg-slate-50/50 dark:bg-white/[0.02]">
                        {filteredStudents.length === 0 ? (
                          <p className="text-xs text-slate-500 dark:text-zinc-400 text-center py-4">
                            Nenhum aluno encontrado.
                          </p>
                        ) : (
                          filteredStudents.map((s) => {
                            const isSelected = selectedStudentIds.includes(s.membershipPublicId);
                            return (
                              <button
                                type="button"
                                key={s.membershipPublicId}
                                onClick={() => toggleStudent(s.membershipPublicId)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors cursor-pointer min-h-[48px] ${
                                  isSelected
                                    ? "bg-emerald-500/10 border-emerald-500/40 text-slate-900 dark:text-white"
                                    : "bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 text-slate-700 dark:text-zinc-300"
                                }`}
                              >
                                <div className="truncate pr-2">
                                  <span className="text-sm sm:text-xs font-bold block truncate">{s.name}</span>
                                  <span className="text-xs sm:text-[11px] text-slate-500 dark:text-zinc-400 truncate block">
                                    {s.email}
                                  </span>
                                </div>
                                <div
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? "bg-emerald-500 border-emerald-500 text-white"
                                      : "border-slate-300 dark:border-white/20"
                                  }`}
                                >
                                  {isSelected && (
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* STICKY FOOTER (EMPILHADO EM MOBILE COM AÇÃO PRIMÁRIA NO TOPO) */}
        <div className="sticky bottom-0 shrink-0 bg-white/95 dark:bg-[#151619]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 p-4 sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2.5 z-10">
          {!successInfo && (
            <button
              type="button"
              onClick={handleAssign}
              disabled={isSubmitting || publishedForms.length === 0}
              className="w-full sm:w-auto sm:order-2 px-5 py-3 sm:py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm sm:text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>{isSubmitting ? "Enviando..." : "Atribuir Formulário"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto sm:order-1 px-4 py-3 sm:py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-sm sm:text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer min-h-[48px] flex items-center justify-center whitespace-nowrap"
          >
            {successInfo ? "Fechar" : "Cancelar"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
