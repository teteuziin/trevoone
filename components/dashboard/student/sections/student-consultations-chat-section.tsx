"use client";

import React from "react";
import Link from "next/link";
import { DuotoneConsultationsIcon } from "@/components/ui/icons/duotone-icons";

export interface StudentConsultationItem {
  publicId: string;
  professionalName: string;
  timeFormatted: string;
  dateFormatted?: string;
  type?: string;
  status: string;
  statusLabel?: string;
  canJoinNow: boolean;
  href: string;
}

export interface StudentChatItem {
  publicId: string;
  professionalName: string;
  title?: string;
  unreadCount: number;
  lastMessagePreview?: string | null;
  href: string;
}

export interface StudentConsultationsChatSectionProps {
  consultancySlug: string;
  upcomingConsultations?: StudentConsultationItem[];
  chatConversations?: StudentChatItem[];
}

function ChatBubbleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.974-.974 5.972 5.972 0 011.057-3.035A7.948 7.948 0 013 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    </svg>
  );
}

export function StudentConsultationsChatSection({
  consultancySlug,
  upcomingConsultations = [],
  chatConversations = [],
}: StudentConsultationsChatSectionProps) {
  const nextConsultation = upcomingConsultations[0] || null;
  const primaryChat = chatConversations[0] || null;

  return (
    <section className="w-full space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight">
          Consultas e conversas
        </h2>
        <Link
          href={`/consultoria/${consultancySlug}/consultas`}
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
        >
          Ver todas →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* ================================================================= */}
        {/* CARD 1: PRÓXIMA CONSULTA                                          */}
        {/* ================================================================= */}
        <div className="rounded-2xl bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-4 transition-colors">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <DuotoneConsultationsIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                    Próxima Consulta
                  </h3>
                  <span className="text-xs text-zinc-500 dark:text-[#8E95A2]">
                    Atendimento por vídeo
                  </span>
                </div>
              </div>

              {nextConsultation && (
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    nextConsultation.canJoinNow
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  {nextConsultation.canJoinNow && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                  )}
                  {nextConsultation.statusLabel || "Agendada"}
                </span>
              )}
            </div>

            {nextConsultation ? (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">
                    {nextConsultation.timeFormatted}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-[#8E95A2]">
                    {nextConsultation.type || "Vídeo 1:1"}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-[#A1A7B4]">
                  Com:{" "}
                  <strong className="text-zinc-900 dark:text-zinc-200 font-semibold">
                    {nextConsultation.professionalName}
                  </strong>
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] text-center space-y-1">
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Nenhuma consulta agendada no momento.
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-[#8E95A2]">
                  Agende sua sessão individual com seu treinador ou nutricionista.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-[#303238]/80">
            {nextConsultation ? (
              <Link
                href={nextConsultation.href || `/consultoria/${consultancySlug}/consultas`}
                className={`w-full min-h-[44px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer select-none ${
                  nextConsultation.canJoinNow
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1B1D21] dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-[#303238]"
                }`}
              >
                <span>{nextConsultation.canJoinNow ? "Entrar na chamada" : "Ver consulta"}</span>
                <span>→</span>
              </Link>
            ) : (
              <Link
                href={`/consultoria/${consultancySlug}/consultas`}
                className="w-full min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1B1D21] dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-[#303238] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Ver agenda de consultas</span>
                <span>→</span>
              </Link>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* CARD 2: TREVO CHAT & MENSAGENS                                    */}
        {/* ================================================================= */}
        <div className="rounded-2xl bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-4 transition-colors">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <ChatBubbleIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                    Trevo Chat
                  </h3>
                  <span className="text-xs text-zinc-500 dark:text-[#8E95A2]">
                    Mensagens com a equipe
                  </span>
                </div>
              </div>

              {primaryChat && primaryChat.unreadCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                  {primaryChat.unreadCount} nova{primaryChat.unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {primaryChat ? (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] space-y-1.5">
                <span className="text-xs font-bold text-zinc-900 dark:text-white block truncate">
                  {primaryChat.professionalName}
                </span>
                <p className="text-xs text-zinc-600 dark:text-[#8E95A2] line-clamp-2">
                  {primaryChat.lastMessagePreview ||
                    "Envie suas dúvidas sobre treino e alimentação. Resposta assíncrona assim que o profissional estiver disponível."}
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] text-center space-y-1">
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Canal direto de comunicação.
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-[#8E95A2]">
                  Tire dúvidas sobre suas séries, substituições e cardápio.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-[#303238]/80">
            <Link
              href={primaryChat?.href || `/consultoria/${consultancySlug}/consultas`}
              className="w-full min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer select-none"
            >
              <span>Abrir conversa</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
