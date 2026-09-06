"use client";

import React, { useState, useTransition } from "react";
import {
  updateAssignmentVersionAction,
  endAssignmentAction,
} from "@/app/consultoria/[slug]/planos-v2/actions";
import type { AssignmentListItemDto } from "@/lib/nutrition-v2/assignment-repository";

interface Props {
  slug: string;
  planPublicId: string;
  assignments: AssignmentListItemDto[];
  onRefresh: () => void;
}

export function NutritionAssignmentsList({
  slug,
  planPublicId,
  assignments,
  onRefresh,
}: Props) {
  const [selectedForEnd, setSelectedForEnd] = useState<AssignmentListItemDto | null>(null);
  const [selectedForUpdate, setSelectedForUpdate] = useState<AssignmentListItemDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleUpdate = () => {
    if (!selectedForUpdate || !selectedForUpdate.newerPublishedVersion) return;
    setError(null);

    startTransition(async () => {
      try {
        const res = await updateAssignmentVersionAction(
          slug,
          planPublicId,
          selectedForUpdate.assignmentPublicId,
          selectedForUpdate.newerPublishedVersion!.publicId
        );
        if (res.success) {
          setSelectedForUpdate(null);
          onRefresh();
        } else {
          setError(res.error || "Erro ao atualizar versão da prescrição.");
        }
      } catch {
        setError("Erro inesperado ao atualizar versão.");
      }
    });
  };

  const handleEnd = () => {
    if (!selectedForEnd) return;
    setError(null);

    startTransition(async () => {
      try {
        const res = await endAssignmentAction(
          slug,
          planPublicId,
          selectedForEnd.assignmentPublicId
        );
        if (res.success) {
          setSelectedForEnd(null);
          onRefresh();
        } else {
          setError(res.error || "Erro ao encerrar prescrição.");
        }
      } catch {
        setError("Erro inesperado ao encerrar prescrição.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 border border-slate-200 rounded-2xl p-6">
          <svg className="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <div className="text-sm font-semibold text-slate-700">Nenhum aluno prescrito neste plano</div>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Utilize o botão &quot;Prescrever&quot; no topo da página para prescrever este plano alimentar a um aluno.
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {assignments.map((asg) => {
              const isActive = asg.status === "ACTIVE";

              return (
                <div
                  key={asg.assignmentPublicId}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 truncate">
                        {asg.studentName}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isActive ? "Ativa" : "Encerrada"}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        Versão {asg.versionNumber}
                      </span>
                      {isActive && asg.newerPublishedVersion && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                          Nova V{asg.newerPublishedVersion.versionNumber} disponível
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{asg.studentEmail}</span>
                      <span>•</span>
                      <span>Início: {asg.startsOn}</span>
                      {asg.endsOn && (
                        <>
                          <span>•</span>
                          <span>Término: {asg.endsOn}</span>
                        </>
                      )}
                    </div>

                    {asg.notesForStudent && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg mt-1.5 line-clamp-2">
                        <span className="font-semibold text-slate-700">Obs: </span>
                        {asg.notesForStudent}
                      </p>
                    )}
                  </div>

                  {/* Actions for Active Assignment */}
                  {isActive && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0">
                      {asg.newerPublishedVersion && (
                        <button
                          type="button"
                          onClick={() => setSelectedForUpdate(asg)}
                          disabled={isPending}
                          className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors shadow-sm"
                        >
                          Atualizar para V{asg.newerPublishedVersion.versionNumber}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedForEnd(asg)}
                        disabled={isPending}
                        className="px-3 py-1.5 text-xs font-semibold text-red-700 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-xl transition-colors"
                      >
                        Encerrar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Version Update */}
      {selectedForUpdate && selectedForUpdate.newerPublishedVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Atualizar versão da prescrição?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              O aluno <strong className="text-slate-800">{selectedForUpdate.studentName}</strong> passará da Versão{" "}
              <strong>{selectedForUpdate.versionNumber}</strong> para a Versão{" "}
              <strong>{selectedForUpdate.newerPublishedVersion.versionNumber}</strong>. A prescrição anterior será
              encerrada e o histórico será preservado com as datas exatas.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedForUpdate(null)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-sm"
              >
                {isPending ? "Atualizando..." : "Confirmar Atualização"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Termination */}
      {selectedForEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Encerrar plano alimentar?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Deseja realmente encerrar a prescrição ativa de <strong className="text-slate-800">{selectedForEnd.studentName}</strong>?
              O aluno não terá mais um plano alimentar ativo nesta consultoria e verá o estado sem plano ativo.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedForEnd(null)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEnd}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm"
              >
                {isPending ? "Encerrando..." : "Confirmar Encerramento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
