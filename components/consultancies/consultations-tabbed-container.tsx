"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface ConsultationsTabbedContainerProps {
  initialTab?: "chat" | "video";
  chatUnreadCount?: number;
  consultancySlug: string;
  videoView: React.ReactNode;
  chatView: React.ReactNode;
  chatError?: string | null;
}

export function ConsultationsTabbedContainer({
  initialTab = "chat",
  chatUnreadCount = 0,
  consultancySlug,
  videoView,
  chatView,
  chatError,
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

  const handleTabChange = (newTab: "chat" | "video") => {
    setTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.replace(`/consultoria/${consultancySlug}/consultas?${params.toString()}`);
  };

  return (
    <div className="space-y-4 w-full max-w-7xl mx-auto">
      {/* Top Level Two-Tab Navigation */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
        <div className="flex items-center gap-2">
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
        </div>

        <span className="text-[11px] text-[var(--text-tertiary)] hidden sm:inline">
          {tab === "chat" ? "Atendimento assíncrono & Anamnese IA" : "Consultas ao vivo 1:1"}
        </span>
      </div>

      {/* Tab Contents */}
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
                {chatError} As suas consultas agendadas por videochamada continuam disponíveis e funcionando normalmente.
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
    </div>
  );
}
