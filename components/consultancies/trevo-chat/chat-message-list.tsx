"use client";

import React, { useRef, useState, useLayoutEffect } from "react";
import Link from "next/link";
import type { ChatMessageDto, ChatConsultationStatus } from "@/lib/consultancies/trevo-chat";
import { ChatAudioPlayer } from "./chat-audio-player";

interface ChatMessageListProps {
  messages: ChatMessageDto[];
  currentUserId: number;
  consultancySlug: string;
  onReplyMessage?: (msg: ChatMessageDto) => void;
  isProfessional?: boolean;
  professionalType?: "PERSONAL" | "NUTRITIONIST";
  consultationStatus?: ChatConsultationStatus;
  closedAt?: string | null;
  hasMoreOlderMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  onLoadOlderMessages?: () => void;
}

export function ChatMessageList({
  messages,
  currentUserId,
  consultancySlug,
  onReplyMessage,
  professionalType = "PERSONAL",
  consultationStatus,
  closedAt,
  hasMoreOlderMessages = false,
  isLoadingOlderMessages = false,
  onLoadOlderMessages,
}: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const isNearBottomRef = useRef(true);

  // Monitor scroll position for anchoring
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;
  };

  // Scroll to bottom smoothly only if user was already near bottom
  useLayoutEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const scrollToMessage = (msgId: number) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(msgId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const formatDateLabel = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return "Hoje";
      }
      if (date.toDateString() === yesterday.toDateString()) {
        return "Ontem";
      }

      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4"
    >
      {hasMoreOlderMessages && (
        <div className="text-center py-1">
          <button
            type="button"
            disabled={isLoadingOlderMessages}
            onClick={onLoadOlderMessages}
            className="px-3 py-1.5 rounded-full bg-[var(--surface-subtle)] hover:bg-[var(--surface-active)] text-xs text-[var(--text-secondary)] font-semibold border border-[var(--border-subtle)] cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center gap-1 shadow-2xs"
          >
            {isLoadingOlderMessages ? (
              <>
                <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Carregando anteriores...</span>
              </>
            ) : (
              <span>↑ Carregar mensagens anteriores</span>
            )}
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--text-tertiary)] max-w-md mx-auto">
          {consultationStatus === "COMPLETED" || Boolean(closedAt) ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 flex items-center justify-center mb-3 shadow-xs">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                Atendimento encerrado sem mensagens
              </h4>
              <p className="text-xs max-w-sm text-[var(--text-secondary)] leading-relaxed">
                Este atendimento foi concluído diretamente sem troca de mensagens no chat. O histórico clínico e o registro de encerramento permanecem arquivados com segurança.
              </p>
            </>
          ) : consultationStatus === "PROPOSED" ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 shadow-xs">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                Aguardando confirmação do agendamento
              </h4>
              <p className="text-xs max-w-sm text-[var(--text-secondary)] leading-relaxed">
                Assim que a proposta for confirmada por ambas as partes, o canal de mensagens será liberado para o início do atendimento.
              </p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 shadow-xs">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                Início do Atendimento no Trevo Chat
              </h4>
              <p className="text-xs max-w-sm text-[var(--text-secondary)] leading-relaxed">
                {professionalType === "PERSONAL"
                  ? "Envie dúvidas, orientações, vídeos de execução e arquivos. O histórico deste atendimento é mantido com segurança para o seu acompanhamento físico e de treino."
                  : professionalType === "NUTRITIONIST"
                  ? "Envie dúvidas, orientações, fotos de refeições e exames. O histórico deste atendimento é mantido com segurança para o seu acompanhamento nutricional."
                  : "Envie dúvidas, orientações, áudios e arquivos. As informações compartilhadas contam com histórico seguro para o seu acompanhamento especializado."}
              </p>
            </>
          )}
        </div>
      ) : (
        messages.map((msg, idx) => {
          const isSender = Number(msg.senderUserId) === Number(currentUserId);
          const showDateHeader =
            idx === 0 ||
            formatDateLabel(messages[idx - 1].createdAt) !== formatDateLabel(msg.createdAt);

          const attachmentApiUrl = msg.attachmentUrl
            ? `/api/consultancies/${consultancySlug}/chat/attachments/${msg.publicId}`
            : null;

          const isHighlighted = highlightedMessageId === msg.id;

          return (
            <React.Fragment key={msg.publicId || idx}>
              {showDateHeader && (
                <div className="flex items-center justify-center my-4">
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] shadow-xs">
                    {formatDateLabel(msg.createdAt)}
                  </span>
                </div>
              )}

              <div
                id={`msg-${msg.id}`}
                className={`group flex flex-col ${isSender ? "items-end" : "items-start"} transition-all duration-300 ${
                  isHighlighted ? "scale-[1.02]" : ""
                }`}
              >
                {/* Bubble Container */}
                <div
                  className={`relative max-w-[88%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-xs transition-all ${
                    isSender
                      ? "bg-emerald-600 text-white rounded-br-xs"
                      : "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-bl-xs"
                  } ${isHighlighted ? "ring-2 ring-emerald-400" : ""}`}
                >
                  {/* Sender Name (when received) */}
                  {!isSender && (
                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center justify-between gap-2">
                      <span>
                        {msg.senderName}
                        <span className="ml-1 text-[10px] font-normal opacity-70">
                          ({msg.senderRole})
                        </span>
                      </span>
                    </p>
                  )}

                  {/* Quoted / Replied message snippet */}
                  {msg.replyToSnippet && (
                    <div
                      onClick={() => msg.replyToMessageId && scrollToMessage(msg.replyToMessageId)}
                      className={`mb-2 p-2 rounded-xl border-l-4 text-xs cursor-pointer select-none transition-opacity hover:opacity-90 ${
                        isSender
                          ? "bg-emerald-700/60 border-emerald-300 text-emerald-50"
                          : "bg-[var(--surface-subtle)] border-emerald-600 text-[var(--text-secondary)]"
                      }`}
                    >
                      <span className="font-bold block text-[10px] opacity-80">
                        Respondendo a {msg.replyToSnippet.senderName}
                      </span>
                      <p className="truncate line-clamp-1 italic text-[11px]">
                        {msg.replyToSnippet.content || "Anexo compartilhado"}
                      </p>
                    </div>
                  )}

                  {/* Attachment Media */}
                  {msg.messageType === "IMAGE" && attachmentApiUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden cursor-pointer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attachmentApiUrl}
                        alt={msg.attachmentName || "Foto"}
                        onClick={() => setSelectedImage(attachmentApiUrl)}
                        className="max-h-64 sm:max-h-80 w-auto rounded-lg object-cover hover:opacity-95 transition-opacity"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {msg.messageType === "VIDEO" && attachmentApiUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden">
                      <video
                        src={attachmentApiUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="max-h-64 sm:max-h-80 w-full rounded-lg bg-black"
                      />
                    </div>
                  )}

                  {msg.messageType === "AUDIO" && attachmentApiUrl && (
                    <div className="mb-1">
                      <ChatAudioPlayer
                        src={attachmentApiUrl}
                        durationSeconds={msg.audioDurationSeconds}
                        isSender={isSender}
                      />
                    </div>
                  )}

                  {msg.messageType === "DOCUMENT" && attachmentApiUrl && (
                    <a
                      href={attachmentApiUrl}
                      download={msg.attachmentName || "documento.pdf"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mb-2 p-2.5 rounded-xl flex items-center gap-2.5 text-xs font-semibold hover:opacity-90 transition-opacity ${
                        isSender
                          ? "bg-emerald-700/60 text-white"
                          : "bg-[var(--surface-subtle)] text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate flex-1">{msg.attachmentName || "Documento PDF"}</span>
                      {msg.attachmentSizeBytes && (
                        <span className="text-[10px] opacity-75 shrink-0">
                          {(msg.attachmentSizeBytes / 1024).toFixed(0)} KB
                        </span>
                      )}
                    </a>
                  )}

                  {/* STRUCTURED CARD: Formulário / Anamnese */}
                  {msg.messageType === "FORM_REQUEST" && (
                    <div className={`mb-2 p-3 rounded-xl border space-y-2 text-xs ${
                      isSender ? "bg-emerald-700/50 border-emerald-400/40 text-white" : "bg-purple-500/10 border-purple-500/20 text-[var(--text-primary)]"
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span>Solicitação de Formulário</span>
                      </div>
                      <p className="text-[11px] opacity-90">
                        {String(msg.payloadJson?.title || "Por favor, responda ao questionário clínico anexado.")}
                      </p>
                      <Link
                        href={
                          msg.payloadJson?.formRequestPublicId
                            ? `/consultoria/${consultancySlug}/formularios/${msg.payloadJson.formRequestPublicId}`
                            : `/consultoria/${consultancySlug}/formularios`
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors shadow-xs"
                      >
                        <span>Preencher Formulário</span>
                        <span>→</span>
                      </Link>
                    </div>
                  )}

                  {/* STRUCTURED CARD: Fotos de Evolução */}
                  {msg.messageType === "PHOTO_REQUEST" && (
                    <div className={`mb-2 p-3 rounded-xl border space-y-2 text-xs ${
                      isSender ? "bg-emerald-700/50 border-emerald-400/40 text-white" : "bg-blue-500/10 border-blue-500/20 text-[var(--text-primary)]"
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <svg className="w-4 h-4 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Solicitação de Fotos de Evolução</span>
                      </div>
                      <p className="text-[11px] opacity-90">
                        {String(msg.payloadJson?.instructions || "Envie suas fotos de evolução (frente, costas e perfil) para acompanhamento.")}
                      </p>
                      <Link
                        href={`/consultoria/${consultancySlug}/progresso`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-colors shadow-xs"
                      >
                        <span>Enviar Fotos</span>
                        <span>→</span>
                      </Link>
                    </div>
                  )}

                  {/* STRUCTURED CARD: Solicitação de Documentos / Exames */}
                  {msg.messageType === "DOCUMENT_REQUEST" && (
                    <div className={`mb-2 p-3 rounded-xl border space-y-2 text-xs ${
                      isSender ? "bg-emerald-700/50 border-emerald-400/40 text-white" : "bg-amber-500/10 border-amber-500/20 text-[var(--text-primary)]"
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Solicitação de Exames e Documentos</span>
                      </div>
                      <p className="text-[11px] opacity-90">
                        {String(msg.payloadJson?.instructions || "Anexe seus exames laboratoriais ou atestados clínicos diretamente no chat.")}
                      </p>
                    </div>
                  )}

                  {/* STRUCTURED CARD: Orientação Clínica Destacada */}
                  {msg.messageType === "CLINICAL_GUIDANCE" && (
                    <div className={`mb-2 p-3 rounded-xl border space-y-1.5 text-xs ${
                      isSender ? "bg-emerald-700/50 border-emerald-400/40 text-white" : "bg-emerald-500/10 border-emerald-500/20 text-[var(--text-primary)]"
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400">
                        <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span>Orientação Especializada</span>
                      </div>
                      <p className="text-xs whitespace-pre-wrap leading-relaxed">
                        {msg.content || String(msg.payloadJson?.guidance || "")}
                      </p>
                    </div>
                  )}

                  {/* STRUCTURED CARD: Treino Atribuído */}
                  {msg.messageType === "WORKOUT_CARD" && (
                    <div className={`mb-2 p-3 rounded-xl border space-y-2 text-xs ${
                      isSender ? "bg-emerald-700/50 border-emerald-400/40 text-white" : "bg-amber-500/10 border-amber-500/20 text-[var(--text-primary)]"
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                        <span>Treino Prescrito</span>
                      </div>
                      <p className="text-xs font-semibold">
                        {String(msg.payloadJson?.workoutTitle || "Ficha de treino atualizada")}
                      </p>
                      <Link
                        href={
                          msg.payloadJson?.assignmentPublicId
                            ? `/consultoria/${consultancySlug}/treinos/${msg.payloadJson.assignmentPublicId}`
                            : `/consultoria/${consultancySlug}/treinos`
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors shadow-xs"
                      >
                        <span>Abrir Meu Treino</span>
                        <span>→</span>
                      </Link>
                    </div>
                  )}

                  {/* STRUCTURED CARD: Plano Alimentar Atribuído */}
                  {msg.messageType === "MEAL_PLAN_CARD" && (
                    <div className={`mb-2 p-3 rounded-xl border space-y-2 text-xs ${
                      isSender ? "bg-emerald-700/50 border-emerald-400/40 text-white" : "bg-emerald-500/10 border-emerald-500/20 text-[var(--text-primary)]"
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <svg className="w-4 h-4 text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                        <span>Plano Alimentar Prescrito</span>
                      </div>
                      <p className="text-xs font-semibold">
                        {String(msg.payloadJson?.planTitle || "Plano nutricional atualizado")}
                      </p>
                      <Link
                        href={
                          msg.payloadJson?.planPublicId
                            ? `/consultoria/${consultancySlug}/planos-v2/${msg.payloadJson.planPublicId}`
                            : `/consultoria/${consultancySlug}/nutricao`
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors shadow-xs"
                      >
                        <span>Abrir Meu Plano</span>
                        <span>→</span>
                      </Link>
                    </div>
                  )}

                  {/* STRUCTURED CARD: Resumo de Encerramento (CLOSURE_CARD) */}
                  {msg.messageType === "CLOSURE_CARD" && (
                    <div className={`mb-2 p-3.5 rounded-2xl border space-y-2.5 text-xs ${
                      isSender ? "bg-emerald-800/80 border-emerald-400/40 text-white" : "bg-[var(--surface-subtle)] border-emerald-500/30 text-[var(--text-primary)] shadow-sm"
                    }`}>
                      <div className="flex items-center justify-between gap-2 border-b border-emerald-500/20 pb-2">
                        <span className="font-bold flex items-center gap-1.5 text-xs">
                          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Consulta Finalizada</span>
                        </span>
                        {Boolean(msg.payloadJson?.returnPredictionDays) && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                            Retorno em {String(msg.payloadJson?.returnPredictionDays)} dias
                          </span>
                        )}
                      </div>

                      {Boolean(msg.payloadJson?.summary) && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 block mb-0.5">
                            Resumo Clínico:
                          </span>
                          <p className="text-xs leading-relaxed">
                            {String(msg.payloadJson?.summary)}
                          </p>
                        </div>
                      )}

                      {Array.isArray(msg.payloadJson?.orientations) && msg.payloadJson.orientations.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 block mb-0.5">
                            Orientações Finais:
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-xs">
                            {msg.payloadJson.orientations.map((o: unknown, oi: number) => (
                              <li key={oi}>{String(o)}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {Array.isArray(msg.payloadJson?.prescriptions) && msg.payloadJson.prescriptions.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 block mb-0.5">
                            Prescrições & Condutas:
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-xs">
                            {msg.payloadJson.prescriptions.map((p: unknown, pi: number) => (
                              <li key={pi}>{String(p)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Standard Text Content (when not just a structured card) */}
                  {msg.content && msg.messageType !== "CLINICAL_GUIDANCE" && (
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {msg.content}
                    </p>
                  )}

                  {/* Message Footer: Time, Reply Button & Delivery Status */}
                  <div
                    className={`flex items-center justify-end gap-1.5 text-[10px] mt-1 select-none ${
                      isSender ? "text-emerald-100" : "text-[var(--text-tertiary)]"
                    }`}
                  >
                    <span>{formatTime(msg.createdAt)}</span>

                    {/* Delivery checkmarks */}
                    {isSender && (
                      <span title={msg.readAt ? "Lida pelo destinatário" : "Entregue"}>
                        {msg.deliveryStatus === "sending" ? (
                          <svg className="w-3 h-3 text-emerald-200/70 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="9" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                          </svg>
                        ) : msg.readAt ? (
                          <span className="text-emerald-200 font-black">✓✓</span>
                        ) : (
                          <span className="opacity-75">✓</span>
                        )}
                      </span>
                    )}

                    {/* Reply button on hover/tap */}
                    {onReplyMessage && (
                      <button
                        type="button"
                        onClick={() => onReplyMessage(msg)}
                        title="Responder a esta mensagem"
                        className={`ml-1 p-0.5 rounded-sm hover:underline cursor-pointer opacity-75 hover:opacity-100 ${
                          isSender ? "text-emerald-100" : "text-[var(--text-secondary)]"
                        }`}
                      >
                        ↩
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })
      )}
      <div ref={bottomRef} />

      {/* Fullscreen Image Zoom Modal */}
      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt="Visualização da Imagem"
              className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black cursor-pointer shadow-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
