"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/account/user-avatar";
import type {
  StudentAssessmentSummary,
  ConsultancyPhysicalAssessmentsStats,
} from "@/lib/consultancies/physical-assessments-types";
import { computeMetricDelta } from "@/lib/consultancies/physical-assessments-types";
import { recordProfessionalProgressAction } from "@/app/consultoria/[slug]/progresso/actions";

// ============================================================================
// ICONS
// ============================================================================
function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5m7 7l-7-7 7-7" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ScaleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-7-5l7-3 7 3M4 14l3.5-7L11 14M13 14l3.5-7L20 14" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function CalendarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
    }
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return dateStr;
    return dt.toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}

// ============================================================================
// PROPS INTERFACE
// ============================================================================
export interface PhysicalAssessmentsHubViewProps {
  consultancySlug: string;
  stats: ConsultancyPhysicalAssessmentsStats;
  students: StudentAssessmentSummary[];
}

export function PhysicalAssessmentsHubView({
  consultancySlug,
  stats,
  students,
}: PhysicalAssessmentsHubViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "EVALUATED" | "NOT_EVALUATED">("ALL");

  // Modals state
  const [isNewAssessmentModalOpen, setIsNewAssessmentModalOpen] = useState(false);
  const [preselectedStudent, setPreselectedStudent] = useState<StudentAssessmentSummary | null>(null);

  const [detailModalStudent, setDetailModalStudent] = useState<StudentAssessmentSummary | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Compute counts
  const totalCount = students.length;
  const evaluatedCount = useMemo(() => students.filter((s) => s.assessmentsCount > 0).length, [students]);
  const notEvaluatedCount = totalCount - evaluatedCount;

  // Filtered students
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // Filter tab
    if (activeFilter === "EVALUATED") {
      result = result.filter((s) => s.assessmentsCount > 0);
    } else if (activeFilter === "NOT_EVALUATED") {
      result = result.filter((s) => s.assessmentsCount === 0);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q))
      );
    }

    return result;
  }, [students, activeFilter, searchQuery]);

  // Handlers
  const handleOpenNewAssessment = (student?: StudentAssessmentSummary) => {
    setPreselectedStudent(student || null);
    setIsNewAssessmentModalOpen(true);
  };

  const handleOpenDetailModal = (student: StudentAssessmentSummary) => {
    setDetailModalStudent(student);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="w-full space-y-5 pb-12">
      {/* =====================================================================
          1. CABEÇALHO COMPACTO & AÇÃO PRINCIPAL
          ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <Link
            href={`/consultoria/${consultancySlug}`}
            aria-label="Voltar para o Início"
            className="w-10 h-10 rounded-xl bg-white border border-[#E5E8E2] text-[#5A6660] hover:text-[#102E23] flex items-center justify-center shadow-xs transition-colors shrink-0"
          >
            <ArrowLeftIcon className="w-4 h-4 text-[#176B49]" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#102E23]">
                Avaliações físicas
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]">
                {totalCount} {totalCount === 1 ? "aluno" : "alunos"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#5A6660] mt-0.5">
              Acompanhe medidas e a evolução corporal dos seus alunos{stats.totalAssessmentsCount > 0 ? ` • ${stats.totalAssessmentsCount} ${stats.totalAssessmentsCount === 1 ? "avaliação registrada" : "avaliações registradas"}` : ""}.
            </p>
          </div>
        </div>

        {/* Botão Primário: + Nova avaliação */}
        <button
          type="button"
          onClick={() => handleOpenNewAssessment()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#176B49] hover:bg-[#125438] active:scale-[0.99] transition-all shadow-xs cursor-pointer shrink-0 min-h-[42px]"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Nova avaliação</span>
        </button>
      </div>

      {/* =====================================================================
          2. BUSCA EM TEMPO REAL E ABAS DE FILTRO
          ===================================================================== */}
      <div className="space-y-3">
        {/* Barra de Busca */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E9992]">
            <SearchIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar aluno por nome ou e-mail..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] placeholder-[#8E9992] focus:outline-none focus:ring-2 focus:ring-[#176B49]/20 focus:border-[#176B49] transition-colors shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Limpar busca"
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8E9992] hover:text-[#102E23]"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 3 Abas de Filtro com contadores */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              activeFilter === "ALL"
                ? "bg-[#176B49] text-white shadow-xs"
                : "bg-white text-[#5A6660] border border-[#E5E8E2] hover:bg-[#F5F5F0] hover:text-[#102E23]"
            }`}
          >
            <span>Todos</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeFilter === "ALL" ? "bg-white/20 text-white" : "bg-[#F3F4F6] text-[#5A6660]"
              }`}
            >
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("EVALUATED")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              activeFilter === "EVALUATED"
                ? "bg-[#176B49] text-white shadow-xs"
                : "bg-white text-[#5A6660] border border-[#E5E8E2] hover:bg-[#F5F5F0] hover:text-[#102E23]"
            }`}
          >
            <span>Avaliados</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeFilter === "EVALUATED" ? "bg-white/20 text-white" : "bg-[#E8F0EA] text-[#176B49]"
              }`}
            >
              {evaluatedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("NOT_EVALUATED")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              activeFilter === "NOT_EVALUATED"
                ? "bg-[#176B49] text-white shadow-xs"
                : "bg-white text-[#5A6660] border border-[#E5E8E2] hover:bg-[#F5F5F0] hover:text-[#102E23]"
            }`}
          >
            <span>Sem avaliação</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeFilter === "NOT_EVALUATED" ? "bg-white/20 text-white" : "bg-[#F3F4F6] text-[#5A6660]"
              }`}
            >
              {notEvaluatedCount}
            </span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          3. LISTA DE ALUNOS COM CARDS CLAROS E AÇÕES DIRETAS
          ===================================================================== */}
      {filteredStudents.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border border-[#E5E8E2] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF9F6] border border-[#E5E8E2] flex items-center justify-center mx-auto text-[#8E9992]">
            <ScaleIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-[#102E23]">
              Nenhum aluno encontrado
            </h3>
            <p className="text-xs text-[#5A6660] max-w-sm mx-auto mt-1">
              {searchQuery
                ? `Nenhum aluno encontrado para a busca "${searchQuery}".`
                : activeFilter === "EVALUATED"
                ? "Nenhum aluno possui avaliação física cadastrada no momento."
                : "Todos os seus alunos já possuem ao menos uma avaliação física registrada."}
            </p>
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#176B49] bg-[#E8F0EA] hover:bg-[#DBE7DE] transition-colors cursor-pointer"
            >
              Limpar busca
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((student) => {
            const hasAssessment = student.assessmentsCount > 0 && student.latestAssessment !== null;
            const latest = student.latestAssessment;

            return (
              <div
                key={student.studentPublicId}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs hover:border-[#176B49]/40 transition-all space-y-3.5"
              >
                {/* Linha Superior: Avatar, Nome, Status e Atalho para Perfil */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar name={student.name} size="md" className="shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm sm:text-base text-[#102E23] truncate">
                          {student.name}
                        </p>
                        {hasAssessment ? (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]">
                            {student.assessmentsCount} {student.assessmentsCount === 1 ? "avaliação" : "avaliações"}
                          </span>
                        ) : (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F3F4F6] text-[#5A6660]">
                            Sem avaliação
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#5A6660] truncate">
                        {student.email || student.phone || "Aluno ativo"}
                      </p>
                    </div>
                  </div>

                  {/* Atalho sutil para perfil completo */}
                  <Link
                    href={`/consultoria/${consultancySlug}/progresso/alunos/${student.studentPublicId}`}
                    className="text-xs font-semibold text-[#8E9992] hover:text-[#176B49] transition-colors shrink-0 flex items-center gap-0.5"
                  >
                    <span className="hidden sm:inline">Ver perfil</span>
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Conteúdo Central: Métricas da Última Avaliação ou Estado Pendente */}
                {hasAssessment && latest ? (
                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-[#102E23] font-semibold">
                        <CalendarIcon className="w-3.5 h-3.5 text-[#176B49]" />
                        <span>Última avaliação: {formatDisplayDate(latest.recordedOn)}</span>
                      </div>
                      {latest.createdByName && (
                        <span className="text-[11px] text-[#5A6660]">
                          Por {latest.createdByName}
                        </span>
                      )}
                    </div>

                    {/* Pílulas de Medidas em Destaque */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {latest.weightKg != null && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-[#E5E8E2] text-[#102E23]">
                          <span className="text-[#5A6660] font-normal">Peso:</span>
                          <span>{latest.weightKg.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg</span>
                        </span>
                      )}
                      {latest.waistCm != null && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-[#E5E8E2] text-[#102E23]">
                          <span className="text-[#5A6660] font-normal">Cintura:</span>
                          <span>{latest.waistCm} cm</span>
                        </span>
                      )}
                      {latest.abdomenCm != null && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-[#E5E8E2] text-[#102E23]">
                          <span className="text-[#5A6660] font-normal">Abdômen:</span>
                          <span>{latest.abdomenCm} cm</span>
                        </span>
                      )}
                      {latest.armCm != null && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-[#E5E8E2] text-[#102E23]">
                          <span className="text-[#5A6660] font-normal">Braço:</span>
                          <span>{latest.armCm} cm</span>
                        </span>
                      )}
                      {latest.thighCm != null && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-[#E5E8E2] text-[#102E23]">
                          <span className="text-[#5A6660] font-normal">Coxa:</span>
                          <span>{latest.thighCm} cm</span>
                        </span>
                      )}
                      {latest.hipCm != null && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-[#E5E8E2] text-[#102E23]">
                          <span className="text-[#5A6660] font-normal">Quadril:</span>
                          <span>{latest.hipCm} cm</span>
                        </span>
                      )}
                    </div>

                    {latest.note && (
                      <p className="text-xs text-[#5A6660] italic pt-1 line-clamp-2">
                        &ldquo;{latest.note}&rdquo;
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] flex items-center justify-between text-xs">
                    <span className="text-[#5A6660]">
                      Nenhuma avaliação física registrada para este aluno.
                    </span>
                    <span className="font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full text-[10px]">
                      Pendente
                    </span>
                  </div>
                )}

                {/* Ações Diretas no Rodapé do Card */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {hasAssessment ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(student)}
                          className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold text-[#176B49] bg-[#E8F0EA] hover:bg-[#DBE7DE] active:scale-[0.99] transition-all cursor-pointer min-h-[36px]"
                        >
                          <ScaleIcon className="w-3.5 h-3.5" />
                          <span>Ver avaliação</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(student)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-[#5A6660] hover:text-[#102E23] hover:bg-[#F5F5F0] active:scale-[0.99] transition-all cursor-pointer min-h-[36px]"
                        >
                          <span>Histórico & Comparar</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenNewAssessment(student)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] active:scale-[0.99] transition-all shadow-xs cursor-pointer min-h-[36px]"
                      >
                        <PlusIcon className="w-3.5 h-3.5" />
                        <span>Nova avaliação</span>
                      </button>
                    )}
                  </div>

                  {/* Botão de adicionar outra avaliação para alunos que já possuem */}
                  {hasAssessment && (
                    <button
                      type="button"
                      onClick={() => handleOpenNewAssessment(student)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[#176B49] hover:bg-[#E8F0EA] transition-colors cursor-pointer"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>+ Nova</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          4. MODAL: NOVA AVALIAÇÃO FÍSICA
          ===================================================================== */}
      {isNewAssessmentModalOpen && (
        <NewPhysicalAssessmentModal
          consultancySlug={consultancySlug}
          students={students}
          preselectedStudent={preselectedStudent}
          onClose={() => {
            setIsNewAssessmentModalOpen(false);
            setPreselectedStudent(null);
          }}
          onSuccess={() => {
            setIsNewAssessmentModalOpen(false);
            setPreselectedStudent(null);
            startTransition(() => {
              router.refresh();
            });
          }}
        />
      )}

      {/* =====================================================================
          5. MODAL: VISUALIZAÇÃO E COMPARATIVO DE AVALIAÇÕES
          ===================================================================== */}
      {isDetailModalOpen && detailModalStudent && (
        <PhysicalAssessmentDetailModal
          consultancySlug={consultancySlug}
          student={detailModalStudent}
          onClose={() => {
            setIsDetailModalOpen(false);
            setDetailModalStudent(null);
          }}
          onAddNewAssessment={() => {
            const current = detailModalStudent;
            setIsDetailModalOpen(false);
            setDetailModalStudent(null);
            handleOpenNewAssessment(current);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// MODAL: NOVA AVALIAÇÃO FÍSICA
// ============================================================================
interface NewPhysicalAssessmentModalProps {
  consultancySlug: string;
  students: StudentAssessmentSummary[];
  preselectedStudent: StudentAssessmentSummary | null;
  onClose: () => void;
  onSuccess: () => void;
}

function NewPhysicalAssessmentModal({
  consultancySlug,
  students,
  preselectedStudent,
  onClose,
  onSuccess,
}: NewPhysicalAssessmentModalProps) {
  const [selectedStudentPublicId, setSelectedStudentPublicId] = useState(
    preselectedStudent?.studentPublicId || students[0]?.studentPublicId || ""
  );

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [recordedOn, setRecordedOn] = useState(todayStr);

  const [weightKg, setWeightKg] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [abdomenCm, setAbdomenCm] = useState("");
  const [hipCm, setHipCm] = useState("");
  const [armCm, setArmCm] = useState("");
  const [thighCm, setThighCm] = useState("");
  const [note, setNote] = useState("");

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedStudentPublicId) {
      setErrorMessage("Por favor, selecione um aluno.");
      return;
    }

    if (!recordedOn) {
      setErrorMessage("Informe a data da avaliação.");
      return;
    }

    // Check if at least weight or one measurement is provided
    if (
      !weightKg.trim() &&
      !waistCm.trim() &&
      !abdomenCm.trim() &&
      !hipCm.trim() &&
      !armCm.trim() &&
      !thighCm.trim()
    ) {
      setErrorMessage("Preencha ao menos uma medida (peso ou circunferência).");
      return;
    }

    const formData = new FormData();
    formData.set("recordedOn", recordedOn);
    if (weightKg.trim()) formData.set("weightKg", weightKg.trim().replace(",", "."));
    if (waistCm.trim()) formData.set("waistCm", waistCm.trim().replace(",", "."));
    if (abdomenCm.trim()) formData.set("abdomenCm", abdomenCm.trim().replace(",", "."));
    if (hipCm.trim()) formData.set("hipCm", hipCm.trim().replace(",", "."));
    if (armCm.trim()) formData.set("armCm", armCm.trim().replace(",", "."));
    if (thighCm.trim()) formData.set("thighCm", thighCm.trim().replace(",", "."));
    if (note.trim()) formData.set("note", note.trim());

    startTransition(async () => {
      const res = await recordProfessionalProgressAction(
        consultancySlug,
        selectedStudentPublicId,
        formData
      );

      if (res.success) {
        onSuccess();
      } else {
        setErrorMessage(res.error || "Erro ao salvar avaliação física. Tente novamente.");
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-[#E5E8E2] shadow-xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3 bg-[#FAF9F6]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E8F0EA] flex items-center justify-center shrink-0">
              <ScaleIcon className="w-5 h-5 text-[#176B49]" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-[#102E23]">
                Nova Avaliação Física
              </h2>
              <p className="text-xs text-[#5A6660]">
                Registre medidas e acompanhe a evolução do aluno
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg hover:bg-[#E5E8E2] text-[#5A6660] hover:text-[#102E23] flex items-center justify-center transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              {errorMessage}
            </div>
          )}

          {/* Seleção do Aluno */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#102E23]">
              Aluno <span className="text-red-500">*</span>
            </label>
            {preselectedStudent ? (
              <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar name={preselectedStudent.name} size="sm" />
                  <span className="text-sm font-bold text-[#102E23] truncate">
                    {preselectedStudent.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudentPublicId("")}
                  className="text-xs text-[#176B49] hover:underline font-semibold"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <select
                value={selectedStudentPublicId}
                onChange={(e) => setSelectedStudentPublicId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] focus:outline-none focus:ring-2 focus:ring-[#176B49]/20 focus:border-[#176B49]"
                required
              >
                <option value="">Selecione um aluno...</option>
                {students.map((s) => (
                  <option key={s.studentPublicId} value={s.studentPublicId}>
                    {s.name} ({s.email || "Sem e-mail"})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Data da Avaliação */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#102E23]">
              Data da avaliação <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={recordedOn}
              max={todayStr}
              onChange={(e) => setRecordedOn(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] focus:outline-none focus:ring-2 focus:ring-[#176B49]/20 focus:border-[#176B49]"
              required
            />
          </div>

          {/* Peso Corporal */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#102E23]">
              Peso (kg)
            </label>
            <input
              type="number"
              step="0.1"
              min="20"
              max="350"
              placeholder="Ex: 78.5"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] placeholder-[#8E9992] focus:outline-none focus:ring-2 focus:ring-[#176B49]/20 focus:border-[#176B49]"
            />
          </div>

          {/* Circunferências (cm) */}
          <div className="space-y-2 pt-2 border-t border-[#E5E8E2]">
            <p className="text-xs font-bold text-[#5A6660] uppercase tracking-wider">
              Circunferências (cm)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#5A6660]">Cintura</label>
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  placeholder="Ex: 82.0"
                  value={waistCm}
                  onChange={(e) => setWaistCm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] placeholder-[#8E9992] focus:outline-none focus:ring-2 focus:ring-[#176B49]/20 focus:border-[#176B49]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#5A6660]">Abdômen</label>
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  placeholder="Ex: 85.5"
                  value={abdomenCm}
                  onChange={(e) => setAbdomenCm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] placeholder-[#8E9992] focus:outline-none focus:ring-2 focus:ring-[#176B49]/20 focus:border-[#176B49]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#5A6660]">Quadril</label>
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  placeholder="Ex: 98.0"
                  value={hipCm}
                  onChange={(e) => setHipCm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] placeholder-[#8E9992] focus:outline-none focus:ring-2 focus:ring-[#176B49]/20 focus:border-[#176B49]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#5A6660]">Braço</label>
                <input
                  type="number"
                  step="0.1"
                  min="15"
                  max="100"
                  placeholder="Ex: 34.0"
                  value={armCm}
                  onChange={(e) => setArmCm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] placeholder-[#8E9992] focus:outline-none focus:ring-2 focus:ring-[#176B49]/20 focus:border-[#176B49]"
                />
              </div>

              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-[#5A6660]">Coxa</label>
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="150"
                  placeholder="Ex: 56.5"
                  value={thighCm}
                  onChange={(e) => setThighCm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] placeholder-[#8E9992] focus:outline-none focus:ring-2 focus:ring-[#176B49]/20 focus:border-[#176B49]"
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5 pt-2 border-t border-[#E5E8E2]">
            <label className="block text-xs font-bold text-[#102E23]">
              Observações do Personal (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Anotações sobre a evolução, objetivos ou orientações..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] placeholder-[#8E9992] focus:outline-none focus:ring-2 focus:ring-[#176B49]/20 focus:border-[#176B49]"
            />
          </div>

          {/* Rodapé de Ações */}
          <div className="pt-3 border-t border-[#E5E8E2] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#5A6660] hover:text-[#102E23] hover:bg-[#F5F5F0] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] active:scale-[0.99] transition-all shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar avaliação</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL: VISUALIZAÇÃO E COMPARATIVO DE AVALIAÇÕES
// ============================================================================
interface PhysicalAssessmentDetailModalProps {
  consultancySlug: string;
  student: StudentAssessmentSummary;
  onClose: () => void;
  onAddNewAssessment: () => void;
}

function PhysicalAssessmentDetailModal({
  consultancySlug,
  student,
  onClose,
  onAddNewAssessment,
}: PhysicalAssessmentDetailModalProps) {
  const assessments = useMemo(() => student.assessments || [], [student.assessments]);
  const latest = student.latestAssessment || assessments[0] || null;

  // Comparison selectors
  const [dateA, setDateA] = useState<string>(
    latest ? latest.publicId : assessments[0]?.publicId || ""
  );
  const [dateB, setDateB] = useState<string>(
    assessments.length > 1 ? assessments[1].publicId : ""
  );

  const selectedAssessmentA = useMemo(
    () => assessments.find((a) => a.publicId === dateA) || latest,
    [assessments, dateA, latest]
  );

  const selectedAssessmentB = useMemo(
    () => assessments.find((a) => a.publicId === dateB) || null,
    [assessments, dateB]
  );

  // Compute deltas between B (older) and A (newer)
  const deltas = useMemo(() => {
    if (!selectedAssessmentA || !selectedAssessmentB) return null;

    return {
      weight: computeMetricDelta(selectedAssessmentB.weightKg, selectedAssessmentA.weightKg, "kg"),
      waist: computeMetricDelta(selectedAssessmentB.waistCm, selectedAssessmentA.waistCm, "cm"),
      abdomen: computeMetricDelta(selectedAssessmentB.abdomenCm, selectedAssessmentA.abdomenCm, "cm"),
      hip: computeMetricDelta(selectedAssessmentB.hipCm, selectedAssessmentA.hipCm, "cm"),
      arm: computeMetricDelta(selectedAssessmentB.armCm, selectedAssessmentA.armCm, "cm"),
      thigh: computeMetricDelta(selectedAssessmentB.thighCm, selectedAssessmentA.thighCm, "cm"),
    };
  }, [selectedAssessmentA, selectedAssessmentB]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-[#E5E8E2] shadow-xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3 bg-[#FAF9F6]">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar name={student.name} size="md" className="shrink-0" />
            <div className="min-w-0">
              <h2 className="font-heading text-base font-bold text-[#102E23] truncate">
                {student.name}
              </h2>
              <p className="text-xs text-[#5A6660]">
                Histórico & Comparativo de Avaliações ({assessments.length})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onAddNewAssessment}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Nova</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="w-8 h-8 rounded-lg hover:bg-[#E5E8E2] text-[#5A6660] hover:text-[#102E23] flex items-center justify-center transition-colors cursor-pointer"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1">
          {/* Card Destaque: Avaliação Mais Recente */}
          {latest && (
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#176B49]" />
                  <p className="font-bold text-sm text-[#102E23]">
                    Última Avaliação: {formatDisplayDate(latest.recordedOn)}
                  </p>
                </div>
                {latest.createdByName && (
                  <span className="text-xs text-[#5A6660]">
                    Registrado por {latest.createdByName}
                  </span>
                )}
              </div>

              {/* Grid de Medidas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="p-2.5 rounded-lg bg-white border border-[#E5E8E2]">
                  <p className="text-[11px] text-[#5A6660]">Peso Corporal</p>
                  <p className="text-sm font-bold text-[#102E23]">
                    {latest.weightKg != null
                      ? `${latest.weightKg.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg`
                      : "—"}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-[#E5E8E2]">
                  <p className="text-[11px] text-[#5A6660]">Cintura</p>
                  <p className="text-sm font-bold text-[#102E23]">
                    {latest.waistCm != null ? `${latest.waistCm} cm` : "—"}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-[#E5E8E2]">
                  <p className="text-[11px] text-[#5A6660]">Abdômen</p>
                  <p className="text-sm font-bold text-[#102E23]">
                    {latest.abdomenCm != null ? `${latest.abdomenCm} cm` : "—"}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-[#E5E8E2]">
                  <p className="text-[11px] text-[#5A6660]">Quadril</p>
                  <p className="text-sm font-bold text-[#102E23]">
                    {latest.hipCm != null ? `${latest.hipCm} cm` : "—"}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-[#E5E8E2]">
                  <p className="text-[11px] text-[#5A6660]">Braço</p>
                  <p className="text-sm font-bold text-[#102E23]">
                    {latest.armCm != null ? `${latest.armCm} cm` : "—"}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-[#E5E8E2]">
                  <p className="text-[11px] text-[#5A6660]">Coxa</p>
                  <p className="text-sm font-bold text-[#102E23]">
                    {latest.thighCm != null ? `${latest.thighCm} cm` : "—"}
                  </p>
                </div>
              </div>

              {latest.note && (
                <div className="pt-1 border-t border-[#E5E8E2]">
                  <p className="text-xs text-[#5A6660]">
                    <span className="font-semibold text-[#102E23]">Observação: </span>
                    {latest.note}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ===================================================================
              COMPARATIVO ENTRE 2 DATAS (SE HOUVER 2 OU MAIS REGISTROS)
              =================================================================== */}
          {assessments.length > 1 && (
            <div className="p-4 rounded-xl bg-white border border-[#E5E8E2] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-heading text-xs font-bold text-[#5A6660] uppercase tracking-wider">
                  Comparador de Evolução
                </h3>
                <span className="text-xs text-[#176B49] font-semibold">
                  {assessments.length} registros disponíveis
                </span>
              </div>

              {/* Seletores de Datas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#102E23]">
                    Data Recente (A):
                  </label>
                  <select
                    value={dateA}
                    onChange={(e) => setDateA(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-xs font-semibold text-[#102E23] focus:outline-none focus:ring-1 focus:ring-[#176B49]"
                  >
                    {assessments.map((a) => (
                      <option key={`a-${a.publicId}`} value={a.publicId}>
                        {formatDisplayDate(a.recordedOn)} {a.weightKg ? `(${a.weightKg} kg)` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#102E23]">
                    Data Anterior (B):
                  </label>
                  <select
                    value={dateB}
                    onChange={(e) => setDateB(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-xs font-semibold text-[#102E23] focus:outline-none focus:ring-1 focus:ring-[#176B49]"
                  >
                    <option value="">Selecione outra data...</option>
                    {assessments.map((a) => (
                      <option key={`b-${a.publicId}`} value={a.publicId}>
                        {formatDisplayDate(a.recordedOn)} {a.weightKg ? `(${a.weightKg} kg)` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tabela de Comparação */}
              {selectedAssessmentA && selectedAssessmentB && deltas && (
                <div className="mt-3 border border-[#E5E8E2] rounded-xl overflow-hidden divide-y divide-[#E5E8E2]">
                  <div className="grid grid-cols-4 px-3 py-2 bg-[#FAF9F6] text-[11px] font-bold text-[#5A6660] uppercase">
                    <span>Métrica</span>
                    <span className="text-center">Data B</span>
                    <span className="text-center">Data A</span>
                    <span className="text-right">Diferença</span>
                  </div>

                  {/* Peso */}
                  <ComparisonRow
                    label="Peso"
                    valB={selectedAssessmentB.weightKg != null ? `${selectedAssessmentB.weightKg} kg` : "—"}
                    valA={selectedAssessmentA.weightKg != null ? `${selectedAssessmentA.weightKg} kg` : "—"}
                    delta={deltas.weight}
                  />

                  {/* Cintura */}
                  <ComparisonRow
                    label="Cintura"
                    valB={selectedAssessmentB.waistCm != null ? `${selectedAssessmentB.waistCm} cm` : "—"}
                    valA={selectedAssessmentA.waistCm != null ? `${selectedAssessmentA.waistCm} cm` : "—"}
                    delta={deltas.waist}
                  />

                  {/* Abdômen */}
                  <ComparisonRow
                    label="Abdômen"
                    valB={selectedAssessmentB.abdomenCm != null ? `${selectedAssessmentB.abdomenCm} cm` : "—"}
                    valA={selectedAssessmentA.abdomenCm != null ? `${selectedAssessmentA.abdomenCm} cm` : "—"}
                    delta={deltas.abdomen}
                  />

                  {/* Quadril */}
                  <ComparisonRow
                    label="Quadril"
                    valB={selectedAssessmentB.hipCm != null ? `${selectedAssessmentB.hipCm} cm` : "—"}
                    valA={selectedAssessmentA.hipCm != null ? `${selectedAssessmentA.hipCm} cm` : "—"}
                    delta={deltas.hip}
                  />

                  {/* Braço */}
                  <ComparisonRow
                    label="Braço"
                    valB={selectedAssessmentB.armCm != null ? `${selectedAssessmentB.armCm} cm` : "—"}
                    valA={selectedAssessmentA.armCm != null ? `${selectedAssessmentA.armCm} cm` : "—"}
                    delta={deltas.arm}
                  />

                  {/* Coxa */}
                  <ComparisonRow
                    label="Coxa"
                    valB={selectedAssessmentB.thighCm != null ? `${selectedAssessmentB.thighCm} cm` : "—"}
                    valA={selectedAssessmentA.thighCm != null ? `${selectedAssessmentA.thighCm} cm` : "—"}
                    delta={deltas.thigh}
                  />
                </div>
              )}
            </div>
          )}

          {/* ===================================================================
              LINHA DO TEMPO: HISTÓRICO COMPLETO
              =================================================================== */}
          <div className="space-y-2">
            <h3 className="font-heading text-xs font-bold text-[#5A6660] uppercase tracking-wider">
              Histórico de Avaliações
            </h3>

            {assessments.length === 0 ? (
              <p className="text-xs text-[#5A6660] py-2">
                Nenhum histórico registrado até o momento.
              </p>
            ) : (
              <div className="divide-y divide-[#E5E8E2] border border-[#E5E8E2] rounded-xl overflow-hidden bg-white">
                {assessments.map((a, idx) => (
                  <div key={a.publicId || idx} className="p-3 hover:bg-[#FAF9F6] transition-colors text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#102E23]">
                        {formatDisplayDate(a.recordedOn)}
                      </span>
                      {a.weightKg != null && (
                        <span className="font-bold text-[#176B49] bg-[#E8F0EA] px-2 py-0.5 rounded-full text-[11px]">
                          {a.weightKg} kg
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#5A6660]">
                      {a.waistCm != null && <span>Cintura: {a.waistCm} cm</span>}
                      {a.abdomenCm != null && <span>• Abd: {a.abdomenCm} cm</span>}
                      {a.armCm != null && <span>• Braço: {a.armCm} cm</span>}
                      {a.thighCm != null && <span>• Coxa: {a.thighCm} cm</span>}
                      {a.hipCm != null && <span>• Quad: {a.hipCm} cm</span>}
                    </div>
                    {a.note && (
                      <p className="text-[11px] text-[#5A6660] italic pt-0.5">&ldquo;{a.note}&rdquo;</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-[#E5E8E2] bg-[#FAF9F6] flex items-center justify-between gap-3">
          <Link
            href={`/consultoria/${consultancySlug}/progresso/alunos/${student.studentPublicId}`}
            className="text-xs font-bold text-[#176B49] hover:underline flex items-center gap-1"
          >
            <span>Abrir perfil completo do aluno</span>
            <ChevronRightIcon className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#5A6660] hover:text-[#102E23] hover:bg-[#E5E8E2] transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({
  label,
  valB,
  valA,
  delta,
}: {
  label: string;
  valB: string;
  valA: string;
  delta: { diff: number; diffFormatted: string; direction: "INCREASED" | "DECREASED" | "UNCHANGED" } | null;
}) {
  return (
    <div className="grid grid-cols-4 px-3 py-2 text-xs items-center hover:bg-[#FAF9F6]/50">
      <span className="font-semibold text-[#102E23]">{label}</span>
      <span className="text-center text-[#5A6660]">{valB}</span>
      <span className="text-center font-bold text-[#102E23]">{valA}</span>
      <div className="text-right">
        {delta ? (
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
              delta.direction === "DECREASED"
                ? "bg-emerald-50 text-emerald-700"
                : delta.direction === "INCREASED"
                ? "bg-amber-50 text-amber-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {delta.diffFormatted}
          </span>
        ) : (
          <span className="text-[#8E9992]">—</span>
        )}
      </div>
    </div>
  );
}
