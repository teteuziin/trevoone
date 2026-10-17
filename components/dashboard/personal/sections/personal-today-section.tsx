"use client";

import React from "react";
import Link from "next/link";

export interface PersonalTodayConsultation {
  publicId: string;
  studentName: string;
  timeFormatted: string;
  type?: string;
  status: string;
  scheduledStartAt: string; // ISO
  scheduledEndAt: string; // ISO
  href?: string;
}

export interface PersonalTodaySectionProps {
  consultancySlug: string;
  consultations?: PersonalTodayConsultation[] | null;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

function canJoinRoom(c: PersonalTodayConsultation): boolean {
  if (c.status !== "SCHEDULED" && c.status !== "IN_PROGRESS") return false;
  try {
    const now = Date.now();
    const start = new Date(c.scheduledStartAt).getTime();
    const end = new Date(c.scheduledEndAt).getTime();
    if (isNaN(start) || isNaN(end)) return false;
    const earliest = start - 10 * 60 * 1000; // 10 min antes
    const latest = end + 30 * 60 * 1000; // 30 min depois
    return now >= earliest && now <= latest;
  } catch {
    return false;
  }
}

export function PersonalTodaySection({
  consultancySlug,
  consultations = [],
  isLoading = false,
  isError = false,
  onRetry,
}: PersonalTodaySectionProps) {
  // Estado de Carregamento
  if (isLoading) {
    return (
      <section aria-label="Compromissos de hoje" className="w-full space-y-3">
        <h2 className="text-lg font-semibold text-[var(--cockpit-text-primary)] leading-tight">
          Hoje
        </h2>
        <div className="bg-[var(--cockpit-surface-default)] border border-[var(--cockpit-border-default)] rounded-lg p-4 space-y-2 animate-pulse">
          <div className="h-4 bg-[var(--cockpit-surface-subtle)] rounded w-1/4" />
          <div className="h-10 bg-[var(--cockpit-surface-subtle)] rounded w-full" />
        </div>
      </section>
    );
  }

  // Estado de Erro
  if (isError) {
    return (
      <section aria-label="Compromissos de hoje" className="w-full space-y-3">
        <h2 className="text-lg font-semibold text-[var(--cockpit-text-primary)] leading-tight">
          Hoje
        </h2>
        <div className="bg-[var(--cockpit-surface-default)] border border-[var(--cockpit-border-default)] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm font-medium text-[var(--cockpit-text-secondary)]">
            Não foi possível carregar a agenda de hoje.
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center px-3.5 min-h-[44px] text-sm font-semibold text-[var(--cockpit-text-primary)] bg-[var(--cockpit-surface-subtle)] hover:bg-[var(--cockpit-border-default)] rounded-md transition-colors cursor-pointer select-none"
            >
              Tentar novamente
            </button>
          )}
        </div>
      </section>
    );
  }

  const items = consultations || [];

  return (
    <section aria-label="Compromissos de hoje" className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--cockpit-text-primary)] leading-tight">
          Hoje
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="bg-[var(--cockpit-surface-default)] border border-[var(--cockpit-border-default)] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm font-normal text-[var(--cockpit-text-secondary)]">
            Nenhuma consulta agendada para hoje.
          </p>
          <Link
            href={`/consultoria/${consultancySlug}/consultas`}
            prefetch={false}
            className="inline-flex items-center justify-center min-h-[44px] px-3.5 text-sm font-semibold text-[var(--cockpit-action-primary)] hover:underline rounded-md select-none focus:outline-none focus:ring-2 focus:ring-[var(--cockpit-accent-brand)]"
          >
            Ver agenda
          </Link>
        </div>
      ) : (
        <div className="bg-[var(--cockpit-surface-default)] border border-[var(--cockpit-border-default)] rounded-lg divide-y divide-[var(--cockpit-border-default)] overflow-hidden">
          {items.map((item) => {
            const joinAllowed = canJoinRoom(item);
            const destinationHref = joinAllowed
              ? `/consultoria/${consultancySlug}/consultas/${item.publicId}/sala`
              : `/consultoria/${consultancySlug}/consultas`;

            return (
              <div
                key={item.publicId}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 transition-colors hover:bg-[var(--cockpit-surface-subtle)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-sm font-semibold text-[var(--cockpit-text-primary)] tabular-nums px-2.5 py-1 rounded bg-[var(--cockpit-surface-subtle)] border border-[var(--cockpit-border-default)] shrink-0">
                    {item.timeFormatted}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--cockpit-text-primary)] truncate">
                      {item.studentName}
                    </p>
                    <p className="text-xs text-[var(--cockpit-text-secondary)] mt-0.5">
                      {item.type || "Consulta por vídeo"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end sm:shrink-0 pt-1 sm:pt-0">
                  <Link
                    href={destinationHref}
                    prefetch={false}
                    className={`inline-flex items-center justify-center min-h-[44px] px-3.5 text-sm font-semibold rounded-md select-none focus:outline-none focus:ring-2 focus:ring-[var(--cockpit-accent-brand)] ${
                      joinAllowed
                        ? "text-white bg-[var(--cockpit-action-primary)] hover:bg-[var(--cockpit-action-hover)]"
                        : "text-[var(--cockpit-action-primary)] hover:underline"
                    }`}
                  >
                    {joinAllowed ? "Acessar sala" : "Ver detalhes"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
