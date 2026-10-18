"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface ConsultationsTabbedContainerProps {
  initialTab?: "chat" | "video";
  chatUnreadCount?: number;
  consultancySlug: string;
  videoView: React.ReactNode;
  chatView: React.ReactNode;
}

export function ConsultationsTabbedContainer({
  initialTab = "chat",
  chatUnreadCount = 0,
  consultancySlug,
  videoView,
  chatView,
}: ConsultationsTabbedContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const [tab, setTab] = useState<"chat" | "video">(
    urlTab === "video" ? "video" : urlTab === "chat" ? "chat" : initialTab
  );

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
            {chatUnreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-700">
                {chatUnreadCount}
              </span>
            )}
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
        <div className="animate-in fade-in duration-150">{chatView}</div>
      ) : (
        <div className="animate-in fade-in duration-150">{videoView}</div>
      )}
    </div>
  );
}
