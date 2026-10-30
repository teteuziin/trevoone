"use client";

import React, { useRef, useState, useLayoutEffect } from "react";
import Link from "next/link";
import type { ChatMessageDto } from "@/lib/consultancies/trevo-chat";
import { ChatAudioPlayer } from "./chat-audio-player";

interface ChatMessageListProps {
  messages: ChatMessageDto[];
  currentUserId: number;
  consultancySlug: string;
  onReplyMessage?: (msg: ChatMessageDto) => void;
  isProfessional?: boolean;
  hasMoreOlderMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  onLoadOlderMessages?: () => void;
}

export function ChatMessageList({
  messages,
  currentUserId,
  consultancySlug,
  onReplyMessage,
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
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--text-tertiary)]">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3 shadow-xs">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">
            Início do Atendimento no Trevo Chat
          </h4>
          <p className="text-xs max-w-sm text-[var(--text-secondary)]">
            Envie dúvidas, orientações, áudios e arquivos. As informações clínicas trocadas aqui serão mantidas com histórico auditado e ferramentas de apoio médico e nutricional.
          </p>
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
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <span>📋 Solicitação de Formulário</span>
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
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <span>📸 Solicitação de Fotos de Evolução</span>
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
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <span>📄 Solicitação de Exames e Documentos</span>
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
                      <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
                        <span>💡 Orientação Clínica do Profissional</span>
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
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <span>🏋️ Treino Prescrito</span>
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
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <span>🥗 Plano Alimentar Prescrito</span>
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
                          <span>🏁 Consulta Finalizada</span>
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
                          <span className="opacity-60 text-[10px]">🕒</span>
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
