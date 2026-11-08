"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WorkoutListItemDto } from "@/lib/training-v2/workout-repository";
import {
  listExistingWorkoutsForCloneAction,
  duplicateWorkoutAction,
} from "@/app/consultoria/[slug]/rotinas/actions";

interface ExistingWorkoutPickerProps {
  consultancySlug: string;
  isOpen: boolean;
  onClose: () => void;
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function ExistingWorkoutPicker({
  consultancySlug,
  isOpen,
  onClose,
}: ExistingWorkoutPickerProps) {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<WorkoutListItemDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [isCloning, startCloning] = useTransition();

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) {
        setIsLoading(true);
        setErrorMessage(null);
      }
    });

    listExistingWorkoutsForCloneAction(consultancySlug, searchQuery)
      .then((res) => {
        if (isMounted) {
          if (res.ok && res.data) {
            setWorkouts(res.data);
          } else {
            setErrorMessage(res.error || "Erro ao listar treinos.");
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setErrorMessage("Erro de conexão ao carregar treinos.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, consultancySlug, searchQuery]);

  if (!isOpen) return null;

  const handleSelectWorkout = (workout: WorkoutListItemDto) => {
    setSelectedWorkoutId(workout.publicId);
    setErrorMessage(null);

    startCloning(async () => {
      const res = await duplicateWorkoutAction(consultancySlug, workout.publicId, undefined, {
        title: `Modelo — ${workout.title}`,
        isTemplate: true,
      });

      if (!res.ok || !res.data) {
        setErrorMessage(res.error || "Erro ao transformar treino em modelo.");
        setSelectedWorkoutId(null);
      } else {
        onClose();
        router.push(`/consultoria/${consultancySlug}/rotinas/${res.data.workoutPublicId}`);
        router.refresh();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3 bg-[#FAFBF9]">
          <div>
            <h3 className="text-base font-extrabold text-[#102E23]">
              Usar um treino existente como modelo
            </h3>
            <p className="text-xs text-[#526058] mt-0.5">
              Uma cópia independente será salva como modelo pronto.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isCloning}
            className="w-8 h-8 rounded-full bg-[#F5F5F0] hover:bg-[#EAEFEA] text-[#526058] flex items-center justify-center transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[#F0F2ED] bg-white">
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-[#8C9890] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar pelo título do treino..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-[#F5F5F0] border border-[#E5E8E2] focus:outline-none focus:ring-1 focus:ring-[#176B49] text-[#102E23]"
            />
          </div>
        </div>

        {/* Body List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-xs text-[#6B7870] animate-pulse">
              Carregando seus treinos...
            </div>
          ) : workouts.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#6B7870] space-y-1">
              <p className="font-bold text-[#102E23]">Nenhum treino encontrado</p>
              <p>Crie um treino do zero ou importe uma ficha para começar.</p>
            </div>
          ) : (
            workouts.map((w) => {
              const isSelected = selectedWorkoutId === w.publicId;

              return (
                <div
                  key={w.publicId}
                  onClick={() => !isCloning && handleSelectWorkout(w)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-[#EBF7EE] border-[#176B49] shadow-xs"
                      : "bg-[#FDFDFC] hover:bg-[#F5F5F0] border-[#E5E8E2]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-[#102E23] truncate">
                      {w.title}
                    </h4>
                    <p className="text-[11px] text-[#526058] mt-0.5">
                      {w.blocksCount || 1} {w.blocksCount === 1 ? "divisão" : "divisões"}
                      {w.assignedStudentName ? ` • Aluno: ${w.assignedStudentName}` : ""}
                    </p>
                  </div>

                  <span className="text-xs font-bold text-[#176B49] shrink-0">
                    {isSelected && isCloning ? "Clonando..." : "Copiar como modelo →"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
