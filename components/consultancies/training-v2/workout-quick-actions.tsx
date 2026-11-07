"use client";

import React from "react";
import Link from "next/link";

export interface WorkoutQuickActionsProps {
  consultancySlug: string;
  latestDraft?: {
    publicId: string;
    title: string;
    updatedAt: string | Date;
    blocksCount?: number;
  } | null;
  activeTab?: string;
}

export function WorkoutQuickActions({
  consultancySlug,
  latestDraft,
  activeTab = "routines",
}: WorkoutQuickActionsProps) {
  // Only display the banner when on the routines ("Meus treinos") tab and there is a real draft
  if (!latestDraft || activeTab !== "routines") {
    return null;
  }

  return (
    <div className="w-full font-sans">
      <div className="p-2.5 sm:py-2.5 sm:px-4 rounded-2xl bg-[#102E23] text-white border border-[#163E27] shadow-2xs flex items-center justify-between gap-2.5 animate-in fade-in duration-150">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-lg bg-white/10 text-emerald-300 flex items-center justify-center shrink-0 border border-white/10 text-xs">
            ⚡
          </span>
          <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-emerald-300 shrink-0">
              Continue de onde parou:
            </span>
            <Link
              href={`/consultoria/${consultancySlug}/rotinas/${latestDraft.publicId}`}
              className="text-xs sm:text-sm font-bold text-white hover:text-emerald-200 transition-colors truncate max-w-[150px] sm:max-w-md"
            >
              {latestDraft.title}
            </Link>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#FFF8E6]/20 text-[#FBE3A4] border border-[#FBE3A4]/30 shrink-0">
              Em elaboração
            </span>
          </div>
        </div>

        <div className="shrink-0">
          <Link
            href={`/consultoria/${consultancySlug}/rotinas/${latestDraft.publicId}`}
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-[#EBF3ED] text-[#102E23] transition-all cursor-pointer min-h-[34px] shadow-xs"
          >
            <span>Continuar</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
