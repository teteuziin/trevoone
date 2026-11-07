"use client";

import React, { useState, useEffect } from "react";
import { searchActiveStudentsAction } from "@/app/consultoria/[slug]/rotinas/actions";
import type { StudentSearchResult } from "@/lib/training-v2/assignment-repository";

interface StudentSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  onSelectStudent: (student: {
    membershipPublicId: string;
    name: string;
    email?: string;
  }) => Promise<void>;
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function StudentSelectModal({
  isOpen,
  onClose,
  consultancySlug,
  onSelectStudent,
}: StudentSelectModalProps) {
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<StudentSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    async function fetchStudents() {
      setIsLoading(true);
      try {
        const res = await searchActiveStudentsAction(consultancySlug, query.trim());
        if (!isCancelled && res.ok && res.data) {
          setStudents(res.data);
        }
      } catch (err) {
        console.error("Erro ao buscar alunos:", err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    const timer = setTimeout(fetchStudents, 250);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, consultancySlug, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3 bg-[#FAFBF9]">
          <div>
            <h2 className="text-base font-extrabold text-[#102E23]">
              Vincular Aluno à Ficha
            </h2>
            <p className="text-xs text-[#526058]">
              Selecione o aluno que receberá este programa de treino.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F0] hover:bg-[#EAEFEA] text-[#526058] flex items-center justify-center transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 sm:p-4 border-b border-[#F0F2ED]">
          <div className="relative">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7870] w-4 h-4" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite o nome ou e-mail do aluno..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-[#F5F5F0] border border-[#E5E8E2] rounded-2xl text-[#102E23] focus:outline-none focus:ring-2 focus:ring-[#176B49]/30"
              autoFocus
            />
          </div>
        </div>

        {/* Student List */}
        <div className="p-2 sm:p-3 overflow-y-auto flex-1 space-y-1">
          {isLoading ? (
            <div className="py-10 text-center text-xs text-[#6B7870] animate-pulse">
              Buscando alunos...
            </div>
          ) : students.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#6B7870]">
              Nenhum aluno encontrado para este termo.
            </div>
          ) : (
            students.map((student) => (
              <div
                key={student.membershipPublicId}
                onClick={async () => {
                  await onSelectStudent({
                    membershipPublicId: student.membershipPublicId,
                    name: student.name,
                    email: student.email,
                  });
                  onClose();
                }}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-[#F0F5F2] cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <span className="w-9 h-9 rounded-xl bg-[#102E23] text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {student.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-[#102E23] group-hover:text-[#176B49] transition-colors truncate">
                      {student.name}
                    </p>
                    {student.email && (
                      <p className="text-[11px] text-[#6B7870] truncate">
                        {student.email}
                      </p>
                    )}
                  </div>
                </div>

                <span className="text-xs font-bold text-[#176B49] group-hover:underline shrink-0">
                  Selecionar →
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
