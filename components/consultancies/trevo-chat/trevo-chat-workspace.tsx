"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import type {
  ChatConsultationDto,
  ChatMessageDto,
  ChatConsultationStatus,
  ChatMessageType,
} from "@/lib/consultancies/trevo-chat";
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
  closeChatConsultationAction,
  requestReturnConsultationAction,
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
export type ProQueue = "PRECISO_RESPONDER" | "AGUARDANDO_ALUNO" | "SOLICITACOES_RECEBIDAS" | "CONCLUIDOS" | "ALL";
export type StudentQueue = "EM_ATENDIMENTO" | "SOLICITACOES" | "CONCLUIDAS" | "ALL";

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

export function TrevoChatWorkspace({
  consultancySlug,
  currentUserId,
  isProfessional,
  professionalType = "PERSONAL",
  consultations: initialConsultations,
  initialActivePublicId,
  activeStudents = [],
  activeProfessionals = [],
}: TrevoChatWorkspaceProps) {
  const [, startTransition] = useTransition();

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
    if (isProfessional) {
      const counts: Record<ProQueue, number> = {
        PRECISO_RESPONDER: 0,
        AGUARDANDO_ALUNO: 0,
        SOLICITACOES_RECEBIDAS: 0,
        CONCLUIDOS: 0,
        ALL: consultations.length,
      };
      consultations.forEach((c) => {
        const key = getProQueueKey(c);
        counts[key] = (counts[key] || 0) + 1;
      });
      return counts;
    } else {
      const counts: Record<StudentQueue, number> = {
        EM_ATENDIMENTO: 0,
        SOLICITACOES: 0,
        CONCLUIDAS: 0,
        ALL: consultations.length,
      };
      consultations.forEach((c) => {
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
      return "ALL";
    } else {
      if ((queueCounts as Record<StudentQueue, number>).EM_ATENDIMENTO > 0) return "EM_ATENDIMENTO";
      if ((queueCounts as Record<StudentQueue, number>).SOLICITACOES > 0) return "SOLICITACOES";
      return "ALL";
    }
  });

  // Selected chat publicId
  const [selectedChatPublicId, setSelectedChatPublicId] = useState<string | null>(
    initialActivePublicId || (consultations.length > 0 ? consultations[0].publicId : null)
  );

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

  // Modals state
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
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

  // Listen to open schedule event from shared tabs
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

  // Status switcher
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
    if (!isProfessional && activeProfessionals.length > 1 && !selectedProfessionalForProposal) {
      setProposalError("Selecione o profissional para o atendimento.");
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
      // Queue Filter
      if (isProfessional) {
        if (activeQueueTab !== "ALL" && getProQueueKey(c) !== activeQueueTab) {
          return false;
        }
      } else {
        if (activeQueueTab !== "ALL" && getStudentQueueKey(c) !== activeQueueTab) {
          return false;
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
    <div className="flex-1 w-full flex bg-[var(--surface-subtle)] overflow-hidden rounded-2xl border border-[var(--border-subtle)] min-h-[640px] max-h-[calc(100vh-140px)] shadow-xs">
      {/* -------------------------------------------------------------------- */}
      {/* LEFT PANE: Queues & Consultation List                                */}
      {/* -------------------------------------------------------------------- */}
      <div
        className={`w-full md:w-80 lg:w-96 flex flex-col bg-[var(--surface)] border-r border-[var(--border-subtle)] shrink-0 ${
          mobileScreen === "CHAT" ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header & New Button */}
        <div className="p-3.5 border-b border-[var(--border-subtle)] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>💬 Trevo Chat</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
                {consultations.length}
              </span>
            </h2>

            <button
              type="button"
              onClick={() => {
                setIsNewChatModalOpen(true);
                setProposalError(null);
              }}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs active:scale-95"
            >
              <span>+ Novo Atendimento</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar por nome ou assunto..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-emerald-500"
            />
            <svg
              className="w-4 h-4 absolute left-2.5 top-2.5 text-[var(--text-tertiary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Queues Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            {isProfessional ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveQueueTab("PRECISO_RESPONDER")}
                  className={`px-2.5 py-1.5 rounded-xl font-bold cursor-pointer shrink-0 transition-colors flex items-center gap-1 min-h-[32px] ${
                    activeQueueTab === "PRECISO_RESPONDER"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]"
                  }`}
                >
                  <span>Preciso responder</span>
                  <span className="text-[10px] opacity-80">
                    ({(queueCounts as Record<ProQueue, number>).PRECISO_RESPONDER || 0})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQueueTab("AGUARDANDO_ALUNO")}
                  className={`px-2.5 py-1.5 rounded-xl font-bold cursor-pointer shrink-0 transition-colors flex items-center gap-1 min-h-[32px] ${
                    activeQueueTab === "AGUARDANDO_ALUNO"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]"
                  }`}
                >
                  <span>Aguardando aluno</span>
                  <span className="text-[10px] opacity-80">
                    ({(queueCounts as Record<ProQueue, number>).AGUARDANDO_ALUNO || 0})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQueueTab("SOLICITACOES_RECEBIDAS")}
                  className={`px-2.5 py-1.5 rounded-xl font-bold cursor-pointer shrink-0 transition-colors flex items-center gap-1 min-h-[32px] ${
                    activeQueueTab === "SOLICITACOES_RECEBIDAS"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]"
                  }`}
                >
                  <span>Solicitações</span>
                  <span className="text-[10px] opacity-80">
                    ({(queueCounts as Record<ProQueue, number>).SOLICITACOES_RECEBIDAS || 0})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQueueTab("CONCLUIDOS")}
                  className={`px-2.5 py-1.5 rounded-xl font-bold cursor-pointer shrink-0 transition-colors flex items-center gap-1 min-h-[32px] ${
                    activeQueueTab === "CONCLUIDOS"
                      ? "bg-zinc-700 text-white shadow-xs"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]"
                  }`}
                >
                  <span>Concluídos</span>
                  <span className="text-[10px] opacity-80">
                    ({(queueCounts as Record<ProQueue, number>).CONCLUIDOS || 0})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQueueTab("ALL")}
                  className={`px-2.5 py-1.5 rounded-xl font-bold cursor-pointer shrink-0 transition-colors min-h-[32px] ${
                    activeQueueTab === "ALL"
                      ? "bg-emerald-800 text-white"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]"
                  }`}
                >
                  Todos ({consultations.length})
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActiveQueueTab("EM_ATENDIMENTO")}
                  className={`px-2.5 py-1.5 rounded-xl font-bold cursor-pointer shrink-0 transition-colors flex items-center gap-1 min-h-[32px] ${
                    activeQueueTab === "EM_ATENDIMENTO"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]"
                  }`}
                >
                  <span>Em atendimento</span>
                  <span className="text-[10px] opacity-80">
                    ({(queueCounts as Record<StudentQueue, number>).EM_ATENDIMENTO || 0})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQueueTab("SOLICITACOES")}
                  className={`px-2.5 py-1.5 rounded-xl font-bold cursor-pointer shrink-0 transition-colors flex items-center gap-1 min-h-[32px] ${
                    activeQueueTab === "SOLICITACOES"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]"
                  }`}
                >
                  <span>Solicitações</span>
                  <span className="text-[10px] opacity-80">
                    ({(queueCounts as Record<StudentQueue, number>).SOLICITACOES || 0})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQueueTab("CONCLUIDAS")}
                  className={`px-2.5 py-1.5 rounded-xl font-bold cursor-pointer shrink-0 transition-colors flex items-center gap-1 min-h-[32px] ${
                    activeQueueTab === "CONCLUIDAS"
                      ? "bg-zinc-700 text-white shadow-xs"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]"
                  }`}
                >
                  <span>Concluídas</span>
                  <span className="text-[10px] opacity-80">
                    ({(queueCounts as Record<StudentQueue, number>).CONCLUIDAS || 0})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQueueTab("ALL")}
                  className={`px-2.5 py-1.5 rounded-xl font-bold cursor-pointer shrink-0 transition-colors min-h-[32px] ${
                    activeQueueTab === "ALL"
                      ? "bg-emerald-800 text-white"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]"
                  }`}
                >
                  Todos ({consultations.length})
                </button>
              </>
            )}
          </div>
        </div>

        {/* List Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
          {filteredConsultations.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--text-tertiary)] space-y-2">
              <p>Nenhum atendimento nesta fila.</p>
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(true)}
                className="text-emerald-600 hover:underline font-semibold cursor-pointer"
              >
                + Iniciar atendimento
              </button>
            </div>
          ) : (
            filteredConsultations.map((c) => {
              const isSelected = c.publicId === selectedChatPublicId;
              const displayName = isProfessional ? c.studentName : c.professionalName;
              const unreadCount = isProfessional ? c.unreadCountProfessional : c.unreadCountStudent;
              const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.CONFIRMED;
              const isVideo = c.modality === "VIDEO";

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
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center shrink-0 shadow-xs ${
                    isVideo ? "bg-purple-600 text-white" : "bg-emerald-600 text-white"
                  }`}>
                    {isVideo ? "📹" : displayName.charAt(0).toUpperCase()}
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
                      {isVideo
                        ? `📹 Consulta em vídeo (${c.proposedStartFormatted || "Histórico"})`
                        : c.lastMessagePreview ||
                          (c.status === "PROPOSED" ? "Proposta de agendamento pendente" : "Nenhuma mensagem ainda")}
                    </p>

                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isVideo ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                            📹 Vídeo (Histórico)
                          </span>
                        ) : (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusCfg.badgeClass}`}
                          >
                            {statusCfg.label}
                          </span>
                        )}

                        {c.expectedResponseHours && !isVideo && (
                          <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]">
                            ⏱️ {c.expectedResponseHours}h
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
      {/* MIDDLE PANE: Active Chat Conversation or Historical Video Viewer     */}
      {/* -------------------------------------------------------------------- */}
      <div
        className={`flex-1 flex flex-col bg-[var(--surface)] min-w-0 overflow-hidden ${
          mobileScreen === "LIST" ? "hidden md:flex" : "flex"
        }`}
      >
        {activeChat ? (
          activeChat.modality === "VIDEO" ? (
            /* -------------------------------------------------------------- */
            /* HISTORICAL VIDEO CONSULTATION VIEWER                           */
            /* -------------------------------------------------------------- */
            <div className="flex-1 flex flex-col overflow-y-auto">
              <div className="p-3 sm:p-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 bg-[var(--surface)]">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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

                  <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    📹
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                      {isProfessional ? activeChat.studentName : activeChat.professionalName}
                    </h3>
                    <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                      Consulta por Vídeo • Histórico Preservado
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                  📹 Vídeo Realizado
                </span>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-3xl">
                  📹
                </div>
                <div>
                  <h4 className="text-base font-bold text-[var(--text-primary)] mb-1">
                    Consulta por Vídeo do Formato Anterior
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Esta consulta foi realizada no formato anterior e todos os seus registros de histórico, participantes e datas foram preservados.
                  </p>
                </div>

                <div className="w-full p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-left space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                    <span className="text-[var(--text-tertiary)]">Participante:</span>
                    <strong className="text-[var(--text-primary)]">{isProfessional ? activeChat.studentName : activeChat.professionalName}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                    <span className="text-[var(--text-tertiary)]">Data de realização:</span>
                    <span className="text-[var(--text-primary)] font-semibold">{activeChat.proposedStartFormatted || "Data arquivada"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--text-tertiary)]">Status:</span>
                    <span className="text-emerald-600 font-bold">Concluída / Histórico arquivado</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed text-left">
                  💬 <strong>Novo Trevo Chat:</strong> Todas as novas consultas agora acontecem de forma assíncrona, contínua e sem necessidade de chamadas de vídeo em tempo real, com prontuário clínico e inteligência artificial.
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsNewChatModalOpen(true);
                    setProposalTopic(`Continuação de atendimento com ${isProfessional ? activeChat.studentName : activeChat.professionalName}`);
                  }}
                  className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs active:scale-95 cursor-pointer"
                >
                  + Iniciar Atendimento no Trevo Chat
                </button>
              </div>
            </div>
          ) : (
            /* -------------------------------------------------------------- */
            /* ACTIVE TREVO CHAT CONVERSATION                                 */
            /* -------------------------------------------------------------- */
            <>
              {/* Header */}
              <div className="p-3 sm:p-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 bg-[var(--surface)]">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                        {isProfessional ? activeChat.studentName : activeChat.professionalName}
                      </h3>
                      {activeChat.expectedResponseHours && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                          ⏱️ Responde em até {activeChat.expectedResponseHours}h
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                      {isProfessional
                        ? activeChat.studentEmail
                        : activeChat.professionalType === "PERSONAL"
                        ? "Personal Trainer"
                        : "Nutricionista"}
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
                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs active:scale-95"
                    >
                      <span>✓ Finalizar Atendimento</span>
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
                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs active:scale-95"
                    >
                      <span>🔄 Solicitar Retorno</span>
                    </button>
                  )}

                  {/* Status Dropdown/Badge */}
                  {isProfessional && (activeChat.status === "CONFIRMED" || activeChat.status === "COMPLETED") ? (
                    <select
                      value={activeChat.status}
                      onChange={(e) => handleStatusChange(e.target.value as ChatConsultationStatus)}
                      aria-label="Status do atendimento"
                      className="text-xs px-2.5 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold cursor-pointer focus:outline-none min-h-[36px]"
                    >
                      <option value="CONFIRMED">Em andamento</option>
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
                  )}

                  {/* AI Anamnesis / Prontuário Drawer Toggle */}
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
                    <span>🤖</span>
                    <span className="hidden sm:inline">Prontuário & IA</span>
                  </button>
                </div>
              </div>

              {/* Bilateral Proposal Banners */}
              {activeChat.status === "PROPOSED" && (
                !isProposer ? (
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
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-active)] text-[var(--text-primary)] text-xs font-semibold border border-[var(--border-default)] cursor-pointer transition-colors"
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
                  hasMoreOlderMessages={hasMoreOlderMessages}
                  isLoadingOlderMessages={isLoadingOlderMessages}
                  onLoadOlderMessages={handleLoadOlderMessages}
                />
              )}

              {/* Non-blocking error notification if sending fails */}
              {sendErrorNotice && (
                <div className="mx-4 my-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-2 shadow-2xs">
                  <span>⚠️ {sendErrorNotice} (seu rascunho de mensagem foi preservado)</span>
                  <button
                    type="button"
                    onClick={() => setSendErrorNotice(null)}
                    className="text-xs font-bold px-2 py-0.5 rounded hover:bg-rose-500/20 cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {/* Chat Input Bar */}
              <ChatInputBar
                onSendMessage={handleSendMessage}
                isSending={isSending}
                disabled={!isMessagingUnlocked || (isCompleted && !isProfessional)}
                disabledMessage={
                  !isMessagingUnlocked
                    ? "Aguardando confirmação bilateral do agendamento para liberar as mensagens."
                    : isCompleted
                    ? "Este atendimento foi concluído. Utilize o botão acima para solicitar retorno."
                    : undefined
                }
                isProfessional={isProfessional}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
              />
            </>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[var(--text-tertiary)]">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3 text-3xl">
              💬
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
              Selecione um atendimento
            </h3>
            <p className="text-xs max-w-sm">
              Escolha uma conversa na fila ao lado ou inicie um novo atendimento assíncrono.
            </p>
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
                  Novo Atendimento no Trevo Chat
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Defina o participante, data de referência e expectativa de resposta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-black/10 text-[var(--text-secondary)] cursor-pointer"
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
              {/* Participant Selection */}
              {isProfessional ? (
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
              ) : activeProfessionals.length > 1 ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">
                    Profissional
                  </label>
                  <select
                    value={selectedProfessionalForProposal?.membershipId || ""}
                    onChange={(e) => {
                      const found = activeProfessionals.find((p) => p.membershipId === Number(e.target.value));
                      setSelectedProfessionalForProposal(found || null);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Selecione o profissional...</option>
                    {activeProfessionals.map((p) => (
                      <option key={p.membershipId} value={p.membershipId}>
                        {p.name} ({p.role === "PERSONAL" ? "Personal Trainer" : "Nutricionista"})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

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

              {/* Expected Response Time */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Expectativa de resposta
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[12, 24, 48].map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => setProposalExpectedHours(hours)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        proposalExpectedHours === hours
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--surface-active)]"
                      }`}
                    >
                      Até {hours}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic / Focus */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Foco do atendimento (opcional)
                </label>
                <input
                  type="text"
                  value={proposalTopic}
                  onChange={(e) => setProposalTopic(e.target.value)}
                  placeholder="Ex: Alinhamento de metas, dúvidas sobre treino/dieta..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Initial Message */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Mensagem inicial (opcional)
                </label>
                <textarea
                  rows={2}
                  value={proposalInitialMessage}
                  onChange={(e) => setProposalInitialMessage(e.target.value)}
                  placeholder="Envie uma mensagem inicial para contextualizar..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                ℹ️ O agendamento entra na agenda de ambos e a troca de mensagens assíncronas é liberada após a confirmação mútua.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProposal}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
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
                  className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCounter}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
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
                  className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDecline}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSubmittingDecline ? "Recusando..." : "Confirmar recusa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 4: Closure Modal ("Finalizar Consulta")                         */}
      {/* -------------------------------------------------------------------- */}
      {isClosureModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
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
                className="p-1.5 rounded-lg hover:bg-black/10 text-[var(--text-secondary)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {closureError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {closureError}
              </div>
            )}

            <form onSubmit={handleSubmitClosure} className="space-y-4">
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
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none"
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
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none"
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
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none"
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
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
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
              <div className="space-y-1 pt-1 border-t border-[var(--border-subtle)]">
                <label className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center justify-between">
                  <span>🔒 Notas privadas do profissional</span>
                  <span className="text-[10px] font-semibold">Exclusivo do prontuário (nunca exposto ao aluno)</span>
                </label>
                <textarea
                  rows={2}
                  value={closurePrivateNotes}
                  onChange={(e) => setClosurePrivateNotes(e.target.value)}
                  placeholder="Anotações clínicas confidenciais, hipóteses diagnósticas ou pontos de atenção para o próximo retorno..."
                  className="w-full px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/25 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
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
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSubmittingClosure ? "Finalizando..." : "Confirmar Encerramento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 5: Return Consultation Modal ("Solicitar Retorno")               */}
      {/* -------------------------------------------------------------------- */}
      {isReturnModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>🔄 Solicitar Consulta de Retorno</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Vinculada ao histórico do atendimento anterior.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="p-1 rounded-lg hover:bg-black/10 text-[var(--text-secondary)] cursor-pointer"
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
                    onChange={(e) => setReturnDate(e.target.value)}
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
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
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
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
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
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReturn}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSubmittingReturn ? "Enviando..." : "Confirmar retorno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
