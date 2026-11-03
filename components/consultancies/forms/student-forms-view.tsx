"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ConsultancyFormAssignmentDto } from "@/lib/consultancies/forms";
import { FormRunner } from "./form-runner";

interface StudentFormsViewProps {
  consultancySlug: string;
  initialAssignments: ConsultancyFormAssignmentDto[];
  autoOpenAssignmentPublicId?: string;
}

export function StudentFormsView({
  consultancySlug,
  initialAssignments,
  autoOpenAssignmentPublicId,
}: StudentFormsViewProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");

  const [activeAssignment, setActiveAssignment] = useState<ConsultancyFormAssignmentDto | null>(() => {
    if (autoOpenAssignmentPublicId) {
      return initialAssignments.find((a) => a.publicId === autoOpenAssignmentPublicId) || null;
    }
    return null;
  });

  const pendingAssignments = useMemo(
    () => initialAssignments.filter((a) => a.status === "PENDING"),
    [initialAssignments]
  );

  const completedAssignments = useMemo(
    () => initialAssignments.filter((a) => a.status === "SUBMITTED" || a.status === "REVIEWED"),
    [initialAssignments]
  );

  const displayedAssignments = useMemo(() => {
    if (activeTab === "PENDING") return pendingAssignments;
    if (activeTab === "COMPLETED") return completedAssignments;
    return initialAssignments;
  }, [activeTab, pendingAssignments, completedAssignments, initialAssignments]);

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto pb-16">
      {/* HEADER */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Meus Formulários
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
          Responda questionários de anamnese, avaliações e check-ins enviados pelo seu treinador.
        </p>
      </div>

      {/* FILTER TABS */}
      <div className="border-b border-slate-200 dark:border-white/10 flex items-center gap-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-2 ${
            activeTab === "ALL"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>Todos</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300">
            {initialAssignments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PENDING")}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-2 ${
            activeTab === "PENDING"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>Pendentes</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              pendingAssignments.length > 0
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-300"
            }`}
          >
            {pendingAssignments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("COMPLETED")}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-2 ${
            activeTab === "COMPLETED"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>Concluídos</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300">
            {completedAssignments.length}
          </span>
        </button>
      </div>

      {/* ASSIGNMENTS LIST */}
      {displayedAssignments.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Nenhum formulário encontrado
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
            Quando seu profissional atribuir um questionário para você, ele aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedAssignments.map((assignment) => {
            const isPending = assignment.status === "PENDING";
            const isReviewed = assignment.status === "REVIEWED";
            const isSubmitted = assignment.status === "SUBMITTED";

            const dueDateObj = assignment.dueDate ? new Date(assignment.dueDate) : null;
            const isOverdue = dueDateObj && isPending && dueDateObj < new Date();

            return (
              <div
                key={assignment.publicId}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-white/20 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isReviewed
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : isSubmitted
                          ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                          : isOverdue
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {isReviewed
                        ? "Revisado"
                        : isSubmitted
                        ? "Enviado"
                        : isOverdue
                        ? "Atrasado"
                        : "Pendente"}
                    </span>

                    {assignment.dueDate && (
                      <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                        Prazo: {new Date(assignment.dueDate).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {assignment.formTitle}
                    </h3>
                    {assignment.formDescription && (
                      <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mt-1">
                        {assignment.formDescription}
                      </p>
                    )}
                  </div>

                  {assignment.reviewerNotes && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                      <span className="font-bold block text-[11px]">Recado do treinador:</span>
                      <p className="mt-0.5 line-clamp-2">{assignment.reviewerNotes}</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    {assignment.questions?.length || 0} pergunta{assignment.questions?.length !== 1 ? "s" : ""}
                  </span>

                  <button
                    type="button"
                    onClick={() => setActiveAssignment(assignment)}
                    className={`px-4 py-2.5 sm:py-2 rounded-xl text-sm sm:text-xs font-bold transition-all cursor-pointer min-h-[48px] sm:min-h-[40px] flex items-center gap-1.5 ${
                      isPending
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-white/10"
                    }`}
                  >
                    <span>
                      {isPending
                        ? "Preencher Formulário"
                        : isReviewed
                        ? "Ver Avaliação"
                        : "Ver Minhas Respostas"}
                    </span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RUNNER MODAL */}
      {activeAssignment && (
        <FormRunner
          isOpen={Boolean(activeAssignment)}
          onClose={() => setActiveAssignment(null)}
          consultancySlug={consultancySlug}
          assignment={activeAssignment}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
