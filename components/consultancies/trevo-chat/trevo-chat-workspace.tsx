"use client";

import React, { useState, useEffect, useTransition } from "react";
import type {
  ChatConsultationDto,
  ChatMessageDto,
  ChatConsultationStatus,
} from "@/lib/consultancies/trevo-chat";
import { ChatMessageList } from "./chat-message-list";
import { ChatInputBar } from "./chat-input-bar";
import { AIAnamnesisPanel } from "./ai-anamnesis-panel";
import {
  sendChatMessageAction,
  markChatReadAction,
  updateChatStatusAction,
  startOrOpenChatAction,
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
  consultations,
  initialActivePublicId,
  activeStudents = [],
}: TrevoChatWorkspaceProps) {
  const [, startTransition] = useTransition();

  // Active consultation state
  const [selectedChatPublicId, setSelectedChatPublicId] = useState<string | null>(
    initialActivePublicId || (consultations.length > 0 ? consultations[0].publicId : null)
  );

  // Mobile navigation screen: "LIST" vs "CHAT"
  const [mobileScreen, setMobileScreen] = useState<"LIST" | "CHAT">(
    initialActivePublicId ? "CHAT" : "LIST"
  );

  // Mobile AI drawer open state
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  // New Chat modal state (for professional)
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");

  // Search filter for conversation list
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ChatConsultationStatus>("ALL");

  // Local messages state for active chat
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(
    Boolean(initialActivePublicId || consultations.length > 0)
  );
  const [isSending, setIsSending] = useState(false);

  // Current active consultation object
  const activeChat = consultations.find((c) => c.publicId === selectedChatPublicId) || null;

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

  // Status switcher
  const handleStatusChange = (newStatus: ChatConsultationStatus) => {
    if (!selectedChatPublicId || !isProfessional) return;
    startTransition(async () => {
      await updateChatStatusAction(consultancySlug, selectedChatPublicId, newStatus);
    });
  };

  // Start chat with student
  const handleStartChatWithStudent = async (studentMembershipId: number) => {
    const res = await startOrOpenChatAction(consultancySlug, studentMembershipId, professionalType);
    if (res.ok && res.data) {
      const chat = res.data as ChatConsultationDto;
      setSelectedChatPublicId(chat.publicId);
      setIsNewChatModalOpen(false);
      setMobileScreen("CHAT");
    } else {
      alert(res.error || "Erro ao abrir atendimento.");
    }
  };

  // Filtered consultations
  const filteredConsultations = consultations.filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
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
    AWAITING_STUDENT: {
      label: "Aguardando aluno",
      badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    AWAITING_PROFESSIONAL: {
      label: "Aguardando profissional",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    COMPLETED: {
      label: "Concluída",
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
  };

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
                onClick={() => setIsNewChatModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <span>+ Novo</span>
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
              onClick={() => setStatusFilter("AWAITING_PROFESSIONAL")}
              className={`px-2.5 py-1 rounded-full font-semibold cursor-pointer shrink-0 transition-colors ${
                statusFilter === "AWAITING_PROFESSIONAL"
                  ? "bg-amber-600 text-white"
                  : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]"
              }`}
            >
              Pendentes
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("COMPLETED")}
              className={`px-2.5 py-1 rounded-full font-semibold cursor-pointer shrink-0 transition-colors ${
                statusFilter === "COMPLETED"
                  ? "bg-emerald-600 text-white"
                  : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]"
              }`}
            >
              Concluídas
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
                  Iniciar com um aluno
                </button>
              )}
            </div>
          ) : (
            filteredConsultations.map((c) => {
              const isSelected = c.publicId === selectedChatPublicId;
              const displayName = isProfessional ? c.studentName : c.professionalName;
              const unreadCount = isProfessional ? c.unreadCountProfessional : c.unreadCountStudent;
              const statusCfg = STATUS_CONFIG[c.status];

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
                      {c.lastMessagePreview || "Nenhuma mensagem ainda"}
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
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={handleBackToList}
                  aria-label="Voltar para atendimentos"
                  className="md:hidden p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
                  <select
                    value={activeChat.status}
                    onChange={(e) => handleStatusChange(e.target.value as ChatConsultationStatus)}
                    aria-label="Status do atendimento"
                    className="text-xs px-2.5 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold cursor-pointer focus:outline-none"
                  >
                    <option value="AWAITING_STUDENT">Aguardando aluno</option>
                    <option value="AWAITING_PROFESSIONAL">Aguardando profissional</option>
                    <option value="COMPLETED">Concluída</option>
                  </select>
                ) : (
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      STATUS_CONFIG[activeChat.status].badgeClass
                    }`}
                  >
                    {STATUS_CONFIG[activeChat.status].label}
                  </span>
                )}

                {/* Mobile / Responsive AI Anamnesis Toggle Button */}
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
              disabled={activeChat.status === "COMPLETED" && !isProfessional}
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
              Escolha uma conversa na lista ao lado ou inicie um novo atendimento para conversar e organizar a anamnese com a IA.
            </p>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* RIGHT PANE: AI Anamnesis Proposal (Visible on desktop or when drawer open) */}
      {/* -------------------------------------------------------------------- */}
      {activeChat && (
        <div
          className={`w-full md:w-80 lg:w-96 shrink-0 transition-all ${
            isAiDrawerOpen ? "fixed md:relative inset-0 md:inset-auto z-40 md:z-auto flex" : "hidden lg:flex"
          }`}
        >
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
      {/* MODAL: New Chat with Student (for Professional) */}
      {/* -------------------------------------------------------------------- */}
      {isNewChatModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Iniciar Atendimento no Trevo Chat
              </h3>
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1 rounded-lg hover:bg-black/10 text-[var(--text-secondary)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Selecione um dos alunos ativos da consultoria para abrir a conversa assíncrona:
            </p>

            <input
              type="text"
              value={newChatSearch}
              onChange={(e) => setNewChatSearch(e.target.value)}
              placeholder="Filtrar aluno por nome ou e-mail..."
              className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
            />

            <div className="max-h-64 overflow-y-auto divide-y divide-[var(--border-subtle)]">
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
                    onClick={() => handleStartChatWithStudent(student.membershipId)}
                    className="w-full py-2.5 px-3 text-left hover:bg-[var(--surface-subtle)] flex items-center justify-between gap-2 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {student.name}
                      </p>
                      <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                        {student.email}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 shrink-0">
                      Iniciar →
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
