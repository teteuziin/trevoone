"use client";

import React, { useState, useEffect, useTransition } from "react";
import type {
  ChatConsultationDto,
  ChatMessageDto,
  ChatConsultationStatus,
} from "@/lib/consultancies/trevo-chat";

function isChatMessagingUnlocked(status: ChatConsultationStatus): boolean {
  return (
    status === "CONFIRMED" ||
    status === "AWAITING_STUDENT" ||
    status === "AWAITING_PROFESSIONAL"
  );
}
import { ChatMessageList } from "./chat-message-list";
import { ChatInputBar } from "./chat-input-bar";
import { AIAnamnesisPanel } from "./ai-anamnesis-panel";
import {
  sendChatMessageAction,
  markChatReadAction,
  updateChatStatusAction,
  proposeChatConsultationAction,
  respondToChatProposalAction,
  cancelChatConsultationAction,
} from "@/app/consultoria/[slug]/consultas/chat-actions";

export interface StudentCandidate {
  membershipId: number;
  userPublicId: string;
  name: string;
  email: string;
}

interface TrevoChatWorkspaceProps {
  consultancySlug: string;
  currentUserId: number;
  isProfessional: boolean;
  professionalType?: "PERSONAL" | "NUTRITIONIST";
  consultations: ChatConsultationDto[];
  initialActivePublicId?: string | null;
  activeStudents?: StudentCandidate[];
}

export function TrevoChatWorkspace({
  consultancySlug,
  currentUserId,
  isProfessional,
  professionalType = "PERSONAL",
  consultations: initialConsultations,
  initialActivePublicId,
  activeStudents = [],
}: TrevoChatWorkspaceProps) {
  const [, startTransition] = useTransition();

  // Local consultations overrides (created / updated via actions)
  const [createdConsultations, setCreatedConsultations] = useState<ChatConsultationDto[]>([]);
  const [updatedConsultations, setUpdatedConsultations] = useState<Record<string, Partial<ChatConsultationDto>>>({});

  // Merge created and updated with initial props
  const consultations = [
    ...createdConsultations.filter(
      (c) => !initialConsultations.some((ic) => ic.publicId === c.publicId)
    ),
    ...initialConsultations,
  ].map((c) => ({
    ...c,
    ...(updatedConsultations[c.publicId] || {}),
  }));

  // Active consultation state
  const [selectedChatPublicId, setSelectedChatPublicId] = useState<string | null>(
    initialActivePublicId || (consultations.length > 0 ? consultations[0].publicId : null)
  );

  // Mobile navigation screen: "LIST" vs "CHAT"
  const [mobileScreen, setMobileScreen] = useState<"LIST" | "CHAT">(
    initialActivePublicId ? "CHAT" : "LIST"
  );

  // Mobile / Desktop AI drawer open state (starts strictly CLOSED on all devices)
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  // New Proposal modal state
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [selectedStudentForProposal, setSelectedStudentForProposal] = useState<StudentCandidate | null>(null);
  const [proposalDate, setProposalDate] = useState("");
  const [proposalTime, setProposalTime] = useState("");
  const [proposalTopic, setProposalTopic] = useState("");
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");

  // Counter-proposal modal state
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [counterDate, setCounterDate] = useState("");
  const [counterTime, setCounterTime] = useState("");
  const [counterError, setCounterError] = useState<string | null>(null);
  const [isSubmittingCounter, setIsSubmittingCounter] = useState(false);

  // Decline modal state
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);

  // Search filter for conversation list
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PROPOSED" | "CONFIRMED" | "COMPLETED">("ALL");

  // Local messages state for active chat
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(
    Boolean(initialActivePublicId || consultations.length > 0)
  );
  const [isSending, setIsSending] = useState(false);

  // Current active consultation object
  const activeChat = consultations.find((c) => c.publicId === selectedChatPublicId) || null;

  // Listen to open schedule event from shared tabbed header
  useEffect(() => {
    const handleOpenChatSchedule = () => {
      setIsNewChatModalOpen(true);
      setProposalError(null);
    };
    window.addEventListener("trevo:open-chat-schedule", handleOpenChatSchedule);
    return () => {
      window.removeEventListener("trevo:open-chat-schedule", handleOpenChatSchedule);
    };
  }, []);

  // Load messages whenever active chat changes
  useEffect(() => {
    if (!selectedChatPublicId) {
      return;
    }

    let isMounted = true;

    fetch(`/api/consultancies/${consultancySlug}/chat/messages?chat=${selectedChatPublicId}`)
      .then((res) => (res.ok ? res.json() : { messages: [] }))
      .then((data) => {
        if (isMounted) {
          setMessages(data.messages || []);
          setIsLoadingMessages(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingMessages(false);
      });

    // Mark as read
    markChatReadAction(consultancySlug, selectedChatPublicId).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [selectedChatPublicId, consultancySlug]);

  // Handle select chat
  const handleSelectChat = (chatId: string) => {
    setIsLoadingMessages(true);
    setMessages([]);
    setSelectedChatPublicId(chatId);
    setMobileScreen("CHAT");
  };

  // Handle back to list on mobile
  const handleBackToList = () => {
    setMobileScreen("LIST");
  };

  // Handle send message
  const handleSendMessage = async (params: {
    content?: string;
    file?: File;
    messageType?: "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT";
    audioDurationSeconds?: number;
  }): Promise<boolean> => {
    if (!selectedChatPublicId) return false;
    setIsSending(true);

    try {
      const formData = new FormData();
      if (params.content) formData.append("content", params.content);
      if (params.messageType) formData.append("messageType", params.messageType);
      if (params.audioDurationSeconds) {
        formData.append("audioDurationSeconds", String(params.audioDurationSeconds));
      }
      if (params.file) {
        formData.append("file", params.file);
      }

      const res = await sendChatMessageAction(consultancySlug, selectedChatPublicId, formData);
      if (res.ok && res.data) {
        setMessages((prev) => [...prev, res.data as ChatMessageDto]);
        setIsSending(false);
        return true;
      } else {
        alert(res.error || "Erro ao enviar mensagem.");
        setIsSending(false);
        return false;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao enviar mensagem.";
      alert(msg);
      setIsSending(false);
      return false;
    }
  };

  // Status switcher (for completed status)
  const handleStatusChange = (newStatus: ChatConsultationStatus) => {
    if (!selectedChatPublicId || !isProfessional) return;
    startTransition(async () => {
      await updateChatStatusAction(consultancySlug, selectedChatPublicId, newStatus);
      setUpdatedConsultations((prev) => ({
        ...prev,
        [selectedChatPublicId]: { ...(prev[selectedChatPublicId] || {}), status: newStatus },
      }));
    });
  };

  // Submit new proposal
  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setProposalError(null);

    if (isProfessional && !selectedStudentForProposal) {
      setProposalError("Selecione um aluno para agendar o atendimento.");
      return;
    }
    if (!proposalDate || !proposalTime) {
      setProposalError("Informe a data e o horário de referência.");
      return;
    }

    setIsSubmittingProposal(true);
    try {
      const res = await proposeChatConsultationAction(consultancySlug, {
        studentMembershipId: selectedStudentForProposal ? selectedStudentForProposal.membershipId : undefined,
        professionalType: isProfessional ? professionalType : undefined,
        referenceDate: proposalDate,
        referenceTime: proposalTime,
        title: proposalTopic.trim() || undefined,
      });

      if (res.ok && res.data) {
        const chat = res.data as ChatConsultationDto;
        setCreatedConsultations((prev) => [chat, ...prev.filter((c) => c.publicId !== chat.publicId)]);
        setSelectedChatPublicId(chat.publicId);
        setIsNewChatModalOpen(false);
        setSelectedStudentForProposal(null);
        setProposalDate("");
        setProposalTime("");
        setProposalTopic("");
        setMobileScreen("CHAT");
      } else {
        setProposalError(res.error || "Erro ao enviar proposta de agendamento.");
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

  // Filtered consultations
  const filteredConsultations = consultations.filter((c) => {
    if (statusFilter === "PROPOSED" && c.status !== "PROPOSED") return false;
    if (statusFilter === "CONFIRMED" && c.status !== "CONFIRMED") return false;
    if (statusFilter === "COMPLETED" && c.status !== "COMPLETED") return false;

    if (searchFilter.trim()) {
      const targetName = isProfessional ? c.studentName : c.professionalName;
      if (!targetName.toLowerCase().includes(searchFilter.toLowerCase().trim())) {
        return false;
      }
    }
    return true;
  });

  const STATUS_CONFIG: Record<
    ChatConsultationStatus,
    { label: string; badgeClass: string }
  > = {
    PROPOSED: {
      label: "Proposta",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    CONFIRMED: {
      label: "Liberado",
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

  return (
    <div className="flex-1 w-full flex bg-[var(--surface-subtle)] overflow-hidden rounded-2xl border border-[var(--border-subtle)] min-h-[640px] max-h-[calc(100vh-140px)] shadow-xs">
      {/* -------------------------------------------------------------------- */}
      {/* LEFT PANE: Conversation List (Visible on desktop or mobile screen 'LIST') */}
      {/* -------------------------------------------------------------------- */}
      <div
        className={`w-full md:w-80 lg:w-96 flex flex-col bg-[var(--surface)] border-r border-[var(--border-subtle)] shrink-0 ${
          mobileScreen === "CHAT" ? "hidden md:flex" : "flex"
        }`}
      >
        {/* List Header */}
        <div className="p-3.5 border-b border-[var(--border-subtle)] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>💬 Trevo Chat</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold">
                {consultations.length}
              </span>
            </h2>

            {isProfessional && (
              <button
                type="button"
                onClick={() => {
                  setIsNewChatModalOpen(true);
                  setProposalError(null);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <span>+ Agendar</span>
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar por nome..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-emerald-500"
            />
            <svg
              className="w-4 h-4 absolute left-2.5 top-2 text-[var(--text-tertiary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 rounded-full font-semibold cursor-pointer shrink-0 transition-colors ${
                statusFilter === "ALL"
                  ? "bg-emerald-600 text-white"
                  : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("PROPOSED")}
              className={`px-2.5 py-1 rounded-full font-semibold cursor-pointer shrink-0 transition-colors ${
                statusFilter === "PROPOSED"
                  ? "bg-amber-600 text-white"
                  : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]"
              }`}
            >
              Propostas
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("CONFIRMED")}
              className={`px-2.5 py-1 rounded-full font-semibold cursor-pointer shrink-0 transition-colors ${
                statusFilter === "CONFIRMED"
                  ? "bg-emerald-600 text-white"
                  : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]"
              }`}
            >
              Liberados
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("COMPLETED")}
              className={`px-2.5 py-1 rounded-full font-semibold cursor-pointer shrink-0 transition-colors ${
                statusFilter === "COMPLETED"
                  ? "bg-zinc-600 text-white"
                  : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]"
              }`}
            >
              Concluídos
            </button>
          </div>
        </div>

        {/* List Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
          {filteredConsultations.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--text-tertiary)] space-y-2">
              <p>Nenhum atendimento encontrado.</p>
              {isProfessional && (
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="text-emerald-600 hover:underline font-semibold cursor-pointer"
                >
                  Agendar com um aluno
                </button>
              )}
            </div>
          ) : (
            filteredConsultations.map((c) => {
              const isSelected = c.publicId === selectedChatPublicId;
              const displayName = isProfessional ? c.studentName : c.professionalName;
              const unreadCount = isProfessional ? c.unreadCountProfessional : c.unreadCountStudent;
              const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.CONFIRMED;

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
                  className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500/10 border-l-4 border-l-emerald-600"
                      : "hover:bg-[var(--surface-subtle)]"
                  }`}
                >
                  {/* Initials Avatar */}
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {displayName.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {displayName}
                      </span>
                      {c.lastMessageAt && (
                        <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
                          {new Date(c.lastMessageAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] truncate mb-1.5 opacity-90">
                      {c.lastMessagePreview || (c.status === "PROPOSED" ? "Proposta de agendamento pendente" : "Nenhuma mensagem ainda")}
                    </p>

                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusCfg.badgeClass}`}
                      >
                        {statusCfg.label}
                      </span>

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
      {/* MIDDLE PANE: Active Chat Conversation */}
      {/* -------------------------------------------------------------------- */}
      <div
        className={`flex-1 flex flex-col bg-[var(--surface)] min-w-0 overflow-hidden ${
          mobileScreen === "LIST" ? "hidden md:flex" : "flex"
        }`}
      >
        {activeChat ? (
          <>
            {/* Conversation Header */}
            <div className="p-3 sm:p-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 bg-[var(--surface)]">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Mobile Back Button: strict >= 44x44px tap target */}
                <button
                  type="button"
                  onClick={handleBackToList}
                  aria-label="Voltar para lista de atendimentos"
                  className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] active:scale-95 cursor-pointer -ml-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {(isProfessional ? activeChat.studentName : activeChat.professionalName)
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                    {isProfessional ? activeChat.studentName : activeChat.professionalName}
                  </h3>
                  <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                    {isProfessional ? activeChat.studentEmail : activeChat.professionalType === "PERSONAL" ? "Personal Trainer" : "Nutricionista"}
                  </p>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {isProfessional ? (
                  activeChat.status === "CONFIRMED" || activeChat.status === "COMPLETED" ? (
                    <select
                      value={activeChat.status}
                      onChange={(e) => handleStatusChange(e.target.value as ChatConsultationStatus)}
                      aria-label="Status do atendimento"
                      className="text-xs px-2.5 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold cursor-pointer focus:outline-none"
                    >
                      <option value="CONFIRMED">Liberado / Em andamento</option>
                      <option value="COMPLETED">Concluído</option>
                    </select>
                  ) : (
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        (STATUS_CONFIG[activeChat.status] || STATUS_CONFIG.CONFIRMED).badgeClass
                      }`}
                    >
                      {(STATUS_CONFIG[activeChat.status] || STATUS_CONFIG.CONFIRMED).label}
                    </span>
                  )
                ) : (
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      (STATUS_CONFIG[activeChat.status] || STATUS_CONFIG.CONFIRMED).badgeClass
                    }`}
                  >
                    {(STATUS_CONFIG[activeChat.status] || STATUS_CONFIG.CONFIRMED).label}
                  </span>
                )}

                {/* AI Anamnesis Toggle Button (starts closed on all devices) */}
                <button
                  type="button"
                  onClick={() => setIsAiDrawerOpen((prev) => !prev)}
                  title="Abrir Anamnese IA"
                  className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    isAiDrawerOpen
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 border border-purple-500/20"
                  }`}
                >
                  <span>🤖</span>
                  <span className="hidden sm:inline">Anamnese IA</span>
                </button>
              </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* BILATERAL PROPOSAL / CONFIRMED BANNERS                         */}
            {/* -------------------------------------------------------------- */}
            {activeChat.status === "PROPOSED" && (
              !isProposer ? (
                /* Recipient banner: Accept, Suggest new time, Decline */
                <div className="p-4 m-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      📅
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          Proposta de Agendamento Recebida
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          Aguardando seu aceite
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Horário de referência: <strong>{activeChat.proposedStartFormatted || "A combinar"}</strong>
                        {activeChat.topic && <span> • Foco: <em>{activeChat.topic}</em></span>}
                      </p>
                      <p className="text-[11px] text-[var(--text-tertiary)]">
                        O horário é apenas uma referência na sua agenda. Após o aceite mútuo, a conversa é liberada e cada um responde quando puder.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-amber-500/20 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleAcceptProposal(activeChat.publicId)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs active:scale-95"
                    >
                      Aceitar agendamento
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCounterModalOpen(true);
                        setCounterError(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-active)] text-[var(--text-primary)] text-xs font-semibold border border-[var(--border-default)] cursor-pointer transition-colors"
                    >
                      Propor outro horário
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDeclineModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Recusar
                    </button>
                  </div>
                </div>
              ) : (
                /* Proposer banner: Awaiting counterpart confirmation */
                <div className="p-4 m-3 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      ⏳
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          Proposta enviada
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300">
                          Aguardando confirmação do {isProfessional ? "aluno" : "profissional"}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Horário de referência: <strong>{activeChat.proposedStartFormatted || "A combinar"}</strong>
                        {activeChat.topic && <span> • Foco: <em>{activeChat.topic}</em></span>}
                      </p>
                      <p className="text-[11px] text-[var(--text-tertiary)]">
                        Assim que o participante confirmar, a troca de mensagens assíncronas será liberada.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCancelProposal(activeChat.publicId)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 self-end sm:self-auto cursor-pointer"
                  >
                    Cancelar proposta
                  </button>
                </div>
              )
            )}

            {activeChat.status === "CONFIRMED" && (
              <div className="px-4 py-2 bg-[var(--surface-subtle)] border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>
                    Atendimento liberado
                    {activeChat.proposedStartFormatted && (
                      <> • Referência: <strong className="text-[var(--text-primary)]">{activeChat.proposedStartFormatted}</strong></>
                    )}
                    {activeChat.topic && (
                      <span className="text-[var(--text-tertiary)]"> ({activeChat.topic})</span>
                    )}
                  </span>
                </div>
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  Atendimento assíncrono • Responda quando puder
                </span>
              </div>
            )}

            {activeChat.status === "DECLINED" && (
              <div className="p-3 m-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 space-y-1">
                <div className="font-bold">Agendamento recusado</div>
                {activeChat.declinedReason && <p>Motivo: {activeChat.declinedReason}</p>}
              </div>
            )}

            {activeChat.status === "CANCELED" && (
              <div className="p-3 m-3 rounded-2xl bg-zinc-500/10 border border-zinc-500/20 text-xs text-[var(--text-secondary)]">
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
              />
            )}

            {/* Input Bar */}
            <ChatInputBar
              onSendMessage={handleSendMessage}
              isSending={isSending}
              disabled={!isMessagingUnlocked || (activeChat.status === "COMPLETED" && !isProfessional)}
              disabledMessage={
                !isMessagingUnlocked
                  ? "Aguardando confirmação do agendamento por ambos os participantes para liberar as mensagens."
                  : activeChat.status === "COMPLETED"
                  ? "Este atendimento foi concluído."
                  : undefined
              }
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[var(--text-tertiary)]">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
              💬
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
              Selecione um atendimento
            </h3>
            <p className="text-xs max-w-sm">
              Escolha uma conversa na lista ao lado ou agende um novo atendimento com referência de agenda.
            </p>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* RIGHT PANE: AI Anamnesis Proposal (Starts CLOSED on ALL devices)       */}
      {/* -------------------------------------------------------------------- */}
      {activeChat && isAiDrawerOpen && (
        <div className="fixed inset-0 z-40 md:relative md:inset-auto md:w-80 lg:w-96 shrink-0 flex transition-all">
          <AIAnamnesisPanel
            proposal={activeChat.aiAnamnesisJson}
            consultationPublicId={activeChat.publicId}
            consultancySlug={consultancySlug}
            aiStatus={activeChat.aiAnamnesisStatus}
            isProfessional={isProfessional}
            onClose={() => setIsAiDrawerOpen(false)}
          />
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 1: New Chat Appointment Proposal (Bilateral)                   */}
      {/* -------------------------------------------------------------------- */}
      {isNewChatModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Agendar Trevo Chat
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Defina o aluno e uma referência de data/horário na agenda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1 rounded-lg hover:bg-black/10 text-[var(--text-secondary)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {proposalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {proposalError}
              </div>
            )}

            <form onSubmit={handleSubmitProposal} className="space-y-4">
              {/* Student Picker (for Professional) */}
              {isProfessional && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">
                    Aluno
                  </label>
                  {selectedStudentForProposal ? (
                    <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {selectedStudentForProposal.name}
                        </p>
                        <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                          {selectedStudentForProposal.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentForProposal(null)}
                        className="text-xs text-rose-600 font-semibold cursor-pointer hover:underline"
                      >
                        Trocar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newChatSearch}
                        onChange={(e) => setNewChatSearch(e.target.value)}
                        placeholder="Filtrar aluno por nome ou e-mail..."
                        className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                      />
                      <div className="max-h-40 overflow-y-auto divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-xl">
                        {activeStudents
                          .filter(
                            (s) =>
                              s.name.toLowerCase().includes(newChatSearch.toLowerCase().trim()) ||
                              s.email.toLowerCase().includes(newChatSearch.toLowerCase().trim())
                          )
                          .map((student) => (
                            <button
                              key={student.membershipId}
                              type="button"
                              onClick={() => setSelectedStudentForProposal(student)}
                              className="w-full py-2 px-3 text-left hover:bg-[var(--surface-subtle)] flex items-center justify-between gap-2 cursor-pointer transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                                  {student.name}
                                </p>
                                <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                                  {student.email}
                                </p>
                              </div>
                              <span className="text-xs text-emerald-600 font-bold shrink-0">
                                Selecionar
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Date & Time Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-primary)]">
                    Data de referência
                  </label>
                  <input
                    type="date"
                    required
                    value={proposalDate}
                    onChange={(e) => setProposalDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-primary)]">
                    Horário de referência
                  </label>
                  <input
                    type="time"
                    required
                    value={proposalTime}
                    onChange={(e) => setProposalTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Topic / Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Foco da consulta (opcional)
                </label>
                <input
                  type="text"
                  value={proposalTopic}
                  onChange={(e) => setProposalTopic(e.target.value)}
                  placeholder="Ex: Alinhamento de metas, dúvidas sobre treino..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                ℹ️ O horário registrado serve como referência na agenda. A conversa é assíncrona e será liberada assim que o agendamento for confirmado por ambos os participantes.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProposal}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSubmittingProposal ? "Enviando..." : "Enviar proposta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 2: Counter Proposal Modal (Suggest new time)                   */}
      {/* -------------------------------------------------------------------- */}
      {isCounterModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Propor Outro Horário
              </h3>
              <button
                type="button"
                onClick={() => setIsCounterModalOpen(false)}
                className="p-1 rounded-lg hover:bg-black/10 text-[var(--text-secondary)] cursor-pointer"
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
                  onChange={(e) => setCounterDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
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
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsCounterModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCounter}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSubmittingCounter ? "Enviando..." : "Enviar sugestão"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 3: Decline Proposal Modal                                      */}
      {/* -------------------------------------------------------------------- */}
      {isDeclineModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Recusar Agendamento
              </h3>
              <button
                type="button"
                onClick={() => setIsDeclineModalOpen(false)}
                className="p-1 rounded-lg hover:bg-black/10 text-[var(--text-secondary)] cursor-pointer"
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
                  placeholder="Informe o motivo da recusa..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsDeclineModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDecline}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSubmittingDecline ? "Recusando..." : "Confirmar recusa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
