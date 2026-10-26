"use client";

import React, { useRef, useEffect, useState } from "react";
import type { ChatMessageDto } from "@/lib/consultancies/trevo-chat";
import { ChatAudioPlayer } from "./chat-audio-player";

interface ChatMessageListProps {
  messages: ChatMessageDto[];
  currentUserId: number;
  consultancySlug: string;
}

export function ChatMessageList({
  messages,
  currentUserId,
  consultancySlug,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--text-tertiary)]">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">
            Início do Atendimento no Trevo Chat
          </h4>
          <p className="text-xs max-w-sm">
            Envie dúvidas, orientações, áudios e arquivos. As informações clínicas trocadas aqui serão organizadas automaticamente pela IA.
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

          return (
            <React.Fragment key={msg.publicId}>
              {showDateHeader && (
                <div className="flex items-center justify-center my-4">
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] shadow-xs">
                    {formatDateLabel(msg.createdAt)}
                  </span>
                </div>
              )}

              <div className={`flex flex-col ${isSender ? "items-end" : "items-start"}`}>
                {/* Bubble Container */}
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 shadow-xs transition-shadow ${
                    isSender
                      ? "bg-emerald-600 text-white rounded-br-xs"
                      : "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-bl-xs"
                  }`}
                >
                  {/* Sender Name (when received) */}
                  {!isSender && (
                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                      {msg.senderName}
                      <span className="ml-1 text-[10px] font-normal opacity-70">
                        ({msg.senderRole})
                      </span>
                    </p>
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
                        isSender ? "bg-emerald-700/60 text-white" : "bg-[var(--surface-subtle)] text-emerald-600 dark:text-emerald-400"
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

                  {/* Text Content */}
                  {msg.content && (
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {msg.content}
                    </p>
                  )}

                  {/* Message Metadata (Time & Read Checkmarks) */}
                  <div
                    className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                      isSender ? "text-emerald-100" : "text-[var(--text-tertiary)]"
                    }`}
                  >
                    <span>{formatTime(msg.createdAt)}</span>
                    {isSender && (
                      <span title={msg.readAt ? "Lida" : "Enviada"}>
                        {msg.readAt ? (
                          <span className="text-emerald-200 font-bold">✓✓</span>
                        ) : (
                          <span className="opacity-75">✓</span>
                        )}
                      </span>
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt="Zoom"
              className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
