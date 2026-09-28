"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { StudentPendingRequestDto } from "@/lib/consultancies/student-requests";

interface Props {
  requests: StudentPendingRequestDto[];
}

export function StudentPendingRequestsInbox({ requests }: Props) {
  if (!requests || requests.length === 0) return null;

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border-2 border-[var(--brand)]/30 shadow-md space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔔</span>
          <div>
            <h2 className="font-heading text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Solicitações Pendentes
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Seu treinador ou nutricionista solicitou informações para acompanhar sua evolução.
            </p>
          </div>
        </div>
        <Badge variant="brand" size="md">
          {requests.length} {requests.length === 1 ? "pendente" : "pendentes"}
        </Badge>
      </div>

      <div className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.publicId}
            className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[var(--brand)] transition-colors"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-heading text-sm font-bold text-[var(--text-primary)] truncate">
                  {req.title}
                </span>
                <Badge variant="warning" size="sm">
                  Pendente
                </Badge>
              </div>

              {req.description && (
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                  {req.description}
                </p>
              )}

              <p className="text-[11px] text-[var(--text-tertiary)] pt-0.5">
                Solicitado por <strong className="text-[var(--text-secondary)]">{req.requestedByName}</strong> em{" "}
                {new Date(req.requestedAt).toLocaleDateString("pt-BR")}
              </p>
            </div>

            <Link
              href={req.deepLink}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] transition-all min-h-[44px] shrink-0 shadow-2xs"
            >
              <span>{req.ctaText}</span>
              <span>→</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
