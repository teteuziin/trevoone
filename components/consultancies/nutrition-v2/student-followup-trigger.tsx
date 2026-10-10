"use client";

import React, { useState } from "react";
import { StudentFollowupModal } from "./student-followup-modal";

interface StudentFollowupTriggerProps {
  consultancySlug: string;
  pendingCheckinRequestPublicId?: string | null;
  className?: string;
  variant?: "primary" | "card";
}

export function StudentFollowupTrigger({
  consultancySlug,
  pendingCheckinRequestPublicId,
  className = "",
  variant = "primary",
}: StudentFollowupTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (variant === "card") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`w-full inline-flex items-center justify-between p-3.5 rounded-xl text-xs font-bold bg-[var(--brand)] text-[var(--text-inverse)] hover:bg-[var(--brand-hover)] shadow-xs cursor-pointer transition-all min-h-[44px] ${className}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">📷</span>
            <span>Registrar foto ou anotação</span>
          </div>
          <span>+ Adicionar →</span>
        </button>

        <StudentFollowupModal
          consultancySlug={consultancySlug}
          pendingCheckinRequestPublicId={pendingCheckinRequestPublicId}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--brand)] text-[var(--text-inverse)] hover:bg-[var(--brand-hover)] active:scale-98 transition-all shadow-xs shrink-0 cursor-pointer min-h-[40px] ${className}`}
      >
        <span className="text-sm font-bold">+</span>
        <span>Registrar acompanhamento</span>
      </button>

      <StudentFollowupModal
        consultancySlug={consultancySlug}
        pendingCheckinRequestPublicId={pendingCheckinRequestPublicId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
