"use client";

import React, { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { ChatMessageType } from "@/lib/consultancies/trevo-chat";

const emptySubscribe = () => () => {};

interface ChatInputBarProps {
  onSendMessage: (params: {
    content?: string;
    file?: File;
    messageType?: ChatMessageType;
    audioDurationSeconds?: number;
    replyToMessageId?: number;
    payloadJson?: Record<string, unknown>;
  }) => Promise<boolean>;
  isSending: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  isProfessional?: boolean;
  replyingTo?: {
    id: number;
    senderName: string;
    content: string;
  } | null;
  onCancelReply?: () => void;
}

export function ChatInputBar({
  onSendMessage,
  isSending,
  disabled = false,
  disabledMessage,
  isProfessional = false,
  replyingTo = null,
  onCancelReply,
}: ChatInputBarProps) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  // Professional Structured Request menu
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  // Modals for structured requests
  const [activeStructuredModal, setActiveStructuredModal] = useState<
    "FORM" | "PHOTO" | "DOCUMENT" | "GUIDANCE" | "WORKOUT" | "MEAL_PLAN" | null
  >(null);
  const [structuredInput, setStructuredInput] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Close actions menu when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    };
    if (isActionsMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isActionsMenuOpen]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [filePreviewUrl, recordedAudioUrl]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Voice recording handlers
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Gravação de áudio não suportada neste navegador.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          mimeType = "audio/ogg";
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 180) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("[Voice Recorder] Error accessing microphone:", err);
      alert("Permissão de microfone bloqueada ou indisponível. Para enviar áudio, permita o acesso ao microfone nas configurações do seu navegador.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    setRecordedAudioBlob(null);
    if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    setRecordedAudioUrl(null);
  };

  const discardRecordedAudio = () => {
    setRecordedAudioBlob(null);
    if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    setRecordedAudioUrl(null);
    setRecordingSeconds(0);
  };

  // Submit standard message
  const handleSend = async () => {
    if (isSending || disabled) return;

    if (recordedAudioBlob) {
      const ext = recordedAudioBlob.type.includes("mp4") ? ".m4a" : ".weba";
      const audioFile = new File([recordedAudioBlob], `audio_${Date.now()}${ext}`, {
        type: recordedAudioBlob.type,
      });

      const success = await onSendMessage({
        content: text.trim() || undefined,
        file: audioFile,
        messageType: "AUDIO",
        audioDurationSeconds: recordingSeconds,
        replyToMessageId: replyingTo?.id,
      });

      if (success) {
        setText("");
        discardRecordedAudio();
        if (onCancelReply) onCancelReply();
      }
      return;
    }

    if (selectedFile) {
      let mType: ChatMessageType = "DOCUMENT";
      if (selectedFile.type.startsWith("image/")) mType = "IMAGE";
      else if (selectedFile.type.startsWith("video/")) mType = "VIDEO";
      else if (selectedFile.type.startsWith("audio/")) mType = "AUDIO";

      const success = await onSendMessage({
        content: text.trim() || undefined,
        file: selectedFile,
        messageType: mType,
        replyToMessageId: replyingTo?.id,
      });

      if (success) {
        setText("");
        clearSelectedFile();
        if (onCancelReply) onCancelReply();
      }
      return;
    }

    if (!text.trim()) return;

    const success = await onSendMessage({
      content: text.trim(),
      messageType: "TEXT",
      replyToMessageId: replyingTo?.id,
    });

    if (success) {
      setText("");
      if (onCancelReply) onCancelReply();
    }
  };

  // Send structured card
  const handleSendStructuredCard = async () => {
    if (!activeStructuredModal) return;

    let mType: ChatMessageType = "CLINICAL_GUIDANCE";
    let payload: Record<string, unknown> = {};

    if (activeStructuredModal === "FORM") {
      mType = "FORM_REQUEST";
      payload = { title: structuredInput.trim() || "Anamnese e Avaliação Clínica" };
    } else if (activeStructuredModal === "PHOTO") {
      mType = "PHOTO_REQUEST";
      payload = { instructions: structuredInput.trim() || "Fotos de evolução frente, costas e perfil" };
    } else if (activeStructuredModal === "DOCUMENT") {
      mType = "DOCUMENT_REQUEST";
      payload = { instructions: structuredInput.trim() || "Envio de exames laboratoriais e laudos" };
    } else if (activeStructuredModal === "GUIDANCE") {
      mType = "CLINICAL_GUIDANCE";
      payload = { guidance: structuredInput.trim() };
    } else if (activeStructuredModal === "WORKOUT") {
      mType = "WORKOUT_CARD";
      payload = { workoutTitle: structuredInput.trim() || "Ficha de Treino Atualizada" };
    } else if (activeStructuredModal === "MEAL_PLAN") {
      mType = "MEAL_PLAN_CARD";
      payload = { planTitle: structuredInput.trim() || "Plano Alimentar Atualizado" };
    }

    const success = await onSendMessage({
      content: structuredInput.trim() || undefined,
      messageType: mType,
      payloadJson: payload,
      replyToMessageId: replyingTo?.id,
    });

    if (success) {
      setActiveStructuredModal(null);
      setStructuredInput("");
      if (onCancelReply) onCancelReply();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="p-2.5 sm:p-3.5 bg-[var(--surface)] border-t border-[var(--border-subtle)] pb-safe relative">
      {/* Quoted Message Preview Bar */}
      {replyingTo && (
        <div className="mb-2 p-2 rounded-xl bg-[var(--surface-subtle)] border border-emerald-500/30 flex items-center justify-between gap-2 text-xs">
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-emerald-600 font-bold">↩ Respondendo a {replyingTo.senderName}:</span>
            <span className="truncate italic text-[var(--text-secondary)]">{replyingTo.content}</span>
          </div>
          {onCancelReply && (
            <button
              type="button"
              onClick={onCancelReply}
              className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* File Attachment Preview */}
      {selectedFile && (
        <div className="mb-2.5 p-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between gap-3 animate-in fade-in duration-100">
          <div className="flex items-center gap-2.5 min-w-0">
            {filePreviewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={filePreviewUrl}
                alt="Preview"
                className="w-10 h-10 object-cover rounded-lg shrink-0 border border-[var(--border-subtle)]"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {selectedFile.name}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                {(selectedFile.size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearSelectedFile}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Audio Recording Live Banner */}
      {isRecording && (
        <div className="mb-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-rose-600 font-bold text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
            <span>Gravando áudio ({formatTimer(recordingSeconds)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={cancelRecording}
              className="px-2.5 py-1 rounded-xl bg-transparent hover:bg-rose-500/20 text-rose-600 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
            >
              Concluir
            </button>
          </div>
        </div>
      )}

      {/* Audio Recorded Preview Banner */}
      {recordedAudioBlob && recordedAudioUrl && !isRecording && (
        <div className="mb-2.5 p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <audio src={recordedAudioUrl} controls className="h-8 w-full max-w-xs" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
              {formatTimer(recordingSeconds)}
            </span>
          </div>
          <button
            type="button"
            onClick={discardRecordedAudio}
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
            title="Descartar gravação"
          >
            ✕
          </button>
        </div>
      )}

      {/* Disabled Notification Banner */}
      {disabled && disabledMessage && (
        <div className="mb-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 text-center font-medium">
          {disabledMessage}
        </div>
      )}

      {/* Input Action Bar */}
      <div className="flex items-end gap-1.5 sm:gap-2">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          className="hidden"
          disabled={disabled || isSending}
        />

        {/* Attachment Button */}
        <button
          type="button"
          disabled={disabled || isSending || isRecording}
          onClick={() => fileInputRef.current?.click()}
          className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-active)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer disabled:opacity-40 transition-colors flex items-center justify-center shrink-0"
          title="Anexar foto, vídeo ou documento"
          aria-label="Anexar arquivo"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        {/* Professional "+ Ações" Menu */}
        {isProfessional && (
          <div className="relative shrink-0" ref={actionsMenuRef}>
            <button
              type="button"
              disabled={disabled || isSending || isRecording}
              onClick={() => setIsActionsMenuOpen((prev) => !prev)}
              className="min-w-[44px] min-h-[44px] px-2.5 py-2 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-active)] text-[var(--text-secondary)] hover:text-emerald-600 text-xs font-bold cursor-pointer disabled:opacity-40 transition-colors flex items-center gap-1 shrink-0"
              title="Solicitar conteúdos clínicos estruturados"
            >
              <span>+ Solicitar</span>
            </button>

            {isActionsMenuOpen && (
              <div className="absolute bottom-12 left-0 w-64 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl shadow-xl p-1.5 z-40 space-y-1 animate-in fade-in duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    setActiveStructuredModal("FORM");
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] flex items-center gap-2 cursor-pointer font-medium"
                >
                  <span>📋</span>
                  <span>Solicitar Formulário / Anamnese</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    setActiveStructuredModal("PHOTO");
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] flex items-center gap-2 cursor-pointer font-medium"
                >
                  <span>📸</span>
                  <span>Solicitar Fotos de Evolução</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    setActiveStructuredModal("DOCUMENT");
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] flex items-center gap-2 cursor-pointer font-medium"
                >
                  <span>📄</span>
                  <span>Solicitar Exames / Laudos</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    setActiveStructuredModal("GUIDANCE");
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] flex items-center gap-2 cursor-pointer font-medium"
                >
                  <span>💡</span>
                  <span>Orientação Clínica Destacada</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    setActiveStructuredModal("WORKOUT");
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] flex items-center gap-2 cursor-pointer font-medium"
                >
                  <span>🏋️</span>
                  <span>Compartilhar Ficha de Treino</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    setActiveStructuredModal("MEAL_PLAN");
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] flex items-center gap-2 cursor-pointer font-medium"
                >
                  <span>🥗</span>
                  <span>Compartilhar Plano Alimentar</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Text Area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Atendimento bloqueado" : "Digite sua mensagem... (Shift+Enter pula linha)"}
            disabled={disabled || isSending || isRecording}
            className="w-full py-2.5 px-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-sm sm:text-base text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-emerald-500 resize-none max-h-32 transition-colors disabled:opacity-40 leading-relaxed"
          />
        </div>

        {/* Voice Recorder Mic Button */}
        {!text.trim() && !selectedFile && !recordedAudioBlob && (
          <button
            type="button"
            disabled={disabled || isSending}
            onClick={isRecording ? stopRecording : startRecording}
            className={`min-w-[44px] min-h-[44px] p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center shrink-0 ${
              isRecording
                ? "bg-rose-600 text-white animate-pulse"
                : "bg-[var(--surface-subtle)] hover:bg-[var(--surface-active)] text-[var(--text-secondary)] hover:text-rose-500"
            }`}
            title="Gravar mensagem de voz"
            aria-label="Gravar áudio"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        )}

        {/* Send Button */}
        {(text.trim() || selectedFile || recordedAudioBlob) && (
          <button
            type="button"
            disabled={disabled || isSending}
            onClick={handleSend}
            className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center shrink-0 shadow-md active:scale-95"
            title="Enviar mensagem"
            aria-label="Enviar"
          >
            {isSending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Structured Card Composer Modal */}
      {mounted && activeStructuredModal && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveStructuredModal(null);
              setStructuredInput("");
            }
          }}
        >
          <div
            className="w-full sm:max-w-md bg-[var(--surface)] sm:border border-[var(--border-subtle)] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {activeStructuredModal === "FORM" && "Solicitar Formulário / Anamnese"}
                {activeStructuredModal === "PHOTO" && "Solicitar Fotos de Evolução"}
                {activeStructuredModal === "DOCUMENT" && "Solicitar Exames e Laudos"}
                {activeStructuredModal === "GUIDANCE" && "Enviar Orientação Clínica"}
                {activeStructuredModal === "WORKOUT" && "Compartilhar Ficha de Treino"}
                {activeStructuredModal === "MEAL_PLAN" && "Compartilhar Plano Alimentar"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActiveStructuredModal(null);
                  setStructuredInput("");
                }}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                {activeStructuredModal === "GUIDANCE" ? "Texto da orientação clínica:" : "Instruções adicionais para o aluno:"}
              </label>
              <textarea
                rows={3}
                value={structuredInput}
                onChange={(e) => setStructuredInput(e.target.value)}
                placeholder="Descreva detalhes ou instruções para o aluno..."
                className="w-full p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)] pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
              <button
                type="button"
                onClick={() => {
                  setActiveStructuredModal(null);
                  setStructuredInput("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendStructuredCard}
                disabled={isSending}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSending ? "Enviando..." : "Enviar no Chat"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
