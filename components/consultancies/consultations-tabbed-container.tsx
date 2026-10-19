"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface ConsultationsTabbedContainerProps {
  initialTab?: "chat" | "video";
  chatUnreadCount?: number;
  consultancySlug: string;
  videoView: React.ReactNode;
  chatView: React.ReactNode;
  chatError?: string | null;
  canSchedule?: boolean;
}

export function ConsultationsTabbedContainer({
  initialTab = "video",
  chatUnreadCount = 0,
  consultancySlug,
  videoView,
  chatView,
  chatError,
  canSchedule = true,
}: ConsultationsTabbedContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");

  // If chat has an error and user hasn't explicitly navigated to ?tab=chat, default to video
  const resolvedInitialTab: "chat" | "video" =
    urlTab === "video"
      ? "video"
      : urlTab === "chat"
      ? "chat"
      : chatError
      ? "video"
      : initialTab;

  const [tab, setTab] = useState<"chat" | "video">(resolvedInitialTab);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const handleTabChange = (newTab: "chat" | "video") => {
    setTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.replace(`/consultoria/${consultancySlug}/consultas?${params.toString()}`);
  };

  const handleSelectScheduleType = (type: "video" | "chat") => {
    setIsScheduleModalOpen(false);
    handleTabChange(type);
    setTimeout(() => {
      if (type === "video") {
        window.dispatchEvent(new CustomEvent("trevo:open-video-schedule"));
      } else {
        window.dispatchEvent(new CustomEvent("trevo:open-chat-schedule"));
      }
    }, 50);
  };

  return (
    <div className="space-y-5 w-full max-w-7xl mx-auto">
      {/* -------------------------------------------------------------------- */}
      {/* SHARED HEADER: Back + Title "Consultas" + Action "Agendar consulta"   */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <Link
            href={`/consultoria/${consultancySlug}`}
            className="p-2 -ml-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors inline-flex items-center gap-1.5 text-xs font-semibold"
            aria-label="Voltar ao painel"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Voltar</span>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
              Consultas
            </h1>
          </div>
        </div>

        {canSchedule && (
          <button
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            className="depth-interactive inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-[var(--brand)] text-white hover:opacity-95 shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Agendar consulta</span>
          </button>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* TWO TABS: 1. Videochamada, 2. Trevo Chat                            */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTabChange("video")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              tab === "video"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-[var(--surface-subtle)] hover:bg-[var(--surface-active)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span>📹 Videochamada</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("chat")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              tab === "chat"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-[var(--surface-subtle)] hover:bg-[var(--surface-active)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span>💬 Trevo Chat</span>
            {chatError ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                Aviso
              </span>
            ) : chatUnreadCount > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-700">
                {chatUnreadCount}
              </span>
            ) : null}
          </button>
        </div>

        <span className="text-[11px] text-[var(--text-tertiary)] hidden sm:inline">
          {tab === "video" ? "Consultas ao vivo 1:1" : "Atendimento assíncrono & Anamnese IA"}
        </span>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* TAB CONTENTS                                                         */}
      {/* -------------------------------------------------------------------- */}
      {tab === "chat" ? (
        chatError ? (
          <div className="w-full max-w-xl mx-auto my-8 p-6 sm:p-8 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-5 animate-in fade-in duration-150 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mx-auto flex items-center justify-center text-xl shadow-xs">
              ⚠️
            </div>
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] tracking-tight">
                Trevo Chat temporariamente indisponível
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                {chatError} Você pode acessar a aba Videochamada.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[var(--surface-subtle)] hover:bg-[var(--surface-active)] text-[var(--text-primary)] border border-[var(--border-default)] transition-colors cursor-pointer"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("video")}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-xs"
              >
                Acessar Videochamada
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-150">{chatView}</div>
        )
      ) : (
        <div className="animate-in fade-in duration-150">{videoView}</div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL: SELECIONAR MODALIDADE DE AGENDAMENTO                         */}
      {/* -------------------------------------------------------------------- */}
      {isScheduleModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Agendar Consulta
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Escolha o tipo de atendimento que deseja realizar:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-black/10 text-[var(--text-secondary)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3">
              {/* Option 1: Videochamada */}
              <button
                type="button"
                onClick={() => handleSelectScheduleType("video")}
                className="p-4 rounded-2xl border border-[var(--border-default)] hover:border-emerald-500 bg-[var(--surface-subtle)] hover:bg-emerald-500/5 text-left transition-all cursor-pointer flex items-start gap-3.5 group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                  📹
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      Videochamada 1:1
                    </span>
                    <span className="text-xs text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      Selecionar →
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Consulta ao vivo por vídeo com link direto e verificação prévia de câmera e microfone.
                  </p>
                </div>
              </button>

              {/* Option 2: Trevo Chat */}
              <button
                type="button"
                onClick={() => handleSelectScheduleType("chat")}
                className="p-4 rounded-2xl border border-[var(--border-default)] hover:border-emerald-500 bg-[var(--surface-subtle)] hover:bg-emerald-500/5 text-left transition-all cursor-pointer flex items-start gap-3.5 group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                  💬
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      Trevo Chat
                    </span>
                    <span className="text-xs text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      Selecionar →
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Atendimento assíncrono com agendamento bilateral, referência de data/horário e anamnese integrada por IA.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
