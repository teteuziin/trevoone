"use client";

import React, { useState, useRef, useEffect } from "react";

interface ChatInputBarProps {
  onSendMessage: (params: {
    content?: string;
    file?: File;
    messageType?: "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT";
    audioDurationSeconds?: number;
  }) => Promise<boolean>;
  isSending: boolean;
  disabled?: boolean;
  disabledMessage?: string;
}

export function ChatInputBar({
  onSendMessage,
  isSending,
  disabled = false,
  disabledMessage,
}: ChatInputBarProps) {
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [filePreviewUrl, recordedAudioUrl]);

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
            // Auto stop at 3 minutes
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("[Voice Recorder] Error accessing microphone:", err);
      alert("Não foi possível acessar o microfone para gravação.");
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

  // Submit
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
      });

      if (success) {
        setText("");
        discardRecordedAudio();
      }
      return;
    }

    if (selectedFile) {
      let mType: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO" = "DOCUMENT";
      if (selectedFile.type.startsWith("image/")) mType = "IMAGE";
      else if (selectedFile.type.startsWith("video/")) mType = "VIDEO";
      else if (selectedFile.type.startsWith("audio/")) mType = "AUDIO";

      const success = await onSendMessage({
        content: text.trim() || undefined,
        file: selectedFile,
        messageType: mType,
      });

      if (success) {
        setText("");
        clearSelectedFile();
      }
      return;
    }

    if (!text.trim()) return;

    const success = await onSendMessage({
      content: text.trim(),
      messageType: "TEXT",
    });

    if (success) {
      setText("");
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
    <div className="p-3 sm:p-4 bg-[var(--surface)] border-t border-[var(--border-subtle)] pb-safe">
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
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearSelectedFile}
            className="p-1 rounded-lg hover:bg-black/10 text-[var(--text-secondary)] hover:text-rose-600 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Audio Recording Active View */}
      {isRecording && (
        <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 animate-in fade-in duration-100">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="font-mono font-bold text-sm">Gravando: {formatTimer(recordingSeconds)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-rose-500/20 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 cursor-pointer"
            >
              Concluir gravação
            </button>
          </div>
        </div>
      )}

      {/* Audio Recorded Preview View */}
      {!isRecording && recordedAudioUrl && (
        <div className="mb-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 animate-in fade-in duration-100">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-emerald-600">🎤</span>
            <audio src={recordedAudioUrl} controls className="h-8 max-w-[200px] sm:max-w-[280px]" />
          </div>
          <button
            type="button"
            onClick={discardRecordedAudio}
            className="text-xs text-rose-600 hover:underline cursor-pointer shrink-0"
          >
            Descartar áudio
          </button>
        </div>
      )}

      {/* Main Input Row */}
      {!isRecording && (
        <div className="flex items-end gap-2">
          {/* File Picker Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            disabled={disabled || isSending}
            onClick={() => fileInputRef.current?.click()}
            title="Anexar foto, vídeo ou PDF"
            aria-label="Anexar arquivo"
            className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-active)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          {/* Voice Record Button */}
          {!recordedAudioUrl && (
            <button
              type="button"
              disabled={disabled || isSending}
              onClick={startRecording}
              title="Gravar áudio"
              aria-label="Gravar áudio"
              className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] hover:bg-emerald-500/10 text-[var(--text-secondary)] hover:text-emerald-600 flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}

          {/* Textarea */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              disabled={disabled || isSending}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                disabled && disabledMessage
                  ? disabledMessage
                  : recordedAudioUrl
                  ? "Adicionar legenda ao áudio (opcional)..."
                  : selectedFile
                  ? "Adicionar legenda ao anexo (opcional)..."
                  : "Digite sua mensagem..."
              }
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] focus:border-emerald-500 focus:outline-none text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] resize-none max-h-32 leading-relaxed disabled:opacity-60"
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            disabled={disabled || isSending || (!text.trim() && !selectedFile && !recordedAudioBlob)}
            onClick={handleSend}
            aria-label="Enviar mensagem"
            className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95 shadow-sm"
          >
            {isSending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
