"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

const emptySubscribe = () => () => {};
import type {
  ChatConsultationDto,
  ChatMessageDto,
  ChatConsultationStatus,
  ChatMessageType,
} from "@/lib/consultancies/trevo-chat";
import { ChatMessageList } from "./chat-message-list";
import { ChatInputBar } from "./chat-input-bar";
import { AIAnamnesisPanel } from "./ai-anamnesis-panel";
import { UserAvatar } from "@/components/account/user-avatar";
import { TrevoChatWelcomeModal } from "./trevo-chat-welcome-modal";
import {
  sendChatMessageAction,
  markChatReadAction,
  proposeChatConsultationAction,
  respondToChatProposalAction,
  cancelChatConsultationAction,
  closeChatConsultationAction,
  requestReturnConsultationAction,
  hideConsultationAction,
  restoreConsultationAction,
  saveIntroViewAction,
} from "@/app/consultoria/[slug]/consultas/chat-actions";

export interface StudentCandidate {
  membershipId: number;
  userPublicId: string;
  name: string;
  email: string;
}

export interface ProfessionalCandidate {
  membershipId: number;
  membershipPublicId: string;
  userPublicId: string;
  name: string;
  email: string;
  role: "PERSONAL" | "NUTRITIONIST";
}

interface TrevoChatWorkspaceProps {
  consultancySlug: string;
  currentUserId: number;
  isProfessional: boolean;
  audienceRole?: "STUDENT" | "PROFESSIONAL";
  hasSeenIntro?: boolean;
  professionalType?: "PERSONAL" | "NUTRITIONIST";
  consultations: ChatConsultationDto[];
  initialActivePublicId?: string | null;
  activeStudents?: StudentCandidate[];
  activeProfessionals?: ProfessionalCandidate[];
}

function isChatMessagingUnlocked(status: ChatConsultationStatus): boolean {
  return (
    status === "CONFIRMED" ||
    status === "AWAITING_STUDENT" ||
    status === "AWAITING_PROFESSIONAL"
  );
}

// Queue definitions
// Professional Queues: PRECISO_RESPONDER | AGUARDANDO_ALUNO | SOLICITACOES_RECEBIDAS | CONCLUIDOS | ALL
// Student Queues: EM_ATENDIMENTO | SOLICITACOES | CONCLUIDAS | ALL
export type ProQueue = "PRECISO_RESPONDER" | "AGUARDANDO_ALUNO" | "SOLICITACOES_RECEBIDAS" | "CONCLUIDOS" | "ALL" | "REMOVIDAS";
export type StudentQueue = "EM_ATENDIMENTO" | "SOLICITACOES" | "CONCLUIDAS" | "ALL" | "REMOVIDAS";

export function getStudentQueueKey(c: ChatConsultationDto): StudentQueue {
  if (
    c.status === "COMPLETED" ||
    c.status === "DECLINED" ||
    c.status === "CANCELED" ||
    Boolean(c.closedAt) ||
    c.modality === "VIDEO"
  ) {
    return "CONCLUIDAS";
  }
  if (c.status === "PROPOSED") {
    return "SOLICITACOES";
  }
  return "EM_ATENDIMENTO";
}

export function getProQueueKey(c: ChatConsultationDto): ProQueue {
  if (
    c.status === "COMPLETED" ||
    c.status === "DECLINED" ||
    c.status === "CANCELED" ||
    Boolean(c.closedAt) ||
    c.modality === "VIDEO"
  ) {
    return "CONCLUIDOS";
  }
  if (c.status === "PROPOSED") {
    return "SOLICITACOES_RECEBIDAS";
  }
  if (c.status === "AWAITING_PROFESSIONAL") {
    return "PRECISO_RESPONDER";
  }
  return "AGUARDANDO_ALUNO";
}

function ConversationOptionsMenu({
  consultation,
  onOpenExcludeModal,
  onRestore,
  onOpenIntro,
  placement = "list",
}: {
  consultation: ChatConsultationDto;
  onOpenExcludeModal: (c: ChatConsultationDto) => void;
  onRestore: (c: ChatConsultationDto) => void;
  onOpenIntro?: () => void;
  placement?: "list" | "header";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const isRemoved = Boolean(consultation.isRemovedFromMyList);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Opções da conversa"
        title="Opções da conversa"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-[#1A1C22] text-zinc-500 dark:text-zinc-400 active:scale-95 transition-colors cursor-pointer"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6.75a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6.75a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`absolute z-30 w-52 py-1 bg-white dark:bg-[#16171B] border border-[#E5E7EB] dark:border-[#2E313A] rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-100 ${
            placement === "header" ? "right-0 top-full mt-1" : "right-0 top-full mt-1"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {!isRemoved ? (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenExcludeModal(consultation);
              }}
              className="w-full min-h-[44px] px-3.5 py-2.5 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 transition-colors cursor-pointer rounded-xl mx-0.5"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              <span>Excluir da minha lista</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onRestore(consultation);
              }}
              className="w-full min-h-[44px] px-3.5 py-2.5 text-left text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-2.5 transition-colors cursor-pointer rounded-xl mx-0.5"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>Restaurar na minha lista</span>
            </button>
          )}

          {onOpenIntro && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenIntro();
              }}
              className="w-full min-h-[44px] px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#252830] flex items-center gap-2.5 transition-colors cursor-pointer rounded-xl mx-0.5 border-t border-[#E5E7EB] dark:border-[#2E313A] mt-1 pt-2"
            >
              <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
              <span>Ver introdução novamente</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function TrevoChatWorkspace({
  consultancySlug,
  currentUserId,
  isProfessional,
  audienceRole,
  hasSeenIntro = false,
  professionalType = "PERSONAL",
  consultations: initialConsultations,
  initialActivePublicId,
  activeStudents = [],
  activeProfessionals = [],
}: TrevoChatWorkspaceProps) {
  // Local consultations state
  const [createdConsultations, setCreatedConsultations] = useState<ChatConsultationDto[]>([]);
  const [updatedConsultations, setUpdatedConsultations] = useState<Record<string, Partial<ChatConsultationDto>>>({});

  // Merge created and updated with initial props
  const consultations = useMemo(() => {
    return [
      ...createdConsultations.filter(
        (c) => !initialConsultations.some((ic) => ic.publicId === c.publicId)
      ),
      ...initialConsultations,
    ].map((c) => ({
      ...c,
      ...(updatedConsultations[c.publicId] || {}),
    }));
  }, [createdConsultations, initialConsultations, updatedConsultations]);

  // Queue counts calculation
  const queueCounts = useMemo(() => {
    const removedCount = consultations.filter((c) => Boolean(c.isRemovedFromMyList)).length;

    if (isProfessional) {
      const counts: Record<ProQueue, number> = {
        PRECISO_RESPONDER: 0,
        AGUARDANDO_ALUNO: 0,
        SOLICITACOES_RECEBIDAS: 0,
        CONCLUIDOS: 0,
        ALL: consultations.filter((c) => !c.isRemovedFromMyList).length,
        REMOVIDAS: removedCount,
      };
      consultations.forEach((c) => {
        if (c.isRemovedFromMyList) return;
        const key = getProQueueKey(c);
        counts[key] = (counts[key] || 0) + 1;
      });
      return counts;
    } else {
      const counts: Record<StudentQueue, number> = {
        EM_ATENDIMENTO: 0,
        SOLICITACOES: 0,
        CONCLUIDAS: 0,
        ALL: consultations.filter((c) => !c.isRemovedFromMyList).length,
        REMOVIDAS: removedCount,
      };
      consultations.forEach((c) => {
        if (c.isRemovedFromMyList) return;
        const key = getStudentQueueKey(c);
        counts[key] = (counts[key] || 0) + 1;
      });
      return counts;
    }
  }, [consultations, isProfessional]);

  // Initial active queue tab
  const [activeQueueTab, setActiveQueueTab] = useState<string>(() => {
    if (isProfessional) {
      if ((queueCounts as Record<ProQueue, number>).PRECISO_RESPONDER > 0) return "PRECISO_RESPONDER";
      if ((queueCounts as Record<ProQueue, number>).AGUARDANDO_ALUNO > 0) return "AGUARDANDO_ALUNO";
      if ((queueCounts as Record<ProQueue, number>).SOLICITACOES_RECEBIDAS > 0) return "SOLICITACOES_RECEBIDAS";
      if ((queueCounts as Record<ProQueue, number>).CONCLUIDOS > 0) return "CONCLUIDOS";
      return "ALL";
    } else {
      if ((queueCounts as Record<StudentQueue, number>).EM_ATENDIMENTO > 0) return "EM_ATENDIMENTO";
      if ((queueCounts as Record<StudentQueue, number>).SOLICITACOES > 0) return "SOLICITACOES";
      if ((queueCounts as Record<StudentQueue, number>).CONCLUIDAS > 0) return "CONCLUIDAS";
      return "ALL";
    }
  });

  // Selected chat publicId (NEVER auto-select a video consultation on initial load!)
  const [selectedChatPublicId, setSelectedChatPublicId] = useState<string | null>(() => {
    if (initialActivePublicId) return initialActivePublicId;

    const initialQueue = isProfessional
      ? ((queueCounts as Record<ProQueue, number>).PRECISO_RESPONDER > 0 ? "PRECISO_RESPONDER" : (queueCounts as Record<ProQueue, number>).AGUARDANDO_ALUNO > 0 ? "AGUARDANDO_ALUNO" : (queueCounts as Record<ProQueue, number>).SOLICITACOES_RECEBIDAS > 0 ? "SOLICITACOES_RECEBIDAS" : "ALL")
      : ((queueCounts as Record<StudentQueue, number>).EM_ATENDIMENTO > 0 ? "EM_ATENDIMENTO" : (queueCounts as Record<StudentQueue, number>).SOLICITACOES > 0 ? "SOLICITACOES" : "CONCLUIDAS");

    const match = consultations.find((c) => {
      if (c.isRemovedFromMyList) return false;
      if (c.modality === "VIDEO") return false; // Never auto-select historical video
      if (isProfessional) {
        return initialQueue === "ALL" || getProQueueKey(c) === initialQueue;
      }
      return initialQueue === "ALL" || getStudentQueueKey(c) === initialQueue;
    });

    return match ? match.publicId : null;
  });

  // Mobile queue selection modal
  const [isMobileQueueModalOpen, setIsMobileQueueModalOpen] = useState(false);

  // Mobile navigation screen: "LIST" vs "CHAT"
  const [mobileScreen, setMobileScreen] = useState<"LIST" | "CHAT">(
    initialActivePublicId ? "CHAT" : "LIST"
  );

  // Right pane: AI Anamnesis & Private Notes (Starts CLOSED on all devices)
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  // Quoted reply state
  const [replyingTo, setReplyingTo] = useState<{
    id: number;
    senderName: string;
    content: string;
  } | null>(null);

  // SSR mount guard for createPortal
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Modals state
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [proposalStage, setProposalStage] = useState<"SELECT_PARTICIPANT" | "FILL_DETAILS">("SELECT_PARTICIPANT");
  const [selectedStudentForProposal, setSelectedStudentForProposal] = useState<StudentCandidate | null>(null);
  const [selectedProfessionalForProposal, setSelectedProfessionalForProposal] = useState<ProfessionalCandidate | null>(null);
  const [proposalDate, setProposalDate] = useState("");
  const [proposalTime, setProposalTime] = useState("");
  const [proposalTopic, setProposalTopic] = useState("");
  const [proposalExpectedHours, setProposalExpectedHours] = useState(24);
  const [proposalInitialMessage, setProposalInitialMessage] = useState("");
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");

  const handleOpenNewChatModal = useCallback(() => {
    setIsNewChatModalOpen(true);
    setProposalError(null);
    if (!isProfessional && activeProfessionals.length === 1) {
      setSelectedProfessionalForProposal(activeProfessionals[0]);
      setProposalStage("FILL_DETAILS");
    } else if (isProfessional && selectedStudentForProposal) {
      setProposalStage("FILL_DETAILS");
    } else {
      setProposalStage("SELECT_PARTICIPANT");
    }
  }, [isProfessional, activeProfessionals, selectedStudentForProposal]);

  // Counter proposal modal
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [counterDate, setCounterDate] = useState("");
  const [counterTime, setCounterTime] = useState("");
  const [counterError, setCounterError] = useState<string | null>(null);
  const [isSubmittingCounter, setIsSubmittingCounter] = useState(false);

  // Decline modal
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);

  // Closure modal ("Finalizar Consulta")
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [closureSummary, setClosureSummary] = useState("");
  const [closureOrientations, setClosureOrientations] = useState("");
  const [closurePrescriptions, setClosurePrescriptions] = useState("");
  const [closureReturnPredictionDays, setClosureReturnPredictionDays] = useState<number | null>(30);
  const [closurePrivateNotes, setClosurePrivateNotes] = useState("");
  const [closureError, setClosureError] = useState<string | null>(null);
  const [isSubmittingClosure, setIsSubmittingClosure] = useState(false);

  // Return modal ("Solicitar Retorno")
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [returnTopic, setReturnTopic] = useState("Consulta de Retorno");
  const [returnExpectedHours, setReturnExpectedHours] = useState(24);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Exclude consultation states
  const [consultationToExclude, setConsultationToExclude] = useState<ChatConsultationDto | null>(null);
  const [isExcluding, setIsExcluding] = useState(false);
  const [excludeError, setExcludeError] = useState<string | null>(null);
  const [undoToast, setUndoToast] = useState<{
    consultation: ChatConsultationDto;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);

  const handleOpenExcludeModal = useCallback((c: ChatConsultationDto) => {
    setConsultationToExclude(c);
    setExcludeError(null);
  }, []);

  const handleConfirmExclude = async () => {
    if (!consultationToExclude) return;
    const target = consultationToExclude;
    const targetType = target.modality === "VIDEO" ? "LEGACY_VIDEO" : "CHAT";

    setIsExcluding(true);
    setExcludeError(null);

    // Optimistic update
    setUpdatedConsultations((prev) => ({
      ...prev,
      [target.publicId]: { ...(prev[target.publicId] || {}), isRemovedFromMyList: true },
    }));

    if (selectedChatPublicId === target.publicId) {
      setSelectedChatPublicId(null);
      setMobileScreen("LIST");
    }

    try {
      const res = await hideConsultationAction(consultancySlug, targetType, target.publicId);
      if (!res.ok) {
        throw new Error(res.error || "Falha ao excluir conversa da lista.");
      }

      setConsultationToExclude(null);
      setIsExcluding(false);

      if (undoToast?.timeoutId) clearTimeout(undoToast.timeoutId);
      const timer = setTimeout(() => {
        setUndoToast(null);
      }, 7000);
      setUndoToast({ consultation: target, timeoutId: timer });
    } catch (err: unknown) {
      setUpdatedConsultations((prev) => ({
        ...prev,
        [target.publicId]: { ...(prev[target.publicId] || {}), isRemovedFromMyList: false },
      }));
      setIsExcluding(false);
      setExcludeError(err instanceof Error ? err.message : "Erro ao excluir conversa.");
    }
  };

  const handleRestoreConsultation = async (target: ChatConsultationDto) => {
    const targetType = target.modality === "VIDEO" ? "LEGACY_VIDEO" : "CHAT";

    setUpdatedConsultations((prev) => ({
      ...prev,
      [target.publicId]: { ...(prev[target.publicId] || {}), isRemovedFromMyList: false },
    }));

    if (undoToast?.consultation.publicId === target.publicId) {
      if (undoToast.timeoutId) clearTimeout(undoToast.timeoutId);
      setUndoToast(null);
    }

    try {
      const res = await restoreConsultationAction(consultancySlug, targetType, target.publicId);
      if (!res.ok) {
        throw new Error(res.error || "Falha ao restaurar conversa na lista.");
      }
    } catch (err: unknown) {
      setUpdatedConsultations((prev) => ({
        ...prev,
        [target.publicId]: { ...(prev[target.publicId] || {}), isRemovedFromMyList: true },
      }));
      alert(err instanceof Error ? err.message : "Erro ao restaurar conversa.");
    }
  };

  const handleUndoExclude = () => {
    if (!undoToast) return;
    const target = undoToast.consultation;
    if (undoToast.timeoutId) clearTimeout(undoToast.timeoutId);
    setUndoToast(null);
    handleRestoreConsultation(target);
  };

  // Welcome Intro Modal State (Temporarily suspended for incident recovery)
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [introSeenLocally, setIntroSeenLocally] = useState<boolean>(() => Boolean(hasSeenIntro) || true);
  const introHelpButtonRef = useRef<HTMLButtonElement | null>(null);

  // Auto-open Welcome Intro ONLY on genuine navigation intent
  useEffect(() => {
    if (introSeenLocally) return;

    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("c") || searchParams.has("chat")) {
      try {
        sessionStorage.removeItem("trevo_chat_nav_intent");
      } catch {}
      return;
    }

    try {
      const rawIntent = sessionStorage.getItem("trevo_chat_nav_intent");
      // MUST consume and discard immediately so reload (F5) or back won't re-trigger
      sessionStorage.removeItem("trevo_chat_nav_intent");

      if (rawIntent) {
        const parsed = JSON.parse(rawIntent);
        const isFresh = Date.now() - (parsed.ts || 0) < 15000;
        const matchesSlug = !parsed.slug || parsed.slug === consultancySlug;
        if (isFresh && matchesSlug) {
          setTimeout(() => {
            setIsIntroOpen(true);
          }, 0);
        }
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, [consultancySlug, introSeenLocally]);

  const handleOpenIntroManually = useCallback(() => {
    setIsIntroOpen(true);
  }, []);

  const effectiveAudienceRole = audienceRole || (isProfessional ? "PROFESSIONAL" : "STUDENT");

  const handleCompleteIntro = useCallback(async () => {
    setIntroSeenLocally(true);
    setIsIntroOpen(false);
    try {
      await saveIntroViewAction(consultancySlug, effectiveAudienceRole, "COMPLETED");
    } catch (err) {
      console.error("[TrevoChatWorkspace] Failed to persist intro completion:", err);
    }
  }, [effectiveAudienceRole, consultancySlug]);

  const handleDismissIntro = useCallback(async () => {
    setIntroSeenLocally(true);
    setIsIntroOpen(false);
    try {
      await saveIntroViewAction(consultancySlug, effectiveAudienceRole, "DISMISSED");
    } catch (err) {
      console.error("[TrevoChatWorkspace] Failed to persist intro dismissal:", err);
    }
  }, [effectiveAudienceRole, consultancySlug]);

  // Search filter
  const [searchFilter, setSearchFilter] = useState("");

  // Active chat messages
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(
    Boolean(initialActivePublicId || (consultations.length > 0 && consultations[0].modality !== "VIDEO"))
  );
  const [isSending, setIsSending] = useState(false);
  const [hasMoreOlderMessages, setHasMoreOlderMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [sendErrorNotice, setSendErrorNotice] = useState<string | null>(null);

  // Current active consultation object
  const activeChat = consultations.find((c) => c.publicId === selectedChatPublicId) || null;

  // Lock body scroll when any modal is open
  const anyModalOpen =
    isIntroOpen ||
    isNewChatModalOpen ||
    isCounterModalOpen ||
    isDeclineModalOpen ||
    isClosureModalOpen ||
    isReturnModalOpen ||
    isMobileQueueModalOpen ||
    Boolean(consultationToExclude);

  useEffect(() => {
    if (!mounted) return;
    if (anyModalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [anyModalOpen, mounted]);

  // Listen to open schedule event from shared tabs
  useEffect(() => {
    const handleOpenChatSchedule = () => {
      handleOpenNewChatModal();
    };
    window.addEventListener("trevo:open-chat-schedule", handleOpenChatSchedule);
    return () => {
      window.removeEventListener("trevo:open-chat-schedule", handleOpenChatSchedule);
    };
  }, [handleOpenNewChatModal]);

  // Load messages when selected consultation changes
  useEffect(() => {
    if (!selectedChatPublicId) return;

    const current = consultations.find((c) => c.publicId === selectedChatPublicId);
    if (current?.modality === "VIDEO") return;

    let isMounted = true;

    fetch(`/api/consultancies/${consultancySlug}/chat/messages?chat=${selectedChatPublicId}&limit=50`)
      .then((res) => (res.ok ? res.json() : { messages: [] }))
      .then((data) => {
        if (isMounted) {
          const msgs: ChatMessageDto[] = data.messages || [];
          setMessages(msgs);
          setHasMoreOlderMessages(msgs.length >= 50);
          setIsLoadingMessages(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingMessages(false);
      });

    // Mark messages as read and synchronize unread counters immediately in local state
    markChatReadAction(consultancySlug, selectedChatPublicId)
      .then((res) => {
        if (res.ok && isMounted) {
          setUpdatedConsultations((prev) => ({
            ...prev,
            [selectedChatPublicId]: {
              ...(prev[selectedChatPublicId] || {}),
              unreadCountProfessional: isProfessional ? 0 : (prev[selectedChatPublicId]?.unreadCountProfessional || 0),
              unreadCountStudent: !isProfessional ? 0 : (prev[selectedChatPublicId]?.unreadCountStudent || 0),
            },
          }));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [selectedChatPublicId, consultancySlug, consultations, isProfessional]);

  // Load older messages (pagination backwards)
  const handleLoadOlderMessages = async () => {
    if (!selectedChatPublicId || messages.length === 0 || isLoadingOlderMessages) return;
    setIsLoadingOlderMessages(true);
    const oldestId = messages[0].id;

    try {
      const res = await fetch(
        `/api/consultancies/${consultancySlug}/chat/messages?chat=${selectedChatPublicId}&limit=50&beforeId=${oldestId}`
      );
      if (res.ok) {
        const data = await res.json();
        const older: ChatMessageDto[] = data.messages || [];
        if (older.length > 0) {
          setMessages((prev) => [...older, ...prev]);
        }
        setHasMoreOlderMessages(older.length >= 50);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  const handleSelectQueue = (newQueue: string) => {
    setActiveQueueTab(newQueue);
    if (selectedChatPublicId) {
      const current = consultations.find((c) => c.publicId === selectedChatPublicId);
      if (current) {
        const belongs = isProfessional
          ? newQueue === "ALL" || getProQueueKey(current) === newQueue
          : newQueue === "ALL" || getStudentQueueKey(current) === newQueue;
        if (!belongs) {
          setSelectedChatPublicId(null);
        }
      }
    }
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatPublicId(chatId);
    setReplyingTo(null);
    const target = consultations.find((c) => c.publicId === chatId);
    if (target?.modality === "VIDEO") {
      setMessages([]);
      setIsLoadingMessages(false);
    } else {
      setMessages([]);
      setIsLoadingMessages(true);
    }
    setMobileScreen("CHAT");
  };

  const handleBackToList = () => {
    setMobileScreen("LIST");
  };

  // Send message handler with idempotency and reply integration
  const handleSendMessage = async (params: {
    content?: string;
    file?: File;
    messageType?: ChatMessageType;
    audioDurationSeconds?: number;
    replyToMessageId?: number;
    payloadJson?: Record<string, unknown>;
  }): Promise<boolean> => {
    if (!selectedChatPublicId) return false;
    setIsSending(true);
    setSendErrorNotice(null);

    try {
      const clientMessageId = `cm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const formData = new FormData();
      formData.append("clientMessageId", clientMessageId);

      if (params.content) formData.append("content", params.content);
      if (params.messageType) formData.append("messageType", params.messageType);
      if (params.audioDurationSeconds) {
        formData.append("audioDurationSeconds", String(params.audioDurationSeconds));
      }
      if (params.file) {
        formData.append("file", params.file);
      }

      const replyId = params.replyToMessageId || replyingTo?.id;
      if (replyId) {
        formData.append("replyToMessageId", String(replyId));
      }

      if (params.payloadJson) {
        formData.append("payloadJson", JSON.stringify(params.payloadJson));
      }

      const res = await sendChatMessageAction(consultancySlug, selectedChatPublicId, formData);
      if (res.ok && res.data) {
        setMessages((prev) => [...prev, res.data as ChatMessageDto]);
        setReplyingTo(null);
        setSendErrorNotice(null);
        setIsSending(false);
        return true;
      } else {
        setSendErrorNotice(res.error || "Erro ao enviar mensagem.");
        setIsSending(false);
        return false;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao enviar mensagem.";
      setSendErrorNotice(msg);
      setIsSending(false);
      return false;
    }
  };

  // Submit new proposal
  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setProposalError(null);

    if (isProfessional && !selectedStudentForProposal) {
      setProposalError("Selecione um aluno para agendar o atendimento.");
      setProposalStage("SELECT_PARTICIPANT");
      return;
    }
    if (!isProfessional && activeProfessionals.length > 1 && !selectedProfessionalForProposal) {
      setProposalError("Selecione o profissional para o atendimento.");
      setProposalStage("SELECT_PARTICIPANT");
      return;
    }
    if (!proposalDate || !proposalTime) {
      setProposalError("Informe a data e o horário de referência.");
      return;
    }

    setIsSubmittingProposal(true);
    try {
      const res = await proposeChatConsultationAction(consultancySlug, {
        studentMembershipId: isProfessional
          ? selectedStudentForProposal?.membershipId
          : undefined,
        professionalMembershipId: !isProfessional
          ? (selectedProfessionalForProposal?.membershipId || activeProfessionals[0]?.membershipId)
          : undefined,
        professionalType: isProfessional
          ? professionalType
          : (selectedProfessionalForProposal?.role || activeProfessionals[0]?.role || "PERSONAL"),
        referenceDate: proposalDate,
        referenceTime: proposalTime,
        title: proposalTopic.trim() || undefined,
        expectedResponseHours: proposalExpectedHours,
        initialMessage: proposalInitialMessage.trim() || undefined,
      });

      if (res.ok && res.data) {
        const chat = res.data as ChatConsultationDto;
        setCreatedConsultations((prev) => [chat, ...prev.filter((c) => c.publicId !== chat.publicId)]);
        setSelectedChatPublicId(chat.publicId);
        setIsNewChatModalOpen(false);
        setSelectedStudentForProposal(null);
        setSelectedProfessionalForProposal(null);
        setProposalDate("");
        setProposalTime("");
        setProposalTopic("");
        setProposalInitialMessage("");
        setProposalStage("SELECT_PARTICIPANT");
        setMobileScreen("CHAT");
      } else {
        setProposalError(res.error || "Erro ao propor agendamento.");
      }
    } catch {
      setProposalError("Erro na conexão ao enviar proposta.");
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  // Accept proposal
  const handleAcceptProposal = async (publicId: string) => {
    try {
      const res = await respondToChatProposalAction(consultancySlug, publicId, "ACCEPT");
      if (res.ok) {
        setUpdatedConsultations((prev) => ({
          ...prev,
          [publicId]: {
            ...(prev[publicId] || {}),
            status: "CONFIRMED",
            studentAcceptedAt: new Date().toISOString(),
            professionalAcceptedAt: new Date().toISOString(),
          },
        }));
      } else {
        alert(res.error || "Erro ao aceitar o agendamento.");
      }
    } catch {
      alert("Erro na conexão ao aceitar o agendamento.");
    }
  };

  // Counter proposal submit
  const handleSubmitCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat) return;
    if (!counterDate || !counterTime) {
      setCounterError("Informe a nova data e horário sugeridos.");
      return;
    }

    setIsSubmittingCounter(true);
    try {
      const res = await respondToChatProposalAction(consultancySlug, activeChat.publicId, "COUNTER", {
        date: counterDate,
        time: counterTime,
      });
      if (res.ok) {
        setIsCounterModalOpen(false);
        setCounterDate("");
        setCounterTime("");
        setUpdatedConsultations((prev) => ({
          ...prev,
          [activeChat.publicId]: {
            ...(prev[activeChat.publicId] || {}),
            status: "PROPOSED",
            proposedByUserId: currentUserId,
            proposedStartFormatted: `${counterDate} às ${counterTime}`,
          },
        }));
      } else {
        setCounterError(res.error || "Erro ao sugerir novo horário.");
      }
    } catch {
      setCounterError("Erro na conexão ao enviar contraproposta.");
    } finally {
      setIsSubmittingCounter(false);
    }
  };

  // Decline proposal submit
  const handleSubmitDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat) return;

    setIsSubmittingDecline(true);
    try {
      const res = await respondToChatProposalAction(
        consultancySlug,
        activeChat.publicId,
        "DECLINE",
        undefined,
        declineReason.trim() || undefined
      );
      if (res.ok) {
        setIsDeclineModalOpen(false);
        setDeclineReason("");
        setUpdatedConsultations((prev) => ({
          ...prev,
          [activeChat.publicId]: {
            ...(prev[activeChat.publicId] || {}),
            status: "DECLINED",
            declinedReason: declineReason.trim() || null,
            declinedAt: new Date().toISOString(),
          },
        }));
      } else {
        alert(res.error || "Erro ao recusar proposta.");
      }
    } catch {
      alert("Erro na conexão ao recusar proposta.");
    } finally {
      setIsSubmittingDecline(false);
    }
  };

  // Cancel consultation
  const handleCancelProposal = async (publicId: string) => {
    if (!confirm("Tem certeza que deseja cancelar esta consulta?")) return;
    try {
      const res = await cancelChatConsultationAction(consultancySlug, publicId);
      if (res.ok) {
        setUpdatedConsultations((prev) => ({
          ...prev,
          [publicId]: {
            ...(prev[publicId] || {}),
            status: "CANCELED",
            canceledAt: new Date().toISOString(),
          },
        }));
      } else {
        alert(res.error || "Erro ao cancelar o agendamento.");
      }
    } catch {
      alert("Erro na conexão ao cancelar o agendamento.");
    }
  };

  // Submit formal closure ("Finalizar Consulta")
  const handleSubmitClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat) return;
    setClosureError(null);

    if (!closureSummary.trim()) {
      setClosureError("Informe o resumo de encerramento da consulta.");
      return;
    }

    setIsSubmittingClosure(true);
    try {
      const orientationsList = closureOrientations
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const prescriptionsList = closurePrescriptions
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await closeChatConsultationAction(consultancySlug, activeChat.publicId, {
        summary: closureSummary.trim(),
        orientations: orientationsList.length > 0 ? orientationsList : undefined,
        prescriptions: prescriptionsList.length > 0 ? prescriptionsList : undefined,
        returnPredictionDays: closureReturnPredictionDays,
        privateNotes: closurePrivateNotes.trim() || undefined,
      });

      if (res.ok) {
        setUpdatedConsultations((prev) => ({
          ...prev,
          [activeChat.publicId]: {
            ...(prev[activeChat.publicId] || {}),
            status: "COMPLETED",
            closedAt: new Date().toISOString(),
            closedByUserId: currentUserId,
            privateNotes: closurePrivateNotes.trim() || null,
          },
        }));

        // Refresh messages to show the closure card
        const updatedMsgs = await fetch(
          `/api/consultancies/${consultancySlug}/chat/messages?chat=${activeChat.publicId}`
        ).then((r) => (r.ok ? r.json() : { messages: [] }));
        setMessages(updatedMsgs.messages || []);

        setIsClosureModalOpen(false);
        setClosureSummary("");
        setClosureOrientations("");
        setClosurePrescriptions("");
        setClosurePrivateNotes("");
      } else {
        setClosureError(res.error || "Erro ao finalizar consulta.");
      }
    } catch {
      setClosureError("Erro na conexão ao finalizar consulta.");
    } finally {
      setIsSubmittingClosure(false);
    }
  };

  // Submit return consultation request
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat) return;
    setReturnError(null);

    if (!returnDate || !returnTime) {
      setReturnError("Informe a data e horário de referência do retorno.");
      return;
    }

    setIsSubmittingReturn(true);
    try {
      const res = await requestReturnConsultationAction(consultancySlug, activeChat.publicId, {
        referenceDate: returnDate,
        referenceTime: returnTime,
        title: returnTopic.trim() || undefined,
        expectedResponseHours: returnExpectedHours,
      });

      if (res.ok && res.data) {
        const newChat = res.data as ChatConsultationDto;
        setCreatedConsultations((prev) => [newChat, ...prev.filter((c) => c.publicId !== newChat.publicId)]);
        setSelectedChatPublicId(newChat.publicId);
        setIsReturnModalOpen(false);
        setReturnDate("");
        setReturnTime("");
        setReturnTopic("Consulta de Retorno");
        setMobileScreen("CHAT");
      } else {
        setReturnError(res.error || "Erro ao agendar consulta de retorno.");
      }
    } catch {
      setReturnError("Erro na conexão ao solicitar retorno.");
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Filter consultations by selected queue and search
  const filteredConsultations = useMemo(() => {
    return consultations.filter((c) => {
      // Excluded from my list rule:
      if (activeQueueTab === "REMOVIDAS") {
        if (!c.isRemovedFromMyList) return false;
      } else {
        if (c.isRemovedFromMyList) return false;
      }

      // Queue Filter
      if (activeQueueTab !== "REMOVIDAS") {
        if (isProfessional) {
          if (activeQueueTab !== "ALL" && getProQueueKey(c) !== activeQueueTab) {
            return false;
          }
        } else {
          if (activeQueueTab !== "ALL" && getStudentQueueKey(c) !== activeQueueTab) {
            return false;
          }
        }
      }

      // Search Filter
      if (searchFilter.trim()) {
        const targetName = isProfessional ? c.studentName : c.professionalName;
        const targetTopic = c.topic || c.title || "";
        const query = searchFilter.toLowerCase().trim();
        if (!targetName.toLowerCase().includes(query) && !targetTopic.toLowerCase().includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [consultations, activeQueueTab, searchFilter, isProfessional]);

  const activeQueueLabel = useMemo(() => {
    if (activeQueueTab === "REMOVIDAS") return "Conversas removidas";
    if (isProfessional) {
      switch (activeQueueTab) {
        case "PRECISO_RESPONDER": return "Preciso responder";
        case "AGUARDANDO_ALUNO": return "Aguardando aluno";
        case "SOLICITACOES_RECEBIDAS": return "Solicitações";
        case "CONCLUIDOS": return "Concluídos";
        default: return "Todos";
      }
    } else {
      switch (activeQueueTab) {
        case "EM_ATENDIMENTO": return "Em atendimento";
        case "SOLICITACOES": return "Solicitações";
        case "CONCLUIDAS": return "Concluídas";
        default: return "Todos";
      }
    }
  }, [isProfessional, activeQueueTab]);

  const activeQueueCount = useMemo(() => {
    if (activeQueueTab === "ALL") return queueCounts.ALL;
    if (activeQueueTab === "REMOVIDAS") return queueCounts.REMOVIDAS;
    if (isProfessional) {
      return (queueCounts as Record<ProQueue, number>)[activeQueueTab as ProQueue] || 0;
    }
    return (queueCounts as Record<StudentQueue, number>)[activeQueueTab as StudentQueue] || 0;
  }, [activeQueueTab, isProfessional, queueCounts]);

  const queueOptions = useMemo(() => {
    const list = isProfessional
      ? [
          { key: "PRECISO_RESPONDER", label: "Preciso responder", count: (queueCounts as Record<ProQueue, number>).PRECISO_RESPONDER || 0 },
          { key: "AGUARDANDO_ALUNO", label: "Aguardando aluno", count: (queueCounts as Record<ProQueue, number>).AGUARDANDO_ALUNO || 0 },
          { key: "SOLICITACOES_RECEBIDAS", label: "Solicitações", count: (queueCounts as Record<ProQueue, number>).SOLICITACOES_RECEBIDAS || 0 },
          { key: "CONCLUIDOS", label: "Concluídos", count: (queueCounts as Record<ProQueue, number>).CONCLUIDOS || 0 },
          { key: "ALL", label: "Todos os atendimentos", count: queueCounts.ALL },
        ]
      : [
          { key: "EM_ATENDIMENTO", label: "Em atendimento", count: (queueCounts as Record<StudentQueue, number>).EM_ATENDIMENTO || 0 },
          { key: "SOLICITACOES", label: "Solicitações", count: (queueCounts as Record<StudentQueue, number>).SOLICITACOES || 0 },
          { key: "CONCLUIDAS", label: "Concluídas", count: (queueCounts as Record<StudentQueue, number>).CONCLUIDAS || 0 },
          { key: "ALL", label: "Todos os atendimentos", count: queueCounts.ALL },
        ];

    if (queueCounts.REMOVIDAS > 0 || activeQueueTab === "REMOVIDAS") {
      list.push({
        key: "REMOVIDAS",
        label: "Conversas removidas",
        count: queueCounts.REMOVIDAS || 0,
      });
    }

    return list;
  }, [isProfessional, queueCounts, activeQueueTab]);

  const STATUS_CONFIG: Record<
    ChatConsultationStatus,
    { label: string; badgeClass: string }
  > = {
    PROPOSED: {
      label: "Proposta",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    CONFIRMED: {
      label: "Em andamento",
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    AWAITING_STUDENT: {
      label: "Aguardando aluno",
      badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    AWAITING_PROFESSIONAL: {
      label: "Aguardando profissional",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    COMPLETED: {
      label: "Concluído",
      badgeClass: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
    },
    DECLINED: {
      label: "Recusado",
      badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    },
    CANCELED: {
      label: "Cancelado",
      badgeClass: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    },
  };

  const isProposer = activeChat?.proposedByUserId === currentUserId;
  const isMessagingUnlocked = activeChat ? isChatMessagingUnlocked(activeChat.status) : false;
  const isCompleted = activeChat?.status === "COMPLETED" || Boolean(activeChat?.closedAt);

  return (
    <div className="w-full flex flex-col gap-3 sm:gap-4">
      {/* Compact Authoritative Header (Hidden on mobile when inside a conversation) */}
      <header
        className={`${
          mobileScreen === "CHAT" ? "hidden md:flex" : "flex"
        } flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-[var(--border-subtle)]`}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={`/consultoria/${consultancySlug}`}
            className="min-h-[44px] min-w-[44px] px-2.5 py-1.5 -ml-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            aria-label="Voltar ao painel da consultoria"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Voltar</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Consultas
          </h1>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Help button for Intro */}
          <button
            ref={introHelpButtonRef}
            type="button"
            onClick={handleOpenIntroManually}
            aria-label="Ver introdução novamente"
            title="Ver introdução novamente"
            className="min-h-[44px] min-w-[44px] px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#2A2D37] bg-white/80 dark:bg-[#1A1C22] hover:bg-zinc-100 dark:hover:bg-[#252830] text-zinc-600 dark:text-zinc-300 transition-colors inline-flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 shrink-0"
          >
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
            <span className="hidden sm:inline">Ver introdução</span>
          </button>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleOpenNewChatModal}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{isProfessional ? "Novo atendimento" : "Solicitar consulta"}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Card */}
      <div
        className={`w-full bg-white dark:bg-[#121316] border border-[#E5E7EB] dark:border-[#22242A] rounded-2xl overflow-hidden shadow-xs ${
          mobileScreen === "CHAT"
            ? "fixed inset-0 z-40 md:relative md:inset-auto md:z-auto md:flex md:h-[calc(100vh-170px)] md:min-h-[580px] rounded-none md:rounded-2xl border-none md:border"
            : selectedChatPublicId
            ? "flex flex-col md:flex-row md:h-[calc(100vh-170px)] md:min-h-[580px]"
            : "flex flex-col md:flex-row h-auto min-h-0 md:min-h-[420px]"
        }`}
      >
        {/* -------------------------------------------------------------------- */}
        {/* LEFT PANE: Queues & Consultation List                                */}
        {/* -------------------------------------------------------------------- */}
        <div
          className={`w-full md:w-80 lg:w-[350px] flex flex-col bg-[#F9FAFB] dark:bg-[#16171B] md:border-r md:border-[#E5E7EB] md:dark:border-[#22242A] shrink-0 ${
            mobileScreen === "CHAT" ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-3.5 border-b border-[#E5E7EB] dark:border-[#22242A] space-y-3">
            {/* Search Box */}
            <div className="relative w-full">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar por nome ou assunto..."
                className="w-full min-h-[44px] pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-[#1A1C22] border border-[#E5E7EB] dark:border-[#2E313A] text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <svg
                className="w-4 h-4 absolute left-3 top-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchFilter.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchFilter("")}
                  className="absolute right-2.5 top-3 p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                  aria-label="Limpar busca"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Mobile Queue Selector Button */}
            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setIsMobileQueueModalOpen(true)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-active)] border border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--text-primary)] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider">Fila:</span>
                  <span className="font-bold text-[var(--text-primary)] truncate">{activeQueueLabel}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    {activeQueueCount}
                  </span>
                </div>
                <svg className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Desktop Queue Tabs (Sleek, segmented appearance that doesn't compete with primary actions) */}
            <div className="hidden md:block">
              {isProfessional ? (
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSelectQueue("PRECISO_RESPONDER")}
                    className={`min-h-[36px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-1.5 text-xs font-semibold ${
                      activeQueueTab === "PRECISO_RESPONDER"
                        ? "bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-bold shadow-2xs"
                        : "bg-white/80 dark:bg-[#1F2128] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#282B34] hover:text-zinc-900 dark:hover:text-white border border-[#E5E7EB] dark:border-[#2A2D37]"
                    }`}
                  >
                    <span className="truncate">Preciso responder</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                        activeQueueTab === "PRECISO_RESPONDER"
                          ? "bg-amber-500/25 text-amber-900 dark:text-amber-200"
                          : "bg-zinc-100 dark:bg-[#2A2D37] text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {(queueCounts as Record<ProQueue, number>).PRECISO_RESPONDER || 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectQueue("AGUARDANDO_ALUNO")}
                    className={`min-h-[36px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-1.5 text-xs font-semibold ${
                      activeQueueTab === "AGUARDANDO_ALUNO"
                        ? "bg-blue-500/15 border border-blue-500/30 text-blue-800 dark:text-blue-300 font-bold shadow-2xs"
                        : "bg-white/80 dark:bg-[#1F2128] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#282B34] hover:text-zinc-900 dark:hover:text-white border border-[#E5E7EB] dark:border-[#2A2D37]"
                    }`}
                  >
                    <span className="truncate">Aguardando aluno</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                        activeQueueTab === "AGUARDANDO_ALUNO"
                          ? "bg-blue-500/25 text-blue-900 dark:text-blue-200"
                          : "bg-zinc-100 dark:bg-[#2A2D37] text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {(queueCounts as Record<ProQueue, number>).AGUARDANDO_ALUNO || 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectQueue("SOLICITACOES_RECEBIDAS")}
                    className={`min-h-[36px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-1.5 text-xs font-semibold ${
                      activeQueueTab === "SOLICITACOES_RECEBIDAS"
                        ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold shadow-2xs"
                        : "bg-white/80 dark:bg-[#1F2128] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#282B34] hover:text-zinc-900 dark:hover:text-white border border-[#E5E7EB] dark:border-[#2A2D37]"
                    }`}
                  >
                    <span className="truncate">Solicitações</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                        activeQueueTab === "SOLICITACOES_RECEBIDAS"
                          ? "bg-emerald-500/25 text-emerald-900 dark:text-emerald-200"
                          : "bg-zinc-100 dark:bg-[#2A2D37] text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {(queueCounts as Record<ProQueue, number>).SOLICITACOES_RECEBIDAS || 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectQueue("CONCLUIDOS")}
                    className={`min-h-[36px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-1.5 text-xs font-semibold ${
                      activeQueueTab === "CONCLUIDOS"
                        ? "bg-zinc-500/15 border border-zinc-500/30 text-zinc-800 dark:text-zinc-200 font-bold shadow-2xs"
                        : "bg-white/80 dark:bg-[#1F2128] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#282B34] hover:text-zinc-900 dark:hover:text-white border border-[#E5E7EB] dark:border-[#2A2D37]"
                    }`}
                  >
                    <span className="truncate">Concluídos</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                        activeQueueTab === "CONCLUIDOS"
                          ? "bg-zinc-500/25 text-zinc-900 dark:text-zinc-200"
                          : "bg-zinc-100 dark:bg-[#2A2D37] text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {(queueCounts as Record<ProQueue, number>).CONCLUIDOS || 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectQueue("ALL")}
                    className={`col-span-2 min-h-[36px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-1.5 text-xs font-semibold ${
                      activeQueueTab === "ALL"
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs"
                        : "bg-white/80 dark:bg-[#1F2128] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#282B34] hover:text-zinc-900 dark:hover:text-white border border-[#E5E7EB] dark:border-[#2A2D37]"
                    }`}
                  >
                    <span>Todos os atendimentos</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        activeQueueTab === "ALL"
                          ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
                          : "bg-zinc-100 dark:bg-[#2A2D37] text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {queueCounts.ALL}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSelectQueue("EM_ATENDIMENTO")}
                    className={`min-h-[36px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-1.5 text-xs font-semibold ${
                      activeQueueTab === "EM_ATENDIMENTO"
                        ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold shadow-2xs"
                        : "bg-white/80 dark:bg-[#1F2128] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#282B34] hover:text-zinc-900 dark:hover:text-white border border-[#E5E7EB] dark:border-[#2A2D37]"
                    }`}
                  >
                    <span className="truncate">Em atendimento</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                        activeQueueTab === "EM_ATENDIMENTO"
                          ? "bg-emerald-500/25 text-emerald-900 dark:text-emerald-200"
                          : "bg-zinc-100 dark:bg-[#2A2D37] text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {(queueCounts as Record<StudentQueue, number>).EM_ATENDIMENTO || 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectQueue("SOLICITACOES")}
                    className={`min-h-[36px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-1.5 text-xs font-semibold ${
                      activeQueueTab === "SOLICITACOES"
                        ? "bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-bold shadow-2xs"
                        : "bg-white/80 dark:bg-[#1F2128] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#282B34] hover:text-zinc-900 dark:hover:text-white border border-[#E5E7EB] dark:border-[#2A2D37]"
                    }`}
                  >
                    <span className="truncate">Solicitações</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                        activeQueueTab === "SOLICITACOES"
                          ? "bg-amber-500/25 text-amber-900 dark:text-amber-200"
                          : "bg-zinc-100 dark:bg-[#2A2D37] text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {(queueCounts as Record<StudentQueue, number>).SOLICITACOES || 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectQueue("CONCLUIDAS")}
                    className={`min-h-[36px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-1.5 text-xs font-semibold ${
                      activeQueueTab === "CONCLUIDAS"
                        ? "bg-zinc-500/15 border border-zinc-500/30 text-zinc-800 dark:text-zinc-200 font-bold shadow-2xs"
                        : "bg-white/80 dark:bg-[#1F2128] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#282B34] hover:text-zinc-900 dark:hover:text-white border border-[#E5E7EB] dark:border-[#2A2D37]"
                    }`}
                  >
                    <span className="truncate">Concluídas</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                        activeQueueTab === "CONCLUIDAS"
                          ? "bg-zinc-500/25 text-zinc-900 dark:text-zinc-200"
                          : "bg-zinc-100 dark:bg-[#2A2D37] text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {(queueCounts as Record<StudentQueue, number>).CONCLUIDAS || 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectQueue("ALL")}
                    className={`min-h-[36px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-1.5 text-xs font-semibold ${
                      activeQueueTab === "ALL"
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs"
                        : "bg-white/80 dark:bg-[#1F2128] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#282B34] hover:text-zinc-900 dark:hover:text-white border border-[#E5E7EB] dark:border-[#2A2D37]"
                    }`}
                  >
                    <span>Todos</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        activeQueueTab === "ALL"
                          ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
                          : "bg-zinc-100 dark:bg-[#2A2D37] text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {queueCounts.ALL}
                    </span>
                  </button>
                </div>
              )}

              {/* Secondary filter: Conversas removidas */}
              {(queueCounts.REMOVIDAS > 0 || activeQueueTab === "REMOVIDAS") && (
                <div className="pt-2 mt-2 border-t border-[#E5E7EB] dark:border-[#22242A]">
                  <button
                    type="button"
                    onClick={() => handleSelectQueue("REMOVIDAS")}
                    className={`w-full min-h-[36px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-1.5 text-xs font-semibold ${
                      activeQueueTab === "REMOVIDAS"
                        ? "bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-300 font-bold shadow-2xs"
                        : "bg-white/60 dark:bg-[#1A1C22] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#1F2128] hover:text-zinc-900 dark:hover:text-zinc-200 border border-dashed border-[#D1D5DB] dark:border-[#2E313A]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <svg className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                      <span className="truncate">Conversas removidas</span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        activeQueueTab === "REMOVIDAS"
                          ? "bg-rose-500/25 text-rose-900 dark:text-rose-200"
                          : "bg-zinc-100 dark:bg-[#2A2D37] text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {queueCounts.REMOVIDAS}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB] dark:divide-[#22242A]">
            {filteredConsultations.length === 0 ? (
              <div className="py-8 px-4 text-center space-y-2.5">
                <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-[#1A1C22] text-zinc-400 dark:text-zinc-500 flex items-center justify-center mx-auto">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {searchFilter.trim()
                    ? `Nenhum atendimento encontrado para "${searchFilter}".`
                    : activeQueueTab === "REMOVIDAS"
                    ? "Nenhuma conversa removida. As conversas que você excluir da sua lista ficarão disponíveis aqui para restauração."
                    : isProfessional
                    ? activeQueueTab === "PRECISO_RESPONDER"
                      ? "Nenhum atendimento aguardando sua resposta no momento."
                      : activeQueueTab === "AGUARDANDO_ALUNO"
                      ? "Nenhum atendimento aguardando resposta do aluno."
                      : activeQueueTab === "SOLICITACOES_RECEBIDAS"
                      ? "Nenhuma solicitação aguardando confirmação."
                      : activeQueueTab === "CONCLUIDOS"
                      ? "Nenhum atendimento concluído nesta fila."
                      : "Nenhum atendimento cadastrado."
                    : activeQueueTab === "EM_ATENDIMENTO"
                    ? "Você não tem atendimentos em andamento nesta fila."
                    : activeQueueTab === "SOLICITACOES"
                    ? "Nenhuma solicitação aguardando confirmação."
                    : activeQueueTab === "CONCLUIDAS"
                    ? "Nenhum atendimento concluído nesta fila."
                    : "Nenhum atendimento cadastrado."}
                </p>
                {searchFilter.trim() ? (
                  <button
                    type="button"
                    onClick={() => setSearchFilter("")}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                  >
                    Limpar busca
                  </button>
                ) : activeQueueTab !== "ALL" && consultations.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleSelectQueue("ALL")}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                  >
                    Ver todas as consultas ({consultations.length})
                  </button>
                ) : null}
              </div>
            ) : (
              filteredConsultations.map((c) => {
                const isSelected = c.publicId === selectedChatPublicId;
                const displayName = isProfessional ? c.studentName : c.professionalName;
                const counterpartUserPublicId = isProfessional ? c.studentUserPublicId : c.professionalUserPublicId;
                const unreadCount = isProfessional ? c.unreadCountProfessional : c.unreadCountStudent;
                const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.CONFIRMED;
                const isVideo = c.modality === "VIDEO";
                const isItemFinished =
                  c.status === "COMPLETED" ||
                  c.status === "DECLINED" ||
                  c.status === "CANCELED" ||
                  Boolean(c.closedAt);

                return (
                  <div
                    key={c.publicId}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectChat(c.publicId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectChat(c.publicId);
                      }
                    }}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer min-h-[64px] ${
                      isSelected
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-l-emerald-600 dark:border-l-emerald-500 shadow-2xs"
                        : "hover:bg-zinc-100/70 dark:hover:bg-[#1C1E24]"
                    }`}
                  >
                    {/* Participant Avatar */}
                    <div className="relative shrink-0">
                      <UserAvatar
                        fullName={displayName}
                        userPublicId={counterpartUserPublicId}
                        size="md"
                        circular={true}
                      />
                      {isVideo && (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] shadow-xs" title="Formato anterior">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {displayName}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {c.lastMessageAt && (
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                              {new Date(c.lastMessageAt).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </span>
                          )}
                          <ConversationOptionsMenu
                            consultation={c}
                            onOpenExcludeModal={handleOpenExcludeModal}
                            onRestore={handleRestoreConsultation}
                            onOpenIntro={handleOpenIntroManually}
                            placement="list"
                          />
                        </div>
                      </div>

                      {c.topic && (
                        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate mb-0.5">
                          {c.topic}
                        </p>
                      )}

                      <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate mb-1.5 opacity-90">
                        {isVideo
                          ? `Consulta no formato anterior (${c.proposedStartFormatted || "Histórico"})`
                          : c.lastMessagePreview ||
                            (c.status === "PROPOSED"
                              ? "Proposta de agendamento pendente"
                              : isItemFinished
                              ? "Atendimento encerrado sem mensagens"
                              : "Nenhuma mensagem ainda")}
                      </p>

                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isVideo ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span>Formato Anterior</span>
                            </span>
                          ) : (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusCfg.badgeClass}`}
                            >
                              {statusCfg.label}
                            </span>
                          )}

                          {c.expectedResponseHours && !isVideo && !isItemFinished && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-white dark:bg-[#1A1C22] text-zinc-500 dark:text-zinc-400 border border-[#E5E7EB] dark:border-[#2E313A]">
                              <svg className="w-2.5 h-2.5 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <circle cx="12" cy="12" r="9" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                              </svg>
                              <span>até {c.expectedResponseHours}h</span>
                            </span>
                          )}
                        </div>

                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shrink-0">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* -------------------------------------------------------------------- */}
        {/* RIGHT PANE: Active Chat Conversation, Historical Video or Guidance   */}
        {/* -------------------------------------------------------------------- */}
        <div
          className={`flex-1 flex flex-col bg-white dark:bg-[#0E0F12] min-w-0 overflow-hidden ${
            mobileScreen === "LIST" ? "hidden md:flex" : "flex"
          }`}
        >
          {activeChat ? (
            activeChat.modality === "VIDEO" ? (
              /* -------------------------------------------------------------- */
              /* HISTORICAL VIDEO CONSULTATION VIEWER                           */
              /* -------------------------------------------------------------- */
              <div className="flex-1 flex flex-col overflow-y-auto">
                <div className="p-3 sm:p-4 border-b border-[#E5E7EB] dark:border-[#22242A] flex items-center justify-between gap-3 bg-white dark:bg-[#121316]">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={handleBackToList}
                      aria-label="Voltar para lista de atendimentos"
                      className="md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-[#1A1C22] text-zinc-600 dark:text-zinc-300 active:scale-95 cursor-pointer -ml-1"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    <UserAvatar
                      fullName={isProfessional ? activeChat.studentName : activeChat.professionalName}
                      userPublicId={isProfessional ? activeChat.studentUserPublicId : activeChat.professionalUserPublicId}
                      size="md"
                      circular={true}
                    />

                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {isProfessional ? activeChat.studentName : activeChat.professionalName}
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        Consulta no formato anterior • Histórico preservado
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Histórico arquivado</span>
                    </span>

                    <button
                      type="button"
                      onClick={handleOpenIntroManually}
                      title="Ver introdução novamente"
                      aria-label="Ver introdução novamente"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-[#1A1C22] text-zinc-500 dark:text-zinc-400 active:scale-95 transition-colors cursor-pointer"
                    >
                      <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                      </svg>
                    </button>

                    <ConversationOptionsMenu
                      consultation={activeChat}
                      onOpenExcludeModal={handleOpenExcludeModal}
                      onRestore={handleRestoreConsultation}
                      onOpenIntro={handleOpenIntroManually}
                      placement="header"
                    />
                  </div>
                </div>

                {/* Removed from my list banner */}
                {activeChat.isRemovedFromMyList && (
                  <div className="p-3 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between gap-3 text-xs text-rose-900 dark:text-rose-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="truncate">Esta consulta está removida da sua lista pessoal.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreConsultation(activeChat)}
                      className="shrink-0 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Restaurar na minha lista
                    </button>
                  </div>
                )}

                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl shadow-xs">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                      Consulta no formato anterior
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      Esta consulta foi agendada no formato anterior e seus registros históricos foram preservados.
                    </p>
                  </div>

                  <div className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-[#16171B] border border-[#E5E7EB] dark:border-[#22242A] text-left space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#E5E7EB] dark:border-[#22242A]">
                      <span className="text-zinc-500 dark:text-zinc-400">Participante:</span>
                      <strong className="text-zinc-900 dark:text-zinc-100">
                        {isProfessional ? activeChat.studentName : activeChat.professionalName}
                      </strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E5E7EB] dark:border-[#22242A]">
                      <span className="text-zinc-500 dark:text-zinc-400">Data agendada:</span>
                      <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
                        {activeChat.proposedStartFormatted || "Data arquivada"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-zinc-500 dark:text-zinc-400">Situação registrada:</span>
                      <span className="text-zinc-700 dark:text-zinc-300 font-semibold">
                        {activeChat.status === "CANCELED" ? "Cancelada" : "Histórico arquivado"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
            /* -------------------------------------------------------------- */
            /* ACTIVE TREVO CHAT CONVERSATION                                 */
            /* -------------------------------------------------------------- */
            <>
              {/* Header */}
              <div className="p-3 sm:p-4 border-b border-[#E5E7EB] dark:border-[#22242A] flex items-center justify-between gap-3 bg-white dark:bg-[#121316]">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={handleBackToList}
                    aria-label="Voltar para lista de atendimentos"
                    className="md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-[#1A1C22] text-zinc-600 dark:text-zinc-300 active:scale-95 cursor-pointer -ml-1"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <UserAvatar
                    fullName={isProfessional ? activeChat.studentName : activeChat.professionalName}
                    userPublicId={isProfessional ? activeChat.studentUserPublicId : activeChat.professionalUserPublicId}
                    size="md"
                    circular={true}
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {isProfessional ? activeChat.studentName : activeChat.professionalName}
                      </h3>
                      {!isCompleted &&
                        activeChat.status !== "CANCELED" &&
                        activeChat.status !== "DECLINED" &&
                        activeChat.expectedResponseHours && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                            <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <circle cx="12" cy="12" r="9" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                            </svg>
                            <span>Responde em até {activeChat.expectedResponseHours}h</span>
                          </span>
                        )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {isProfessional
                        ? activeChat.studentEmail || "Aluno vinculado"
                        : activeChat.counterpartRole || (activeChat.professionalType === "PERSONAL" ? "Personal Trainer" : "Nutricionista")}
                    </p>
                  </div>
                </div>

                {/* Actions & Status in Header */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Finalize Button for Professional */}
                  {isProfessional && !isCompleted && isMessagingUnlocked && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsClosureModalOpen(true);
                        setClosureError(null);
                      }}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="hidden sm:inline">Finalizar Atendimento</span>
                      <span className="sm:hidden">Finalizar</span>
                    </button>
                  )}

                  {/* Return Consultation Button when Completed */}
                  {isCompleted && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsReturnModalOpen(true);
                        setReturnError(null);
                      }}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="hidden sm:inline">Solicitar Retorno</span>
                      <span className="sm:hidden">Retorno</span>
                    </button>
                  )}

                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      (STATUS_CONFIG[activeChat.status] || STATUS_CONFIG.CONFIRMED).badgeClass
                    }`}
                  >
                    {(STATUS_CONFIG[activeChat.status] || STATUS_CONFIG.CONFIRMED).label}
                  </span>

                  {/* AI Anamnesis / Prontuário Drawer Toggle */}
                  {isProfessional && (
                    <button
                      type="button"
                      onClick={() => setIsAiDrawerOpen((prev) => !prev)}
                      title="Abrir Prontuário e IA"
                      className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        isAiDrawerOpen
                          ? "bg-purple-600 text-white shadow-xs"
                          : "bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 border border-purple-500/20"
                      }`}
                    >
                      <svg className="w-4 h-4 text-purple-600 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="hidden sm:inline">Prontuário & IA</span>
                    </button>
                  )}

                  {/* Help Intro Button */}
                  <button
                    type="button"
                    onClick={handleOpenIntroManually}
                    title="Ver introdução novamente"
                    aria-label="Ver introdução novamente"
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-[#1A1C22] text-zinc-500 dark:text-zinc-400 active:scale-95 transition-colors cursor-pointer"
                  >
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                  </button>

                  {/* Options Menu */}
                  <ConversationOptionsMenu
                    consultation={activeChat}
                    onOpenExcludeModal={handleOpenExcludeModal}
                    onRestore={handleRestoreConsultation}
                    onOpenIntro={handleOpenIntroManually}
                    placement="header"
                  />
                </div>
              </div>

              {/* Removed from my list banner */}
              {activeChat.isRemovedFromMyList && (
                <div className="p-3 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between gap-3 text-xs text-rose-900 dark:text-rose-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="truncate">Esta conversa está removida da sua lista pessoal.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestoreConsultation(activeChat)}
                    className="shrink-0 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Restaurar na minha lista
                  </button>
                </div>
              )}

              {/* Bilateral Proposal Banners */}
              {activeChat.status === "PROPOSED" && (
                !isProposer ? (
                  <div className="p-4 m-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            Proposta de Agendamento Recebida
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                            Aguardando seu aceite
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300">
                          Horário de referência: <strong>{activeChat.proposedStartFormatted || "A combinar"}</strong>
                          {activeChat.topic && <span> • Foco: <em>{activeChat.topic}</em></span>}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          O horário é apenas uma referência para organização da agenda. A conversa é assíncrona e cada um responde quando puder.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-amber-500/20 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleAcceptProposal(activeChat.publicId)}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs active:scale-95"
                      >
                        Aceitar agendamento
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCounterModalOpen(true);
                          setCounterError(null);
                        }}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-[#1A1C22] hover:bg-zinc-200/70 dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-[#E5E7EB] dark:border-[#2E313A] cursor-pointer transition-colors"
                      >
                        Propor outro horário
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDeclineModalOpen(true)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 m-3 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <circle cx="12" cy="12" r="9" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                        </svg>
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            Proposta enviada
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300">
                            Aguardando confirmação do {isProfessional ? "aluno" : "profissional"}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300">
                          Horário de referência: <strong>{activeChat.proposedStartFormatted || "A combinar"}</strong>
                          {activeChat.topic && <span> • Foco: <em>{activeChat.topic}</em></span>}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Assim que o agendamento for confirmado bilateralmente, o chat será liberado.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCancelProposal(activeChat.publicId)}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 self-end sm:self-auto cursor-pointer"
                    >
                      Cancelar proposta
                    </button>
                  </div>
                )
              )}

              {activeChat.status === "DECLINED" && (
                <div className="p-3.5 m-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 space-y-1">
                  <div className="font-bold">Agendamento recusado</div>
                  {activeChat.declinedReason && <p>Motivo informado: {activeChat.declinedReason}</p>}
                </div>
              )}

              {activeChat.status === "CANCELED" && (
                <div className="p-3.5 m-3 rounded-2xl bg-zinc-500/10 border border-zinc-500/20 text-xs text-[var(--text-secondary)]">
                  Agendamento cancelado.
                </div>
              )}

              {/* Messages Body */}
              {isLoadingMessages ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <ChatMessageList
                  messages={messages}
                  currentUserId={currentUserId}
                  consultancySlug={consultancySlug}
                  onReplyMessage={(msg) =>
                    setReplyingTo({
                      id: msg.id,
                      senderName: msg.senderName,
                      content: msg.content || (msg.messageType === "AUDIO" ? "Áudio" : "Anexo"),
                    })
                  }
                  isProfessional={isProfessional}
                  professionalType={activeChat.professionalType || professionalType}
                  consultationStatus={activeChat.status}
                  closedAt={activeChat.closedAt}
                  hasMoreOlderMessages={hasMoreOlderMessages}
                  isLoadingOlderMessages={isLoadingOlderMessages}
                  onLoadOlderMessages={handleLoadOlderMessages}
                />
              )}

              {/* Non-blocking error notification if sending fails */}
              {sendErrorNotice && (
                <div className="mx-4 my-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <svg className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="truncate">{sendErrorNotice} (seu rascunho de mensagem foi preservado)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSendErrorNotice(null)}
                    className="text-xs font-bold px-2 py-0.5 rounded hover:bg-rose-500/20 cursor-pointer shrink-0"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {/* Bottom Conversation Area (Strictly coherent with consultation state) */}
              {isCompleted ? (
                <div className="p-3.5 sm:p-4 bg-zinc-50 dark:bg-[#16171B] border-t border-[#E5E7EB] dark:border-[#22242A] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">
                        Atendimento concluído{activeChat.closedAt ? ` em ${new Date(activeChat.closedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}` : ""}.
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        O histórico de mensagens e orientações está preservado.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsReturnModalOpen(true);
                      setReturnError(null);
                    }}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs active:scale-95 text-xs w-full sm:w-auto shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Solicitar Retorno</span>
                  </button>
                </div>
              ) : activeChat.status === "CANCELED" ? (
                <div className="p-3.5 sm:p-4 bg-zinc-50 dark:bg-[#16171B] border-t border-[#E5E7EB] dark:border-[#22242A] flex items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <div className="w-8 h-8 rounded-xl bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <p>Este atendimento foi cancelado. O histórico está preservado para consulta.</p>
                </div>
              ) : activeChat.status === "DECLINED" ? (
                <div className="p-3.5 sm:p-4 bg-rose-500/10 border-t border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold">Agendamento recusado.</p>
                      {activeChat.declinedReason && <p className="text-[11px] opacity-90">Motivo: {activeChat.declinedReason}</p>}
                    </div>
                  </div>
                </div>
              ) : (
                /* Active Chat Input Bar */
                <ChatInputBar
                  onSendMessage={handleSendMessage}
                  isSending={isSending}
                  disabled={!isMessagingUnlocked}
                  disabledMessage={
                    !isMessagingUnlocked
                      ? "Aguardando confirmação bilateral do agendamento para liberar as mensagens."
                      : undefined
                  }
                  isProfessional={isProfessional}
                  replyingTo={replyingTo}
                  onCancelReply={() => setReplyingTo(null)}
                />
              )}
            </>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center text-zinc-400 dark:text-zinc-500 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3.5 text-2xl shadow-xs">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">
              Nenhum atendimento selecionado
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4 max-w-sm">
              Selecione uma conversa na lista ao lado para acompanhar as mensagens, registrar orientações e visualizar o histórico clínico.
            </p>
            <button
              type="button"
              onClick={handleOpenNewChatModal}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>{isProfessional ? "Iniciar novo atendimento" : "Solicitar consulta"}</span>
            </button>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* RIGHT PANE: AI Anamnesis, Private Notes & SOAP Panel                  */}
      {/* -------------------------------------------------------------------- */}
      {activeChat && isAiDrawerOpen && activeChat.modality !== "VIDEO" && (
        <div className="fixed inset-0 z-40 md:relative md:inset-auto md:w-80 lg:w-96 shrink-0 flex transition-all">
          <AIAnamnesisPanel
            proposal={activeChat.aiAnamnesisJson}
            consultationPublicId={activeChat.publicId}
            consultancySlug={consultancySlug}
            aiStatus={activeChat.aiAnamnesisStatus}
            isProfessional={isProfessional}
            initialPrivateNotes={activeChat.privateNotes}
            onClose={() => setIsAiDrawerOpen(false)}
          />
        </div>
      )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 1: New Chat Appointment Proposal (Two-Stage Bilateral Flow)   */}
      {/* -------------------------------------------------------------------- */}
      {mounted && isNewChatModalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsNewChatModalOpen(false);
          }}
        >
          <div
            className="w-full sm:max-w-xl bg-[var(--surface)] sm:border border-[var(--border-subtle)] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Indicator */}
            <div className="pt-2.5 pb-1 flex justify-center sm:hidden shrink-0">
              <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
            </div>

            {/* STAGE 1: Participant Selection */}
            {proposalStage === "SELECT_PARTICIPANT" ? (
              <>
                {/* Header Stage 1 */}
                <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      {isProfessional ? "Com quem será o atendimento?" : "Solicitar Consulta"}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {isProfessional
                        ? "Selecione o aluno destinatário para definir os detalhes da proposta."
                        : "Selecione o profissional para iniciar o acompanhamento."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNewChatModalOpen(false)}
                    aria-label="Fechar"
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[var(--text-tertiary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Body Stage 1 */}
                <div className="p-5 flex-1 overflow-y-auto space-y-3.5 overscroll-contain">
                  {proposalError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {proposalError}
                    </div>
                  )}

                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={newChatSearch}
                      onChange={(e) => setNewChatSearch(e.target.value)}
                      placeholder={
                        isProfessional
                          ? "Buscar aluno por nome ou e-mail..."
                          : "Buscar profissional por nome ou especialidade..."
                      }
                      className="w-full min-h-[44px] pl-10 pr-8 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <svg
                      className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-tertiary)] pointer-events-none"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    {newChatSearch.trim() && (
                      <button
                        type="button"
                        onClick={() => setNewChatSearch("")}
                        className="absolute right-2.5 top-2.5 p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                        aria-label="Limpar filtro"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Candidates List */}
                  <div className="space-y-1.5">
                    {isProfessional ? (
                      activeStudents
                        .filter(
                          (s) =>
                            s.name.toLowerCase().includes(newChatSearch.toLowerCase().trim()) ||
                            s.email.toLowerCase().includes(newChatSearch.toLowerCase().trim())
                        )
                        .map((student) => {
                          const isCurrentlySelected = selectedStudentForProposal?.membershipId === student.membershipId;
                          return (
                            <button
                              key={student.membershipId}
                              type="button"
                              onClick={() => {
                                setSelectedStudentForProposal(student);
                                setProposalError(null);
                                setProposalStage("FILL_DETAILS");
                              }}
                              className={`w-full min-h-[56px] p-3 rounded-2xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer border ${
                                isCurrentlySelected
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200 shadow-2xs"
                                  : "bg-[var(--surface-subtle)] hover:bg-[var(--surface-active)] border-transparent hover:border-[var(--border-subtle)]"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <UserAvatar
                                  fullName={student.name}
                                  userPublicId={student.userPublicId}
                                  size="md"
                                  circular={true}
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                    {student.name}
                                  </p>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                    {student.email}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold shrink-0">
                                <span className="hidden sm:inline">Avançar</span>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </button>
                          );
                        })
                    ) : (
                      activeProfessionals
                        .filter(
                          (p) =>
                            p.name.toLowerCase().includes(newChatSearch.toLowerCase().trim()) ||
                            p.email.toLowerCase().includes(newChatSearch.toLowerCase().trim())
                        )
                        .map((pro) => {
                          const isCurrentlySelected = selectedProfessionalForProposal?.membershipId === pro.membershipId;
                          return (
                            <button
                              key={pro.membershipId}
                              type="button"
                              onClick={() => {
                                setSelectedProfessionalForProposal(pro);
                                setProposalError(null);
                                setProposalStage("FILL_DETAILS");
                              }}
                              className={`w-full min-h-[56px] p-3 rounded-2xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer border ${
                                isCurrentlySelected
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200 shadow-2xs"
                                  : "bg-[var(--surface-subtle)] hover:bg-[var(--surface-active)] border-transparent hover:border-[var(--border-subtle)]"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <UserAvatar
                                  fullName={pro.name}
                                  userPublicId={pro.userPublicId}
                                  size="md"
                                  circular={true}
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                    {pro.name}
                                  </p>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                    {pro.role === "PERSONAL" ? "Personal Trainer" : "Nutricionista"} • {pro.email}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold shrink-0">
                                <span className="hidden sm:inline">Avançar</span>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </button>
                          );
                        })
                    )}

                    {((isProfessional && activeStudents.length === 0) ||
                      (!isProfessional && activeProfessionals.length === 0)) && (
                      <div className="py-8 text-center text-xs text-[var(--text-tertiary)]">
                        {isProfessional
                          ? "Nenhum aluno ativo vinculado à consultoria."
                          : "Nenhum profissional disponível no momento."}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Stage 1 */}
                <div className="px-5 py-4 border-t border-[var(--border-subtle)] flex items-center justify-end shrink-0 bg-[var(--surface)] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
                  <button
                    type="button"
                    onClick={() => setIsNewChatModalOpen(false)}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              /* STAGE 2: Proposal Details */
              <form onSubmit={handleSubmitProposal} className="flex flex-col flex-1 overflow-hidden min-h-0">
                {/* Header Stage 2 */}
                <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {(isProfessional || activeProfessionals.length > 1) && (
                      <button
                        type="button"
                        onClick={() => {
                          setProposalStage("SELECT_PARTICIPANT");
                          setProposalError(null);
                        }}
                        className="min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0"
                        title="Voltar e trocar participante"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="hidden sm:inline">Trocar</span>
                      </button>
                    )}
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                        Detalhes do Atendimento
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Defina o marco de início e expectativa de resposta.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNewChatModalOpen(false)}
                    aria-label="Fechar"
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[var(--text-tertiary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Body Stage 2 */}
                <div className="p-5 flex-1 overflow-y-auto space-y-4 overscroll-contain">
                  {proposalError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {proposalError}
                    </div>
                  )}

                  {/* Selected Participant Card */}
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#1A1C22] border border-[#E5E7EB] dark:border-[#2E313A] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        fullName={
                          isProfessional
                            ? selectedStudentForProposal?.name || "Aluno"
                            : selectedProfessionalForProposal?.name || activeProfessionals[0]?.name || "Profissional"
                        }
                        userPublicId={
                          isProfessional
                            ? selectedStudentForProposal?.userPublicId
                            : selectedProfessionalForProposal?.userPublicId || activeProfessionals[0]?.userPublicId
                        }
                        size="md"
                        circular={true}
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                          {isProfessional ? "Aluno destinatário" : "Profissional destinatário"}
                        </p>
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {isProfessional
                            ? selectedStudentForProposal?.name
                            : selectedProfessionalForProposal?.name || activeProfessionals[0]?.name}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          {isProfessional
                            ? selectedStudentForProposal?.email
                            : (selectedProfessionalForProposal?.role || activeProfessionals[0]?.role) === "PERSONAL"
                            ? "Personal Trainer"
                            : "Nutricionista"}
                        </p>
                      </div>
                    </div>
                    {(isProfessional || activeProfessionals.length > 1) && (
                      <button
                        type="button"
                        onClick={() => {
                          setProposalStage("SELECT_PARTICIPANT");
                          setProposalError(null);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer shrink-0"
                      >
                        Trocar
                      </button>
                    )}
                  </div>

                  {/* 1. Date & Time Inputs */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Quando iniciar (Marco de Referência)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Data de referência</span>
                        <input
                          type="date"
                          required
                          value={proposalDate}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={(e) => setProposalDate(e.target.value)}
                          className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-[#1A1C22] border border-[#E5E7EB] dark:border-[#2E313A] text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Horário sugerido</span>
                        <input
                          type="time"
                          required
                          value={proposalTime}
                          onChange={(e) => setProposalTime(e.target.value)}
                          className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-[#1A1C22] border border-[#E5E7EB] dark:border-[#2E313A] text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed flex items-start gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Vocês não precisam estar conectados ao mesmo tempo. O horário serve como marco inicial do atendimento assíncrono.</span>
                    </p>
                  </div>

                  {/* 2. Expected Response Time */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="9" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                      </svg>
                      <span>Expectativa de resposta</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[12, 24, 48].map((hours) => (
                        <button
                          key={hours}
                          type="button"
                          onClick={() => setProposalExpectedHours(hours)}
                          className={`min-h-[42px] py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            proposalExpectedHours === hours
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                              : "bg-white/80 dark:bg-[#1A1C22] text-zinc-700 dark:text-zinc-300 border-[#E5E7EB] dark:border-[#2E313A] hover:bg-zinc-100 dark:hover:bg-[#252830]"
                          }`}
                        >
                          Até {hours}h
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                      Prazo máximo esperado para resposta a cada mensagem enviada.
                    </p>
                  </div>

                  {/* 3. Focus / Topic */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-primary)]">
                      Foco do atendimento (opcional)
                    </label>
                    <input
                      type="text"
                      value={proposalTopic}
                      onChange={(e) => setProposalTopic(e.target.value)}
                      placeholder="Ex: Alinhamento de metas, dúvidas sobre treino/dieta..."
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  {/* 4. Initial Message */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-primary)]">
                      Mensagem inicial (opcional)
                    </label>
                    <textarea
                      rows={3}
                      value={proposalInitialMessage}
                      onChange={(e) => setProposalInitialMessage(e.target.value)}
                      placeholder="Envie uma mensagem inicial para contextualizar o atendimento..."
                      className="w-full min-h-[110px] p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-emerald-500 resize-none transition-colors leading-relaxed"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                    ℹ️ O agendamento entra na lista de ambos. O canal de mensagens assíncronas é liberado após a confirmação mútua.
                  </div>
                </div>

                {/* Footer Stage 2 */}
                <div className="px-5 py-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3 shrink-0 bg-[var(--surface)] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
                  <button
                    type="button"
                    onClick={() => setIsNewChatModalOpen(false)}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingProposal || !proposalDate || !proposalTime}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmittingProposal ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Enviando proposta...</span>
                      </>
                    ) : (
                      <span>Enviar proposta</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 2: Counter Proposal Modal (Suggest new time)                   */}
      {/* -------------------------------------------------------------------- */}
      {mounted && isCounterModalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCounterModalOpen(false);
          }}
        >
          <div
            className="w-full sm:max-w-md bg-[var(--surface)] sm:border border-[var(--border-subtle)] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Propor Outro Horário
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Sugira uma nova data ou horário para o início do atendimento.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCounterModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {counterError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {counterError}
              </div>
            )}

            <form onSubmit={handleSubmitCounter} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Nova data sugerida
                </label>
                <input
                  type="date"
                  required
                  value={counterDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setCounterDate(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Novo horário sugerido
                </label>
                <input
                  type="time"
                  required
                  value={counterTime}
                  onChange={(e) => setCounterTime(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)] pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
                <button
                  type="button"
                  onClick={() => setIsCounterModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCounter}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingCounter ? "Enviando..." : "Enviar sugestão"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 3: Decline Proposal Modal                                      */}
      {/* -------------------------------------------------------------------- */}
      {mounted && isDeclineModalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDeclineModalOpen(false);
          }}
        >
          <div
            className="w-full sm:max-w-md bg-[var(--surface)] sm:border border-[var(--border-subtle)] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Recusar Agendamento
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Informe o participante sobre a impossibilidade do atendimento.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeclineModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDecline} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Motivo (opcional)
                </label>
                <textarea
                  rows={3}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Informe o motivo da recusa para orientar o participante..."
                  className="w-full min-h-[90px] p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-rose-500 resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)] pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
                <button
                  type="button"
                  onClick={() => setIsDeclineModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDecline}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingDecline ? "Recusando..." : "Confirmar recusa"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 4: Closure Modal ("Finalizar Consulta")                         */}
      {/* -------------------------------------------------------------------- */}
      {mounted && isClosureModalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsClosureModalOpen(false);
          }}
        >
          <div
            className="w-full sm:max-w-xl bg-[var(--surface)] sm:border border-[var(--border-subtle)] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>✓ Finalizar Atendimento</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Conclusão clínica e entrega das orientações do ciclo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsClosureModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitClosure} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-5 flex-1 overflow-y-auto space-y-4 overscroll-contain">
                {closureError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {closureError}
                  </div>
                )}

                {/* Summary */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                    <span>Resumo do atendimento (obrigatório)</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">Visível ao aluno</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={closureSummary}
                    onChange={(e) => setClosureSummary(e.target.value)}
                    placeholder="Ex: Consulta realizada com alinhamento de protocolo de treino e ajustes na hidratação..."
                    className="w-full min-h-[80px] p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Orientations */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                    <span>Orientações clínicas (uma por linha)</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">Visível ao aluno</span>
                  </label>
                  <textarea
                    rows={2}
                    value={closureOrientations}
                    onChange={(e) => setClosureOrientations(e.target.value)}
                    placeholder="Ex: Ingerir 3L de água ao dia&#10;Manter descanso de 72h entre treinos de perna"
                    className="w-full min-h-[64px] p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Prescriptions */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                    <span>Prescrições / Ajustes (uma por linha)</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">Visível ao aluno</span>
                  </label>
                  <textarea
                    rows={2}
                    value={closurePrescriptions}
                    onChange={(e) => setClosurePrescriptions(e.target.value)}
                    placeholder="Ex: Creatina 5g pós-treino&#10;Whey protein 30g com frutas"
                    className="w-full min-h-[64px] p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Return Prediction */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">
                    Previsão de retorno recomendada
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 30, 45, 60].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setClosureReturnPredictionDays(days)}
                        className={`min-h-[40px] py-2 px-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          closureReturnPredictionDays === days
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--surface-active)]"
                        }`}
                      >
                        {days} dias
                      </button>
                    ))}
                  </div>
                </div>

                {/* Private Notes */}
                <div className="space-y-1 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>Notas privadas do profissional</span>
                    </span>
                    <span className="text-[10px] font-semibold">Exclusivo do prontuário (nunca exposto ao aluno)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={closurePrivateNotes}
                    onChange={(e) => setClosurePrivateNotes(e.target.value)}
                    placeholder="Anotações clínicas confidenciais, hipóteses diagnósticas ou pontos de atenção para o próximo retorno..."
                    className="w-full min-h-[70px] p-3 rounded-xl bg-amber-500/5 border border-amber-500/25 text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3 shrink-0 bg-[var(--surface)] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
                <button
                  type="button"
                  onClick={() => setIsClosureModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                >
                  Voltar ao chat
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClosure}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingClosure ? "Finalizando..." : "Confirmar Encerramento"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 5: Return Consultation Modal ("Solicitar Retorno")               */}
      {/* -------------------------------------------------------------------- */}
      {mounted && isReturnModalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsReturnModalOpen(false);
          }}
        >
          <div
            className="w-full sm:max-w-md bg-[var(--surface)] sm:border border-[var(--border-subtle)] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Solicitar Consulta de Retorno</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Vinculada ao histórico do atendimento anterior.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {returnError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {returnError}
              </div>
            )}

            <form onSubmit={handleSubmitReturn} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-primary)]">
                    Data do retorno
                  </label>
                  <input
                    type="date"
                    required
                    value={returnDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-primary)]">
                    Horário de referência
                  </label>
                  <input
                    type="time"
                    required
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Objetivo do retorno
                </label>
                <input
                  type="text"
                  value={returnTopic}
                  onChange={(e) => setReturnTopic(e.target.value)}
                  placeholder="Ex: Reavaliação de medidas, novos ajustes..."
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Expectativa de resposta
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[12, 24, 48].map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => setReturnExpectedHours(hours)}
                      className={`min-h-[40px] py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        returnExpectedHours === hours
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--surface-active)]"
                      }`}
                    >
                      Até {hours}h
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)] pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReturn}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingReturn ? "Enviando..." : "Confirmar retorno"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 6: Mobile Queue Filter Bottom Sheet                             */}
      {/* -------------------------------------------------------------------- */}
      {mounted && isMobileQueueModalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setIsMobileQueueModalOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-[var(--surface)] border border-[var(--border-subtle)] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                Filtrar atendimentos
              </h3>
              <button
                type="button"
                onClick={() => setIsMobileQueueModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 rounded-xl text-[var(--text-tertiary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                aria-label="Fechar seletor de fila"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
              {queueOptions.map((opt) => {
                const isActive = activeQueueTab === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      handleSelectQueue(opt.key);
                      setIsMobileQueueModalOpen(false);
                    }}
                    className={`w-full min-h-[48px] px-4 py-3 rounded-2xl text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isActive
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs"
                        : "hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] font-semibold border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-600" : "bg-transparent"}`} />
                      <span className="text-sm">{opt.label}</span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? "bg-emerald-600 text-white"
                          : "bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 7: Exclude Consultation Confirmation                           */}
      {/* -------------------------------------------------------------------- */}
      {mounted && Boolean(consultationToExclude) && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exclude-modal-title"
          className="fixed inset-0 z-[105] bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!isExcluding) {
              setConsultationToExclude(null);
              setExcludeError(null);
            }
          }}
        >
          <div
            className="w-full sm:max-w-md bg-[var(--surface)] border border-[var(--border-subtle)] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="exclude-modal-title" className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  Excluir esta conversa da sua lista?
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  Ela deixará de aparecer para você. O histórico continuará disponível para o outro participante. Você poderá restaurá-la em <strong>Conversas removidas</strong>.
                </p>
              </div>
            </div>

            {consultationToExclude &&
              consultationToExclude.modality !== "VIDEO" &&
              consultationToExclude.status !== "COMPLETED" &&
              consultationToExclude.status !== "CANCELED" &&
              consultationToExclude.status !== "DECLINED" &&
              !consultationToExclude.closedAt && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
                  Isso não encerra nem cancela o atendimento.
                </div>
              )}

            {excludeError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
                {excludeError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)] pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
              <button
                type="button"
                disabled={isExcluding}
                onClick={() => {
                  setConsultationToExclude(null);
                  setExcludeError(null);
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isExcluding}
                onClick={handleConfirmExclude}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
              >
                {isExcluding ? "Excluindo..." : "Excluir da minha lista"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* -------------------------------------------------------------------- */}
      {/* UNDO TOAST: Conversa removida da sua lista                           */}
      {/* -------------------------------------------------------------------- */}
      {mounted && undoToast && createPortal(
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] max-w-sm w-[calc(100%-2rem)] bg-zinc-900 dark:bg-[#1E2026] text-white border border-zinc-700 dark:border-[#343842] rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xs font-medium text-zinc-200 truncate">
              Conversa removida da sua lista.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleUndoExclude}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer active:scale-95 shadow-xs"
            >
              Desfazer
            </button>
            <button
              type="button"
              onClick={() => {
                if (undoToast.timeoutId) clearTimeout(undoToast.timeoutId);
                setUndoToast(null);
              }}
              aria-label="Fechar notificação"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>,
        document.body
      )}
      {/* -------------------------------------------------------------------- */}
      {/* WELCOME INTRO MODAL                                                  */}
      {/* -------------------------------------------------------------------- */}
      <TrevoChatWelcomeModal
        isOpen={isIntroOpen}
        onClose={() => setIsIntroOpen(false)}
        audienceRole={effectiveAudienceRole}
        onComplete={handleCompleteIntro}
        onDismiss={handleDismissIntro}
        triggerRef={introHelpButtonRef}
      />
    </div>
  );
}
